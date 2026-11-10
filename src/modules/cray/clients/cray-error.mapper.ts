import { AxiosError } from 'axios';
import { CrayErrorCode } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';

export class CrayErrorMapper {
  /**
   * Maps any error (AxiosError, network error, or generic Error) into a typed CrayException
   */
  static fromAxiosError(error: unknown): CrayException {
    if (error instanceof CrayException) {
      return error;
    }

    const axiosError = error as AxiosError<{
      code?: string;
      message?: string;
      error?: string;
      status?: boolean | string;
      providerCode?: string;
      data?: unknown;
    }>;

    if (!axiosError || !axiosError.isAxiosError) {
      const err = error as Error;
      return new CrayException({
        code: CrayErrorCode.PROVIDER_UNAVAILABLE,
        message: err?.message || 'An unexpected error occurred while communicating with Cray',
        retryable: false,
        details: err?.stack,
      });
    }

    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const responseMessage =
      responseData?.message ||
      responseData?.error ||
      (typeof responseData === 'string' ? responseData : undefined);
    const providerCode = responseData?.code || responseData?.providerCode || axiosError.code;

    // 1. Network / Timeout errors (no response received)
    if (!axiosError.response) {
      const isTimeout =
        axiosError.code === 'ECONNABORTED' ||
        axiosError.message?.toLowerCase().includes('timeout');

      return new CrayException({
        code: CrayErrorCode.PROVIDER_UNAVAILABLE,
        message: isTimeout
          ? 'Cray request timed out'
          : `Network error connecting to Cray: ${axiosError.message}`,
        retryable: true,
        providerCode: axiosError.code,
      });
    }

    // 2. HTTP 409 Conflict (Duplicate reference)
    if (status === 409) {
      return new CrayException({
        code: CrayErrorCode.DUPLICATE_REFERENCE,
        message: responseMessage || 'Duplicate reference already used or currently processing',
        retryable: false,
        providerCode,
        details: responseData,
      });
    }

    // 3. HTTP 404 Not Found
    if (status === 404) {
      return new CrayException({
        code: CrayErrorCode.NOT_FOUND,
        message: responseMessage || 'Requested resource not found at Cray',
        retryable: false,
        providerCode,
        details: responseData,
      });
    }

    // 4. HTTP 429 Too Many Requests (Rate limit)
    if (status === 429) {
      return new CrayException({
        code: CrayErrorCode.PROVIDER_UNAVAILABLE,
        message: responseMessage || 'Cray rate limit exceeded. Please retry later.',
        retryable: true,
        providerCode: 'RATE_LIMIT_EXCEEDED',
        details: responseData,
      });
    }

    // 5. HTTP 400 & 422 Bad Request / Unprocessable Entity
    if (status === 400 || status === 422) {
      const lowerMsg = (responseMessage || '').toLowerCase();

      if (lowerMsg.includes('otp') && (lowerMsg.includes('invalid') || lowerMsg.includes('incorrect') || lowerMsg.includes('expired'))) {
        return new CrayException({
          code: CrayErrorCode.OTP_INVALID,
          message: responseMessage || 'Invalid or expired OTP',
          retryable: false,
          providerCode,
          details: responseData,
        });
      }

      if (lowerMsg.includes('otp') && lowerMsg.includes('required')) {
        return new CrayException({
          code: CrayErrorCode.OTP_REQUIRED,
          message: responseMessage || 'OTP confirmation required',
          retryable: false,
          providerCode,
          details: responseData,
        });
      }

      if (lowerMsg.includes('insufficient') || lowerMsg.includes('low balance')) {
        return new CrayException({
          code: CrayErrorCode.INSUFFICIENT_FUNDS,
          message: responseMessage || 'Insufficient balance for this operation',
          retryable: false,
          providerCode,
          details: responseData,
        });
      }

      if (lowerMsg.includes('duplicate') || lowerMsg.includes('already exists')) {
        return new CrayException({
          code: CrayErrorCode.DUPLICATE_REFERENCE,
          message: responseMessage || 'Duplicate reference already submitted',
          retryable: false,
          providerCode,
          details: responseData,
        });
      }

      return new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: responseMessage || 'Invalid input provided to Cray',
        retryable: false,
        providerCode,
        details: responseData,
      });
    }

    // 6. HTTP 401 & 403 Authentication / Authorization
    if (status === 401 || status === 403) {
      return new CrayException({
        code: CrayErrorCode.PROVIDER_REJECTED,
        message: responseMessage || 'Cray authentication failed or permission denied',
        retryable: false,
        providerCode,
        details: responseData,
      });
    }

    // 7. HTTP 5xx Server Errors
    if (status !== undefined && status >= 500) {
      return new CrayException({
        code: CrayErrorCode.PROVIDER_UNAVAILABLE,
        message: responseMessage || 'Cray service unavailable (5xx error)',
        retryable: true,
        providerCode: `HTTP_${status}`,
        details: responseData,
      });
    }

    // Default fallback
    return new CrayException({
      code: CrayErrorCode.PROVIDER_REJECTED,
      message: responseMessage || `Cray rejected request with status code ${status}`,
      retryable: false,
      providerCode,
      details: responseData,
    });
  }
}

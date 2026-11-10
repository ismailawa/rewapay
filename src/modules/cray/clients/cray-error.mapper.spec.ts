import { AxiosError } from 'axios';
import { CrayErrorCode } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';
import { CrayErrorMapper } from './cray-error.mapper';

describe('CrayErrorMapper', () => {
  it('should return CrayException untouched if already an instance', () => {
    const original = new CrayException({
      code: CrayErrorCode.INVALID_INPUT,
      message: 'Already mapped',
      retryable: false,
    });
    const result = CrayErrorMapper.fromAxiosError(original);
    expect(result).toBe(original);
  });

  it('should map network timeout error to PROVIDER_UNAVAILABLE with retryable=true', () => {
    const error = new Error('timeout of 15000ms exceeded') as AxiosError;
    error.isAxiosError = true;
    error.code = 'ECONNABORTED';

    const mapped = CrayErrorMapper.fromAxiosError(error);
    expect(mapped.code).toBe(CrayErrorCode.PROVIDER_UNAVAILABLE);
    expect(mapped.retryable).toBe(true);
    expect(mapped.message).toContain('timed out');
  });

  it('should map HTTP 409 to DUPLICATE_REFERENCE with retryable=false', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          message: 'customer_reference ref_123 has already been used',
          code: 'REFERENCE_EXISTS',
        },
      },
    } as unknown as AxiosError;

    const mapped = CrayErrorMapper.fromAxiosError(error);
    expect(mapped.code).toBe(CrayErrorCode.DUPLICATE_REFERENCE);
    expect(mapped.retryable).toBe(false);
    expect(mapped.providerCode).toBe('REFERENCE_EXISTS');
  });

  it('should map HTTP 404 to NOT_FOUND with retryable=false', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          message: 'Virtual account not found',
        },
      },
    } as unknown as AxiosError;

    const mapped = CrayErrorMapper.fromAxiosError(error);
    expect(mapped.code).toBe(CrayErrorCode.NOT_FOUND);
    expect(mapped.retryable).toBe(false);
  });

  it('should map HTTP 429 to PROVIDER_UNAVAILABLE with retryable=true', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          message: 'Too many requests',
        },
      },
    } as unknown as AxiosError;

    const mapped = CrayErrorMapper.fromAxiosError(error);
    expect(mapped.code).toBe(CrayErrorCode.PROVIDER_UNAVAILABLE);
    expect(mapped.retryable).toBe(true);
    expect(mapped.providerCode).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should map HTTP 400 with OTP invalid to OTP_INVALID', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          message: 'The OTP entered is invalid or expired',
        },
      },
    } as unknown as AxiosError;

    const mapped = CrayErrorMapper.fromAxiosError(error);
    expect(mapped.code).toBe(CrayErrorCode.OTP_INVALID);
    expect(mapped.retryable).toBe(false);
  });

  it('should map HTTP 400 with insufficient balance to INSUFFICIENT_FUNDS', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          message: 'Insufficient balance to complete payout',
        },
      },
    } as unknown as AxiosError;

    const mapped = CrayErrorMapper.fromAxiosError(error);
    expect(mapped.code).toBe(CrayErrorCode.INSUFFICIENT_FUNDS);
    expect(mapped.retryable).toBe(false);
  });

  it('should map HTTP 500 to PROVIDER_UNAVAILABLE with retryable=true', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 502,
        data: {
          message: 'Bad Gateway',
        },
      },
    } as unknown as AxiosError;

    const mapped = CrayErrorMapper.fromAxiosError(error);
    expect(mapped.code).toBe(CrayErrorCode.PROVIDER_UNAVAILABLE);
    expect(mapped.retryable).toBe(true);
  });
});


import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import { CrayException, FundingSessionResult, FundingStatusResult } from '../interfaces/cray.interfaces';
import { CrayCheckout } from '../entities/cray-checkout.entity';
import { MoneyUtil } from '../utils/money.util';
import { ReferenceUtil } from '../utils/reference.util';
import { InitializeCheckoutDto } from './dto/initialize-checkout.dto';

// -----------------------------------------------------------------------
// Cray API Response shapes (validated against docs/cray-api-v2-docs.md)
// -----------------------------------------------------------------------

interface CrayCheckoutInitResponse {
  status?: boolean | string;
  message?: string;
  data?: {
    link?: string;
    reference?: string;
    payCode?: string;
  };
}

interface CrayCheckoutQueryResponse {
  status?: boolean | string;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    provider_reference?: string;
    amount?: number | string;
    net_amount?: number | string;
    fee?: number | string;
    payment_channel?: string;
    redirect_url?: string;
    callback_url?: string;
    customer?: {
      name?: string;
      email?: string;
    };
    metadata?: unknown;
    created?: string;
  };
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  /** In-memory fallback for unit tests running without a database */
  private readonly memoryCheckouts = new Map<string, CrayCheckout>();

  constructor(
    private readonly apiClient: CrayApiClient,
    @Optional()
    @InjectRepository(CrayCheckout)
    private readonly checkoutRepo?: Repository<CrayCheckout>,
  ) {}

  // =====================================================================
  // Public API
  // =====================================================================

  /**
   * Creates a hosted checkout session via POST /checkout/initialize.
   *
   * Returns a Cray-hosted payment URL that you redirect the customer to.
   * Endpoint: POST /checkout/initialize
   * Docs: docs/cray-api-v2-docs.md § Hosted Checkout
   */
  async createCheckoutSession(dto: InitializeCheckoutDto): Promise<FundingSessionResult> {
    // --- Input validation ---
    if (!ReferenceUtil.isValidReference(dto.reference)) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'Invalid reference. Must be non-empty and at most 64 characters.',
        retryable: false,
      });
    }

    const amountNum = typeof dto.amount === 'string' ? parseFloat(dto.amount) : dto.amount;
    if (!isFinite(amountNum) || amountNum <= 0) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'Amount must be a positive number.',
        retryable: false,
      });
    }

    if (dto.defaultPaymentMethod === 'card' && !dto.token) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'A subaccount token is required when defaultPaymentMethod is "card".',
        retryable: false,
      });
    }

    // --- Idempotency: return existing session if same reference was already used ---
    const existing = await this.findByReference(dto.reference);
    if (existing?.paymentLink) {
      this.logger.log(`Idempotent hit: checkout reference ${dto.reference} already initialized.`);
      return {
        sessionId: existing.payCode || existing.reference,
        paymentUrl: existing.paymentLink,
        expiresAt: '', // Cray does not return an expiry on initialize
      };
    }

    // --- Persist INITIATED record ---
    const checkoutRecord = await this.saveCheckout({
      customerId: dto.customerId,
      walletId: dto.walletId,
      reference: dto.reference,
      amount: MoneyUtil.format(amountNum),
      currency: dto.currency,
      defaultPaymentMethod: dto.defaultPaymentMethod,
      feeBearer: dto.feeBearer,
      narration: dto.narration,
      callbackUrl: dto.callback_url,
      customerName: dto.customer.name,
      customerEmail: dto.customer.email, // stored but never logged at debug level
      status: 'INITIATED',
      initiatedAt: new Date(),
    });

    // --- Build Cray payload (only fields that Cray accepts) ---
    const payload: Record<string, unknown> = {
      amount: amountNum,
      currency: dto.currency,
      reference: dto.reference,
      defaultPaymentMethod: dto.defaultPaymentMethod,
      feeBearer: dto.feeBearer,
      customer: {
        name: dto.customer.name,
        email: dto.customer.email,
      },
    };

    if (dto.token) payload['token'] = dto.token;
    if (dto.narration) payload['narration'] = dto.narration;
    if (dto.paymentMethods?.length) payload['paymentMethods'] = dto.paymentMethods;
    if (dto.callback_url) payload['callback_url'] = dto.callback_url;
    if (dto.metadata) payload['metadata'] = dto.metadata;

    this.logger.log(
      `Initializing checkout ref: ${dto.reference}, amount: ${amountNum} ${dto.currency}, method: ${dto.defaultPaymentMethod}`,
    );

    // --- Call Cray POST /checkout/initialize ---
    const response = await this.apiClient.post<CrayCheckoutInitResponse>(
      '/checkout/initialize',
      payload,
    );

    const link = response?.data?.link;
    const payCode = response?.data?.payCode;

    if (!link) {
      throw new CrayException({
        code: CrayErrorCode.PROVIDER_ERROR,
        message: 'Cray did not return a payment link in the checkout initialize response.',
        retryable: false,
      });
    }

    checkoutRecord.paymentLink = link;
    checkoutRecord.payCode = payCode;
    checkoutRecord.status = CrayStatus.PENDING;
    await this.persistCheckout(checkoutRecord);

    return {
      sessionId: payCode || dto.reference,
      paymentUrl: link,
      expiresAt: '', // Cray does not return an expiry timestamp
    };
  }

  /**
   * Queries checkout session status via GET /checkout/query/{reference}.
   *
   * Maps Cray's status string to CrayStatus enum values.
   * Endpoint: GET /checkout/query/{reference}
   * Docs: docs/cray-api-v2-docs.md § Hosted Checkout — Query the payment
   */
  async getCheckoutStatus(reference: string): Promise<FundingStatusResult> {
    const record = await this.findByReference(reference);
    if (!record) {
      throw new CrayException({
        code: CrayErrorCode.NOT_FOUND,
        message: `Checkout session with reference ${reference} not found.`,
        retryable: false,
      });
    }

    // Only requery Cray if still in a non-terminal state
    const isTerminal =
      record.status === CrayStatus.SUCCESSFUL || record.status === CrayStatus.FAILED;

    if (!isTerminal) {
      try {
        // GET /checkout/query/{reference} — use our reference or Cray's payCode
        const queryRef = record.payCode || reference;
        const response = await this.apiClient.get<CrayCheckoutQueryResponse>(
          `/checkout/query/${queryRef}`,
        );

        const data = response?.data;
        const providerStatus = (data?.status || '').toLowerCase();
        record.providerStatus = data?.status;
        record.providerReference = data?.provider_reference;
        record.paymentChannel = data?.payment_channel;

        if (data?.net_amount !== undefined) {
          record.netAmount = data.net_amount.toString();
        }
        if (data?.fee !== undefined) {
          record.fee = data.fee.toString();
        }

        if (providerStatus === 'successful' || providerStatus === 'approved') {
          record.status = CrayStatus.SUCCESSFUL;
          record.completedAt = new Date();
        } else if (providerStatus === 'failed' || providerStatus === 'expired') {
          record.status = CrayStatus.FAILED;
          record.completedAt = new Date();
        } else if (providerStatus === 'pending' || providerStatus === 'processing') {
          record.status = CrayStatus.PENDING;
        }

        await this.persistCheckout(record);
      } catch (err) {
        // Non-terminal requery failure — log warning but do NOT throw; return cached state
        this.logger.warn(
          `Could not query checkout status for reference ${reference}: ${(err as Error).message}`,
        );
      }
    }

    return {
      status: (record.status as CrayStatus) || CrayStatus.PENDING,
      amount: record.amount,
      confirmedAt: record.completedAt?.toISOString(),
    };
  }

  /**
   * Finds a checkout record by merchant reference.
   * Public so reconciliation service can call it.
   */
  async findByReference(reference: string): Promise<CrayCheckout | null> {
    if (this.checkoutRepo) {
      return this.checkoutRepo.findOne({ where: { reference } });
    }
    return this.memoryCheckouts.get(reference) || null;
  }

  // =====================================================================
  // Persistence helpers
  // =====================================================================

  private async saveCheckout(data: Partial<CrayCheckout>): Promise<CrayCheckout> {
    const record: Partial<CrayCheckout> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.checkoutRepo) {
      return this.checkoutRepo.save(this.checkoutRepo.create(record));
    }

    const full = { id: Math.random().toString(), ...record } as CrayCheckout;
    this.memoryCheckouts.set(data.reference || full.id, full);
    return full;
  }

  private async persistCheckout(record: CrayCheckout): Promise<CrayCheckout> {
    record.updatedAt = new Date();
    if (this.checkoutRepo) {
      return this.checkoutRepo.save(record);
    }
    this.memoryCheckouts.set(record.reference, record);
    return record;
  }
}


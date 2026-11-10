import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigType } from '@nestjs/config';
import { crayConfig } from '../config/cray.config';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import {
  CrayException,
  FundingConfirmedEvent,
  FundingFailedEvent,
  TransferCompletedEvent,
  TransferFailedEvent,
} from '../interfaces/cray.interfaces';
import { CrayWebhookEvent } from '../entities/cray-webhook-event.entity';
import { CrayWebhookPayloadDto } from './dto/webhook-payload.dto';
import { WebhooksVerifier } from './webhooks.verifier';
import { MoneyUtil } from '../utils/money.util';
import { ReferenceUtil } from '../utils/reference.util';

export interface WebhookContext {
  keyHint?: string;
  clientIp?: string;
  rawBody?: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  // In-memory fallback for unit tests running without a database
  private readonly memoryWebhookEvents = new Map<string, CrayWebhookEvent>();

  constructor(
    private readonly verifier: WebhooksVerifier,
    private readonly apiClient: CrayApiClient,
    private readonly eventEmitter: EventEmitter2,
    @Optional()
    @Inject(crayConfig.KEY)
    private readonly config?: ConfigType<typeof crayConfig>,
    @Optional()
    @InjectRepository(CrayWebhookEvent)
    private readonly webhookRepo?: Repository<CrayWebhookEvent>,
  ) {}

  /**
   * Processes an incoming Cray webhook.
   *
   * 1. Cryptographically verifies signature for collection events.
   * 2. Verifies IP allowlist & performs authoritative requery for payin/payout events.
   * 3. Prevents duplicate event processing (replay defense).
   * 4. Persists the event in cray_webhook_events.
   * 5. Emits typed internal domain events via EventEmitter2.
   */
  async processWebhook(
    payload: CrayWebhookPayloadDto,
    context: WebhookContext = {},
  ): Promise<{ received: boolean; eventId: string; status: string }> {
    if (!payload || !payload.event || !payload.data) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'Invalid webhook payload. "event" and "data" are required.',
        retryable: false,
      });
    }

    const eventType = payload.event;
    const data = payload.data;

    // Determine reference from payload
    const reference =
      (data.customer_reference as string) ||
      (data.reference as string) ||
      (data.transaction_reference as string) ||
      '';

    // Generate unique event delivery ID
    const eventId = ReferenceUtil.generate('cray_evt');

    // Mask sensitive data for log outputs
    const maskedAccountNumber = this.maskAccountNumber(
      (data.sender as Record<string, unknown>)?.sender_account_number as string ||
      (data.recipient as Record<string, unknown>)?.recipient_account_number as string,
    );

    this.logger.log(
      `Received Cray webhook: event=${eventType}, ref=${reference}, acc=${maskedAccountNumber}`,
    );

    // --- Replay Defense / Idempotency ---
    if (reference) {
      const existing = await this.findByReferenceAndType(reference, eventType);
      if (existing && existing.status === 'PROCESSED') {
        this.logger.log(`Idempotent skip: event ${eventType} for ref ${reference} already processed.`);
        return { received: true, eventId: existing.eventId, status: 'PROCESSED' };
      }
    }

    let verified = false;

    // --- 1. Collection Events (HMAC-SHA256 signature verification) ---
    if (eventType.startsWith('collection.')) {
      const secret = this.config?.webhookSecret || process.env.CRAY_WEBHOOK_SECRET;
      verified = this.verifier.verifyHmacSignature(
        data,
        payload.hash,
        secret,
        context.keyHint,
      );

      if (!verified) {
        await this.persistWebhookEvent({
          eventId,
          eventType,
          reference,
          signature: payload.hash,
          rawPayload: JSON.stringify(payload),
          verified: false,
          status: 'FAILED',
          errorMessage: 'Invalid HMAC signature',
          receivedAt: new Date(),
        });

        throw new CrayException({
          code: CrayErrorCode.AUTHENTICATION_ERROR,
          message: 'Webhook signature verification failed.',
          retryable: false,
        });
      }
    }
    // --- 2. Payin & Payout Events (IP allowlist + Authoritative Requery) ---
    else if (eventType === 'payin' || eventType === 'payout') {
      const allowedIps = this.config?.webhookAllowedIps || [];
      const ipAllowed = this.verifier.isIpAllowed(context.clientIp, allowedIps);

      if (!ipAllowed) {
        await this.persistWebhookEvent({
          eventId,
          eventType,
          reference,
          rawPayload: JSON.stringify(payload),
          verified: false,
          status: 'FAILED',
          errorMessage: `Client IP ${context.clientIp} not in allowlist`,
          receivedAt: new Date(),
        });

        throw new CrayException({
          code: CrayErrorCode.AUTHENTICATION_ERROR,
          message: 'Webhook sender IP not allowed.',
          retryable: false,
        });
      }

      // Authoritative Requery verification
      verified = await this.authoritativeRequery(eventType, reference, data);
    }
    // --- 3. Unknown or informational events ---
    else {
      this.logger.log(`Ignoring unhandled webhook event type: ${eventType}`);
      await this.persistWebhookEvent({
        eventId,
        eventType,
        reference,
        rawPayload: JSON.stringify(payload),
        verified: true,
        status: 'IGNORED',
        receivedAt: new Date(),
        processedAt: new Date(),
      });
      return { received: true, eventId, status: 'IGNORED' };
    }

    // --- Domain Event Emission ---
    if (verified) {
      await this.emitDomainEvents(eventId, eventType, data, reference);
    }

    // Persist final processed event
    await this.persistWebhookEvent({
      eventId,
      eventType,
      reference,
      signature: payload.hash,
      rawPayload: JSON.stringify(payload),
      verified: true,
      status: 'PROCESSED',
      receivedAt: new Date(),
      processedAt: new Date(),
    });

    return { received: true, eventId, status: 'PROCESSED' };
  }

  // =====================================================================
  // Authoritative Requery
  // =====================================================================

  private async authoritativeRequery(
    eventType: string,
    reference: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    if (!reference) {
      return false;
    }

    try {
      if (eventType === 'payout') {
        const requeryRes = await this.apiClient.get<Record<string, unknown>>(
          `/payout/requery/${reference}`,
        );
        const providerStatus = (
          (requeryRes?.data as Record<string, unknown>)?.status || ''
        ).toString().toLowerCase();

        const webhookStatus = ((data.status as string) || '').toLowerCase();
        // Match authoritative provider status with webhook status
        return providerStatus === webhookStatus || providerStatus === 'approved';
      }

      if (eventType === 'payin') {
        const requeryRes = await this.apiClient.get<Record<string, unknown>>(
          `/query/${reference}`,
        );
        const providerStatus = (
          (requeryRes?.data as Record<string, unknown>)?.status || ''
        ).toString().toLowerCase();

        const webhookStatus = ((data.status as string) || '').toLowerCase();
        return providerStatus === webhookStatus || providerStatus === 'successful';
      }
    } catch (err) {
      this.logger.warn(
        `Authoritative requery failed for ${eventType} ref ${reference}: ${(err as Error).message}`,
      );
      // In case requery fails due to network, do not blindly trust unverified webhook
      return false;
    }

    return false;
  }

  // =====================================================================
  // Domain Event Emission
  // =====================================================================

  private async emitDomainEvents(
    eventId: string,
    eventType: string,
    data: Record<string, unknown>,
    reference: string,
  ): Promise<void> {
    const rawStatus = ((data.status as string) || '').toLowerCase();
    const amountStr = data.amount !== undefined ? MoneyUtil.format(data.amount as number | string) : '0.00';
    const customerId = (data.customer_id as string) || (data.sender as Record<string, unknown>)?.sender_name as string || '';
    const walletId = (data.wallet_id as string) || '';

    // Collections: mobile money or card funding
    if (eventType.startsWith('collection.')) {
      if (rawStatus === 'successful' || eventType.endsWith('.successful')) {
        const event: FundingConfirmedEvent = {
          eventId,
          customerId,
          walletId,
          reference,
          amount: amountStr,
          currency: 'NGN',
          confirmedAt: (data.updatedAt as string) || new Date().toISOString(),
        };
        this.eventEmitter.emit('funding.confirmed', event);
        this.logger.log(`Emitted event funding.confirmed for ref ${reference}`);
      } else {
        const event: FundingFailedEvent = {
          eventId,
          reference,
          reason: (data.provider_message as string) || 'Collection failed',
          failedAt: (data.updatedAt as string) || new Date().toISOString(),
        };
        this.eventEmitter.emit('funding.failed', event);
        this.logger.log(`Emitted event funding.failed for ref ${reference}`);
      }
    }

    // Payouts
    if (eventType === 'payout') {
      const transferId = (data.transaction_id as string) || reference;
      if (rawStatus === 'successful' || rawStatus === 'approved') {
        const event: TransferCompletedEvent = {
          eventId,
          transferId,
          reference,
          amount: amountStr,
          currency: 'NGN',
          completedAt: new Date().toISOString(),
        };
        this.eventEmitter.emit('transfer.completed', event);
        this.logger.log(`Emitted event transfer.completed for ref ${reference}`);
      } else if (rawStatus === 'failed') {
        const event: TransferFailedEvent = {
          eventId,
          transferId,
          reference,
          reason: (data.provider_message as string) || 'Transfer failed',
          failedAt: new Date().toISOString(),
        };
        this.eventEmitter.emit('transfer.failed', event);
        this.logger.log(`Emitted event transfer.failed for ref ${reference}`);
      }
    }
  }

  // =====================================================================
  // Persistence helpers
  // =====================================================================

  private async persistWebhookEvent(
    data: Partial<CrayWebhookEvent>,
  ): Promise<CrayWebhookEvent> {
    const record: Partial<CrayWebhookEvent> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.webhookRepo) {
      return this.webhookRepo.save(this.webhookRepo.create(record));
    }

    const full = { id: ReferenceUtil.generate('wh'), ...record } as CrayWebhookEvent;
    this.memoryWebhookEvents.set(record.eventId || full.id, full);
    return full;
  }

  private async findByReferenceAndType(
    reference: string,
    eventType: string,
  ): Promise<CrayWebhookEvent | null> {
    if (this.webhookRepo) {
      return this.webhookRepo.findOne({
        where: { reference, eventType },
        order: { createdAt: 'DESC' },
      });
    }

    for (const evt of Array.from(this.memoryWebhookEvents.values())) {
      if (evt.reference === reference && evt.eventType === eventType) {
        return evt;
      }
    }

    return null;
  }

  private maskAccountNumber(accountNumber?: string): string {
    if (!accountNumber || accountNumber.length < 4) {
      return '****';
    }
    return `***${accountNumber.slice(-4)}`;
  }
}


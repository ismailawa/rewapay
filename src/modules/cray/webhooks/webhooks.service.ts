import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import type { CrayModuleOptions } from '../config/cray.config';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode } from '../enums/cray.enums';
import {
  CrayException, FundingConfirmedEvent, FundingFailedEvent,
  TransferCompletedEvent, TransferFailedEvent,
} from '../interfaces/cray.interfaces';
import { CrayWebhookEvent } from '../entities/cray-webhook-event.entity';
import { CrayWebhookPayloadDto } from './dto/webhook-payload.dto';
import { WebhooksVerifier } from './webhooks.verifier';
import { MoneyUtil } from '../utils/money.util';

export interface WebhookContext { keyHint?: string; clientIp?: string; rawBody?: string }

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly memory = new Map<string, CrayWebhookEvent>();

  constructor(
    private readonly verifier: WebhooksVerifier,
    private readonly apiClient: CrayApiClient,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CRAY_MODULE_OPTIONS) private readonly options: CrayModuleOptions,
    @Optional() @InjectRepository(CrayWebhookEvent) private readonly repo?: Repository<CrayWebhookEvent>,
  ) {}

  async processWebhook(payload: CrayWebhookPayloadDto, context: WebhookContext = {}): Promise<{ received: boolean; eventId: string; status: string }> {
    if (!payload?.event || !payload.data || !payload.hash) {
      throw new CrayException({ code: CrayErrorCode.INVALID_INPUT, message: 'Webhook event, data, and hash are required.', retryable: false });
    }

    const key = this.selectWebhookKey(context.keyHint);
    if (!key || !this.verifier.verifyHmacSignature(payload.data, payload.hash, key, context.keyHint)) {
      throw new CrayException({ code: CrayErrorCode.AUTHENTICATION_ERROR, message: 'Webhook signature verification failed.', retryable: false });
    }

    const fingerprint = crypto.createHash('sha256')
      .update(`${payload.event}\n${JSON.stringify(payload.data)}\n${payload.hash}`)
      .digest('hex');
    const duplicate = await this.findByFingerprint(fingerprint);
    if (duplicate) return { received: true, eventId: duplicate.eventId, status: 'DUPLICATE' };

    const data = payload.data;
    const eventId = (data.event_id as string) || fingerprint;
    const reference = (data.customer_reference as string) || (data.reference as string) || (data.transaction_reference as string) || '';
    let status = 'PROCESSED';

    const isKnown = payload.event.startsWith('collection.') || payload.event === 'payin' || payload.event === 'payout';
    if (!isKnown) status = 'IGNORED';
    else {
      const authoritative = await this.isAuthoritativeMatch(payload.event, data);
      if (authoritative) await this.emitTerminalEvent(eventId, payload.event, data, reference);
      else status = 'VERIFIED_PENDING';
    }

    await this.persist({
      eventId, fingerprint, eventType: payload.event, reference,
      signature: payload.hash, sanitizedPayload: this.redact(payload), verified: true,
      status, receivedAt: new Date(), processedAt: new Date(),
    });
    return { received: true, eventId, status };
  }

  private selectWebhookKey(hint?: string): string | undefined {
    if (!hint) return this.options.webhookKeys.length === 1 ? this.options.webhookKeys[0] : undefined;
    return this.options.webhookKeys.find((key) => key.slice(-4) === hint);
  }

  private async isAuthoritativeMatch(event: string, data: Record<string, unknown>): Promise<boolean> {
    if (event !== 'payout' && event !== 'payin') return true;
    const providerReference = (data.reference as string) || (data.transaction_reference as string);
    if (!providerReference) return false;
    try {
      const path = event === 'payout' ? `/payout/requery/${providerReference}` : `/query/${providerReference}`;
      const response = await this.apiClient.get<Record<string, unknown>>(path);
      const providerStatus = String((response.data as Record<string, unknown> | undefined)?.status || '').toLowerCase();
      const webhookStatus = String(data.status || '').toLowerCase();
      return providerStatus === webhookStatus || (providerStatus === 'approved' && webhookStatus === 'successful');
    } catch (error) {
      this.logger.warn(`Authoritative webhook requery failed: ${(error as Error).message}`);
      return false;
    }
  }

  private async emitTerminalEvent(eventId: string, eventType: string, data: Record<string, unknown>, reference: string): Promise<void> {
    const status = String(data.status || '').toLowerCase();
    const success = ['successful', 'approved', 'completed'].includes(status);
    const failed = ['failed', 'rejected', 'reversed', 'expired'].includes(status);
    if (!success && !failed) return;
    const amount = data.amount === undefined ? '0.00' : MoneyUtil.toDecimalString(data.amount as string | number);
    const currency = String(data.currency || 'NGN');

    if (eventType.startsWith('collection.') || eventType === 'payin') {
      if (success) {
        const event: FundingConfirmedEvent = {
          eventId, customerId: String(data.customer_id || ''), walletId: String(data.wallet_id || ''),
          reference, amount, currency, confirmedAt: String(data.updated_at || data.updatedAt || new Date().toISOString()),
        };
        this.eventEmitter.emit('funding.confirmed', event);
      } else {
        const event: FundingFailedEvent = { eventId, reference, reason: String(data.provider_message || 'Collection failed'), failedAt: new Date().toISOString() };
        this.eventEmitter.emit('funding.failed', event);
      }
    }

    if (eventType === 'payout') {
      const transferId = String(data.reference || data.transaction_id || reference);
      if (success) {
        const event: TransferCompletedEvent = { eventId, transferId, reference, amount, currency, completedAt: new Date().toISOString() };
        this.eventEmitter.emit('transfer.completed', event);
      } else {
        const event: TransferFailedEvent = { eventId, transferId, reference, reason: String(data.provider_message || 'Transfer failed'), failedAt: new Date().toISOString() };
        this.eventEmitter.emit('transfer.failed', event);
      }
    }
  }

  private redact(value: unknown, key = ''): unknown {
    if (/bvn|nin|otp|account.?number|card|cvv|secret/i.test(key)) {
      const text = String(value || '');
      return text.length >= 4 ? `***${text.slice(-4)}` : '****';
    }
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, this.redact(child, childKey)]));
    }
    return value;
  }

  private async findByFingerprint(fingerprint: string): Promise<CrayWebhookEvent | null> {
    return this.repo ? this.repo.findOne({ where: { fingerprint } }) : this.memory.get(fingerprint) || null;
  }

  private async persist(data: Partial<CrayWebhookEvent>): Promise<CrayWebhookEvent> {
    const record = this.repo
      ? await this.repo.save(this.repo.create(data))
      : ({ id: data.eventId, createdAt: new Date(), updatedAt: new Date(), ...data } as CrayWebhookEvent);
    this.memory.set(record.fingerprint, record);
    return record;
  }
}

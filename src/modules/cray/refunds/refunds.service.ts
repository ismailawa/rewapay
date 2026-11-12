import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayRefund } from '../entities/cray-refund.entity';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import { CrayException, InitiateRefundInput, RefundResult, RefundStatusResult } from '../interfaces/cray.interfaces';
import { MoneyUtil } from '../utils/money.util';
import { ReferenceUtil } from '../utils/reference.util';

interface RefundResponse {
  status?: boolean | string;
  message?: string;
  data?: { reference?: string; status?: string; amount?: string | number; failure_reason?: string };
}

@Injectable()
export class RefundsService {
  private readonly memory = new Map<string, CrayRefund>();

  constructor(
    private readonly apiClient: CrayApiClient,
    @Optional() @InjectRepository(CrayRefund) private readonly repo?: Repository<CrayRefund>,
  ) {}

  async initiate(input: InitiateRefundInput): Promise<RefundResult> {
    if (!input.reference) this.invalid('Original transaction reference is required.');
    if (input.amount !== undefined && !MoneyUtil.isValidAmountString(input.amount)) {
      this.invalid('Partial refund amount must be a positive 2-decimal string.');
    }
    const existing = await this.find(input.reference);
    if (existing) return { refundId: existing.providerReference || existing.id, status: existing.status as CrayStatus };

    const response = await this.apiClient.post<RefundResponse>('/refund/initiate', {
      reference: input.reference,
      ...(input.amount ? { amount: input.amount } : {}),
    });
    const providerReference = response.data?.reference || input.reference;
    const status = this.mapStatus(response.data?.status);
    const record = await this.save({
      reference: input.reference,
      providerReference,
      amount: input.amount,
      status,
      providerStatus: response.data?.status,
    });
    return { refundId: providerReference || record.id, status };
  }

  async getStatus(reference: string): Promise<RefundStatusResult> {
    if (!reference) this.invalid('Refund reference is required.');
    const response = await this.apiClient.get<RefundResponse>(`/refund/query/${reference}`);
    const providerReference = response.data?.reference || reference;
    const status = this.mapStatus(response.data?.status);
    const existing = await this.find(reference);
    const record = await this.save({
      ...(existing || {}), reference, providerReference, status,
      providerStatus: response.data?.status,
      amount: response.data?.amount !== undefined ? MoneyUtil.toDecimalString(response.data.amount) : existing?.amount,
      failureReason: response.data?.failure_reason,
      completedAt: [CrayStatus.SUCCESSFUL, CrayStatus.FAILED].includes(status) ? new Date() : undefined,
    });
    return { refundId: record.providerReference || record.id, status, amount: record.amount, failureReason: record.failureReason };
  }

  private mapStatus(status?: string): CrayStatus {
    switch ((status || '').toLowerCase()) {
      case 'successful': case 'approved': case 'completed': return CrayStatus.SUCCESSFUL;
      case 'failed': case 'rejected': return CrayStatus.FAILED;
      case 'processing': return CrayStatus.PROCESSING;
      default: return CrayStatus.PENDING;
    }
  }

  private invalid(message: string): never {
    throw new CrayException({ code: CrayErrorCode.INVALID_INPUT, message, retryable: false });
  }

  private async find(reference: string): Promise<CrayRefund | null> {
    return this.repo ? this.repo.findOne({ where: [{ reference }, { providerReference: reference }] }) : this.memory.get(reference) || null;
  }

  private async save(data: Partial<CrayRefund>): Promise<CrayRefund> {
    if (this.repo) return this.repo.save(this.repo.create(data));
    const record = { id: data.id || ReferenceUtil.generate('refund'), createdAt: data.createdAt || new Date(), updatedAt: new Date(), ...data } as CrayRefund;
    this.memory.set(record.reference, record);
    if (record.providerReference) this.memory.set(record.providerReference, record);
    return record;
  }
}

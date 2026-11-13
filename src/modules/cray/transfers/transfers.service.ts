/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BanksService } from '../banks/banks.service';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import {
  CrayException,
  InitiateTransferInput,
  TransferResult,
  TransferStatusResult,
} from '../interfaces/cray.interfaces';
import { CrayTransfer } from '../entities/cray-transfer.entity';
import { MoneyUtil } from '../utils/money.util';
import { ReferenceUtil } from '../utils/reference.util';
import { FieldEncryptionUtil } from '../utils/field-encryption.util';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import type { CrayModuleOptions } from '../config/cray.config';

interface CrayDisburseResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    reference?: string;
    amount?: string | number;
    charge?: string | number;
    status?: string;
    merchant_reference?: string;
    recipient_name?: string;
    recipient_bank_code?: string;
    recipient_account_number?: string;
  };
}

interface CrayRequeryResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    reference?: string;
    amount?: string | number;
    charge?: string | number;
    status?: string;
    failure_reason?: string;
    merchant_reference?: string;
    processor_reference?: string;
  };
}

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  // In-memory fallback map for unit tests without database connection
  private readonly memoryTransfers = new Map<string, CrayTransfer>();

  constructor(
    private readonly apiClient: CrayApiClient,
    private readonly banksService: BanksService,
    @Inject(CRAY_MODULE_OPTIONS) private readonly options: CrayModuleOptions,
    @Optional()
    @InjectRepository(CrayTransfer)
    private readonly transferRepo?: Repository<CrayTransfer>,
  ) {}

  /**
   * Initiates an NGN bank payout via Cray v1 POST /api/payout/disburse
   */
  async initiateTransfer(
    input: InitiateTransferInput & { narration?: string; customerId?: string },
  ): Promise<TransferResult> {
    // 1. Validate inputs
    if (!ReferenceUtil.isValidReference(input.reference)) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message:
          'Invalid reference. Must be non-empty and at most 64 characters.',
        retryable: false,
      });
    }

    if (!MoneyUtil.isValidAmountString(input.amount)) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message:
          'Invalid amount. Amount must be a positive 2-decimal NGN string, e.g. "100.00"',
        retryable: false,
      });
    }

    if (
      !input.destination ||
      !input.destination.accountNumber ||
      !input.destination.bankCode ||
      !input.destination.accountName
    ) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message:
          'Destination accountNumber, bankCode, and accountName are required',
        retryable: false,
      });
    }

    // 2. Idempotency Check: repeated call with same reference returns original result
    const existing = await this.findByReference(input.reference);
    if (existing) {
      this.logger.log(
        `Idempotent hit: transfer reference ${input.reference} already processed with status ${existing.status}`,
      );
      return {
        transferId: existing.providerTransferReference || existing.id,
        status: (existing.status as CrayStatus) || CrayStatus.PENDING,
      };
    }

    // Cray documents ref_id as short-lived: validate immediately before every payout.
    const validated = await this.banksService.validateBankAccount({
      accountNumber: input.destination.accountNumber,
      bankCode: input.destination.bankCode,
      customerId: input.customerId,
    });
    const refId = validated.refId;
    if (!refId) {
      throw new CrayException({
        code: CrayErrorCode.PROVIDER_ERROR,
        message: 'Cray account validation did not return the required ref_id.',
        retryable: false,
      });
    }

    // 4. Record initial transfer state in database
    const transferRecord = await this.saveTransfer({
      walletId: input.walletId,
      customerId: input.customerId,
      reference: input.reference,
      amount: input.amount,
      currency: 'NGN',
      accountNumber: FieldEncryptionUtil.encrypt(
        input.destination.accountNumber,
        this.options.dataEncryptionKey,
      ),
      accountNumberLast4: input.destination.accountNumber.slice(-4),
      bankCode: input.destination.bankCode,
      accountName: validated.accountName,
      refId,
      narration: input.narration || 'Payout',
      status: CrayStatus.INITIATED,
      initiatedAt: new Date(),
    });

    // 5. Submit payout to Cray API
    // Sensitive data: mask account number in log
    const masked = `***${input.destination.accountNumber.slice(-4)}`;
    this.logger.log(
      `Initiating payout ref: ${input.reference}, amount: ${input.amount} NGN to ${masked} (bank ${input.destination.bankCode})`,
    );

    const payload = {
      customer_reference: input.reference,
      account_number: input.destination.accountNumber,
      bank_code: input.destination.bankCode,
      amount: input.amount,
      recipient_name: validated.accountName,
      ref_id: refId,
      currency: 'NGN',
    };

    try {
      const response = await this.apiClient.post<CrayDisburseResponse>(
        '/api/payout/disburse',
        payload,
      );

      // Cray v1 requery requires the provider transaction ID in data.reference.
      // Never substitute the merchant reference: that would query the wrong key.
      const providerReference = response?.data?.reference || '';
      const fee = response?.data?.charge
        ? response.data.charge.toString()
        : undefined;

      transferRecord.providerTransferReference = providerReference;
      transferRecord.status = CrayStatus.PENDING;
      transferRecord.fee = fee;
      transferRecord.providerStatus = response?.data?.status || 'pending';
      await this.persistTransfer(transferRecord);

      return {
        transferId: providerReference || transferRecord.id,
        status: CrayStatus.PENDING,
      };
    } catch (err) {
      const crayError = err as CrayException;

      // PRD Section FR-06 Critical Timeout Rule:
      // If error is a network timeout / retryable, do NOT mark failed! Keep PENDING so requery/reconciliation resolves it.
      if (crayError.retryable) {
        this.logger.warn(
          `Payout request timed out or experienced network interruption for reference ${input.reference}. Keeping transaction PENDING for reconciliation.`,
        );
        transferRecord.status = CrayStatus.PENDING;
        transferRecord.failureMessageSanitized = `Interrupted: ${crayError.message}. Pending status requery.`;
        await this.persistTransfer(transferRecord);

        return {
          transferId: transferRecord.id,
          status: CrayStatus.PENDING,
        };
      }

      // Definitive failure (e.g. 400 Insufficient funds, 409 conflict, etc.)
      transferRecord.status = CrayStatus.FAILED;
      transferRecord.failureCode = crayError.code;
      transferRecord.failureMessageSanitized = crayError.message;
      await this.persistTransfer(transferRecord);

      throw crayError;
    }
  }

  /**
   * Retrieves transfer status from local record and requeries Cray if pending
   */
  async getTransferStatus(reference: string): Promise<TransferStatusResult> {
    const transfer = await this.findByReference(reference);
    if (!transfer) {
      throw new CrayException({
        code: CrayErrorCode.NOT_FOUND,
        message: `Transfer with reference ${reference} not found`,
        retryable: false,
      });
    }

    // If still pending/processing and we have a provider reference, requery Cray API
    const isPending =
      transfer.status === CrayStatus.PENDING ||
      transfer.status === CrayStatus.PROCESSING ||
      transfer.status === CrayStatus.INITIATED;

    if (isPending && transfer.providerTransferReference) {
      try {
        const requery = await this.apiClient.get<CrayRequeryResponse>(
          `/api/payout/requery/${encodeURIComponent(transfer.providerTransferReference)}`,
        );

        const providerStatus = (requery?.data?.status || '').toLowerCase();
        transfer.providerStatus = providerStatus;

        if (providerStatus === 'approved' || providerStatus === 'successful') {
          transfer.status = CrayStatus.SUCCESSFUL;
          transfer.completedAt = new Date();
        } else if (
          providerStatus === 'failed' ||
          providerStatus === 'reversed'
        ) {
          transfer.status = CrayStatus.FAILED;
          transfer.failureMessageSanitized =
            requery?.data?.failure_reason ||
            requery?.message ||
            'Transfer failed';
          transfer.completedAt = new Date();
        } else if (
          providerStatus === 'pending' ||
          providerStatus === 'processing'
        ) {
          transfer.status = CrayStatus.PROCESSING;
        }

        await this.persistTransfer(transfer);
      } catch (err) {
        this.logger.warn(
          `Could not requery status for transfer ${reference}: ${(err as Error).message}`,
        );
      }
    }

    return {
      status: (transfer.status as CrayStatus) || CrayStatus.PENDING,
      amount: MoneyUtil.toDecimalString(transfer.amount),
      failureReason: transfer.failureMessageSanitized,
    };
  }

  // -------------------------------------------------------------
  // Persistence Helpers
  // -------------------------------------------------------------

  async findByReference(reference: string): Promise<CrayTransfer | null> {
    if (this.transferRepo) {
      return this.transferRepo.findOne({ where: { reference } });
    }
    return this.memoryTransfers.get(reference) || null;
  }

  private async saveTransfer(
    data: Partial<CrayTransfer>,
  ): Promise<CrayTransfer> {
    const transfer: Partial<CrayTransfer> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.transferRepo) {
      return this.transferRepo.save(this.transferRepo.create(transfer));
    }

    const full = {
      id: Math.random().toString(),
      ...transfer,
    } as CrayTransfer;
    this.memoryTransfers.set(data.reference || full.id, full);
    return full;
  }

  private async persistTransfer(transfer: CrayTransfer): Promise<CrayTransfer> {
    transfer.updatedAt = new Date();
    if (this.transferRepo) {
      return this.transferRepo.save(transfer);
    }
    this.memoryTransfers.set(transfer.reference, transfer);
    return transfer;
  }
}

import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import { CrayException, PlatformBalanceResult } from '../interfaces/cray.interfaces';
import { CrayBalanceSnapshot } from '../entities/cray-balance-snapshot.entity';
import { CrayReconciliationRecord } from '../entities/cray-reconciliation-record.entity';
import { CrayTransfer } from '../entities/cray-transfer.entity';
import { CrayCheckout } from '../entities/cray-checkout.entity';
import { MoneyUtil } from '../utils/money.util';

export interface ReconciliationReport {
  totalProcessed: number;
  resolvedCount: number;
  stuckCount: number;
  records: Partial<CrayReconciliationRecord>[];
}

interface CrayBalanceItem {
  id?: string;
  account_name?: string;
  currency?: string;
  available_balance?: number | string;
  available?: number | string;
  actual_balance?: number | string;
  locked_balance?: number | string;
  ledger_balance?: number | string;
}

interface CrayBalanceResponse {
  status?: boolean | string;
  message?: string;
  data?: CrayBalanceItem | CrayBalanceItem[];
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  // In-memory fallback maps for testing without a database
  private readonly memorySnapshots = new Map<string, CrayBalanceSnapshot>();
  private readonly memoryReconRecords = new Map<string, CrayReconciliationRecord>();
  private readonly memoryTransfers = new Map<string, CrayTransfer>();
  private readonly memoryCheckouts = new Map<string, CrayCheckout>();

  constructor(
    private readonly apiClient: CrayApiClient,
    @Optional()
    @InjectRepository(CrayBalanceSnapshot)
    private readonly snapshotRepo?: Repository<CrayBalanceSnapshot>,
    @Optional()
    @InjectRepository(CrayReconciliationRecord)
    private readonly reconRepo?: Repository<CrayReconciliationRecord>,
    @Optional()
    @InjectRepository(CrayTransfer)
    private readonly transferRepo?: Repository<CrayTransfer>,
    @Optional()
    @InjectRepository(CrayCheckout)
    private readonly checkoutRepo?: Repository<CrayCheckout>,
  ) {}

  // =====================================================================
  // Platform Balance Operations (GET /balance)
  // =====================================================================

  /**
   * Fetches the platform wallet balance via GET /balance.
   * Endpoint: GET /balance
   * Docs: docs/cray-api-v2-docs.md § Quick Start & Wallet Balance
   */
  async getPlatformBalance(currency = 'NGN'): Promise<PlatformBalanceResult> {
    const response = await this.apiClient.get<CrayBalanceResponse>('/balance');
    const items = this.normalizeBalanceItems(response);

    const match = items.find(
      (item) => (item.currency || 'NGN').toUpperCase() === currency.toUpperCase(),
    ) || items[0];

    if (!match) {
      throw new CrayException({
        code: CrayErrorCode.NOT_FOUND,
        message: `No wallet balance found for currency ${currency}`,
        retryable: false,
      });
    }

    const availableNum = match.available_balance ?? match.available ?? 0;
    const ledgerNum = match.actual_balance ?? match.ledger_balance ?? availableNum;

    return {
      currency: (match.currency || currency).toUpperCase(),
      available: MoneyUtil.format(availableNum),
      ledger: MoneyUtil.format(ledgerNum),
    };
  }

  /**
   * Takes a persistent snapshot of the platform balance in the database.
   * Called on hourly schedule or on demand.
   */
  async snapshotPlatformBalance(currency = 'NGN'): Promise<CrayBalanceSnapshot> {
    const response = await this.apiClient.get<CrayBalanceResponse>('/balance');
    const items = this.normalizeBalanceItems(response);

    const match = items.find(
      (item) => (item.currency || 'NGN').toUpperCase() === currency.toUpperCase(),
    ) || items[0];

    const availableNum = match?.available_balance ?? match?.available ?? 0;
    const ledgerNum = match?.actual_balance ?? match?.ledger_balance;
    const lockedNum = match?.locked_balance;

    const snapshotData: Partial<CrayBalanceSnapshot> = {
      currency: (match?.currency || currency).toUpperCase(),
      availableBalance: MoneyUtil.format(availableNum),
      ledgerBalance: ledgerNum !== undefined ? MoneyUtil.format(ledgerNum) : undefined,
      lockedBalance: lockedNum !== undefined ? MoneyUtil.format(lockedNum) : undefined,
      providerAccountId: match?.id,
      rawResponse: JSON.stringify(response),
      createdAt: new Date(),
    };

    if (this.snapshotRepo) {
      return this.snapshotRepo.save(this.snapshotRepo.create(snapshotData));
    }

    const full = { id: Math.random().toString(), ...snapshotData } as CrayBalanceSnapshot;
    this.memorySnapshots.set(full.id, full);
    this.logger.log(`Created balance snapshot for ${snapshotData.currency}: ${snapshotData.availableBalance}`);
    return full;
  }

  // =====================================================================
  // Reconciliation Engine (Requery & Stuck Item Detection)
  // =====================================================================

  /**
   * Scans pending transfers and checkouts older than `olderThanMinutes` (default 3m).
   * Requeries status from provider, resolves states, and flags transactions
   * stuck longer than `stuckThresholdMinutes` (default 30m) for manual review.
   */
  async reconcilePendingTransactions(
    olderThanMinutes = 3,
    stuckThresholdMinutes = 30,
  ): Promise<ReconciliationReport> {
    const now = Date.now();
    const olderThanDate = new Date(now - olderThanMinutes * 60 * 1000);
    const stuckThresholdDate = new Date(now - stuckThresholdMinutes * 60 * 1000);

    const report: ReconciliationReport = {
      totalProcessed: 0,
      resolvedCount: 0,
      stuckCount: 0,
      records: [],
    };

    // --- 1. Reconcile Transfers ---
    const pendingTransfers = await this.findPendingTransfers(olderThanDate);
    for (const transfer of pendingTransfers) {
      report.totalProcessed++;
      const createdAt = new Date(transfer.createdAt).getTime();
      const isStuck = createdAt < stuckThresholdDate.getTime();

      if (isStuck) {
        report.stuckCount++;
        this.logger.error(
          `STUCK TRANSACTION ALERT: Transfer ${transfer.reference} in PENDING for > ${stuckThresholdMinutes}m`,
        );
        const reconRecord = await this.saveReconRecord({
          reference: transfer.reference,
          type: 'TRANSFER',
          previousStatus: transfer.status,
          newStatus: 'REQUIRES_MANUAL_REVIEW',
          resolved: false,
          flaggedForReview: true,
          reviewReason: `Transaction stuck in ${transfer.status} > ${stuckThresholdMinutes} minutes`,
          requeriedAt: new Date(),
        });
        report.records.push(reconRecord);
      } else {
        // Requery Cray payout status via GET /payout/requery/{reference}
        try {
          const requeryRes = await this.apiClient.get<Record<string, unknown>>(
            `/payout/requery/${transfer.reference}`,
          );
          const rawStatus = (
            (requeryRes?.data as Record<string, unknown>)?.status || ''
          ).toString().toLowerCase();

          if (rawStatus === 'approved' || rawStatus === 'successful') {
            transfer.status = CrayStatus.SUCCESSFUL;
            await this.updateTransfer(transfer);
            report.resolvedCount++;
            const reconRecord = await this.saveReconRecord({
              reference: transfer.reference,
              type: 'TRANSFER',
              previousStatus: CrayStatus.PENDING,
              newStatus: CrayStatus.SUCCESSFUL,
              resolved: true,
              flaggedForReview: false,
              requeriedAt: new Date(),
            });
            report.records.push(reconRecord);
          } else if (rawStatus === 'failed') {
            transfer.status = CrayStatus.FAILED;
            await this.updateTransfer(transfer);
            report.resolvedCount++;
            const reconRecord = await this.saveReconRecord({
              reference: transfer.reference,
              type: 'TRANSFER',
              previousStatus: CrayStatus.PENDING,
              newStatus: CrayStatus.FAILED,
              resolved: true,
              flaggedForReview: false,
              requeriedAt: new Date(),
            });
            report.records.push(reconRecord);
          }
        } catch (err) {
          this.logger.warn(`Requery failed for transfer ${transfer.reference}: ${(err as Error).message}`);
        }
      }
    }

    // --- 2. Reconcile Checkouts ---
    const pendingCheckouts = await this.findPendingCheckouts(olderThanDate);
    for (const checkout of pendingCheckouts) {
      report.totalProcessed++;
      const createdAt = new Date(checkout.createdAt).getTime();
      const isStuck = createdAt < stuckThresholdDate.getTime();

      if (isStuck) {
        report.stuckCount++;
        this.logger.error(
          `STUCK TRANSACTION ALERT: Checkout ${checkout.reference} in PENDING for > ${stuckThresholdMinutes}m`,
        );
        const reconRecord = await this.saveReconRecord({
          reference: checkout.reference,
          type: 'CHECKOUT',
          previousStatus: checkout.status,
          newStatus: 'REQUIRES_MANUAL_REVIEW',
          resolved: false,
          flaggedForReview: true,
          reviewReason: `Checkout session stuck in ${checkout.status} > ${stuckThresholdMinutes} minutes`,
          requeriedAt: new Date(),
        });
        report.records.push(reconRecord);
      } else {
        // Requery checkout status via GET /checkout/query/{reference}
        try {
          const queryRef = checkout.payCode || checkout.reference;
          const requeryRes = await this.apiClient.get<Record<string, unknown>>(
            `/checkout/query/${queryRef}`,
          );
          const rawStatus = (
            (requeryRes?.data as Record<string, unknown>)?.status || ''
          ).toString().toLowerCase();

          if (rawStatus === 'successful' || rawStatus === 'approved') {
            checkout.status = CrayStatus.SUCCESSFUL;
            await this.updateCheckout(checkout);
            report.resolvedCount++;
            const reconRecord = await this.saveReconRecord({
              reference: checkout.reference,
              type: 'CHECKOUT',
              previousStatus: CrayStatus.PENDING,
              newStatus: CrayStatus.SUCCESSFUL,
              resolved: true,
              flaggedForReview: false,
              requeriedAt: new Date(),
            });
            report.records.push(reconRecord);
          } else if (rawStatus === 'failed' || rawStatus === 'expired') {
            checkout.status = CrayStatus.FAILED;
            await this.updateCheckout(checkout);
            report.resolvedCount++;
            const reconRecord = await this.saveReconRecord({
              reference: checkout.reference,
              type: 'CHECKOUT',
              previousStatus: CrayStatus.PENDING,
              newStatus: CrayStatus.FAILED,
              resolved: true,
              flaggedForReview: false,
              requeriedAt: new Date(),
            });
            report.records.push(reconRecord);
          }
        } catch (err) {
          this.logger.warn(`Requery failed for checkout ${checkout.reference}: ${(err as Error).message}`);
        }
      }
    }

    this.logger.log(
      `Reconciliation cycle completed: processed=${report.totalProcessed}, resolved=${report.resolvedCount}, stuck=${report.stuckCount}`,
    );

    return report;
  }

  // =====================================================================
  // Helpers & Persistence
  // =====================================================================

  private normalizeBalanceItems(response: CrayBalanceResponse): CrayBalanceItem[] {
    if (!response || !response.data) return [];
    if (Array.isArray(response.data)) return response.data;
    return [response.data];
  }

  private async findPendingTransfers(olderThan: Date): Promise<CrayTransfer[]> {
    if (this.transferRepo) {
      return this.transferRepo.find({
        where: {
          status: CrayStatus.PENDING,
          createdAt: LessThan(olderThan),
        },
      });
    }

    return Array.from(this.memoryTransfers.values()).filter(
      (t) => t.status === CrayStatus.PENDING && new Date(t.createdAt).getTime() < olderThan.getTime(),
    );
  }

  private async findPendingCheckouts(olderThan: Date): Promise<CrayCheckout[]> {
    if (this.checkoutRepo) {
      return this.checkoutRepo.find({
        where: {
          status: CrayStatus.PENDING,
          createdAt: LessThan(olderThan),
        },
      });
    }

    return Array.from(this.memoryCheckouts.values()).filter(
      (c) => c.status === CrayStatus.PENDING && new Date(c.createdAt).getTime() < olderThan.getTime(),
    );
  }

  private async updateTransfer(transfer: CrayTransfer): Promise<void> {
    transfer.updatedAt = new Date();
    if (this.transferRepo) {
      await this.transferRepo.save(transfer);
      return;
    }
    this.memoryTransfers.set(transfer.reference, transfer);
  }

  private async updateCheckout(checkout: CrayCheckout): Promise<void> {
    checkout.updatedAt = new Date();
    if (this.checkoutRepo) {
      await this.checkoutRepo.save(checkout);
      return;
    }
    this.memoryCheckouts.set(checkout.reference, checkout);
  }

  private async saveReconRecord(
    data: Partial<CrayReconciliationRecord>,
  ): Promise<CrayReconciliationRecord> {
    const timestamp = new Date();
    const entityData = {
      ...data,
      updatedAt: timestamp,
      createdAt: timestamp,
    };

    if (this.reconRepo) {
      return this.reconRepo.save(this.reconRepo.create(entityData));
    }

    const full = { id: Math.random().toString(), ...entityData } as CrayReconciliationRecord;
    this.memoryReconRecords.set(full.id, full);
    return full;
  }

  // Test helpers to seed in-memory records
  seedTransfer(transfer: CrayTransfer): void {
    this.memoryTransfers.set(transfer.reference, transfer);
  }

  seedCheckout(checkout: CrayCheckout): void {
    this.memoryCheckouts.set(checkout.reference, checkout);
  }
}


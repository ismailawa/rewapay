import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ReconciliationReport, ReconciliationService } from './reconciliation.service';
import { PlatformBalanceResult } from '../interfaces/cray.interfaces';
import { CrayBalanceSnapshot } from '../entities/cray-balance-snapshot.entity';

/**
 * Controller for platform balance lookups and manual reconciliation triggers.
 *
 * Routes:
 *   GET  /cray/balance               → getPlatformBalance (wraps GET /api/balance)
 *   POST /cray/balance/snapshot      → snapshotPlatformBalance
 *   POST /cray/reconciliation/run    → reconcilePendingTransactions
 */
@Controller('cray')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * Fetches current platform wallet balance via GET /cray/balance?currency=NGN
   * Wraps Cray GET /api/balance
   */
  @Get('balance')
  async getBalance(@Query('currency') currency?: string): Promise<PlatformBalanceResult> {
    return this.reconciliationService.getPlatformBalance(currency || 'NGN');
  }

  /**
   * Triggers an explicit snapshot of the current platform balance.
   * POST /cray/balance/snapshot
   */
  @Post('balance/snapshot')
  @HttpCode(HttpStatus.CREATED)
  async snapshotBalance(
    @Query('currency') currency?: string,
  ): Promise<CrayBalanceSnapshot> {
    return this.reconciliationService.snapshotPlatformBalance(currency || 'NGN');
  }

  /**
   * Triggers an on-demand reconciliation cycle across pending transfers and checkouts.
   * POST /cray/reconciliation/run
   */
  @Post('reconciliation/run')
  @HttpCode(HttpStatus.OK)
  async runReconciliation(
    @Query('olderThanMinutes') olderThanMinutes?: string,
    @Query('stuckThresholdMinutes') stuckThresholdMinutes?: string,
  ): Promise<ReconciliationReport> {
    const olderThan = olderThanMinutes ? parseInt(olderThanMinutes, 10) : 3;
    const stuckThreshold = stuckThresholdMinutes ? parseInt(stuckThresholdMinutes, 10) : 30;
    return this.reconciliationService.reconcilePendingTransactions(olderThan, stuckThreshold);
  }
}

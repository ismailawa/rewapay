import { Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ReconciliationReport, ReconciliationService } from './reconciliation.service';
import { PlatformBalanceResult } from '../interfaces/cray.interfaces';
import { CrayBalanceSnapshot } from '../entities/cray-balance-snapshot.entity';
import { CrayAuthorizedControllerBase } from '../controllers';

/**
 * Unmounted admin controller base for balance and reconciliation operations.
 *
 * Hosts must use a dedicated admin prefix, guard, and authorization policy.
 */
export abstract class CrayAdminControllerBase extends CrayAuthorizedControllerBase {
  protected constructor(
    protected readonly reconciliationService: ReconciliationService,
  ) {
    super();
  }

  /**
   * Fetches current platform wallet balance via GET /balance?currency=NGN
   * Wraps Cray GET /api/balance
   */
  @Get('balance')
  async getBalance(
    @Query('currency') currency: string | undefined,
    @Req() request: Request,
  ): Promise<PlatformBalanceResult> {
    await this.assertAuthorized(request, 'admin.balance.read', {
      currency: currency || 'NGN',
    });
    return this.reconciliationService.getPlatformBalance(currency || 'NGN');
  }

  /**
   * Triggers an explicit snapshot of the current platform balance.
   * POST /balance/snapshot
   */
  @Post('balance/snapshot')
  @HttpCode(HttpStatus.CREATED)
  async snapshotBalance(
    @Req() request: Request,
    @Query('currency') currency?: string,
  ): Promise<CrayBalanceSnapshot> {
    await this.assertAuthorized(request, 'admin.balance.snapshot', {
      currency: currency || 'NGN',
    });
    return this.reconciliationService.snapshotPlatformBalance(currency || 'NGN');
  }

  /**
   * Triggers an on-demand reconciliation cycle across pending transfers and checkouts.
   * POST /reconciliation/run
   */
  @Post('reconciliation/run')
  @HttpCode(HttpStatus.OK)
  async runReconciliation(
    @Req() request: Request,
    @Query('olderThanMinutes') olderThanMinutes?: string,
    @Query('stuckThresholdMinutes') stuckThresholdMinutes?: string,
  ): Promise<ReconciliationReport> {
    await this.assertAuthorized(request, 'admin.reconciliation.run');
    const olderThan = olderThanMinutes ? parseInt(olderThanMinutes, 10) : 3;
    const stuckThreshold = stuckThresholdMinutes ? parseInt(stuckThresholdMinutes, 10) : 30;
    return this.reconciliationService.reconcilePendingTransactions(olderThan, stuckThreshold);
  }
}

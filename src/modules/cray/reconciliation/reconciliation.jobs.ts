import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReconciliationService } from './reconciliation.service';

@Injectable()
export class ReconciliationJobs {
  private readonly logger = new Logger(ReconciliationJobs.name);
  private reconciling = false;
  private snapshotting = false;

  constructor(private readonly reconciliation: ReconciliationService) {}

  @Cron('0 */5 * * * *')
  async reconcilePending(): Promise<void> {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      await this.reconciliation.reconcilePendingTransactions(3, 30);
    } catch (error) {
      this.logger.error(`Scheduled reconciliation failed: ${(error as Error).message}`);
    } finally {
      this.reconciling = false;
    }
  }

  @Cron('0 0 * * * *')
  async snapshotBalances(): Promise<void> {
    if (this.snapshotting) return;
    this.snapshotting = true;
    try {
      await this.reconciliation.snapshotPlatformBalance('NGN');
    } catch (error) {
      this.logger.error(`Scheduled balance snapshot failed: ${(error as Error).message}`);
    } finally {
      this.snapshotting = false;
    }
  }
}

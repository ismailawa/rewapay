import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { crayConfig } from './config/cray.config';
import { CrayErrorCode, CrayStatus } from './enums/cray.enums';
import {
  BankItem,
  CreateFundingSessionInput,
  CreateVirtualAccountInput,
  CrayException,
  FundingSessionResult,
  FundingStatusResult,
  ICrayService,
  InitiateRefundInput,
  InitiateTransferInput,
  PlatformBalanceResult,
  RefundResult,
  SubmitVirtualAccountOtpInput,
  SubmitVirtualAccountOtpResult,
  TransferResult,
  TransferStatusResult,
  ValidateBankAccountInput,
  ValidateBankAccountResult,
  VirtualAccountDetails,
  VirtualAccountResult,
} from './interfaces/cray.interfaces';
import { AccountsService } from './accounts/accounts.service';
import { BanksService } from './banks/banks.service';
import { TransfersService } from './transfers/transfers.service';
import { CheckoutService } from './checkout/checkout.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { IdempotencyService } from './idempotency/idempotency.service';
import { MoneyUtil } from './utils/money.util';
import { ReferenceUtil } from './utils/reference.util';

/**
 * Unified Cray service facade implementing the in-process ICrayService interface.
 * Consumed directly by the RewaPay wallet and backend modules.
 *
 * Implements the RewaPay x Cray Interface Contract (v0.1).
 */
@Injectable()
export class CrayService implements ICrayService {
  private readonly logger = new Logger(CrayService.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly banksService: BanksService,
    private readonly transfersService: TransfersService,
    private readonly checkoutService: CheckoutService,
    private readonly reconciliationService: ReconciliationService,
    private readonly idempotencyService: IdempotencyService,
    @Optional()
    @Inject(crayConfig.KEY)
    private readonly config?: ConfigType<typeof crayConfig>,
  ) {}

  // =====================================================================
  // 1. Virtual Accounts (Section 3.1)
  // =====================================================================

  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<VirtualAccountResult> {
    return this.accountsService.createVirtualAccount(input);
  }

  async submitVirtualAccountOtp(
    input: SubmitVirtualAccountOtpInput,
  ): Promise<SubmitVirtualAccountOtpResult> {
    return this.accountsService.submitVirtualAccountOtp(input);
  }

  async getVirtualAccount(
    customerId: string,
  ): Promise<VirtualAccountDetails | null> {
    return this.accountsService.getVirtualAccount(customerId);
  }

  // =====================================================================
  // 2. Collections / Funding Sessions (Section 3.2)
  // =====================================================================

  async createFundingSession(
    input: CreateFundingSessionInput,
  ): Promise<FundingSessionResult> {
    if (!input.customerId || !input.walletId || !input.amount || !input.reference) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'customerId, walletId, amount, and reference are required.',
        retryable: false,
      });
    }

    const defaultPaymentMethod = input.method === 'card' ? 'card' : 'transfer';

    return this.idempotencyService.execute({
      key: input.reference,
      operation: 'createFundingSession',
      payload: input,
      fn: async () => {
        return this.checkoutService.createCheckoutSession({
          amount: input.amount,
          currency: 'NGN',
          reference: input.reference,
          customerId: input.customerId,
          walletId: input.walletId,
          defaultPaymentMethod,
          feeBearer: 'merchant',
          customer: {
            name: `Customer ${input.customerId}`,
            email: `${input.customerId}@customer.rewapay.io`,
          },
          narration: `Wallet funding for ${input.walletId}`,
        });
      },
    });
  }

  async getFundingStatus(reference: string): Promise<FundingStatusResult> {
    return this.checkoutService.getCheckoutStatus(reference);
  }

  // =====================================================================
  // 3. Bank Directory & Account Validation (Section 3.3)
  // =====================================================================

  async listBanks(): Promise<BankItem[]> {
    return this.banksService.listBanks();
  }

  async validateBankAccount(
    input: ValidateBankAccountInput,
  ): Promise<ValidateBankAccountResult> {
    return this.banksService.validateBankAccount(input);
  }

  // =====================================================================
  // 4. Disbursements / Transfers (Section 3.4)
  // =====================================================================

  async initiateTransfer(input: InitiateTransferInput): Promise<TransferResult> {
    if (!input.reference || !input.amount || !input.destination) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'reference, amount, and destination are required.',
        retryable: false,
      });
    }

    return this.idempotencyService.execute({
      key: input.reference,
      operation: 'initiateTransfer',
      payload: input,
      fn: async () => {
        return this.transfersService.initiateTransfer(input);
      },
    });
  }

  async getTransferStatus(reference: string): Promise<TransferStatusResult> {
    return this.transfersService.getTransferStatus(reference);
  }

  // =====================================================================
  // 5. Refunds (Section 3.5 - Decision 4: Deferred / Feature-Gated)
  // =====================================================================

  async initiateRefund(input: InitiateRefundInput): Promise<RefundResult> {
    const refundsEnabled = process.env.CRAY_ENABLE_REFUNDS === 'true';

    if (!refundsEnabled) {
      this.logger.warn(`Refund requested for ref ${input.reference} but refunds are deferred to Phase 2.`);
      throw new CrayException({
        code: CrayErrorCode.NOT_SUPPORTED,
        message: 'Refunds are currently disabled or pending provider specification (Deferred to Phase 2).',
        retryable: false,
      });
    }

    // When enabled post-MVP:
    return {
      refundId: ReferenceUtil.generate('ref_refund'),
      status: CrayStatus.PENDING,
    };
  }

  // =====================================================================
  // 6. Platform Balance (Section 3.6)
  // =====================================================================

  async getPlatformBalance(currency?: string): Promise<PlatformBalanceResult> {
    return this.reconciliationService.getPlatformBalance(currency || 'NGN');
  }
}

import { Injectable } from '@nestjs/common';
import { CrayErrorCode } from './enums/cray.enums';
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
  RefundStatusResult,
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
import { RefundsService } from './refunds/refunds.service';

/**
 * Unified Cray service facade implementing the in-process ICrayService interface.
 * Consumed directly by the RewaPay wallet and backend modules.
 *
 * Implements the RewaPay x Cray Interface Contract (v0.1).
 */
@Injectable()
export class CrayService implements ICrayService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly banksService: BanksService,
    private readonly transfersService: TransfersService,
    private readonly checkoutService: CheckoutService,
    private readonly reconciliationService: ReconciliationService,
    private readonly idempotencyService: IdempotencyService,
    private readonly refundsService: RefundsService,
  ) {}

  // =====================================================================
  // 1. Virtual Accounts (Section 3.1)
  // =====================================================================

  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<VirtualAccountResult> {
    return this.accountsService.createVirtualAccount(input);
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
    if (
      !input.customerId ||
      !input.walletId ||
      !input.amount ||
      !input.reference ||
      !input.customer?.name ||
      !input.customer?.email
    ) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message:
          'customerId, walletId, amount, reference, and real customer details are required.',
        retryable: false,
      });
    }

    return this.idempotencyService.execute({
      key: `funding:${input.reference}`,
      operation: 'createFundingSession',
      payload: input,
      fn: async () => {
        return this.checkoutService.createCheckoutSession({
          amount: input.amount,
          currency: 'NGN',
          reference: input.reference,
          customerId: input.customerId,
          walletId: input.walletId,
          defaultPaymentMethod: input.method,
          feeBearer: 'merchant',
          customer: input.customer,
          token: input.token,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
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

  async initiateTransfer(
    input: InitiateTransferInput,
  ): Promise<TransferResult> {
    if (!input.reference || !input.amount || !input.destination) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'reference, amount, and destination are required.',
        retryable: false,
      });
    }

    return this.idempotencyService.execute({
      key: `transfer:${input.reference}`,
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
  // 5. Refunds
  // =====================================================================

  async initiateRefund(input: InitiateRefundInput): Promise<RefundResult> {
    return this.idempotencyService.execute({
      key: `refund:${input.reference}:${input.amount || 'full'}`,
      operation: 'initiateRefund',
      payload: input,
      fn: () => this.refundsService.initiate(input),
    });
  }

  async getRefundStatus(reference: string): Promise<RefundStatusResult> {
    return this.refundsService.getStatus(reference);
  }

  // =====================================================================
  // 6. Platform Balance (Section 3.6)
  // =====================================================================

  async getPlatformBalance(currency?: string): Promise<PlatformBalanceResult> {
    return this.reconciliationService.getPlatformBalance(currency || 'NGN');
  }
}

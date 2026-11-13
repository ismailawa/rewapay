import { CrayErrorCode, CrayStatus, FundingMethod } from '../enums/cray.enums';

export interface CrayErrorPayload {
  code: CrayErrorCode;
  message: string;
  retryable: boolean;
  providerCode?: string;
  details?: unknown;
}

export class CrayException extends Error {
  public readonly code: CrayErrorCode;
  public readonly retryable: boolean;
  public readonly providerCode?: string;
  public readonly details?: unknown;

  constructor(payload: CrayErrorPayload) {
    super(payload.message);
    this.name = 'CrayException';
    this.code = payload.code;
    this.retryable = payload.retryable;
    this.providerCode = payload.providerCode;
    this.details = payload.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): CrayErrorPayload {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.providerCode ? { providerCode: this.providerCode } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

// -------------------------------------------------------------
// Operation Inputs & Results (Interface Contract v0.1 Section 3)
// -------------------------------------------------------------

interface VirtualAccountBaseInput {
  customerId: string;
  email: string;
  accountName: string;
}

export interface CreateBlocPermanentAccountInput extends VirtualAccountBaseInput {
  provider: 'Bloc';
  accountType: 'Permanent';
  firstName?: string;
  lastName?: string;
  otherName?: string;
  dateOfBirth?: string;
}

export interface CreatePalmPayPermanentAccountInput extends VirtualAccountBaseInput {
  provider: 'palmpay';
  accountType: 'Permanent';
  customerName: string;
  bvn?: string;
  nin?: string;
}

export interface CreateOneTimeAccountInput extends VirtualAccountBaseInput {
  provider: 'Bloc' | 'palmpay';
  accountType: 'onetime';
  amount: string;
  returnUrl?: string;
  orderExpireSeconds?: number;
}

export interface CreateCorporateAccountInput {
  customerId: string;
  accountType: 'corporate';
  fullName: string;
  bvn: string;
  rcNumber: string;
  phone: string;
  email: string;
  businessType:
    | 'COMPANY'
    | 'BUSINESS_NAME'
    | 'INCORPORATED_TRUSTEES'
    | 'LIMITED_PARTNERSHIP'
    | 'LIMITED_LIABILITY_PARTNERSHIP';
  businessName?: string;
  tin?: string;
}

export type CreateVirtualAccountInput =
  | CreateBlocPermanentAccountInput
  | CreatePalmPayPermanentAccountInput
  | CreateOneTimeAccountInput
  | CreateCorporateAccountInput;

export interface VirtualAccountResult {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string;
  status: CrayStatus | 'OTP_REQUIRED';
}

export interface VirtualAccountDetails {
  customerId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string;
  currency: string;
  status: CrayStatus;
  createdAt: string;
}

export interface CreateFundingSessionInput {
  customerId: string;
  walletId: string;
  amount: string; // NGN decimal string, e.g. "100.00"
  reference: string; // max 64 chars
  method: FundingMethod | 'card' | 'transfer' | 'mobile_money';
  customer: { name: string; email: string };
  token?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface FundingSessionResult {
  sessionId: string;
  paymentUrl: string;
  expiresAt?: string; // ISO 8601 UTC when provided by Cray
}

export interface FundingStatusResult {
  status: CrayStatus;
  amount: string;
  confirmedAt?: string; // ISO 8601 UTC
}

export interface BankItem {
  code: string;
  name: string;
}

export interface ValidateBankAccountInput {
  accountNumber: string;
  bankCode: string;
}

export interface ValidateBankAccountResult {
  accountName: string;
  refId?: string;
}

export interface TransferDestination {
  accountNumber: string;
  bankCode: string;
  accountName: string;
}

export interface InitiateTransferInput {
  walletId: string;
  amount: string; // NGN decimal string, e.g. "100.00"
  reference: string;
  destination: TransferDestination;
}

export interface TransferResult {
  transferId: string;
  status: CrayStatus;
}

export interface TransferStatusResult {
  status: CrayStatus;
  amount: string;
  failureReason?: string;
}

export interface InitiateRefundInput {
  reference: string;
  amount?: string;
}

export interface RefundResult {
  refundId: string;
  status: CrayStatus;
}

export interface RefundStatusResult extends RefundResult {
  amount?: string;
  failureReason?: string;
}

export interface PlatformBalanceResult {
  currency: string;
  available: string;
  ledger?: string;
}

// -------------------------------------------------------------
// Events Emitted (Interface Contract v0.1 Section 4)
// -------------------------------------------------------------

export interface FundingConfirmedEvent {
  eventId: string;
  customerId: string;
  walletId: string;
  reference: string;
  amount: string;
  currency: string;
  confirmedAt: string; // ISO 8601 UTC
}

export interface FundingFailedEvent {
  eventId: string;
  reference: string;
  reason: string;
  failedAt: string; // ISO 8601 UTC
}

export interface TransferCompletedEvent {
  eventId: string;
  transferId: string;
  reference: string;
  amount: string;
  currency: string;
  completedAt: string; // ISO 8601 UTC
}

export interface TransferFailedEvent {
  eventId: string;
  transferId?: string;
  reference: string;
  reason: string;
  failedAt: string; // ISO 8601 UTC
}

export interface RefundCompletedEvent {
  eventId: string;
  refundId: string;
  reference: string;
  amount: string;
  currency: string;
  completedAt: string; // ISO 8601 UTC
}

// -------------------------------------------------------------
// Cray Service Interface (In-process service called by wallet)
// -------------------------------------------------------------

export interface ICrayService {
  createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<VirtualAccountResult>;
  getVirtualAccount(customerId: string): Promise<VirtualAccountDetails | null>;

  createFundingSession(
    input: CreateFundingSessionInput,
  ): Promise<FundingSessionResult>;
  getFundingStatus(reference: string): Promise<FundingStatusResult>;

  listBanks(): Promise<BankItem[]>;
  validateBankAccount(
    input: ValidateBankAccountInput,
  ): Promise<ValidateBankAccountResult>;
  initiateTransfer(input: InitiateTransferInput): Promise<TransferResult>;
  getTransferStatus(reference: string): Promise<TransferStatusResult>;

  initiateRefund(input: InitiateRefundInput): Promise<RefundResult>;
  getRefundStatus(reference: string): Promise<RefundStatusResult>;
  getPlatformBalance(currency?: string): Promise<PlatformBalanceResult>;
}

export enum CrayStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  INITIATED = 'INITIATED',
  REVERSED = 'REVERSED',
  EXPIRED = 'EXPIRED',
  UNKNOWN = 'UNKNOWN',
}

export enum CrayEventName {
  FUNDING_CONFIRMED = 'funding.confirmed',
  FUNDING_FAILED = 'funding.failed',
  TRANSFER_COMPLETED = 'transfer.completed',
  TRANSFER_FAILED = 'transfer.failed',
  REFUND_COMPLETED = 'refund.completed',
}

export enum CrayErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_REFERENCE = 'DUPLICATE_REFERENCE',
  OTP_REQUIRED = 'OTP_REQUIRED',
  OTP_INVALID = 'OTP_INVALID',
  PROVIDER_REJECTED = 'PROVIDER_REJECTED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
}

export enum FundingMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
}

export enum VirtualAccountType {
  PERMANENT = 'Permanent',
  ONE_TIME = 'onetime',
}

export enum CustomerType {
  INDIVIDUAL = 'Individual',
  CORPORATE = 'Corporate',
}

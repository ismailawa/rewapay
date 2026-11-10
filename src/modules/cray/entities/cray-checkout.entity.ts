import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Persists hosted checkout sessions created via POST /checkout/initialize.
 * Tracks status changes polled via GET /checkout/query/{reference}.
 */
@Entity('cray_checkouts')
export class CrayCheckout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** RewaPay's internal customer ID */
  @Column({ nullable: true })
  customerId?: string;

  /** RewaPay's internal wallet ID */
  @Column({ nullable: true })
  walletId?: string;

  /**
   * Merchant-supplied unique reference (max 64 chars).
   * Maps to Cray's `reference` field on initialize and query.
   */
  @Column({ unique: true })
  reference: string;

  /** Amount in major units as string (e.g. "1000.00" NGN) */
  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  /** ISO 4217 currency code (e.g. "NGN", "USD") */
  @Column({ default: 'NGN' })
  currency: string;

  /**
   * Payment method presented to the customer on the hosted page.
   * Values: "card" | "transfer" | "mobile_money"
   */
  @Column({ default: 'transfer' })
  defaultPaymentMethod: string;

  /** Who bears the transaction fee: "merchant" | "customer" */
  @Column({ default: 'merchant' })
  feeBearer: string;

  /** Optional narration / payment description */
  @Column({ nullable: true })
  narration?: string;

  /** Optional post-payment callback URL (overrides account default) */
  @Column({ nullable: true })
  callbackUrl?: string;

  /** Customer full name provided at initialization */
  @Column({ nullable: true })
  customerName?: string;

  /** Customer email address (not logged at debug level) */
  @Column({ nullable: true })
  customerEmail?: string;

  /**
   * Cray's hosted checkout URL to redirect the customer to.
   * Returned as `data.link` from POST /checkout/initialize.
   */
  @Column({ nullable: true })
  paymentLink?: string;

  /**
   * Cray's short pay code (e.g. "RHEZ2VYSJ5P3LQA").
   * Returned as `data.payCode` — can be used with Query endpoint.
   */
  @Column({ nullable: true })
  payCode?: string;

  /**
   * Local status reflecting what we know:
   *   INITIATED   — session created, customer not yet redirected
   *   PENDING     — customer redirected, awaiting payment
   *   SUCCESSFUL  — Cray confirmed payment
   *   FAILED      — Cray reported failure or session expired
   */
  @Column({ default: 'INITIATED' })
  status: string;

  /** Raw status string from Cray's last query response */
  @Column({ nullable: true })
  providerStatus?: string;

  /** Cray's provider-side transaction reference after payment */
  @Column({ nullable: true })
  providerReference?: string;

  /** Payment channel used (e.g. "card", "bank_transfer") */
  @Column({ nullable: true })
  paymentChannel?: string;

  /** Net amount after Cray fee deduction */
  @Column({ nullable: true })
  netAmount?: string;

  /** Cray fee charged */
  @Column({ nullable: true })
  fee?: string;

  /** Timestamp when checkout session was created */
  @Column({ nullable: true })
  initiatedAt?: Date;

  /** Timestamp when payment was confirmed */
  @Column({ nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


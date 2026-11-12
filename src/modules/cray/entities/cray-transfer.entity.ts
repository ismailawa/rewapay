import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cray_transfers')
export class CrayTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'wallet_id', type: 'varchar', length: 64 })
  walletId: string;

  @Index()
  @Column({ name: 'customer_id', type: 'varchar', length: 64, nullable: true })
  customerId?: string;

  @Index({ unique: true })
  @Column({ name: 'reference', type: 'varchar', length: 64 })
  reference: string; // unique customer_reference

  @Index()
  @Column({ name: 'provider_transfer_reference', type: 'varchar', length: 128, nullable: true })
  providerTransferReference?: string; // Cray transaction reference

  @Column({ name: 'amount', type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @Column({ name: 'fee', type: 'numeric', precision: 18, scale: 2, nullable: true })
  fee?: string;

  @Column({ name: 'account_number_encrypted', type: 'text' })
  accountNumber: string;

  @Column({ name: 'account_number_last4', type: 'varchar', length: 4 })
  accountNumberLast4: string;

  @Column({ name: 'bank_code', type: 'varchar', length: 32 })
  bankCode: string;

  @Column({ name: 'account_name', type: 'varchar', length: 255 })
  accountName: string;

  @Column({ name: 'ref_id', type: 'varchar', length: 128, nullable: true })
  refId?: string; // validation session ID from account lookup

  @Column({ name: 'narration', type: 'varchar', length: 255, nullable: true })
  narration?: string;

  @Index()
  @Column({ name: 'status', type: 'varchar', length: 32, default: 'PENDING' })
  status: string;

  @Column({ name: 'provider_status', type: 'varchar', length: 64, nullable: true })
  providerStatus?: string;

  @Column({ name: 'failure_code', type: 'varchar', length: 64, nullable: true })
  failureCode?: string;

  @Column({ name: 'failure_message_sanitized', type: 'text', nullable: true })
  failureMessageSanitized?: string;

  @Column({ name: 'initiated_at', type: 'timestamp with time zone', nullable: true })
  initiatedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cray_transactions')
export class CrayTransactionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'reference', type: 'varchar', length: 128 })
  reference: string;

  @Index()
  @Column({ name: 'provider_reference', type: 'varchar', length: 128, nullable: true })
  providerReference?: string;

  @Index()
  @Column({ name: 'type', type: 'varchar', length: 32 })
  type: string; // PAYOUT | PAYIN | COLLECTION | CHECKOUT | REFUND

  @Column({ name: 'amount', type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ name: 'fee', type: 'numeric', precision: 18, scale: 2, nullable: true })
  fee?: string;

  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @Index()
  @Column({ name: 'status', type: 'varchar', length: 32, default: 'PENDING' })
  status: string; // PENDING | SUCCESSFUL | FAILED | PROCESSING

  @Index()
  @Column({ name: 'customer_id', type: 'varchar', length: 64, nullable: true })
  customerId?: string;

  @Index()
  @Column({ name: 'wallet_id', type: 'varchar', length: 64, nullable: true })
  walletId?: string;

  @Column({ name: 'metadata', type: 'text', nullable: true })
  metadata?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}


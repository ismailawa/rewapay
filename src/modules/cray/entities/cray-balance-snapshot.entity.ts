import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('cray_balance_snapshots')
export class CrayBalanceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @Column({ name: 'available_balance', type: 'numeric', precision: 18, scale: 2 })
  availableBalance: string;

  @Column({ name: 'ledger_balance', type: 'numeric', precision: 18, scale: 2, nullable: true })
  ledgerBalance?: string;

  @Column({ name: 'locked_balance', type: 'numeric', precision: 18, scale: 2, nullable: true })
  lockedBalance?: string;

  @Column({ name: 'provider_account_id', type: 'varchar', length: 128, nullable: true })
  providerAccountId?: string;

  @Column({ name: 'raw_response', type: 'text', nullable: true })
  rawResponse?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

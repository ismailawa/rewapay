import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cray_virtual_accounts')
export class CrayVirtualAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId: string;

  @Index()
  @Column({ name: 'wallet_id', type: 'varchar', length: 64, nullable: true })
  walletId?: string;

  @Column({ name: 'provider_account_id', type: 'varchar', length: 128, nullable: true })
  providerAccountId?: string;

  @Index()
  @Column({ name: 'account_number', type: 'varchar', length: 32 })
  accountNumber: string;

  @Column({ name: 'account_name', type: 'varchar', length: 255 })
  accountName: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 128 })
  bankName: string;

  @Column({ name: 'bank_code', type: 'varchar', length: 32, nullable: true })
  bankCode?: string;

  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @Column({ name: 'virtual_account_type', type: 'varchar', length: 32, default: 'Permanent' })
  virtualAccountType: string;

  @Index()
  @Column({ name: 'status', type: 'varchar', length: 32 })
  status: string;

  @Index()
  @Column({ name: 'reference', type: 'varchar', length: 64 })
  reference: string;

  @Column({ name: 'provider_response_sanitized', type: 'jsonb', nullable: true })
  providerResponseSanitized?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cray_beneficiaries')
export class CrayBeneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id', type: 'varchar', length: 64, nullable: true })
  customerId?: string;

  @Index()
  @Column({ name: 'bank_code', type: 'varchar', length: 32 })
  bankCode: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 128, nullable: true })
  bankName?: string;

  @Column({ name: 'account_number_encrypted', type: 'text' })
  accountNumber: string;

  @Index()
  @Column({ name: 'account_number_hash', type: 'varchar', length: 64 })
  accountNumberHash: string;

  @Column({ name: 'account_number_last4', type: 'varchar', length: 4 })
  accountNumberLast4: string;

  @Column({ name: 'account_name', type: 'varchar', length: 255 })
  accountName: string;

  @Index()
  @Column({ name: 'provider_reference', type: 'varchar', length: 128, nullable: true })
  providerReference?: string; // ref_id returned by validation

  @Column({ name: 'verification_status', type: 'varchar', length: 32, default: 'VERIFIED' })
  verificationStatus: string;

  @Column({ name: 'verified_at', type: 'timestamp with time zone', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

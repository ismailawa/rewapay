import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cray_customers')
export class CrayCustomer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId: string;

  @Index()
  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'provider_customer_id', type: 'varchar', length: 128, nullable: true })
  providerCustomerId?: string;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


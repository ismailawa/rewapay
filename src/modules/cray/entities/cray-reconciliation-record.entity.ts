import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cray_reconciliation_records')
export class CrayReconciliationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'reference', type: 'varchar', length: 128 })
  reference: string;

  @Index()
  @Column({ name: 'type', type: 'varchar', length: 32 })
  type: string; // TRANSFER | CHECKOUT | COLLECTION

  @Column({ name: 'previous_status', type: 'varchar', length: 32 })
  previousStatus: string;

  @Column({ name: 'new_status', type: 'varchar', length: 32 })
  newStatus: string;

  @Column({ name: 'resolved', type: 'boolean', default: false })
  resolved: boolean;

  @Index()
  @Column({ name: 'flagged_for_review', type: 'boolean', default: false })
  flaggedForReview: boolean;

  @Column({ name: 'review_reason', type: 'varchar', length: 255, nullable: true })
  reviewReason?: string;

  @Column({ name: 'requeried_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  requeriedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}

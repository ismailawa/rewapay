import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('cray_refunds')
export class CrayRefund {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ type: 'varchar', length: 64 }) reference: string;
  @Index() @Column({ name: 'provider_reference', type: 'varchar', length: 128, nullable: true }) providerReference?: string;
  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true }) amount?: string;
  @Index() @Column({ type: 'varchar', length: 32, default: 'PENDING' }) status: string;
  @Column({ name: 'provider_status', type: 'varchar', length: 64, nullable: true }) providerStatus?: string;
  @Column({ name: 'failure_reason', type: 'varchar', length: 255, nullable: true }) failureReason?: string;
  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true }) completedAt?: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cray_webhook_events')
export class CrayWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'event_id', type: 'varchar', length: 128 })
  eventId: string;

  @Index()
  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType: string;

  @Index()
  @Column({ name: 'reference', type: 'varchar', length: 128, nullable: true })
  reference?: string;

  @Column({ name: 'signature', type: 'varchar', length: 255, nullable: true })
  signature?: string;

  @Column({ name: 'raw_payload', type: 'text' })
  rawPayload: string;

  @Column({ name: 'verified', type: 'boolean', default: false })
  verified: boolean;

  @Index()
  @Column({ name: 'status', type: 'varchar', length: 32, default: 'RECEIVED' })
  status: string; // RECEIVED | PROCESSED | FAILED | IGNORED | DUPLICATE

  @Column({ name: 'error_message', type: 'varchar', length: 255, nullable: true })
  errorMessage?: string;

  @Column({ name: 'received_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp with time zone', nullable: true })
  processedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}


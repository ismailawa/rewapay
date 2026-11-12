import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cray_idempotency')
export class CrayIdempotencyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey: string;

  @Index()
  @Column({ name: 'operation', type: 'varchar', length: 64 })
  operation: string; // e.g. 'disburse', 'checkout', 'va_create', 'charge'

  @Column({ name: 'request_hash', type: 'varchar', length: 64 })
  requestHash: string; // SHA-256 hex hash of the canonical request payload

  @Index()
  @Column({ name: 'status', type: 'varchar', length: 32, default: 'PENDING' })
  status: string; // PENDING | COMPLETED | FAILED | AMBIGUOUS

  @Column({ name: 'response_payload', type: 'text', nullable: true })
  responsePayload?: string; // JSON-serialized response for completed calls

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode?: number;

  @Column({ name: 'locked_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  lockedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}

import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CrayIdempotencyRecord } from '../entities/cray-idempotency.entity';
import { CrayErrorCode } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';

export interface ExecuteIdempotentOptions<T> {
  key: string;
  operation: string;
  payload: unknown;
  ttlSeconds?: number; // default: 86400 (24h)
  lockTimeoutSeconds?: number; // default: 30s
  fn: () => Promise<T>;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  // In-memory fallback store when TypeORM repository is not injected (e.g. testing)
  private readonly memoryRecords = new Map<string, CrayIdempotencyRecord>();

  constructor(
    @Optional()
    @InjectRepository(CrayIdempotencyRecord)
    private readonly repo?: Repository<CrayIdempotencyRecord>,
  ) {}

  /**
   * Executes an asynchronous operation with database-level idempotency protection.
   *
   * 1. Hashes the request payload canonically (SHA-256).
   * 2. Detects key reuse with altered payloads and throws INVALID_INPUT.
   * 3. Prevents concurrent duplicate executions with atomic lock timing.
   * 4. Caches and returns completed results for identical replays.
   */
  async execute<T>(options: ExecuteIdempotentOptions<T>): Promise<T> {
    const { key, operation, payload, fn } = options;
    const ttlSeconds = options.ttlSeconds ?? 86400; // 24 hours
    const lockTimeoutSeconds = options.lockTimeoutSeconds ?? 30; // 30 seconds

    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'Idempotency key must be a non-empty string.',
        retryable: false,
      });
    }

    const trimmedKey = key.trim();
    const requestHash = this.hashPayload(payload);

    // 1. Check existing record
    let record = await this.findByKey(trimmedKey);

    if (record) {
      // Check payload hash match
      if (record.requestHash !== requestHash) {
        this.logger.warn(
          `Idempotency key '${trimmedKey}' reused with different payload for operation '${operation}'`,
        );
        throw new CrayException({
          code: CrayErrorCode.INVALID_INPUT,
          message: `Idempotency key '${trimmedKey}' has already been used with a different request payload.`,
          retryable: false,
        });
      }

      // If already completed, return cached response
      if (record.status === 'COMPLETED' && record.responsePayload) {
        this.logger.log(`Idempotent cache hit for key '${trimmedKey}' (${operation})`);
        try {
          return JSON.parse(record.responsePayload) as T;
        } catch {
          return record.responsePayload as unknown as T;
        }
      }

      // If pending, check concurrency lock
      if (record.status === 'PENDING') {
        const lockAgeMs = Date.now() - new Date(record.lockedAt).getTime();
        const lockTimeoutMs = lockTimeoutSeconds * 1000;

        if (lockAgeMs < lockTimeoutMs) {
          this.logger.warn(`Concurrent request in progress for key '${trimmedKey}'`);
          throw new CrayException({
            code: CrayErrorCode.PROVIDER_ERROR,
            message: `Concurrent request is already in progress for key '${trimmedKey}'.`,
            retryable: true,
          });
        }

        // Lock expired — take over lock
        this.logger.warn(`Taking over expired lock for key '${trimmedKey}'`);
        record.lockedAt = new Date();
        record = await this.saveRecord(record);
      }
    } else {
      // 2. Create pending record
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      record = await this.saveRecord({
        idempotencyKey: trimmedKey,
        operation,
        requestHash,
        status: 'PENDING',
        lockedAt: new Date(),
        expiresAt,
      });
    }

    // 3. Execute the operation
    try {
      const result = await fn();

      // Mark COMPLETED and cache response
      record.status = 'COMPLETED';
      record.responsePayload = JSON.stringify(result);
      await this.saveRecord(record);

      return result;
    } catch (err) {
      // Mark FAILED
      record.status = 'FAILED';
      await this.saveRecord(record);
      throw err;
    }
  }

  /**
   * Computes a deterministic SHA-256 hex hash of the given payload
   * by sorting object keys recursively.
   */
  hashPayload(payload: unknown): string {
    const canonicalJson = this.canonicalStringify(payload);
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
  }

  // =====================================================================
  // Persistence Helpers
  // =====================================================================

  private async findByKey(idempotencyKey: string): Promise<CrayIdempotencyRecord | null> {
    if (this.repo) {
      return this.repo.findOne({ where: { idempotencyKey } });
    }
    return this.memoryRecords.get(idempotencyKey) || null;
  }

  private async saveRecord(
    data: Partial<CrayIdempotencyRecord>,
  ): Promise<CrayIdempotencyRecord> {
    const timestamp = new Date();
    const entityData: Partial<CrayIdempotencyRecord> = {
      ...data,
      updatedAt: timestamp,
      createdAt: data.createdAt || timestamp,
    };

    if (this.repo) {
      return this.repo.save(this.repo.create(entityData));
    }

    const full = {
      id: data.id || Math.random().toString(),
      ...entityData,
    } as CrayIdempotencyRecord;

    this.memoryRecords.set(full.idempotencyKey, full);
    return full;
  }

  /**
   * Serializes an object with recursively sorted keys to ensure identical
   * representations regardless of key insertion order.
   */
  private canonicalStringify(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj) ?? '';
    }

    if (Array.isArray(obj)) {
      return `[${obj.map((item) => this.canonicalStringify(item)).join(',')}]`;
    }

    const record = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const parts = sortedKeys.map(
      (key) => `${JSON.stringify(key)}:${this.canonicalStringify(record[key])}`,
    );

    return `{${parts.join(',')}}`;
  }
}


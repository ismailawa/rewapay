import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { CrayErrorCode } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdempotencyService],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  describe('execute', () => {
    it('should execute fn and cache the result', async () => {
      const mockFn = jest.fn().mockResolvedValue({ status: 'SUCCESS', id: 123 });

      const result = await service.execute({
        key: 'txn_idemp_001',
        operation: 'disburse',
        payload: { amount: 1000, recipient: '0123456789' },
        fn: mockFn,
      });

      expect(result).toEqual({ status: 'SUCCESS', id: 123 });
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Replay with same key and same payload
      const cached = await service.execute({
        key: 'txn_idemp_001',
        operation: 'disburse',
        payload: { amount: 1000, recipient: '0123456789' },
        fn: mockFn,
      });

      expect(cached).toEqual({ status: 'SUCCESS', id: 123 });
      // Should NOT have run mockFn a second time
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should treat payload with different key order as identical (canonical sorting)', async () => {
      const mockFn = jest.fn().mockResolvedValue({ ok: true });

      await service.execute({
        key: 'txn_order_test',
        operation: 'checkout',
        payload: { a: 1, b: 2, c: { x: 'foo', y: 'bar' } },
        fn: mockFn,
      });

      // Same data, reversed keys
      const cached = await service.execute({
        key: 'txn_order_test',
        operation: 'checkout',
        payload: { c: { y: 'bar', x: 'foo' }, b: 2, a: 1 },
        fn: mockFn,
      });

      expect(cached).toEqual({ ok: true });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw INVALID_INPUT when key is reused with different payload', async () => {
      const mockFn = jest.fn().mockResolvedValue({ status: 'OK' });

      await service.execute({
        key: 'mismatch_key',
        operation: 'disburse',
        payload: { amount: 500 },
        fn: mockFn,
      });

      // Different payload with same key
      await expect(
        service.execute({
          key: 'mismatch_key',
          operation: 'disburse',
          payload: { amount: 9999 }, // Changed amount!
          fn: mockFn,
        }),
      ).rejects.toThrow(CrayException);

      const err = await service
        .execute({
          key: 'mismatch_key',
          operation: 'disburse',
          payload: { amount: 9999 },
          fn: mockFn,
        })
        .catch((e) => e);

      expect(err.code).toBe(CrayErrorCode.INVALID_INPUT);
    });

    it('should prevent concurrent execution on pending lock', async () => {
      let resolveFirst: (v: unknown) => void;
      const slowFn = () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        });

      // Start first operation (pending)
      const firstPromise = service.execute({
        key: 'concurrent_key',
        operation: 'charge',
        payload: { amount: 200 },
        lockTimeoutSeconds: 10,
        fn: slowFn,
      });

      // Attempt second operation concurrently
      await expect(
        service.execute({
          key: 'concurrent_key',
          operation: 'charge',
          payload: { amount: 200 },
          lockTimeoutSeconds: 10,
          fn: jest.fn(),
        }),
      ).rejects.toThrow(CrayException);

      const err = await service
        .execute({
          key: 'concurrent_key',
          operation: 'charge',
          payload: { amount: 200 },
          lockTimeoutSeconds: 10,
          fn: jest.fn(),
        })
        .catch((e) => e);

      expect(err.code).toBe(CrayErrorCode.PROVIDER_ERROR);
      expect(err.retryable).toBe(true);

      // Clean up first promise
      resolveFirst!({ done: true });
      await firstPromise;
    });

    it('should quarantine an expired lock instead of replaying a financial operation', async () => {
      const mockFn = jest.fn().mockResolvedValue({ recovered: true });

      // Simulate a stale pending lock
      await service['saveRecord']({
        idempotencyKey: 'stale_key',
        operation: 'disburse',
        requestHash: service.hashPayload({ ref: 'abc' }),
        status: 'PENDING',
        lockedAt: new Date(Date.now() - 60000), // 60s ago
      });

      // Next execution with 10s timeout should take over the lock
      await expect(service.execute({
        key: 'stale_key',
        operation: 'disburse',
        payload: { ref: 'abc' },
        lockTimeoutSeconds: 10,
        fn: mockFn,
      })).rejects.toThrow(CrayException);
      expect(mockFn).not.toHaveBeenCalled();
      expect((await service['findByKey']('stale_key'))?.status).toBe('AMBIGUOUS');
    });

    it('should re-throw error and mark status FAILED when fn fails', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Network failure'));

      await expect(
        service.execute({
          key: 'fail_key',
          operation: 'disburse',
          payload: { amount: 100 },
          fn: failingFn,
        }),
      ).rejects.toThrow('Network failure');

      const record = await service['findByKey']('fail_key');
      expect(record?.status).toBe('FAILED');
    });

    it('should throw INVALID_INPUT if key is empty or whitespace', async () => {
      await expect(
        service.execute({
          key: '',
          operation: 'test',
          payload: {},
          fn: jest.fn(),
        }),
      ).rejects.toThrow(CrayException);
    });
  });
});

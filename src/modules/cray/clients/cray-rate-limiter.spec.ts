import { CrayRateLimiter, TokenBucket } from './cray-rate-limiter';

describe('CrayRateLimiter', () => {
  describe('categorizeEndpoint', () => {
    it('should categorize all implemented v1 financial routes as financial', () => {
      expect(CrayRateLimiter.categorizeEndpoint('/api/payout/disburse')).toBe('financial');
      expect(CrayRateLimiter.categorizeEndpoint('/api/payout/accounts/validate')).toBe('financial');
      expect(CrayRateLimiter.categorizeEndpoint('/api/checkout/initialize')).toBe('financial');
      expect(CrayRateLimiter.categorizeEndpoint('/api/query/merchant-reference')).toBe('financial');
      expect(CrayRateLimiter.categorizeEndpoint('/api/virtual-accounts/create')).toBe('financial');
      expect(CrayRateLimiter.categorizeEndpoint('/api/refund/initiate')).toBe('financial');
      expect(CrayRateLimiter.categorizeEndpoint('/api/charge')).toBe('financial');
      expect(CrayRateLimiter.categorizeEndpoint('/api/corporate-accounts/create')).toBe('financial');
    });

    it('should categorize balance and health listing as general', () => {
      expect(CrayRateLimiter.categorizeEndpoint('/api/balance')).toBe('general');
      expect(CrayRateLimiter.categorizeEndpoint('/api/health')).toBe('general');
    });
  });

  describe('TokenBucket', () => {
    it('should start with full capacity and consume tokens', async () => {
      const bucket = new TokenBucket(60);
      expect(bucket.getAvailableTokens()).toBe(60);

      await bucket.acquire(5);
      expect(bucket.getAvailableTokens()).toBe(55);
    });

    it('should wait when bucket is exhausted', async () => {
      // 6000 RPM = 1 token per 10ms
      const bucket = new TokenBucket(6000);
      await bucket.acquire(6000); // exhaust

      const start = Date.now();
      await bucket.acquire(2); // should wait ~20ms
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(15);
    });
  });

  describe('CrayRateLimiter acquire', () => {
    it('should successfully acquire tokens for general and financial categories', async () => {
      const limiter = new CrayRateLimiter(60, 30);
      expect(limiter.getAvailableTokens('general')).toBe(60);
      expect(limiter.getAvailableTokens('financial')).toBe(30);

      await limiter.acquire('general');
      expect(limiter.getAvailableTokens('general')).toBe(59);

      await limiter.acquire('financial');
      expect(limiter.getAvailableTokens('financial')).toBe(29);
    });
  });
});

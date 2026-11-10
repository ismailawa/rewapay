export type TrafficCategory = 'general' | 'financial';

export class TokenBucket {
  private tokens: number;
  private lastRefillTimestamp: number;
  private readonly capacity: number;
  private readonly refillRatePerMs: number;

  constructor(rpm: number) {
    this.capacity = rpm;
    this.tokens = rpm;
    this.refillRatePerMs = rpm / 60000;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedMs = Math.max(0, now - this.lastRefillTimestamp);
    const addedTokens = elapsedMs * this.refillRatePerMs;
    this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
    this.lastRefillTimestamp = now;
  }

  public getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  public async acquire(tokens = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    const missingTokens = tokens - this.tokens;
    const waitMs = Math.ceil(missingTokens / this.refillRatePerMs);

    return new Promise((resolve) => {
      setTimeout(() => {
        this.refill();
        this.tokens = Math.max(0, this.tokens - tokens);
        resolve();
      }, waitMs);
    });
  }
}

export class CrayRateLimiter {
  private readonly generalBucket: TokenBucket;
  private readonly financialBucket: TokenBucket;

  constructor(generalRpm = 60, financialRpm = 30) {
    this.generalBucket = new TokenBucket(generalRpm);
    this.financialBucket = new TokenBucket(financialRpm);
  }

  /**
   * Identifies traffic category based on URL path
   * Endpoints like /payout/*, /checkout/*, /api/virtual-accounts/*, /api/v2/* belong to financial (collections/payouts)
   */
  static categorizeEndpoint(path: string): TrafficCategory {
    const normalized = path.toLowerCase();
    if (
      normalized.includes('/payout') ||
      normalized.includes('/checkout') ||
      normalized.includes('/virtual-accounts') ||
      normalized.includes('/api/v2') ||
      normalized.includes('/momo') ||
      normalized.includes('/charge')
    ) {
      return 'financial';
    }
    return 'general';
  }

  async acquire(category: TrafficCategory): Promise<void> {
    if (category === 'financial') {
      await this.financialBucket.acquire(1);
    } else {
      await this.generalBucket.acquire(1);
    }
  }

  getAvailableTokens(category: TrafficCategory): number {
    return category === 'financial'
      ? this.financialBucket.getAvailableTokens()
      : this.generalBucket.getAvailableTokens();
  }
}


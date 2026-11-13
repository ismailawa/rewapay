import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
  } as unknown as ConfigService;

  it('maps an authenticated customer claim to request.user', () => {
    const strategy = new JwtStrategy(config);

    expect(
      strategy.validate({ customerId: 'cust_1', sub: 'user_1' }),
    ).toEqual({ customerId: 'cust_1', subject: 'user_1' });
  });

  it('rejects a token without a customerId claim', () => {
    const strategy = new JwtStrategy(config);

    expect(() => strategy.validate({ sub: 'user_1' })).toThrow(
      UnauthorizedException,
    );
  });
});

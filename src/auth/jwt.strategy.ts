import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtCustomerClaims, JwtCustomerPrincipal } from './jwt-auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtCustomerClaims): JwtCustomerPrincipal {
    const customerId = payload.customerId?.trim();
    if (!customerId) {
      throw new UnauthorizedException('JWT customerId claim is required');
    }

    return {
      customerId,
      ...(payload.sub ? { subject: payload.sub } : {}),
    };
  }
}

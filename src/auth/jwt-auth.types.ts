import type { Request } from 'express';

export interface JwtCustomerClaims {
  sub?: string;
  customerId?: string;
}

export interface JwtCustomerPrincipal {
  customerId: string;
  subject?: string;
}

export interface JwtAuthenticatedRequest extends Request {
  user?: JwtCustomerPrincipal;
}

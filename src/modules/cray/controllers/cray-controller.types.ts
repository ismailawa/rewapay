import type { Request } from 'express';

export type CrayControllerOperation =
  | 'accounts.create'
  | 'accounts.read'
  | 'banks.list'
  | 'banks.validate'
  | 'checkout.create'
  | 'checkout.query'
  | 'checkout.charge'
  | 'checkout.read'
  | 'transfers.create'
  | 'transfers.read'
  | 'refunds.create'
  | 'refunds.read'
  | 'admin.balance.read'
  | 'admin.balance.snapshot'
  | 'admin.reconciliation.run';

export interface CrayAuthorizationResource {
  customerId?: string;
  walletId?: string;
  reference?: string;
  currency?: string;
  bankCode?: string;
  transactionId?: string;
}

export interface CrayAuthorizationContext {
  operation: CrayControllerOperation;
  request: Request;
  /**
   * Deliberately limited to non-secret identifiers. Raw bodies, account numbers,
   * BVN/NIN, card data, and amounts must never be added to this object.
   */
  resource: Readonly<CrayAuthorizationResource>;
}

export interface CrayWebhookIngressContext {
  request: Request;
  event: string;
  clientIp?: string;
}

export abstract class CrayAuthorizedControllerBase {
  protected abstract authorize(
    context: CrayAuthorizationContext,
  ): Promise<void> | void;

  protected async assertAuthorized(
    request: Request,
    operation: CrayControllerOperation,
    resource: CrayAuthorizationResource = {},
  ): Promise<void> {
    await this.authorize({
      operation,
      request,
      resource: Object.freeze({ ...resource }),
    });
  }
}

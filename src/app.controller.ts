import {
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { AccountsService } from './modules/cray/accounts/accounts.service';
import { CrayAccountsControllerBase } from './modules/cray/accounts/accounts.controller';
import type { CrayAuthorizationContext } from './modules/cray/controllers';

interface AuthenticatedCustomerRequest extends Request {
  user?: {
    customerId?: string;
  };
}

/**
 * Example host guard. A real application should populate request.user through
 * its JWT/session authentication strategy before this guard runs.
 */
@Injectable()
export class AppCustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedCustomerRequest>();
    if (typeof request.user?.customerId !== 'string') {
      throw new UnauthorizedException();
    }
    return true;
  }
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

/**
 * Runnable example of explicitly mounting a protected Cray controller base.
 * CrayModule itself still registers no HTTP controllers.
 */
@Controller('api/cray/accounts')
@UseGuards(AppCustomerGuard)
export class AppCrayAccountsController extends CrayAccountsControllerBase {
  constructor(accountsService: AccountsService) {
    super(accountsService);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    const request = context.request as AuthenticatedCustomerRequest;
    const authenticatedCustomerId = request.user?.customerId;

    if (!authenticatedCustomerId) {
      throw new UnauthorizedException();
    }

    if (context.resource.customerId !== authenticatedCustomerId) {
      throw new ForbiddenException(
        'The authenticated customer cannot access this Cray account',
      );
    }
  }
}

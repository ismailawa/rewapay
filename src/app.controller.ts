import {
  Controller,
  ForbiddenException,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import type { JwtAuthenticatedRequest } from './auth/jwt-auth.types';
import { AccountsService } from './modules/cray/accounts/accounts.service';
import { CrayAccountsControllerBase } from './modules/cray/accounts/accounts.controller';
import type { CrayAuthorizationContext } from './modules/cray/controllers';

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
@UseGuards(JwtAuthGuard)
export class AppCrayAccountsController extends CrayAccountsControllerBase {
  constructor(accountsService: AccountsService) {
    super(accountsService);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    const request = context.request as JwtAuthenticatedRequest;
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

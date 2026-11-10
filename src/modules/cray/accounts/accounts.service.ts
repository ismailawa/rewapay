import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus, CustomerType, VirtualAccountType } from '../enums/cray.enums';
import {
  CreateVirtualAccountInput,
  CrayException,
  SubmitVirtualAccountOtpInput,
  SubmitVirtualAccountOtpResult,
  VirtualAccountDetails,
  VirtualAccountResult,
} from '../interfaces/cray.interfaces';
import { CrayCustomer } from '../entities/cray-customer.entity';
import { CrayVirtualAccount } from '../entities/cray-virtual-account.entity';
import { ReferenceUtil } from '../utils/reference.util';

interface CrayVAResponseItem {
  bankCode?: string;
  bank_code?: string;
  bankName?: string;
  bank_name?: string;
  accountNumber?: string;
  account_number?: string;
  accountName?: string;
  account_name?: string;
  status?: string;
}

interface CrayCreateVAResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  data?: CrayVAResponseItem | CrayVAResponseItem[] | { accounts?: CrayVAResponseItem[]; status?: string };
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  // In-memory fallback stores when TypeORM repository is not injected (e.g. testing)
  private readonly memoryCustomers = new Map<string, CrayCustomer>();
  private readonly memoryVirtualAccounts = new Map<string, CrayVirtualAccount>();

  constructor(
    private readonly apiClient: CrayApiClient,
    @Optional()
    @InjectRepository(CrayCustomer)
    private readonly customerRepo?: Repository<CrayCustomer>,
    @Optional()
    @InjectRepository(CrayVirtualAccount)
    private readonly accountRepo?: Repository<CrayVirtualAccount>,
  ) {}

  /**
   * Creates or retrieves a permanent NGN virtual account for a customer
   */
  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<VirtualAccountResult> {
    if (!input.customerId || !input.fullName || !input.email || !input.bvn) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'customerId, fullName, email, and bvn are required fields',
        retryable: false,
      });
    }

    // 1. Prevent duplicate creation if an active account already exists
    const existing = await this.findActiveAccount(input.customerId);
    if (existing && (existing.status === CrayStatus.SUCCESSFUL || existing.status === 'ACTIVE')) {
      this.logger.log(`Active virtual account already exists for customer ${input.customerId}`);
      return {
        accountNumber: existing.accountNumber,
        accountName: existing.accountName,
        bankName: existing.bankName,
        bankCode: existing.bankCode,
        status: CrayStatus.SUCCESSFUL,
      };
    }

    // 2. Ensure customer record exists
    await this.upsertCustomer(input.customerId, input.email);

    // 3. Prepare provider request
    const reference = ReferenceUtil.generate('va');
    const payload = {
      currency: 'NGN',
      account_name: input.fullName,
      customer_email: input.email,
      virtual_account_type: input.accountType || VirtualAccountType.PERMANENT,
      type: input.customerType || CustomerType.INDIVIDUAL,
      bvn: input.bvn,
      ...(input.nin ? { nin: input.nin } : {}),
      ...(input.rcNumber ? { rc_number: input.rcNumber } : {}),
      reference,
    };

    // Sensitive data: mask BVN/NIN in audit log
    this.logger.log(
      `Requesting virtual account for customer: ${input.customerId}, ref: ${reference}, bvn: ***${input.bvn.slice(-4)}`,
    );

    const response = await this.apiClient.post<CrayCreateVAResponse>(
      '/api/virtual-accounts/create',
      payload,
    );

    // 4. Handle OTP_REQUIRED response
    const isOtpRequired =
      (typeof response?.status === 'string' && response.status.toUpperCase() === 'OTP_REQUIRED') ||
      (typeof response?.message === 'string' && response.message.toLowerCase().includes('otp')) ||
      (typeof response?.data === 'object' && response.data !== null && 'status' in response.data && (response.data as { status?: string }).status === 'OTP_REQUIRED');

    if (isOtpRequired) {
      this.logger.log(`OTP required for customer ${input.customerId} virtual account creation`);
      await this.saveVirtualAccount({
        customerId: input.customerId,
        accountNumber: 'PENDING_OTP',
        accountName: input.fullName,
        bankName: 'Wema Bank',
        bankCode: '035',
        currency: 'NGN',
        virtualAccountType: input.accountType || VirtualAccountType.PERMANENT,
        status: 'OTP_REQUIRED',
        reference,
        providerResponseSanitized: { message: response?.message || 'OTP_REQUIRED' },
      });

      return {
        accountNumber: '',
        accountName: input.fullName,
        bankName: 'Wema Bank',
        bankCode: '035',
        status: 'OTP_REQUIRED',
      };
    }

    // 5. Extract account details from provider response
    const accountItem = this.extractAccountItem(response);
    const accountNumber = accountItem?.accountNumber || accountItem?.account_number || '';
    const accountName = accountItem?.accountName || accountItem?.account_name || input.fullName;
    const bankName = accountItem?.bankName || accountItem?.bank_name || 'Cray Partner Bank';
    const bankCode = accountItem?.bankCode || accountItem?.bank_code;

    const saved = await this.saveVirtualAccount({
      customerId: input.customerId,
      accountNumber,
      accountName,
      bankName,
      bankCode,
      currency: 'NGN',
      virtualAccountType: input.accountType || VirtualAccountType.PERMANENT,
      status: CrayStatus.SUCCESSFUL,
      reference,
      providerResponseSanitized: {
        accountNumber: accountNumber ? `***${accountNumber.slice(-4)}` : undefined,
        accountName,
        bankName,
      },
    });

    return {
      accountNumber: saved.accountNumber,
      accountName: saved.accountName,
      bankName: saved.bankName,
      bankCode: saved.bankCode,
      status: CrayStatus.SUCCESSFUL,
    };
  }

  /**
   * Submits OTP for Wema Bank virtual account provisioning
   */
  async submitVirtualAccountOtp(
    input: SubmitVirtualAccountOtpInput,
  ): Promise<SubmitVirtualAccountOtpResult> {
    if (!input.customerId || !input.otp) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'customerId and otp are required',
        retryable: false,
      });
    }

    const customer = await this.findCustomer(input.customerId);
    if (!customer) {
      throw new CrayException({
        code: CrayErrorCode.NOT_FOUND,
        message: `Customer ${input.customerId} not found`,
        retryable: false,
      });
    }

    // Sensitive data: never log OTP
    this.logger.log(`Submitting virtual account OTP for customer ${input.customerId}`);

    const response = await this.apiClient.post<{ success?: boolean; message?: string }>(
      '/api/virtual-accounts/generate-wallet',
      {
        otp: input.otp,
        customer_email: customer.email,
      },
    );

    // Update pending virtual account to ACTIVE/SUCCESSFUL
    const pendingAccount = await this.findPendingAccount(input.customerId);
    if (pendingAccount) {
      pendingAccount.status = CrayStatus.SUCCESSFUL;
      await this.persistVirtualAccount(pendingAccount);
    }

    return {
      status: CrayStatus.SUCCESSFUL,
    };
  }

  /**
   * Retrieves active virtual account details for a customer
   */
  async getVirtualAccount(customerId: string): Promise<VirtualAccountDetails | null> {
    if (!customerId) {
      return null;
    }

    const account = await this.findActiveAccount(customerId);
    if (!account) {
      return null;
    }

    return {
      customerId: account.customerId,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      bankCode: account.bankCode,
      currency: account.currency,
      status: (account.status as CrayStatus) || CrayStatus.SUCCESSFUL,
      createdAt: account.createdAt ? account.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------
  // Helper & Persistence methods
  // -------------------------------------------------------------

  private extractAccountItem(response: CrayCreateVAResponse): CrayVAResponseItem | undefined {
    if (!response) return undefined;
    if (Array.isArray(response.data)) {
      return response.data[0];
    }
    if (response.data && typeof response.data === 'object') {
      if ('accounts' in response.data && Array.isArray(response.data.accounts)) {
        return response.data.accounts[0];
      }
      return response.data as CrayVAResponseItem;
    }
    return undefined;
  }

  private async upsertCustomer(customerId: string, email: string): Promise<CrayCustomer> {
    const existing = await this.findCustomer(customerId);
    if (existing) {
      return existing;
    }

    const customer: Partial<CrayCustomer> = {
      customerId,
      email,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.customerRepo) {
      return this.customerRepo.save(this.customerRepo.create(customer));
    }

    const fullCustomer = customer as CrayCustomer;
    this.memoryCustomers.set(customerId, fullCustomer);
    return fullCustomer;
  }

  private async findCustomer(customerId: string): Promise<CrayCustomer | null> {
    if (this.customerRepo) {
      return this.customerRepo.findOne({ where: { customerId } });
    }
    return this.memoryCustomers.get(customerId) || null;
  }

  private async findActiveAccount(customerId: string): Promise<CrayVirtualAccount | null> {
    if (this.accountRepo) {
      return this.accountRepo.findOne({
        where: { customerId },
        order: { createdAt: 'DESC' },
      });
    }

    for (const acc of Array.from(this.memoryVirtualAccounts.values())) {
      if (acc.customerId === customerId && acc.status !== 'FAILED') {
        return acc;
      }
    }
    return null;
  }

  private async findPendingAccount(customerId: string): Promise<CrayVirtualAccount | null> {
    if (this.accountRepo) {
      return this.accountRepo.findOne({
        where: { customerId, status: 'OTP_REQUIRED' },
        order: { createdAt: 'DESC' },
      });
    }

    for (const acc of Array.from(this.memoryVirtualAccounts.values())) {
      if (acc.customerId === customerId && acc.status === 'OTP_REQUIRED') {
        return acc;
      }
    }
    return null;
  }

  private async saveVirtualAccount(data: Partial<CrayVirtualAccount>): Promise<CrayVirtualAccount> {
    const account: Partial<CrayVirtualAccount> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.accountRepo) {
      return this.accountRepo.save(this.accountRepo.create(account));
    }

    const fullAccount = {
      id: Math.random().toString(),
      ...account,
    } as CrayVirtualAccount;
    this.memoryVirtualAccounts.set(data.customerId || fullAccount.id, fullAccount);
    return fullAccount;
  }

  private async persistVirtualAccount(account: CrayVirtualAccount): Promise<CrayVirtualAccount> {
    account.updatedAt = new Date();
    if (this.accountRepo) {
      return this.accountRepo.save(account);
    }
    this.memoryVirtualAccounts.set(account.customerId, account);
    return account;
  }
}


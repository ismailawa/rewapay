import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import {
  CreateVirtualAccountInput,
  CrayException,
  VirtualAccountDetails,
  VirtualAccountResult,
} from '../interfaces/cray.interfaces';
import { CrayCustomer } from '../entities/cray-customer.entity';
import { CrayVirtualAccount } from '../entities/cray-virtual-account.entity';
import { MoneyUtil } from '../utils/money.util';
import { ReferenceUtil } from '../utils/reference.util';
import { FieldEncryptionUtil } from '../utils/field-encryption.util';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import type { CrayModuleOptions } from '../config/cray.config';

interface CrayVAResponseItem {
  id?: string;
  bankCode?: string;
  bank_code?: string;
  bankName?: string;
  bank_name?: string;
  bank?: string;
  sort_code?: string;
  accountNumber?: string;
  account_number?: string;
  accountName?: string;
  account_name?: string;
  status?: string;
  expires_at?: string;
  expires_at_unix?: number;
}

interface CrayCreateVAResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  data?: CrayVAResponseItem;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  private readonly memoryCustomers = new Map<string, CrayCustomer>();
  private readonly memoryVirtualAccounts = new Map<string, CrayVirtualAccount>();

  constructor(
    private readonly apiClient: CrayApiClient,
    @Inject(CRAY_MODULE_OPTIONS) private readonly options: CrayModuleOptions,
    @Optional() @InjectRepository(CrayCustomer)
    private readonly customerRepo?: Repository<CrayCustomer>,
    @Optional() @InjectRepository(CrayVirtualAccount)
    private readonly accountRepo?: Repository<CrayVirtualAccount>,
  ) {}

  async createVirtualAccount(input: CreateVirtualAccountInput): Promise<VirtualAccountResult> {
    this.validateInput(input);

    const existing = await this.findActiveAccount(input.customerId);
    if (existing && input.accountType !== 'onetime') {
      return this.toResult(existing);
    }

    await this.upsertCustomer(input.customerId, input.email);
    const reference = ReferenceUtil.generate('va');
    const endpoint = input.accountType === 'corporate'
      ? '/corporate-accounts/create'
      : '/virtual-accounts/create';
    const payload = this.buildPayload(input, reference);

    this.logger.log(
      `Requesting ${input.accountType} virtual account for customer ${input.customerId}, ref=${reference}`,
    );
    const response = await this.apiClient.post<CrayCreateVAResponse>(endpoint, payload);
    const item = response?.data;
    const accountNumber = item?.account_number || item?.accountNumber || '';
    const accountName = item?.account_name || item?.accountName || '';
    const bankName = item?.bank || item?.bank_name || item?.bankName || '';
    const bankCode = item?.sort_code || item?.bank_code || item?.bankCode;

    if (!accountNumber || !accountName || !bankName) {
      throw new CrayException({
        code: CrayErrorCode.PROVIDER_ERROR,
        message: 'Cray returned an incomplete virtual-account response.',
        retryable: false,
        details: { success: response?.success, status: response?.status, message: response?.message },
      });
    }

    const saved = await this.saveVirtualAccount({
      customerId: input.customerId,
      providerAccountId: item?.id,
      accountNumber: FieldEncryptionUtil.encrypt(accountNumber, this.options.dataEncryptionKey),
      accountNumberLast4: accountNumber.slice(-4),
      accountName,
      bankName,
      bankCode,
      currency: 'NGN',
      virtualAccountType: input.accountType,
      status: CrayStatus.SUCCESSFUL,
      reference,
      providerResponseSanitized: {
        accountNumber: `***${accountNumber.slice(-4)}`,
        accountName,
        bankName,
        expiresAt: item?.expires_at,
        expiresAtUnix: item?.expires_at_unix,
      },
    });

    return this.toResult(saved);
  }

  async getVirtualAccount(customerId: string): Promise<VirtualAccountDetails | null> {
    const account = customerId ? await this.findActiveAccount(customerId) : null;
    if (!account) return null;
    return {
      customerId: account.customerId,
      accountNumber: FieldEncryptionUtil.decrypt(account.accountNumber, this.options.dataEncryptionKey),
      accountName: account.accountName,
      bankName: account.bankName,
      bankCode: account.bankCode,
      currency: account.currency,
      status: account.status as CrayStatus,
      createdAt: account.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  private validateInput(input: CreateVirtualAccountInput): void {
    if (!input.customerId || !input.email) this.invalid('customerId and email are required');
    if (input.accountType === 'corporate') {
      if (!/^\d{11}$/.test(input.bvn) || !input.rcNumber || !input.phone || !input.fullName) {
        this.invalid('Corporate accounts require fullName, 11-digit BVN, rcNumber, and phone');
      }
      return;
    }
    if (!input.accountName) this.invalid('accountName is required');
    if (input.provider === 'palmpay' && input.accountType === 'Permanent') {
      if (!input.customerName || (!input.bvn && !input.nin)) {
        this.invalid('PalmPay permanent accounts require customerName and either BVN or NIN');
      }
      if (input.bvn && !/^\d{11}$/.test(input.bvn)) this.invalid('BVN must be 11 digits');
      if (input.nin && !/^\d{11}$/.test(input.nin)) this.invalid('NIN must be 11 digits');
    }
    if (input.accountType === 'onetime') {
      if (!MoneyUtil.isValidAmountString(input.amount)) this.invalid('One-time amount must be a positive 2-decimal string');
      if (input.provider === 'palmpay' && !input.returnUrl) this.invalid('PalmPay one-time accounts require returnUrl');
      if (input.orderExpireSeconds !== undefined && (input.orderExpireSeconds < 1800 || input.orderExpireSeconds > 86400)) {
        this.invalid('orderExpireSeconds must be between 1800 and 86400');
      }
    }
  }

  private buildPayload(input: CreateVirtualAccountInput, reference: string): Record<string, unknown> {
    if (input.accountType === 'corporate') {
      return {
        full_name: input.fullName,
        bvn: input.bvn,
        rc_number: input.rcNumber,
        phone: input.phone,
        customer_email: input.email,
        business_type: input.businessType,
        ...(input.businessName ? { business_name: input.businessName } : {}),
        ...(input.tin ? { tin: input.tin } : {}),
      };
    }
    if (input.accountType === 'onetime') {
      return {
        provider: input.provider,
        account_type: 'onetime',
        currency: 'NGN',
        amount: input.amount,
        account_name: input.accountName,
        customer_email: input.email,
        reference,
        ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
        ...(input.orderExpireSeconds ? { order_expire_seconds: input.orderExpireSeconds } : {}),
      };
    }
    if (input.provider === 'palmpay') {
      return {
        provider: 'palmpay', currency: 'NGN', account_type: 'Permanent', type: 'individual',
        reference, account_name: input.accountName, customer_name: input.customerName,
        customer_email: input.email,
        ...(input.bvn ? { bvn: input.bvn } : {}), ...(input.nin ? { nin: input.nin } : {}),
      };
    }
    return {
      type: 'individual', virtual_account_type: 'Permanent', currency: 'NGN', provider: 'Bloc',
      account_name: input.accountName, customer_email: input.email, reference,
      ...(input.firstName ? { first_name: input.firstName } : {}),
      ...(input.lastName ? { last_name: input.lastName } : {}),
      ...(input.otherName ? { other_name: input.otherName } : {}),
      ...(input.dateOfBirth ? { date_of_birth: input.dateOfBirth } : {}),
    };
  }

  private invalid(message: string): never {
    throw new CrayException({ code: CrayErrorCode.INVALID_INPUT, message, retryable: false });
  }

  private toResult(account: CrayVirtualAccount): VirtualAccountResult {
    return { accountNumber: FieldEncryptionUtil.decrypt(account.accountNumber, this.options.dataEncryptionKey), accountName: account.accountName, bankName: account.bankName, bankCode: account.bankCode, status: CrayStatus.SUCCESSFUL };
  }

  private async upsertCustomer(customerId: string, email: string): Promise<void> {
    if (await this.findCustomer(customerId)) return;
    const data = { customerId, email, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() };
    if (this.customerRepo) await this.customerRepo.save(this.customerRepo.create(data));
    else this.memoryCustomers.set(customerId, data as CrayCustomer);
  }

  private async findCustomer(customerId: string): Promise<CrayCustomer | null> {
    return this.customerRepo
      ? this.customerRepo.findOne({ where: { customerId } })
      : this.memoryCustomers.get(customerId) || null;
  }

  private async findActiveAccount(customerId: string): Promise<CrayVirtualAccount | null> {
    if (this.accountRepo) return this.accountRepo.findOne({ where: { customerId, status: CrayStatus.SUCCESSFUL }, order: { createdAt: 'DESC' } });
    return Array.from(this.memoryVirtualAccounts.values()).find((item) => item.customerId === customerId && item.status === CrayStatus.SUCCESSFUL) || null;
  }

  private async saveVirtualAccount(data: Partial<CrayVirtualAccount>): Promise<CrayVirtualAccount> {
    const record = { ...data, createdAt: new Date(), updatedAt: new Date() };
    if (this.accountRepo) return this.accountRepo.save(this.accountRepo.create(record));
    const account = { id: ReferenceUtil.generate('local_va'), ...record } as CrayVirtualAccount;
    this.memoryVirtualAccounts.set(account.reference, account);
    return account;
  }
}

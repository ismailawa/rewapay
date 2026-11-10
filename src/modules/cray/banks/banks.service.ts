import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode } from '../enums/cray.enums';
import {
  BankItem,
  CrayException,
  ValidateBankAccountInput,
  ValidateBankAccountResult,
} from '../interfaces/cray.interfaces';
import { CrayBeneficiary } from '../entities/cray-beneficiary.entity';

interface CrayBankResponseItem {
  code?: string;
  bank_code?: string;
  short_code?: string;
  institutionCode?: string;
  name?: string;
  bank_name?: string;
  institutionName?: string;
}

interface CrayBanksResponse {
  data?: CrayBankResponseItem[];
  status?: boolean | string;
}

interface CrayAccountValidateResponse {
  status?: boolean | string;
  message?: string;
  data?: {
    account_name?: string;
    accountName?: string;
    ref_id?: string;
    red_id?: string;
    reference?: string;
  };
  account_name?: string;
  ref_id?: string;
}

@Injectable()
export class BanksService {
  private readonly logger = new Logger(BanksService.name);

  // In-memory cache for bank directory (24 hours TTL)
  private cachedBanks: BankItem[] = [];
  private cacheTimestamp = 0;
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000;

  // In-memory fallback for beneficiaries when TypeORM repository is absent (e.g. unit tests)
  private readonly memoryBeneficiaries = new Map<string, CrayBeneficiary>();

  constructor(
    private readonly apiClient: CrayApiClient,
    @Optional()
    @InjectRepository(CrayBeneficiary)
    private readonly beneficiaryRepo?: Repository<CrayBeneficiary>,
  ) {}

  /**
   * Retrieves list of supported Nigerian banks with TTL caching
   */
  async listBanks(forceRefresh = false): Promise<BankItem[]> {
    const isCacheValid =
      this.cachedBanks.length > 0 &&
      Date.now() - this.cacheTimestamp < this.cacheTtlMs;

    if (isCacheValid && !forceRefresh) {
      this.logger.debug(`Returning ${this.cachedBanks.length} banks from local cache`);
      return this.cachedBanks;
    }

    const url = '/payout/banks';
    this.logger.log(`Fetching bank directory from Cray API: ${url}`);
    const response = await this.apiClient.get<CrayBanksResponse | CrayBankResponseItem[]>(url);

    const rawList: CrayBankResponseItem[] = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : [];

    const normalized: BankItem[] = rawList
      .map((item) => ({
        code: (item.code || item.bank_code || item.short_code || item.institutionCode || '').trim(),
        name: (item.name || item.bank_name || item.institutionName || '').trim(),
      }))
      .filter((b) => b.code.length > 0 && b.name.length > 0);

    this.cachedBanks = normalized;
    this.cacheTimestamp = Date.now();
    this.logger.log(`Successfully cached ${normalized.length} banks from Cray`);

    return this.cachedBanks;
  }

  /**
   * Validates a Nigerian bank account number with Cray and returns verified account name
   */
  async validateBankAccount(
    input: ValidateBankAccountInput & { customerId?: string },
  ): Promise<ValidateBankAccountResult> {
    if (!input.accountNumber || !input.bankCode) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'accountNumber and bankCode are required',
        retryable: false,
      });
    }

    if (input.accountNumber.length !== 10) {
      throw new CrayException({
        code: CrayErrorCode.INVALID_INPUT,
        message: 'Nigerian bank account numbers must be 10 digits',
        retryable: false,
      });
    }

    // Sensitive data: mask account number in log
    const masked = `***${input.accountNumber.slice(-4)}`;
    this.logger.log(`Validating account ${masked} with bankCode ${input.bankCode}`);

    const payload = {
      account_number: input.accountNumber,
      bank_code: input.bankCode,
    };

    const response = await this.apiClient.post<CrayAccountValidateResponse>(
      '/payout/accounts/validate',
      payload,
    );

    const accountName =
      response?.data?.account_name ||
      response?.data?.accountName ||
      response?.account_name ||
      '';

    const refId =
      response?.data?.ref_id ||
      response?.data?.red_id ||
      response?.data?.reference ||
      response?.ref_id;

    if (!accountName) {
      throw new CrayException({
        code: CrayErrorCode.NOT_FOUND,
        message: 'Account validation failed: account name could not be resolved',
        retryable: false,
        details: response,
      });
    }

    // Persist verified beneficiary
    await this.saveBeneficiary({
      customerId: input.customerId,
      bankCode: input.bankCode,
      accountNumber: input.accountNumber,
      accountName,
      providerReference: refId,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    });

    return {
      accountName,
      refId,
    };
  }

  /**
   * Finds latest verified beneficiary record
   */
  async findBeneficiary(bankCode: string, accountNumber: string): Promise<CrayBeneficiary | null> {
    if (this.beneficiaryRepo) {
      return this.beneficiaryRepo.findOne({
        where: { bankCode, accountNumber },
        order: { createdAt: 'DESC' },
      });
    }
    const key = `${bankCode}_${accountNumber}`;
    return this.memoryBeneficiaries.get(key) || null;
  }

  private async saveBeneficiary(data: Partial<CrayBeneficiary>): Promise<CrayBeneficiary> {
    const beneficiary: Partial<CrayBeneficiary> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.beneficiaryRepo) {
      return this.beneficiaryRepo.save(this.beneficiaryRepo.create(beneficiary));
    }

    const full = {
      id: Math.random().toString(),
      ...beneficiary,
    } as CrayBeneficiary;
    const key = `${data.bankCode}_${data.accountNumber}`;
    this.memoryBeneficiaries.set(key, full);
    return full;
  }
}

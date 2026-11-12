import { Test } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { CrayApiClient } from '../clients/cray-api.client';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import { TEST_CRAY_OPTIONS } from '../testing/test-options';
import { CrayException } from '../interfaces/cray.interfaces';

describe('AccountsService Cray v2 contracts', () => {
  let service: AccountsService;
  let api: jest.Mocked<CrayApiClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [
      AccountsService,
      { provide: CrayApiClient, useValue: { post: jest.fn() } },
      { provide: CRAY_MODULE_OPTIONS, useValue: TEST_CRAY_OPTIONS },
    ] }).compile();
    service = module.get(AccountsService);
    api = module.get(CrayApiClient);
  });

  const response = { success: true, data: { id: 'va_1', account_number: '0123456789', account_name: 'ACME-Jane', bank: 'Bloc MFB', sort_code: '51411' } };

  it('builds the exact Bloc permanent payload and decrypts stored account details', async () => {
    api.post.mockResolvedValue(response);
    const input = { customerId: 'cust_1', provider: 'Bloc' as const, accountType: 'Permanent' as const, accountName: 'Jane', email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' };
    const created = await service.createVirtualAccount(input);
    expect(created.accountNumber).toBe('0123456789');
    expect(api.post).toHaveBeenCalledWith('/virtual-accounts/create', expect.objectContaining({
      provider: 'Bloc', type: 'individual', virtual_account_type: 'Permanent', account_name: 'Jane', customer_email: 'jane@example.com', first_name: 'Jane', last_name: 'Doe',
    }));
    expect((await service.getVirtualAccount('cust_1'))?.accountNumber).toBe('0123456789');
  });

  it('builds PalmPay permanent payload with KYC', async () => {
    api.post.mockResolvedValue({ success: true, data: { account_number: '8700000001', account_name: 'Jane Doe', bank: 'PalmPay' } });
    await service.createVirtualAccount({ customerId: 'cust_2', provider: 'palmpay', accountType: 'Permanent', accountName: 'Jane Doe', customerName: 'Jane Doe', email: 'jane@example.com', nin: '11111122221' });
    expect(api.post).toHaveBeenCalledWith('/virtual-accounts/create', expect.objectContaining({ provider: 'palmpay', account_type: 'Permanent', customer_name: 'Jane Doe', nin: '11111122221' }));
  });

  it('builds PalmPay one-time payload with return and expiry fields', async () => {
    api.post.mockResolvedValue({ success: true, data: { account_number: '8700000000', account_name: 'Invoice', bank: 'PalmPay', expires_at_unix: 1789905229 } });
    await service.createVirtualAccount({ customerId: 'cust_3', provider: 'palmpay', accountType: 'onetime', accountName: 'Invoice', email: 'payer@example.com', amount: '100.00', returnUrl: 'https://example.com/return', orderExpireSeconds: 1800 });
    expect(api.post).toHaveBeenCalledWith('/virtual-accounts/create', expect.objectContaining({ account_type: 'onetime', amount: '100.00', return_url: 'https://example.com/return', order_expire_seconds: 1800 }));
  });

  it('routes corporate account creation to the documented endpoint', async () => {
    api.post.mockResolvedValue(response);
    await service.createVirtualAccount({ customerId: 'corp_1', accountType: 'corporate', fullName: 'Jane Doe', bvn: '22192474887', rcNumber: '99988828822', phone: '08030000000', email: 'ops@acme.co', businessType: 'COMPANY', businessName: 'Acme Ltd' });
    expect(api.post).toHaveBeenCalledWith('/corporate-accounts/create', expect.objectContaining({ full_name: 'Jane Doe', rc_number: '99988828822', business_type: 'COMPANY', business_name: 'Acme Ltd' }));
  });

  it('rejects invalid provider-specific inputs', async () => {
    await expect(service.createVirtualAccount({ customerId: 'x', provider: 'palmpay', accountType: 'Permanent', accountName: 'Jane', customerName: 'Jane', email: 'jane@example.com' })).rejects.toThrow(CrayException);
  });

  it('rejects incomplete provider success responses', async () => {
    api.post.mockResolvedValue({ success: true, data: {} });
    await expect(service.createVirtualAccount({ customerId: 'x', provider: 'Bloc', accountType: 'Permanent', accountName: 'Jane', email: 'jane@example.com' })).rejects.toThrow(CrayException);
  });
});

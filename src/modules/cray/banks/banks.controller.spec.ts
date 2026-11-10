import { Test, TestingModule } from '@nestjs/testing';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';

describe('BanksController', () => {
  let controller: BanksController;
  let service: jest.Mocked<BanksService>;

  beforeEach(async () => {
    const mockService = {
      listBanks: jest.fn(),
      validateBankAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BanksController],
      providers: [
        {
          provide: BanksService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<BanksController>(BanksController);
    service = module.get(BanksService);
  });

  it('should call banksService.listBanks on GET /cray/banks', async () => {
    service.listBanks.mockResolvedValueOnce([{ code: '000014', name: 'ACCESS BANK' }]);

    const result = await controller.getBanks();
    expect(result).toEqual([{ code: '000014', name: 'ACCESS BANK' }]);
    expect(service.listBanks).toHaveBeenCalledWith(false);
  });

  it('should call banksService.listBanks with forceRefresh=true when query param is present', async () => {
    service.listBanks.mockResolvedValueOnce([{ code: '000014', name: 'ACCESS BANK' }]);

    await controller.getBanks('true');
    expect(service.listBanks).toHaveBeenCalledWith(true);
  });

  it('should call banksService.validateBankAccount on POST /cray/banks/verify', async () => {
    service.validateBankAccount.mockResolvedValueOnce({
      accountName: 'JANE DOE',
      refId: 'sess_123',
    });

    const result = await controller.verifyAccount({
      accountNumber: '0123456789',
      bankCode: '000013',
    });

    expect(result).toEqual({ accountName: 'JANE DOE', refId: 'sess_123' });
    expect(service.validateBankAccount).toHaveBeenCalledWith({
      accountNumber: '0123456789',
      bankCode: '000013',
    });
  });
});


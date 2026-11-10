import { Test, TestingModule } from '@nestjs/testing';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { CrayStatus } from '../enums/cray.enums';

describe('TransfersController', () => {
  let controller: TransfersController;
  let service: jest.Mocked<TransfersService>;

  beforeEach(async () => {
    const mockService = {
      initiateTransfer: jest.fn(),
      getTransferStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransfersController],
      providers: [
        {
          provide: TransfersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TransfersController>(TransfersController);
    service = module.get(TransfersService);
  });

  it('should call transfersService.initiateTransfer on POST /cray/transfers', async () => {
    service.initiateTransfer.mockResolvedValueOnce({
      transferId: 'TRF_123',
      status: CrayStatus.PENDING,
    });

    const result = await controller.initiateTransfer({
      walletId: 'w_1',
      amount: '500.00',
      reference: 'ref_1',
      destination: {
        accountNumber: '0123456789',
        bankCode: '000013',
        accountName: 'TEST USER',
      },
    });

    expect(result.transferId).toBe('TRF_123');
    expect(result.status).toBe(CrayStatus.PENDING);
    expect(service.initiateTransfer).toHaveBeenCalledTimes(1);
  });

  it('should call transfersService.getTransferStatus on GET /cray/transfers/:reference', async () => {
    service.getTransferStatus.mockResolvedValueOnce({
      status: CrayStatus.SUCCESSFUL,
      amount: '500.00',
    });

    const result = await controller.getTransferStatus('ref_1');
    expect(result.status).toBe(CrayStatus.SUCCESSFUL);
    expect(result.amount).toBe('500.00');
    expect(service.getTransferStatus).toHaveBeenCalledWith('ref_1');
  });
});


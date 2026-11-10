import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CrayModule } from './cray.module';
import { CRAY_MODULE_OPTIONS } from './config/cray.constants';
import { CrayModuleOptions } from './config/cray.config';
import { CrayCustomer } from './entities/cray-customer.entity';
import { CrayVirtualAccount } from './entities/cray-virtual-account.entity';
import { CrayBeneficiary } from './entities/cray-beneficiary.entity';

describe('CrayModule', () => {
  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  it('should compile synchronously with default config', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CrayModule],
    })
      .overrideProvider(getRepositoryToken(CrayCustomer))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayVirtualAccount))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayBeneficiary))
      .useValue(mockRepo)
      .compile();

    expect(module).toBeDefined();
    const options = module.get<CrayModuleOptions>(CRAY_MODULE_OPTIONS);
    expect(options).toBeDefined();
    expect(options.environment).toBe('staging');
  });

  it('should compile with forRoot options', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CrayModule.forRoot({
          environment: 'production',
          apiToken: 'test-token',
        }),
      ],
    })
      .overrideProvider(getRepositoryToken(CrayCustomer))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayVirtualAccount))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayBeneficiary))
      .useValue(mockRepo)
      .compile();

    expect(module).toBeDefined();
    const options = module.get<CrayModuleOptions>(CRAY_MODULE_OPTIONS);
    expect(options).toBeDefined();
    expect(options.environment).toBe('production');
    expect(options.apiToken).toBe('test-token');
  });
});

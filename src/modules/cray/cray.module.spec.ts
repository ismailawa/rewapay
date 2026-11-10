import { Test, TestingModule } from '@nestjs/testing';
import { CrayModule } from './cray.module';
import { CRAY_MODULE_OPTIONS } from './config/cray.constants';
import { CrayModuleOptions } from './config/cray.config';

describe('CrayModule', () => {
  it('should compile synchronously with default config', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CrayModule],
    }).compile();

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
    }).compile();

    expect(module).toBeDefined();
    const options = module.get<CrayModuleOptions>(CRAY_MODULE_OPTIONS);
    expect(options).toBeDefined();
    expect(options.environment).toBe('production');
    expect(options.apiToken).toBe('test-token');
  });
});

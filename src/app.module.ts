import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrayModule } from './modules/cray/cray.module';

@Module({
  imports: [CrayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

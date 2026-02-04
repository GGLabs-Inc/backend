import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MockUSDCService } from './mockusdc.service';
import { MockUSDCController } from './mockusdc.controller';
import mockUSDCConfig from './config/mockusdc.config';

@Module({
  imports: [
    ConfigModule.forFeature(mockUSDCConfig),
  ],
  controllers: [MockUSDCController],
  providers: [MockUSDCService],
  exports: [MockUSDCService],
})
export class MockUSDCModule {}

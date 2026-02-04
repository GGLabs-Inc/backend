import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionSafeService } from './sessionsafe.service';
import { SessionSafeController } from './sessionsafe.controller';
import sessionSafeConfig from './config/sessionsafe.config';

@Module({
  imports: [
    ConfigModule.forFeature(sessionSafeConfig),
  ],
  controllers: [SessionSafeController],
  providers: [SessionSafeService],
  exports: [SessionSafeService],
})
export class SessionSafeModule {}

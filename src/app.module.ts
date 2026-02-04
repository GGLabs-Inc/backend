import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MockUSDCModule } from './MockUSDC/mockusdc.module';
import { SessionSafeModule } from './SessionSafe/sessionsafe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MockUSDCModule,
    SessionSafeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

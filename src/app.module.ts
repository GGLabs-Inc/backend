import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MockUSDCModule } from './MockUSDC/mockusdc.module';
import { SessionSafeModule } from './SessionSafe/sessionsafe.module';
import { ChessModule } from './Chess/chess.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MockUSDCModule,
    SessionSafeModule,
    ChessModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MockUSDCModule } from './MockUSDC/mockusdc.module';
import { SessionSafeModule } from './SessionSafe/sessionsafe.module';
import { ChessModule } from './Chess/chess.module';
import { TradingModule } from './Trading/trading.module';
import { ChatAiModule } from './chat_AI/chat-ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MockUSDCModule,
    SessionSafeModule,
    ChessModule,
    TradingModule,
    ChatAiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

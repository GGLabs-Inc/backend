import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChessModule } from './Chess/chess.module';
import { TradingModule } from './Trading/trading.module';
import { YellowModule } from './Yellow/yellow.module';
import { AIModule } from './AI/ai.module';
import { MessagingModule } from './Messaging/messaging.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    YellowModule,
    AIModule,
    ChessModule,
    TradingModule,
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

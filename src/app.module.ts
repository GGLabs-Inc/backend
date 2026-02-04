import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MockUSDCModule } from './MockUSDC/mockusdc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MockUSDCModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { YellowModule } from '../Yellow/yellow.module';

@Module({
  imports: [YellowModule, HttpModule],
  controllers: [AIController],
  providers: [AIService],
})
export class AIModule {}

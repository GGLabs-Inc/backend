import { Module } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { YellowModule } from '../Yellow/yellow.module';

@Module({
  imports: [YellowModule],
  providers: [MessagingGateway, MessagingService],
})
export class MessagingModule {}

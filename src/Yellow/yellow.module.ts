import { Module, Global } from '@nestjs/common';
import { YellowService } from './yellow.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [YellowService],
  exports: [YellowService],
})
export class YellowModule {}

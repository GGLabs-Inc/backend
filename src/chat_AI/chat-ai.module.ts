import { Module } from '@nestjs/common';
import { ChatAiController } from './chat-ai.controller';
import { ChatAiGateway } from './chat-ai.gateway';
import { ChatAiService } from './chat-ai.service';
import { YellowChannelService } from './services/yellow-channel.service';
import { SessionManagerService } from './services/session-manager.service';
import { SignatureVerificationService } from './services/signature-verification.service';
import { AiProviderService } from './services/ai-provider.service';

/**
 * 🤖 MÓDULO DE AI CHAT CON YELLOW NETWORK
 * Integración completa de chat IA con state channels
 */
@Module({
  controllers: [ChatAiController],
  providers: [
    ChatAiGateway,
    ChatAiService,
    YellowChannelService,
    SessionManagerService,
    SignatureVerificationService,
    AiProviderService,
  ],
  exports: [ChatAiService],
})
export class ChatAiModule {}

import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { ChatAiService } from './chat-ai.service';
import {
  CreateSessionDto,
  CreateSessionKeyDto,
  AiQueryDto,
  CloseSessionDto,
  GetBalanceDto,
  GetMessagesDto,
} from './dto/chat-ai.dto';

/**
 * 🎮 CONTROLADOR DE AI CHAT
 * Endpoints REST para gestión de sesiones y consultas de IA
 */
@Controller('ai-chat')
export class ChatAiController {
  private readonly logger = new Logger(ChatAiController.name);

  constructor(private readonly chatAiService: ChatAiService) {}

  /**
   * ✅ HEALTH CHECK
   */
  @Get('health')
  async health() {
    return this.chatAiService.healthCheck();
  }

  /**
   * 🤖 LISTAR MODELOS DISPONIBLES
   */
  @Get('models')
  listModels() {
    return this.chatAiService.listModels();
  }

  /**
   * 🆕 CREAR SESIÓN
   * POST /ai-chat/sessions
   */
  @Post('sessions')
  async createSession(@Body() dto: CreateSessionDto) {
    this.logger.log(`Creating session for ${dto.userAddress}`);
    const session = await this.chatAiService.createSession(dto);
    
    return {
      success: true,
      sessionId: session.channelId,
      balance: session.balance.toString(),
      nonce: session.nonce,
      status: session.status,
    };
  }

  /**
   * 🔑 CREAR SESSION KEY
   * POST /ai-chat/sessions/:sessionId/session-key
   */
  @Post('sessions/:sessionId/session-key')
  async createSessionKey(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<CreateSessionKeyDto, 'sessionId'>,
  ) {
    this.logger.log(`Creating session key for ${sessionId}`);
    return this.chatAiService.createSessionKey({
      sessionId,
      ...dto,
    });
  }

  /**
   * 💬 REALIZAR CONSULTA A IA
   * POST /ai-chat/query
   */
  @Post('query')
  async query(@Body() dto: AiQueryDto) {
    this.logger.log(`Processing query for session ${dto.sessionId}`);
    return this.chatAiService.processQuery(dto);
  }

  /**
   * 💰 OBTENER BALANCE DE SESIÓN
   * GET /ai-chat/sessions/:sessionId/balance
   */
  @Get('sessions/:sessionId/balance')
  getBalance(@Param('sessionId') sessionId: string) {
    return this.chatAiService.getSessionBalance(sessionId);
  }

  /**
   * 📋 OBTENER MENSAJES
   * GET /ai-chat/sessions/:sessionId/messages
   */
  @Get('sessions/:sessionId/messages')
  getMessages(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const messages = this.chatAiService.getMessages(
      sessionId,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );

    return {
      sessionId,
      count: messages.length,
      messages,
    };
  }

  /**
   * 🔒 CERRAR SESIÓN
   * POST /ai-chat/sessions/:sessionId/close
   */
  @Post('sessions/:sessionId/close')
  async closeSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<CloseSessionDto, 'sessionId'>,
  ) {
    this.logger.log(`Closing session ${sessionId}`);
    return this.chatAiService.closeSession({
      sessionId,
      ...dto,
    });
  }

  /**
   * 📊 ESTADÍSTICAS
   * GET /ai-chat/stats
   */
  @Get('stats')
  getStats() {
    return this.chatAiService.getStats();
  }
}

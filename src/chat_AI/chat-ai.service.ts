import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { YellowChannelService } from './services/yellow-channel.service';
import { SessionManagerService } from './services/session-manager.service';
import { SignatureVerificationService } from './services/signature-verification.service';
import { AiProviderService } from './services/ai-provider.service';
import {
  CreateSessionDto,
  CreateSessionKeyDto,
  AiQueryDto,
  CloseSessionDto,
} from './dto/chat-ai.dto';
import { AiQueryResponse, AiChatSession, ChatMessage } from './interfaces/chat-ai.interface';
import { CHAT_AI_CONFIG } from './config/chat-ai.config';
import { ethers } from 'ethers';

/**
 * 🤖 SERVICIO PRINCIPAL DE AI CHAT
 * Orquesta todas las operaciones del AI Chat con Yellow Network
 */
@Injectable()
export class ChatAiService {
  private readonly logger = new Logger(ChatAiService.name);

  constructor(
    private readonly yellowChannel: YellowChannelService,
    private readonly sessionManager: SessionManagerService,
    private readonly signatureVerification: SignatureVerificationService,
    private readonly aiProvider: AiProviderService,
  ) {
    // Inicializar conexión con Yellow Network
    this.initializeYellowConnection();

    // Limpieza de sesiones inactivas cada 10 minutos
    setInterval(() => {
      this.sessionManager.cleanupInactiveSessions();
    }, 10 * 60 * 1000);
  }

  /**
   * 🔌 INICIALIZAR CONEXIÓN CON YELLOW
   */
  private async initializeYellowConnection(): Promise<void> {
    try {
      await this.yellowChannel.connect();
      this.logger.log('✅ Yellow Network connection established');
    } catch (error) {
      this.logger.warn('⚠️ Yellow Network not available - Running in MOCK mode');
      this.logger.warn('💡 Set PROVIDER_PRIVATE_KEY in .env to enable Yellow Network');
    }
  }

  /**
   * 🆕 CREAR SESIÓN DE CHAT
   */
  async createSession(dto: CreateSessionDto): Promise<AiChatSession> {
    this.logger.log(`Creating session for ${dto.userAddress}`);

    // Validar deposit amount
    const depositAmount = BigInt(dto.depositAmount);
    const minDeposit = BigInt(CHAT_AI_CONFIG.SESSION.MIN_DEPOSIT);
    const maxDeposit = BigInt(CHAT_AI_CONFIG.SESSION.MAX_DEPOSIT);

    if (depositAmount < minDeposit) {
      throw new BadRequestException(`Deposit must be at least ${minDeposit.toString()}`);
    }

    if (depositAmount > maxDeposit) {
      throw new BadRequestException(`Deposit cannot exceed ${maxDeposit.toString()}`);
    }

    // Crear state channel en Yellow Network
    const session = await this.yellowChannel.createChannel(
      dto.userAddress,
      depositAmount,
    );

    // Registrar sesión
    this.sessionManager.createSession(session);

    return session;
  }

  /**
   * 🔑 CREAR SESSION KEY
   */
  async createSessionKey(dto: CreateSessionKeyDto): Promise<{ success: boolean; sessionKey: string }> {
    this.logger.log(`Creating session key for ${dto.sessionId}`);

    // Verificar que la sesión existe
    const session = this.sessionManager.getSession(dto.sessionId);

    // Verificar que el usuario es el dueño de la sesión
    if (session.userAddress.toLowerCase() !== dto.userAddress.toLowerCase()) {
      throw new BadRequestException('User is not the owner of this session');
    }

    // Generar session key address (en un caso real, el frontend genera esto)
    const sessionKeyAddress = dto.userAddress; // Simplificado para el ejemplo

    // Crear session key
    const sessionKey = {
      address: sessionKeyAddress,
      userAddress: dto.userAddress,
      expiry: dto.expiry,
      permissions: ['ai.query', 'ai.payment'],
      maxAmount: session.balance,
      message: '',
    };

    // Construir mensaje para verificar firma
    const message = this.signatureVerification['buildSessionKeyMessage'](sessionKey);
    sessionKey.message = message;

    // Verificar firma
    const isValid = this.signatureVerification.verifySessionKeySignature(
      { ...sessionKey, signature: dto.signature },
      dto.signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    // Registrar session key
    this.sessionManager.registerSessionKey(dto.sessionId, {
      ...sessionKey,
      signature: dto.signature,
    });

    // Actualizar sesión
    this.sessionManager.updateSession(dto.sessionId, {
      status: 'ACTIVE',
      sessionKey: sessionKeyAddress,
    });

    return {
      success: true,
      sessionKey: sessionKeyAddress,
    };
  }

  /**
   * 💬 PROCESAR CONSULTA A IA
   */
  async processQuery(dto: AiQueryDto): Promise<AiQueryResponse> {
    this.logger.log(`Processing query for session ${dto.sessionId}`);

    // 1. Verificar sesión
    const session = this.sessionManager.getSession(dto.sessionId);
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Session is not active');
    }

    // 2. Obtener session key
    const sessionKey = this.sessionManager.getSessionKey(dto.sessionId);

    // 3. Verificar que session key no haya expirado
    if (!this.signatureVerification.isSessionKeyValid(sessionKey)) {
      throw new BadRequestException('Session key is invalid or expired');
    }

    // 4. Verificar firma de la consulta
    const signedMessage = {
      message: {
        sessionId: dto.sessionId,
        nonce: dto.nonce,
        modelId: dto.modelId,
        prompt: dto.prompt,
        maxCost: BigInt(dto.maxCost),
        timestamp: dto.timestamp,
      },
      signature: dto.signature,
    };

    const isValidSignature = this.signatureVerification.verifyQuerySignature(
      signedMessage,
      sessionKey.address,
    );

    if (!isValidSignature) {
      throw new BadRequestException('Invalid query signature');
    }

    // 5. Validar nonce
    if (!this.sessionManager.validateNonce(dto.sessionId, dto.nonce)) {
      throw new BadRequestException('Invalid nonce');
    }

    // 6. Verificar balance
    const maxCost = BigInt(dto.maxCost);
    if (session.balance < maxCost) {
      throw new BadRequestException('Insufficient balance');
    }

    // 7. Obtener info del modelo
    const modelInfo = this.aiProvider.getModelInfo(dto.modelId);

    // 8. Ejecutar consulta a IA
    const aiResult = await this.aiProvider.query(dto.modelId, dto.prompt);

    // 9. Calcular costo real (basado en tokens usados si es necesario)
    const actualCost = ethers.parseUnits(modelInfo.cost.toString(), 6);

    // 10. Deducir costo del balance
    this.sessionManager.deductCost(dto.sessionId, actualCost);

    // 11. Incrementar nonce
    this.sessionManager.incrementNonce(dto.sessionId);

    // 12. Actualizar estado del canal en Yellow Network
    const updatedSession = this.sessionManager.getSession(dto.sessionId);
    const newState = await this.yellowChannel.updateChannelState(
      dto.sessionId,
      updatedSession.balance,
      updatedSession.nonce,
    );

    // 13. Guardar mensajes
    const userMessage: ChatMessage = {
      id: `${Date.now()}_user`,
      sessionId: dto.sessionId,
      role: 'user',
      content: dto.prompt,
      model: dto.modelId,
      timestamp: Date.now(),
      cost: 0,
    };

    const assistantMessage: ChatMessage = {
      id: `${Date.now()}_assistant`,
      sessionId: dto.sessionId,
      role: 'assistant',
      content: aiResult.response,
      model: dto.modelId,
      timestamp: Date.now(),
      cost: modelInfo.cost,
    };

    this.sessionManager.addMessage(dto.sessionId, userMessage);
    this.sessionManager.addMessage(dto.sessionId, assistantMessage);

    return {
      response: aiResult.response,
      model: dto.modelId,
      tokensUsed: aiResult.tokensUsed,
      cost: modelInfo.cost,
      newState: {
        balance: updatedSession.balance.toString(),
        nonce: updatedSession.nonce,
      },
    };
  }

  /**
   * 🔒 CERRAR SESIÓN
   */
  async closeSession(dto: CloseSessionDto): Promise<{ success: boolean; txHash?: string }> {
    this.logger.log(`Closing session ${dto.sessionId}`);

    // Verificar sesión
    const session = this.sessionManager.getSession(dto.sessionId);

    // Verificar que el usuario es el dueño
    if (session.userAddress.toLowerCase() !== dto.userAddress.toLowerCase()) {
      throw new BadRequestException('User is not the owner of this session');
    }

    // Obtener estado final
    const finalState = await this.yellowChannel.updateChannelState(
      dto.sessionId,
      session.balance,
      session.nonce,
    );

    // Cerrar canal en Yellow Network
    await this.yellowChannel.closeChannel(dto.sessionId, finalState);

    // Actualizar estado
    this.sessionManager.updateSession(dto.sessionId, { status: 'CLOSED' });

    // Eliminar sesión después de un tiempo
    setTimeout(() => {
      this.sessionManager.deleteSession(dto.sessionId);
    }, 60000); // 1 minuto

    return {
      success: true,
    };
  }

  /**
   * 💰 OBTENER BALANCE DE SESIÓN
   */
  getSessionBalance(sessionId: string): { balance: string; nonce: number } {
    const session = this.sessionManager.getSession(sessionId);
    return {
      balance: session.balance.toString(),
      nonce: session.nonce,
    };
  }

  /**
   * 📋 OBTENER MENSAJES
   */
  getMessages(sessionId: string, limit?: number, offset?: number): ChatMessage[] {
    return this.sessionManager.getMessages(sessionId, limit, offset);
  }

  /**
   * 🤖 LISTAR MODELOS
   */
  listModels() {
    return this.aiProvider.listModels();
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS
   */
  getStats() {
    return this.sessionManager.getStats();
  }

  /**
   * ✅ HEALTH CHECK
   */
  async healthCheck() {
    return {
      status: 'ok',
      service: 'ai-chat',
      timestamp: new Date().toISOString(),
      yellowNetworkConnected: true,
      stats: this.getStats(),
    };
  }
}

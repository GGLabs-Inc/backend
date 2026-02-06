import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { AiChatSession, SessionKey, ChatMessage } from '../interfaces/chat-ai.interface';
import { CHAT_AI_CONFIG } from '../config/chat-ai.config';

/**
 * 📚 SERVICIO DE GESTIÓN DE SESIONES
 * Maneja sesiones activas, session keys y mensajes en memoria
 */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  
  // 💾 Almacenamiento en memoria
  private sessions: Map<string, AiChatSession> = new Map();
  private sessionKeys: Map<string, SessionKey> = new Map(); // channelId -> SessionKey
  private messages: Map<string, ChatMessage[]> = new Map(); // channelId -> messages
  private userSessions: Map<string, Set<string>> = new Map(); // userAddress -> channelIds

  /**
   * ➕ CREAR SESIÓN
   */
  createSession(session: AiChatSession): void {
    this.sessions.set(session.channelId, session);

    // Registrar sesión del usuario
    if (!this.userSessions.has(session.userAddress)) {
      this.userSessions.set(session.userAddress, new Set());
    }
    this.userSessions.get(session.userAddress)!.add(session.channelId);

    this.logger.log(`Session created: ${session.channelId} for ${session.userAddress}`);
  }

  /**
   * 🔍 OBTENER SESIÓN
   */
  getSession(channelId: string): AiChatSession {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new NotFoundException(`Session ${channelId} not found`);
    }
    return session;
  }

  /**
   * 📝 ACTUALIZAR SESIÓN
   */
  updateSession(channelId: string, updates: Partial<AiChatSession>): void {
    const session = this.getSession(channelId);
    const updated = { ...session, ...updates, lastActivity: Date.now() };
    this.sessions.set(channelId, updated);
  }

  /**
   * ❌ ELIMINAR SESIÓN
   */
  deleteSession(channelId: string): void {
    const session = this.sessions.get(channelId);
    if (session) {
      // Eliminar de userSessions
      const userChannels = this.userSessions.get(session.userAddress);
      if (userChannels) {
        userChannels.delete(channelId);
      }

      // Eliminar sesión, session key y mensajes
      this.sessions.delete(channelId);
      this.sessionKeys.delete(channelId);
      this.messages.delete(channelId);

      this.logger.log(`Session deleted: ${channelId}`);
    }
  }

  /**
   * 🔑 REGISTRAR SESSION KEY
   */
  registerSessionKey(channelId: string, sessionKey: SessionKey): void {
    this.sessionKeys.set(channelId, sessionKey);
    this.logger.log(`Session key registered for ${channelId}`);
  }

  /**
   * 🔍 OBTENER SESSION KEY
   */
  getSessionKey(channelId: string): SessionKey {
    const sessionKey = this.sessionKeys.get(channelId);
    if (!sessionKey) {
      throw new NotFoundException(`Session key not found for ${channelId}`);
    }
    return sessionKey;
  }

  /**
   * 💬 AGREGAR MENSAJE
   */
  addMessage(channelId: string, message: ChatMessage): void {
    if (!this.messages.has(channelId)) {
      this.messages.set(channelId, []);
    }

    const sessionMessages = this.messages.get(channelId)!;
    sessionMessages.push(message);

    // Limitar cantidad de mensajes
    const maxMessages = CHAT_AI_CONFIG.STORAGE.MAX_MESSAGES_PER_SESSION;
    if (sessionMessages.length > maxMessages) {
      sessionMessages.splice(0, sessionMessages.length - maxMessages);
    }

    this.messages.set(channelId, sessionMessages);
  }

  /**
   * 📋 OBTENER MENSAJES
   */
  getMessages(channelId: string, limit?: number, offset?: number): ChatMessage[] {
    const sessionMessages = this.messages.get(channelId) || [];

    const start = offset || 0;
    const end = limit ? start + limit : undefined;

    return sessionMessages.slice(start, end);
  }

  /**
   * 📊 OBTENER SESIONES DE USUARIO
   */
  getUserSessions(userAddress: string): AiChatSession[] {
    const channelIds = this.userSessions.get(userAddress);
    if (!channelIds) {
      return [];
    }

    return Array.from(channelIds)
      .map(id => this.sessions.get(id))
      .filter(session => session !== undefined) as AiChatSession[];
  }

  /**
   * 🧹 LIMPIAR SESIONES INACTIVAS
   */
  cleanupInactiveSessions(): number {
    const now = Date.now();
    const timeout = CHAT_AI_CONFIG.SESSION.INACTIVITY_TIMEOUT;
    let cleaned = 0;

    for (const [channelId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > timeout) {
        this.logger.log(`Cleaning up inactive session: ${channelId}`);
        this.deleteSession(channelId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} inactive sessions`);
    }

    return cleaned;
  }

  /**
   * ✅ VALIDAR NONCE
   */
  validateNonce(channelId: string, nonce: number): boolean {
    const session = this.getSession(channelId);
    
    if (nonce !== session.nonce) {
      this.logger.warn(`Invalid nonce for ${channelId}: expected ${session.nonce}, got ${nonce}`);
      return false;
    }

    return true;
  }

  /**
   * ➕ INCREMENTAR NONCE
   */
  incrementNonce(channelId: string): void {
    const session = this.getSession(channelId);
    this.updateSession(channelId, { nonce: session.nonce + 1 });
  }

  /**
   * 💰 DEDUCIR COSTO
   */
  deductCost(channelId: string, cost: bigint): void {
    const session = this.getSession(channelId);

    if (session.balance < cost) {
      throw new BadRequestException('Insufficient balance in channel');
    }

    this.updateSession(channelId, { balance: session.balance - cost });
    this.logger.debug(`Deducted ${cost.toString()} from ${channelId}. New balance: ${(session.balance - cost).toString()}`);
  }

  /**
   * 📊 ESTADÍSTICAS
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
  } {
    let totalMessages = 0;
    for (const messages of this.messages.values()) {
      totalMessages += messages.length;
    }

    const now = Date.now();
    const activeTimeout = 5 * 60 * 1000; // 5 minutos
    let activeSessions = 0;

    for (const session of this.sessions.values()) {
      if (now - session.lastActivity < activeTimeout) {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      totalMessages,
    };
  }
}

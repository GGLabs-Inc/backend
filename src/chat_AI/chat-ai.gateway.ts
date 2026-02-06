import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatAiService } from './chat-ai.service';

/**
 * 🔌 WEBSOCKET GATEWAY PARA AI CHAT
 * Comunicación en tiempo real con el frontend
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ai-chat',
})
export class ChatAiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatAiGateway.name);
  private connectedClients: Map<string, string> = new Map(); // socketId -> sessionId

  constructor(private readonly chatAiService: ChatAiService) {}

  /**
   * 🔌 CLIENTE CONECTADO
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * 🔌 CLIENTE DESCONECTADO
   */
  handleDisconnect(client: Socket) {
    const sessionId = this.connectedClients.get(client.id);
    if (sessionId) {
      this.logger.log(`Client disconnected: ${client.id} (session: ${sessionId})`);
      this.connectedClients.delete(client.id);
    }
  }

  /**
   * 📡 SUBSCRIBIRSE A SESIÓN
   */
  @SubscribeMessage('subscribe:session')
  handleSubscribe(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} subscribing to session ${data.sessionId}`);
    
    // Registrar cliente
    this.connectedClients.set(client.id, data.sessionId);
    
    // Unirse a room de la sesión
    client.join(`session:${data.sessionId}`);

    return {
      event: 'subscribed',
      sessionId: data.sessionId,
    };
  }

  /**
   * 📡 DESUBSCRIBIRSE DE SESIÓN
   */
  @SubscribeMessage('unsubscribe:session')
  handleUnsubscribe(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} unsubscribing from session ${data.sessionId}`);
    
    // Salir del room
    client.leave(`session:${data.sessionId}`);
    this.connectedClients.delete(client.id);

    return {
      event: 'unsubscribed',
      sessionId: data.sessionId,
    };
  }

  /**
   * 📨 NOTIFICAR NUEVO MENSAJE
   */
  notifyNewMessage(sessionId: string, message: any) {
    this.server.to(`session:${sessionId}`).emit('message:new', {
      sessionId,
      message,
    });
  }

  /**
   * 💰 NOTIFICAR ACTUALIZACIÓN DE BALANCE
   */
  notifyBalanceUpdate(sessionId: string, balance: string, nonce: number) {
    this.server.to(`session:${sessionId}`).emit('balance:update', {
      sessionId,
      balance,
      nonce,
    });
  }

  /**
   * ⚠️ NOTIFICAR ERROR
   */
  notifyError(sessionId: string, error: string) {
    this.server.to(`session:${sessionId}`).emit('error', {
      sessionId,
      error,
    });
  }

  /**
   * 📊 STATS CONNECTED CLIENTS
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}

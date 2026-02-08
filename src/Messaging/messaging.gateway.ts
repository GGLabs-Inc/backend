import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/messaging.dto';

@WebSocketGateway({
  namespace: 'messaging',
  cors: {
    origin: '*',
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  // Mapa de usuarios conectados: Address -> SocketId
  private connectedUsers = new Map<string, string>();

  constructor(private readonly messagingService: MessagingService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to Messaging: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Eliminar usuario del mapa si se desconecta
    for (const [address, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(address);
        this.logger.log(`User ${address} disconnected`);
        this.messagingService.setUserOffline(address);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() data: { address: string },
    @ConnectedSocket() client: Socket,
  ) {
    const address = data.address.toLowerCase();
    this.connectedUsers.set(address, client.id);
    client.join(address); // Unirse a una sala con su propia address para recibir mensajes privados
    this.messagingService.setUserOnline(address);
    this.logger.log(`User registered: ${address}`);
    return { success: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() payload: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const senderAddress = payload.channelState.userAddress; // Confíamos en el payload, pero luego se verifica firma

      // 1. Procesar Pago y Persistencia
      const result = await this.messagingService.processMessage(senderAddress, payload);

      // 2. Entregar al destinatario en tiempo real
      const recipientSocketId = this.connectedUsers.get(payload.to.toLowerCase());
      
      // Emitir a la sala del destinatario (incluso si tiene múltiples pestañas)
      this.server.to(payload.to.toLowerCase()).emit('incomingMessage', result.message);

      // Responder al remitente con la firma del servidor (Recibo de Pago)
      return {
        status: 'sent',
        data: result,
      };

    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  @SubscribeMessage('getHistory')
  handleGetHistory(@MessageBody() data: { with: string; me: string }) {
    return this.messagingService.getHistory(data.me, data.with);
  }

  @SubscribeMessage('getConversations')
  handleGetConversations(@MessageBody() data: { me: string }) {
    return this.messagingService.getConversations(data.me);
  }
}

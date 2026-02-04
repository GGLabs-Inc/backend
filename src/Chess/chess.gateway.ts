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
import { ChessService } from './chess.service';
import { MakeMoveDto, StartGameDto, ClaimVictoryDto } from './dto/chess.dto';

/**
 * 🔌 WEBSOCKET GATEWAY PARA AJEDREZ
 * Maneja comunicación bidireccional en tiempo real
 * Permite: crear partidas, hacer movimientos, recibir actualizaciones instantáneas
 */
@WebSocketGateway({
  namespace: '/chess',
  cors: {
    origin: '*', // En producción, especificar dominios permitidos
  },
})
export class ChessGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChessGateway.name);
  private connectedPlayers: Map<string, string> = new Map(); // socketId -> walletAddress

  constructor(private readonly chessService: ChessService) {}

  /**
   * ✅ CLIENTE CONECTADO
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * ❌ CLIENTE DESCONECTADO
   */
  handleDisconnect(client: Socket) {
    const walletAddress = this.connectedPlayers.get(client.id);
    if (walletAddress) {
      this.logger.log(`Player ${walletAddress} disconnected`);
      this.connectedPlayers.delete(client.id);
    }
  }

  /**
   * 🔐 REGISTRAR WALLET
   * El cliente debe enviar su address al conectarse
   */
  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() data: { walletAddress: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedPlayers.set(client.id, data.walletAddress);
    this.logger.log(`Player registered: ${data.walletAddress}`);

    client.emit('registered', {
      success: true,
      message: 'Successfully registered to Chess WebSocket',
    });
  }

  /**
   * 🎮 CREAR NUEVA PARTIDA
   */
  @SubscribeMessage('startGame')
  async handleStartGame(
    @MessageBody() dto: StartGameDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.chessService.startGame(dto);

      // Notificar al creador
      client.emit('gameStarted', result);

      // Si hay oponente específico, notificarle
      if (dto.opponentAddress) {
        this.notifyPlayer(dto.opponentAddress, 'gameInvitation', {
          gameId: result.gameId,
          from: dto.walletAddress,
          wagerAmount: dto.wagerAmount,
        });
      }

      // Broadcast a la sala de búsqueda (para matchmaking automático)
      this.server.emit('newGameAvailable', {
        gameId: result.gameId,
        wagerAmount: dto.wagerAmount,
      });

      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Error starting game: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 👥 UNIRSE A PARTIDA
   */
  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @MessageBody() data: { gameId: string; walletAddress: string; signature: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.chessService.joinGame(
        data.gameId,
        data.walletAddress,
        data.signature,
      );

      // Unir al cliente a la sala del juego
      client.join(data.gameId);

      // Notificar a ambos jugadores
      this.server.to(data.gameId).emit('gameReady', result);

      // Notificar específicamente al jugador 1
      this.notifyPlayer(result.player1, 'opponentJoined', {
        gameId: data.gameId,
        opponent: data.walletAddress,
      });

      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Error joining game: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * ♟️ HACER MOVIMIENTO
   * Este es el mensaje MÁS CRÍTICO - debe ser instantáneo
   */
  @SubscribeMessage('makeMove')
  async handleMakeMove(
    @MessageBody() dto: MakeMoveDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.chessService.makeMove(dto);

      // 🚀 BROADCAST INSTANTÁNEO a ambos jugadores
      this.server.to(dto.gameId).emit('moveMade', {
        ...result,
        timestamp: Date.now(),
      });

      this.logger.log(
        `Move processed: ${dto.move} in game ${dto.gameId} | Latency: ~${Date.now() - dto.nonce * 100}ms`,
      );

      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Error making move: ${error.message}`);
      client.emit('moveError', { message: error.message, move: dto.move });
      return { success: false, error: error.message };
    }
  }

  /**
   * 🏆 RECLAMAR VICTORIA
   */
  @SubscribeMessage('claimVictory')
  async handleClaimVictory(
    @MessageBody() dto: ClaimVictoryDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.chessService.claimVictory(dto);

      // Notificar a ambos jugadores
      this.server.to(dto.gameId).emit('gameEnded', {
        ...result,
        reason: 'checkmate',
      });

      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Error claiming victory: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 📊 OBTENER ESTADO DE PARTIDA
   */
  @SubscribeMessage('getGameState')
  handleGetGameState(@MessageBody() data: { gameId: string }) {
    try {
      const game = this.chessService.getGame(data.gameId);
      return { success: true, data: game };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 📜 OBTENER MIS PARTIDAS
   */
  @SubscribeMessage('getMyGames')
  handleGetMyGames(@MessageBody() data: { walletAddress: string }) {
    try {
      const games = this.chessService.getPlayerGames(data.walletAddress);
      return { success: true, data: games };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 💬 CHAT EN PARTIDA (Opcional, pero cool)
   */
  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @MessageBody() data: { gameId: string; message: string; from: string },
  ) {
    this.server.to(data.gameId).emit('chatMessage', {
      from: data.from,
      message: data.message,
      timestamp: Date.now(),
    });
  }

  /**
   * 🔔 HELPER: Notificar a un jugador específico
   */
  private notifyPlayer(walletAddress: string, event: string, data: any) {
    // Buscar el socketId del jugador
    for (const [socketId, address] of this.connectedPlayers.entries()) {
      if (address.toLowerCase() === walletAddress.toLowerCase()) {
        this.server.to(socketId).emit(event, data);
        break;
      }
    }
  }

  /**
   * 📡 MÉTODO PÚBLICO: Emitir evento desde fuera del Gateway
   * Útil para cuando el BlockchainListener detecta un depósito
   */
  public emitToGame(gameId: string, event: string, data: any) {
    this.server.to(gameId).emit(event, data);
  }
}

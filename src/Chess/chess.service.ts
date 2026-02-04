import { Injectable, BadRequestException, Logger } from '@nestjs/common';
const { Chess } = require('chess.js');
import {
  ChessGame,
  ChessMove,
  GameStatus,
  GameChannel,
  MoveResponse,
  GameStartResponse,
} from './interfaces/chess.interface';
import { MakeMoveDto, StartGameDto, ClaimVictoryDto } from './dto/chess.dto';
import { SignatureService } from './services/signature.service';

/**
 * Servicio principal para gestión de partidas de ajedrez
 * Implementa el motor de reglas y estado en memoria
 */
@Injectable()
export class ChessService {
  private readonly logger = new Logger(ChessService.name);

  // 💾 ESTADO EN MEMORIA (In-Memory State)
  // En producción, esto debería estar en Redis para escalabilidad
  private activeGames: Map<string, ChessGame> = new Map();
  private gameChannels: Map<string, GameChannel> = new Map();
  private playerGames: Map<string, string[]> = new Map(); // player -> gameIds[]

  constructor(private readonly signatureService: SignatureService) {}

  /**
   * 🎮 CREAR NUEVA PARTIDA
   * Valida firma y crea instancia de juego en memoria
   */
  async startGame(dto: StartGameDto): Promise<GameStartResponse> {
    this.logger.log(`Starting new game for ${dto.walletAddress}`);

    // 1. Verificar firma ECDSA
    const message = `Start Chess Game - Wager: ${dto.wagerAmount} USDC`;
    const validation = await this.signatureService.verifySignature(
      message,
      dto.signature,
    );

    if (!validation.isValid || validation.recoveredAddress.toLowerCase() !== dto.walletAddress.toLowerCase()) {
      throw new BadRequestException('Invalid signature');
    }

    // 2. Generar ID único de partida
    const gameId = this.generateGameId();

    // 3. Inicializar motor de ajedrez
    const chess = new Chess();

    // 4. Crear instancia de juego
    const game: ChessGame = {
      gameId,
      player1: dto.walletAddress,
      player2: dto.opponentAddress || 'WAITING', // Si no hay oponente, buscar uno
      wagerAmount: dto.wagerAmount,
      potAmount: dto.wagerAmount * 2, // Bote total
      currentTurn: 'white',
      boardState: chess.fen(),
      moveHistory: [],
      status: dto.opponentAddress ? GameStatus.WAITING : GameStatus.WAITING,
      startTime: Date.now(),
      lastMoveTime: Date.now(),
      nonce: 0,
    };

    // 5. Crear canal de estado
    const channel: GameChannel = {
      gameId,
      player1Balance: dto.wagerAmount,
      player2Balance: dto.opponentAddress ? dto.wagerAmount : 0,
      lockedAmount: dto.wagerAmount,
      nonce: 0,
      isOpen: false, // Se abrirá cuando se confirme el depósito en blockchain
    };

    // 6. Guardar en memoria
    this.activeGames.set(gameId, game);
    this.gameChannels.set(gameId, channel);
    this.addPlayerGame(dto.walletAddress, gameId);

    this.logger.log(`Game ${gameId} created successfully`);

    return {
      gameId,
      player1: game.player1,
      player2: game.player2,
      wagerAmount: game.wagerAmount,
      potAmount: game.potAmount,
      initialBoardState: game.boardState,
      channelStatus: 'opening',
      message: 'Game created. Waiting for blockchain confirmation...',
    };
  }

  /**
   * 👥 UNIR OPONENTE A PARTIDA
   */
  async joinGame(gameId: string, player2Address: string, signature: string): Promise<GameStartResponse> {
    const game = this.activeGames.get(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException('Game already started or finished');
    }

    // Verificar firma
    const message = `Join Chess Game ${gameId}`;
    const validation = await this.signatureService.verifySignature(message, signature);

    if (!validation.isValid || validation.recoveredAddress.toLowerCase() !== player2Address.toLowerCase()) {
      throw new BadRequestException('Invalid signature');
    }

    // Actualizar juego
    game.player2 = player2Address;
    game.status = GameStatus.ACTIVE;

    // Actualizar canal
    const channel = this.gameChannels.get(gameId);
    if (!channel) {
      throw new BadRequestException('Game channel not found');
    }
    
    channel.player2Balance = game.wagerAmount;
    channel.lockedAmount = game.wagerAmount * 2;
    channel.isOpen = true;

    this.addPlayerGame(player2Address, gameId);

    this.logger.log(`Player ${player2Address} joined game ${gameId}`);

    return {
      gameId,
      player1: game.player1,
      player2: game.player2,
      wagerAmount: game.wagerAmount,
      potAmount: game.potAmount,
      initialBoardState: game.boardState,
      channelStatus: 'active',
      message: 'Game started! Both players confirmed.',
    };
  }

  /**
   * ♟️ HACER MOVIMIENTO
   * Valida movimiento, firma y actualiza estado
   */
  async makeMove(dto: MakeMoveDto): Promise<MoveResponse> {
    const game = this.activeGames.get(dto.gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    if (game.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game is not active');
    }

    // 1. Verificar que es el turno del jugador
    const isPlayer1 = game.player1.toLowerCase() === dto.walletAddress.toLowerCase();
    const isPlayer2 = game.player2.toLowerCase() === dto.walletAddress.toLowerCase();

    if (!isPlayer1 && !isPlayer2) {
      throw new BadRequestException('You are not a player in this game');
    }

    const expectedTurn = game.currentTurn;
    const playerColor = isPlayer1 ? 'white' : 'black';

    if (playerColor !== expectedTurn) {
      throw new BadRequestException(`Not your turn. Current turn: ${expectedTurn}`);
    }

    // 2. Verificar nonce del state channel
    const channel = this.gameChannels.get(dto.gameId);
    if (!channel) {
      throw new BadRequestException('Game channel not found');
    }
    
    if (dto.nonce !== channel.nonce + 1) {
      throw new BadRequestException(`Invalid nonce. Expected ${channel.nonce + 1}, got ${dto.nonce}`);
    }

    // 3. Verificar firma ECDSA
    const message = `Move: ${dto.move} | Game: ${dto.gameId} | Nonce: ${dto.nonce}`;
    const validation = await this.signatureService.verifySignature(message, dto.signature);

    if (!validation.isValid || validation.recoveredAddress.toLowerCase() !== dto.walletAddress.toLowerCase()) {
      throw new BadRequestException('Invalid signature');
    }

    // 4. Validar movimiento con motor de ajedrez (chess.js)
    const chess = new Chess(game.boardState);
    let moveResult;

    try {
      moveResult = chess.move(dto.move);
    } catch (error) {
      throw new BadRequestException(`Illegal move: ${dto.move}`);
    }

    if (!moveResult) {
      throw new BadRequestException(`Invalid move: ${dto.move}`);
    }

    // 5. Actualizar estado del juego
    const newBoardState = chess.fen();
    const isCheck = chess.isCheck();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isDraw = chess.isDraw();

    const chessMove: ChessMove = {
      player: dto.walletAddress,
      move: dto.move,
      timestamp: Date.now(),
      nonce: dto.nonce,
      signature: dto.signature,
      boardStateAfter: newBoardState,
    };

    game.moveHistory.push(chessMove);
    game.boardState = newBoardState;
    game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';
    game.lastMoveTime = Date.now();
    game.nonce = dto.nonce;

    // Actualizar canal
    channel.nonce = dto.nonce;

    // 6. Verificar condiciones de fin de partida
    if (isCheckmate) {
      game.status = GameStatus.CHECKMATE;
      this.logger.log(`CHECKMATE in game ${dto.gameId}! Winner: ${dto.walletAddress}`);
    } else if (isStalemate) {
      game.status = GameStatus.STALEMATE;
    } else if (isDraw) {
      game.status = GameStatus.DRAW;
    }

    this.logger.log(`Move ${dto.move} applied in game ${dto.gameId}. Nonce: ${dto.nonce}`);

    return {
      success: true,
      gameId: dto.gameId,
      move: dto.move,
      newBoardState,
      isCheck,
      isCheckmate,
      nextTurn: game.currentTurn,
      nonce: dto.nonce,
    };
  }

  /**
   * 🏆 RECLAMAR VICTORIA
   */
  async claimVictory(dto: ClaimVictoryDto): Promise<any> {
    const game = this.activeGames.get(dto.gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    if (game.status !== GameStatus.CHECKMATE) {
      throw new BadRequestException('Game is not in checkmate state');
    }

    // Verificar que quien reclama es el ganador
    const lastMove = game.moveHistory[game.moveHistory.length - 1];
    if (lastMove.player.toLowerCase() !== dto.walletAddress.toLowerCase()) {
      throw new BadRequestException('You are not the winner');
    }

    // Verificar firma del estado final
    const message = `Claim Victory | Game: ${dto.gameId} | Nonce: ${game.nonce}`;
    const validation = await this.signatureService.verifySignature(message, dto.finalStateSignature);

    if (!validation.isValid) {
      throw new BadRequestException('Invalid final state signature');
    }

    this.logger.log(`Victory claimed in game ${dto.gameId} by ${dto.walletAddress}`);

    return {
      success: true,
      winner: dto.walletAddress,
      potAmount: game.potAmount,
      message: 'Victory verified. Preparing settlement...',
    };
  }

  /**
   * 🔍 OBTENER ESTADO DE PARTIDA
   */
  getGame(gameId: string): ChessGame {
    const game = this.activeGames.get(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    return game;
  }

  /**
   * 📊 OBTENER PARTIDAS ACTIVAS DE UN JUGADOR
   */
  getPlayerGames(walletAddress: string): ChessGame[] {
    const gameIds = this.playerGames.get(walletAddress.toLowerCase()) || [];
    return gameIds
      .map((id) => this.activeGames.get(id))
      .filter((game): game is ChessGame => game !== undefined);
  }

  /**
   * 🎲 GENERAR ID ÚNICO DE PARTIDA
   */
  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * 📝 REGISTRAR PARTIDA A JUGADOR
   */
  private addPlayerGame(walletAddress: string, gameId: string): void {
    const key = walletAddress.toLowerCase();
    const games = this.playerGames.get(key) || [];
    games.push(gameId);
    this.playerGames.set(key, games);
  }

  /**
   * 🔄 CONFIRMAR DEPÓSITO DE BLOCKCHAIN
   * Este método es llamado por el BlockchainListenerService
   */
  confirmWagerDeposit(gameId: string, player: string, txHash: string): void {
    const game = this.activeGames.get(gameId);
    const channel = this.gameChannels.get(gameId);

    if (game && channel) {
      channel.isOpen = true;
      this.logger.log(`Wager deposit confirmed for game ${gameId}. TxHash: ${txHash}`);
    }
  }
}

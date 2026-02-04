import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ChessService } from './chess.service';
import { StartGameDto, MakeMoveDto, ClaimVictoryDto } from './dto/chess.dto';

/**
 * 🎮 CONTROLADOR REST PARA AJEDREZ
 * Endpoints HTTP complementarios al WebSocket
 * Útiles para consultas y testing con Postman
 */
@Controller('chess')
export class ChessController {
  constructor(private readonly chessService: ChessService) {}

  /**
   * 📊 Obtener información de una partida
   * GET /chess/game/:gameId
   */
  @Get('game/:gameId')
  getGame(@Param('gameId') gameId: string) {
    return {
      success: true,
      data: this.chessService.getGame(gameId),
    };
  }

  /**
   * 📜 Obtener partidas de un jugador
   * GET /chess/player-games?address=0x...
   */
  @Get('player-games')
  getPlayerGames(@Query('address') walletAddress: string) {
    return {
      success: true,
      data: this.chessService.getPlayerGames(walletAddress),
    };
  }

  /**
   * 🎮 Crear partida (también disponible vía HTTP)
   * POST /chess/start
   */
  @Post('start')
  async startGame(@Body() dto: StartGameDto) {
    const result = await this.chessService.startGame(dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * ♟️ Hacer movimiento (también disponible vía HTTP)
   * POST /chess/move
   * NOTA: En producción, usar WebSocket para menor latencia
   */
  @Post('move')
  async makeMove(@Body() dto: MakeMoveDto) {
    const result = await this.chessService.makeMove(dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 🏆 Reclamar victoria
   * POST /chess/claim-victory
   */
  @Post('claim-victory')
  async claimVictory(@Body() dto: ClaimVictoryDto) {
    const result = await this.chessService.claimVictory(dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 💊 Health check
   * GET /chess/health
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'Chess Service',
      timestamp: new Date().toISOString(),
    };
  }
}

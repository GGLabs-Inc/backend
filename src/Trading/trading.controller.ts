import { Controller, Get, Post, Body, Query, Param, ValidationPipe, Logger } from '@nestjs/common';
import { TradingService } from './trading.service';
import {
  CreateOrderDto,
  CancelOrderDto,
  UpdatePositionDto,
  ClosePositionDto,
  DepositMarginDto,
  WithdrawMarginDto,
  GetOrdersDto,
  GetPositionsDto,
  GetOrderbookDto,
} from './dto/trading.dto';

/**
 * 🎮 CONTROLADOR REST DE TRADING
 * Endpoints HTTP para gestión de órdenes y posiciones
 */
@Controller('trading')
export class TradingController {
  private readonly logger = new Logger(TradingController.name);

  constructor(private readonly tradingService: TradingService) {}

  /**
   * ➕ CREAR ORDEN
   * POST /trading/orders
   */
  @Post('orders')
  async createOrder(@Body(ValidationPipe) dto: CreateOrderDto) {
    this.logger.log(`Creating order: ${dto.side} ${dto.size} USD ${dto.market}`);
    return await this.tradingService.createOrder(dto);
  }

  /**
   * ❌ CANCELAR ORDEN
   * POST /trading/orders/cancel
   */
  @Post('orders/cancel')
  async cancelOrder(@Body(ValidationPipe) dto: CancelOrderDto) {
    this.logger.log(`Cancelling order: ${dto.orderId}`);
    return await this.tradingService.cancelOrder(dto);
  }

  /**
   * 🔍 OBTENER ÓRDENES
   * GET /trading/orders?trader=0x...&market=BTC-USDC&activeOnly=true
   */
  @Get('orders')
  getOrders(@Query(ValidationPipe) query: GetOrdersDto) {
    return this.tradingService.getTraderOrders(
      query.trader,
      query.market,
      query.activeOnly,
    );
  }

  /**
   * 🔍 OBTENER ORDEN POR ID
   * GET /trading/orders/:orderId
   */
  @Get('orders/:orderId')
  getOrder(@Param('orderId') orderId: string) {
    return this.tradingService['orderbookService'].getOrder(orderId);
  }

  /**
   * 🔍 OBTENER POSICIONES
   * GET /trading/positions?trader=0x...&market=BTC-USDC
   */
  @Get('positions')
  getPositions(@Query(ValidationPipe) query: GetPositionsDto) {
    return this.tradingService.getTraderPositions(query.trader, query.market);
  }

  /**
   * 🔍 OBTENER POSICIÓN POR ID
   * GET /trading/positions/:positionId
   */
  @Get('positions/:positionId')
  getPosition(@Param('positionId') positionId: string) {
    return this.tradingService['positionService'].getPosition(positionId);
  }

  /**
   * 🔒 CERRAR POSICIÓN
   * POST /trading/positions/close
   */
  @Post('positions/close')
  async closePosition(@Body(ValidationPipe) dto: ClosePositionDto) {
    this.logger.log(`Closing position: ${dto.positionId}`);
    return await this.tradingService.closePosition(dto);
  }

  /**
   * ✏️ ACTUALIZAR POSICIÓN
   * POST /trading/positions/update
   */
  @Post('positions/update')
  async updatePosition(@Body(ValidationPipe) dto: UpdatePositionDto) {
    this.logger.log(`Updating position: ${dto.positionId}`);
    return await this.tradingService.updatePosition(dto);
  }

  /**
   * 💰 OBTENER BALANCE
   * GET /trading/balance/:trader
   */
  @Get('balance/:trader')
  getBalance(@Param('trader') trader: string) {
    return this.tradingService.getBalance(trader);
  }

  /**
   * 💰 DEPOSITAR MARGEN
   * POST /trading/deposit
   */
  @Post('deposit')
  async depositMargin(@Body(ValidationPipe) dto: DepositMarginDto) {
    this.logger.log(`Deposit: ${dto.trader} +${dto.amount} USDC`);
    return await this.tradingService.depositMargin(dto);
  }

  /**
   * 💸 RETIRAR MARGEN
   * POST /trading/withdraw
   */
  @Post('withdraw')
  async withdrawMargin(@Body(ValidationPipe) dto: WithdrawMarginDto) {
    this.logger.log(`Withdraw: ${dto.trader} -${dto.amount} USDC`);
    return await this.tradingService.withdrawMargin(dto);
  }

  /**
   * 📊 OBTENER ORDERBOOK
   * GET /trading/orderbook?market=BTC-USDC&depth=20
   */
  @Get('orderbook')
  getOrderbook(@Query(ValidationPipe) query: GetOrderbookDto) {
    return this.tradingService.getOrderbook(query.market, query.depth || 20);
  }

  /**
   * 📈 OBTENER DATOS DE MERCADO
   * GET /trading/market/:market
   */
  @Get('market/:market')
  getMarketData(@Param('market') market: string) {
    return this.tradingService.getMarketData(market);
  }

  /**
   * 📋 OBTENER TODOS LOS MERCADOS
   * GET /trading/markets
   */
  @Get('markets')
  getAllMarkets() {
    return this.tradingService.getAllMarkets();
  }

  /**
   * 💰 OBTENER TRADES RECIENTES
   * GET /trading/trades/:market?limit=50
   */
  @Get('trades/:market')
  getRecentTrades(
    @Param('market') market: string,
    @Query('limit') limit?: number,
  ) {
    return this.tradingService.getRecentTrades(market, limit || 50);
  }

  /**
   * ❤️ HEALTH CHECK
   * GET /trading/health
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'trading',
      timestamp: new Date().toISOString(),
      markets: ['BTC-USDC', 'ETH-USDC', 'SOL-USDC', 'ARB-USDC', 'OP-USDC'],
    };
  }
}

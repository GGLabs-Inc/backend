import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OrderbookService } from './services/orderbook.service';
import { PositionService } from './services/position.service';
import { LiquidationService } from './services/liquidation.service';
import { PriceFeedService } from './services/price-feed.service';
import { SignatureService } from './services/signature.service';
import {
  CreateOrderDto,
  CancelOrderDto,
  UpdatePositionDto,
  ClosePositionDto,
  DepositMarginDto,
  WithdrawMarginDto,
} from './dto/trading.dto';
import { Order, Position, Trade, TraderBalance } from './interfaces/trading.interface';
import { TRADING_CONFIG } from './config/trading.config';

/**
 * 📈 SERVICIO PRINCIPAL DE TRADING
 * Orquesta todas las operaciones del DEX
 */
@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    private readonly orderbookService: OrderbookService,
    private readonly positionService: PositionService,
    private readonly liquidationService: LiquidationService,
    private readonly priceFeedService: PriceFeedService,
    private readonly signatureService: SignatureService,
  ) {}

  /**
   * ➕ CREAR ORDEN
   */
  async createOrder(dto: CreateOrderDto): Promise<{ order: Order; trades: Trade[] }> {
    // 🔐 Verificar firma
    const signatureValid = this.signatureService.verifyOrderSignature(
      `order_${Date.now()}`,
      dto.trader,
      dto.market,
      dto.side,
      dto.size,
      dto.price,
      dto.leverage,
      dto.signature,
    );

    if (!signatureValid) {
      throw new BadRequestException('Invalid signature');
    }

    // ✅ Validar límites
    this.validateOrderLimits(dto);

    // 💰 Verificar balance
    const margin = dto.size / dto.leverage;
    const balance = this.positionService.getBalance(dto.trader);
    
    if (balance.availableBalance < margin) {
      throw new BadRequestException('Insufficient balance');
    }

    // 📊 Obtener precio actual
    const currentPrice = this.priceFeedService.getPrice(dto.market);
    
    // 🆕 Crear orden
    const order: Order = {
      orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trader: dto.trader,
      market: dto.market,
      side: dto.side,
      type: dto.type,
      size: dto.size,
      price: dto.price,
      triggerPrice: dto.triggerPrice,
      leverage: dto.leverage,
      marginType: dto.marginType,
      status: 'PENDING',
      filledSize: 0,
      remainingSize: dto.size,
      fee: 0,
      signature: dto.signature,
      timestamp: Date.now(),
      expiresAt: dto.expiresAt,
    };

    // 📚 Agregar al orderbook y ejecutar matches
    const trades = this.orderbookService.addOrder(order);

    // 💼 Si se ejecutó, abrir/modificar posiciones
    if (trades.length > 0) {
      await this.handleTrades(order, trades);
    }

    this.logger.log(`Order created: ${order.orderId} - ${dto.side} ${dto.size} USD ${dto.market}`);

    return { order, trades };
  }

  /**
   * ❌ CANCELAR ORDEN
   */
  async cancelOrder(dto: CancelOrderDto): Promise<boolean> {
    const order = this.orderbookService.getOrder(dto.orderId);
    
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.trader.toLowerCase() !== dto.trader.toLowerCase()) {
      throw new BadRequestException('Unauthorized');
    }

    // Verificar firma
    const signatureValid = this.signatureService.verifyCancelSignature(
      dto.orderId,
      dto.trader,
      dto.signature,
    );

    if (!signatureValid) {
      throw new BadRequestException('Invalid signature');
    }

    return this.orderbookService.cancelOrder(dto.orderId);
  }

  /**
   * 🔒 CERRAR POSICIÓN
   */
  async closePosition(dto: ClosePositionDto): Promise<Position> {
    const position = this.positionService.getPosition(dto.positionId);
    
    if (!position) {
      throw new BadRequestException('Position not found');
    }

    if (position.trader.toLowerCase() !== dto.trader.toLowerCase()) {
      throw new BadRequestException('Unauthorized');
    }

    // Verificar firma
    const signatureValid = this.signatureService.verifyCancelSignature(
      dto.positionId,
      dto.trader,
      dto.signature,
    );

    if (!signatureValid) {
      throw new BadRequestException('Invalid signature');
    }

    // Obtener precio actual
    const currentPrice = this.priceFeedService.getPrice(position.market);
    
    // Cerrar posición
    const percentage = dto.percentage || 100;
    return this.positionService.closePosition(dto.positionId, currentPrice, percentage);
  }

  /**
   * ✏️ ACTUALIZAR LÍMITES DE POSICIÓN
   */
  async updatePosition(dto: UpdatePositionDto): Promise<Position> {
    const position = this.positionService.getPosition(dto.positionId);
    
    if (!position) {
      throw new BadRequestException('Position not found');
    }

    if (position.trader.toLowerCase() !== dto.trader.toLowerCase()) {
      throw new BadRequestException('Unauthorized');
    }

    return this.positionService.updatePositionLimits(
      dto.positionId,
      dto.stopLoss,
      dto.takeProfit,
    );
  }

  /**
   * 💰 DEPOSITAR MARGEN
   */
  async depositMargin(dto: DepositMarginDto): Promise<TraderBalance> {
    // TODO: Verificar transacción on-chain con txHash
    // Por ahora, confiar en la firma
    
    return this.positionService.depositMargin(dto.trader, dto.amount);
  }

  /**
   * 💸 RETIRAR MARGEN
   */
  async withdrawMargin(dto: WithdrawMarginDto): Promise<TraderBalance> {
    const signatureValid = this.signatureService.verifyWithdrawSignature(
      dto.trader,
      dto.amount,
      Date.now(),
      dto.signature,
    );

    if (!signatureValid) {
      throw new BadRequestException('Invalid signature');
    }

    return this.positionService.withdrawMargin(dto.trader, dto.amount);
  }

  /**
   * 🤝 MANEJAR TRADES EJECUTADOS
   */
  private async handleTrades(order: Order, trades: Trade[]) {
    for (const trade of trades) {
      // Calcular tamaño ejecutado
      const executedSize = trade.size;
      const executedPrice = trade.price;

      // Buscar posición existente en el mismo mercado
      const existingPositions = this.positionService.getTraderPositions(order.trader, order.market);
      const oppositePosition = existingPositions.find(pos => pos.side !== order.side);

      if (oppositePosition) {
        // Cerrar o reducir posición opuesta
        const closePercentage = Math.min(100, (executedSize / oppositePosition.size) * 100);
        this.positionService.closePosition(oppositePosition.positionId, executedPrice, closePercentage);
      } else {
        // Abrir nueva posición o aumentar existente
        this.positionService.openPosition(
          order.trader,
          order.market,
          order.side,
          executedSize,
          executedPrice,
          order.leverage,
          order.marginType,
        );
      }
    }
  }

  /**
   * ✅ VALIDAR LÍMITES DE ORDEN
   */
  private validateOrderLimits(dto: CreateOrderDto) {
    const marketConfig = TRADING_CONFIG.MARKETS.find(m => m.symbol === dto.market);
    
    if (!marketConfig) {
      throw new BadRequestException('Market not supported');
    }

    if (dto.size < TRADING_CONFIG.MIN_ORDER_SIZE) {
      throw new BadRequestException(`Minimum order size: $${TRADING_CONFIG.MIN_ORDER_SIZE}`);
    }

    if (dto.size > TRADING_CONFIG.MAX_ORDER_SIZE) {
      throw new BadRequestException(`Maximum order size: $${TRADING_CONFIG.MAX_ORDER_SIZE}`);
    }

    if (dto.leverage > marketConfig.maxLeverage) {
      throw new BadRequestException(`Maximum leverage for ${dto.market}: ${marketConfig.maxLeverage}x`);
    }

    // Validar que órdenes LIMIT tengan precio
    if (dto.type === 'LIMIT' && !dto.price) {
      throw new BadRequestException('LIMIT orders require a price');
    }

    // Validar órdenes STOP_LOSS/TAKE_PROFIT
    if ((dto.type === 'STOP_LOSS' || dto.type === 'TAKE_PROFIT') && !dto.triggerPrice) {
      throw new BadRequestException('Stop orders require a trigger price');
    }
  }

  /**
   * 🔍 OBTENER ÓRDENES DE UN TRADER
   */
  getTraderOrders(trader: string, market?: string, activeOnly: boolean = false): Order[] {
    return this.orderbookService.getTraderOrders(trader, market, activeOnly);
  }

  /**
   * 🔍 OBTENER POSICIONES DE UN TRADER
   */
  getTraderPositions(trader: string, market?: string): Position[] {
    return this.positionService.getTraderPositions(trader, market);
  }

  /**
   * 💰 OBTENER BALANCE
   */
  getBalance(trader: string): TraderBalance {
    return this.positionService.getBalance(trader);
  }

  /**
   * 📊 OBTENER LIBRO DE ÓRDENES
   */
  getOrderbook(market: string, depth: number = 20) {
    return this.orderbookService.getOrderbook(market, depth);
  }

  /**
   * 📈 OBTENER DATOS DE MERCADO
   */
  getMarketData(market: string) {
    return this.priceFeedService.getMarketData(market);
  }

  /**
   * 📋 OBTENER TODOS LOS MERCADOS
   */
  getAllMarkets() {
    return this.priceFeedService.getAllMarkets();
  }

  /**
   * 📈 OBTENER TRADES RECIENTES
   */
  getRecentTrades(market: string, limit: number = 50) {
    return this.orderbookService.getRecentTrades(market, limit);
  }
}

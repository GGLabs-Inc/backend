import { Injectable, Logger } from '@nestjs/common';
import { Position, TraderBalance, TradingChannel } from '../interfaces/trading.interface';
import { TRADING_CONFIG } from '../config/trading.config';

/**
 * 💼 SERVICIO DE GESTIÓN DE POSICIONES
 * Maneja posiciones abiertas, PnL, y márgenes
 */
@Injectable()
export class PositionService {
  private readonly logger = new Logger(PositionService.name);

  // 💼 Posiciones activas por ID
  private positions: Map<string, Position> = new Map();
  
  // 💰 Balances de traders
  private balances: Map<string, TraderBalance> = new Map();
  
  // 📋 Canales de estado por trader
  private channels: Map<string, TradingChannel> = new Map();

  /**
   * 🆕 ABRIR POSICIÓN
   */
  openPosition(
    trader: string,
    market: string,
    side: 'LONG' | 'SHORT',
    size: number,
    entryPrice: number,
    leverage: number,
    marginType: 'ISOLATED' | 'CROSS',
  ): Position {
    // Calcular margen requerido
    const margin = size / leverage;
    
    // Verificar balance disponible
    const balance = this.getBalance(trader);
    if (balance.availableBalance < margin) {
      throw new Error('Insufficient balance');
    }

    // Calcular precio de liquidación
    const liquidationPrice = this.calculateLiquidationPrice(
      side,
      entryPrice,
      leverage,
      marginType,
    );

    // Crear posición
    const position: Position = {
      positionId: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trader,
      market,
      side,
      size,
      entryPrice,
      currentPrice: entryPrice,
      leverage,
      marginType,
      margin,
      pnl: 0,
      pnlPercentage: 0,
      liquidationPrice,
      fee: size * TRADING_CONFIG.TAKER_FEE,
      fundingRate: 0,
      timestamp: Date.now(),
    };

    this.positions.set(position.positionId, position);

    // Actualizar balance
    balance.usedMargin += margin;
    balance.availableBalance -= margin;
    this.balances.set(trader, balance);

    this.logger.log(`Position opened: ${position.positionId} - ${side} ${size} USD @ $${entryPrice}`);
    return position;
  }

  /**
   * 🔒 CERRAR POSICIÓN
   */
  closePosition(positionId: string, exitPrice: number, percentage: number = 100): Position {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error('Position not found');
    }

    // Calcular PnL realizado
    const closingSize = (position.size * percentage) / 100;
    const pnl = this.calculatePnL(position, exitPrice) * (percentage / 100);
    
    // Calcular fee de cierre
    const closeFee = closingSize * TRADING_CONFIG.TAKER_FEE;

    // Actualizar balance
    const balance = this.getBalance(position.trader);
    const releasedMargin = (position.margin * percentage) / 100;
    
    balance.usedMargin -= releasedMargin;
    balance.availableBalance += releasedMargin + pnl - closeFee;
    balance.totalPnl += pnl;
    this.balances.set(position.trader, balance);

    // Si es cierre parcial, actualizar posición
    if (percentage < 100) {
      position.size = position.size * (1 - percentage / 100);
      position.margin = position.margin * (1 - percentage / 100);
      this.positions.set(positionId, position);
      
      this.logger.log(`Position partially closed: ${positionId} - ${percentage}% at $${exitPrice}, PnL: ${pnl}`);
    } else {
      // Cierre total
      this.positions.delete(positionId);
      this.logger.log(`Position fully closed: ${positionId} at $${exitPrice}, PnL: ${pnl}`);
    }

    return position;
  }

  /**
   * 📊 ACTUALIZAR PRECIO ACTUAL DE POSICIÓN
   */
  updatePositionPrice(positionId: string, currentPrice: number) {
    const position = this.positions.get(positionId);
    if (!position) return;

    position.currentPrice = currentPrice;
    position.pnl = this.calculatePnL(position, currentPrice);
    position.pnlPercentage = (position.pnl / position.margin) * 100;

    this.positions.set(positionId, position);
  }

  /**
   * 💰 CALCULAR PNL (PROFIT AND LOSS)
   */
  private calculatePnL(position: Position, currentPrice: number): number {
    const priceChange = currentPrice - position.entryPrice;
    const multiplier = position.side === 'LONG' ? 1 : -1;
    return(priceChange * multiplier * position.size) / position.entryPrice;
  }

  /**
   * ⚠️ CALCULAR PRECIO DE LIQUIDACIÓN
   */
  private calculateLiquidationPrice(
    side: 'LONG' | 'SHORT',
    entryPrice: number,
    leverage: number,
    marginType: 'ISOLATED' | 'CROSS',
  ): number {
    const maintenanceMargin = TRADING_CONFIG.MAINTENANCE_MARGIN_RATIO;
    const liquidationBuffer = TRADING_CONFIG.LIQUIDATION_BUFFER;
    
    // Para margen aislado
    const liqPercentage = (1 / leverage) - maintenanceMargin - liquidationBuffer;

    if (side === 'LONG') {
      return entryPrice * (1 - liqPercentage);
    } else {
      return entryPrice * (1 + liqPercentage);
    }
  }

  /**
   * ✏️ ACTUALIZAR STOP LOSS / TAKE PROFIT
   */
  updatePositionLimits(positionId: string, stopLoss?: number, takeProfit?: number): Position {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error('Position not found');
    }

    if (stopLoss !== undefined) {
      position.stopLoss = stopLoss;
    }
    if (takeProfit !== undefined) {
      position.takeProfit = takeProfit;
    }

    this.positions.set(positionId, position);
    return position;
  }

  /**
   * 🔍 OBTENER POSICIÓN
   */
  getPosition(positionId: string): Position | null {
    return this.positions.get(positionId) || null;
  }

  /**
   * 🔍 OBTENER POSICIONES DE UN TRADER
   */
  getTraderPositions(trader: string, market?: string): Position[] {
    return Array.from(this.positions.values()).filter(pos => {
      if (pos.trader.toLowerCase() !== trader.toLowerCase()) return false;
      if (market && pos.market !== market) return false;
      return true;
    });
  }

  /**
   * 💰 OBTENER BALANCE
   */
  getBalance(trader: string): TraderBalance {
    let balance = this.balances.get(trader.toLowerCase());
    
    if (!balance) {
      balance = {
        trader,
        totalBalance: 0,
        availableBalance: 0,
        usedMargin: 0,
        unrealizedPnl: 0,
        totalPnl: 0,
      };
      this.balances.set(trader.toLowerCase(), balance);
    }

    // Actualizar PnL no realizado
    const positions = this.getTraderPositions(trader);
    balance.unrealizedPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);

    return balance;
  }

  /**
   * 💰 DEPOSITAR MARGEN
   */
  depositMargin(trader: string, amount: number): TraderBalance {
    const balance = this.getBalance(trader);
    balance.totalBalance += amount;
    balance.availableBalance += amount;
    
    this.balances.set(trader.toLowerCase(), balance);
    this.logger.log(`Margin deposited: ${trader} +${amount} USDC`);
    
    return balance;
  }

  /**
   * 💸 RETIRAR MARGEN
   */
  withdrawMargin(trader: string, amount: number): TraderBalance {
    const balance = this.getBalance(trader);
    
    if (balance.availableBalance < amount) {
      throw new Error('Insufficient available balance');
    }

    balance.totalBalance -= amount;
    balance.availableBalance -= amount;
    
    this.balances.set(trader.toLowerCase(), balance);
    this.logger.log(`Margin withdrawn: ${trader} -${amount} USDC`);
    
    return balance;
  }

  /**
   * 📋 OBTENER/CREAR CANAL DE ESTADO
   */
  getOrCreateChannel(trader: string): TradingChannel {
    let channel = this.channels.get(trader.toLowerCase());
    
    if (!channel) {
      const balance = this.getBalance(trader);
      channel = {
        channelId: `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        trader,
        nonce: 0,
        balance: balance.totalBalance,
        positions: [],
        lastUpdate: Date.now(),
        isActive: true,
      };
      this.channels.set(trader.toLowerCase(), channel);
    }

    return channel;
  }

  /**
   * 🔄 ACTUALIZAR CANAL
   */
  updateChannel(trader: string, nonce: number) {
    const channel = this.getOrCreateChannel(trader);
    const balance = this.getBalance(trader);
    const positions = this.getTraderPositions(trader);

    channel.nonce = nonce;
    channel.balance = balance.totalBalance;
    channel.positions = positions;
    channel.lastUpdate = Date.now();

    this.channels.set(trader.toLowerCase(), channel);
  }
}

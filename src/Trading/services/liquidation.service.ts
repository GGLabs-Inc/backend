import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PositionService } from './position.service';
import { Position, Liquidation } from '../interfaces/trading.interface';
import { TRADING_CONFIG } from '../config/trading.config';

/**
 * ⚠️ SERVICIO DE LIQUIDACIONES
 * Monitor de posiciones en riesgo y ejecutor de liquidaciones
 */
@Injectable()
export class LiquidationService implements OnModuleInit {
  private readonly logger = new Logger(LiquidationService.name);
  private liquidationCheckInterval: NodeJS.Timeout | null = null;
  
  // 📊 Historial de liquidaciones
  private liquidations: Liquidation[] = [];

  constructor(private readonly positionService: PositionService) {}

  /**
   * 🚀 INICIAR MONITOR DE LIQUIDACIONES
   */
  onModuleInit() {
    this.startLiquidationMonitor();
  }

  /**
   * 👀 MONITOREAR POSICIONES EN RIESGO
   */
  private startLiquidationMonitor() {
    this.liquidationCheckInterval = setInterval(() => {
      this.checkAllPositions();
    }, TRADING_CONFIG.LIQUIDATION_CHECK_INTERVAL);

    this.logger.log('✅ Liquidation monitor started');
  }

  /**
   * 🔍 VERIFICAR TODAS LAS POSICIONES
   */
  private checkAllPositions() {
    // Obtener todas las posiciones activas
    const allPositions: Position[] = [];
    
    // En este caso, necesitamos iterar sobre todos los traders
    // En producción, usar una base de datos para consultas eficientes
    
    allPositions.forEach(position => {
      if (this.shouldLiquidate(position)) {
        this.liquidatePosition(position);
      }
    });
  }

  /**
   * ⚠️ VERIFICAR SI DEBE LIQUIDARSE
   */
  shouldLiquidate(position: Position): boolean {
    const { currentPrice, liquidationPrice, side } = position;

    if (side === 'LONG') {
      // Liquidar si el precio cae por debajo del precio de liquidación
      return currentPrice <= liquidationPrice;
    } else {
      // Liquidar si el precio sube por encima del precio de liquidación
      return currentPrice >= liquidationPrice;
    }
  }

  /**
   * 💥 LIQUIDAR POSICIÓN
   */
  liquidatePosition(position: Position): Liquidation {
    this.logger.warn(`🚨 LIQUIDATING POSITION: ${position.positionId}`);
    this.logger.warn(`  Trader: ${position.trader}`);
    this.logger.warn(`  Market: ${position.market}`);
    this.logger.warn(`  Side: ${position.side}`);
    this.logger.warn(`  Entry: $${position.entryPrice}`);
    this.logger.warn(`  Liquidation: $${position.liquidationPrice}`);
    this.logger.warn(`  Current: $${position.currentPrice}`);

    // Calcular pérdida
    const loss = Math.abs(position.pnl) + (position.size * TRADING_CONFIG.LIQUIDATION_FEE);

    // Cerrar posición al precio actual
    this.positionService.closePosition(position.positionId, position.currentPrice, 100);

    // Registrar liquidación
    const liquidation: Liquidation = {
      liquidationId: `liq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      positionId: position.positionId,
      trader: position.trader,
      market: position.market,
      side: position.side,
      size: position.size,
      entryPrice: position.entryPrice,
      liquidationPrice: position.liquidationPrice,
      actualPrice: position.currentPrice,
      loss,
      timestamp: Date.now(),
    };

    this.liquidations.push(liquidation);

    this.logger.warn(`💰 Liquidation executed. Loss: ${loss} USDC`);
    
    return liquidation;
  }

  /**
   * 🔍 OBTENER HISTORIAL DE LIQUIDACIONES
   */
  getLiquidations(trader?: string, limit: number = 50): Liquidation[] {
    let result = this.liquidations;

    if (trader) {
      result = result.filter(liq => liq.trader.toLowerCase() === trader.toLowerCase());
    }

    return result.slice(-limit).reverse();
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DE LIQUIDACIONES
   */
  getLiquidationStats(market?: string) {
    let filtered = this.liquidations;
    
    if (market) {
      filtered = filtered.filter(liq => liq.market === market);
    }

    const totalLiquidations = filtered.length;
    const totalLoss = filtered.reduce((sum, liq) => sum + liq.loss, 0);
    const avgLoss = totalLiquidations > 0 ? totalLoss / totalLiquidations : 0;

    const longLiquidations = filtered.filter(liq => liq.side === 'LONG').length;
    const shortLiquidations = filtered.filter(liq => liq.side === 'SHORT').length;

    return {
      totalLiquidations,
      totalLoss,
      avgLoss,
      longLiquidations,
      shortLiquidations,
      market: market || 'ALL',
    };
  }

  /**
   * 🛑 DETENER MONITOR
   */
  stopLiquidationMonitor() {
    if (this.liquidationCheckInterval) {
      clearInterval(this.liquidationCheckInterval);
      this.liquidationCheckInterval = null;
      this.logger.log('Liquidation monitor stopped');
    }
  }
}

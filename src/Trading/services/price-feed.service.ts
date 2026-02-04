import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MarketData } from '../interfaces/trading.interface';
import { TRADING_CONFIG } from '../config/trading.config';

/**
 * 📈 SERVICIO DE FEED DE PRECIOS
 * Obtiene precios en tiempo real de oráculos externos
 */
@Injectable()
export class PriceFeedService implements OnModuleInit {
  private readonly logger = new Logger(PriceFeedService.name);
  
  // 💾 Caché de precios actuales
  private prices: Map<string, number> = new Map();
  
  // 📊 Datos de mercado
  private marketData: Map<string, MarketData> = new Map();
  
  // ⏱️ Intervalo de actualización
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  /**
   * 🚀 INICIAR FEED AL ARRANCAR
   */
  onModuleInit() {
    this.initializeMarketData();
    this.startPriceFeed();
  }

  /**
   * 📊 INICIALIZAR DATOS DE MERCADO
   */
  private initializeMarketData() {
    TRADING_CONFIG.MARKETS.forEach(market => {
      this.marketData.set(market.symbol, {
        market: market.symbol,
        price: 0,
        change24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        fundingRate: 0,
        openInterest: 0,
        indexPrice: 0,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * 🔄 INICIAR ACTUALIZACIÓN DE PRECIOS
   */
  private startPriceFeed() {
    // Actualizar precios inmediatamente
    this.updateAllPrices();

    // Programar actualizaciones periódicas
    this.priceUpdateInterval = setInterval(() => {
      this.updateAllPrices();
    }, TRADING_CONFIG.PRICE_UPDATE_INTERVAL);

    this.logger.log('✅ Price feed started');
  }

  /**
   * 🔄 ACTUALIZAR TODOS LOS PRECIOS
   */
  private async updateAllPrices() {
    for (const market of TRADING_CONFIG.MARKETS) {
      try {
        const price = await this.fetchPrice(market.symbol);
        this.updatePrice(market.symbol, price);
      } catch (error) {
        this.logger.error(`Failed to update price for ${market.symbol}: ${error.message}`);
      }
    }
  }

  /**
   * 🌐 OBTENER PRECIO DE ORÁCULO EXTERNO
   */
  private async fetchPrice(market: string): Promise<number> {
    const oracleUrl = TRADING_CONFIG.PRICE_ORACLES[market];
    
    if (!oracleUrl) {
      // Si no hay oráculo configurado, simular precio
      return this.simulatePrice(market);
    }

    try {
      const response = await fetch(oracleUrl);
      const data = await response.json();
      
      // Parsear respuesta de Binance API
      return parseFloat(data.price);
    } catch (error) {
      this.logger.warn(`Oracle fetch failed for ${market}, using simulated price`);
      return this.simulatePrice(market);
    }
  }

  /**
   * 🎲 SIMULAR PRECIO (MOCK para desarrollo)
   */
  private simulatePrice(market: string): number {
    const currentPrice = this.prices.get(market);
    
    // Precios base iniciales
    const basePrices: Record<string, number> = {
      'BTC-USDC': 45000,
      'ETH-USDC': 2500,
      'SOL-USDC': 100,
      'ARB-USDC': 1.5,
      'OP-USDC': 2.0,
    };

    if (!currentPrice) {
      return basePrices[market] || 1000;
    }

    // Simular volatilidad realista (±0.1% por tick)
    const change = (Math.random() - 0.5) * 0.002;
    return currentPrice * (1 + change);
  }

  /**
   * 💾 ACTUALIZAR PRECIO EN CACHÉ
   */
  private updatePrice(market: string, price: number) {
    const oldPrice = this.prices.get(market) || price;
    this.prices.set(market, price);

    // Actualizar datos de mercado
    const data = this.marketData.get(market);
    if (data) {
      data.price = price;
      data.indexPrice = price; // En producción, usar oráculo separado
      data.change24h = ((price - oldPrice) / oldPrice) * 100;
      data.high24h = Math.max(data.high24h, price);
      data.low24h = Math.min(data.low24h || price, price);
      data.timestamp = Date.now();
      
      this.marketData.set(market, data);
    }
  }

  /**
   * 💵 OBTENER PRECIO ACTUAL
   */
  getPrice(market: string): number {
    return this.prices.get(market) || 0;
  }

  /**
   * 📊 OBTENER DATOS DE MERCADO
   */
  getMarketData(market: string): MarketData | null {
    return this.marketData.get(market) || null;
  }

  /**
   * 📋 OBTENER TODOS LOS MERCADOS
   */
  getAllMarkets(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  /**
   * 🎯 SUSCRIBIRSE A ACTUALIZACIONES (para WebSocket)
   */
  onPriceUpdate(callback: (market: string, price: number) => void) {
    // En producción, implementar patrón Observer
    // Por ahora, los consumidores pueden polling getPrice()
  }

  /**
   * 🛑 DETENER FEED
   */
  stopPriceFeed() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
      this.logger.log('Price feed stopped');
    }
  }
}

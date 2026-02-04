import { Injectable, Logger } from '@nestjs/common';
import { Order, Orderbook, OrderbookLevel, Trade } from '../interfaces/trading.interface';
import { TRADING_CONFIG } from '../config/trading.config';

/**
 * 📚 SERVICIO DE LIBRO DE ÓRDENES
 * Gestiona el orderbook off-chain con matching en memoria
 */
@Injectable()
export class OrderbookService {
  private readonly logger = new Logger(OrderbookService.name);

  // 📊 Libros de órdenes por mercado
  private orderbooks: Map<string, Orderbook> = new Map();
  
  // 📝 Órdenes activas por ID
  private orders: Map<string, Order> = new Map();
  
  // 📈 Historial de trades
  private trades: Trade[] = [];

  constructor() {
    // Inicializar orderbooks para cada mercado
    TRADING_CONFIG.MARKETS.forEach(market => {
      this.orderbooks.set(market.symbol, {
        market: market.symbol,
        bids: [],
        asks: [],
        lastPrice: 0,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * ➕ AGREGAR ORDEN AL LIBRO
   */
  addOrder(order: Order): Trade[] {
    this.orders.set(order.orderId, order);

    // Si es orden de mercado, ejecutar inmediatamente
    if (order.type === 'MARKET') {
      return this.executeMarketOrder(order);
    }

    // Si es orden límite, agregar al libro
    const orderbook = this.orderbooks.get(order.market);
    if (!orderbook) {
      this.logger.error(`Market ${order.market} not found`);
      return [];
    }

    // Intentar match con órdenes existentes
    const trades = this.matchOrder(order, orderbook);

    // Si la orden no se llenó completamente, agregarla al libro
    if (order.remainingSize > 0 && order.type === 'LIMIT') {
      this.addToOrderbook(order, orderbook);
    }

    return trades;
  }

  /**
   * ❌ CANCELAR ORDEN
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    // Remover del libro
    const orderbook = this.orderbooks.get(order.market);
    if (orderbook) {
      this.removeFromOrderbook(order, orderbook);
    }

    // Actualizar estado
    order.status = 'CANCELLED';
    this.orders.set(orderId, order);

    this.logger.log(`Order ${orderId} cancelled`);
    return true;
  }

  /**
   * 🔍 OBTENER LIBRO DE ÓRDENES
   */
  getOrderbook(market: string, depth: number = 20): Orderbook | null {
    const orderbook = this.orderbooks.get(market);
    if (!orderbook) {
      return null;
    }

    // Limitar profundidad
    return {
      ...orderbook,
      bids: orderbook.bids.slice(0, depth),
      asks: orderbook.asks.slice(0, depth),
    };
  }

  /**
   * 🔍 OBTENER ORDEN POR ID
   */
  getOrder(orderId: string): Order | null {
    return this.orders.get(orderId) || null;
  }

  /**
   * 🔍 OBTENER ÓRDENES DE UN TRADER
   */
  getTraderOrders(trader: string, market?: string, activeOnly: boolean = false): Order[] {
    const orders = Array.from(this.orders.values()).filter(order => {
      if (order.trader.toLowerCase() !== trader.toLowerCase()) return false;
      if (market && order.market !== market) return false;
      if (activeOnly && !['PENDING', 'OPEN', 'PARTIALLY_FILLED'].includes(order.status)) return false;
      return true;
    });

    return orders;
  }

  /**
   * 📈 OBTENER TRADES RECIENTES
   */
  getRecentTrades(market: string, limit: number = 50): Trade[] {
    return this.trades
      .filter(trade => trade.market === market)
      .slice(-limit)
      .reverse();
  }

  /**
   * 🎯 MATCHING DE ÓRDENES
   */
  private matchOrder(order: Order, orderbook: Orderbook): Trade[] {
    const trades: Trade[] = [];
    const oppositeBook = order.side === 'LONG' ? orderbook.asks : orderbook.bids;

    for (const level of oppositeBook) {
      if (order.remainingSize <= 0) break;

      // Verificar si hay match de precio
      const hasMatch = order.side === 'LONG' 
        ? order.price === undefined || level.price <= order.price
        : order.price === undefined || level.price >= order.price;

      if (!hasMatch) break;

      // Ejecutar trade
      const tradeSize = Math.min(order.remainingSize, level.size);
      const trade = this.executeTrade(order, level.price, tradeSize);
      trades.push(trade);

      // Actualizar orden
      order.filledSize += tradeSize;
      order.remainingSize -= tradeSize;
      order.status = order.remainingSize > 0 ? 'PARTIALLY_FILLED' : 'FILLED';

      // Actualizar nivel del libro
      level.size -= tradeSize;
      if (level.size <= 0) {
        oppositeBook.shift(); // Remover nivel vacío
      }
    }

    orderbook.timestamp = Date.now();
    return trades;
  }

  /**
   * 💰 EJECUTAR ORDEN DE MERCADO
   */
  private executeMarketOrder(order: Order): Trade[] {
    const orderbook = this.orderbooks.get(order.market);
    if (!orderbook) return [];

    return this.matchOrder(order, orderbook);
  }

  /**
   * 🤝 EJECUTAR TRADE
   */
  private executeTrade(order: Order, price: number, size: number): Trade {
    const trade: Trade = {
      tradeId: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      market: order.market,
      price,
      size,
      side: order.side,
      buyOrderId: order.side === 'LONG' ? order.orderId : 'matched',
      sellOrderId: order.side === 'SHORT' ? order.orderId : 'matched',
      buyer: order.side === 'LONG' ? order.trader : 'matched_trader',
      seller: order.side === 'SHORT' ? order.trader : 'matched_trader',
      fee: size * TRADING_CONFIG.TAKER_FEE,
      timestamp: Date.now(),
    };

    this.trades.push(trade);
    this.logger.log(`Trade executed: ${trade.tradeId} - ${size} USD @ $${price}`);

    // Actualizar último precio
    const orderbook = this.orderbooks.get(order.market);
    if (orderbook) {
      orderbook.lastPrice = price;
    }

    return trade;
  }

  /**
   * 📊 AGREGAR ORDEN AL LIBRO
   */
  private addToOrderbook(order: Order, orderbook: Orderbook) {
    const book = order.side === 'LONG' ? orderbook.bids : orderbook.asks;
    const price = order.price!;

    // Buscar nivel de precio existente
    let level = book.find(l => l.price === price);
    
    if (level) {
      level.size += order.remainingSize;
      level.orders += 1;
    } else {
      level = {
        price,
        size: order.remainingSize,
        orders: 1,
      };
      book.push(level);
    }

    // Ordenar libro (bids descendente, asks ascendente)
    if (order.side === 'LONG') {
      book.sort((a, b) => b.price - a.price);
    } else {
      book.sort((a, b) => a.price - b.price);
    }

    order.status = 'OPEN';
  }

  /**
   * 🗑️ REMOVER ORDEN DEL LIBRO
   */
  private removeFromOrderbook(order: Order, orderbook: Orderbook) {
    const book = order.side === 'LONG' ? orderbook.bids : orderbook.asks;
    const price = order.price;

    const levelIndex = book.findIndex(l => l.price === price);
    if (levelIndex === -1) return;

    const level = book[levelIndex];
    level.size -= order.remainingSize;
    level.orders -= 1;

    if (level.size <= 0 || level.orders <= 0) {
      book.splice(levelIndex, 1);
    }
  }
}

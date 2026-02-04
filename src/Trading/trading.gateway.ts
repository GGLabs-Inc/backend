import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { TradingService } from './trading.service';
import { PriceFeedService } from './services/price-feed.service';

// Tipos para evitar problemas de importación de socket.io
type Server = any;
type Socket = any;

/**
 * 🔌 GATEWAY WEBSOCKET DE TRADING
 * Streams en tiempo real de precios, orderbook, y trades
 */
@WebSocketGateway({ namespace: '/trading', cors: { origin: '*' } })
export class TradingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TradingGateway.name);

  // 📊 Suscripciones activas por socket
  private subscriptions: Map<string, Set<string>> = new Map();

  // ⏱️ Intervalos de broadcast
  private priceInterval: NodeJS.Timeout | null = null;
  private orderbookInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly tradingService: TradingService,
    private readonly priceFeedService: PriceFeedService,
  ) {
    // Iniciar broadcasts periódicos
    this.startPriceBroadcast();
    this.startOrderbookBroadcast();
  }

  /**
   * 🔗 CLIENTE CONECTADO
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.subscriptions.set(client.id, new Set());

    // Enviar mercados disponibles
    const markets = this.tradingService.getAllMarkets();
    client.emit('markets', markets);
  }

  /**
   * 🔌 CLIENTE DESCONECTADO
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.subscriptions.delete(client.id);
  }

  /**
   * 📊 SUSCRIBIRSE A TICKER DE PRECIO
   */
  @SubscribeMessage('subscribe:ticker')
  handleSubscribeTicker(
    @MessageBody() data: { market: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { market } = data;
    const subs = this.subscriptions.get(client.id);
    
    if (subs) {
      subs.add(`ticker:${market}`);
      this.logger.log(`${client.id} subscribed to ticker: ${market}`);
      
      // Enviar precio actual inmediatamente
      const marketData = this.priceFeedService.getMarketData(market);
      client.emit('ticker', marketData);
    }
  }

  /**
   * ❌ DESUSCRIBIRSE DE TICKER
   */
  @SubscribeMessage('unsubscribe:ticker')
  handleUnsubscribeTicker(
    @MessageBody() data: { market: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { market } = data;
    const subs = this.subscriptions.get(client.id);
    
    if (subs) {
      subs.delete(`ticker:${market}`);
      this.logger.log(`${client.id} unsubscribed from ticker: ${market}`);
    }
  }

  /**
   * 📚 SUSCRIBIRSE A ORDERBOOK
   */
  @SubscribeMessage('subscribe:orderbook')
  handleSubscribeOrderbook(
    @MessageBody() data: { market: string; depth?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { market, depth = 20 } = data;
    const subs = this.subscriptions.get(client.id);
    
    if (subs) {
      subs.add(`orderbook:${market}`);
      this.logger.log(`${client.id} subscribed to orderbook: ${market}`);
      
      // Enviar orderbook actual
      const orderbook = this.tradingService.getOrderbook(market, depth);
      client.emit('orderbook', orderbook);
    }
  }

  /**
   * ❌ DESUSCRIBIRSE DE ORDERBOOK
   */
  @SubscribeMessage('unsubscribe:orderbook')
  handleUnsubscribeOrderbook(
    @MessageBody() data: { market: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { market } = data;
    const subs = this.subscriptions.get(client.id);
    
    if (subs) {
      subs.delete(`orderbook:${market}`);
      this.logger.log(`${client.id} unsubscribed from orderbook: ${market}`);
    }
  }

  /**
   * 💰 SUSCRIBIRSE A TRADES
   */
  @SubscribeMessage('subscribe:trades')
  handleSubscribeTrades(
    @MessageBody() data: { market: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { market } = data;
    const subs = this.subscriptions.get(client.id);
    
    if (subs) {
      subs.add(`trades:${market}`);
      this.logger.log(`${client.id} subscribed to trades: ${market}`);
      
      // Enviar trades recientes
      const trades = this.tradingService.getRecentTrades(market, 20);
      client.emit('trades', { market, trades });
    }
  }

  /**
   * 📊 BROADCAST DE PRECIOS (100ms)
   */
  private startPriceBroadcast() {
    this.priceInterval = setInterval(() => {
      const markets = this.tradingService.getAllMarkets();
      
      markets.forEach(marketData => {
        // Broadcast a clientes suscritos
        this.subscriptions.forEach((subs, clientId) => {
          if (subs.has(`ticker:${marketData.market}`)) {
            this.server.to(clientId).emit('ticker', marketData);
          }
        });
      });
    }, 100); // 100ms = 10 actualizaciones/segundo
  }

  /**
   * 📚 BROADCAST DE ORDERBOOK (500ms)
   */
  private startOrderbookBroadcast() {
    this.orderbookInterval = setInterval(() => {
      const markets = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC', 'ARB-USDC', 'OP-USDC'];
      
      markets.forEach(market => {
        const orderbook = this.tradingService.getOrderbook(market, 20);
        
        // Broadcast a clientes suscritos
        this.subscriptions.forEach((subs, clientId) => {
          if (subs.has(`orderbook:${market}`)) {
            this.server.to(clientId).emit('orderbook', orderbook);
          }
        });
      });
    }, 500); // 500ms
  }

  /**
   * 🎯 NOTIFICAR NUEVA ORDEN (llamado por TradingService)
   */
  notifyNewOrder(market: string, order: any) {
    this.server.emit('order:new', { market, order });
  }

  /**
   * 🤝 NOTIFICAR NUEVO TRADE (llamado por OrderbookService)
   */
  notifyNewTrade(market: string, trade: any) {
    // Broadcast a clientes suscritos a trades de este mercado
    this.subscriptions.forEach((subs, clientId) => {
      if (subs.has(`trades:${market}`)) {
        this.server.to(clientId).emit('trade', { market, trade });
      }
    });
  }

  /**
   * ⚠️ NOTIFICAR LIQUIDACIÓN
   */
  notifyLiquidation(liquidation: any) {
    this.server.emit('liquidation', liquidation);
  }

  /**
   * 🛑 CLEANUP AL DESTRUIR
   */
  onModuleDestroy() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
    }
    if (this.orderbookInterval) {
      clearInterval(this.orderbookInterval);
    }
  }
}

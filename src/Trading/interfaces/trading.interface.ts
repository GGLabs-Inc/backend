/**
 * 📊 INTERFACES DE TRADING
 * Tipos para el sistema de trading de perpetuos
 */

/**
 * 📝 ORDEN
 */
export interface Order {
  orderId: string;
  trader: string; // Dirección Ethereum
  market: string; // BTC-USDC, ETH-USDC, etc.
  side: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  size: number; // Cantidad en USD
  price?: number; // Precio límite (solo para LIMIT)
  triggerPrice?: number; // Precio de activación (stop-loss/take-profit)
  leverage: number; // 1x - 100x
  marginType: 'ISOLATED' | 'CROSS';
  status: 'PENDING' | 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'EXPIRED';
  filledSize: number;
  remainingSize: number;
  averagePrice?: number;
  fee: number;
  signature: string; // Firma ECDSA del trader
  timestamp: number;
  expiresAt?: number;
}

/**
 * 💼 POSICIÓN ABIERTA
 */
export interface Position {
  positionId: string;
  trader: string;
  market: string;
  side: 'LONG' | 'SHORT';
  size: number; // Tamaño en USD
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  marginType: 'ISOLATED' | 'CROSS';
  margin: number; // Margen depositado
  pnl: number; // Profit and Loss (no realizado)
  pnlPercentage: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  fee: number;
  fundingRate: number; // Tasa de financiación acumulada
  timestamp: number;
}

/**
 * 📊 LIBRO DE ÓRDENES
 */
export interface Orderbook {
  market: string;
  bids: OrderbookLevel[]; // Órdenes de compra (LONG)
  asks: OrderbookLevel[]; // Órdenes de venta (SHORT)
  lastPrice: number;
  timestamp: number;
}

export interface OrderbookLevel {
  price: number;
  size: number; // Tamaño total en USD
  orders: number; // Cantidad de órdenes en este nivel
}

/**
 * 📈 DATOS DE MERCADO
 */
export interface MarketData {
  market: string;
  price: number;
  change24h: number; // Cambio en %
  high24h: number;
  low24h: number;
  volume24h: number;
  fundingRate: number; // Tasa de financiación actual
  openInterest: number; // Interés abierto total
  indexPrice: number; // Precio del índice (oracle)
  timestamp: number;
}

/**
 * 💸 EJECUCIÓN (MATCH)
 */
export interface Trade {
  tradeId: string;
  market: string;
  price: number;
  size: number;
  side: 'LONG' | 'SHORT';
  buyOrderId: string;
  sellOrderId: string;
  buyer: string;
  seller: string;
  fee: number;
  timestamp: number;
}

/**
 * ⚠️ LIQUIDACIÓN
 */
export interface Liquidation {
  liquidationId: string;
  positionId: string;
  trader: string;
  market: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  liquidationPrice: number;
  actualPrice: number;
  loss: number;
  timestamp: number;
}

/**
 * 💰 BALANCE DEL TRADER
 */
export interface TraderBalance {
  trader: string;
  totalBalance: number; // Balance total en USDC
  availableBalance: number; // Balance disponible
  usedMargin: number; // Margen usado en posiciones
  unrealizedPnl: number; // PnL no realizado
  totalPnl: number; // PnL total histórico
}

/**
 * 📋 CANAL DE ESTADO (STATE CHANNEL)
 */
export interface TradingChannel {
  channelId: string;
  trader: string;
  nonce: number;
  balance: number;
  positions: Position[];
  lastUpdate: number;
  isActive: boolean;
}

export const TRADING_CONFIG = {
  // 💰 CONFIGURACIÓN DE FEES
  MAKER_FEE: 0.0002, // 0.02% para maker (provee liquidez)
  TAKER_FEE: 0.0005, // 0.05% para taker (consume liquidez)
  LIQUIDATION_FEE: 0.005, // 0.5% fee de liquidación

  // 🎯 LÍMITES DE APALANCAMIENTO POR MERCADO
  LEVERAGE_LIMITS: {
    'BTC-USDC': 100,
    'ETH-USDC': 100,
    'SOL-USDC': 50,
    'ARB-USDC': 50,
    'OP-USDC': 50,
  },

  // ⚠️ UMBRALES DE LIQUIDACIÓN
  MAINTENANCE_MARGIN_RATIO: 0.05, // 5% margen de mantenimiento
  LIQUIDATION_BUFFER: 0.01, // 1% buffer adicional

  // 💸 TASA DE FINANCIACIÓN (FUNDING RATE)
  FUNDING_INTERVAL: 8 * 60 * 60 * 1000, // 8 horas en ms
  FUNDING_RATE_CAP: 0.0005, // Máximo 0.05% por intervalo

  // 📊 LÍMITES DE ÓRDENES
  MIN_ORDER_SIZE: 10, // $10 USD mínimo
  MAX_ORDER_SIZE: 1_000_000, // $1M USD máximo
  MAX_ORDERS_PER_TRADER: 100,

  // 💼 LÍMITES DE POSICIÓN
  MAX_POSITIONS_PER_TRADER: 20,
  MAX_POSITION_SIZE: 5_000_000, // $5M USD

  // ⏱️ TIEMPOS
  ORDER_EXPIRY_DEFAULT: 30 * 24 * 60 * 60 * 1000, // 30 días
  PRICE_UPDATE_INTERVAL: 100, // 100ms para feed de precios
  LIQUIDATION_CHECK_INTERVAL: 1000, // 1 segundo

  // 🔐 CONFIGURACIÓN DE CANALES DE ESTADO
  CHANNEL_TIMEOUT: 30 * 60 * 1000, // 30 minutos de inactividad
  MAX_NONCE_DRIFT: 100, // Máxima diferencia de nonce permitida

  // 📈 MERCADOS SOPORTADOS
  MARKETS: [
    {
      symbol: 'BTC-USDC',
      name: 'Bitcoin Perpetual',
      maxLeverage: 100,
      tickSize: 0.5, // $0.5 incremento de precio
      minSize: 10,
    },
    {
      symbol: 'ETH-USDC',
      name: 'Ethereum Perpetual',
      maxLeverage: 100,
      tickSize: 0.1,
      minSize: 10,
    },
    {
      symbol: 'SOL-USDC',
      name: 'Solana Perpetual',
      maxLeverage: 50,
      tickSize: 0.01,
      minSize: 10,
    },
    {
      symbol: 'ARB-USDC',
      name: 'Arbitrum Perpetual',
      maxLeverage: 50,
      tickSize: 0.001,
      minSize: 10,
    },
    {
      symbol: 'OP-USDC',
      name: 'Optimism Perpetual',
      maxLeverage: 50,
      tickSize: 0.001,
      minSize: 10,
    },
  ],

  // 🌐 ORÁCULOS DE PRECIOS (en producción usar Chainlink/Pyth)
  PRICE_ORACLES: {
    'BTC-USDC': 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDC',
    'ETH-USDC': 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDC',
    'SOL-USDC': 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDC',
    'ARB-USDC': 'https://api.binance.com/api/v3/ticker/price?symbol=ARBUSDC',
    'OP-USDC': 'https://api.binance.com/api/v3/ticker/price?symbol=OPUSDC',
  },
};

/**
 * ⚙️ CONFIGURACIÓN DEL MÓDULO CHESS
 */

export const CHESS_CONFIG = {
  // 🎮 Configuración de Partidas
  GAME: {
    MIN_WAGER: 10, // USDC mínimos para apostar
    MAX_WAGER: 1000, // USDC máximos
    MOVE_TIMEOUT: 300000, // 5 minutos por movimiento (en ms)
    DEFAULT_TIME_CONTROL: 600000, // 10 minutos por jugador
  },

  // 🔗 Configuración de Blockchain
  BLOCKCHAIN: {
    NETWORK: 'sepolia',
    RPC_URL: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    CONTRACT_ADDRESS: process.env.SESSION_SAFE_ADDRESS || '0x0000000000000000000000000000000000000000',
    CONFIRMATIONS_REQUIRED: 2, // Bloques de confirmación
  },

  // 💾 Configuración de Estado
  STATE: {
    USE_REDIS: process.env.USE_REDIS === 'true',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    MEMORY_CLEANUP_INTERVAL: 3600000, // Limpiar juegos viejos cada hora
    GAME_EXPIRY_TIME: 86400000, // Expirar juegos después de 24h
  },

  // 🔐 Configuración de Seguridad
  SECURITY: {
    SIGNATURE_REQUIRED: true,
    NONCE_TOLERANCE: 5, // Nonces fuera de orden permitidos
    RATE_LIMIT_MOVES_PER_MINUTE: 60,
  },

  // 🎯 Configuración de WebSocket
  WEBSOCKET: {
    NAMESPACE: '/chess',
    PING_INTERVAL: 10000, // Ping cada 10s
    PING_TIMEOUT: 5000,
    MAX_PAYLOAD: 1e6, // 1MB
  },
};

/**
 * 📜 MENSAJES PARA FIRMAR
 * Templates para mensajes que el frontend debe firmar
 */
export const SIGNATURE_MESSAGES = {
  START_GAME: (wagerAmount: number) =>
    `Start Chess Game - Wager: ${wagerAmount} USDC`,
  
  JOIN_GAME: (gameId: string) =>
    `Join Chess Game ${gameId}`,
  
  MAKE_MOVE: (move: string, gameId: string, nonce: number) =>
    `Move: ${move} | Game: ${gameId} | Nonce: ${nonce}`,
  
  CLAIM_VICTORY: (gameId: string, nonce: number) =>
    `Claim Victory | Game: ${gameId} | Nonce: ${nonce}`,
  
  SETTLE_GAME: (gameId: string, winner: string) =>
    `Settle Game ${gameId} | Winner: ${winner}`,
};

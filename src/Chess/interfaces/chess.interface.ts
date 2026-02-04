/**
 * Estado de una partida de ajedrez
 */
export interface ChessGame {
  gameId: string;
  player1: string; // Wallet address
  player2: string; // Wallet address
  wagerAmount: number; // En USDC
  potAmount: number; // Total en juego (wager * 2)
  currentTurn: 'white' | 'black';
  boardState: string; // FEN notation
  moveHistory: ChessMove[];
  status: GameStatus;
  startTime: number;
  lastMoveTime: number;
  nonce: number; // State channel nonce
}

/**
 * Movimiento individual en la partida
 */
export interface ChessMove {
  player: string;
  move: string; // Notación algebraica
  timestamp: number;
  nonce: number;
  signature: string;
  boardStateAfter: string; // FEN notation
}

/**
 * Estados posibles de una partida
 */
export enum GameStatus {
  WAITING = 'WAITING', // Esperando oponente
  ACTIVE = 'ACTIVE', // Partida en curso
  CHECKMATE = 'CHECKMATE', // Jaque mate
  STALEMATE = 'STALEMATE', // Tablas por ahogado
  DRAW = 'DRAW', // Tablas acordadas
  TIMEOUT = 'TIMEOUT', // Victoria por tiempo
  SETTLED = 'SETTLED', // Liquidado en blockchain
  CANCELLED = 'CANCELLED', // Cancelado
}

/**
 * Resultado de validación de firma
 */
export interface SignatureValidation {
  isValid: boolean;
  recoveredAddress: string;
  message: string;
}

/**
 * Evento de blockchain detectado
 */
export interface WagerDepositEvent {
  gameId: string;
  player: string;
  amount: number;
  txHash: string;
  blockNumber: number;
  confirmed: boolean;
}

/**
 * Estado del canal de estado para una partida
 */
export interface GameChannel {
  gameId: string;
  player1Balance: number;
  player2Balance: number;
  lockedAmount: number;
  nonce: number;
  isOpen: boolean;
}

/**
 * Respuesta de movimiento exitoso
 */
export interface MoveResponse {
  success: boolean;
  gameId: string;
  move: string;
  newBoardState: string;
  isCheck: boolean;
  isCheckmate: boolean;
  nextTurn: 'white' | 'black';
  nonce: number;
}

/**
 * Respuesta de inicio de partida
 */
export interface GameStartResponse {
  gameId: string;
  player1: string;
  player2: string;
  wagerAmount: number;
  potAmount: number;
  initialBoardState: string;
  channelStatus: 'opening' | 'active';
  message: string;
}

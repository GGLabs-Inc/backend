import { IsString, IsNumber, IsEnum, IsOptional, Min, Max, IsBoolean } from 'class-validator';

/**
 * 📝 DTOs DE TRADING
 * Validación de requests con class-validator
 */

export enum OrderSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
}

export enum MarginType {
  ISOLATED = 'ISOLATED',
  CROSS = 'CROSS',
}

/**
 * ➕ CREAR ORDEN
 */
export class CreateOrderDto {
  @IsString()
  trader: string; // Dirección Ethereum

  @IsString()
  market: string; // BTC-USDC, ETH-USDC

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsEnum(OrderType)
  type: OrderType;

  @IsNumber()
  @Min(1)
  size: number; // Tamaño en USD

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number; // Solo para LIMIT

  @IsOptional()
  @IsNumber()
  @Min(0)
  triggerPrice?: number; // Solo para STOP_LOSS/TAKE_PROFIT

  @IsNumber()
  @Min(1)
  @Max(100)
  leverage: number; // 1x - 100x

  @IsEnum(MarginType)
  marginType: MarginType;

  @IsString()
  signature: string; // Firma ECDSA

  @IsOptional()
  @IsNumber()
  expiresAt?: number; // Timestamp de expiración
}

/**
 * ❌ CANCELAR ORDEN
 */
export class CancelOrderDto {
  @IsString()
  orderId: string;

  @IsString()
  trader: string;

  @IsString()
  signature: string;
}

/**
 * ✏️ MODIFICAR POSICIÓN
 */
export class UpdatePositionDto {
  @IsString()
  positionId: string;

  @IsString()
  trader: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stopLoss?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  takeProfit?: number;

  @IsString()
  signature: string;
}

/**
 * 🔒 CERRAR POSICIÓN
 */
export class ClosePositionDto {
  @IsString()
  positionId: string;

  @IsString()
  trader: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number; // Cerrar parcialmente (ej: 50%)

  @IsString()
  signature: string;
}

/**
 * 💰 DEPOSITAR MARGEN
 */
export class DepositMarginDto {
  @IsString()
  trader: string;

  @IsNumber()
  @Min(1)
  amount: number; // USDC

  @IsString()
  txHash: string; // Hash de la transacción on-chain

  @IsString()
  signature: string;
}

/**
 * 💸 RETIRAR MARGEN
 */
export class WithdrawMarginDto {
  @IsString()
  trader: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  signature: string;
}

/**
 * 🔍 CONSULTAR ÓRDENES
 */
export class GetOrdersDto {
  @IsString()
  trader: string;

  @IsOptional()
  @IsString()
  market?: string;

  @IsOptional()
  @IsEnum(OrderSide)
  side?: OrderSide;

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean; // Solo órdenes abiertas
}

/**
 * 🔍 CONSULTAR POSICIONES
 */
export class GetPositionsDto {
  @IsString()
  trader: string;

  @IsOptional()
  @IsString()
  market?: string;
}

/**
 * 📊 CONSULTAR LIBRO DE ÓRDENES
 */
export class GetOrderbookDto {
  @IsString()
  market: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  depth?: number; // Profundidad del libro (default: 20)
}

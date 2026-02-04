import { IsString, IsNumber, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO para iniciar una partida de ajedrez con apuesta
 */
export class StartGameDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsNumber()
  @Min(10)
  @Max(1000)
  wagerAmount: number; // En USDC

  @IsString()
  @IsNotEmpty()
  signature: string; // Firma ECDSA del mensaje

  @IsString()
  @IsOptional()
  opponentAddress?: string; // Si se especifica oponente
}

/**
 * DTO para realizar un movimiento de ajedrez
 */
export class MakeMoveDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  move: string; // En notación algebraica: "e2e4" o "Nf3"

  @IsNumber()
  @IsNotEmpty()
  nonce: number; // Nonce del state channel

  @IsString()
  @IsNotEmpty()
  signature: string; // Firma ECDSA del movimiento + nonce
}

/**
 * DTO para reclamar victoria (checkmate)
 */
export class ClaimVictoryDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  finalStateSignature: string; // Firma del estado final
}

/**
 * DTO para cerrar partida y liquidar fondos
 */
export class SettleGameDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsString()
  @IsNotEmpty()
  winnerAddress: string;

  @IsString()
  @IsNotEmpty()
  player1Signature: string;

  @IsString()
  @IsNotEmpty()
  player2Signature: string;
}

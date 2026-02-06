import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min, Max, Matches } from 'class-validator';

/**
 * 📝 DTOs para validación de requests
 */

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  userAddress: string;

  @IsString()
  @IsNotEmpty()
  depositAmount: string; // En wei (bigint como string)
}

export class CreateSessionKeyDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  userAddress: string;

  @IsNumber()
  @Min(0)
  expiry: number;

  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class AiQueryDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsNumber()
  @Min(0)
  nonce: number;

  @IsString()
  @IsNotEmpty()
  modelId: string;

  @IsString()
  @IsNotEmpty()
  @Max(10000)
  prompt: string;

  @IsString()
  @IsNotEmpty()
  maxCost: string; // En wei (bigint como string)

  @IsNumber()
  timestamp: number;

  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class CloseSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  userAddress: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class GetBalanceDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class GetMessagesDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

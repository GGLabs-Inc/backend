import { IsString, IsNumber, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChannelState {
  @IsString()
  @IsNotEmpty()
  channelId: string;      // ID único de la sesión

  @IsNumber()
  @IsNotEmpty()
  nonce: number;          // Contador de transacciones (1, 2, 3...)

  @IsString()
  @IsNotEmpty()
  userAddress: string;    // Dirección del cliente

  @IsString()
  @IsNotEmpty()
  serverAddress: string;  // Dirección del backend (nuestra wallet)

  @IsString()
  @IsNotEmpty()
  userBalance: string;    // Saldo actual del usuario (en Wei/Unidades)

  @IsString()
  @IsNotEmpty()
  serverBalance: string;  // Saldo actual del backend

  @IsString()
  @IsNotEmpty()
  signature: string;      // Firma del usuario sobre estos datos
}

export class AIRequestDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;         // Lo que el usuario pide a la IA

  @ValidateNested()
  @Type(() => ChannelState)
  signedState: ChannelState; // El pago adjunto
}

export class AIResponseDto {
  result: string;         // Respuesta de la IA
  newServerSignature: string; // Tu firma confirmando el nuevo saldo
}

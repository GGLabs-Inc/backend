import { IsString, IsNotEmpty, IsObject, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ChannelStateDto {
    @IsString() channelId: string;
    @IsNumber() nonce: number;
    @IsString() userAddress: string;
    @IsString() serverAddress: string;
    @IsString() userBalance: string;
    @IsString() serverBalance: string;
    @IsString() signature: string;
}

export class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    to: string; // ENS or Address

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsString()
    senderEns?: string;

    @IsOptional()
    @IsString()
    receiverEns?: string;

    @ValidateNested()
    @Type(() => ChannelStateDto)
    channelState: ChannelStateDto;
}

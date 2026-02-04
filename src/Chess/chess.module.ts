import { Module } from '@nestjs/common';
import { ChessGateway } from './chess.gateway';
import { ChessService } from './chess.service';
import { ChessController } from './chess.controller';
import { SignatureService } from './services/signature.service';
import { BlockchainListenerService } from './services/blockchain-listener.service';

@Module({
  providers: [
    ChessGateway,
    ChessService,
    SignatureService,
    BlockchainListenerService,
  ],
  controllers: [ChessController],
  exports: [ChessService],
})
export class ChessModule {}

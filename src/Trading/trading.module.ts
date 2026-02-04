import { Module } from '@nestjs/common';
import { TradingGateway } from './trading.gateway';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { OrderbookService } from './services/orderbook.service';
import { PositionService } from './services/position.service';
import { LiquidationService } from './services/liquidation.service';
import { PriceFeedService } from './services/price-feed.service';
import { SignatureService } from './services/signature.service';

/**
 * 📈 MÓDULO DE TRADING
 * DEX con perpetuos y libro de órdenes off-chain
 * 
 * CARACTERÍSTICAS:
 * - Libro de órdenes off-chain con firma ECDSA
 * - Contratos perpetuos (sin vencimiento)
 * - Apalancamiento hasta 100x
 * - Liquidaciones automáticas
 * - Feed de precios en tiempo real vía WebSocket
 * - Órdenes limit/market/stop-loss/take-profit
 * - Posiciones long/short
 * - Margen aislado y cruzado
 */
@Module({
  providers: [
    TradingGateway,
    TradingService,
    OrderbookService,
    PositionService,
    LiquidationService,
    PriceFeedService,
    SignatureService,
  ],
  controllers: [TradingController],
  exports: [TradingService],
})
export class TradingModule {}

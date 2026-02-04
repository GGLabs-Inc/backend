import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import { ChessService } from '../chess.service';
import { ChessGateway } from '../chess.gateway';

/**
 * 🔗 SERVICIO DE ESCUCHA DE BLOCKCHAIN
 * Detecta eventos del contrato SessionSafe en Sepolia
 * Confirma depósitos de apuestas y habilita canales
 */
@Injectable()
export class BlockchainListenerService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainListenerService.name);
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  // ⚙️ CONFIGURACIÓN - En producción, mover a ConfigModule
  private readonly RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
  private readonly CONTRACT_ADDRESS = process.env.SESSION_SAFE_ADDRESS || '0x...';
  
  // ABI simplificado - Solo eventos relevantes
  private readonly CONTRACT_ABI = [
    'event WagerDeposited(bytes32 indexed gameId, address indexed player, uint256 amount)',
    'event GameSettled(bytes32 indexed gameId, address indexed winner, uint256 payout)',
  ];

  constructor(
    private readonly chessService: ChessService,
    private readonly chessGateway: ChessGateway,
  ) {}

  /**
   * 🚀 INICIALIZAR AL ARRANCAR EL MÓDULO
   */
  async onModuleInit() {
    await this.initializeProvider();
    await this.startListening();
  }

  /**
   * 🔌 CONECTAR A BLOCKCHAIN
   */
  private async initializeProvider() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
      
      // Verificar conexión
      const network = await this.provider.getNetwork();
      this.logger.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

      // Instanciar contrato
      this.contract = new ethers.Contract(
        this.CONTRACT_ADDRESS,
        this.CONTRACT_ABI,
        this.provider,
      );

      this.logger.log(`Listening to contract: ${this.CONTRACT_ADDRESS}`);
    } catch (error) {
      this.logger.error(`Failed to initialize blockchain listener: ${error.message}`);
      // En desarrollo, continuar sin blockchain
      this.logger.warn('Running in MOCK MODE without blockchain');
    }
  }

  /**
   * 👂 ESCUCHAR EVENTOS
   */
  private async startListening() {
    if (!this.contract) {
      this.logger.warn('Contract not initialized. Skipping event listening.');
      return;
    }

    // 💰 Evento: Depósito de Apuesta
    this.contract.on('WagerDeposited', async (gameId, player, amount, event) => {
      this.logger.log(`🎰 WagerDeposited detected!`);
      this.logger.log(`  GameId: ${gameId}`);
      this.logger.log(`  Player: ${player}`);
      this.logger.log(`  Amount: ${ethers.formatUnits(amount, 6)} USDC`);
      this.logger.log(`  Block: ${event.log.blockNumber}`);

      await this.handleWagerDeposit(gameId, player, amount, event.log.transactionHash);
    });

    // 🏆 Evento: Partida Liquidada
    this.contract.on('GameSettled', async (gameId, winner, payout, event) => {
      this.logger.log(`💰 GameSettled detected!`);
      this.logger.log(`  GameId: ${gameId}`);
      this.logger.log(`  Winner: ${winner}`);
      this.logger.log(`  Payout: ${ethers.formatUnits(payout, 6)} USDC`);

      await this.handleGameSettled(gameId, winner, payout);
    });

    this.logger.log('✅ Blockchain event listeners started');
  }

  /**
   * 💰 MANEJAR DEPÓSITO DE APUESTA
   */
  private async handleWagerDeposit(
    gameId: string,
    player: string,
    amount: bigint,
    txHash: string,
  ) {
    try {
      // Confirmar depósito en el servicio de ajedrez
      this.chessService.confirmWagerDeposit(gameId, player, txHash);

      // Notificar a los jugadores vía WebSocket
      this.chessGateway.emitToGame(gameId, 'wagerConfirmed', {
        player,
        amount: ethers.formatUnits(amount, 6),
        txHash,
        status: 'confirmed',
      });

      this.logger.log(`✅ Wager confirmed for game ${gameId}`);
    } catch (error) {
      this.logger.error(`Error handling wager deposit: ${error.message}`);
    }
  }

  /**
   * 🏆 MANEJAR LIQUIDACIÓN DE PARTIDA
   */
  private async handleGameSettled(
    gameId: string,
    winner: string,
    payout: bigint,
  ) {
    try {
      // Notificar a los jugadores
      this.chessGateway.emitToGame(gameId, 'settlementCompleted', {
        winner,
        payout: ethers.formatUnits(payout, 6),
        status: 'settled',
      });

      this.logger.log(`✅ Game ${gameId} settled. Winner: ${winner}`);
    } catch (error) {
      this.logger.error(`Error handling game settlement: ${error.message}`);
    }
  }

  /**
   * 📊 OBTENER HISTORIAL DE EVENTOS
   * Útil para sincronizar estados al reiniciar
   */
  async getRecentEvents(fromBlock: number = -100) {
    if (!this.contract) {
      return [];
    }

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const events = await this.contract.queryFilter(
        '*', // Todos los eventos
        Math.max(0, currentBlock + fromBlock),
        currentBlock,
      );

      this.logger.log(`Found ${events.length} events in recent blocks`);
      return events;
    } catch (error) {
      this.logger.error(`Error querying events: ${error.message}`);
      return [];
    }
  }
}

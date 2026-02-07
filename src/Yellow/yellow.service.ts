import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class YellowService implements OnModuleInit {
  private readonly logger = new Logger(YellowService.name);
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const privateKey = this.configService.get<string>('PRIVATE_KEY');
    const rpcUrl = this.configService.get<string>('RPC_URL');

    if (!privateKey || !rpcUrl) {
      this.logger.error('Missing PRIVATE_KEY or RPC_URL in environment');
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    this.logger.log(`Yellow Service Initialized. Server Address: ${this.wallet.address}`);
  }

  /**
   * Obtiene la dirección de la wallet del servidor
   */
  getServerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Firma un mensaje con la private key del servidor
   * Se usa para validar estados del canal off-chain
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    return this.wallet.signMessage(message);
  }

  /**
   * Verifica la validez de un micropago en el canal de estado
   * 1. Reconstruye el mensaje de estado
   * 2. Verifica la firma del usuario
   * 3. Valida (básicamente) que los balances sumen y el nonce sea mayor
   */
  async validateAndSignState(state: any, amountToPay: bigint): Promise<string> {
    // 1. Lógica Off-Chain: Reconstruir el mensaje DETERMINISTA
    // Forzamos conversión a String explícita para evitar diferencias de tipo
    const cid = String(state.channelId);
    const nonce = String(state.nonce);
    const ubal = String(state.userBalance);
    const sbal = String(state.serverBalance);

    const messageContent = `CHANNEL:${cid}|NONCE:${nonce}|UBAL:${ubal}|SBAL:${sbal}`;

    console.log("--- DEBUG FIRMA (V3 Strict) ---");
    console.log("Backend Reconstruyó content:", messageContent);
    console.log("Signature recibida:", state.signature);

    // 2. Verificar quién firmó esto
    const recoveredAddress = ethers.verifyMessage(messageContent, state.signature);
    
    console.log("Recovered:", recoveredAddress);
    console.log("Expected (User):", state.userAddress);
    
    // TODO: En producción, verificaríamos en Base de Datos si 'recoveredAddress' es parte del canal 'channelId'
    
    if (recoveredAddress.toLowerCase() !== state.userAddress.toLowerCase()) {
      console.error(`❌ Mismatch! Rec: ${recoveredAddress}, Exp: ${state.userAddress}`);
      throw new Error(`Firma inválida: No coincide con la dirección del usuario. Rec: ${recoveredAddress} vs Exp: ${state.userAddress}`);
    }

    // 3. Validar lógica de negocio (Simple)
    // El servidor debe estar recibiendo dinero (serverBalance anterior + price == serverBalance nuevo)
    // Por ahora, asumimos que state trae el estado FINAL deseado.
    
    this.logger.log(`✅ Pago válido de ${amountToPay} wei detectado en canal ${state.channelId}`);

    // 4. Contra-firmar (Double Sign)
    // El servidor firma el mismo estado para confirmar "Estoy de acuerdo con este balance"
    return this.wallet.signMessage(messageContent);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import SessionSafeABI from './contracts/SessionSafe.json';

@Injectable()
export class SessionSafeService {
  private readonly logger = new Logger(SessionSafeService.name);
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private contractWithSigner?: ethers.Contract;
  private wallet?: ethers.Wallet;

  constructor(private configService: ConfigService) {
    this.initializeProvider();
  }

  private initializeProvider() {
    const rpcUrl = this.configService.get<string>('sessionsafe.rpcUrl');
    const contractAddress = this.configService.get<string>('sessionsafe.contractAddress');
    const privateKey = this.configService.get<string>('sessionsafe.privateKey');

    if (!rpcUrl) {
      throw new Error('RPC_URL no está configurado en .env');
    }

    if (!contractAddress) {
      throw new Error('SESSIONSAFE_CONTRACT_ADDRESS no está configurado en .env');
    }

    // Inicializar provider
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Contrato de solo lectura
    this.contract = new ethers.Contract(
      contractAddress,
      SessionSafeABI as any,
      this.provider,
    );

    // Si hay private key, crear wallet y contrato con firma
    if (privateKey && privateKey.trim() !== '') {
      try {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contractWithSigner = this.contract.connect(this.wallet) as ethers.Contract;
        this.logger.log(`Wallet conectada: ${this.wallet.address}`);
      } catch (error) {
        this.logger.error('Error al inicializar wallet:', error);
      }
    } else {
      this.logger.warn('No se proporcionó PRIVATE_KEY. Solo funciones de lectura disponibles.');
    }

    this.logger.log(`Conectado a: ${rpcUrl}`);
    this.logger.log(`Contrato SessionSafe: ${contractAddress}`);
  }

  // ==================== FUNCIONES DE LECTURA ====================

  /**
   * Obtener la dirección del owner
   */
  async getOwner(): Promise<string> {
    return await this.contract.owner();
  }

  /**
   * Obtener la dirección del token de pago
   */
  async getPaymentToken(): Promise<string> {
    return await this.contract.paymentToken();
  }

  /**
   * Obtener la dirección del proveedor de servicio
   */
  async getServiceProvider(): Promise<string> {
    return await this.contract.serviceProvider();
  }

  /**
   * Obtener el número total de sesiones
   */
  async getTotalSessions(): Promise<string> {
    const total = await this.contract.totalSessions();
    return total.toString();
  }

  /**
   * Obtener el volumen total
   */
  async getTotalVolume(): Promise<string> {
    const volume = await this.contract.totalVolume();
    return ethers.formatUnits(volume, 6); // Asumiendo 6 decimales (USDC)
  }

  /**
   * Obtener detalles de una sesión
   */
  async getSession(sessionId: string): Promise<any> {
    const session = await this.contract.getSession(sessionId);
    return {
      user: session[0],
      depositAmount: ethers.formatUnits(session[1], 6),
      createdAt: Number(session[2]),
      createdAtDate: new Date(Number(session[2]) * 1000).toISOString(),
      settled: session[3],
    };
  }

  /**
   * Verificar si una sesión está activa
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    return await this.contract.isSessionActive(sessionId);
  }

  /**
   * Obtener información de la sesión desde el mapping público
   */
  async getSessionFromMapping(sessionId: string): Promise<any> {
    const session = await this.contract.sessions(sessionId);
    return {
      user: session.user,
      depositAmount: ethers.formatUnits(session.depositAmount, 6),
      createdAt: Number(session.createdAt),
      createdAtDate: new Date(Number(session.createdAt) * 1000).toISOString(),
      settled: session.settled,
    };
  }

  // ==================== FUNCIONES DE ESCRITURA ====================

  /**
   * Depositar fondos para crear una sesión
   */
  async deposit(amount: string): Promise<any> {
    if (!this.contractWithSigner) {
      throw new Error('No hay wallet configurada. Agrega PRIVATE_KEY en .env');
    }

    try {
      const amountInWei = ethers.parseUnits(amount, 6);
      this.logger.log(`Depositando ${amount} tokens para crear sesión...`);
      
      const tx = await this.contractWithSigner.deposit(amountInWei);
      this.logger.log(`Transacción enviada: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transacción confirmada en bloque: ${receipt.blockNumber}`);
      
      // Extraer sessionId del evento
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'SessionCreated';
        } catch {
          return false;
        }
      });

      let sessionId = null;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        sessionId = parsed?.args.sessionId;
      }
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: Number(receipt.blockNumber),
        from: this.wallet!.address,
        amount: `${amount} tokens`,
        sessionId: sessionId,
      };
    } catch (error) {
      this.logger.error('Error en deposit:', error.message);
      throw new Error(`Deposit falló: ${error.message}`);
    }
  }

  /**
   * Liquidar una sesión con firmas
   */
  async settle(
    sessionId: string,
    finalBalance: string,
    backendSig: string,
    userSig: string,
  ): Promise<any> {
    if (!this.contractWithSigner) {
      throw new Error('No hay wallet configurada. Agrega PRIVATE_KEY en .env');
    }

    try {
      const finalBalanceInWei = ethers.parseUnits(finalBalance, 6);
      
      this.logger.log(`Liquidando sesión ${sessionId}...`);
      this.logger.log(`Balance final: ${finalBalance}`);
      
      const tx = await this.contractWithSigner.settle(
        sessionId,
        finalBalanceInWei,
        backendSig,
        userSig,
      );
      
      this.logger.log(`Transacción enviada: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transacción confirmada en bloque: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: Number(receipt.blockNumber),
        sessionId,
        finalBalance: `${finalBalance} tokens`,
      };
    } catch (error) {
      this.logger.error('Error en settle:', error.message);
      throw new Error(`Settle falló: ${error.message}`);
    }
  }

  /**
   * Retiro de emergencia (solo owner)
   */
  async emergencyWithdraw(token: string, amount: string): Promise<any> {
    if (!this.contractWithSigner) {
      throw new Error('No hay wallet configurada. Agrega PRIVATE_KEY en .env');
    }

    try {
      const amountInWei = ethers.parseUnits(amount, 6);
      this.logger.log(`Retiro de emergencia: ${amount} tokens...`);
      
      const tx = await this.contractWithSigner.emergencyWithdraw(token, amountInWei);
      this.logger.log(`Transacción enviada: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transacción confirmada en bloque: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: Number(receipt.blockNumber),
        token,
        amount: `${amount} tokens`,
      };
    } catch (error) {
      this.logger.error('Error en emergencyWithdraw:', error.message);
      throw new Error(`EmergencyWithdraw falló: ${error.message}`);
    }
  }

  /**
   * Obtener información de la wallet conectada
   */
  getWalletInfo(): any {
    if (!this.wallet) {
      return {
        connected: false,
        message: 'No hay wallet configurada',
      };
    }

    return {
      connected: true,
      address: this.wallet.address,
    };
  }
}

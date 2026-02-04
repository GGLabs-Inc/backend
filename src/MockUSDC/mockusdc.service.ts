import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import MockUSDCABI from './contracts/MockUSDC-ABI.json';

@Injectable()
export class MockUSDCService {
  private readonly logger = new Logger(MockUSDCService.name);
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private contractWithSigner?: ethers.Contract;
  private wallet?: ethers.Wallet;

  constructor(private configService: ConfigService) {
    this.initializeProvider();
  }

  private initializeProvider() {
    const rpcUrl = this.configService.get<string>('mockusdc.rpcUrl');
    const contractAddress = this.configService.get<string>('mockusdc.contractAddress');
    const privateKey = this.configService.get<string>('mockusdc.privateKey');

    if (!rpcUrl) {
      throw new Error('RPC_URL no está configurado en .env');
    }

    if (!contractAddress) {
      throw new Error('CONTRACT_ADDRESS no está configurado en .env');
    }

    // Inicializar provider
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Contrato de solo lectura
    this.contract = new ethers.Contract(
      contractAddress,
      MockUSDCABI as any,
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
    this.logger.log(`Contrato MockUSDC: ${contractAddress}`);
  }

  // ==================== FUNCIONES DE LECTURA ====================

  /**
   * Obtener el nombre del token
   */
  async getName(): Promise<string> {
    return await this.contract.name();
  }

  /**
   * Obtener el símbolo del token
   */
  async getSymbol(): Promise<string> {
    return await this.contract.symbol();
  }

  /**
   * Obtener los decimales del token
   */
  async getDecimals(): Promise<number> {
    const decimals = await this.contract.decimals();
    return Number(decimals);
  }

  /**
   * Obtener el suministro total
   */
  async getTotalSupply(): Promise<string> {
    const supply = await this.contract.totalSupply();
    return ethers.formatUnits(supply, 6); // 6 decimales para USDC
  }

  /**
   * Obtener balance de una dirección
   */
  async balanceOf(address: string): Promise<string> {
    const balance = await this.contract.balanceOf(address);
    return ethers.formatUnits(balance, 6);
  }

  /**
   * Obtener la cantidad aprobada para un spender
   */
  async allowance(owner: string, spender: string): Promise<string> {
    const allowance = await this.contract.allowance(owner, spender);
    return ethers.formatUnits(allowance, 6);
  }

  /**
   * Obtener el último tiempo de mint de una dirección
   */
  async getLastMintTime(address: string): Promise<number> {
    const timestamp = await this.contract.lastMintTime(address);
    return Number(timestamp);
  }

  /**
   * Obtener el owner del contrato
   */
  async getOwner(): Promise<string> {
    return await this.contract.owner();
  }

  /**
   * Verificar si una dirección puede usar el faucet
   */
  async canUseFaucet(address: string): Promise<boolean> {
    const lastMintTime = await this.getLastMintTime(address);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeToWait = lastMintTime + 3600; // 1 hora = 3600 segundos
    return currentTime >= timeToWait;
  }

  /**
   * Obtener tiempo restante para usar faucet
   */
  async getTimeUntilNextFaucet(address: string): Promise<number> {
    const lastMintTime = await this.getLastMintTime(address);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeToWait = lastMintTime + 3600;
    const remaining = timeToWait - currentTime;
    return remaining > 0 ? remaining : 0;
  }

  // ==================== FUNCIONES DE ESCRITURA ====================

  /**
   * Usar el faucet (mintear 1000 USDC gratis, una vez por hora)
   */
  async faucet(): Promise<any> {
    if (!this.contractWithSigner) {
      throw new Error('No hay wallet configurada. Agrega PRIVATE_KEY en .env');
    }

    try {
      this.logger.log('Llamando a faucet()...');
      const tx = await this.contractWithSigner.faucet();
      this.logger.log(`Transacción enviada: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transacción confirmada en bloque: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: Number(receipt.blockNumber),
        from: this.wallet!.address,
        amount: '1000 USDC',
      };
    } catch (error) {
      this.logger.error('Error en faucet:', error.message);
      throw new Error(`Faucet falló: ${error.message}`);
    }
  }

  /**
   * Mintear tokens (solo owner)
   */
  async mint(to: string, amount: string): Promise<any> {
    if (!this.contractWithSigner) {
      throw new Error('No hay wallet configurada. Agrega PRIVATE_KEY en .env');
    }

    try {
      const amountInWei = ethers.parseUnits(amount, 6);
      this.logger.log(`Minteando ${amount} USDC a ${to}...`);
      
      const tx = await this.contractWithSigner.mint(to, amountInWei);
      this.logger.log(`Transacción enviada: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transacción confirmada en bloque: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: Number(receipt.blockNumber),
        to,
        amount: `${amount} USDC`,
      };
    } catch (error) {
      this.logger.error('Error en mint:', error.message);
      throw new Error(`Mint falló: ${error.message}`);
    }
  }

  /**
   * Transferir tokens
   */
  async transfer(to: string, amount: string): Promise<any> {
    if (!this.contractWithSigner) {
      throw new Error('No hay wallet configurada. Agrega PRIVATE_KEY en .env');
    }

    try {
      const amountInWei = ethers.parseUnits(amount, 6);
      this.logger.log(`Transfiriendo ${amount} USDC a ${to}...`);
      
      const tx = await this.contractWithSigner.transfer(to, amountInWei);
      this.logger.log(`Transacción enviada: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transacción confirmada en bloque: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: Number(receipt.blockNumber),
        from: this.wallet!.address,
        to,
        amount: `${amount} USDC`,
      };
    } catch (error) {
      this.logger.error('Error en transfer:', error.message);
      throw new Error(`Transfer falló: ${error.message}`);
    }
  }

  /**
   * Aprobar gasto de tokens
   */
  async approve(spender: string, amount: string): Promise<any> {
    if (!this.contractWithSigner) {
      throw new Error('No hay wallet configurada. Agrega PRIVATE_KEY en .env');
    }

    try {
      const amountInWei = ethers.parseUnits(amount, 6);
      this.logger.log(`Aprobando ${amount} USDC para ${spender}...`);
      
      const tx = await this.contractWithSigner.approve(spender, amountInWei);
      this.logger.log(`Transacción enviada: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transacción confirmada en bloque: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: Number(receipt.blockNumber),
        owner: this.wallet!.address,
        spender,
        amount: `${amount} USDC`,
      };
    } catch (error) {
      this.logger.error('Error en approve:', error.message);
      throw new Error(`Approve falló: ${error.message}`);
    }
  }

  /**
   * Quemar tokens
   */
  async burn(amount: string): Promise<any> {
    if (!this.contractWithSigner) {
      throw new Error('No hay wallet configurada. Agrega PRIVATE_KEY en .env');
    }

    try {
      const amountInWei = ethers.parseUnits(amount, 6);
      this.logger.log(`Quemando ${amount} USDC...`);
      
      const tx = await this.contractWithSigner.burn(amountInWei);
      this.logger.log(`Transacción enviada: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transacción confirmada en bloque: ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: Number(receipt.blockNumber),
        from: this.wallet!.address,
        amount: `${amount} USDC`,
      };
    } catch (error) {
      this.logger.error('Error en burn:', error.message);
      throw new Error(`Burn falló: ${error.message}`);
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

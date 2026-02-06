import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { CHAT_AI_CONFIG } from '../config/chat-ai.config';
import { AiChatSession, ChannelState } from '../interfaces/chat-ai.interface';

/**
 * 🌐 SERVICIO DE YELLOW NETWORK STATE CHANNELS
 * Maneja la conexión y state channels con Yellow Network
 */
@Injectable()
export class YellowChannelService {
  private readonly logger = new Logger(YellowChannelService.name);
  private ws: WebSocket | null = null;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private connected: boolean = false;
  private messageCallbacks: Map<string, (data: any) => void> = new Map();

  constructor() {
    // Inicializar provider y wallet solo si hay PROVIDER_PRIVATE_KEY
    const privateKey = process.env.PROVIDER_PRIVATE_KEY;
    
    if (privateKey && privateKey.length > 0) {
      this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.logger.log('Yellow Channel Service initialized');
      this.logger.log(`Provider address: ${this.wallet.address}`);
    } else {
      this.logger.warn('⚠️ Yellow Channel Service initialized in MOCK mode (no PROVIDER_PRIVATE_KEY)');
      this.logger.warn('⚠️ State channels will be simulated. Set PROVIDER_PRIVATE_KEY for production.');
      // @ts-ignore - Permitir null en modo mock
      this.provider = null;
      // @ts-ignore
      this.wallet = null;
    }
  }

  /**
   * 🔌 CONECTAR A YELLOW NETWORK
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    // Si no hay wallet, trabajar en modo mock
    if (!this.wallet) {
      this.logger.warn('⚠️ Working in MOCK mode - Yellow Network disabled');
      this.connected = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Usar sandbox para desarrollo
        const wsUrl = process.env.NODE_ENV === 'production' 
          ? CHAT_AI_CONFIG.YELLOW.PRODUCTION_WS 
          : CHAT_AI_CONFIG.YELLOW.SANDBOX_WS;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.connected = true;
          this.logger.log('✅ Connected to Yellow Network');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          this.logger.error('WebSocket error:', error);
          this.connected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          this.logger.warn('WebSocket connection closed');
          this.connected = false;
        };
      } catch (error) {
        this.logger.error('Failed to connect to Yellow Network:', error);
        reject(error);
      }
    });
  }

  /**
   * 📨 MANEJAR MENSAJES DEL SERVIDOR
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.logger.debug('Received message:', message);

      // Ejecutar callback si existe
      if (message.id && this.messageCallbacks.has(message.id)) {
        const callback = this.messageCallbacks.get(message.id);
        if (callback) {
          callback(message);
          this.messageCallbacks.delete(message.id);
        }
      }
    } catch (error) {
      this.logger.error('Error parsing message:', error);
    }
  }

  /**
   * 📤 ENVIAR MENSAJE Y ESPERAR RESPUESTA
   */
  private async sendMessage(message: any): Promise<any> {
    if (!this.ws || !this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const messageId = `msg_${Date.now()}_${Math.random()}`;
      const messageWithId = { ...message, id: messageId };

      // Registrar callback
      this.messageCallbacks.set(messageId, (response) => {
        resolve(response);
      });

      // Enviar mensaje
      this.ws?.send(JSON.stringify(messageWithId));

      // Timeout después de 30 segundos
      setTimeout(() => {
        if (this.messageCallbacks.has(messageId)) {
          this.messageCallbacks.delete(messageId);
          reject(new Error('Message timeout'));
        }
      }, 30000);
    });
  }

  /**
   * 🆕 CREAR STATE CHANNEL
   */
  async createChannel(userAddress: string, depositAmount: bigint): Promise<AiChatSession> {
    this.logger.log(`Creating channel for ${userAddress} with ${depositAmount.toString()} tokens`);

    // Si no hay wallet, crear sesión mock
    if (!this.wallet) {
      const channelId = `mock_channel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      this.logger.warn(`⚠️ MOCK: Created mock channel ${channelId}`);
      
      return {
        channelId,
        userAddress,
        balance: depositAmount,
        nonce: 0,
        status: 'OPEN',
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
    }

    // Crear mensaje de creación de canal siguiendo el protocolo de Yellow
    const createChannelMessage = {
      jsonrpc: '2.0',
      method: 'create_channel',
      params: {
        chain_id: CHAT_AI_CONFIG.YELLOW.CHAIN_ID,
        token: process.env.CONTRACT_ADDRESS, // MockUSDC
        participants: [userAddress, this.wallet.address],
        app_definition: 'ai-chat-v1',
        allocate_amount: depositAmount.toString(),
      },
    };

    const response = await this.sendMessage(createChannelMessage);

    if (response.error) {
      throw new Error(`Failed to create channel: ${response.error.message}`);
    }

    const channelId = response.result.channel_id;

    const session: AiChatSession = {
      channelId,
      userAddress,
      balance: depositAmount,
      nonce: 0,
      status: 'OPEN',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.logger.log(`✅ Channel created: ${channelId}`);
    return session;
  }

  /**
   * 💰 ACTUALIZAR ESTADO DEL CANAL (OFF-CHAIN)
   */
  async updateChannelState(
    channelId: string,
    newBalance: bigint,
    nonce: number,
  ): Promise<ChannelState> {
    this.logger.debug(`Updating channel ${channelId} state: balance=${newBalance}, nonce=${nonce}`);

    // Crear estado actualizado firmado por el proveedor
    const state = {
      channelId,
      userBalance: newBalance,
      providerBalance: 0n, // El provider acumula los pagos
      nonce,
    };

    // Si no hay wallet, retornar estado mock
    if (!this.wallet) {
      return {
        ...state,
        signature: '0xmock_signature',
      };
    }

    // Firmar el estado
    const stateHash = ethers.solidityPackedKeccak256(
      ['string', 'uint256', 'uint256', 'uint256'],
      [channelId, newBalance, 0, nonce],
    );

    const signature = await this.wallet.signMessage(ethers.getBytes(stateHash));

    return {
      ...state,
      signature,
    };
  }

  /**
   * 🔒 CERRAR CANAL COOPERATIVAMENTE
   */
  async closeChannel(channelId: string, finalState: ChannelState): Promise<boolean> {
    this.logger.log(`Closing channel ${channelId}`);

    // Si no hay wallet, simular cierre
    if (!this.wallet) {
      this.logger.warn(`⚠️ MOCK: Closed mock channel ${channelId}`);
      return true;
    }

    const closeMessage = {
      jsonrpc: '2.0',
      method: 'close_channel',
      params: {
        channel_id: channelId,
        final_state: {
          user_balance: finalState.userBalance.toString(),
          provider_balance: finalState.providerBalance.toString(),
          nonce: finalState.nonce,
        },
        signature: finalState.signature,
      },
    };

    const response = await this.sendMessage(closeMessage);

    if (response.error) {
      throw new Error(`Failed to close channel: ${response.error.message}`);
    }

    this.logger.log(`✅ Channel closed: ${channelId}`);
    return true;
  }

  /**
   * ⚠️ CHALLENGE (Para disputas)
   */
  async challengeChannel(channelId: string, lastValidState: ChannelState): Promise<string> {
    this.logger.warn(`Challenging channel ${channelId}`);

    // Enviar challenge on-chain
    const challengeMessage = {
      jsonrpc: '2.0',
      method: 'challenge',
      params: {
        channel_id: channelId,
        state: {
          user_balance: lastValidState.userBalance.toString(),
          provider_balance: lastValidState.providerBalance.toString(),
          nonce: lastValidState.nonce,
        },
        signature: lastValidState.signature,
      },
    };

    const response = await this.sendMessage(challengeMessage);

    if (response.error) {
      throw new Error(`Failed to challenge: ${response.error.message}`);
    }

    return response.result.transaction_hash;
  }

  /**
   * 🔍 VERIFICAR ESTADO DEL CANAL
   */
  async getChannelInfo(channelId: string): Promise<any> {
    const message = {
      jsonrpc: '2.0',
      method: 'get_channel',
      params: {
        channel_id: channelId,
      },
    };

    const response = await this.sendMessage(message);

    if (response.error) {
      throw new Error(`Failed to get channel info: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * 🔌 DESCONECTAR
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
      this.logger.log('Disconnected from Yellow Network');
    }
  }
}

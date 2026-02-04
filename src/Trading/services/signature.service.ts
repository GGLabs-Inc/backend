import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

/**
 * ✍️ SERVICIO DE VERIFICACIÓN DE FIRMAS
 * Verifica firmas ECDSA de traders para operaciones off-chain
 */
@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  /**
   * ✅ VERIFICAR FIRMA DE ORDEN
   */
  verifyOrderSignature(
    orderId: string,
    trader: string,
    market: string,
    side: string,
    size: number,
    price: number | undefined,
    leverage: number,
    signature: string,
  ): boolean {
    try {
      // Construir mensaje firmado
      const message = this.buildOrderMessage(orderId, market, side, size, price, leverage);
      
      // Recuperar dirección del firmante
      const recoveredAddress = this.recoverSigner(message, signature);
      
      // Verificar que coincida con el trader
      const isValid = recoveredAddress.toLowerCase() === trader.toLowerCase();
      
      if (!isValid) {
        this.logger.warn(`Invalid signature for order ${orderId}. Expected: ${trader}, Got: ${recoveredAddress}`);
      }
      
      return isValid;
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * ✅ VERIFICAR FIRMA DE CANCELACIÓN
   */
  verifyCancelSignature(orderId: string, trader: string, signature: string): boolean {
    try {
      const message = `Cancel order: ${orderId}`;
      const recoveredAddress = this.recoverSigner(message, signature);
      return recoveredAddress.toLowerCase() === trader.toLowerCase();
    } catch (error) {
      this.logger.error(`Cancel signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * ✅ VERIFICAR FIRMA DE RETIRO
   */
  verifyWithdrawSignature(trader: string, amount: number, nonce: number, signature: string): boolean {
    try {
      const message = `Withdraw: ${amount} USDC, Nonce: ${nonce}`;
      const recoveredAddress = this.recoverSigner(message, signature);
      return recoveredAddress.toLowerCase() === trader.toLowerCase();
    } catch (error) {
      this.logger.error(`Withdraw signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 🔐 RECUPERAR DIRECCIÓN DEL FIRMANTE
   */
  private recoverSigner(message: string, signature: string): string {
    // Agregar prefijo de MetaMask
    const messageHash = ethers.hashMessage(message);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    return recoveredAddress;
  }

  /**
   * 📝 CONSTRUIR MENSAJE DE ORDEN
   */
  private buildOrderMessage(
    orderId: string,
    market: string,
    side: string,
    size: number,
    price: number | undefined,
    leverage: number,
  ): string {
    const priceStr = price !== undefined ? ` at $${price}` : ' at market';
    return `Order ${orderId}: ${side} ${size} USD of ${market}${priceStr} with ${leverage}x leverage`;
  }
}

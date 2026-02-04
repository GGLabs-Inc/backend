import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { SignatureValidation } from '../interfaces/chess.interface';

/**
 * 🔐 SERVICIO DE VERIFICACIÓN DE FIRMAS ECDSA
 * Implementa verificación criptográfica de mensajes firmados
 * Usa ethers.js para recuperar la dirección del firmante
 */
@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  /**
   * ✅ VERIFICAR FIRMA ECDSA
   * @param message - Mensaje original que fue firmado
   * @param signature - Firma en formato hex (0x...)
   * @returns Validación con dirección recuperada
   */
  async verifySignature(
    message: string,
    signature: string,
  ): Promise<SignatureValidation> {
    try {
      // 1. Preparar mensaje (EIP-191 prefix)
      const messageHash = ethers.hashMessage(message);

      // 2. Recuperar dirección pública del firmante
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);

      this.logger.debug(`Message: ${message}`);
      this.logger.debug(`Signature: ${signature}`);
      this.logger.debug(`Recovered Address: ${recoveredAddress}`);

      return {
        isValid: true,
        recoveredAddress,
        message,
      };
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return {
        isValid: false,
        recoveredAddress: '',
        message: error.message,
      };
    }
  }

  /**
   * 📝 CREAR MENSAJE PARA FIRMAR
   * Genera el mensaje que el frontend debe firmar
   */
  createMessage(action: string, params: Record<string, any>): string {
    const entries = Object.entries(params)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');

    return `${action} | ${entries}`;
  }

  /**
   * 🔍 VALIDAR DIRECCIÓN ETHEREUM
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * 🔐 VERIFICAR FIRMA CON DIRECCIÓN ESPERADA
   * Útil cuando ya sabemos quién debería haber firmado
   */
  async verifySignatureWithExpectedAddress(
    message: string,
    signature: string,
    expectedAddress: string,
  ): Promise<boolean> {
    const validation = await this.verifySignature(message, signature);

    if (!validation.isValid) {
      return false;
    }

    return (
      validation.recoveredAddress.toLowerCase() ===
      expectedAddress.toLowerCase()
    );
  }

  /**
   * 🎲 GENERAR NONCE
   * Para prevenir replay attacks
   */
  generateNonce(): number {
    return Date.now() + Math.floor(Math.random() * 1000000);
  }
}

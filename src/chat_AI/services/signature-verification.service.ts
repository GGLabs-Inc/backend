import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { SessionKey, SignedMessage } from '../interfaces/chat-ai.interface';

/**
 * 🔐 SERVICIO DE VERIFICACIÓN DE FIRMAS
 * Verifica firmas ECDSA y session keys
 */
@Injectable()
export class SignatureVerificationService {
  private readonly logger = new Logger(SignatureVerificationService.name);

  /**
   * ✅ VERIFICAR FIRMA DE SESSION KEY
   */
  verifySessionKeySignature(sessionKey: SessionKey, signature: string): boolean {
    try {
      // Construir mensaje que el usuario firmó
      const message = this.buildSessionKeyMessage(sessionKey);

      // Recuperar dirección del firmante
      const recoveredAddress = ethers.verifyMessage(message, signature);

      // Verificar que coincide con la dirección del usuario
      const isValid = recoveredAddress.toLowerCase() === sessionKey.userAddress.toLowerCase();

      if (isValid) {
        this.logger.log(`✅ Session key signature verified for ${sessionKey.userAddress}`);
      } else {
        this.logger.warn(`❌ Invalid session key signature for ${sessionKey.userAddress}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying session key signature:', error);
      return false;
    }
  }

  /**
   * ✅ VERIFICAR FIRMA DE CONSULTA AI
   */
  verifyQuerySignature(signedMessage: SignedMessage, sessionKeyAddress: string): boolean {
    try {
      // Construir mensaje de la consulta
      const message = this.buildQueryMessage(signedMessage.message);

      // Recuperar dirección del firmante
      const recoveredAddress = ethers.verifyMessage(message, signedMessage.signature);

      // Verificar que coincide con la session key
      const isValid = recoveredAddress.toLowerCase() === sessionKeyAddress.toLowerCase();

      if (!isValid) {
        this.logger.warn('❌ Invalid query signature');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying query signature:', error);
      return false;
    }
  }

  /**
   * ✅ VERIFICAR SESSION KEY VÁLIDA
   */
  isSessionKeyValid(sessionKey: SessionKey): boolean {
    // Verificar que no haya expirado
    const now = Date.now();
    if (now > sessionKey.expiry) {
      this.logger.warn('❌ Session key expired');
      return false;
    }

    // Verificar permisos
    const requiredPermissions = ['ai.query', 'ai.payment'];
    const hasPermissions = requiredPermissions.every(perm => 
      sessionKey.permissions.includes(perm)
    );

    if (!hasPermissions) {
      this.logger.warn('❌ Session key missing required permissions');
      return false;
    }

    return true;
  }

  /**
   * 🔨 CONSTRUIR MENSAJE DE SESSION KEY
   */
  private buildSessionKeyMessage(sessionKey: SessionKey): string {
    return [
      'AI Chat Session Key Authorization',
      `Session Key Address: ${sessionKey.address}`,
      `User Address: ${sessionKey.userAddress}`,
      `Expiry: ${sessionKey.expiry}`,
      `Permissions: ${sessionKey.permissions.join(', ')}`,
      `Max Amount: ${sessionKey.maxAmount.toString()} USDC`,
    ].join('\n');
  }

  /**
   * 🔨 CONSTRUIR MENSAJE DE CONSULTA
   */
  private buildQueryMessage(query: any): string {
    return JSON.stringify({
      sessionId: query.sessionId,
      nonce: query.nonce,
      modelId: query.modelId,
      prompt: query.prompt,
      maxCost: query.maxCost.toString(),
      timestamp: query.timestamp,
    });
  }

  /**
   * 📝 CREAR MENSAJE PARA FIRMAR (FRONTEND)
   * Helper para generar el mensaje exacto que el frontend debe firmar
   */
  generateSessionKeyMessageToSign(
    sessionKeyAddress: string,
    userAddress: string,
    expiry: number,
    permissions: string[],
    maxAmount: bigint,
  ): string {
    return this.buildSessionKeyMessage({
      address: sessionKeyAddress,
      userAddress,
      expiry,
      permissions,
      maxAmount,
      message: '',
    });
  }
}

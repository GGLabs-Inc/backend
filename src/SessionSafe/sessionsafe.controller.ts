import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SessionSafeService } from './sessionsafe.service';
import {
  DepositDto,
  SettleDto,
  EmergencyWithdrawDto,
  GetSessionDto,
} from './dto/sessionsafe.dto';

@Controller('sessionsafe')
export class SessionSafeController {
  constructor(private readonly sessionSafeService: SessionSafeService) {}

  // ==================== INFORMACIÓN GENERAL ====================

  /**
   * GET /sessionsafe/info
   * Obtener información general del contrato SessionSafe
   */
  @Get('info')
  async getContractInfo() {
    const [owner, paymentToken, serviceProvider, totalSessions, totalVolume] = await Promise.all([
      this.sessionSafeService.getOwner(),
      this.sessionSafeService.getPaymentToken(),
      this.sessionSafeService.getServiceProvider(),
      this.sessionSafeService.getTotalSessions(),
      this.sessionSafeService.getTotalVolume(),
    ]);

    return {
      owner,
      paymentToken,
      serviceProvider,
      totalSessions,
      totalVolume,
    };
  }

  /**
   * GET /sessionsafe/wallet
   * Obtener información de la wallet conectada
   */
  @Get('wallet')
  getWalletInfo() {
    return this.sessionSafeService.getWalletInfo();
  }

  /**
   * GET /sessionsafe/stats
   * Obtener estadísticas del contrato
   */
  @Get('stats')
  async getStats() {
    const [totalSessions, totalVolume] = await Promise.all([
      this.sessionSafeService.getTotalSessions(),
      this.sessionSafeService.getTotalVolume(),
    ]);

    return {
      totalSessions,
      totalVolume,
    };
  }

  // ==================== FUNCIONES DE LECTURA DE SESIONES ====================

  /**
   * GET /sessionsafe/session/:sessionId
   * Obtener detalles de una sesión
   */
  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const session = await this.sessionSafeService.getSession(sessionId);
    return {
      sessionId,
      ...session,
    };
  }

  /**
   * GET /sessionsafe/session/:sessionId/active
   * Verificar si una sesión está activa
   */
  @Get('session/:sessionId/active')
  async isSessionActive(@Param('sessionId') sessionId: string) {
    const isActive = await this.sessionSafeService.isSessionActive(sessionId);
    return {
      sessionId,
      isActive,
    };
  }

  /**
   * GET /sessionsafe/session/:sessionId/details
   * Obtener detalles desde el mapping público
   */
  @Get('session/:sessionId/details')
  async getSessionDetails(@Param('sessionId') sessionId: string) {
    const session = await this.sessionSafeService.getSessionFromMapping(sessionId);
    return {
      sessionId,
      ...session,
    };
  }

  // ==================== FUNCIONES DE ESCRITURA ====================

  /**
   * POST /sessionsafe/deposit
   * Depositar fondos para crear una sesión
   */
  @Post('deposit')
  async deposit(@Body() depositDto: DepositDto) {
    return await this.sessionSafeService.deposit(depositDto.amount);
  }

  /**
   * POST /sessionsafe/settle
   * Liquidar una sesión con firmas
   */
  @Post('settle')
  async settle(@Body() settleDto: SettleDto) {
    return await this.sessionSafeService.settle(
      settleDto.sessionId,
      settleDto.finalBalance,
      settleDto.backendSig,
      settleDto.userSig,
    );
  }

  /**
   * POST /sessionsafe/emergency-withdraw
   * Retiro de emergencia (solo owner)
   */
  @Post('emergency-withdraw')
  async emergencyWithdraw(@Body() withdrawDto: EmergencyWithdrawDto) {
    return await this.sessionSafeService.emergencyWithdraw(
      withdrawDto.token,
      withdrawDto.amount,
    );
  }

  // ==================== ENDPOINTS DE UTILIDAD ====================

  /**
   * GET /sessionsafe/payment-token
   * Obtener dirección del token de pago
   */
  @Get('payment-token')
  async getPaymentToken() {
    const token = await this.sessionSafeService.getPaymentToken();
    return { paymentToken: token };
  }

  /**
   * GET /sessionsafe/service-provider
   * Obtener dirección del proveedor de servicio
   */
  @Get('service-provider')
  async getServiceProvider() {
    const provider = await this.sessionSafeService.getServiceProvider();
    return { serviceProvider: provider };
  }

  /**
   * GET /sessionsafe/owner
   * Obtener dirección del owner del contrato
   */
  @Get('owner')
  async getOwner() {
    const owner = await this.sessionSafeService.getOwner();
    return { owner };
  }
}

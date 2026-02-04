import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MockUSDCService } from './mockusdc.service';
import {
  MintDto,
  TransferDto,
  BurnDto,
  ApproveDto,
  AllowanceDto,
  BalanceOfDto,
} from './dto/mockusdc.dto';

@Controller('mockusdc')
export class MockUSDCController {
  constructor(private readonly mockUSDCService: MockUSDCService) {}

  // ==================== INFORMACIÓN GENERAL ====================

  /**
   * GET /blockchain/info
   * Obtener información general del token
   */
  @Get('info')
  async getTokenInfo() {
    const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
      this.mockUSDCService.getName(),
      this.mockUSDCService.getSymbol(),
      this.mockUSDCService.getDecimals(),
      this.mockUSDCService.getTotalSupply(),
      this.mockUSDCService.getOwner(),
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply,
      owner,
    };
  }

  /**
   * GET /blockchain/wallet
   * Obtener información de la wallet conectada
   */
  @Get('wallet')
  getWalletInfo() {
    return this.mockUSDCService.getWalletInfo();
  }

  // ==================== FUNCIONES DE LECTURA ====================

  /**
   * GET /blockchain/balance/:address
   * Obtener balance de una dirección
   */
  @Get('balance/:address')
  async getBalance(@Param('address') address: string) {
    const balance = await this.mockUSDCService.balanceOf(address);
    return {
      address,
      balance,
      symbol: 'MUSDC',
    };
  }

  /**
   * GET /blockchain/allowance
   * Obtener cantidad aprobada
   * Query params: owner, spender
   */
  @Get('allowance')
  async getAllowance(@Query() query: AllowanceDto) {
    const allowance = await this.mockUSDCService.allowance(
      query.owner,
      query.spender,
    );
    return {
      owner: query.owner,
      spender: query.spender,
      allowance,
      symbol: 'MUSDC',
    };
  }

  /**
   * GET /blockchain/faucet/status/:address
   * Verificar si una dirección puede usar el faucet
   */
  @Get('faucet/status/:address')
  async getFaucetStatus(@Param('address') address: string) {
    const [canUse, timeRemaining, lastMintTime] = await Promise.all([
      this.mockUSDCService.canUseFaucet(address),
      this.mockUSDCService.getTimeUntilNextFaucet(address),
      this.mockUSDCService.getLastMintTime(address),
    ]);

    return {
      address,
      canUseFaucet: canUse,
      timeRemainingSeconds: timeRemaining,
      lastMintTime: lastMintTime === 0 ? 'Nunca' : new Date(lastMintTime * 1000).toISOString(),
      nextAvailable: lastMintTime === 0 
        ? 'Disponible ahora' 
        : new Date((lastMintTime + 3600) * 1000).toISOString(),
    };
  }

  // ==================== FUNCIONES DE ESCRITURA ====================

  /**
   * POST /blockchain/faucet
   * Usar el faucet (mintear 1000 USDC gratis)
   */
  @Post('faucet')
  async useFaucet() {
    return await this.mockUSDCService.faucet();
  }

  /**
   * POST /blockchain/mint
   * Mintear tokens (solo owner)
   */
  @Post('mint')
  async mint(@Body() mintDto: MintDto) {
    return await this.mockUSDCService.mint(mintDto.to, mintDto.amount);
  }

  /**
   * POST /blockchain/transfer
   * Transferir tokens
   */
  @Post('transfer')
  async transfer(@Body() transferDto: TransferDto) {
    return await this.mockUSDCService.transfer(
      transferDto.to,
      transferDto.amount,
    );
  }

  /**
   * POST /blockchain/approve
   * Aprobar gasto de tokens
   */
  @Post('approve')
  async approve(@Body() approveDto: ApproveDto) {
    return await this.mockUSDCService.approve(
      approveDto.spender,
      approveDto.amount,
    );
  }

  /**
   * POST /blockchain/burn
   * Quemar tokens
   */
  @Post('burn')
  async burn(@Body() burnDto: BurnDto) {
    return await this.mockUSDCService.burn(burnDto.amount);
  }
}

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import {
  MintDto,
  TransferDto,
  BurnDto,
  ApproveDto,
  AllowanceDto,
  BalanceOfDto,
} from './dto/blockchain.dto';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  // ==================== INFORMACIÓN GENERAL ====================

  /**
   * GET /blockchain/info
   * Obtener información general del token
   */
  @Get('info')
  async getTokenInfo() {
    const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
      this.blockchainService.getName(),
      this.blockchainService.getSymbol(),
      this.blockchainService.getDecimals(),
      this.blockchainService.getTotalSupply(),
      this.blockchainService.getOwner(),
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
    return this.blockchainService.getWalletInfo();
  }

  // ==================== FUNCIONES DE LECTURA ====================

  /**
   * GET /blockchain/balance/:address
   * Obtener balance de una dirección
   */
  @Get('balance/:address')
  async getBalance(@Param('address') address: string) {
    const balance = await this.blockchainService.balanceOf(address);
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
    const allowance = await this.blockchainService.allowance(
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
      this.blockchainService.canUseFaucet(address),
      this.blockchainService.getTimeUntilNextFaucet(address),
      this.blockchainService.getLastMintTime(address),
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
    return await this.blockchainService.faucet();
  }

  /**
   * POST /blockchain/mint
   * Mintear tokens (solo owner)
   */
  @Post('mint')
  async mint(@Body() mintDto: MintDto) {
    return await this.blockchainService.mint(mintDto.to, mintDto.amount);
  }

  /**
   * POST /blockchain/transfer
   * Transferir tokens
   */
  @Post('transfer')
  async transfer(@Body() transferDto: TransferDto) {
    return await this.blockchainService.transfer(
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
    return await this.blockchainService.approve(
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
    return await this.blockchainService.burn(burnDto.amount);
  }
}

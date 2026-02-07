import { Controller, Post, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIRequestDto } from '../Yellow/yellow.dto';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('status')
  getStatus() {
    return { status: 'AI Service is Online', cost: '0.1 USDC' };
  }

  @Post('inference')
  async runInference(@Body() body: AIRequestDto) {
    console.log("📥 [AI Controller] Recibido POST /inference", JSON.stringify(body));
    try {
      return await this.aiService.processInference(body);
    } catch (error) {
      console.error("❌ [AI Controller] Error:", error.message);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

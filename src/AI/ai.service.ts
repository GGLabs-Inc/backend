import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { YellowService } from '../Yellow/yellow.service';
import { AIRequestDto, AIResponseDto } from '../Yellow/yellow.dto';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  
  // Costo por inferencia (0.1 USDC asumiendo 6 decimales = 100,000 unidades)
  private readonly INFERENCE_COST = 100000n; 
  private readonly DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

  constructor(
    private readonly yellowService: YellowService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  async processInference(request: AIRequestDto): Promise<AIResponseDto> {
    const { prompt, signedState } = request;

    this.logger.log(`💰 Procesando pago por AI request: "${prompt.substring(0, 20)}..."`);

    // 1. Validar el pago Off-Chain
    const serverSignature = await this.yellowService.validateAndSignState(
      signedState, 
      this.INFERENCE_COST
    );

    // 2. Ejecutar la Lógica de Negocio (AI Inferencia)
    const aiResult = await this.callDeepSeek(prompt);

    return {
      result: aiResult,
      newServerSignature: serverSignature 
    };
  }

  private async callDeepSeek(prompt: string): Promise<string> {
    try {
      const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
      
      const payload = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: "You are a helpful assistant for YellowMeter OS." },
            { role: "user", content: prompt }
        ],
        stream: false
      };

      const { data } = await firstValueFrom(
        this.httpService.post(this.DEEPSEEK_URL, payload, {
          headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json' 
          }
        })
      );

      return data.choices?.[0]?.message?.content || "No response content";
    } catch (error) {
      this.logger.error('DeepSeek connection failed, using simulation.', error.message);
      return this.simulateAI(prompt);
    }
  }

  private simulateAI(prompt: string): string {
    const responses = [
      "El mercado parece alcista basado en los últimos bloques.",
      "Análisis de riesgo completo: Posición segura.",
      "Detecté una oportunidad de arbitraje en el par ETH/USDC."
    ];
    return `[YellowAI (Simulated)]: ${responses[Math.floor(Math.random() * responses.length)]} (Input: ${prompt})`;
  }
}

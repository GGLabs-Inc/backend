import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CHAT_AI_CONFIG } from '../config/chat-ai.config';
import { AiModelInfo } from '../interfaces/chat-ai.interface';

/**
 * 🤖 SERVICIO DE PROVEEDORES DE IA
 * Integra múltiples APIs de IA (OpenAI, Anthropic, Google, Deepseek)
 */
@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  /**
   * 🔍 OBTENER INFO DE MODELO
   */
  getModelInfo(modelId: string): AiModelInfo {
    const model = CHAT_AI_CONFIG.MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new BadRequestException(`Model ${modelId} not found`);
    }
    return model;
  }

  /**
   * 💬 REALIZAR CONSULTA A IA
   */
  async query(modelId: string, prompt: string): Promise<{ response: string; tokensUsed: number }> {
    const model = this.getModelInfo(modelId);

    this.logger.log(`Querying ${model.provider} with model ${modelId}`);

    try {
      switch (model.provider) {
        case 'openai':
          return await this.queryOpenAI(modelId, prompt);
        case 'anthropic':
          return await this.queryAnthropic(modelId, prompt);
        case 'google':
          return await this.queryGoogle(modelId, prompt);
        case 'deepseek':
          return await this.queryDeepseek(modelId, prompt);
        default:
          throw new BadRequestException(`Provider ${model.provider} not supported`);
      }
    } catch (error) {
      // 🔄 FALLBACK: Si falla por falta de API key, usar Deepseek
      if (error.message.includes('not configured')) {
        this.logger.warn(`⚠️ ${model.provider} API key not configured, using Deepseek as fallback`);
        return await this.queryDeepseek(modelId, prompt);
      }
      
      this.logger.error(`Error querying ${model.provider}:`, error);
      throw new BadRequestException(`Failed to query AI: ${error.message}`);
    }
  }

  /**
   * 🟢 OPENAI API
   */
  private async queryOpenAI(modelId: string, prompt: string): Promise<{ response: string; tokensUsed: number }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('⚠️ OPENAI_API_KEY not configured');
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch(`${CHAT_AI_CONFIG.PROVIDERS.OPENAI.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId === 'auto' ? CHAT_AI_CONFIG.PROVIDERS.OPENAI.defaultModel : modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.getModelInfo(modelId).maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      response: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
    };
  }

  /**
   * 🟣 ANTHROPIC API
   */
  private async queryAnthropic(modelId: string, prompt: string): Promise<{ response: string; tokensUsed: number }> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('⚠️ ANTHROPIC_API_KEY not configured');
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await fetch(`${CHAT_AI_CONFIG.PROVIDERS.ANTHROPIC.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId === 'claude-sonnet-4.5' ? 'claude-sonnet-4-20250514' : CHAT_AI_CONFIG.PROVIDERS.ANTHROPIC.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.getModelInfo(modelId).maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      response: data.content[0].text,
      tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
    };
  }

  /**
   * 🔵 GOOGLE GEMINI API
   */
  private async queryGoogle(modelId: string, prompt: string): Promise<{ response: string; tokensUsed: number }> {
    const apiKey = process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      this.logger.warn('⚠️ GOOGLE_AI_KEY not configured');
      throw new Error('GOOGLE_AI_KEY not configured');
    }

    const model = modelId === 'gemini-2.0-flash' ? 'gemini-2.0-flash-exp' : 'gemini-1.5-pro';
    const url = `${CHAT_AI_CONFIG.PROVIDERS.GOOGLE.baseURL}/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      response: data.candidates[0].content.parts[0].text,
      tokensUsed: data.usageMetadata?.totalTokenCount || 0,
    };
  }

  /**
   * 🟠 DEEPSEEK API
   */
  private async queryDeepseek(modelId: string, prompt: string): Promise<{ response: string; tokensUsed: number }> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      this.logger.error('❌ DEEPSEEK_API_KEY not configured - This is required as fallback!');
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    this.logger.log(`🟠 Using Deepseek API (fallback mode)`);

    const response = await fetch(`${CHAT_AI_CONFIG.PROVIDERS.DEEPSEEK.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CHAT_AI_CONFIG.PROVIDERS.DEEPSEEK.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Deepseek API error: ${response.status} - ${errorText}`);
      throw new Error(`Deepseek API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      response: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    };
  }

  /**
   * 📊 LISTAR MODELOS DISPONIBLES
   */
  listModels(): AiModelInfo[] {
    return CHAT_AI_CONFIG.MODELS;
  }
}

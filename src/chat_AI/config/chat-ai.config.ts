import { AiModelInfo } from '../interfaces/chat-ai.interface';

export const CHAT_AI_CONFIG = {
  // 🌐 Yellow Network Configuration
  YELLOW: {
    SANDBOX_WS: 'wss://clearnet-sandbox.yellow.com/ws',
    PRODUCTION_WS: 'wss://clearnet.yellow.com/ws',
    CUSTODY_CONTRACT: '0x019B65A265EB3363822f2752141b3dF16131b262',
    ADJUDICATOR_CONTRACT: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2',
    CHAIN_ID: 11155111, // Sepolia
    CHALLENGE_DURATION: 3600, // 1 hora en segundos
  },

  // 🤖 AI Models Configuration
  MODELS: [
    {
      id: 'auto',
      name: 'Auto (Best)',
      provider: 'openai',
      cost: 0.02,
      maxTokens: 4096,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      cost: 0.03,
      maxTokens: 8192,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      cost: 0.01,
      maxTokens: 4096,
    },
    {
      id: 'claude-sonnet-4.5',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      cost: 0.03,
      maxTokens: 8192,
    },
    {
      id: 'claude-haiku-3.5',
      name: 'Claude Haiku 3.5',
      provider: 'anthropic',
      cost: 0.01,
      maxTokens: 4096,
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      cost: 0.008,
      maxTokens: 8192,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      cost: 0.02,
      maxTokens: 8192,
    },
    {
      id: 'deepseek-chat',
      name: 'Deepseek Chat',
      provider: 'deepseek',
      cost: 0.005,
      maxTokens: 4096,
    },
  ] as AiModelInfo[],

  // 💰 Session Configuration
  SESSION: {
    DEFAULT_DEPOSIT: '100000000', // 100 USDC (6 decimals)
    MIN_DEPOSIT: '10000000', // 10 USDC
    MAX_DEPOSIT: '1000000000', // 1000 USDC
    SESSION_KEY_EXPIRY: 3600000, // 1 hora en ms
    INACTIVITY_TIMEOUT: 1800000, // 30 minutos en ms
    MAX_QUERIES_PER_SESSION: 100,
    MOCK_MODE_ENABLED: !process.env.PROVIDER_PRIVATE_KEY, // Auto-detectar modo mock
  },

  // 🔐 Security
  SECURITY: {
    MAX_PROMPT_LENGTH: 10000,
    RATE_LIMIT_QUERIES: 10, // queries por minuto
    RATE_LIMIT_WINDOW: 60000, // 1 minuto en ms
  },

  // 📊 Storage
  STORAGE: {
    MAX_MESSAGES_PER_SESSION: 50,
    MESSAGE_RETENTION_DAYS: 7,
  },

  // 🔧 Provider API Endpoints
  PROVIDERS: {
    OPENAI: {
      baseURL: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
    },
    ANTHROPIC: {
      baseURL: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-3-5-haiku-20241022',
    },
    GOOGLE: {
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-2.0-flash-exp',
    },
    DEEPSEEK: {
      baseURL: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat',
    },
  },
};

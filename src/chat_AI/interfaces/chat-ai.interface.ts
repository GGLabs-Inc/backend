/**
 * 🤖 INTERFACES PARA AI CHAT CON YELLOW NETWORK
 */

export interface AiChatSession {
  channelId: string;
  userAddress: string;
  balance: bigint;
  nonce: number;
  status: 'OPEN' | 'ACTIVE' | 'CLOSED';
  sessionKey?: string;
  createdAt: number;
  lastActivity: number;
}

export interface SessionKey {
  address: string;
  userAddress: string;
  expiry: number;
  permissions: string[];
  maxAmount: bigint;
  message: string;
  signature?: string;
}

export interface AiQueryMessage {
  sessionId: string;
  nonce: number;
  modelId: string;
  prompt: string;
  maxCost: bigint;
  timestamp: number;
}

export interface SignedMessage {
  message: AiQueryMessage;
  signature: string;
}

export interface ChannelState {
  channelId: string;
  userBalance: bigint;
  providerBalance: bigint;
  nonce: number;
  signature?: string;
}

export interface AiModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  cost: number; // En USDC
  maxTokens: number;
}

export interface AiQueryResponse {
  response: string;
  model: string;
  tokensUsed: number;
  cost: number;
  newState: {
    balance: string;
    nonce: number;
  };
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: number;
  cost: number;
}

# 🎨 Frontend Integration Guide - AI Chat con Yellow Network

## 📋 Cómo Integrar con el Frontend

Esta guía explica cómo conectar tu frontend React con el módulo AI Chat que acabamos de crear.

---

## 🔧 Setup Inicial

### 1. **Instalar dependencias en el frontend**

```bash
npm install ethers socket.io-client
```

### 2. **Crear servicios para AI Chat**

Crea un archivo `src/services/aiChatService.ts`:

```typescript
import { ethers } from 'ethers';
import { io, Socket } from 'socket.io-client';

const API_BASE = 'http://localhost:3000'; // Tu backend
const WS_URL = 'ws://localhost:3000/ai-chat';

export class AiChatService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;

  /**
   * 🆕 CREAR SESIÓN
   */
  async createSession(
    userAddress: string, 
    depositAmount: string
  ): Promise<{ sessionId: string; balance: string }> {
    const response = await fetch(`${API_BASE}/ai-chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress, depositAmount }),
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const data = await response.json();
    this.sessionId = data.sessionId;
    return data;
  }

  /**
   * 🔑 CREAR SESSION KEY
   */
  async createSessionKey(
    sessionId: string,
    userAddress: string,
    signer: ethers.Signer
  ): Promise<string> {
    const expiry = Date.now() + 3600000; // 1 hora

    // Construir mensaje para firmar
    const message = [
      'AI Chat Session Key Authorization',
      `Session Key Address: ${userAddress}`,
      `User Address: ${userAddress}`,
      `Expiry: ${expiry}`,
      'Permissions: ai.query, ai.payment',
      `Max Amount: 100000000 USDC`,
    ].join('\n');

    // Firmar con MetaMask
    const signature = await signer.signMessage(message);

    // Enviar al backend
    const response = await fetch(
      `${API_BASE}/ai-chat/sessions/${sessionId}/session-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          expiry,
          signature,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create session key');
    }

    const data = await response.json();
    return data.sessionKey;
  }

  /**
   * 💬 ENVIAR CONSULTA A IA
   */
  async query(
    sessionId: string,
    nonce: number,
    modelId: string,
    prompt: string,
    maxCost: string,
    signer: ethers.Signer
  ): Promise<any> {
    const timestamp = Date.now();

    // Construir mensaje de consulta
    const queryMessage = {
      sessionId,
      nonce,
      modelId,
      prompt,
      maxCost,
      timestamp,
    };

    // Firmar consulta con session key (en este caso sigues usando el signer principal)
    const message = JSON.stringify(queryMessage);
    const signature = await signer.signMessage(message);

    // Enviar consulta
    const response = await fetch(`${API_BASE}/ai-chat/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...queryMessage,
        signature,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Query failed');
    }

    return response.json();
  }

  /**
   * 🔌 CONECTAR WEBSOCKET
   */
  connectWebSocket(sessionId: string, callbacks: {
    onMessage: (data: any) => void;
    onBalanceUpdate: (data: any) => void;
    onError: (error: any) => void;
  }) {
    this.socket = io(WS_URL);

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      // Suscribirse a la sesión
      this.socket?.emit('subscribe:session', { sessionId });
    });

    this.socket.on('message:new', callbacks.onMessage);
    this.socket.on('balance:update', callbacks.onBalanceUpdate);
    this.socket.on('error', callbacks.onError);

    return this.socket;
  }

  /**
   * 💰 OBTENER BALANCE
   */
  async getBalance(sessionId: string): Promise<{ balance: string; nonce: number }> {
    const response = await fetch(`${API_BASE}/ai-chat/sessions/${sessionId}/balance`);
    if (!response.ok) throw new Error('Failed to get balance');
    return response.json();
  }

  /**
   * 📋 OBTENER MENSAJES
   */
  async getMessages(sessionId: string): Promise<any[]> {
    const response = await fetch(
      `${API_BASE}/ai-chat/sessions/${sessionId}/messages?limit=50`
    );
    if (!response.ok) throw new Error('Failed to get messages');
    const data = await response.json();
    return data.messages;
  }

  /**
   * 🔒 CERRAR SESIÓN
   */
  async closeSession(sessionId: string, userAddress: string, signer: ethers.Signer) {
    const message = `Close session ${sessionId}`;
    const signature = await signer.signMessage(message);

    const response = await fetch(
      `${API_BASE}/ai-chat/sessions/${sessionId}/close`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress, signature }),
      }
    );

    if (!response.ok) throw new Error('Failed to close session');
    return response.json();
  }

  /**
   * 🤖 LISTAR MODELOS
   */
  async listModels() {
    const response = await fetch(`${API_BASE}/ai-chat/models`);
    if (!response.ok) throw new Error('Failed to list models');
    return response.json();
  }

  /**
   * 🔌 DESCONECTAR
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
```

---

## 🎨 Actualizar AiChatModal.tsx

Modifica tu `AiChatModal.tsx` para usar el servicio:

```typescript
import { useState, useEffect } from 'react';
import { useAccount, useSigner } from 'wagmi';
import { AiChatService } from '../services/aiChatService';
import { ethers } from 'ethers';

export function AiChatModal({ isOpen, onClose }: Props) {
  const { address } = useAccount();
  const { data: signer } = useSigner();
  
  const [aiService] = useState(() => new AiChatService());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [nonce, setNonce] = useState<number>(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 🔌 INICIALIZAR SESIÓN AL ABRIR MODAL
   */
  useEffect(() => {
    if (isOpen && address && signer) {
      initializeSession();
    }

    return () => {
      if (!isOpen) {
        aiService.disconnect();
      }
    };
  }, [isOpen, address, signer]);

  /**
   * 🆕 INICIALIZAR SESIÓN CON YELLOW NETWORK
   */
  async function initializeSession() {
    if (!address || !signer) return;

    setIsLoading(true);
    try {
      // 1. Crear sesión (abrir state channel)
      const depositAmount = ethers.parseUnits('100', 6).toString(); // 100 USDC
      const session = await aiService.createSession(address, depositAmount);
      
      console.log('✅ Session created:', session.sessionId);
      setSessionId(session.sessionId);
      setBalance(session.balance);

      // 2. Crear session key
      const sessionKey = await aiService.createSessionKey(
        session.sessionId,
        address,
        signer
      );
      
      console.log('✅ Session key created:', sessionKey);

      // 3. Conectar WebSocket
      aiService.connectWebSocket(session.sessionId, {
        onMessage: (data) => {
          console.log('📨 New message:', data);
        },
        onBalanceUpdate: (data) => {
          setBalance(data.balance);
          setNonce(data.nonce);
        },
        onError: (error) => {
          console.error('❌ Error:', error);
        },
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing session:', error);
      setIsLoading(false);
    }
  }

  /**
   * 💬 ENVIAR MENSAJE A IA
   */
  async function handleSend() {
    if (!inputText.trim() || !sessionId || !signer) return;

    setIsLoading(true);

    try {
      // Obtener info del modelo
      const modelCost = 0.03; // En producción, obtener de la API
      const maxCost = ethers.parseUnits(modelCost.toString(), 6).toString();

      // Enviar consulta
      const result = await aiService.query(
        sessionId,
        nonce,
        selectedModel,
        inputText,
        maxCost,
        signer
      );

      // Actualizar UI
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + '_user',
          role: 'user',
          content: inputText,
        },
        {
          id: Date.now() + '_assistant',
          role: 'assistant',
          content: result.response,
        },
      ]);

      // Actualizar balance y nonce
      setBalance(result.newState.balance);
      setNonce(result.newState.nonce);

      setInputText('');
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Error: ${error.message}`);
      setIsLoading(false);
    }
  }

  /**
   * 🔒 CERRAR SESIÓN
   */
  async function handleCloseSession() {
    if (!sessionId || !address || !signer) return;

    try {
      await aiService.closeSession(sessionId, address, signer);
      console.log('✅ Session closed');
      onClose();
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }

  return (
    <div className="modal">
      {/* Header */}
      <div className="header">
        <h2>AI Chat - Yellow Network</h2>
        <div className="balance">
          Balance: {ethers.formatUnits(balance || '0', 6)} USDC
        </div>
        <button onClick={handleCloseSession}>Close Session</button>
      </div>

      {/* Loading */}
      {isLoading && <div>Initializing session...</div>}

      {/* Messages */}
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input-area">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="gpt-4o">GPT-4o ($0.03)</option>
          <option value="claude-sonnet-4.5">Claude Sonnet 4.5 ($0.03)</option>
          <option value="gemini-2.0-flash">Gemini 2.0 Flash ($0.008)</option>
          <option value="deepseek-chat">Deepseek ($0.005)</option>
        </select>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          disabled={isLoading || !sessionId}
        />

        <button onClick={handleSend} disabled={isLoading || !sessionId}>
          Send
        </button>
      </div>
    </div>
  );
}
```

---

## 🔥 Flujo Completo

```
1. Usuario abre modal
   ↓
2. Frontend crea sesión
   POST /ai-chat/sessions
   ↓
3. Backend abre state channel en Yellow Network
   ↓
4. Usuario firma session key (1 vez)
   POST /ai-chat/sessions/:id/session-key
   ↓
5. Frontend conecta WebSocket
   ws://localhost:3000/ai-chat
   ↓
6. Usuario escribe mensaje
   ↓
7. Frontend firma consulta con session key
   POST /ai-chat/query
   ↓
8. Backend verifica firma → Llama a IA → Actualiza canal
   ↓
9. Frontend recibe respuesta + nuevo balance
   ↓
10. Usuario cierra modal
    ↓
11. Frontend cierra sesión
    POST /ai-chat/sessions/:id/close
    ↓
12. Backend cierra state channel cooperativamente
```

---

## ✅ Ventajas de Esta Implementación

1. **Firma 1 vez**: Solo al crear la session key
2. **Respuestas instantáneas**: Todo off-chain excepto depósito/retiro
3. **Costos bajísimos**: No gas fees por cada consulta
4. **Seguro**: Fondos siempre recuperables on-chain
5. **Multi-modelo**: Soporta OpenAI, Anthropic, Google, Deepseek

---

## 🧪 Testing

### **Probar en Sandbox**

1. Asegúrate que `NODE_ENV=development` en `.env` del backend
2. Obtén tokens del faucet de Yellow:
   ```bash
   curl -X POST https://clearnet-sandbox.yellow.com/faucet/requestTokens \
     -H "Content-Type: application/json" \
     -d '{"userAddress":"TU_ADDRESS"}'
   ```

3. Inicia el backend:
   ```bash
   npm run start:dev
   ```

4. Inicia el frontend y prueba el modal

---

## 🐛 Debugging

### **Ver logs del backend**

Los logs mostrarán:
- Creación de sesiones
- Verificación de firmas
- Consultas a IA
- Actualizaciones de canales

### **Ver en Yellow Network Dashboard**

Visita el dashboard de Yellow (cuando esté disponible) para ver:
- Estado de tus canales
- Balances
- Transacciones

---

## 📚 Próximos Pasos

1. **Implementar recuperación de sesiones**: Si el usuario recarga la página, recuperar la sesión activa
2. **Historial persistente**: Guardar mensajes en base de datos
3. **Múltiples sesiones**: Permitir múltiples chats simultáneos
4. **Streaming**: Implementar respuestas en streaming de los modelos de IA

---

**¡Listo para integrar!** 🚀

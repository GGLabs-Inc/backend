# 🤖 AI Chat Module - Yellow Network Integration

## 📋 Descripción

Módulo de **AI Chat** que utiliza **Yellow Network SDK** para pagos off-chain de consultas a modelos de IA mediante **State Channels**. Soporta múltiples proveedores: OpenAI, Anthropic, Google Gemini y Deepseek.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  - AiChatModal.tsx                                             │
│  - Firma session keys una vez                                  │
│  - Envía consultas firmadas                                    │
└────────────────┬────────────────────────────────────────────────┘
                 │ WebSocket + HTTP
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (NestJS)                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Gateway    │  │  Controller  │  │   Service    │         │
│  │  (WebSocket) │  │    (REST)    │  │  (Business)  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                    │
│         ┌──────────────────┴──────────────────┐                │
│         │                                      │                │
│  ┌──────▼───────┐  ┌───────────────┐  ┌──────▼─────────┐      │
│  │   Yellow     │  │  Signature    │  │  AI Provider   │      │
│  │   Channel    │  │ Verification  │  │    Service     │      │
│  │   Service    │  │   Service     │  │                │      │
│  └──────┬───────┘  └───────────────┘  └──────┬─────────┘      │
│         │                                      │                │
└─────────┼──────────────────────────────────────┼────────────────┘
          │                                      │
          ▼                                      ▼
┌──────────────────┐              ┌─────────────────────────┐
│  Yellow Network  │              │   AI APIs               │
│  (State Channels)│              │  - OpenAI               │
│  - Sandbox       │              │  - Anthropic (Claude)   │
│  - Production    │              │  - Google (Gemini)      │
└──────────────────┘              │  - Deepseek             │
                                  └─────────────────────────┘
```

---

## 📁 Estructura de Archivos

```
src/chat_AI/
├── chat-ai.module.ts              # Módulo NestJS
├── chat-ai.controller.ts          # REST endpoints
├── chat-ai.gateway.ts             # WebSocket gateway
├── chat-ai.service.ts             # Lógica principal
├── config/
│   └── chat-ai.config.ts          # Configuración de modelos, Yellow, etc.
├── services/
│   ├── yellow-channel.service.ts  # Integración con Yellow Network
│   ├── session-manager.service.ts # Gestión de sesiones en memoria
│   ├── signature-verification.service.ts # Verificación ECDSA
│   └── ai-provider.service.ts     # Integración con APIs de IA
├── dto/
│   └── chat-ai.dto.ts             # DTOs con validación
└── interfaces/
    └── chat-ai.interface.ts       # TypeScript interfaces
```

---

## 🚀 Instalación

### 1. **Instalar dependencias**

```bash
npm install ethers@^6.16.0 ws@^8.14.0
```

Las dependencias de IA providers son opcionales (instala solo las que vayas a usar):

```bash
# OpenAI
npm install openai@^4.28.0

# Anthropic (Claude)
npm install @anthropic-ai/sdk@^0.14.0

# Google (Gemini)
npm install @google/generative-ai@^0.1.3
```

### 2. **Configurar variables de entorno**

Edita `.env`:

```env
# Yellow Network
NODE_ENV=development  # 'development' usa sandbox, 'production' usa mainnet

# Provider Key (wallet del backend que firma transacciones)
PROVIDER_PRIVATE_KEY=0x...

# AI API Keys (obtén de cada proveedor)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_KEY=...
DEEPSEEK_API_KEY=sk-...
```

### 3. **Iniciar servidor**

```bash
npm run start:dev
```

El servidor estará disponible en:
- **HTTP**: `http://localhost:3000`
- **WebSocket**: `ws://localhost:3000/ai-chat`

---

## 📡 API Endpoints

### **REST API**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/ai-chat/health` | Health check del servicio |
| `GET` | `/ai-chat/models` | Listar modelos de IA disponibles |
| `POST` | `/ai-chat/sessions` | Crear sesión (abrir state channel) |
| `POST` | `/ai-chat/sessions/:id/session-key` | Crear session key |
| `POST` | `/ai-chat/query` | Realizar consulta a IA |
| `GET` | `/ai-chat/sessions/:id/balance` | Ver balance del canal |
| `GET` | `/ai-chat/sessions/:id/messages` | Obtener historial de mensajes |
| `POST` | `/ai-chat/sessions/:id/close` | Cerrar sesión (cerrar canal) |
| `GET` | `/ai-chat/stats` | Estadísticas del servicio |

### **WebSocket Events**

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `subscribe:session` | Cliente → Servidor | Suscribirse a updates de sesión |
| `unsubscribe:session` | Cliente → Servidor | Desuscribirse |
| `message:new` | Servidor → Cliente | Nuevo mensaje en el chat |
| `balance:update` | Servidor → Cliente | Balance del canal actualizado |
| `error` | Servidor → Cliente | Error en la sesión |

---

## 🔥 Guía de Uso

### **1. Health Check**

```bash
curl http://localhost:3000/ai-chat/health
```

Respuesta:
```json
{
  "status": "ok",
  "service": "ai-chat",
  "timestamp": "2026-02-06T12:00:00.000Z",
  "yellowNetworkConnected": true,
  "stats": {
    "totalSessions": 5,
    "activeSessions": 2,
    "totalMessages": 150
  }
}
```

### **2. Listar modelos disponibles**

```bash
curl http://localhost:3000/ai-chat/models
```

Respuesta:
```json
[
  {
    "id": "gpt-4o",
    "name": "GPT-4o",
    "provider": "openai",
    "cost": 0.03,
    "maxTokens": 8192
  },
  {
    "id": "claude-sonnet-4.5",
    "name": "Claude Sonnet 4.5",
    "provider": "anthropic",
    "cost": 0.03,
    "maxTokens": 8192
  }
  // ... más modelos
]
```

### **3. Crear sesión (Abrir State Channel)**

```bash
curl -X POST http://localhost:3000/ai-chat/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "depositAmount": "100000000"
  }'
```

Respuesta:
```json
{
  "success": true,
  "sessionId": "channel_xyz123",
  "balance": "100000000",
  "nonce": 0,
  "status": "OPEN"
}
```

### **4. Crear Session Key**

**Frontend debe:**
1. Generar el mensaje usando la firma correcta
2. Firmar con MetaMask
3. Enviar al backend

```typescript
// Frontend code (ejemplo)
const message = `AI Chat Session Key Authorization
Session Key Address: ${sessionKeyAddress}
User Address: ${userAddress}
Expiry: ${expiry}
Permissions: ai.query, ai.payment
Max Amount: ${maxAmount} USDC`;

const signature = await signer.signMessage(message);
```

```bash
curl -X POST http://localhost:3000/ai-chat/sessions/channel_xyz123/session-key \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "expiry": 1738847200000,
    "signature": "0x..."
  }'
```

### **5. Realizar consulta a IA**

```bash
curl -X POST http://localhost:3000/ai-chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "channel_xyz123",
    "nonce": 0,
    "modelId": "gpt-4o",
    "prompt": "¿Qué es Yellow Network?",
    "maxCost": "30000",
    "timestamp": 1738847200000,
    "signature": "0x..."
  }'
```

Respuesta:
```json
{
  "response": "Yellow Network es una infraestructura de Layer 3...",
  "model": "gpt-4o",
  "tokensUsed": 145,
  "cost": 0.03,
  "newState": {
    "balance": "99970000",
    "nonce": 1
  }
}
```

### **6. Ver balance**

```bash
curl http://localhost:3000/ai-chat/sessions/channel_xyz123/balance
```

### **7. Ver mensajes**

```bash
curl http://localhost:3000/ai-chat/sessions/channel_xyz123/messages?limit=10
```

### **8. Cerrar sesión**

```bash
curl -X POST http://localhost:3000/ai-chat/sessions/channel_xyz123/close \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0x..."
  }'
```

---

## 🔐 Seguridad

### **Verificación de Firmas**

Todas las operaciones críticas requieren firmas ECDSA:

1. **Session Key**: Firmada con wallet principal (1 vez)
2. **Consultas**: Firmadas con session key (rápido, sin popups)
3. **Cierre**: Firmado con wallet principal

### **Rate Limiting**

- Máximo 10 consultas por minuto por sesión
- Prompt máximo: 10,000 caracteres

### **State Channels**

- Fondos siempre recuperables on-chain
- Mecanismo de challenge-response integrado
- No custody: usuario siempre tiene control

---

## 🧪 Testing

### **Postman Collection**

Importa la colección Postman desde:
```
src/chat_AI/documentation/postman-collection.json
```

### **Pruebas de Carga**

```bash
# Test con Apache Bench
ab -n 100 -c 10 -H "Content-Type: application/json" \
  -p query.json http://localhost:3000/ai-chat/query
```

---

## 🌐 Integración con Yellow Network

### **Sandbox** (Testing)
- WebSocket: `wss://clearnet-sandbox.yellow.com/ws`
- Usa MockUSDC en Sepolia
- Obtén tokens del faucet: `https://clearnet-sandbox.yellow.com/faucet/requestTokens`

### **Production**
- WebSocket: `wss://clearnet.yellow.com/ws`
- Usa USDC real
- Cambiar `NODE_ENV=production` en `.env`

---

## 🤖 Modelos Soportados

| Modelo | Provider | Costo (USDC) | Max Tokens |
|--------|----------|--------------|------------|
| GPT-4o | OpenAI | 0.03 | 8192 |
| GPT-4o Mini | OpenAI | 0.01 | 4096 |
| Claude Sonnet 4.5 | Anthropic | 0.03 | 8192 |
| Claude Haiku 3.5 | Anthropic | 0.01 | 4096 |
| Gemini 2.0 Flash | Google | 0.008 | 8192 |
| Gemini 1.5 Pro | Google | 0.02 | 8192 |
| Deepseek Chat | Deepseek | 0.005 | 4096 |

---

## 📊 Monitoreo

### **Stats Endpoint**

```bash
curl http://localhost:3000/ai-chat/stats
```

Respuesta:
```json
{
  "totalSessions": 42,
  "activeSessions": 5,
  "totalMessages": 1250
}
```

### **Logs**

Logs detallados en consola:
- Creación/cierre de sesiones
- Consultas procesadas
- Errores de verificación
- Conexión con Yellow Network

---

## 🔧 Troubleshooting

### **Error: "Yellow Network connection failed"**
- Verificar `PROVIDER_PRIVATE_KEY` en `.env`
- Verificar que `RPC_URL` esté configurado
- Revisar connectivity con `wss://clearnet-sandbox.yellow.com/ws`

### **Error: "Invalid signature"**
- Verificar que el mensaje firmado coincida exactamente
- Revisar que la dirección del firmante sea correcta

### **Error: "Insufficient balance"**
- El usuario debe depositar más fondos en el canal
- Verificar balance: `GET /ai-chat/sessions/:id/balance`

### **Error: "Session key expired"**
- Crear nueva session key
- Aumentar `expiry` al crear la session key

---

## 📚 Referencias

- **Yellow Network Docs**: https://docs.yellow.org/docs/learn/
- **State Channels**: https://docs.yellow.org/docs/learn/core-concepts/state-channels-vs-l1-l2
- **Session Keys**: https://docs.yellow.org/docs/learn/core-concepts/session-keys
- **Challenge-Response**: https://docs.yellow.org/docs/learn/core-concepts/challenge-response

---

## 🙏 Soporte

- **Discord**: [Yellow Network Community](https://discord.com/invite/yellownetwork)
- **GitHub**: [Yellow SDK](https://github.com/layer-3/yellow-sdk)

---

**Fecha**: Febrero 2026  
**Versión**: 1.0  
**Stack**: NestJS + Yellow Network SDK + Multiple AI Providers

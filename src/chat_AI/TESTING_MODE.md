# 🧪 MODO TESTING - Solo Deepseek

## ⚠️ Modo Mock Activado

Tu backend está configurado en **MODO MOCK** porque no hay `PROVIDER_PRIVATE_KEY` configurado.

### ✅ Lo que SÍ funciona:

- ✅ Consultas a IA con Deepseek
- ✅ Simulación de sesiones (sin blockchain)
- ✅ Simulación de balances
- ✅ Todos los endpoints REST
- ✅ WebSocket
- ✅ Historial de mensajes

### ⚠️ Lo que NO funciona (modo mock):

- ❌ State channels reales en Yellow Network
- ❌ Transacciones on-chain
- ❌ Verificación de firmas ECDSA
- ❌ Fondos reales

---

## 🚀 Cómo Usar en Modo Testing

### 1. **Crear Sesión (Mock)**

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
  "sessionId": "mock_channel_1738847200_abc123",
  "balance": "100000000",
  "nonce": 0,
  "status": "OPEN"
}
```

### 2. **Crear Session Key (Mock - sin firma real)**

```bash
curl -X POST http://localhost:3000/ai-chat/sessions/SESSION_ID/session-key \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "expiry": 9999999999999,
    "signature": "0xmock_signature"
  }'
```

### 3. **Consultar IA (Deepseek)**

```bash
curl -X POST http://localhost:3000/ai-chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "mock_channel_1738847200_abc123",
    "nonce": 0,
    "modelId": "deepseek-chat",
    "prompt": "¿Qué es Yellow Network?",
    "maxCost": "5000",
    "timestamp": 1738847200000,
    "signature": "0xmock_signature"
  }'
```

Respuesta:
```json
{
  "response": "Yellow Network es una infraestructura Layer 3...",
  "model": "deepseek-chat",
  "tokensUsed": 145,
  "cost": 0.005,
  "newState": {
    "balance": "99995000",
    "nonce": 1
  }
}
```

---

## 🧪 Script de Testing Rápido

Crea un archivo `test-ai-chat.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
USER_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

echo "🧪 Testing AI Chat (Mock Mode)"
echo "================================"

# 1. Health check
echo "\n1️⃣ Health Check..."
curl -s "$BASE_URL/ai-chat/health" | jq

# 2. List models
echo "\n2️⃣ List Models..."
curl -s "$BASE_URL/ai-chat/models" | jq

# 3. Create session
echo "\n3️⃣ Creating Session..."
SESSION=$(curl -s -X POST "$BASE_URL/ai-chat/sessions" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\":\"$USER_ADDRESS\",\"depositAmount\":\"100000000\"}")
echo $SESSION | jq

SESSION_ID=$(echo $SESSION | jq -r '.sessionId')
echo "Session ID: $SESSION_ID"

# 4. Create session key
echo "\n4️⃣ Creating Session Key..."
curl -s -X POST "$BASE_URL/ai-chat/sessions/$SESSION_ID/session-key" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\":\"$USER_ADDRESS\",\"expiry\":9999999999999,\"signature\":\"0xmock\"}" | jq

# 5. Query AI
echo "\n5️⃣ Querying Deepseek..."
curl -s -X POST "$BASE_URL/ai-chat/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\":\"$SESSION_ID\",
    \"nonce\":0,
    \"modelId\":\"deepseek-chat\",
    \"prompt\":\"Explica qué es Yellow Network en 2 frases\",
    \"maxCost\":\"5000\",
    \"timestamp\":$(date +%s)000,
    \"signature\":\"0xmock\"
  }" | jq

# 6. Check balance
echo "\n6️⃣ Checking Balance..."
curl -s "$BASE_URL/ai-chat/sessions/$SESSION_ID/balance" | jq

# 7. Get messages
echo "\n7️⃣ Getting Messages..."
curl -s "$BASE_URL/ai-chat/sessions/$SESSION_ID/messages" | jq

echo "\n✅ Test completed!"
```

Ejecuta:
```bash
chmod +x test-ai-chat.sh
./test-ai-chat.sh
```

---

## 🔧 Para Windows (PowerShell)

Crea `test-ai-chat.ps1`:

```powershell
$BASE_URL = "http://localhost:3000"
$USER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

Write-Host "🧪 Testing AI Chat (Mock Mode)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. Health check
Write-Host "`n1️⃣ Health Check..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/ai-chat/health" | ConvertTo-Json

# 2. Create session
Write-Host "`n3️⃣ Creating Session..." -ForegroundColor Yellow
$session = Invoke-RestMethod -Method Post -Uri "$BASE_URL/ai-chat/sessions" `
  -ContentType "application/json" `
  -Body (@{
    userAddress = $USER_ADDRESS
    depositAmount = "100000000"
  } | ConvertTo-Json)

$sessionId = $session.sessionId
Write-Host "Session ID: $sessionId" -ForegroundColor Green

# 3. Create session key
Write-Host "`n4️⃣ Creating Session Key..." -ForegroundColor Yellow
Invoke-RestMethod -Method Post -Uri "$BASE_URL/ai-chat/sessions/$sessionId/session-key" `
  -ContentType "application/json" `
  -Body (@{
    userAddress = $USER_ADDRESS
    expiry = 9999999999999
    signature = "0xmock"
  } | ConvertTo-Json) | ConvertTo-Json

# 4. Query AI
Write-Host "`n5️⃣ Querying Deepseek..." -ForegroundColor Yellow
$result = Invoke-RestMethod -Method Post -Uri "$BASE_URL/ai-chat/query" `
  -ContentType "application/json" `
  -Body (@{
    sessionId = $sessionId
    nonce = 0
    modelId = "deepseek-chat"
    prompt = "Explica qué es Yellow Network en 2 frases"
    maxCost = "5000"
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    signature = "0xmock"
  } | ConvertTo-Json)

Write-Host "`nRespuesta de IA:" -ForegroundColor Green
Write-Host $result.response

# 5. Check balance
Write-Host "`n6️⃣ Checking Balance..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/ai-chat/sessions/$sessionId/balance" | ConvertTo-Json

Write-Host "`n✅ Test completed!" -ForegroundColor Green
```

Ejecuta:
```powershell
.\test-ai-chat.ps1
```

---

## 🎯 Modelos Disponibles (Mock Mode)

Todos los modelos usarán **Deepseek** como fallback:

- `gpt-4o` → Deepseek
- `gpt-4o-mini` → Deepseek  
- `claude-sonnet-4.5` → Deepseek
- `claude-haiku-3.5` → Deepseek
- `gemini-2.0-flash` → Deepseek
- `gemini-1.5-pro` → Deepseek
- `deepseek-chat` → Deepseek ✅

---

## 🔥 Para Habilitar Yellow Network Real

Si quieres usar state channels reales:

1. Genera una private key:
```bash
# En Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Agrega a `.env`:
```env
PROVIDER_PRIVATE_KEY=0xTU_PRIVATE_KEY_AQUI
```

3. Reinicia el servidor:
```bash
npm run start:dev
```

Verás en los logs:
```
[YellowChannelService] Yellow Channel Service initialized
[YellowChannelService] Provider address: 0x...
[ChatAiService] ✅ Yellow Network connection established
```

---

## 📊 Verificar Estado

```bash
# Ver stats
curl http://localhost:3000/ai-chat/stats

# Ver logs del servidor
# Los logs mostrarán "⚠️ MOCK mode" si está en modo testing
```

---

## 💡 Notas

- En modo MOCK, las firmas no se verifican realmente
- Los balances se simulan en memoria
- Las sesiones se pierden al reiniciar el servidor
- Perfecto para desarrollo y testing de la integración frontend
- Para producción, SIEMPRE usa `PROVIDER_PRIVATE_KEY` real

---

**Fecha:** Febrero 2026  
**Modo:** Testing con Deepseek únicamente

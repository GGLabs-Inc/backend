# 🧪 Testing AI Chat con Deepseek como Fallback

## ✅ Configuración Actual

Solo tienes configurada la API key de **Deepseek**:

```env
DEEPSEEK_API_KEY=sk-e852545afd944accb2fc65681c56f97f
```

## 🔄 Cómo Funciona el Fallback

Cuando intentas usar **cualquier modelo** (GPT-4o, Claude, Gemini), el sistema:

1. **Intenta** usar el provider original
2. **Detecta** que no hay API key
3. **Automáticamente** usa Deepseek como fallback
4. **Registra** un log de advertencia

```
⚠️ openai API key not configured, using Deepseek as fallback
🟠 Using Deepseek API (fallback mode)
```

---

## 🚀 Pruebas con Postman o cURL

### 1️⃣ **Health Check**

```bash
curl http://localhost:3000/ai-chat/health
```

Debería devolver:
```json
{
  "status": "ok",
  "service": "ai-chat",
  "yellowNetworkConnected": true
}
```

---

### 2️⃣ **Listar Modelos**

```bash
curl http://localhost:3000/ai-chat/models
```

Verás todos los modelos disponibles (aunque solo Deepseek funcionará):
```json
[
  { "id": "gpt-4o", "name": "GPT-4o", "provider": "openai", "cost": 0.03 },
  { "id": "claude-sonnet-4.5", "name": "Claude Sonnet 4.5", "provider": "anthropic", "cost": 0.03 },
  { "id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "provider": "google", "cost": 0.008 },
  { "id": "deepseek-chat", "name": "Deepseek Chat", "provider": "deepseek", "cost": 0.005 }
]
```

---

### 3️⃣ **Probar GPT-4o (Fallback a Deepseek)**

```bash
curl -X POST http://localhost:3000/ai-chat/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "depositAmount": "100000000"
  }'
```

Guarda el `sessionId` que te devuelve.

Luego prueba una consulta:

```bash
curl -X POST http://localhost:3000/ai-chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "AQUI_TU_SESSION_ID",
    "nonce": 0,
    "modelId": "gpt-4o",
    "prompt": "Hola, ¿cómo estás?",
    "maxCost": "30000",
    "timestamp": 1739000000000,
    "signature": "0x123456"
  }'
```

**Resultado esperado:**
- En los logs del backend verás: `⚠️ openai API key not configured, using Deepseek as fallback`
- La respuesta vendrá de Deepseek pero el usuario no lo notará

---

### 4️⃣ **Probar Claude (Fallback a Deepseek)**

```bash
curl -X POST http://localhost:3000/ai-chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "AQUI_TU_SESSION_ID",
    "nonce": 1,
    "modelId": "claude-sonnet-4.5",
    "prompt": "Explícame qué es Yellow Network",
    "maxCost": "30000",
    "timestamp": 1739000000000,
    "signature": "0x123456"
  }'
```

---

### 5️⃣ **Probar Gemini (Fallback a Deepseek)**

```bash
curl -X POST http://localhost:3000/ai-chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "AQUI_TU_SESSION_ID",
    "nonce": 2,
    "modelId": "gemini-2.0-flash",
    "prompt": "Dame un ejemplo de state channel",
    "maxCost": "8000",
    "timestamp": 1739000000000,
    "signature": "0x123456"
  }'
```

---

### 6️⃣ **Probar Deepseek Directamente**

```bash
curl -X POST http://localhost:3000/ai-chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "AQUI_TU_SESSION_ID",
    "nonce": 3,
    "modelId": "deepseek-chat",
    "prompt": "¿Qué es un smart contract?",
    "maxCost": "5000",
    "timestamp": 1739000000000,
    "signature": "0x123456"
  }'
```

---

## 📊 Logs del Backend

Al iniciar el servidor verás:

```bash
npm run start:dev
```

Logs esperados al hacer consultas:

```
[AiProviderService] Querying openai with model gpt-4o
⚠️ OPENAI_API_KEY not configured
⚠️ openai API key not configured, using Deepseek as fallback
🟠 Using Deepseek API (fallback mode)
[AiProviderService] Querying anthropic with model claude-sonnet-4.5
⚠️ ANTHROPIC_API_KEY not configured
⚠️ anthropic API key not configured, using Deepseek as fallback
🟠 Using Deepseek API (fallback mode)
```

---

## 🎯 Ventajas de Este Approach

✅ **Desarrollo rápido**: No necesitas todas las API keys para desarrollar  
✅ **Testing completo**: Puedes probar todos los endpoints  
✅ **Fallback automático**: El código detecta y usa Deepseek  
✅ **Logs claros**: Sabes cuando está usando el fallback  
✅ **Producción**: Cuando agregues otras API keys, funcionarán automáticamente  

---

## 🔧 Cuando Agregues Otras API Keys

Simplemente edita tu `.env`:

```env
# Agregar cuando las consigas
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_KEY=...

# Esta sigue siendo el fallback
DEEPSEEK_API_KEY=sk-e852545afd944accb2fc65681c56f97f
```

El sistema automáticamente usará el provider correcto y Deepseek solo servirá como fallback.

---

## 🚨 Verificaciones

### ✅ Verificar que Deepseek funciona:

```bash
curl http://localhost:3000/ai-chat/models
```

Si devuelve la lista de modelos, el servidor está corriendo.

### ✅ Verificar logs:

```bash
npm run start:dev
```

Deberías ver:
```
[NestApplication] Nest application successfully started
[ChatAiService] ✅ Yellow Network connection established
```

---

## 💡 Tips

1. **Todos los modelos usan Deepseek**: Aunque selecciones GPT-4o o Claude, internamente usa Deepseek
2. **Los costos son ficticios**: El backend deduce el costo configurado, no el real de Deepseek
3. **Firma simplificada**: Para testing, puedes usar `"0x123456"` como firma
4. **Nonce**: Incrementa el nonce en cada consulta (0, 1, 2, 3...)

---

## 🎉 ¡Listo para Probar!

Inicia el servidor:

```bash
npm run start:dev
```

Y prueba los endpoints con cURL o Postman 🚀

---

**Archivo generado:** `TESTING_DEEPSEEK_FALLBACK.md`  
**Fecha:** 6 de febrero de 2026

# 🚀 Guía de Uso - API Blockchain MockUSDC

## 📋 Requisitos Previos

1. **Iniciar el servidor**
```bash
npm run start:dev
```

2. **Verificar que esté corriendo**
- Servidor: `http://localhost:3000`
- Si el puerto 3000 está ocupado, NestJS usará otro puerto (revisar consola)

---

## 🔍 Peticiones de Solo Lectura (No requieren configuración)

### 1️⃣ Obtener Información del Token

```bash
# cURL
curl http://localhost:3000/mockusdc/info
```

**Respuesta esperada:**
```json
{
  "name": "Mock USDC",
  "symbol": "MUSDC",
  "decimals": 6,
  "totalSupply": "1000000",
  "owner": "0x..."
}
```

---

### 2️⃣ Consultar Balance de una Dirección

```bash
# cURL
curl http://localhost:3000/mockusdc/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/mockusdc/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

**Respuesta:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balance": "1000.0",
  "symbol": "MUSDC"
}
```

---

### 3️⃣ Verificar Estado del Faucet

```bash
# cURL
curl http://localhost:3000/mockusdc/faucet/status/0xTuDireccion
```

**Respuesta:**
```json
{
  "address": "0x...",
  "canUseFaucet": true,
  "timeRemainingSeconds": 0,
  "lastMintTime": "2026-02-04T10:30:00.000Z",
  "nextAvailable": "2026-02-04T11:30:00.000Z"
}
```

---

### 4️⃣ Consultar Allowance (Aprobación)

```bash
# cURL
curl "http://localhost:3000/mockusdc/allowance?owner=0xOwnerAddress&spender=0xSpenderAddress"

# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/mockusdc/allowance?owner=0xOwnerAddress&spender=0xSpenderAddress"
```

---

### 5️⃣ Ver Información de Wallet Conectada

```bash
curl http://localhost:3000/mockusdc/wallet
```

**Respuesta (sin wallet configurada):**
```json
{
  "connected": false,
  "message": "No hay wallet configurada"
}
```

**Respuesta (con wallet):**
```json
{
  "connected": true,
  "address": "0xYourWalletAddress"
}
```

---

## ✍️ Peticiones de Escritura (Requieren Configuración de Wallet)

> ⚠️ **IMPORTANTE**: Estas peticiones requieren que configures `PRIVATE_KEY` en tu archivo `.env`

### Configuración Necesaria en `.env`

```env
RPC_URL=https://sepolia.infura.io/v3/TU_INFURA_KEY
CONTRACT_ADDRESS=0xDireccionDelContratoDeployado
PRIVATE_KEY=tu_private_key_sin_0x
CHAIN_ID=11155111
```

---

### 6️⃣ Usar el Faucet (Obtener 1000 USDC Gratis)

```bash
# cURL
curl -X POST http://localhost:3000/mockusdc/faucet

# PowerShell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/mockusdc/faucet"
```

**Respuesta:**
```json
{
  "success": true,
  "transactionHash": "0x123abc...",
  "blockNumber": 12345,
  "from": "0xYourAddress",
  "amount": "1000 USDC"
}
```

**Limitaciones:**
- Solo 1 vez cada hora por dirección
- Mintea exactamente 1000 USDC
- Gratis (solo pagas gas)

---

### 7️⃣ Transferir Tokens

```bash
# cURL
curl -X POST http://localhost:3000/mockusdc/transfer \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"0xRecipientAddress\",\"amount\":\"100\"}"

# PowerShell
$body = @{
    to = "0xRecipientAddress"
    amount = "100"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/mockusdc/transfer" `
  -ContentType "application/json" -Body $body
```

**Body (JSON):**
```json
{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "100"
}
```

**Respuesta:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 12346,
  "from": "0xYourAddress",
  "to": "0xRecipientAddress",
  "amount": "100 USDC"
}
```

---

### 8️⃣ Aprobar Gasto de Tokens

```bash
# cURL
curl -X POST http://localhost:3000/mockusdc/approve \
  -H "Content-Type: application/json" \
  -d "{\"spender\":\"0xSpenderAddress\",\"amount\":\"500\"}"

# PowerShell
$body = @{
    spender = "0xSpenderAddress"
    amount = "500"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/mockusdc/approve" `
  -ContentType "application/json" -Body $body
```

**Body:**
```json
{
  "spender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "500"
}
```

---

### 9️⃣ Quemar Tokens

```bash
# cURL
curl -X POST http://localhost:3000/mockusdc/burn \
  -H "Content-Type: application/json" \
  -d "{\"amount\":\"50\"}"

# PowerShell
$body = @{
    amount = "50"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/mockusdc/burn" `
  -ContentType "application/json" -Body $body
```

**Body:**
```json
{
  "amount": "50"
}
```

---

### 🔟 Mintear Tokens (Solo Owner)

```bash
# cURL
curl -X POST http://localhost:3000/mockusdc/mint \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"0xRecipientAddress\",\"amount\":\"5000\"}"

# PowerShell
$body = @{
    to = "0xRecipientAddress"
    amount = "5000"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/mockusdc/mint" `
  -ContentType "application/json" -Body $body
```

**Body:**
```json
{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "5000"
}
```

⚠️ **Nota:** Solo la dirección owner del contrato puede ejecutar esta función.

---

## 🌐 Usando Postman / Thunder Client

### Configurar Peticiones GET

1. Método: `GET`
2. URL: `http://localhost:3000/mockusdc/info`
3. Click en "Send"

### Configurar Peticiones POST

1. Método: `POST`
2. URL: `http://localhost:3000/mockusdc/transfer`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "100"
}
```
5. Click en "Send"

---

## 💻 Usando JavaScript/TypeScript (Frontend)

### Con Fetch API

```javascript
// GET - Obtener balance
async function getBalance(address) {
  const response = await fetch(`http://localhost:3000/mockusdc/balance/${address}`);
  const data = await response.json();
  console.log(data);
}

// Ejemplo de uso
getBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
```

```javascript
// POST - Transferir tokens
async function transferTokens(to, amount) {
  const response = await fetch('http://localhost:3000/mockusdc/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, amount })
  });
  
  const data = await response.json();
  console.log(data);
}

// Ejemplo de uso
transferTokens('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '100');
```

```javascript
// POST - Usar faucet
async function useFaucet() {
  const response = await fetch('http://localhost:3000/mockusdc/faucet', {
    method: 'POST'
  });
  
  const data = await response.json();
  console.log('Faucet usado:', data);
}

useFaucet();
```

### Con Axios

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3000/blockchain';

// GET - Información del token
const getTokenInfo = async () => {
  const { data } = await axios.get(`${API_URL}/info`);
  return data;
};

// POST - Transferir
const transfer = async (to, amount) => {
  const { data } = await axios.post(`${API_URL}/transfer`, { to, amount });
  return data;
};

// POST - Faucet
const useFaucet = async () => {
  const { data } = await axios.post(`${API_URL}/faucet`);
  return data;
};
```

---

## 🧪 Flujo de Prueba Completo

### Paso 1: Verificar que el servidor esté corriendo
```bash
curl http://localhost:3000/mockusdc/info
```

### Paso 2: Ver tu wallet
```bash
curl http://localhost:3000/mockusdc/wallet
```

### Paso 3: Usar el faucet para obtener tokens
```bash
curl -X POST http://localhost:3000/mockusdc/faucet
```

### Paso 4: Verificar tu balance
```bash
curl http://localhost:3000/mockusdc/balance/TU_DIRECCION
```

### Paso 5: Transferir tokens a otra dirección
```bash
curl -X POST http://localhost:3000/mockusdc/transfer \
  -H "Content-Type: application/json" \
  -d '{"to":"0xOtraDireccion","amount":"50"}'
```

### Paso 6: Verificar el nuevo balance
```bash
curl http://localhost:3000/mockusdc/balance/TU_DIRECCION
```

---

## ❌ Manejo de Errores

### Error: "No hay wallet configurada"
**Causa:** No configuraste `PRIVATE_KEY` en `.env`
**Solución:** Agrega tu private key en el archivo `.env`

### Error: "Wait 1 hour between mints"
**Causa:** Intentas usar el faucet antes de que pase 1 hora
**Solución:** Espera o consulta el estado del faucet

### Error: "Insufficient balance"
**Causa:** No tienes suficientes tokens para la operación
**Solución:** Usa el faucet o recibe tokens de otra dirección

### Error: "Only owner can mint"
**Causa:** Intentas mintear sin ser el owner del contrato
**Solución:** Solo la dirección owner puede mintear tokens manualmente

---

## 📊 Formato de las Cantidades

- **Decimales:** MUSDC usa 6 decimales
- **En la API:** Envía cantidades en formato legible (ejemplo: "100" = 100 USDC)
- **Internamente:** El servicio convierte automáticamente usando `ethers.parseUnits(amount, 6)`
- **Ejemplos:**
  - `"1"` = 1 USDC
  - `"100.5"` = 100.5 USDC
  - `"1000"` = 1000 USDC

---

## 🔐 Seguridad

⚠️ **NUNCA** compartas tu `PRIVATE_KEY` públicamente
⚠️ **NO** subas tu archivo `.env` a GitHub
⚠️ Usa wallets de prueba para desarrollo
⚠️ En producción, usa servicios de gestión de claves (AWS KMS, Azure Key Vault, etc.)

---

## 🆘 Soporte

Si encuentras problemas:
1. Verifica que el servidor esté corriendo
2. Revisa la consola del servidor para ver logs
3. Confirma que tu `.env` esté correctamente configurado
4. Verifica que tengas fondos suficientes (ETH para gas en Sepolia)

# API MockUSDC - Documentación de Endpoints

## Base URL
`http://localhost:3000`

## Endpoints Disponibles

### 📊 Información General

#### `GET /mockusdc/info`
Obtener información del token MockUSDC
```json
{
  "name": "Mock USDC",
  "symbol": "MUSDC",
  "decimals": 6,
  "totalSupply": "1000000",
  "owner": "0x..."
}
```

#### `GET /mockusdc/wallet`
Obtener información de la wallet conectada
```json
{
  "connected": true,
  "address": "0x..."
}
```

---

### 🔍 Consultas (Funciones de Lectura)

#### `GET /mockusdc/balance/:address`
Ver balance de una dirección
```bash
GET /mockusdc/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```
Respuesta:
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balance": "1000",
  "symbol": "MUSDC"
}
```

#### `GET /mockusdc/allowance?owner=0x...&spender=0x...`
Ver cantidad aprobada para gastar
```bash
GET /mockusdc/allowance?owner=0xAAA&spender=0xBBB
```

#### `GET /mockusdc/faucet/status/:address`
Ver si una dirección puede usar el faucet
```bash
GET /mockusdc/faucet/status/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```
Respuesta:
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

### ✍️ Transacciones (Funciones de Escritura)

> ⚠️ **Requieren `PRIVATE_KEY` configurada en `.env`**

#### `POST /mockusdc/faucet`
Usar el faucet (obtener 1000 USDC gratis, 1 vez por hora)
```bash
POST /mockusdc/faucet
```
Respuesta:
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 12345,
  "from": "0x...",
  "amount": "1000 USDC"
}
```

#### `POST /mockusdc/mint`
Mintear tokens (solo owner)
```bash
POST /mockusdc/mint
Content-Type: application/json

{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "5000"
}
```

#### `POST /mockusdc/transfer`
Transferir tokens
```bash
POST /mockusdc/transfer
Content-Type: application/json

{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "100"
}
```

#### `POST /mockusdc/approve`
Aprobar que otra dirección gaste tus tokens
```bash
POST /mockusdc/approve
Content-Type: application/json

{
  "spender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "500"
}
```

#### `POST /mockusdc/burn`
Quemar tokens
```bash
POST /mockusdc/burn
Content-Type: application/json

{
  "amount": "100"
}
```

---

## Configuración Inicial

### 1. Configurar variables de entorno en `.env`

```env
# RPC URL - Usa uno de estos:
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# O
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Dirección del contrato MockUSDC desplegado
CONTRACT_ADDRESS=0xYourContractAddressHere

# Private key de tu wallet (sin el 0x)
PRIVATE_KEY=your_private_key_here

# Chain ID de Sepolia
CHAIN_ID=11155111
```

### 2. Obtener un RPC URL

**Opción A - Infura:**
1. Visita https://infura.io
2. Crea una cuenta gratis
3. Crea un nuevo proyecto
4. Copia el endpoint de Sepolia

**Opción B - Alchemy:**
1. Visita https://alchemy.com
2. Crea una cuenta gratis
3. Crea una nueva app en Sepolia
4. Copia el API URL

### 3. Iniciar el servidor

```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

---

## Ejemplos con cURL

```bash
# Ver información del token
curl http://localhost:3000/mockusdc/info

# Ver balance
curl http://localhost:3000/mockusdc/balance/0xYourAddress

# Usar faucet
curl -X POST http://localhost:3000/mockusdc/faucet

# Transferir tokens
curl -X POST http://localhost:3000/mockusdc/transfer \
  -H "Content-Type: application/json" \
  -d '{"to":"0xRecipientAddress","amount":"100"}'
```

---

## Notas Importantes

1. **Funciones de solo lectura**: No requieren `PRIVATE_KEY`, funcionan con solo `RPC_URL`
2. **Funciones de escritura**: Requieren `PRIVATE_KEY` configurada
3. **Faucet**: Permite mintear 1000 USDC gratis cada hora
4. **Decimales**: MUSDC usa 6 decimales (como USDC real)
5. **Red**: Configurado para Sepolia testnet

# 📈 API DE TRADING - YellowMeter DEX

## 🎯 Descripción General

DEX (Exchange Descentralizado) con contratos perpetuos y libro de órdenes off-chain.
Opera con apalancamiento hasta 100x, liquidaciones automáticas y precios en tiempo real.

---

## 🔌 WebSocket API (Tiempo Real)

**Namespace:** `/trading`  
**URL:** `ws://localhost:3000/trading`

### 📊 Eventos de Cliente → Servidor

#### 1. **Suscribirse a Ticker de Precio**
```javascript
socket.emit('subscribe:ticker', { market: 'ETH-USDC' });

// Respuesta (cada 100ms):
socket.on('ticker', (data) => {
  console.log(data);
  /* {
    market: 'ETH-USDC',
    price: 2450.50,
    change24h: 5.2,
    high24h: 2480.00,
    low24h: 2320.00,
    volume24h: 1250000,
    timestamp: 1706889600000
  } */
});
```

#### 2. **Desuscribirse de Ticker**
```javascript
socket.emit('unsubscribe:ticker', { market: 'ETH-USDC' });
```

#### 3. **Suscribirse a Orderbook**
```javascript
socket.emit('subscribe:orderbook', { 
  market: 'BTC-USDC',
  depth: 20 // Opcional, default: 20
});

// Respuesta (cada 500ms):
socket.on('orderbook', (data) => {
  console.log(data);
  /* {
    market: 'BTC-USDC',
    bids: [
      { price: 42000, size: 15000, orders: 3 },
      { price: 41999, size: 8000, orders: 1 },
      ...
    ],
    asks: [
      { price: 42001, size: 12000, orders: 2 },
      { price: 42002, size: 20000, orders: 4 },
      ...
    ],
    spread: 1.0,
    lastPrice: 42000.5,
    timestamp: 1706889600000
  } */
});
```

#### 4. **Desuscribirse de Orderbook**
```javascript
socket.emit('unsubscribe:orderbook', { market: 'BTC-USDC' });
```

#### 5. **Suscribirse a Trades**
```javascript
socket.emit('subscribe:trades', { market: 'SOL-USDC' });

// Respuesta (en tiempo real):
socket.on('trade', (data) => {
  console.log(data);
  /* {
    market: 'SOL-USDC',
    trade: {
      tradeId: 'trade_123',
      price: 105.50,
      size: 5000,
      side: 'LONG',
      timestamp: 1706889600000
    }
  } */
});
```

### 📡 Eventos de Servidor → Cliente

#### **Notificación de Liquidación**
```javascript
socket.on('liquidation', (data) => {
  console.log('🔥 Liquidación:', data);
  /* {
    positionId: 'pos_123',
    trader: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    market: 'ETH-USDC',
    side: 'LONG',
    size: 10000,
    entryPrice: 2400,
    liquidationPrice: 2200,
    loss: 2000,
    timestamp: 1706889600000
  } */
});
```

---

## 🌐 REST API

### 📋 **1. Crear Orden**

**POST** `/trading/orders`

Crea una orden limit o market con apalancamiento.

**Body:**
```json
{
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "market": "ETH-USDC",
  "type": "LIMIT",
  "side": "LONG",
  "size": 5000,
  "leverage": 10,
  "price": 2400,
  "signature": "0xabc...123",
  "nonce": "1706889600000"
}
```

**Parámetros:**
- `trader` **(requerido)**: Dirección Ethereum del trader
- `market` **(requerido)**: Par de trading (ej: `ETH-USDC`, `BTC-USDC`)
- `type` **(requerido)**: `MARKET` | `LIMIT` | `STOP_LOSS` | `TAKE_PROFIT`
- `side` **(requerido)**: `LONG` (comprar) | `SHORT` (vender)
- `size` **(requerido)**: Tamaño en USD (mín: $10)
- `leverage` **(requerido)**: Apalancamiento 1x-100x
- `price` (opcional): Precio límite (requerido para `LIMIT`)
- `triggerPrice` (opcional): Precio trigger (para `STOP_LOSS`/`TAKE_PROFIT`)
- `signature` **(requerido)**: Firma ECDSA
- `nonce` **(requerido)**: Timestamp único

**Respuesta:**
```json
{
  "order": {
    "orderId": "order_1706889600_abc123",
    "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "market": "ETH-USDC",
    "type": "LIMIT",
    "side": "LONG",
    "size": 5000,
    "leverage": 10,
    "price": 2400,
    "status": "PENDING",
    "filledSize": 0,
    "remainingSize": 5000,
    "timestamp": 1706889600000
  },
  "trades": []
}
```

---

### ❌ **2. Cancelar Orden**

**POST** `/trading/orders/cancel`

```json
{
  "orderId": "order_1706889600_abc123",
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0xabc...123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "orderId": "order_1706889600_abc123"
}
```

---

### 🔍 **3. Obtener Órdenes**

**GET** `/trading/orders?trader=0x742...&market=ETH-USDC&activeOnly=true`

**Query Params:**
- `trader` **(requerido)**: Dirección del trader
- `market` (opcional): Filtrar por mercado
- `activeOnly` (opcional): Solo órdenes activas (default: `false`)

**Respuesta:**
```json
[
  {
    "orderId": "order_123",
    "market": "ETH-USDC",
    "type": "LIMIT",
    "side": "LONG",
    "size": 5000,
    "price": 2400,
    "status": "PENDING",
    "filledSize": 0,
    "remainingSize": 5000,
    "timestamp": 1706889600000
  }
]
```

---

### 🔍 **4. Obtener Posiciones**

**GET** `/trading/positions?trader=0x742...&market=ETH-USDC`

**Respuesta:**
```json
[
  {
    "positionId": "pos_abc123",
    "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "market": "ETH-USDC",
    "side": "LONG",
    "size": 10000,
    "leverage": 10,
    "entryPrice": 2350,
    "currentPrice": 2400,
    "margin": 1000,
    "unrealizedPnL": 212.76,
    "liquidationPrice": 2115,
    "isLiquidated": false,
    "openedAt": 1706889600000
  }
]
```

---

### 🔒 **5. Cerrar Posición**

**POST** `/trading/positions/close`

```json
{
  "positionId": "pos_abc123",
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "percentage": 100,
  "signature": "0xabc...123"
}
```

**Parámetros:**
- `percentage` (opcional): % de posición a cerrar (default: `100`)

**Respuesta:**
```json
{
  "positionId": "pos_abc123",
  "closedSize": 10000,
  "exitPrice": 2400,
  "realizedPnL": 212.76,
  "closedAt": 1706889700000
}
```

---

### ✏️ **6. Actualizar Stop Loss / Take Profit**

**POST** `/trading/positions/update`

```json
{
  "positionId": "pos_abc123",
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "stopLoss": 2200,
  "takeProfit": 2600,
  "signature": "0xabc...123"
}
```

---

### 💰 **7. Depositar Margen**

**POST** `/trading/deposit`

```json
{
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 1000,
  "txHash": "0x123abc..."
}
```

---

### 💸 **8. Retirar Margen**

**POST** `/trading/withdraw`

```json
{
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 500,
  "signature": "0xabc...123"
}
```

---

### 💰 **9. Obtener Balance**

**GET** `/trading/balance/:trader`

**Respuesta:**
```json
{
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "totalBalance": 5000,
  "availableMargin": 3000,
  "usedMargin": 2000,
  "unrealizedPnL": 212.76,
  "totalPnL": 1500,
  "openPositions": 2,
  "updatedAt": 1706889600000
}
```

---

### 📊 **10. Obtener Orderbook**

**GET** `/trading/orderbook?market=BTC-USDC&depth=20`

---

### 📈 **11. Obtener Datos de Mercado**

**GET** `/trading/market/ETH-USDC`

---

### 📋 **12. Listar Todos los Mercados**

**GET** `/trading/markets`

**Respuesta:**
```json
[
  {
    "market": "BTC-USDC",
    "price": 42000,
    "change24h": -2.5,
    "volume24h": 5000000,
    "high24h": 43000,
    "low24h": 41500
  },
  {
    "market": "ETH-USDC",
    "price": 2400,
    "change24h": 5.2,
    "volume24h": 1250000,
    "high24h": 2480,
    "low24h": 2320
  }
]
```

---

### 💱 **13. Obtener Trades Recientes**

**GET** `/trading/trades/ETH-USDC?limit=50`

---

### ❤️ **14. Health Check**

**GET** `/trading/health`

**Respuesta:**
```json
{
  "status": "ok",
  "service": "trading",
  "timestamp": "2026-02-04T18:00:00.000Z",
  "markets": ["BTC-USDC", "ETH-USDC", "SOL-USDC", "ARB-USDC", "OP-USDC"]
}
```

---

## 🔐 Firma de Mensajes

### Orden (Create)
```javascript
const message = ethers.solidityPackedKeccak256(
  ['string', 'address', 'string', 'string', 'uint256', 'uint256', 'uint256'],
  [orderId, trader, market, side, size, price, leverage]
);
const signature = await signer.signMessage(ethers.getBytes(message));
```

### Cancelar Orden
```javascript
const message = ethers.solidityPackedKeccak256(
  ['string', 'address'],
  [orderId, trader]
);
const signature = await signer.signMessage(ethers.getBytes(message));
```

---

## 📊 Mercados Disponibles

| Market | Descripción | Apalancamiento Máx |
|--------|-------------|--------------------|
| BTC-USDC | Bitcoin / USDC | 100x |
| ETH-USDC | Ethereum / USDC | 100x |
| SOL-USDC | Solana / USDC | 50x |
| ARB-USDC | Arbitrum / USDC | 25x |
| OP-USDC | Optimism / USDC | 25x |

---

## ⚠️ Liquidaciones

Una posición es liquidada cuando:
```
Precio Actual <= Precio de Liquidación (para LONG)
Precio Actual >= Precio de Liquidación (para SHORT)
```

**Precio de Liquidación (LONG):**
```
liquidationPrice = entryPrice * (1 - 1/leverage)
```

**Ejemplo:**
- Entry: $2400, Leverage: 10x
- Liquidation: 2400 * (1 - 1/10) = $2160

Cuando se liquida:
- El trader pierde todo el margen de esa posición
- Se cobra un fee del 0.5%
- La posición se cierra automáticamente

---

## 💡 Tips

1. **Órdenes Market** se ejecutan inmediatamente al mejor precio
2. **Órdenes Limit** esperan hasta alcanzar el precio especificado
3. **Stop Loss / Take Profit** se activan automáticamente
4. **Apalancamiento alto = Liquidación más rápida**
5. Monitorea `unrealizedPnL` para ver ganancias/pérdidas en tiempo real

---

## 🛡️ Seguridad

- Todas las órdenes requieren firma ECDSA
- Nonce único previene replay attacks
- Validación de balance antes de cada operación
- Liquidaciones automáticas protegen la solvencia del exchange

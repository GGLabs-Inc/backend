# ⚡ Quickstart - Trading Module

## 🎯 Comenzar en 5 minutos

Este guía te ayudará a empezar a operar en el DEX de YellowMeter.

---

## 📦 1. Prerequisitos

```bash
# Node.js 18+ y npm
node --version  # v18+
npm --version   # v9+

# MetaMask instalado en el navegador
# USDC en Sepolia testnet
```

---

## 🚀 2. Iniciar el Backend

```bash
cd backend
npm install
npm run start:dev

# El servidor arranca en:
# HTTP: http://localhost:3000
# WebSocket: ws://localhost:3000/trading
```

---

## 💰 3. Depositar Margen

Antes de operar, necesitas depositar USDC.

### **Opción A: Desde Frontend**
```javascript
// Conectar MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = await provider.getSigner();
const address = await signer.getAddress();

// Aprobar USDC
const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
const amount = ethers.parseUnits("100", 6); // 100 USDC
await usdcContract.approve(SESSION_SAFE_ADDRESS, amount);

// Hacer depósito on-chain
const sessionSafe = new ethers.Contract(SESSION_SAFE_ADDRESS, SESSION_SAFE_ABI, signer);
const tx = await sessionSafe.deposit(amount);
await tx.wait();

// Registrar depósito en backend
await fetch('http://localhost:3000/trading/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trader: address,
    amount: 100,
    txHash: tx.hash
  })
});
```

### **Opción B: Modo Test (sin blockchain)**
```bash
# Ejecutar endpoint de test
curl -X POST http://localhost:3000/trading/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": 1000,
    "txHash": "0xtest123"
  }'
```

---

## 📊 4. Conectar WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000/trading');

socket.on('connect', () => {
  console.log('✅ Connected to Trading WS');
  
  // Suscribirse a ticker de ETH
  socket.emit('subscribe:ticker', { market: 'ETH-USDC' });
  
  // Suscribirse a orderbook de BTC
  socket.emit('subscribe:orderbook', { market: 'BTC-USDC', depth: 20 });
  
  // Suscribirse a trades de SOL
  socket.emit('subscribe:trades', { market: 'SOL-USDC' });
});

// Recibir precios en tiempo real
socket.on('ticker', (data) => {
  console.log('💹 Price Update:', data);
  // { market: 'ETH-USDC', price: 2450.50, change24h: 5.2, ... }
});

// Recibir orderbook
socket.on('orderbook', (data) => {
  console.log('📚 Orderbook:', data);
  // { market: 'BTC-USDC', bids: [...], asks: [...], spread: 1.0 }
});

// Recibir trades
socket.on('trade', (data) => {
  console.log('🤝 New Trade:', data);
  // { market: 'SOL-USDC', trade: { price, size, side, ... } }
});

// Recibir liquidaciones
socket.on('liquidation', (data) => {
  console.log('🔥 Liquidation Alert:', data);
});
```

---

## 📝 5. Crear una Orden

### **Opción A: Orden MARKET (Ejecución Inmediata)**

```javascript
import { ethers } from 'ethers';

// Firmar orden
const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const trader = await signer.getAddress();
const market = 'ETH-USDC';
const side = 'LONG';  // Comprar
const size = 1000;    // $1000 USD
const price = 0;      // 0 para MARKET
const leverage = 10;  // 10x

const message = ethers.solidityPackedKeccak256(
  ['string', 'address', 'string', 'string', 'uint256', 'uint256', 'uint256'],
  [orderId, trader, market, side, size, price, leverage]
);
const signature = await signer.signMessage(ethers.getBytes(message));

// Enviar orden
const response = await fetch('http://localhost:3000/trading/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trader,
    market,
    type: 'MARKET',
    side,
    size,
    leverage,
    signature,
    nonce: Date.now().toString()
  })
});

const result = await response.json();
console.log('✅ Order Created:', result);
/* {
  order: { orderId, status: 'FILLED', ... },
  trades: [{ tradeId, price, size, ... }]
} */
```

### **Opción B: Orden LIMIT (Precio Específico)**

```javascript
const price = 2400;  // Comprar ETH a $2400

const message = ethers.solidityPackedKeccak256(
  ['string', 'address', 'string', 'string', 'uint256', 'uint256', 'uint256'],
  [orderId, trader, market, side, size, price, leverage]
);
const signature = await signer.signMessage(ethers.getBytes(message));

// Enviar
await fetch('http://localhost:3000/trading/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trader,
    market,
    type: 'LIMIT',
    side,
    size,
    leverage,
    price,  // ← Precio específico
    signature,
    nonce: Date.now().toString()
  })
});
```

---

## 🔍 6. Ver tus Posiciones

```javascript
const trader = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

// Obtener todas las posiciones
const response = await fetch(`http://localhost:3000/trading/positions?trader=${trader}`);
const positions = await response.json();

console.log('📊 My Positions:', positions);
/* [
  {
    positionId: 'pos_abc123',
    market: 'ETH-USDC',
    side: 'LONG',
    size: 1000,
    leverage: 10,
    entryPrice: 2400,
    currentPrice: 2450,
    unrealizedPnL: 20.83,  // +$20.83
    liquidationPrice: 2160,
    openedAt: 1706889600000
  }
] */
```

---

## 💰 7. Ver tu Balance

```javascript
const response = await fetch(`http://localhost:3000/trading/balance/${trader}`);
const balance = await response.json();

console.log('💎 Balance:', balance);
/* {
  trader: '0x742...',
  totalBalance: 1000,
  availableMargin: 900,
  usedMargin: 100,
  unrealizedPnL: 20.83,
  totalPnL: 50,
  openPositions: 1
} */
```

---

## 🔒 8. Cerrar una Posición

```javascript
const positionId = 'pos_abc123';

// Firmar cierre
const message = ethers.solidityPackedKeccak256(
  ['string', 'address'],
  [positionId, trader]
);
const signature = await signer.signMessage(ethers.getBytes(message));

// Cerrar 100%
await fetch('http://localhost:3000/trading/positions/close', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    positionId,
    trader,
    percentage: 100,  // Cerrar todo (opcional: 50 para cerrar 50%)
    signature
  })
});
```

---

## ❌ 9. Cancelar una Orden

```javascript
const orderId = 'order_1706889600_abc123';

const message = ethers.solidityPackedKeccak256(
  ['string', 'address'],
  [orderId, trader]
);
const signature = await signer.signMessage(ethers.getBytes(message));

await fetch('http://localhost:3000/trading/orders/cancel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId,
    trader,
    signature
  })
});
```

---

## 📊 10. Ver el Orderbook

```javascript
const response = await fetch('http://localhost:3000/trading/orderbook?market=BTC-USDC&depth=10');
const orderbook = await response.json();

console.log('📚 Orderbook:', orderbook);
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
  lastPrice: 42000.5
} */
```

---

## 🎲 11. Ejemplos de Estrategias

### **Long Simple**
```javascript
// Comprar ETH con 10x leverage
// Si sube 10% → Ganancia: 100%
// Si baja 10% → Liquidación
await createOrder({
  market: 'ETH-USDC',
  type: 'MARKET',
  side: 'LONG',
  size: 1000,
  leverage: 10
});
```

### **Short Simple**
```javascript
// Vender BTC (apostar a que baje)
// Si baja 5% → Ganancia: 25% (con 5x)
await createOrder({
  market: 'BTC-USDC',
  type: 'MARKET',
  side: 'SHORT',
  size: 5000,
  leverage: 5
});
```

### **Limit Order con Stop Loss**
```javascript
// 1. Crear orden limit
const result = await createOrder({
  market: 'SOL-USDC',
  type: 'LIMIT',
  side: 'LONG',
  size: 2000,
  leverage: 20,
  price: 100  // Comprar a $100
});

// 2. Actualizar con stop loss
const position = result.trades[0].positionId;
await fetch('http://localhost:3000/trading/positions/update', {
  method: 'POST',
  body: JSON.stringify({
    positionId: position,
    trader,
    stopLoss: 95,      // Cerrar si cae a $95
    takeProfit: 110,   // Cerrar si sube a $110
    signature
  })
});
```

---

## ⚠️ 12. Evitar Liquidaciones

**Precio de Liquidación (LONG):**
```
liquidationPrice = entryPrice * (1 - 1/leverage)
```

**Ejemplos:**
- Entry: $2400, 10x → Liquidación: $2160 (-10%)
- Entry: $2400, 5x → Liquidación: $1920 (-20%)
- Entry: $2400, 2x → Liquidación: $1200 (-50%)

**Tips:**
1. Usa leverage bajo para posiciones a largo plazo
2. Monitorea `unrealizedPnL` constantemente
3. Ajusta stop loss cerca de liquidationPrice
4. Mantén margin extra disponible

---

## 🔥 13. Monitoreo de Liquidaciones

```javascript
socket.on('liquidation', (data) => {
  console.log('⚠️ LIQUIDACIÓN DETECTADA:', data);
  
  // Si es tu posición
  if (data.trader.toLowerCase() === myAddress.toLowerCase()) {
    alert(`🔥 Tu posición ${data.market} fue liquidada. Pérdida: $${data.loss}`);
  }
});
```

---

## 📈 14. Métricas en Tiempo Real

```javascript
// Ver todos los mercados
const markets = await fetch('http://localhost:3000/trading/markets').then(r => r.json());
console.log(markets);

// Ver trades recientes
const trades = await fetch('http://localhost:3000/trading/trades/ETH-USDC?limit=20').then(r => r.json());
console.log(trades);
```

---

## 🛡️ 15. Buenas Prácticas

✅ **Siempre verifica `availableMargin` antes de operar**  
✅ **Usa stop loss en posiciones con alto leverage**  
✅ **Monitorea liquidaciones vía WebSocket**  
✅ **Mantén nonces únicos (usa timestamp)**  
✅ **Valida firmas antes de enviar**  
✅ **Cierra posiciones antes de eventos volátiles**  
✅ **No uses 100x leverage a menos que seas experto**  

---

## 🆘 Troubleshooting

### **Error: Insufficient balance**
→ Deposita más margen con `/trading/deposit`

### **Error: Invalid signature**
→ Verifica que el `trader` address coincida con el signer

### **Error: Order not found**
→ La orden ya fue ejecutada o cancelada

### **Liquidación inesperada**
→ Volatilidad alta + leverage alto = liquidación rápida

---

## 📚 Próximos Pasos

1. Lee [API_TRADING.md](./API_TRADING.md) para todos los endpoints
2. Revisa [ARCHITECTURE.md](./ARCHITECTURE.md) para entender el sistema
3. Importa [postman-collection.json](./postman-collection.json) para testing
4. Usa [frontend-integration.js](./frontend-integration.js) como referencia

---

¡Feliz Trading! 🚀📈

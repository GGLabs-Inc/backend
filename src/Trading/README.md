# 📈 Módulo Trading - YellowMeter DEX

## 🎯 Descripción

DEX (Exchange Descentralizado) con contratos perpetuos, libro de órdenes off-chain, y apalancamiento hasta 100x.

**Características principales:**
- 📚 Libro de órdenes off-chain con latencia <10ms
- 🚀 Contratos perpetuos sin vencimiento
- 💪 Apalancamiento 1x-100x configurable por mercado
- ⚡ Liquidaciones automáticas en tiempo real
- 🔒 Verificación ECDSA de todas las operaciones
- 📊 WebSocket para updates en tiempo real
- 🎯 Órdenes MARKET, LIMIT, STOP_LOSS, TAKE_PROFIT

---

## 📁 Estructura del Módulo

```
Trading/
├── trading.module.ts          # Módulo raíz
├── trading.controller.ts      # REST endpoints
├── trading.gateway.ts         # WebSocket gateway
├── trading.service.ts         # Lógica de negocio
├── dto/
│   └── trading.dto.ts         # DTOs con validación
├── interfaces/
│   └── trading.interface.ts   # TypeScript interfaces
├── services/
│   ├── orderbook.service.ts   # Libro de órdenes
│   ├── position.service.ts    # Gestión de posiciones
│   ├── liquidation.service.ts # Motor de liquidaciones
│   ├── price-feed.service.ts  # Precios de mercado
│   └── signature.service.ts   # Verificación ECDSA
├── config/
│   └── trading.config.ts      # Configuración
└── documentacion/
    ├── API_TRADING.md         # Documentación completa de API
    ├── ARCHITECTURE.md        # Arquitectura del sistema
    ├── QUICKSTART.md          # Guía rápida de inicio
    ├── TESTING.md             # Estrategia de testing
    ├── frontend-integration.js # Código de ejemplo
    └── postman-collection.json # Colección Postman
```

---

## 🚀 Inicio Rápido

### **1. Iniciar el servidor**

```bash
cd backend
npm install
npm run start:dev

# Servidor corriendo en:
# - HTTP: http://localhost:3000
# - WebSocket: ws://localhost:3000/trading
```

### **2. Verificar estado**

```bash
curl http://localhost:3000/trading/health

# Respuesta:
# {
#   "status": "ok",
#   "service": "trading",
#   "timestamp": "2026-02-04T18:00:00.000Z",
#   "markets": ["BTC-USDC", "ETH-USDC", "SOL-USDC", "ARB-USDC", "OP-USDC"]
# }
```

### **3. Depositar margen (modo test)**

```bash
curl -X POST http://localhost:3000/trading/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": 1000,
    "txHash": "0xtest123"
  }'
```

### **4. Crear orden MARKET**

```bash
curl -X POST http://localhost:3000/trading/orders \
  -H "Content-Type: application/json" \
  -d '{
    "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "market": "ETH-USDC",
    "type": "MARKET",
    "side": "LONG",
    "size": 1000,
    "leverage": 10,
    "signature": "0xtest",
    "nonce": "'$(date +%s)'"
  }'
```

---

## 📡 API Endpoints

### **REST API**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/trading/health` | Health check |
| `POST` | `/trading/deposit` | Depositar margen |
| `POST` | `/trading/withdraw` | Retirar margen |
| `GET` | `/trading/balance/:trader` | Ver balance |
| `GET` | `/trading/markets` | Listar mercados |
| `GET` | `/trading/market/:market` | Datos de mercado |
| `GET` | `/trading/orderbook` | Ver orderbook |
| `POST` | `/trading/orders` | Crear orden |
| `POST` | `/trading/orders/cancel` | Cancelar orden |
| `GET` | `/trading/orders` | Listar órdenes |
| `GET` | `/trading/orders/:orderId` | Ver orden |
| `GET` | `/trading/positions` | Listar posiciones |
| `GET` | `/trading/positions/:positionId` | Ver posición |
| `POST` | `/trading/positions/close` | Cerrar posición |
| `POST` | `/trading/positions/update` | Actualizar SL/TP |
| `GET` | `/trading/trades/:market` | Trades recientes |

### **WebSocket Events**

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `subscribe:ticker` | Cliente → Servidor | Suscribirse a precios |
| `unsubscribe:ticker` | Cliente → Servidor | Desuscribirse de precios |
| `subscribe:orderbook` | Cliente → Servidor | Suscribirse a orderbook |
| `unsubscribe:orderbook` | Cliente → Servidor | Desuscribirse de orderbook |
| `subscribe:trades` | Cliente → Servidor | Suscribirse a trades |
| `ticker` | Servidor → Cliente | Update de precio (100ms) |
| `orderbook` | Servidor → Cliente | Update de orderbook (500ms) |
| `trade` | Servidor → Cliente | Nuevo trade ejecutado |
| `liquidation` | Servidor → Cliente | Alerta de liquidación |
| `order:new` | Servidor → Cliente | Nueva orden creada |

---

## 💰 Mercados Disponibles

| Market | Leverage Máx | Descripción |
|--------|--------------|-------------|
| BTC-USDC | 100x | Bitcoin / USDC |
| ETH-USDC | 100x | Ethereum / USDC |
| SOL-USDC | 50x | Solana / USDC |
| ARB-USDC | 25x | Arbitrum / USDC |
| OP-USDC | 25x | Optimism / USDC |

---

## 🔐 Seguridad

### **Verificación de Firmas**

Todas las órdenes requieren firma ECDSA:

```javascript
import { ethers } from 'ethers';

// Firmar orden
const message = ethers.solidityPackedKeccak256(
  ['string', 'address', 'string', 'string', 'uint256', 'uint256', 'uint256'],
  [orderId, trader, market, side, size, price, leverage]
);
const signature = await signer.signMessage(ethers.getBytes(message));
```

### **Protecciones Implementadas**

✅ Firmas ECDSA en todas las operaciones  
✅ Nonces únicos (prevenir replay)  
✅ Balance check antes de ejecutar  
✅ Liquidaciones automáticas  
✅ Validación de DTOs con class-validator  
✅ Rate limiting en WebSocket  

---

## 📊 Ejemplos de Uso

### **Ejemplo 1: Long Simple**

```javascript
// Comprar ETH con 10x leverage
await createOrder({
  market: 'ETH-USDC',
  type: 'MARKET',
  side: 'LONG',
  size: 1000,
  leverage: 10
});

// Si ETH sube 10% → Ganas 100%
// Si ETH baja 10% → Liquidación
```

### **Ejemplo 2: Short con Stop Loss**

```javascript
// 1. Vender BTC (apostar a que baja)
const result = await createOrder({
  market: 'BTC-USDC',
  type: 'LIMIT',
  side: 'SHORT',
  size: 5000,
  leverage: 20,
  price: 43000
});

// 2. Configurar stop loss
await updatePosition(result.position.positionId, {
  stopLoss: 44000,    // Cerrar si sube
  takeProfit: 41000   // Cerrar si baja
});
```

### **Ejemplo 3: WebSocket en Tiempo Real**

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000/trading');

// Suscribirse a ticker
socket.emit('subscribe:ticker', { market: 'ETH-USDC' });

socket.on('ticker', (data) => {
  console.log(`ETH: $${data.price} (${data.change24h}%)`);
});

// Suscribirse a liquidaciones
socket.on('liquidation', (data) => {
  alert(`🔥 Liquidación en ${data.market}`);
});
```

---

## 📚 Documentación Completa

- [**API_TRADING.md**](./documentacion/API_TRADING.md) - Documentación completa de API REST y WebSocket
- [**ARCHITECTURE.md**](./documentacion/ARCHITECTURE.md) - Arquitectura del sistema, flujos de datos
- [**QUICKSTART.md**](./documentacion/QUICKSTART.md) - Guía rápida para comenzar en 5 minutos
- [**TESTING.md**](./documentacion/TESTING.md) - Estrategias de testing (unit, integration, e2e)
- [**frontend-integration.js**](./documentacion/frontend-integration.js) - Código de ejemplo para frontend
- [**postman-collection.json**](./documentacion/postman-collection.json) - Colección Postman importable

---

## ⚠️ Advertencias

### **Liquidaciones**

Una posición se liquida cuando el precio alcanza el nivel de liquidación:

```
Precio de Liquidación (LONG) = entryPrice * (1 - 1/leverage)
Precio de Liquidación (SHORT) = entryPrice * (1 + 1/leverage)
```

**Ejemplos:**
- Entry $2400, 10x LONG → Liquidación: $2160 (-10%)
- Entry $2400, 5x LONG → Liquidación: $1920 (-20%)
- Entry $2400, 2x LONG → Liquidación: $1200 (-50%)

**Tips:**
- Usa leverage bajo para posiciones a largo plazo
- Monitorea `unrealizedPnL` constantemente
- Configura stop loss cerca del precio de liquidación
- Mantén margen extra disponible

---

## 🛠️ Desarrollo

### **Ejecutar tests**

```bash
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage
npm run test:e2e          # E2E tests
```

### **Debugging**

```bash
# Logs verbose
LOG_LEVEL=debug npm run start:dev

# Ver liquidaciones en tiempo real
tail -f logs/liquidations.log
```

### **Migración a Redis**

Para producción, migrar estado de memoria a Redis:

```typescript
// Actual: Map<orderId, Order>
// Futuro: Redis Sorted Sets + Hashes

await redis.zadd('trading:orderbook:BTC-USDC:bids', price, orderId);
await redis.hset('trading:orders', orderId, JSON.stringify(order));
```

---

## 🚧 Roadmap

**v1.0** ✅ - MVP funcional con in-memory state  
**v1.1** 🔄 - Migración a Redis para escalabilidad  
**v1.2** ⏳ - Integración con oracles Chainlink  
**v2.0** ⏳ - Settlement on-chain con state channels  
**v2.1** ⏳ - Analytics dashboard con Grafana  
**v3.0** ⏳ - Cross-chain trading (Arbitrum, Optimism, Base)  

---

## 🆘 Troubleshooting

### **Error: Insufficient balance**
→ Deposita más margen: `POST /trading/deposit`

### **Error: Invalid signature**
→ Verifica que `trader` coincide con el signer

### **Error: Order not found**
→ La orden ya fue ejecutada o cancelada

### **Liquidación inesperada**
→ Volatilidad + leverage alto = liquidación rápida  
→ Usa stop loss para protegerte

### **WebSocket se desconecta**
→ Implementa reconexión automática:
```javascript
socket.on('disconnect', () => {
  setTimeout(() => socket.connect(), 1000);
});
```

---

## 📞 Soporte

- Issues: GitHub Issues
- Email: support@yellowmeter.com
- Discord: discord.gg/yellowmeter
- Docs: https://docs.yellowmeter.com/trading

---

## 📄 Licencia

MIT License - Ver LICENSE file

---

**¡Feliz Trading!** 📈🚀

*Recuerda: El trading con apalancamiento conlleva alto riesgo. Trade responsablemente.*

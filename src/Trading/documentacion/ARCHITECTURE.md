# 🏗️ ARQUITECTURA DEL MÓDULO TRADING

## 📊 Visión General

El módulo Trading implementa un **DEX (Exchange Descentralizado)** con las siguientes características:

- **Libro de órdenes off-chain**: Matching de órdenes en memoria para latencia <10ms
- **Contratos perpetuos**: Posiciones sin vencimiento con apalancamiento hasta 100x
- **Liquidaciones automáticas**: Monitoreo continuo de precios y márgenes
- **Precios en tiempo real**: Feed de precios vía WebSocket cada 100ms
- **Settlement on-chain**: Solo depósitos/retiros se registran en blockchain

---

## 🧩 Componentes Principales

### **1. TradingModule** 
Módulo raíz que registra todos los servicios y controladores.

```typescript
@Module({
  providers: [
    TradingGateway,      // WebSocket Gateway
    TradingService,      // Lógica de negocio
    OrderbookService,    // Libro de órdenes
    PositionService,     // Gestión de posiciones
    LiquidationService,  // Motor de liquidaciones
    PriceFeedService,    // Precios de mercado
    SignatureService,    // Verificación ECDSA
  ],
  controllers: [TradingController],
  exports: [TradingService],
})
```

---

### **2. TradingGateway** (WebSocket)
**Responsabilidades:**
- Gestionar conexiones WebSocket de clientes
- Suscripciones a tickers, orderbook y trades
- Broadcast de actualizaciones en tiempo real
- Notificaciones de liquidaciones

**Intervalos de Broadcast:**
- **Tickers**: 100ms (10 actualizaciones/seg)
- **Orderbook**: 500ms (2 actualizaciones/seg)
- **Trades**: Tiempo real (event-driven)

---

### **3. TradingService**
**Responsabilidades:**
- Orquestar todas las operaciones de trading
- Validar firmas ECDSA
- Verificar balances y límites
- Coordinar entre Orderbook y Position services

**Métodos principales:**
```typescript
- createOrder(dto: CreateOrderDto): Promise<{ order, trades }>
- cancelOrder(dto: CancelOrderDto): Promise<boolean>
- closePosition(dto: ClosePositionDto): Promise<Position>
- updatePosition(dto: UpdatePositionDto): Promise<Position>
- depositMargin(dto: DepositMarginDto): Promise<TraderBalance>
- withdrawMargin(dto: WithdrawMarginDto): Promise<TraderBalance>
```

---

### **4. OrderbookService**
**Responsabilidades:**
- Mantener libro de órdenes en memoria por cada mercado
- Matching automático de órdenes (price-time priority)
- Generar trades cuando hay match
- Tracking de órdenes por trader

**Estructura de Datos:**
```typescript
orderbooks: Map<market, {
  bids: Order[],  // Ordenadas de mayor a menor precio
  asks: Order[]   // Ordenadas de menor a mayor precio
}>

orders: Map<orderId, Order>
traderOrders: Map<trader, Set<orderId>>
```

**Algoritmo de Matching:**
1. Si orden es MARKET → Match inmediato al mejor precio
2. Si orden es LIMIT → Verificar si hay match con precio opuesto
3. Price-time priority: Primero mejor precio, luego más antigua
4. Ejecutar trades y actualizar órdenes

---

### **5. PositionService**
**Responsabilidades:**
- Gestionar posiciones abiertas (LONG/SHORT)
- Calcular PnL (Profit & Loss) no realizado
- Tracking de márgenes (usado vs disponible)
- Cierre de posiciones (parcial o total)
- Balance de traders

**Cálculos Clave:**
```typescript
// PnL no realizado (LONG)
unrealizedPnL = (currentPrice - entryPrice) / entryPrice * size

// PnL no realizado (SHORT)
unrealizedPnL = (entryPrice - currentPrice) / entryPrice * size

// Precio de liquidación (LONG)
liquidationPrice = entryPrice * (1 - 1/leverage)

// Precio de liquidación (SHORT)
liquidationPrice = entryPrice * (1 + 1/leverage)

// Margen usado
margin = size / leverage
```

---

### **6. LiquidationService**
**Responsabilidades:**
- Monitorear posiciones continuamente (cada 100ms)
- Detectar posiciones sub-colateralizadas
- Ejecutar liquidaciones automáticas
- Notificar liquidaciones vía WebSocket

**Condiciones de Liquidación:**
```typescript
// LONG
if (currentPrice <= position.liquidationPrice) → LIQUIDATE

// SHORT
if (currentPrice >= position.liquidationPrice) → LIQUIDATE
```

**Proceso de Liquidación:**
1. Detectar posición en riesgo
2. Cerrar posición al precio actual
3. Aplicar fee de liquidación (0.5%)
4. Liberar margen restante (si existe)
5. Emitir evento `liquidation` vía WebSocket

---

### **7. PriceFeedService**
**Responsabilidades:**
- Proveer precios actuales de mercado
- Simular fluctuaciones realistas (modo mock)
- Historial de precios 24h (high, low, change%)
- Volumen 24h

**Fuentes de Precios (Producción):**
- Chainlink oracles
- Binance API
- Coinbase API
- Aggregated median price

**Mock Mode (Desarrollo):**
- Precios base configurados en `trading.config.ts`
- Variación aleatoria ±0.1% cada 100ms
- Tendencias simuladas

---

### **8. SignatureService**
**Responsabilidades:**
- Verificar firmas ECDSA de órdenes
- Verificar firmas de cancelaciones
- Verificar firmas de retiros
- Prevenir replay attacks con nonces

**Verificación de Orden:**
```typescript
const message = ethers.solidityPackedKeccak256(
  ['string', 'address', 'string', 'string', 'uint256', 'uint256', 'uint256'],
  [orderId, trader, market, side, size, price, leverage]
);
const recoveredAddress = ethers.verifyMessage(
  ethers.getBytes(message), 
  signature
);
return recoveredAddress.toLowerCase() === trader.toLowerCase();
```

---

## 🔄 Flujo de Datos

### **Crear Orden LIMIT**
```
1. Cliente → REST POST /trading/orders
2. TradingController → TradingService.createOrder()
3. TradingService:
   a. Verificar firma (SignatureService)
   b. Validar límites (market, size, leverage)
   c. Verificar balance (PositionService)
4. OrderbookService.addOrder()
   a. Agregar a orderbook
   b. Intentar match
   c. Si match → generar Trade
5. Si trades ejecutados → PositionService.openPosition()
6. TradingGateway.notifyNewOrder() → Broadcast WebSocket
7. Respuesta → Cliente
```

### **Crear Orden MARKET**
```
1-4. (igual que LIMIT)
5. OrderbookService: Match inmediato al mejor precio
6. Generar Trade(s)
7. PositionService.openPosition()
8. Broadcast a suscriptores de trades
9. Respuesta → Cliente
```

### **Liquidación Automática**
```
1. LiquidationService (loop cada 100ms):
   a. Obtener precios actuales (PriceFeedService)
   b. Obtener todas las posiciones abiertas
   c. Para cada posición:
      - Calcular precio actual vs liquidationPrice
      - Si en riesgo → executeLiquidation()
2. PositionService.closePosition()
3. TradingGateway.notifyLiquidation() → Broadcast
```

### **Actualización de Precios (WebSocket)**
```
1. TradingGateway (loop cada 100ms):
   a. Obtener precios de todos los mercados
   b. Para cada mercado:
      - Filtrar suscriptores de `ticker:BTC-USDC`
      - Emitir evento `ticker` a esos sockets
```

---

## 💾 Almacenamiento

### **In-Memory (Actual)**
```typescript
// OrderbookService
orderbooks: Map<market, { bids, asks }>
orders: Map<orderId, Order>
trades: Map<market, Trade[]>
traderOrders: Map<trader, Set<orderId>>

// PositionService
positions: Map<positionId, Position>
traderPositions: Map<trader, Set<positionId>>
balances: Map<trader, TraderBalance>

// PriceFeedService
prices: Map<market, MarketData>
```

### **Redis (Migración Futura)**
```
Keys:
- trading:orderbook:{market}:bids → Sorted Set
- trading:orderbook:{market}:asks → Sorted Set
- trading:orders:{orderId} → Hash
- trading:positions:{positionId} → Hash
- trading:balance:{trader} → Hash
- trading:prices:{market} → Hash
- trading:trades:{market} → List (últimos 100)
```

### **PostgreSQL (Para Analytics)**
```sql
-- Trades históricos
CREATE TABLE trades (
  trade_id VARCHAR PRIMARY KEY,
  market VARCHAR NOT NULL,
  side VARCHAR NOT NULL,
  price DECIMAL NOT NULL,
  size DECIMAL NOT NULL,
  buyer VARCHAR NOT NULL,
  seller VARCHAR NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Posiciones cerradas
CREATE TABLE closed_positions (
  position_id VARCHAR PRIMARY KEY,
  trader VARCHAR NOT NULL,
  market VARCHAR NOT NULL,
  side VARCHAR NOT NULL,
  size DECIMAL NOT NULL,
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL NOT NULL,
  realized_pnl DECIMAL NOT NULL,
  opened_at BIGINT NOT NULL,
  closed_at BIGINT NOT NULL
);
```

---

## ⚡ Optimizaciones

### **Latencia Ultra-Baja**
- Orderbook en memoria (no I/O)
- Matching algorítmico O(log n)
- WebSocket para actualizaciones push
- Sin consultas a blockchain por cada operación

### **Escalabilidad**
- Orderbook separado por mercado (paralelizable)
- Liquidation service independiente por worker
- Price feed cacheable con TTL 100ms
- Redis Pub/Sub para multi-instancia

### **Confiabilidad**
- Firmas ECDSA verificadas server-side
- Balance always checked before execution
- Atomic position updates
- Idempotent operations con nonces

---

## 🔐 Seguridad

### **Protecciones Implementadas**
✅ Verificación de firma ECDSA en todas las órdenes  
✅ Nonces para prevenir replay attacks  
✅ Balance check antes de abrir posiciones  
✅ Liquidaciones automáticas protegen solvencia  
✅ Rate limiting en WebSocket subscriptions  
✅ Validación de DTOs con class-validator  

### **Próximas Mejoras**
⏳ Whitelist de traders verificados  
⏳ Circuit breakers para volatilidad extrema  
⏳ Insurance fund para liquidaciones  
⏳ MEV protection (orden de transacciones fair)  

---

## 📈 Métricas y Monitoreo

```typescript
// Métricas clave a trackear:
- Total orders/second
- Average matching latency
- Orderbook depth por mercado
- Número de posiciones abiertas
- Total margin locked
- Liquidation rate
- WebSocket active connections
```

---

## 🚀 Roadmap

**v1.0 (Actual)** - MVP con funcionalidad básica  
**v1.1** - Migración a Redis para estado distribuido  
**v1.2** - Integración con oracles Chainlink  
**v2.0** - Settlement on-chain con state channels  
**v2.1** - Airdrop de tokens por volumen de trading  
**v3.0** - Cross-chain trading (Arbitrum, Optimism, Base)  

# 🧪 Guía de Pruebas con Postman - Trading Module

## 📦 1. Importar la Colección

### **Opción A: Importar desde archivo**
1. Abre Postman
2. Click en **Import** (arriba izquierda)
3. Selecciona el archivo: `postman-collection.json`
4. Click en **Import**

### **Opción B: Importar desde raw JSON**
1. Abre Postman
2. Click en **Import** → **Raw text**
3. Copia y pega todo el contenido de `postman-collection.json`
4. Click en **Continue** → **Import**

---

## ⚙️ 2. Configurar Variables

Una vez importada, configura las variables de la colección:

1. Click derecho en la colección **"YellowMeter Trading API"**
2. Selecciona **Edit**
3. Ve a la pestaña **Variables**
4. Configura:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `baseUrl` | `http://localhost:3000` | URL del servidor |
| `traderAddress` | `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` | Tu dirección Ethereum |
| `signature` | `0xtest123...` | Firma ECDSA (modo test) |

> **Nota:** Para pruebas sin blockchain, puedes usar valores dummy en `signature`. El backend está en modo test.

---

## 🚀 3. Flujo de Pruebas (Orden Recomendado)

### **FASE 1: Verificación Inicial**

#### ✅ **1.1 Health Check**
**Request:** `GET /trading/health`

```bash
GET http://localhost:3000/trading/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "service": "trading",
  "timestamp": "2026-02-04T18:00:00.000Z",
  "markets": ["BTC-USDC", "ETH-USDC", "SOL-USDC", "ARB-USDC", "OP-USDC"]
}
```

**✅ Test exitoso:** Status 200 y `status: "ok"`

---

#### ✅ **1.2 Get All Markets**
**Request:** `GET /trading/markets`

```bash
GET http://localhost:3000/trading/markets
```

**Respuesta esperada:**
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
    ...
  }
]
```

**✅ Test exitoso:** Status 200 y array de mercados

---

### **FASE 2: Setup de Cuenta**

#### 💰 **2.1 Deposit Margin**
**Request:** `POST /trading/deposit`

```json
{
  "trader": "{{traderAddress}}",
  "amount": 1000,
  "txHash": "0xtest123abc"
}
```

**Respuesta esperada:**
```json
{
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "totalBalance": 1000,
  "availableMargin": 1000,
  "usedMargin": 0,
  "unrealizedPnL": 0,
  "totalPnL": 0,
  "openPositions": 0,
  "updatedAt": 1706889600000
}
```

**✅ Test exitoso:** `totalBalance: 1000`, `availableMargin: 1000`

---

#### 💎 **2.2 Get Balance**
**Request:** `GET /trading/balance/{{traderAddress}}`

```bash
GET http://localhost:3000/trading/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Respuesta esperada:**
```json
{
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "totalBalance": 1000,
  "availableMargin": 1000,
  "usedMargin": 0,
  "unrealizedPnL": 0,
  "totalPnL": 0,
  "openPositions": 0
}
```

**✅ Test exitoso:** Balance refleja el depósito anterior

---

### **FASE 3: Trading Básico**

#### 📝 **3.1 Create MARKET Order - LONG**
**Request:** `POST /trading/orders`

```json
{
  "trader": "{{traderAddress}}",
  "market": "ETH-USDC",
  "type": "MARKET",
  "side": "LONG",
  "size": 1000,
  "leverage": 10,
  "signature": "{{signature}}",
  "nonce": "1706889600000"
}
```

**Respuesta esperada:**
```json
{
  "order": {
    "orderId": "order_1706889600_abc123",
    "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "market": "ETH-USDC",
    "type": "MARKET",
    "side": "LONG",
    "size": 1000,
    "leverage": 10,
    "status": "PENDING",
    "filledSize": 0,
    "remainingSize": 1000,
    "timestamp": 1706889600000
  },
  "trades": []
}
```

**✅ Test exitoso:** 
- Status 201
- `orderId` generado
- `status: "PENDING"` o `"FILLED"` (depende del orderbook)

**📌 Importante:** Guarda el `orderId` para pruebas posteriores

---

#### 📊 **3.2 Get Trader Orders**
**Request:** `GET /trading/orders?trader={{traderAddress}}&activeOnly=true`

```bash
GET http://localhost:3000/trading/orders?trader=0x742...&activeOnly=true
```

**Respuesta esperada:**
```json
[
  {
    "orderId": "order_1706889600_abc123",
    "market": "ETH-USDC",
    "type": "MARKET",
    "side": "LONG",
    "size": 1000,
    "status": "PENDING",
    "filledSize": 0,
    "remainingSize": 1000,
    "timestamp": 1706889600000
  }
]
```

**✅ Test exitoso:** Array con la orden creada anteriormente

---

#### 📍 **3.3 Get Trader Positions**
**Request:** `GET /trading/positions?trader={{traderAddress}}`

```bash
GET http://localhost:3000/trading/positions?trader=0x742...
```

**Respuesta esperada (si la orden se ejecutó):**
```json
[
  {
    "positionId": "pos_abc123",
    "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "market": "ETH-USDC",
    "side": "LONG",
    "size": 1000,
    "leverage": 10,
    "entryPrice": 2400,
    "currentPrice": 2400,
    "margin": 100,
    "unrealizedPnL": 0,
    "liquidationPrice": 2160,
    "isLiquidated": false,
    "openedAt": 1706889600000
  }
]
```

**✅ Test exitoso:** 
- Array con posición abierta
- `margin: 100` (1000 / 10 leverage)
- `liquidationPrice: 2160` (2400 * 0.9)

**📌 Importante:** Guarda el `positionId`

---

### **FASE 4: Gestión de Órdenes**

#### 📝 **4.1 Create LIMIT Order - SHORT**
**Request:** `POST /trading/orders`

```json
{
  "trader": "{{traderAddress}}",
  "market": "BTC-USDC",
  "type": "LIMIT",
  "side": "SHORT",
  "size": 2000,
  "leverage": 5,
  "price": 43000,
  "signature": "{{signature}}",
  "nonce": "1706889700000"
}
```

**Respuesta esperada:**
```json
{
  "order": {
    "orderId": "order_1706889700_xyz789",
    "market": "BTC-USDC",
    "type": "LIMIT",
    "side": "SHORT",
    "size": 2000,
    "price": 43000,
    "status": "PENDING",
    ...
  },
  "trades": []
}
```

**✅ Test exitoso:** Orden LIMIT creada con precio específico

---

#### ❌ **4.2 Cancel Order**
**Request:** `POST /trading/orders/cancel`

```json
{
  "orderId": "order_1706889700_xyz789",
  "trader": "{{traderAddress}}",
  "signature": "{{signature}}"
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "orderId": "order_1706889700_xyz789"
}
```

**✅ Test exitoso:** `success: true`

---

#### 🔍 **4.3 Get Order by ID**
**Request:** `GET /trading/orders/order_1706889700_xyz789`

```bash
GET http://localhost:3000/trading/orders/order_1706889700_xyz789
```

**Respuesta esperada:**
```json
{
  "orderId": "order_1706889700_xyz789",
  "status": "CANCELLED",
  ...
}
```

**✅ Test exitoso:** `status: "CANCELLED"`

---

### **FASE 5: Gestión de Posiciones**

#### ✏️ **5.1 Update Position (Stop Loss/Take Profit)**
**Request:** `POST /trading/positions/update`

```json
{
  "positionId": "pos_abc123",
  "trader": "{{traderAddress}}",
  "stopLoss": 2200,
  "takeProfit": 2600,
  "signature": "{{signature}}"
}
```

**Respuesta esperada:**
```json
{
  "positionId": "pos_abc123",
  "stopLoss": 2200,
  "takeProfit": 2600,
  "updated": true
}
```

**✅ Test exitoso:** Stop Loss y Take Profit configurados

---

#### 🔍 **5.2 Get Position by ID**
**Request:** `GET /trading/positions/pos_abc123`

```bash
GET http://localhost:3000/trading/positions/pos_abc123
```

**Respuesta esperada:**
```json
{
  "positionId": "pos_abc123",
  "market": "ETH-USDC",
  "side": "LONG",
  "size": 1000,
  "entryPrice": 2400,
  "currentPrice": 2450,
  "unrealizedPnL": 20.83,
  "stopLoss": 2200,
  "takeProfit": 2600,
  ...
}
```

**✅ Test exitoso:** 
- `unrealizedPnL` muestra ganancia/pérdida
- SL/TP configurados

---

#### 🔒 **5.3 Close Position (Partial)**
**Request:** `POST /trading/positions/close`

```json
{
  "positionId": "pos_abc123",
  "trader": "{{traderAddress}}",
  "percentage": 50,
  "signature": "{{signature}}"
}
```

**Respuesta esperada:**
```json
{
  "positionId": "pos_abc123",
  "closedSize": 500,
  "remainingSize": 500,
  "exitPrice": 2450,
  "realizedPnL": 10.41,
  "closedAt": 1706889800000
}
```

**✅ Test exitoso:** 
- `closedSize: 500` (50% de 1000)
- `remainingSize: 500`
- `realizedPnL` muestra ganancia realizada

---

#### 🔒 **5.4 Close Position (Full)**
**Request:** `POST /trading/positions/close`

```json
{
  "positionId": "pos_abc123",
  "trader": "{{traderAddress}}",
  "percentage": 100,
  "signature": "{{signature}}"
}
```

**Respuesta esperada:**
```json
{
  "positionId": "pos_abc123",
  "closedSize": 500,
  "remainingSize": 0,
  "exitPrice": 2450,
  "realizedPnL": 10.41,
  "closedAt": 1706889900000
}
```

**✅ Test exitoso:** 
- `remainingSize: 0`
- Posición completamente cerrada

---

### **FASE 6: Consultas de Mercado**

#### 📊 **6.1 Get Orderbook**
**Request:** `GET /trading/orderbook?market=BTC-USDC&depth=20`

```bash
GET http://localhost:3000/trading/orderbook?market=BTC-USDC&depth=20
```

**Respuesta esperada:**
```json
{
  "market": "BTC-USDC",
  "bids": [
    { "price": 42000, "size": 15000, "orders": 3 },
    { "price": 41999, "size": 8000, "orders": 1 },
    ...
  ],
  "asks": [
    { "price": 42001, "size": 12000, "orders": 2 },
    { "price": 42002, "size": 20000, "orders": 4 },
    ...
  ],
  "spread": 1.0,
  "lastPrice": 42000.5,
  "timestamp": 1706889600000
}
```

**✅ Test exitoso:** 
- `bids` ordenados de mayor a menor precio
- `asks` ordenados de menor a mayor precio
- `spread` calculado

---

#### 📈 **6.2 Get Market Data**
**Request:** `GET /trading/market/ETH-USDC`

```bash
GET http://localhost:3000/trading/market/ETH-USDC
```

**Respuesta esperada:**
```json
{
  "market": "ETH-USDC",
  "price": 2450.50,
  "change24h": 5.2,
  "high24h": 2480.00,
  "low24h": 2320.00,
  "volume24h": 1250000,
  "timestamp": 1706889600000
}
```

**✅ Test exitoso:** Datos de mercado actualizados

---

#### 💱 **6.3 Get Recent Trades**
**Request:** `GET /trading/trades/ETH-USDC?limit=50`

```bash
GET http://localhost:3000/trading/trades/ETH-USDC?limit=50
```

**Respuesta esperada:**
```json
[
  {
    "tradeId": "trade_123",
    "market": "ETH-USDC",
    "price": 2450,
    "size": 1000,
    "side": "LONG",
    "timestamp": 1706889600000
  },
  ...
]
```

**✅ Test exitoso:** Array de trades recientes

---

### **FASE 7: Withdraw**

#### 💸 **7.1 Withdraw Margin**
**Request:** `POST /trading/withdraw`

```json
{
  "trader": "{{traderAddress}}",
  "amount": 500,
  "signature": "{{signature}}"
}
```

**Respuesta esperada:**
```json
{
  "trader": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "totalBalance": 500,
  "availableMargin": 500,
  "withdrawn": 500,
  "updatedAt": 1706890000000
}
```

**✅ Test exitoso:** Balance actualizado después del retiro

---

## 🔄 4. Flujo Completo de Testing

Ejecuta las peticiones en este orden para un test completo:

```
1. Health Check              → Verificar servidor
2. Get All Markets           → Ver mercados disponibles
3. Deposit Margin (1000)     → Cargar cuenta
4. Get Balance               → Verificar depósito
5. Create MARKET Order LONG  → Abrir posición
6. Get Trader Orders         → Ver orden creada
7. Get Trader Positions      → Ver posición abierta
8. Create LIMIT Order SHORT  → Crear orden pendiente
9. Get Order by ID           → Ver orden específica
10. Cancel Order             → Cancelar orden pendiente
11. Update Position          → Configurar SL/TP
12. Get Position by ID       → Verificar updates
13. Close Position (50%)     → Cierre parcial
14. Close Position (100%)    → Cierre completo
15. Get Orderbook            → Ver libro de órdenes
16. Get Market Data          → Datos de mercado
17. Get Recent Trades        → Historial de trades
18. Withdraw Margin (500)    → Retirar fondos
19. Get Balance              → Verificar balance final
```

---

## 🧪 5. Casos de Prueba Adicionales

### **Test de Error: Balance Insuficiente**

```json
POST /trading/orders
{
  "trader": "{{traderAddress}}",
  "market": "ETH-USDC",
  "type": "MARKET",
  "side": "LONG",
  "size": 100000,
  "leverage": 10,
  "signature": "{{signature}}",
  "nonce": "{{$timestamp}}"
}
```

**Respuesta esperada:**
```json
{
  "statusCode": 400,
  "message": "Insufficient balance",
  "error": "Bad Request"
}
```

---

### **Test de Error: Invalid Signature**

```json
POST /trading/orders
{
  "trader": "{{traderAddress}}",
  "market": "ETH-USDC",
  "type": "MARKET",
  "side": "LONG",
  "size": 100,
  "leverage": 10,
  "signature": "0xINVALID",
  "nonce": "{{$timestamp}}"
}
```

**Respuesta esperada:**
```json
{
  "statusCode": 400,
  "message": "Invalid signature",
  "error": "Bad Request"
}
```

---

### **Test de Error: Order Not Found**

```bash
GET /trading/orders/order_NONEXISTENT
```

**Respuesta esperada:**
```json
{
  "statusCode": 404,
  "message": "Order not found",
  "error": "Not Found"
}
```

---

## 📊 6. Tests de Performance

### **Test de Carga: Múltiples Órdenes**

Ejecuta en rápida sucesión (usando Postman Runner):

```
1. Create Order LONG ETH
2. Create Order SHORT BTC
3. Create Order LONG SOL
4. Create Order SHORT ARB
5. Create Order LONG OP
```

**✅ Éxito:** Todas las órdenes se crean sin errores

---

### **Test de Estrés: 100 Peticiones**

Usa **Postman Runner**:
1. Selecciona la colección
2. Click en **Run**
3. Configura:
   - Iterations: `100`
   - Delay: `100ms`
4. Run

**✅ Éxito:** 
- Success rate > 95%
- Average response time < 100ms

---

## 🎯 7. Checklist de Validación

### **Funcionalidad Básica**
- [ ] Health check responde OK
- [ ] Listar mercados muestra 5 mercados
- [ ] Depositar aumenta balance
- [ ] Balance refleja depósitos correctamente

### **Órdenes**
- [ ] Crear MARKET order ejecuta inmediatamente
- [ ] Crear LIMIT order queda pendiente
- [ ] Obtener órdenes muestra historial
- [ ] Cancelar orden actualiza estado

### **Posiciones**
- [ ] Abrir posición descuenta margen
- [ ] Ver posición muestra PnL actualizado
- [ ] Actualizar SL/TP funciona
- [ ] Cerrar posición libera margen
- [ ] Cierre parcial mantiene posición abierta

### **Consultas**
- [ ] Orderbook muestra bids y asks ordenados
- [ ] Market data tiene precios actualizados
- [ ] Trades recientes se listan

### **Validaciones**
- [ ] Balance insuficiente rechaza orden
- [ ] Firma inválida rechaza operación
- [ ] Orden inexistente devuelve 404

---

## 💡 8. Tips para Testing

### **Variables Dinámicas en Postman**

Usa variables de entorno para reutilizar valores:

```javascript
// En Tests tab de "Create Order":
pm.test("Save orderId", function() {
    var jsonData = pm.response.json();
    pm.environment.set("lastOrderId", jsonData.order.orderId);
});

// Luego en "Cancel Order" usa:
// {{lastOrderId}}
```

### **Scripts de Pre-request**

Genera nonce automático:

```javascript
// Pre-request Script:
pm.environment.set("nonce", Date.now().toString());
```

### **Tests Automáticos**

Agrega validaciones en tab Tests:

```javascript
pm.test("Status is 200", function() {
    pm.response.to.have.status(200);
});

pm.test("Has balance", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.totalBalance).to.be.above(0);
});
```

---

## 🔥 9. Testing WebSocket (Fuera de Postman)

Para WebSocket usa la consola del browser:

```javascript
const socket = io('ws://localhost:3000/trading');

socket.on('connect', () => {
  console.log('✅ Connected');
  socket.emit('subscribe:ticker', { market: 'ETH-USDC' });
});

socket.on('ticker', (data) => {
  console.log('💹 Price:', data.price);
});
```

---

## 📞 10. Troubleshooting

### **Error: connect ECONNREFUSED**
→ El servidor no está corriendo. Ejecuta: `npm run start:dev`

### **Error 400: Invalid signature**
→ En modo test, usa `"signature": "0xtest"` como placeholder

### **Error 400: Insufficient balance**
→ Ejecuta primero "Deposit Margin" con amount > size/leverage

### **No se crean posiciones**
→ Verifica que el orderbook tenga órdenes opuestas para match

---

## ✅ 11. Testing Completado

Al finalizar todas las pruebas, deberías tener:

- ✅ 18 requests ejecutados exitosamente
- ✅ Balance inicial y final calculados
- ✅ Órdenes creadas, canceladas
- ✅ Posiciones abiertas y cerradas
- ✅ PnL realizado registrado
- ✅ Todos los endpoints validados

---

**¡Happy Testing!** 🚀🧪

*Para más información, consulta [API_TRADING.md](./API_TRADING.md)*

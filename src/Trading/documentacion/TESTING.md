# 🧪 Testing - Trading Module

## 📋 Estrategia de Testing

Este módulo usa 3 niveles de testing:
1. **Unit Tests** - Servicios individuales
2. **Integration Tests** - Flujos completos
3. **E2E Tests** - API REST + WebSocket

---

## 🛠️ Setup

```bash
# Instalar deps de testing
npm install --save-dev @nestjs/testing jest supertest

# Ejecutar tests
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage
npm run test:e2e          # E2E tests
```

---

## 1️⃣ Unit Tests

### **OrderbookService**

```typescript
// trading/services/orderbook.service.spec.ts
import { Test } from '@nestjs/testing';
import { OrderbookService } from './orderbook.service';

describe('OrderbookService', () => {
  let service: OrderbookService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [OrderbookService],
    }).compile();

    service = module.get<OrderbookService>(OrderbookService);
  });

  describe('addOrder', () => {
    it('should add limit order to orderbook', () => {
      const order = {
        orderId: 'order_1',
        market: 'ETH-USDC',
        type: 'LIMIT',
        side: 'LONG',
        size: 1000,
        price: 2400,
        // ...
      };

      const trades = service.addOrder(order);
      
      expect(trades).toEqual([]);
      expect(service.getOrder('order_1')).toBeDefined();
    });

    it('should match market order immediately', () => {
      // Agregar orden LIMIT primero
      service.addOrder({
        orderId: 'order_1',
        side: 'SHORT',
        type: 'LIMIT',
        price: 2400,
        size: 1000,
        // ...
      });

      // Agregar orden MARKET que hace match
      const trades = service.addOrder({
        orderId: 'order_2',
        side: 'LONG',
        type: 'MARKET',
        size: 500,
        // ...
      });

      expect(trades.length).toBeGreaterThan(0);
      expect(trades[0].size).toBe(500);
      expect(trades[0].price).toBe(2400);
    });
  });

  describe('getOrderbook', () => {
    it('should return sorted bids and asks', () => {
      service.addOrder({
        orderId: 'order_1',
        side: 'LONG',
        type: 'LIMIT',
        price: 2400,
        size: 1000,
      });

      service.addOrder({
        orderId: 'order_2',
        side: 'SHORT',
        type: 'LIMIT',
        price: 2401,
        size: 2000,
      });

      const orderbook = service.getOrderbook('ETH-USDC', 10);

      expect(orderbook.bids.length).toBeGreaterThan(0);
      expect(orderbook.asks.length).toBeGreaterThan(0);
      expect(orderbook.bids[0].price).toBeGreaterThan(orderbook.bids[1]?.price || 0);
    });
  });
});
```

### **PositionService**

```typescript
describe('PositionService', () => {
  let service: PositionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PositionService],
    }).compile();

    service = module.get<PositionService>(PositionService);
  });

  describe('openPosition', () => {
    it('should open long position with correct margin', () => {
      // Deposit margin first
      service.depositMargin('0xTrader', 1000);

      const position = service.openPosition(
        '0xTrader',
        'ETH-USDC',
        'LONG',
        5000,  // size
        2400,  // entry price
        10,    // leverage
        'ISOLATED'
      );

      expect(position.size).toBe(5000);
      expect(position.margin).toBe(500);  // 5000 / 10
      expect(position.entryPrice).toBe(2400);
      expect(position.side).toBe('LONG');
    });

    it('should throw error if insufficient balance', () => {
      service.depositMargin('0xTrader', 100);

      expect(() => {
        service.openPosition('0xTrader', 'ETH-USDC', 'LONG', 5000, 2400, 10, 'ISOLATED');
      }).toThrow('Insufficient balance');
    });
  });

  describe('closePosition', () => {
    it('should close position and realize PnL', () => {
      service.depositMargin('0xTrader', 1000);
      
      const position = service.openPosition(
        '0xTrader',
        'ETH-USDC',
        'LONG',
        1000,
        2400,
        10,
        'ISOLATED'
      );

      // Price goes up 10%
      const closed = service.closePosition(position.positionId, 2640, 100);

      expect(closed.realizedPnL).toBeGreaterThan(0);
      expect(Math.round(closed.realizedPnL)).toBe(100);  // 10% * 1000 = 100
    });

    it('should partially close position', () => {
      service.depositMargin('0xTrader', 1000);
      
      const position = service.openPosition(
        '0xTrader',
        'ETH-USDC',
        'LONG',
        1000,
        2400,
        10,
        'ISOLATED'
      );

      const closed = service.closePosition(position.positionId, 2640, 50);

      expect(closed.closedSize).toBe(500);  // 50% of 1000
      expect(position.size).toBe(500);  // Remaining
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('should calculate correct liquidation price for LONG', () => {
      const liqPrice = service['calculateLiquidationPrice'](
        'LONG',
        2400,  // entry
        10     // leverage
      );

      expect(liqPrice).toBe(2160);  // 2400 * (1 - 1/10) = 2160
    });

    it('should calculate correct liquidation price for SHORT', () => {
      const liqPrice = service['calculateLiquidationPrice'](
        'SHORT',
        2400,
        10
      );

      expect(liqPrice).toBe(2640);  // 2400 * (1 + 1/10) = 2640
    });
  });
});
```

### **LiquidationService**

```typescript
describe('LiquidationService', () => {
  let service: LiquidationService;
  let positionService: PositionService;
  let priceFeedService: PriceFeedService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiquidationService,
        PositionService,
        {
          provide: PriceFeedService,
          useValue: {
            getPrice: jest.fn().mockReturnValue(2400),
          },
        },
      ],
    }).compile();

    service = module.get<LiquidationService>(LiquidationService);
    positionService = module.get<PositionService>(PositionService);
    priceFeedService = module.get<PriceFeedService>(PriceFeedService);
  });

  it('should liquidate position when price hits liquidation level', () => {
    // Open position
    positionService.depositMargin('0xTrader', 1000);
    const position = positionService.openPosition(
      '0xTrader',
      'ETH-USDC',
      'LONG',
      1000,
      2400,
      10,
      'ISOLATED'
    );

    expect(position.liquidationPrice).toBe(2160);

    // Price drops to liquidation level
    jest.spyOn(priceFeedService, 'getPrice').mockReturnValue(2160);

    // Check liquidations
    const liquidations = service.checkLiquidations();

    expect(liquidations.length).toBe(1);
    expect(liquidations[0].positionId).toBe(position.positionId);
  });
});
```

### **SignatureService**

```typescript
describe('SignatureService', () => {
  let service: SignatureService;

  beforeEach(() => {
    service = new SignatureService();
  });

  it('should verify valid order signature', async () => {
    const wallet = ethers.Wallet.createRandom();
    const trader = await wallet.getAddress();

    const message = ethers.solidityPackedKeccak256(
      ['string', 'address', 'string', 'string', 'uint256', 'uint256', 'uint256'],
      ['order_1', trader, 'ETH-USDC', 'LONG', 1000, 2400, 10]
    );
    const signature = await wallet.signMessage(ethers.getBytes(message));

    const isValid = service.verifyOrderSignature(
      'order_1',
      trader,
      'ETH-USDC',
      'LONG',
      1000,
      2400,
      10,
      signature
    );

    expect(isValid).toBe(true);
  });

  it('should reject invalid signature', () => {
    const isValid = service.verifyOrderSignature(
      'order_1',
      '0xTrader',
      'ETH-USDC',
      'LONG',
      1000,
      2400,
      10,
      '0xInvalidSignature'
    );

    expect(isValid).toBe(false);
  });
});
```

---

## 2️⃣ Integration Tests

### **TradingService (Full Flow)**

```typescript
describe('TradingService Integration', () => {
  let tradingService: TradingService;
  let orderbookService: OrderbookService;
  let positionService: PositionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TradingService,
        OrderbookService,
        PositionService,
        LiquidationService,
        PriceFeedService,
        SignatureService,
      ],
    }).compile();

    tradingService = module.get<TradingService>(TradingService);
    orderbookService = module.get<OrderbookService>(OrderbookService);
    positionService = module.get<PositionService>(PositionService);
  });

  it('should create order, match, and open position', async () => {
    const wallet = ethers.Wallet.createRandom();
    const trader = await wallet.getAddress();

    // Deposit margin
    await tradingService.depositMargin({
      trader,
      amount: 1000,
      txHash: '0xtest',
    });

    // Create sell order first
    const sellOrder = await createSignedOrder(wallet, {
      side: 'SHORT',
      type: 'LIMIT',
      price: 2400,
      size: 1000,
    });
    await tradingService.createOrder(sellOrder);

    // Create buy order that matches
    const buyOrder = await createSignedOrder(wallet, {
      side: 'LONG',
      type: 'MARKET',
      size: 500,
    });
    const result = await tradingService.createOrder(buyOrder);

    expect(result.trades.length).toBeGreaterThan(0);
    
    // Check position was opened
    const positions = tradingService.getTraderPositions(trader);
    expect(positions.length).toBeGreaterThan(0);
    expect(positions[0].size).toBe(500);
  });
});
```

---

## 3️⃣ E2E Tests

### **REST API**

```typescript
// test/trading.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Trading API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /trading/orders', () => {
    it('should create market order', async () => {
      const wallet = ethers.Wallet.createRandom();
      const trader = await wallet.getAddress();

      // Deposit first
      await request(app.getHttpServer())
        .post('/trading/deposit')
        .send({
          trader,
          amount: 1000,
          txHash: '0xtest',
        });

      // Create order
      const orderDto = await createSignedOrderDto(wallet, {
        market: 'ETH-USDC',
        type: 'MARKET',
        side: 'LONG',
        size: 100,
        leverage: 10,
      });

      const response = await request(app.getHttpServer())
        .post('/trading/orders')
        .send(orderDto)
        .expect(201);

      expect(response.body.order).toBeDefined();
      expect(response.body.order.status).toMatch(/PENDING|FILLED/);
    });

    it('should reject order with invalid signature', async () => {
      await request(app.getHttpServer())
        .post('/trading/orders')
        .send({
          trader: '0xTrader',
          market: 'ETH-USDC',
          type: 'MARKET',
          side: 'LONG',
          size: 100,
          leverage: 10,
          signature: '0xInvalid',
          nonce: Date.now().toString(),
        })
        .expect(400);
    });
  });

  describe('GET /trading/markets', () => {
    it('should return all markets', async () => {
      const response = await request(app.getHttpServer())
        .get('/trading/markets')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('market');
      expect(response.body[0]).toHaveProperty('price');
    });
  });

  describe('GET /trading/orderbook', () => {
    it('should return orderbook for market', async () => {
      const response = await request(app.getHttpServer())
        .get('/trading/orderbook?market=BTC-USDC&depth=10')
        .expect(200);

      expect(response.body).toHaveProperty('market');
      expect(response.body).toHaveProperty('bids');
      expect(response.body).toHaveProperty('asks');
    });
  });
});
```

### **WebSocket**

```typescript
import io from 'socket.io-client';

describe('Trading WebSocket (e2e)', () => {
  let socket;

  beforeAll((done) => {
    socket = io('http://localhost:3000/trading', {
      transports: ['websocket'],
    });

    socket.on('connect', done);
  });

  afterAll(() => {
    socket.disconnect();
  });

  it('should receive ticker updates', (done) => {
    socket.emit('subscribe:ticker', { market: 'ETH-USDC' });

    socket.on('ticker', (data) => {
      expect(data).toHaveProperty('market');
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('change24h');
      done();
    });
  }, 10000);

  it('should receive orderbook updates', (done) => {
    socket.emit('subscribe:orderbook', { market: 'BTC-USDC', depth: 20 });

    socket.on('orderbook', (data) => {
      expect(data).toHaveProperty('bids');
      expect(data).toHaveProperty('asks');
      expect(Array.isArray(data.bids)).toBe(true);
      done();
    });
  }, 10000);
});
```

---

## 🔥 Load Testing

### **Artillery Config**

```yaml
# artillery-trading.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  engines:
    socketio:
      transports: ['websocket']

scenarios:
  - name: "REST API - Create Orders"
    flow:
      - post:
          url: "/trading/orders"
          json:
            trader: "0x{{ $randomString() }}"
            market: "ETH-USDC"
            type: "MARKET"
            side: "LONG"
            size: 100
            leverage: 10
            signature: "0xtest"
            nonce: "{{ $timestamp }}"

  - name: "WebSocket - Subscribe Ticker"
    engine: socketio
    flow:
      - emit:
          channel: "subscribe:ticker"
          data:
            market: "BTC-USDC"
      - think: 30
```

```bash
# Ejecutar load test
npm install -g artillery
artillery run artillery-trading.yml
```

---

## 📊 Coverage Goals

- **Unit Tests**: >80% coverage
- **Integration Tests**: Flujos críticos completos
- **E2E Tests**: Todos los endpoints REST y WebSocket

```bash
npm run test:cov

# Output:
# Statements   : 85.23%
# Branches     : 78.12%
# Functions    : 82.45%
# Lines        : 84.67%
```

---

## ✅ Testing Checklist

### **Funcionalidad Core**
- [x] Crear órdenes MARKET
- [x] Crear órdenes LIMIT
- [x] Matching de órdenes
- [x] Abrir posiciones LONG
- [x] Abrir posiciones SHORT
- [x] Cerrar posiciones (full y partial)
- [x] Liquidaciones automáticas
- [x] Depósitos de margen
- [x] Retiros de margen

### **Validaciones**
- [x] Verificación de firmas ECDSA
- [x] Balance insuficiente
- [x] Límites de orden (min/max)
- [x] Leverage máximo por mercado
- [x] Nonces únicos

### **WebSocket**
- [x] Conexión/desconexión
- [x] Subscribe/unsubscribe ticker
- [x] Subscribe/unsubscribe orderbook
- [x] Subscribe/unsubscribe trades
- [x] Notificaciones de liquidación
- [x] Reconexión automática

### **Edge Cases**
- [x] Orden más grande que orderbook disponible
- [x] Cerrar posición inexistente
- [x] Cancelar orden ya ejecutada
- [x] Multiple positions en mismo mercado
- [x] Liquidación múltiple simultánea

---

## 🐛 Debugging

```typescript
// Habilitar logs verbose en tests
process.env.LOG_LEVEL = 'debug';

// Mock de servicios externos
jest.mock('./services/price-feed.service', () => ({
  PriceFeedService: jest.fn().mockImplementation(() => ({
    getPrice: jest.fn().mockReturnValue(2400),
    getMarketData: jest.fn().mockReturnValue({
      market: 'ETH-USDC',
      price: 2400,
      change24h: 5.2,
    }),
  })),
}));
```

---

¡Happy Testing! 🧪🚀

# 🧪 Testing Guide - Chess Module

## 📋 Tipos de Tests

### 1. Unit Tests
### 2. Integration Tests  
### 3. E2E Tests (WebSocket)
### 4. Manual Testing con Postman

---

## 🔧 Configuración de Tests

### Instalar Dependencias

```bash
npm install --save-dev @nestjs/testing jest supertest socket.io-client
```

### Configuración Jest

```json
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

---

## 1️⃣ Unit Tests - Signature Service

```typescript
// Chess/services/signature.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SignatureService } from './signature.service';
import { ethers } from 'ethers';

describe('SignatureService', () => {
  let service: SignatureService;
  let wallet: ethers.Wallet;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignatureService],
    }).compile();

    service = module.get<SignatureService>(SignatureService);
    
    // Wallet de prueba
    wallet = ethers.Wallet.createRandom();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify valid signature', async () => {
    // Arrange
    const message = 'Test message';
    const signature = await wallet.signMessage(message);

    // Act
    const result = await service.verifySignature(message, signature);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.recoveredAddress.toLowerCase()).toBe(
      wallet.address.toLowerCase(),
    );
  });

  it('should reject invalid signature', async () => {
    // Arrange
    const message = 'Test message';
    const fakeSignature = '0x' + '00'.repeat(65);

    // Act
    const result = await service.verifySignature(message, fakeSignature);

    // Assert
    expect(result.isValid).toBe(false);
  });

  it('should detect tampered message', async () => {
    // Arrange
    const originalMessage = 'Original message';
    const tamperedMessage = 'Tampered message';
    const signature = await wallet.signMessage(originalMessage);

    // Act
    const result = await service.verifySignature(tamperedMessage, signature);

    // Assert
    expect(result.recoveredAddress.toLowerCase()).not.toBe(
      wallet.address.toLowerCase(),
    );
  });
});
```

---

## 2️⃣ Unit Tests - Chess Service

```typescript
// Chess/chess.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ChessService } from './chess.service';
import { SignatureService } from './services/signature.service';
import { BadRequestException } from '@nestjs/common';

describe('ChessService', () => {
  let service: ChessService;
  let signatureService: SignatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChessService, SignatureService],
    }).compile();

    service = module.get<ChessService>(ChessService);
    signatureService = module.get<SignatureService>(SignatureService);
  });

  describe('Game Creation', () => {
    it('should create a new game', async () => {
      // Arrange
      const dto = {
        walletAddress: '0x' + '11'.repeat(20),
        wagerAmount: 10,
        signature: '0x_mock_',
      };

      // Mock signature verification
      jest.spyOn(signatureService, 'verifySignature').mockResolvedValue({
        isValid: true,
        recoveredAddress: dto.walletAddress,
        message: '',
      });

      // Act
      const result = await service.startGame(dto);

      // Assert
      expect(result.gameId).toBeDefined();
      expect(result.wagerAmount).toBe(10);
      expect(result.potAmount).toBe(20);
    });

    it('should reject invalid signature', async () => {
      // Arrange
      const dto = {
        walletAddress: '0x' + '11'.repeat(20),
        wagerAmount: 10,
        signature: '0x_invalid_',
      };

      jest.spyOn(signatureService, 'verifySignature').mockResolvedValue({
        isValid: false,
        recoveredAddress: '',
        message: 'Invalid',
      });

      // Act & Assert
      await expect(service.startGame(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Move Validation', () => {
    it('should accept legal move', async () => {
      // Arrange - Create game first
      const gameDto = {
        walletAddress: '0x' + '11'.repeat(20),
        wagerAmount: 10,
        signature: '0x_mock_',
      };

      jest.spyOn(signatureService, 'verifySignature').mockResolvedValue({
        isValid: true,
        recoveredAddress: gameDto.walletAddress,
        message: '',
      });

      const game = await service.startGame(gameDto);
      
      // Join as player 2
      await service.joinGame(game.gameId, '0x' + '22'.repeat(20), '0x_mock_');

      // Act - Make move
      const moveDto = {
        gameId: game.gameId,
        walletAddress: gameDto.walletAddress,
        move: 'e2e4',
        nonce: 1,
        signature: '0x_mock_',
      };

      const result = await service.makeMove(moveDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.move).toBe('e2e4');
    });

    it('should reject illegal move', async () => {
      // Arrange
      const gameDto = {
        walletAddress: '0x' + '11'.repeat(20),
        wagerAmount: 10,
        signature: '0x_mock_',
      };

      jest.spyOn(signatureService, 'verifySignature').mockResolvedValue({
        isValid: true,
        recoveredAddress: gameDto.walletAddress,
        message: '',
      });

      const game = await service.startGame(gameDto);
      await service.joinGame(game.gameId, '0x' + '22'.repeat(20), '0x_mock_');

      // Act - Illegal move
      const moveDto = {
        gameId: game.gameId,
        walletAddress: gameDto.walletAddress,
        move: 'e2e5', // Illegal: pawn can't jump 2 squares except from starting position
        nonce: 1,
        signature: '0x_mock_',
      };

      // Assert
      await expect(service.makeMove(moveDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject move out of turn', async () => {
      // Arrange
      const player1 = '0x' + '11'.repeat(20);
      const player2 = '0x' + '22'.repeat(20);

      jest.spyOn(signatureService, 'verifySignature').mockResolvedValue({
        isValid: true,
        recoveredAddress: player1,
        message: '',
      });

      const game = await service.startGame({
        walletAddress: player1,
        wagerAmount: 10,
        signature: '0x_mock_',
      });

      await service.joinGame(game.gameId, player2, '0x_mock_');

      // Act - Player 2 tries to move first (White's turn)
      const moveDto = {
        gameId: game.gameId,
        walletAddress: player2,
        move: 'e7e5',
        nonce: 1,
        signature: '0x_mock_',
      };

      // Assert
      await expect(service.makeMove(moveDto)).rejects.toThrow(
        /Not your turn/,
      );
    });
  });
});
```

---

## 3️⃣ E2E Tests - WebSocket Gateway

```typescript
// Chess/chess.gateway.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { ChessModule } from './chess.module';

describe('ChessGateway (E2E)', () => {
  let app: INestApplication;
  let client1: Socket;
  let client2: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ChessModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3001); // Usar puerto diferente para tests
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done) => {
    // Crear clientes WebSocket
    client1 = io('http://localhost:3001/chess', {
      transports: ['websocket'],
    });

    client2 = io('http://localhost:3001/chess', {
      transports: ['websocket'],
    });

    let connected = 0;
    const checkConnected = () => {
      connected++;
      if (connected === 2) done();
    };

    client1.on('connect', checkConnected);
    client2.on('connect', checkConnected);
  });

  afterEach(() => {
    client1.close();
    client2.close();
  });

  it('should connect both players', (done) => {
    expect(client1.connected).toBe(true);
    expect(client2.connected).toBe(true);
    done();
  });

  it('should register player', (done) => {
    client1.emit('register', {
      walletAddress: '0x' + '11'.repeat(20),
    });

    client1.on('registered', (data) => {
      expect(data.success).toBe(true);
      done();
    });
  });

  it('should create and join game', (done) => {
    const player1Address = '0x' + '11'.repeat(20);
    const player2Address = '0x' + '22'.repeat(20);
    let gameId: string;

    // Player 1 creates game
    client1.emit('startGame', {
      walletAddress: player1Address,
      wagerAmount: 10,
      signature: '0x_mock_',
    });

    client1.on('gameStarted', (data) => {
      gameId = data.gameId;
      expect(data.wagerAmount).toBe(10);

      // Player 2 joins
      client2.emit('joinGame', {
        gameId: gameId,
        walletAddress: player2Address,
        signature: '0x_mock_',
      });
    });

    client2.on('gameReady', (data) => {
      expect(data.player1).toBe(player1Address);
      expect(data.player2).toBe(player2Address);
      done();
    });
  });

  it('should handle move sequence', (done) => {
    const player1 = '0x' + '11'.repeat(20);
    const player2 = '0x' + '22'.repeat(20);
    let gameId: string;
    let movesReceived = 0;

    // Create game
    client1.emit('startGame', {
      walletAddress: player1,
      wagerAmount: 10,
      signature: '0x_mock_',
    });

    client1.on('gameStarted', (data) => {
      gameId = data.gameId;
      
      // Join game
      client2.emit('joinGame', {
        gameId,
        walletAddress: player2,
        signature: '0x_mock_',
      });
    });

    client1.on('gameReady', () => {
      // Player 1 makes move
      client1.emit('makeMove', {
        gameId,
        walletAddress: player1,
        move: 'e2e4',
        nonce: 1,
        signature: '0x_mock_',
      });
    });

    // Both clients should receive move notification
    const checkMove = (data: any) => {
      expect(data.move).toBe('e2e4');
      movesReceived++;
      if (movesReceived === 2) done();
    };

    client1.on('moveMade', checkMove);
    client2.on('moveMade', checkMove);
  });
});
```

---

## 4️⃣ Manual Testing - Postman

### Test Sequence

#### Step 1: Health Check

```bash
GET http://localhost:3000/chess/health

Expected Response:
{
  "status": "ok",
  "service": "Chess Service",
  "timestamp": "..."
}
```

#### Step 2: Create Game

```bash
POST http://localhost:3000/chess/start
Content-Type: application/json

{
  "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "wagerAmount": 10,
  "signature": "0x_mock_signature_"
}

Expected Response:
{
  "success": true,
  "data": {
    "gameId": "game_...",
    "player1": "0x71C...",
    "wagerAmount": 10,
    ...
  }
}
```

#### Step 3: Get Game Info

```bash
GET http://localhost:3000/chess/game/{{gameId}}

Expected Response:
{
  "success": true,
  "data": {
    "gameId": "game_...",
    "player1": "0x...",
    "player2": "WAITING",
    "status": "WAITING",
    ...
  }
}
```

#### Step 4: Make Move

```bash
POST http://localhost:3000/chess/move
Content-Type: application/json

{
  "gameId": "{{gameId}}",
  "walletAddress": "0x71C...",
  "move": "e2e4",
  "nonce": 1,
  "signature": "0x_mock_"
}

Expected Response:
{
  "success": true,
  "data": {
    "move": "e2e4",
    "newBoardState": "...",
    "isCheckmate": false,
    ...
  }
}
```

---

## 5️⃣ Load Testing

### Artillery Configuration

```yaml
# artillery-chess.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
  processor: "./artillery-processor.js"

scenarios:
  - name: "Create and play games"
    flow:
      - post:
          url: "/chess/start"
          json:
            walletAddress: "0x{{ $randomString() }}"
            wagerAmount: 10
            signature: "0x_mock_"
          capture:
            - json: "$.data.gameId"
              as: "gameId"
      
      - post:
          url: "/chess/move"
          json:
            gameId: "{{ gameId }}"
            walletAddress: "0x{{ $randomString() }}"
            move: "e2e4"
            nonce: 1
            signature: "0x_mock_"
```

Run:
```bash
npm install -g artillery
artillery run artillery-chess.yml
```

---

## 🎯 Coverage Goals

- **Unit Tests:** > 80%
- **Integration Tests:** > 70%
- **E2E Tests:** Critical flows
- **Manual Tests:** UI flows

---

## 🐛 Debug Mode

Enable debug logs:

```env
# .env
DEBUG=chess:*
LOG_LEVEL=debug
```

Run tests with logs:

```bash
npm run test -- --verbose
```

---

## ✅ CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Chess Module Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:cov
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

**Última actualización:** 4 de febrero de 2026

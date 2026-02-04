# 🎮 Chess Module - API Documentation

## 📌 Overview

El módulo de Ajedrez implementa un sistema de partidas P2P con apuestas utilizando **State Channels** para transacciones off-chain de alta velocidad. Cada movimiento se firma criptográficamente pero no requiere confirmación de blockchain hasta la liquidación final.

---

## 🏗️ Arquitectura

```
Frontend (main.js)
    ↓ WebSocket Connection
ChessGateway (Socket.io)
    ↓ Event Handlers
ChessService (Business Logic)
    ↓ State Management
In-Memory State / Redis
    ↓ Blockchain Events
SessionSafe Contract (Sepolia)
```

---

## 🔌 WebSocket Events

### Namespace: `/chess`

#### 📡 Cliente → Servidor

| Event | Payload | Descripción |
|-------|---------|-------------|
| `register` | `{ walletAddress: string }` | Registrar conexión WebSocket |
| `startGame` | `StartGameDto` | Crear nueva partida |
| `joinGame` | `{ gameId, walletAddress, signature }` | Unirse a partida |
| `makeMove` | `MakeMoveDto` | Realizar movimiento |
| `claimVictory` | `ClaimVictoryDto` | Reclamar victoria (checkmate) |
| `getGameState` | `{ gameId: string }` | Obtener estado actual |
| `getMyGames` | `{ walletAddress: string }` | Listar mis partidas |
| `sendMessage` | `{ gameId, message, from }` | Chat en partida |

#### 📡 Servidor → Cliente

| Event | Payload | Descripción |
|-------|---------|-------------|
| `registered` | `{ success: boolean }` | Confirmación de registro |
| `gameStarted` | `GameStartResponse` | Partida creada |
| `gameInvitation` | `{ gameId, from, wagerAmount }` | Invitación recibida |
| `gameReady` | `GameStartResponse` | Partida iniciada (2 jugadores) |
| `moveMade` | `MoveResponse` | Movimiento realizado |
| `moveError` | `{ message: string }` | Error en movimiento |
| `gameEnded` | `{ winner, reason }` | Partida terminada |
| `wagerConfirmed` | `{ player, amount, txHash }` | Depósito confirmado en blockchain |
| `settlementCompleted` | `{ winner, payout }` | Liquidación completada |
| `chatMessage` | `{ from, message, timestamp }` | Mensaje de chat |
| `error` | `{ message: string }` | Error general |

---

## 🌐 REST Endpoints

### Base URL: `/chess`

#### 1️⃣ Health Check
```http
GET /chess/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "Chess Service",
  "timestamp": "2026-02-04T10:00:00.000Z"
}
```

---

#### 2️⃣ Obtener Información de Partida
```http
GET /chess/game/:gameId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "game_1738665600000_abc123",
    "player1": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    "player2": "0x9876543210987654321098765432109876543210",
    "wagerAmount": 10,
    "potAmount": 20,
    "currentTurn": "white",
    "boardState": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "moveHistory": [],
    "status": "ACTIVE",
    "nonce": 0
  }
}
```

---

#### 3️⃣ Obtener Partidas de un Jugador
```http
GET /chess/player-games?address=0x71C...
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "gameId": "game_123",
      "opponent": "0x987...",
      "status": "ACTIVE",
      "wagerAmount": 10
    }
  ]
}
```

---

#### 4️⃣ Crear Partida (REST)
```http
POST /chess/start
Content-Type: application/json

{
  "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "wagerAmount": 10,
  "signature": "0x..." 
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "game_1738665600000_abc123",
    "player1": "0x71C...",
    "player2": "WAITING",
    "wagerAmount": 10,
    "potAmount": 20,
    "initialBoardState": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "channelStatus": "opening",
    "message": "Game created. Waiting for blockchain confirmation..."
  }
}
```

---

#### 5️⃣ Hacer Movimiento (REST)
```http
POST /chess/move
Content-Type: application/json

{
  "gameId": "game_123",
  "walletAddress": "0x71C...",
  "move": "e2e4",
  "nonce": 1,
  "signature": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "gameId": "game_123",
    "move": "e2e4",
    "newBoardState": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    "isCheck": false,
    "isCheckmate": false,
    "nextTurn": "black",
    "nonce": 1
  }
}
```

---

#### 6️⃣ Reclamar Victoria
```http
POST /chess/claim-victory
Content-Type: application/json

{
  "gameId": "game_123",
  "walletAddress": "0x71C...",
  "finalStateSignature": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "winner": "0x71C...",
    "potAmount": 20,
    "message": "Victory verified. Preparing settlement..."
  }
}
```

---

## 🔐 Verificación de Firmas

### Proceso de Firmado (Frontend)

```javascript
// 1. Crear mensaje
const message = `Move: e2e4 | Game: game_123 | Nonce: 1`;

// 2. Firmar con wallet (MetaMask/WalletConnect)
const signature = await signer.signMessage(message);

// 3. Enviar al backend
socket.emit('makeMove', {
  gameId: 'game_123',
  walletAddress: '0x71C...',
  move: 'e2e4',
  nonce: 1,
  signature: signature
});
```

### Verificación (Backend)

```typescript
// El backend recupera la dirección pública:
const recoveredAddress = ethers.recoverAddress(
  ethers.hashMessage(message),
  signature
);

// Y valida que coincida con la del jugador:
if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
  throw new Error('Invalid signature');
}
```

---

## 🎯 Flujo Completo de una Partida

### 1️⃣ Inicio de Partida

```javascript
// Frontend
const signature = await signer.signMessage('Start Chess Game - Wager: 10 USDC');

socket.emit('startGame', {
  walletAddress: '0x71C...',
  wagerAmount: 10,
  signature: signature
});

// Backend responde
socket.on('gameStarted', (data) => {
  console.log('Game ID:', data.gameId);
  // Mostrar UI de espera de oponente
});
```

### 2️⃣ Unirse a Partida

```javascript
// Frontend (Jugador 2)
const signature = await signer.signMessage('Join Chess Game game_123');

socket.emit('joinGame', {
  gameId: 'game_123',
  walletAddress: '0x987...',
  signature: signature
});

// Ambos jugadores reciben
socket.on('gameReady', (data) => {
  console.log('Game started!', data);
  // Habilitar tablero
});
```

### 3️⃣ Realizar Movimientos

```javascript
// Frontend
const message = `Move: e2e4 | Game: ${gameId} | Nonce: ${nonce}`;
const signature = await signer.signMessage(message);

socket.emit('makeMove', {
  gameId: gameId,
  walletAddress: userAddress,
  move: 'e2e4',
  nonce: nonce,
  signature: signature
});

// Ambos jugadores reciben actualización INSTANTÁNEA
socket.on('moveMade', (data) => {
  updateBoard(data.newBoardState);
  if (data.isCheckmate) {
    showVictoryScreen();
  }
});
```

### 4️⃣ Checkmate y Liquidación

```javascript
// Frontend (Ganador)
const message = `Claim Victory | Game: ${gameId} | Nonce: ${finalNonce}`;
const signature = await signer.signMessage(message);

socket.emit('claimVictory', {
  gameId: gameId,
  walletAddress: userAddress,
  finalStateSignature: signature
});

// Esperar confirmación de blockchain
socket.on('settlementCompleted', (data) => {
  console.log('Winner received:', data.payout, 'USDC');
  // Actualizar balance en UI
});
```

---

## 🔥 Características Clave

### ⚡ Latencia Ultra-Baja
- Movimientos procesados en **< 50ms**
- Sin espera de confirmación de blockchain
- Estado sincronizado en tiempo real

### 🔐 Seguridad Criptográfica
- Cada movimiento firmado con ECDSA
- Imposible falsificar movimientos
- Backend verifica todas las firmas

### 💰 Economía Eficiente
- **0 gas** durante la partida
- Solo 1 transacción al final (settlement)
- Fondos seguros en smart contract

### 🎮 Motor de Ajedrez Profesional
- Validación de movimientos con `chess.js`
- Soporte para todas las reglas (enroque, en passant, etc.)
- Detección automática de jaque/mate/tablas

---

## 🧪 Testing con Postman

Ver colección completa en: `postman-collection.json`

### Test 1: Health Check
```
GET http://localhost:3000/chess/health
```

### Test 2: Crear Partida Simulada
```
POST http://localhost:3000/chess/start
Body: {
  "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "wagerAmount": 10,
  "signature": "0x_firma_simulada_"
}
```

### Test 3: WebSocket (Socket.io Client)
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000/chess');

socket.on('connect', () => {
  console.log('Connected');
  
  socket.emit('register', {
    walletAddress: '0x71C...'
  });
});
```

---

## ⚠️ Consideraciones de Producción

1. **Redis**: Migrar estado en memoria a Redis para escalabilidad
2. **Rate Limiting**: Implementar límites por IP/wallet
3. **Monitoring**: Métricas de latencia, movimientos/segundo
4. **Replay Protection**: Verificar nonces estrictamente
5. **Disconnect Handling**: Timeout automático si jugador se desconecta

---

## 📚 Dependencias

```json
{
  "chess.js": "^1.0.0-beta.2",
  "ethers": "^6.0.0",
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "socket.io": "^4.5.0"
}
```

---

## 🎯 Próximos Pasos

- [ ] Implementar ELO rating system
- [ ] Matchmaking automático por nivel
- [ ] Soporte para torneos
- [ ] Replays de partidas
- [ ] Análisis de movimientos con AI

---

**Documentación actualizada:** 4 de febrero de 2026  
**Versión:** 1.0.0

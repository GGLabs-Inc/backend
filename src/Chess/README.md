# ♟️ Chess Module - YellowMeter OS Backend

## 📋 Descripción

Módulo completo de ajedrez P2P con apuestas, implementado con **State Channels** para transacciones instantáneas off-chain.

## 🎯 Características Implementadas

### ✅ 1. WebSocket Gateway (Comunicación en Tiempo Real)
- **Archivo:** `chess.gateway.ts`
- **Namespace:** `/chess`
- **Funciones:**
  - Registro de jugadores
  - Creación de partidas
  - Movimientos en tiempo real (< 50ms latencia)
  - Notificaciones instantáneas
  - Chat en partida

### ✅ 2. Verificación Criptográfica ECDSA
- **Archivo:** `services/signature.service.ts`
- **Funciones:**
  - Verificación de firmas con `ethers.js`
  - Recuperación de direcciones públicas
  - Prevención de replay attacks con nonces
  - Validación de mensajes firmados

### ✅ 3. Motor de Estado en Memoria
- **Archivo:** `chess.service.ts`
- **Implementación:**
  - `Map<gameId, ChessGame>` - Estados de partidas
  - `Map<gameId, GameChannel>` - Estados de canales
  - `Map<address, gameIds[]>` - Índice de jugadores
  - Preparado para migración a Redis

### ✅ 4. Listener de Blockchain
- **Archivo:** `services/blockchain-listener.service.ts`
- **Eventos escuchados:**
  - `WagerDeposited` - Confirmación de depósitos
  - `GameSettled` - Liquidación completada
- **Funciones:**
  - Conexión a Sepolia testnet
  - Detección de eventos en tiempo real
  - Sincronización de estados

### ✅ 5. Motor de Reglas (chess.js)
- **Archivo:** `chess.service.ts`
- **Validaciones:**
  - Movimientos legales (todas las reglas de ajedrez)
  - Detección de jaque/mate/ahogado
  - Historial de movimientos
  - Validación de turnos
  - FEN notation para estados del tablero

## 📁 Estructura del Módulo

```
Chess/
├── chess.module.ts              # Módulo principal
├── chess.gateway.ts             # WebSocket Gateway
├── chess.service.ts             # Lógica de negocio
├── chess.controller.ts          # REST endpoints
├── dto/
│   └── chess.dto.ts            # Data Transfer Objects
├── interfaces/
│   └── chess.interface.ts      # TypeScript interfaces
├── services/
│   ├── signature.service.ts    # Verificación ECDSA
│   └── blockchain-listener.service.ts
├── config/
│   └── chess.config.ts         # Configuración
└── documentation/
    ├── CHESS_API.md           # Documentación completa
    ├── QUICKSTART.md          # Guía rápida
    └── postman-collection.json # Colección Postman
```

## 🚀 Instalación

### 1. Dependencias

```bash
npm install chess.js ethers @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### 2. Variables de Entorno

Añadir a `.env`:

```env
# Blockchain Configuration
SEPOLIA_RPC_URL=https://rpc.sepolia.org
SESSION_SAFE_ADDRESS=0x0000000000000000000000000000000000000000

# Redis (Opcional - para producción)
USE_REDIS=false
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
```

### 3. Registrar Módulo

El módulo ya está registrado en `app.module.ts`:

```typescript
import { ChessModule } from './Chess/chess.module';

@Module({
  imports: [
    ChessModule,
    // ... otros módulos
  ],
})
```

## 🎮 Uso

### REST Endpoints

```bash
# Health check
GET http://localhost:3000/chess/health

# Obtener partida
GET http://localhost:3000/chess/game/:gameId

# Crear partida
POST http://localhost:3000/chess/start

# Hacer movimiento
POST http://localhost:3000/chess/move
```

### WebSocket Events

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000/chess');

// Registrar jugador
socket.emit('register', { walletAddress: '0x...' });

// Crear partida
socket.emit('startGame', {
  walletAddress: '0x...',
  wagerAmount: 10,
  signature: '0x...'
});

// Hacer movimiento
socket.emit('makeMove', {
  gameId: 'game_123',
  walletAddress: '0x...',
  move: 'e2e4',
  nonce: 1,
  signature: '0x...'
});

// Escuchar eventos
socket.on('moveMade', (data) => {
  console.log('Movimiento realizado:', data);
});
```

## 📊 Flujo de una Partida

```
1. Player 1 → startGame (firma + wager)
   ↓
2. Backend → Crea juego en memoria
   ↓
3. Smart Contract → Emite WagerDeposited
   ↓
4. Backend → Confirma canal abierto
   ↓
5. Player 2 → joinGame (firma + wager)
   ↓
6. Backend → Activa partida
   ↓
7. Players → makeMove (firmas off-chain)
   ↓ (repetir)
8. Checkmate detectado
   ↓
9. Winner → claimVictory
   ↓
10. Smart Contract → Liquida fondos
```

## 🔐 Seguridad

### Verificación de Firmas

Cada acción crítica requiere firma ECDSA:

```typescript
// Frontend firma mensaje
const message = `Move: e2e4 | Game: ${gameId} | Nonce: ${nonce}`;
const signature = await signer.signMessage(message);

// Backend verifica
const recoveredAddress = ethers.recoverAddress(
  ethers.hashMessage(message),
  signature
);
```

### Prevención de Ataques

- ✅ **Replay Attack:** Nonces incrementales
- ✅ **Falsificación:** Verificación ECDSA obligatoria
- ✅ **Double-spend:** Estado de canal con locks
- ✅ **Race conditions:** Turnos estrictos

## 🧪 Testing

### Postman

Importar colección: `documentation/postman-collection.json`

Variables predefinidas:
- `base_url`: http://localhost:3000
- `ws_url`: ws://localhost:3000/chess
- `player1_address`: 0x71C...
- `player2_address`: 0x987...

### Ejemplo de Test

```bash
# 1. Health check
curl http://localhost:3000/chess/health

# 2. Crear partida (modo desarrollo - firma mock)
curl -X POST http://localhost:3000/chess/start \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    "wagerAmount": 10,
    "signature": "0x_mock_"
  }'
```

## 📈 Métricas

El servicio registra:
- ⏱️ Latencia de movimientos
- 📊 Partidas activas
- 👥 Jugadores conectados
- 🔄 Nonces procesados
- 🔗 Eventos de blockchain

## 🐛 Troubleshooting

### Error: "Cannot find module 'chess.js'"
```bash
npm install chess.js
```

### Error: "WebSocket connection refused"
- Verificar que NestJS está corriendo
- Revisar configuración de CORS en gateway
- Verificar puerto (default: 3000)

### Error: "Invalid signature"
- En desarrollo, usar firmas mock
- Verificar formato de signature (debe empezar con 0x)
- Revisar que el mensaje firmado coincida exactamente

## 🚧 Roadmap

### Próximas Funcionalidades

- [ ] Sistema de ELO/Rating
- [ ] Matchmaking automático
- [ ] Torneos multi-jugador
- [ ] Replays de partidas
- [ ] Análisis con Stockfish
- [ ] Soporte para variantes (Chess960, Blitz, etc.)
- [ ] Leaderboards
- [ ] Estadísticas avanzadas

## 📚 Documentación Adicional

- 📖 [API Completa](documentation/CHESS_API.md)
- 🚀 [Guía Rápida](documentation/QUICKSTART.md)
- 📮 [Colección Postman](documentation/postman-collection.json)

## 🤝 Integración con Frontend

Para integrar con el frontend de YellowMeter OS:

```javascript
// 1. Conectar WebSocket
const socket = io('http://localhost:3000/chess');

// 2. Implementar en app.startGameWager()
socket.emit('startGame', {
  walletAddress: STATE.address,
  wagerAmount: 10,
  signature: await signMessage(...)
});

// 3. Implementar en app.runModalAction('game')
socket.emit('makeMove', {
  gameId: STATE.currentGameId,
  walletAddress: STATE.address,
  move: selectedMove,
  nonce: STATE.nonce,
  signature: await signMessage(...)
});

// 4. Escuchar actualizaciones
socket.on('moveMade', (data) => {
  updateChessBoard(data.newBoardState);
  STATE.nonce = data.nonce;
});
```

---

**Versión:** 1.0.0  
**Autor:** YellowMeter Team  
**Fecha:** 4 de febrero de 2026


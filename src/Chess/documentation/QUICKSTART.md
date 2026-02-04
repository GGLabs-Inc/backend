# 🚀 GUÍA RÁPIDA - Chess Module

## 🎯 Inicio Rápido

### 1. Instalar Dependencias

```bash
npm install chess.js ethers @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### 2. Configurar Variables de Entorno

Crear archivo `.env`:

```env
# Blockchain
SEPOLIA_RPC_URL=https://rpc.sepolia.org
SESSION_SAFE_ADDRESS=0x...

# Redis (opcional)
USE_REDIS=false
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
```

### 3. Registrar el Módulo

En `app.module.ts`:

```typescript
import { ChessModule } from './Chess/chess.module';

@Module({
  imports: [ChessModule],
})
export class AppModule {}
```

### 4. Iniciar Servidor

```bash
npm run start:dev
```

---

## 🧪 Testing Rápido

### Test 1: Health Check

```bash
curl http://localhost:3000/chess/health
```

### Test 2: Crear Partida (Modo Mock)

```bash
curl -X POST http://localhost:3000/chess/start \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    "wagerAmount": 10,
    "signature": "0x_mock_signature_"
  }'
```

### Test 3: Conectar por WebSocket

```javascript
// JavaScript/Node.js
const io = require('socket.io-client');
const socket = io('http://localhost:3000/chess');

socket.on('connect', () => {
  console.log('✅ Connected to Chess WebSocket');
  
  socket.emit('register', {
    walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
  });
});

socket.on('registered', (data) => {
  console.log('✅ Registered:', data);
});
```

---

## 📊 Flujo de Trabajo

```
1. Usuario conecta wallet → Frontend obtiene address
2. Frontend conecta WebSocket → Registra address
3. Crear partida → Emitir evento 'startGame'
4. Blockchain detecta depósito → Backend confirma canal
5. Jugador 2 se une → Partida comienza
6. Movimientos off-chain → Firmas ECDSA verificadas
7. Checkmate → Reclamar victoria
8. Settlement on-chain → Fondos distribuidos
```

---

## 🔥 Comandos Útiles

```bash
# Ver logs en tiempo real
npm run start:dev

# Tests
npm run test

# Build
npm run build

# Linter
npm run lint
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'chess.js'"
```bash
npm install chess.js
```

### Error: "WebSocket connection failed"
- Verificar que el servidor esté corriendo
- Verificar el puerto (por defecto 3000)
- Revisar CORS en `chess.gateway.ts`

### Error: "Invalid signature"
- En desarrollo, deshabilitar verificación en `.env`:
  ```env
  DISABLE_SIGNATURE_VERIFICATION=true
  ```

---

## 📚 Próximos Pasos

1. ✅ Implementar frontend con Socket.io client
2. ✅ Configurar smart contract SessionSafe
3. ✅ Desplegar en Sepolia testnet
4. ✅ Implementar Redis para producción
5. ✅ Añadir tests E2E

---

**¿Preguntas?** Ver documentación completa en `CHESS_API.md`

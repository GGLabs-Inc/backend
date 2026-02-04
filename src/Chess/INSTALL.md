# 🔧 Instalación de Dependencias - Chess Module

## 📦 Dependencias Necesarias

Para ejecutar el módulo de Chess necesitas instalar las siguientes librerías:

```bash
npm install chess.js ethers @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Detalle de Paquetes

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `chess.js` | ^1.0.0-beta | Motor de ajedrez - Validación de movimientos |
| `ethers` | ^6.x | Verificación de firmas ECDSA y blockchain |
| `@nestjs/websockets` | ^10.x | Soporte WebSocket en NestJS |
| `@nestjs/platform-socket.io` | ^10.x | Adaptador Socket.io para NestJS |
| `socket.io` | ^4.x | Comunicación bidireccional en tiempo real |

## ⚙️ Variables de Entorno

Crear o actualizar tu archivo `.env`:

```env
# ===========================================
# CHESS MODULE CONFIGURATION
# ===========================================

# Blockchain (Sepolia Testnet)
SEPOLIA_RPC_URL=https://rpc.sepolia.org
SESSION_SAFE_ADDRESS=0x0000000000000000000000000000000000000000

# Redis (Producción - Opcional)
USE_REDIS=false
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development

# Security
DISABLE_SIGNATURE_VERIFICATION=false
```

## 🚀 Comandos de Ejecución

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Tests
npm run test
npm run test:e2e
```

## ✅ Verificación de Instalación

Ejecutar después de instalar:

```bash
# 1. Verificar que las dependencias están instaladas
npm list chess.js ethers socket.io

# 2. Iniciar servidor
npm run start:dev

# 3. Probar endpoint (en otra terminal)
curl http://localhost:3000/chess/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "service": "Chess Service",
  "timestamp": "2026-02-04T..."
}
```

## 🐛 Problemas Comunes

### Error: "Cannot find module 'chess.js'"

**Solución:**
```bash
npm install chess.js --save
```

### Error: "Module 'socket.io' not found"

**Solución:**
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Error: "Could not resolve 'ethers'"

**Solución:**
```bash
npm install ethers@^6
```

---

**Código de verificación exitosa:**

```bash
✓ Dependencies installed
✓ Environment configured
✓ Chess module ready
```

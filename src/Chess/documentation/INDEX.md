# 📚 Chess Module - Índice de Documentación

## 🎯 Guías Rápidas

| Documento | Descripción | Tiempo |
|-----------|-------------|--------|
| [QUICKSTART.md](QUICKSTART.md) | Inicio rápido - Primeros pasos | 5 min |
| [INSTALL.md](../INSTALL.md) | Instalación de dependencias | 3 min |
| [README.md](../README.md) | Overview completo del módulo | 10 min |

---

## 📖 Documentación Técnica

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [CHESS_API.md](CHESS_API.md) | API completa - REST & WebSocket | Developers |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Diagramas y arquitectura | Tech Leads |
| [TESTING.md](TESTING.md) | Guía de testing | QA / Developers |

---

## 🔧 Recursos de Desarrollo

| Recurso | Tipo | Uso |
|---------|------|-----|
| [postman-collection.json](postman-collection.json) | Collection | Testing con Postman |
| [frontend-integration.js](frontend-integration.js) | Code | Integración con frontend |

---

## 📂 Estructura de Archivos

```
Chess/
│
├── 📄 README.md                          # Overview del módulo
├── 📄 INSTALL.md                         # Instalación
│
├── 🏗️ Código Fuente
│   ├── chess.module.ts                   # Módulo principal
│   ├── chess.gateway.ts                  # WebSocket Gateway
│   ├── chess.service.ts                  # Lógica de negocio
│   ├── chess.controller.ts               # REST endpoints
│   │
│   ├── dto/
│   │   └── chess.dto.ts                  # Data Transfer Objects
│   │
│   ├── interfaces/
│   │   └── chess.interface.ts            # TypeScript interfaces
│   │
│   ├── services/
│   │   ├── signature.service.ts          # Verificación ECDSA
│   │   └── blockchain-listener.service.ts # Event listener
│   │
│   └── config/
│       └── chess.config.ts               # Configuración
│
└── 📚 documentation/
    ├── INDEX.md                          # Este archivo
    ├── QUICKSTART.md                     # Guía rápida
    ├── CHESS_API.md                      # API completa
    ├── ARCHITECTURE.md                   # Arquitectura
    ├── TESTING.md                        # Testing
    ├── postman-collection.json           # Postman
    └── frontend-integration.js           # Integración
```

---

## 🎓 Rutas de Aprendizaje

### 👶 Principiante

1. Lee [QUICKSTART.md](QUICKSTART.md)
2. Instala dependencias con [INSTALL.md](../INSTALL.md)
3. Prueba endpoints con [postman-collection.json](postman-collection.json)
4. Revisa [README.md](../README.md) para overview completo

**Tiempo estimado:** 30 minutos

---

### 👨‍💻 Developer

1. Lee [README.md](../README.md) para contexto
2. Estudia [ARCHITECTURE.md](ARCHITECTURE.md) para entender diseño
3. Revisa [CHESS_API.md](CHESS_API.md) para detalles de API
4. Implementa integración con [frontend-integration.js](frontend-integration.js)
5. Escribe tests siguiendo [TESTING.md](TESTING.md)

**Tiempo estimado:** 2-3 horas

---

### 🏗️ Arquitecto

1. Analiza [ARCHITECTURE.md](ARCHITECTURE.md) - Diagramas completos
2. Revisa código fuente (chess.service.ts, chess.gateway.ts)
3. Evalúa decisiones de diseño
4. Planea escalabilidad (Redis, microservicios)

**Tiempo estimado:** 1 hora

---

## 🔍 Búsqueda Rápida

### ¿Cómo hago X?

| Pregunta | Respuesta en |
|----------|--------------|
| ¿Cómo instalo el módulo? | [INSTALL.md](../INSTALL.md) |
| ¿Cómo creo una partida? | [CHESS_API.md](CHESS_API.md) → "Crear Partida" |
| ¿Cómo conecto por WebSocket? | [CHESS_API.md](CHESS_API.md) → "WebSocket Events" |
| ¿Cómo verifico firmas? | [ARCHITECTURE.md](ARCHITECTURE.md) → "Seguridad" |
| ¿Cómo hago un movimiento? | [CHESS_API.md](CHESS_API.md) → "Hacer Movimiento" |
| ¿Cómo integro con mi frontend? | [frontend-integration.js](frontend-integration.js) |
| ¿Cómo testeo el módulo? | [TESTING.md](TESTING.md) |

---

## 🆘 Troubleshooting

| Problema | Solución en |
|----------|-------------|
| Error de instalación | [INSTALL.md](../INSTALL.md) → "Problemas Comunes" |
| WebSocket no conecta | [CHESS_API.md](CHESS_API.md) → "Troubleshooting" |
| Firma inválida | [ARCHITECTURE.md](ARCHITECTURE.md) → "Seguridad" |
| Test falla | [TESTING.md](TESTING.md) → "Debug Mode" |

---

## 📊 Referencia Rápida

### Endpoints REST

```
GET  /chess/health           # Health check
GET  /chess/game/:gameId     # Info de partida
GET  /chess/player-games     # Mis partidas
POST /chess/start            # Crear partida
POST /chess/move             # Hacer movimiento
POST /chess/claim-victory    # Reclamar victoria
```

### WebSocket Events

```typescript
// Cliente → Servidor
socket.emit('register', { walletAddress })
socket.emit('startGame', { walletAddress, wagerAmount, signature })
socket.emit('makeMove', { gameId, move, nonce, signature })

// Servidor → Cliente
socket.on('gameStarted', (data) => { ... })
socket.on('moveMade', (data) => { ... })
socket.on('gameEnded', (data) => { ... })
```

---

## 🔗 Enlaces Externos

- **NestJS Docs:** https://docs.nestjs.com/websockets/gateways
- **Socket.io Docs:** https://socket.io/docs/v4/
- **chess.js GitHub:** https://github.com/jhlywa/chess.js
- **ethers.js Docs:** https://docs.ethers.org/v6/

---

## 📝 Changelog

### v1.0.0 (2026-02-04)
- ✅ WebSocket Gateway implementado
- ✅ Verificación ECDSA
- ✅ Motor de ajedrez (chess.js)
- ✅ Blockchain listener
- ✅ Documentación completa

---

## 🤝 Contribuciones

Para contribuir al módulo:

1. Lee [ARCHITECTURE.md](ARCHITECTURE.md)
2. Revisa [TESTING.md](TESTING.md)
3. Sigue los estándares de código
4. Añade tests para nuevas features
5. Actualiza documentación

---

## 📧 Soporte

- 🐛 Bugs: Crear issue en GitHub
- 💬 Preguntas: Discord/Slack del proyecto
- 📧 Email: dev@yellowmeter.com

---

**Última actualización:** 4 de febrero de 2026  
**Versión:** 1.0.0  
**Mantenedor:** YellowMeter Team

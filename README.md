# 🟡 YellowMeter Backend

Backend robusto construido con **NestJS** que actúa como contraparte (Counterparty) en los Canales de Estado de Yellow Network. Gestiona sesiones criptográficas, valida firmas off-chain y sirve lógica de negocio para IA y Ajedrez.

## 🚀 Arquitectura

Este backend implementa el protocolo de **State Channels** de Yellow:

1.  **YellowService (`src/Yellow/`)**:
    *   Gestiona la identidad del servidor (Wallet).
    *   Valida firmas criptográficas de los usuarios (`ethers.verifyMessage`).
    *   Implementa el protocolo de firma determinista **V3 Strict**.
    *   Verifica que los balances off-chain sean correctos antes de servir contenido.

2.  **AIService (`src/AI/`)**:
    *   Provee inferencia de IA (DeepSeek o Simulación).
    *   Cobra `0.10 USDC` por solicitud mediante canales de estado.
    *   Endpoint: `POST /ai/inference`.

3.  **ChessModule (`src/Chess/`)**:
    *   Servidor WebSocket para partidas de ajedrez P2P.
    *   Arbitraje de movimientos y apuestas off-chain.

## 🔗 Contratos & Configuración

El backend interactúa con la **Sepolia Testnet**:

| Contrato | Dirección | Descripción |
| :--- | :--- | :--- |
| **USDC** | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Token de pago (Faucet) |
| **Adjudicator** | `0x019B65A265EB3363822f2752141b3dF16131b262` | Custodia de fondos (Yellow Network) |
| **Server Wallet** | `0x5C18Cb1245bdca02289e1c1f209846D245d4135C` | Tesorería del Backend |

### Variables de Entorno (.env)
```env
PRIVATE_KEY=tu_private_key_del_servidor
RPC_URL=https://rpc.sepolia.org
DEEPSEEK_API_KEY=tu_api_key (Opcional)
```

## 🔐 Protocolo de Firma (V3 Strict)

Para evitar errores de codificación JSON, utilizamos un formato de string determinista separado por tuberías (`|`).

**Formato del Mensaje:**
```text
CHANNEL:{channelId}|NONCE:{timestamp}|UBAL:{userBalance}|SBAL:{serverBalance}
```

**Ejemplo:**
```text
CHANNEL:0xCH_A1B2...|NONCE:17000000|UBAL:9.90|SBAL:0.10
```

El backend reconstruye este string exactamente igual y verifica que `ethers.verifyMessage(string, signature)` coincida con la `userAddress`.

## 🛠️ Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo (Watch Mode)
npm run start:dev

# Compilar para producción
npm run build
npm run start:prod
```

## 📡 Endpoints Principales

### REST API
*   `GET /`: Health Check.
*   `POST /ai/inference`: Solicita respuesta de IA.
    *   **Body**: `{ prompt: string, signedState: ChannelState }`
    *   **Response**: `{ result: string, newServerSignature: string }`

### WebSockets
*   `/chess`: Gateway de Ajedrez (Eventos: `makeMove`, `joinGame`).
*   `/trading`: Gateway de Trading (Eventos: `orderbook`, `ticker`).

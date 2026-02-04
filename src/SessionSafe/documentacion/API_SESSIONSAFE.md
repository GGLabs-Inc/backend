# API SessionSafe - Documentación para Postman

Esta documentación describe todos los endpoints disponibles en el módulo SessionSafe, con ejemplos de cómo usarlos en Postman.

## URL Base
```
http://localhost:3000/sessionsafe
```

---

## 📋 ENDPOINTS DE INFORMACIÓN GENERAL

### 1. Obtener información completa del contrato
**GET** `/sessionsafe/info`

Obtiene toda la información general del contrato SessionSafe en una sola llamada.

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/info`
- **Headers:** No requiere

**Respuesta Ejemplo:**
```json
{
  "owner": "0x1234567890abcdef1234567890abcdef12345678",
  "paymentToken": "0xabcdef1234567890abcdef1234567890abcdef12",
  "serviceProvider": "0x9876543210fedcba9876543210fedcba98765432",
  "totalSessions": "42",
  "totalVolume": "15000.500000"
}
```

---

### 2. Obtener información de la wallet
**GET** `/sessionsafe/wallet`

Retorna información sobre la wallet conectada al backend.

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/wallet`
- **Headers:** No requiere

**Respuesta Ejemplo:**
```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "network": "sepolia",
  "chainId": 11155111
}
```

---

### 3. Obtener estadísticas del contrato
**GET** `/sessionsafe/stats`

Retorna las estadísticas principales del contrato.

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/stats`
- **Headers:** No requiere

**Respuesta Ejemplo:**
```json
{
  "totalSessions": "42",
  "totalVolume": "15000.500000"
}
```

---

### 4. Obtener dirección del owner
**GET** `/sessionsafe/owner`

Obtiene la dirección del propietario del contrato.

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/owner`
- **Headers:** No requiere

**Respuesta Ejemplo:**
```json
{
  "owner": "0x1234567890abcdef1234567890abcdef12345678"
}
```

---

### 5. Obtener dirección del token de pago
**GET** `/sessionsafe/payment-token`

Obtiene la dirección del token utilizado para pagos (USDC).

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/payment-token`
- **Headers:** No requiere

**Respuesta Ejemplo:**
```json
{
  "paymentToken": "0xabcdef1234567890abcdef1234567890abcdef12"
}
```

---

### 6. Obtener dirección del proveedor de servicio
**GET** `/sessionsafe/service-provider`

Obtiene la dirección del proveedor de servicio configurado.

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/service-provider`
- **Headers:** No requiere

**Respuesta Ejemplo:**
```json
{
  "serviceProvider": "0x9876543210fedcba9876543210fedcba98765432"
}
```

---

## 🔍 ENDPOINTS DE CONSULTA DE SESIONES

### 7. Obtener detalles de una sesión
**GET** `/sessionsafe/session/:sessionId`

Obtiene todos los detalles de una sesión específica.

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/session/SESSION_ID_123`
- **Headers:** No requiere

**Ejemplo URL:**
```
http://localhost:3000/sessionsafe/session/0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

**Respuesta Ejemplo:**
```json
{
  "sessionId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "user": "0x1234567890abcdef1234567890abcdef12345678",
  "depositAmount": "1000000000",
  "remainingBalance": "750000000",
  "startTime": "1704067200",
  "isActive": true
}
```

---

### 8. Verificar si una sesión está activa
**GET** `/sessionsafe/session/:sessionId/active`

Verifica si una sesión específica está activa.

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/session/SESSION_ID_123/active`
- **Headers:** No requiere

**Ejemplo URL:**
```
http://localhost:3000/sessionsafe/session/0x742d35Cc6634C0532925a3b844Bc454e4438f44e/active
```

**Respuesta Ejemplo:**
```json
{
  "sessionId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "isActive": true
}
```

---

### 9. Obtener detalles de sesión desde mapping
**GET** `/sessionsafe/session/:sessionId/details`

Obtiene los detalles de una sesión desde el mapping público del contrato.

**Postman:**
- **Método:** GET
- **URL:** `http://localhost:3000/sessionsafe/session/SESSION_ID_123/details`
- **Headers:** No requiere

**Ejemplo URL:**
```
http://localhost:3000/sessionsafe/session/0x742d35Cc6634C0532925a3b844Bc454e4438f44e/details
```

**Respuesta Ejemplo:**
```json
{
  "sessionId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "user": "0x1234567890abcdef1234567890abcdef12345678",
  "depositAmount": "1000.000000",
  "remainingBalance": "750.000000",
  "startTime": 1704067200,
  "isActive": true
}
```

---

## ✍️ ENDPOINTS DE ESCRITURA (TRANSACCIONES)

### 10. Depositar fondos (Crear sesión)
**POST** `/sessionsafe/deposit`

Deposita fondos y crea una nueva sesión.

**Postman:**
- **Método:** POST
- **URL:** `http://localhost:3000/sessionsafe/deposit`
- **Headers:** 
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "amount": "1000000000"
}
```

**Descripción del Body:**
- `amount` (string): Cantidad a depositar en formato wei (para USDC con 6 decimales: 1000000000 = 1000 USDC)

**Respuesta Ejemplo:**
```json
{
  "success": true,
  "transactionHash": "0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
  "sessionId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "blockNumber": 12345678,
  "gasUsed": "150000"
}
```

---

### 11. Liquidar sesión
**POST** `/sessionsafe/settle`

Liquida una sesión existente con las firmas requeridas.

**Postman:**
- **Método:** POST
- **URL:** `http://localhost:3000/sessionsafe/settle`
- **Headers:** 
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "sessionId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "finalBalance": "750000000",
  "backendSig": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
  "userSig": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd01"
}
```

**Descripción del Body:**
- `sessionId` (string): ID de la sesión a liquidar
- `finalBalance` (string): Balance final en formato wei
- `backendSig` (string): Firma del backend (0x + 130 caracteres hex)
- `userSig` (string): Firma del usuario (0x + 130 caracteres hex)

**Respuesta Ejemplo:**
```json
{
  "success": true,
  "transactionHash": "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
  "sessionId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "blockNumber": 12345679,
  "gasUsed": "180000"
}
```

---

### 12. Retiro de emergencia
**POST** `/sessionsafe/emergency-withdraw`

Realiza un retiro de emergencia (solo disponible para el owner del contrato).

**Postman:**
- **Método:** POST
- **URL:** `http://localhost:3000/sessionsafe/emergency-withdraw`
- **Headers:** 
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "token": "0xabcdef1234567890abcdef1234567890abcdef12",
  "amount": "1000000000"
}
```

**Descripción del Body:**
- `token` (string): Dirección del token a retirar
- `amount` (string): Cantidad a retirar en formato wei

**Respuesta Ejemplo:**
```json
{
  "success": true,
  "transactionHash": "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  "blockNumber": 12345680,
  "gasUsed": "120000"
}
```

---

## 📦 COLECCIÓN POSTMAN

### Cómo importar en Postman:

1. **Crear nueva colección:**
   - Click en "New" → "Collection"
   - Nombre: "SessionSafe API"

2. **Agregar requests:**
   - Para cada endpoint, click en "Add request"
   - Configurar método (GET/POST)
   - Agregar URL completa
   - Si es POST, agregar Body en formato JSON

3. **Variables de entorno (opcional):**
   - Crear variable `baseUrl` con valor `http://localhost:3000`
   - Usar `{{baseUrl}}/sessionsafe/info` en las URLs

### Variables recomendadas:
```json
{
  "baseUrl": "http://localhost:3000",
  "sessionId": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
}
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Formato de cantidades:**
   - USDC usa 6 decimales
   - 1 USDC = 1000000 (en wei)
   - 1000 USDC = 1000000000 (en wei)

2. **Session ID:**
   - Usualmente es una dirección Ethereum (0x + 40 caracteres hex)
   - Se obtiene como respuesta del endpoint de deposit

3. **Firmas:**
   - Deben estar en formato hexadecimal
   - Incluir el prefijo "0x"
   - Longitud: 132 caracteres (0x + 130 hex)

4. **Headers para POST:**
   - Siempre incluir: `Content-Type: application/json`

5. **Autenticación:**
   - La wallet/private key se configura en el backend
   - No se requiere autenticación en los requests

---

## 🔄 FLUJO TÍPICO DE USO

### Crear y liquidar una sesión:

1. **Obtener información del contrato:**
   ```
   GET /sessionsafe/info
   ```

2. **Crear sesión (depositar):**
   ```
   POST /sessionsafe/deposit
   Body: { "amount": "1000000000" }
   ```
   → Guardar el `sessionId` de la respuesta

3. **Verificar sesión activa:**
   ```
   GET /sessionsafe/session/{sessionId}/active
   ```

4. **Consultar detalles de la sesión:**
   ```
   GET /sessionsafe/session/{sessionId}
   ```

5. **Liquidar sesión:**
   ```
   POST /sessionsafe/settle
   Body: {
     "sessionId": "{sessionId}",
     "finalBalance": "750000000",
     "backendSig": "0x...",
     "userSig": "0x..."
   }
   ```

---

## 🛠️ TROUBLESHOOTING

### Errores comunes:

**Error: "Cannot read properties of undefined"**
- Verificar que el sessionId existe
- Verificar formato del sessionId

**Error: "Insufficient balance"**
- El usuario no tiene suficientes tokens
- Verificar balance antes de depositar

**Error: "Invalid signature"**
- Las firmas deben estar en formato correcto
- Verificar que las firmas correspondan al mensaje correcto

**Error: "Session not active"**
- La sesión ya fue liquidada o no existe
- Verificar con el endpoint `/session/{sessionId}/active`

---

## 📞 CONTACTO Y SOPORTE

Para más información sobre el smart contract SessionSafe, consultar:
- Archivo: `src/SessionSafe/contracts/SessionSafe.json`
- Configuración: `src/SessionSafe/config/sessionsafe.config.ts`
- Servicio: `src/SessionSafe/sessionsafe.service.ts`

---

**Última actualización:** Febrero 2026
**Versión API:** 1.0

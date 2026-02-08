# ⚡ YellowMeter OS (Backend)

YellowMeter is a decentralized Operating System interface that simplifies interaction with Web3 technologies. This backend serves as the core infrastructure, managing State Channels, Identity resolution (ENS), and real-time services like Messaging and AI integration.

## ♥️ Live Deployment
Backend is deployed and live on Render:
**Base URL:** [https://yellowmeter-backend.onrender.com](https://yellowmeter-backend.onrender.com)

## 💡 Overview

### The Problem
Interacting with high-frequency Web3 services (like messaging or gaming) typically incurs high gas fees and latency with every transaction. Users also struggle with unreadable hex addresses, making social interactions difficult.

### The Solution: YellowMeter OS
We implemented a hybrid solution using **Yellow Network's State Channels** for instant, zero-gas micropayments and **ENS (Ethereum Name Service)** for human-readable identity. This allows a user experience comparable to Web2 apps but fully decentralized and settlement-assured.

---

## ⚡ Yellow Network Integration (Deep Dive)

We leveraged Yellow Network's **State Channel** technology to enable high-speed micropayments. This is the core engine of our economy.

### 1. Nitrolite & State Channels Architecture
We implemented a **custom lightweight Client** (using ethers.js) that follows the Nitrolite architecture principles without relying on heavy external SDKs. This gives us granular control over every byte signed.

#### Session Lifecycle Phases:
1.  **Phase 1: Opening (On-Chain)**
    *   User deposits USDC into the **Adjudicator Contract** on Sepolia.
    *   This creates a "Session" with locked funds.
2.  **Phase 2: Transacting (Off-Chain / Nitrolite Layer)**
    *   **Double-Signed States**: Both parties (User & Server) maintain a local copy of the `ChannelState`.
    *   **Zero Gas**: 1000s of operations (chess moves, messages) occur here.
    *   **Validation**: Every operation increments the `nonce` and updates balances atomically.
3.  **Phase 3: Settlement (On-Chain)**
    *   Either party can submit the **Final Signed State** to the Adjudicator.
    *   The smart contract releases funds according to the final balance `SBAL` and `UBAL`.

### 2. V3 Strict Signature Protocol
To ensure deterministic validation between Frontend (React/Viem) and Backend (NestJS/Ethers), we designed a rigid string serialization protocol.

**Format:**
```text
CHANNEL:{channelId}|NONCE:{timestamp}|UBAL:{userBalance}|SBAL:{serverBalance}
```

**Workflow in `YellowService`:**
1.  **Receive**: The backend receives a DTO with the `ChannelState` and the user's `signature`.
2.  **Reconstruct**: It reconstructs the exact string message from the payload values.
3.  **Recover**: Uses `ethers.verifyMessage` to extract the signer's address from the signature.
4.  **Validate**: 
    *   Checks if the recovered address matches the `userAddress`.
    *   Verifies that `serverBalance` has increased by the service cost (e.g., 0.0001 USDC).
5.  **Counter-Sign**: If valid, the server signs the new state, acting as a "receipt" for the user.

### 3. Contracts
We interact with Yellow Network's specific infrastructure on Sepolia:
*   **Adjudicator Contract**: `0x019B65A265EB3363822f2752141b3dF16131b262` (Holds the secure deposits).
*   **MockUSDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (Used for value transfer).

---

## 🌐 ENS Integration (Identity Layer)

We integrated **ENS (Ethereum Name Service)** to humanize the messaging experience.

### 1. Resolution & Reverse Lookup
*   **Frontend**: Uses `wagmi` hooks to resolve names (`kai.eth`) to addresses and fetch Avatars.
*   **Data Persistence**: When a user connects to a chat, we perform an "Upsert" operation in our `users` database table to cache their current ENS name.

### 2. Implementation in Database
We moved away from storing raw addresses only. 
*   **Table `users`**: Stores `wallet_address` (PK) and `username` (ENS).
*   **Optimization**: This allows historic chats to display the user's name even if the ENS API is temporarily down.

---

## 💬 Messaging Service (Yellow + ENS)

The messaging module is a perfect example of combining these technologies:

1.  **User A sends a message**:
    *   **ENS**: The frontend resolves User B's address.
    *   **Yellow**: The frontend calculates the cost (`0.0001 USDC`), updates the channel balance, and signs the state.
2.  **Backend Processing**:
    *   Receives the message + signed state.
    *   Calls `YellowService.validateAndSignState()` to charge the micropayment.
    *   If payment is valid -> Saves message to Supabase.
    *   Updates `users` table with current ENS names.
3.  **Real-time Delivery**:
    *   Uses **Socket.IO** to push the message to User B instantly.

---

## 🔌 API Endpoints (Complete List)

### 🤖 AI Service
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/ai/inference` | Pay-per-prompt AI generation. |
| `GET` | `/ai/status` | Check AI service cost and status. |

### ♟️ Chess Game
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/chess/start` | Initialize a new state channel game. |
| `POST` | `/chess/move` | Submit a move (off-chain signature). |
| `POST` | `/chess/claim-victory` | Settle game on-chain/database. |
| `GET` | `/chess/game/:gameId` | Fetch current board state. |
| `GET` | `/chess/player-games` | List history for a wallet. |

### 📉 Trading Engine
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/trading/orders` | Place a limit/market order. |
| `POST` | `/trading/orders/cancel` | Cancel an active order. |
| `POST` | `/trading/positions/close` | Close an open position. |
| `GET` | `/trading/orderbook` | Get L2 orderbook depth. |
| `GET` | `/trading/balance/:trader` | Get off-chain reusable balance. |
| `GET` | `/trading/market/:market` | Get price analytics. |

### 💬 Messaging
*   **WebSockets Only**: The messaging service runs purely on Socket.IO for real-time bi-directional events.

---

## 🚀 Architecture

*   **Runtime**: Node.js v22
*   **Framework**: NestJS (Modular, TypeScript)
*   **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
*   **Web3 Libraries**: `ethers.js` (Backend), `viem`/`wagmi` (Frontend).
*   **Real-time**: WebSocket Gateway (Socket.IO).

### Folder Structure
```bash
src/
├── AI/             # AI Service (Pay-per-prompt)
├── Chess/          # P2P Game Logic
├── Messaging/      # Chat Logic (ENS + Yellow)
├── Yellow/         # Core State Channel Service
├── Trading/        # Trading
└── supabase/       # DB Connection
```

Created with ⚡ by the YellowMeter Team for HackMoney 2026

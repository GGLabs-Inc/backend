/**
 * 🎮 INTEGRACIÓN FRONTEND - CHESS MODULE
 * Código de ejemplo para integrar el WebSocket de Chess con el frontend YellowMeter OS
 */

// ============================================
// CONFIGURACIÓN INICIAL
// ============================================

const CHESS_CONFIG = {
  wsUrl: 'http://localhost:3000/chess',
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
};

// ============================================
// ESTADO DEL CHESS
// ============================================

const CHESS_STATE = {
  socket: null,
  connected: false,
  currentGameId: null,
  myColor: null,
  gameNonce: 0,
  opponentAddress: null,
};

// ============================================
// 1. CONECTAR WEBSOCKET
// ============================================

async function connectChessWebSocket() {
  return new Promise((resolve, reject) => {
    // Usar la librería socket.io-client (ya incluida en el frontend)
    CHESS_STATE.socket = io(CHESS_CONFIG.wsUrl, {
      reconnectionAttempts: CHESS_CONFIG.reconnectionAttempts,
      reconnectionDelay: CHESS_CONFIG.reconnectionDelay,
    });

    // Evento: Conexión exitosa
    CHESS_STATE.socket.on('connect', () => {
      console.log('✅ Connected to Chess WebSocket');
      CHESS_STATE.connected = true;

      // Registrar wallet address
      CHESS_STATE.socket.emit('register', {
        walletAddress: STATE.address,
      });
    });

    // Evento: Registro confirmado
    CHESS_STATE.socket.on('registered', (data) => {
      console.log('✅ Registered to Chess service:', data);
      app.log('system', `Chess service ready for ${STATE.address}`);
      resolve(true);
    });

    // Evento: Error de conexión
    CHESS_STATE.socket.on('connect_error', (error) => {
      console.error('❌ Chess WebSocket error:', error);
      app.log('system', 'Failed to connect to Chess service');
      reject(error);
    });

    // Evento: Desconexión
    CHESS_STATE.socket.on('disconnect', () => {
      console.log('⚠️ Disconnected from Chess WebSocket');
      CHESS_STATE.connected = false;
      app.log('system', 'Chess service disconnected');
    });
  });
}

// ============================================
// 2. CREAR PARTIDA CON APUESTA
// ============================================

async function startChessGame(wagerAmount = 10) {
  if (!CHESS_STATE.connected) {
    alert('Not connected to Chess service!');
    return;
  }

  try {
    // 1. Firmar mensaje con MetaMask/Wallet
    const message = `Start Chess Game - Wager: ${wagerAmount} USDC`;
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, STATE.address],
    });

    app.log('chain', `Signing game creation: ${wagerAmount} USDC`);

    // 2. Emitir evento al backend
    CHESS_STATE.socket.emit('startGame', {
      walletAddress: STATE.address,
      wagerAmount: wagerAmount,
      signature: signature,
    });

    // 3. Escuchar respuesta
    CHESS_STATE.socket.once('gameStarted', (data) => {
      CHESS_STATE.currentGameId = data.gameId;
      CHESS_STATE.myColor = 'white'; // Creador siempre es blanco
      CHESS_STATE.gameNonce = 0;

      app.log('action', `Game created: ${data.gameId}`);
      app.log('system', 'Waiting for opponent...');

      // Actualizar UI
      document.getElementById('game-status-badge').innerText = 'WAITING';
      document.getElementById('game-status-badge').className = 'badge problem';
    });

    // 4. Escuchar cuando se une oponente
    CHESS_STATE.socket.on('gameReady', (data) => {
      CHESS_STATE.opponentAddress = data.player2;
      app.log('system', `Opponent joined: ${data.player2}`);
      app.log('action', 'Game starting!');

      // Actualizar UI
      document.getElementById('game-status-badge').innerText = 'ACTIVE';
      document.getElementById('game-status-badge').className = 'badge solution';
      document.getElementById('chess-board').style.opacity = '1';
      document.getElementById('btn-move').disabled = false;
    });

  } catch (error) {
    console.error('Error starting game:', error);
    app.log('system', `Error: ${error.message}`);
  }
}

// ============================================
// 3. HACER MOVIMIENTO
// ============================================

async function makeChessMove(move) {
  if (!CHESS_STATE.currentGameId) {
    alert('No active game!');
    return;
  }

  try {
    // 1. Incrementar nonce
    CHESS_STATE.gameNonce++;

    // 2. Crear mensaje para firmar
    const message = `Move: ${move} | Game: ${CHESS_STATE.currentGameId} | Nonce: ${CHESS_STATE.gameNonce}`;

    // 3. Firmar con wallet
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, STATE.address],
    });

    app.log('action', `Making move: ${move} (Nonce: ${CHESS_STATE.gameNonce})`);

    // 4. Emitir movimiento
    CHESS_STATE.socket.emit('makeMove', {
      gameId: CHESS_STATE.currentGameId,
      walletAddress: STATE.address,
      move: move,
      nonce: CHESS_STATE.gameNonce,
      signature: signature,
    });

    // 5. Escuchar confirmación
    CHESS_STATE.socket.once('moveMade', (data) => {
      app.log('debug', `Move confirmed: ${data.move}`);
      app.log('debug', `New board state: ${data.newBoardState}`);

      // Actualizar tablero visual
      updateChessBoardFromFEN(data.newBoardState);

      // Verificar checkmate
      if (data.isCheckmate) {
        app.log('action', '🏆 CHECKMATE!');
        document.getElementById('btn-claim').classList.remove('hidden');
      }

      // Actualizar turno
      const isMyTurn = (data.nextTurn === CHESS_STATE.myColor);
      document.getElementById('btn-move').disabled = !isMyTurn;
    });

    // 6. Escuchar errores
    CHESS_STATE.socket.once('moveError', (error) => {
      app.log('system', `Invalid move: ${error.message}`);
      CHESS_STATE.gameNonce--; // Revertir nonce
    });

  } catch (error) {
    console.error('Error making move:', error);
    app.log('system', `Error: ${error.message}`);
    CHESS_STATE.gameNonce--; // Revertir nonce en caso de error
  }
}

// ============================================
// 4. RECLAMAR VICTORIA
// ============================================

async function claimChessVictory() {
  if (!CHESS_STATE.currentGameId) {
    return;
  }

  try {
    // 1. Firmar estado final
    const message = `Claim Victory | Game: ${CHESS_STATE.currentGameId} | Nonce: ${CHESS_STATE.gameNonce}`;
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, STATE.address],
    });

    app.log('action', 'Claiming victory...');

    // 2. Emitir reclamación
    CHESS_STATE.socket.emit('claimVictory', {
      gameId: CHESS_STATE.currentGameId,
      walletAddress: STATE.address,
      finalStateSignature: signature,
    });

    // 3. Escuchar confirmación
    CHESS_STATE.socket.once('gameEnded', (data) => {
      app.log('chain', `Victory confirmed! Winner: ${data.winner}`);
      app.log('chain', `Prize: ${data.potAmount} USDC`);

      // Actualizar balance (simulado - esperando settlement on-chain)
      STATE.currentBalance += data.potAmount;
      ui.sessionBalance.innerText = STATE.currentBalance.toFixed(4);

      alert(`You won ${data.potAmount} USDC!`);
    });

    // 4. Escuchar settlement de blockchain
    CHESS_STATE.socket.on('settlementCompleted', (data) => {
      app.log('chain', `[TX CONFIRMED] Settlement complete. TxHash: ${data.txHash || 'pending'}`);
    });

  } catch (error) {
    console.error('Error claiming victory:', error);
    app.log('system', `Error: ${error.message}`);
  }
}

// ============================================
// 5. HELPERS - RENDERIZADO DE TABLERO
// ============================================

/**
 * Actualizar tablero visual desde notación FEN
 */
function updateChessBoardFromFEN(fen) {
  // Parsear FEN
  const position = fen.split(' ')[0];
  const rows = position.split('/');

  const pieceMap = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
  };

  const board = document.getElementById('chess-board');
  board.innerHTML = '';

  let squareIndex = 0;

  rows.forEach((row, rowIdx) => {
    let colIdx = 0;
    for (const char of row) {
      if (isNaN(char)) {
        // Es una pieza
        const sq = createSquare(squareIndex++, rowIdx, colIdx++);
        sq.innerHTML = `<span style="font-size:24px">${pieceMap[char]}</span>`;
        board.appendChild(sq);
      } else {
        // Es un número (casillas vacías)
        const emptyCount = parseInt(char);
        for (let i = 0; i < emptyCount; i++) {
          const sq = createSquare(squareIndex++, rowIdx, colIdx++);
          board.appendChild(sq);
        }
      }
    }
  });
}

function createSquare(index, row, col) {
  const sq = document.createElement('div');
  const isWhite = (row + col) % 2 === 0;
  sq.className = `chess-square ${isWhite ? 'white' : 'black'}`;
  sq.id = `sq-${index}`;
  return sq;
}

// ============================================
// 6. LISTENERS DE EVENTOS GLOBALES
// ============================================

function setupChessEventListeners() {
  if (!CHESS_STATE.socket) return;

  // Nuevo mensaje de chat
  CHESS_STATE.socket.on('chatMessage', (data) => {
    console.log(`[CHAT] ${data.from}: ${data.message}`);
    // Actualizar UI de chat si existe
  });

  // Confirmación de depósito en blockchain
  CHESS_STATE.socket.on('wagerConfirmed', (data) => {
    app.log('chain', `Wager confirmed: ${data.amount} USDC (TxHash: ${data.txHash})`);
    document.getElementById('game-channel-bal').innerText = `${data.amount * 2} USDC`;
  });

  // Error general
  CHESS_STATE.socket.on('error', (error) => {
    app.log('system', `Chess service error: ${error.message}`);
  });
}

// ============================================
// 7. INTEGRACIÓN CON CÓDIGO EXISTENTE
// ============================================

// Modificar app.startGameWager() en main.js:
app.startGameWager = async () => {
  const wager = 10;
  if (STATE.currentBalance < wager) {
    alert("Not enough balance for wager!");
    return;
  }

  // Conectar WebSocket si no está conectado
  if (!CHESS_STATE.connected) {
    await connectChessWebSocket();
    setupChessEventListeners();
  }

  // Iniciar partida con backend real
  await startChessGame(wager);

  // UI Updates
  document.getElementById('game-setup-overlay').classList.add('hidden');
  document.getElementById('chess-board').style.opacity = '1';
};

// Modificar app.runModalAction('game') en main.js:
app.runModalActionOriginal = app.runModalAction;
app.runModalAction = async (type) => {
  if (type === 'game' && CHESS_STATE.connected) {
    // Usar movimiento real
    const move = 'e2e4'; // En producción, obtener del input del usuario
    await makeChessMove(move);
  } else {
    // Otros tipos (ai, api, etc.)
    app.runModalActionOriginal(type);
  }
};

// Modificar app.endGameClaim() en main.js:
app.endGameClaim = async () => {
  if (!confirm("Claim Checkmate and Settlement?")) return;
  await claimChessVictory();
};

// ============================================
// 8. INICIALIZACIÓN AUTO
// ============================================

// Conectar automáticamente cuando se conecta wallet
const originalConnectWallet = app.connectWallet;
app.connectWallet = async () => {
  await originalConnectWallet();

  // Conectar Chess WebSocket
  try {
    await connectChessWebSocket();
    setupChessEventListeners();
    app.log('system', 'Chess service connected');
  } catch (error) {
    app.log('system', 'Chess service unavailable (offline mode)');
  }
};

// ============================================
// EXPORTAR PARA USO GLOBAL
// ============================================

window.ChessModule = {
  connect: connectChessWebSocket,
  startGame: startChessGame,
  makeMove: makeChessMove,
  claimVictory: claimChessVictory,
  state: CHESS_STATE,
};

console.log('♟️ Chess Module Integration loaded');

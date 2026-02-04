/**
 * 🎮 INTEGRACIÓN FRONTEND - TRADING MODULE
 * Código de ejemplo para conectar con el DEX de YellowMeter
 */

import { ethers } from 'ethers';
import io from 'socket.io-client';

// ============================================
// 📡 CONFIGURACIÓN
// ============================================

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/trading';

// Direcciones de contratos (Sepolia)
const USDC_ADDRESS = '0x...';  // MockUSDC
const SESSION_SAFE_ADDRESS = '0x...';  // SessionSafe

// ============================================
// 🔌 CONEXIÓN WEBSOCKET
// ============================================

class TradingWebSocket {
  constructor() {
    this.socket = null;
    this.subscriptions = new Set();
  }

  connect() {
    this.socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Trading WebSocket');
      this.resubscribe();
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from Trading WebSocket');
    });

    this.socket.on('ticker', (data) => {
      this.onTicker(data);
    });

    this.socket.on('orderbook', (data) => {
      this.onOrderbook(data);
    });

    this.socket.on('trade', (data) => {
      this.onTrade(data);
    });

    this.socket.on('liquidation', (data) => {
      this.onLiquidation(data);
    });

    this.socket.on('order:new', (data) => {
      this.onNewOrder(data);
    });
  }

  subscribeTicker(market) {
    this.socket.emit('subscribe:ticker', { market });
    this.subscriptions.add(`ticker:${market}`);
  }

  unsubscribeTicker(market) {
    this.socket.emit('unsubscribe:ticker', { market });
    this.subscriptions.delete(`ticker:${market}`);
  }

  subscribeOrderbook(market, depth = 20) {
    this.socket.emit('subscribe:orderbook', { market, depth });
    this.subscriptions.add(`orderbook:${market}`);
  }

  unsubscribeOrderbook(market) {
    this.socket.emit('unsubscribe:orderbook', { market });
    this.subscriptions.delete(`orderbook:${market}`);
  }

  subscribeTrades(market) {
    this.socket.emit('subscribe:trades', { market });
    this.subscriptions.add(`trades:${market}`);
  }

  resubscribe() {
    // Resubscribirse después de reconexión
    this.subscriptions.forEach(sub => {
      const [type, market] = sub.split(':');
      if (type === 'ticker') this.subscribeTicker(market);
      if (type === 'orderbook') this.subscribeOrderbook(market);
      if (type === 'trades') this.subscribeTrades(market);
    });
  }

  // Callbacks (override en tu app)
  onTicker(data) {
    console.log('💹 Ticker:', data);
    // Actualizar UI con precio
    updatePriceDisplay(data.market, data.price, data.change24h);
  }

  onOrderbook(data) {
    console.log('📚 Orderbook:', data);
    // Actualizar UI del orderbook
    updateOrderbookDisplay(data.market, data.bids, data.asks);
  }

  onTrade(data) {
    console.log('🤝 Trade:', data);
    // Agregar trade al historial
    addTradeToHistory(data.market, data.trade);
  }

  onLiquidation(data) {
    console.log('🔥 Liquidation:', data);
    // Mostrar alerta
    showLiquidationAlert(data);
  }

  onNewOrder(data) {
    console.log('📝 New Order:', data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// ============================================
// 💼 CLIENTE DE TRADING
// ============================================

class TradingClient {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.ws = new TradingWebSocket();
  }

  // 🔗 Conectar MetaMask
  async connectWallet() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send("eth_requestAccounts", []);
    this.signer = await this.provider.getSigner();
    this.address = await this.signer.getAddress();

    console.log('✅ Wallet connected:', this.address);
    return this.address;
  }

  // 💰 Depositar margen
  async depositMargin(amount) {
    const usdcContract = new ethers.Contract(USDC_ADDRESS, [
      'function approve(address spender, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)'
    ], this.signer);

    // Verificar balance
    const balance = await usdcContract.balanceOf(this.address);
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    
    if (balance < amountWei) {
      throw new Error('Insufficient USDC balance');
    }

    // Aprobar USDC
    const approveTx = await usdcContract.approve(SESSION_SAFE_ADDRESS, amountWei);
    await approveTx.wait();
    console.log('✅ USDC approved');

    // Depositar
    const sessionSafe = new ethers.Contract(SESSION_SAFE_ADDRESS, [
      'function deposit(uint256 amount)'
    ], this.signer);

    const depositTx = await sessionSafe.deposit(amountWei);
    const receipt = await depositTx.wait();
    console.log('✅ Deposit on-chain:', receipt.hash);

    // Registrar en backend
    const response = await fetch(`${API_URL}/trading/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trader: this.address,
        amount,
        txHash: receipt.hash
      })
    });

    return await response.json();
  }

  // 💸 Retirar margen
  async withdrawMargin(amount) {
    const message = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256'],
      [this.address, Math.floor(amount * 1e6), Date.now()]
    );
    const signature = await this.signer.signMessage(ethers.getBytes(message));

    const response = await fetch(`${API_URL}/trading/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trader: this.address,
        amount,
        signature
      })
    });

    return await response.json();
  }

  // 📝 Crear orden
  async createOrder(params) {
    const {
      market,
      type = 'MARKET',  // MARKET | LIMIT
      side,             // LONG | SHORT
      size,             // USD amount
      leverage,         // 1-100
      price = 0,        // Solo para LIMIT
      triggerPrice = null  // Para STOP_LOSS/TAKE_PROFIT
    } = params;

    // Generar ID único
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Firmar orden
    const message = ethers.solidityPackedKeccak256(
      ['string', 'address', 'string', 'string', 'uint256', 'uint256', 'uint256'],
      [orderId, this.address, market, side, Math.floor(size), Math.floor(price), leverage]
    );
    const signature = await this.signer.signMessage(ethers.getBytes(message));

    // Enviar orden
    const response = await fetch(`${API_URL}/trading/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trader: this.address,
        market,
        type,
        side,
        size,
        leverage,
        price: type === 'LIMIT' ? price : undefined,
        triggerPrice,
        signature,
        nonce: Date.now().toString()
      })
    });

    const result = await response.json();
    console.log('✅ Order created:', result);
    return result;
  }

  // ❌ Cancelar orden
  async cancelOrder(orderId) {
    const message = ethers.solidityPackedKeccak256(
      ['string', 'address'],
      [orderId, this.address]
    );
    const signature = await this.signer.signMessage(ethers.getBytes(message));

    const response = await fetch(`${API_URL}/trading/orders/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        trader: this.address,
        signature
      })
    });

    return await response.json();
  }

  // 🔒 Cerrar posición
  async closePosition(positionId, percentage = 100) {
    const message = ethers.solidityPackedKeccak256(
      ['string', 'address'],
      [positionId, this.address]
    );
    const signature = await this.signer.signMessage(ethers.getBytes(message));

    const response = await fetch(`${API_URL}/trading/positions/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionId,
        trader: this.address,
        percentage,
        signature
      })
    });

    return await response.json();
  }

  // ✏️ Actualizar stop loss / take profit
  async updatePosition(positionId, stopLoss, takeProfit) {
    const message = ethers.solidityPackedKeccak256(
      ['string', 'address'],
      [positionId, this.address]
    );
    const signature = await this.signer.signMessage(ethers.getBytes(message));

    const response = await fetch(`${API_URL}/trading/positions/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionId,
        trader: this.address,
        stopLoss,
        takeProfit,
        signature
      })
    });

    return await response.json();
  }

  // 🔍 Obtener balance
  async getBalance() {
    const response = await fetch(`${API_URL}/trading/balance/${this.address}`);
    return await response.json();
  }

  // 🔍 Obtener posiciones
  async getPositions(market = null) {
    const url = market 
      ? `${API_URL}/trading/positions?trader=${this.address}&market=${market}`
      : `${API_URL}/trading/positions?trader=${this.address}`;
    
    const response = await fetch(url);
    return await response.json();
  }

  // 🔍 Obtener órdenes
  async getOrders(market = null, activeOnly = false) {
    const url = `${API_URL}/trading/orders?trader=${this.address}` +
      (market ? `&market=${market}` : '') +
      (activeOnly ? '&activeOnly=true' : '');
    
    const response = await fetch(url);
    return await response.json();
  }

  // 📊 Obtener orderbook
  async getOrderbook(market, depth = 20) {
    const response = await fetch(`${API_URL}/trading/orderbook?market=${market}&depth=${depth}`);
    return await response.json();
  }

  // 📈 Obtener datos de mercado
  async getMarketData(market) {
    const response = await fetch(`${API_URL}/trading/market/${market}`);
    return await response.json();
  }

  // 📋 Listar todos los mercados
  async getAllMarkets() {
    const response = await fetch(`${API_URL}/trading/markets`);
    return await response.json();
  }

  // 💱 Obtener trades recientes
  async getRecentTrades(market, limit = 50) {
    const response = await fetch(`${API_URL}/trading/trades/${market}?limit=${limit}`);
    return await response.json();
  }
}

// ============================================
// 🎨 FUNCIONES DE UI (Placeholder)
// ============================================

function updatePriceDisplay(market, price, change24h) {
  const el = document.getElementById(`price-${market}`);
  if (el) {
    el.textContent = `$${price.toFixed(2)}`;
    el.className = change24h >= 0 ? 'price-up' : 'price-down';
  }
}

function updateOrderbookDisplay(market, bids, asks) {
  // Renderizar bids y asks en tabla
  console.log(`Orderbook ${market}:`, { bids, asks });
}

function addTradeToHistory(market, trade) {
  // Agregar trade a lista de historial
  console.log(`New trade in ${market}:`, trade);
}

function showLiquidationAlert(data) {
  alert(`🔥 Liquidación: ${data.market} - ${data.trader}`);
}

// ============================================
// 🚀 EJEMPLO DE USO
// ============================================

async function main() {
  const client = new TradingClient();

  // 1. Conectar wallet
  await client.connectWallet();

  // 2. Conectar WebSocket
  client.ws.connect();
  client.ws.subscribeTicker('ETH-USDC');
  client.ws.subscribeOrderbook('BTC-USDC', 20);
  client.ws.subscribeTrades('SOL-USDC');

  // 3. Ver balance
  const balance = await client.getBalance();
  console.log('💰 Balance:', balance);

  // 4. Crear orden LONG
  const order = await client.createOrder({
    market: 'ETH-USDC',
    type: 'MARKET',
    side: 'LONG',
    size: 1000,
    leverage: 10
  });
  console.log('📝 Order:', order);

  // 5. Ver posiciones
  const positions = await client.getPositions();
  console.log('📊 Positions:', positions);

  // 6. Actualizar stop loss
  if (positions.length > 0) {
    const pos = positions[0];
    await client.updatePosition(pos.positionId, 2200, 2600);
  }

  // 7. Cerrar posición
  // await client.closePosition(positions[0].positionId, 100);
}

// Exportar
export { TradingClient, TradingWebSocket };
export default TradingClient;

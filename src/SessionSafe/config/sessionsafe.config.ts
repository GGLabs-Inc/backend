import { registerAs } from '@nestjs/config';

export default registerAs('sessionsafe', () => ({
  rpcUrl: process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  contractAddress: process.env.SESSIONSAFE_CONTRACT_ADDRESS || '0x4e4E5c6c5A5ED45D437FAf7279fAC23D24e48890',
  privateKey: process.env.PRIVATE_KEY,
  chainId: parseInt(process.env.CHAIN_ID || '11155111', 10),
}));

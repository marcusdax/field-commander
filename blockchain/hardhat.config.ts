import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';

dotenv.config();

const accounts = process.env['DEPLOYER_PRIVATE_KEY'] ? [process.env['DEPLOYER_PRIVATE_KEY']] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.19',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat:   { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
    amoy: {
      url:     process.env['POLYGON_AMOY_RPC'] ?? 'https://rpc-amoy.polygon.technology',
      accounts,
      chainId: 80002,
      gasPrice: 'auto',
    },
    polygon: {
      url:     process.env['POLYGON_MAINNET_RPC'] ?? 'https://polygon-rpc.com',
      accounts,
      chainId: 137,
      gasPrice: 'auto',
    },
  },
  gasReporter: {
    enabled:    process.env['REPORT_GAS'] === 'true',
    currency:   'USD',
    token:      'MATIC',
    gasPriceApi: 'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
  },
  etherscan: {
    apiKey: {
      polygon:     process.env['POLYGONSCAN_API_KEY'] ?? '',
      polygonAmoy: process.env['POLYGONSCAN_API_KEY'] ?? '',
    },
  },
  paths: { sources: './contracts', tests: './test', cache: './cache', artifacts: './artifacts' },
};

export default config;

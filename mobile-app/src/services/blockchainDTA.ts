import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { DTAToken, LedgerSyncStatus } from '../types/dta';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xYOUR_DEPLOYED_ADDRESS_HERE';
const RPC_URL = process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';

const QUEUE_KEY = 'blockchain_queue';

const CONTRACT_ABI = [
  'event MagicMomentRegistered(bytes32 indexed dtaToken, bytes32 immutableHash, uint256 tcAwarded, address indexed analystZKP, uint256 timestamp)',
  'function registerMagicMoment(bytes32 dtaToken, bytes32 immutableHash, uint256 tcAwarded, bytes calldata zkpProof) external',
  'function verifyDTA(bytes32 dtaToken) external view returns (bool)',
  'function getStats() external view returns (uint256 _totalMissions, uint256 _totalTruthCreditsMinted, uint256 _verifiedDTACount)',
];

interface QueuedTransaction {
  dtaToken: string;
  immutableHash: string;
  tcAwarded: number;
  missionId: string;
  timestamp: number;
  retries: number;
}

let provider: ethers.JsonRpcProvider;
let contract: ethers.Contract | null = null;

export const initializeBlockchain = async (): Promise<boolean> => {
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    const network = await provider.getNetwork();
    console.log(`🔗 Connected to blockchain: ${network.name} (chainId: ${network.chainId})`);
    
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    return true;
  } catch (error) {
    initialization failed:', error console.error('Blockchain);
    return false;
  }
};

export const registerMagicMoment = async (
  missionId: string,
  momentData: any,
  tcAwarded: number
): Promise<DTAToken> => {
  const dtaToken = `DTA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const immutableHash = await hashData(momentData);

  const queuedTx: QueuedTransaction = {
    dtaToken,
    immutableHash,
    tcAwarded,
    missionId,
    timestamp: Date.now(),
    retries: 0,
  };

  await queueTransaction(queuedTx);

  const state = await NetInfo.fetch();
  if (state.isConnected) {
    await processQueue();
  }

  return {
    token: dtaToken,
    missionId,
    immutableHash,
    timestamp: Date.now(),
    verified: false,
  };
};

export const verifyDTAToken = async (dtaToken: string): Promise<boolean> => {
  if (!contract) {
    await initializeBlockchain();
  }

  try {
    const result = await contract!.verifyDTA(ethers.id(dtaToken));
    return result;
  } catch (error) {
    console.error('DTA verification failed:', error);
    return false;
  }
};

export const getLedgerStats = async (): Promise<{
  totalMissions: number;
  totalTCMinted: number;
  verifiedCount: number;
}> => {
  if (!contract) {
    await initializeBlockchain();
  }

  try {
    const stats = await contract!.getStats();
    return {
      totalMissions: Number(stats[0]),
      totalTCMinted: Number(stats[1]),
      verifiedCount: Number(stats[2]),
    };
  } catch (error) {
    console.error('Failed to get ledger stats:', error);
    return { totalMissions: 0, totalTCMinted: 0, verifiedCount: 0 };
  }
};

const queueTransaction = async (tx: QueuedTransaction): Promise<void> => {
  const queue = await getQueue();
  queue.push(tx);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueue = async (): Promise<QueuedTransaction[]> => {
  const queue = await AsyncStorage.getItem(QUEUE_KEY);
  return queue ? JSON.parse(queue) : [];
};

export const processQueue = async (): Promise<number> => {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  console.log(`📤 Processing ${queue.length} queued transactions...`);
  
  let processed = 0;
  for (const tx of queue) {
    try {
      const wallet = ethers.Wallet.createRandom();
      const signer = wallet.connect(provider);
      const txContract = contract!.connect(signer);

      const txReceipt = await txContract.registerMagicMoment(
        ethers.id(tx.dtaToken),
        tx.immutableHash,
        tx.tcAwarded,
        '0x'
      );

      await txReceipt.wait();
      console.log(`✅ Transaction confirmed: ${tx.dtaToken}`);
      
      queue.splice(queue.indexOf(tx), 1);
      processed++;
    } catch (error) {
      console.error(`Transaction failed: ${tx.dtaToken}`, error);
      tx.retries++;
      
      if (tx.retries >= 3) {
        console.error(`Max retries reached for ${tx.dtaToken}, removing from queue`);
        queue.splice(queue.indexOf(tx), 1);
      }
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return processed;
};

export const getSyncStatus = async (): Promise<LedgerSyncStatus> => {
  const queue = await getQueue();
  return {
    pendingCount: queue.length,
    lastSyncedAt: Date.now(),
    lastSuccessfulBlock: 0,
    queueSize: queue.length,
  };
};

const hashData = async (data: any): Promise<string> => {
  const jsonString = JSON.stringify(data);
  return ethers.keccak256(ethers.toUtf8Bytes(jsonString));
};

export const subscribeToEvents = (
  callback: (event: any) => void
): (() => void) => {
  if (!contract) {
    return () => {};
  }

  const filter = contract.filters.MagicMomentRegistered();
  
  contract.on(filter, (dtaToken, immutableHash, tcAwarded, analyst, timestamp) => {
    callback({
      dtaToken,
      immutableHash,
      tcAwarded: Number(tcAwarded),
      analyst,
      timestamp: Number(timestamp) * 1000,
    });
  });

  return () => {
    contract?.off(filter);
  };
};

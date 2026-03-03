import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processQueue } from './blockchainDTA';
import { getQueue } from './blockchainDTA';

const OFFLINE_QUEUE_KEY = 'offline_queue';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const SYNC_INTERVAL_MS = 30000;

interface OfflineItem {
  id: string;
  type: 'magic_moment' | 'mission_data' | 'sensor_reading';
  data: any;
  timestamp: number;
  retries: number;
}

let syncInterval: NodeJS.Timeout | null = null;
let isOnline = true;

export const startOfflineSync = (): void => {
  if (syncInterval) return;

  console.log('🔄 Starting offline sync service...');

  const unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
    const wasOffline = !isOnline;
    isOnline = state.isConnected ?? false;

    console.log(`📡 Network status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    if (isOnline && wasOffline) {
      console.log('🔌 Reconnected! Processing offline queue...');
      await processOfflineQueue();
    }
  });

  syncInterval = setInterval(async () => {
    if (isOnline) {
      await processOfflineQueue();
    }
  }, SYNC_INTERVAL_MS);

  return () => {
    unsubscribe();
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };
};

export const stopOfflineSync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
};

export const queueOfflineItem = async (
  type: OfflineItem['type'],
  data: any
): Promise<string> => {
  const item: OfflineItem = {
    id: `OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    timestamp: Date.now(),
    retries: 0,
  };

  const queue = await getOfflineQueue();
  queue.push(item);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

  console.log(`📦 Queued offline item: ${item.id} (${type})`);

  if (isOnline) {
    await processOfflineQueue();
  }

  return item.id;
};

export const getOfflineQueue = async (): Promise<OfflineItem[]> => {
  const queue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  return queue ? JSON.parse(queue) : [];
};

export const processOfflineQueue = async (): Promise<number> => {
  if (!isOnline) {
    console.log('⏳ Offline - skipping sync');
    return 0;
  }

  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return 0;
  }

  console.log(`📤 Processing ${queue.length} offline items...`);
  
  let processed = 0;
  const remaining: OfflineItem[] = [];

  for (const item of queue) {
    try {
      switch (item.type) {
        case 'magic_moment':
          await processMagicMoment(item.data);
          break;
        case 'mission_data':
          await processMissionData(item.data);
          break;
        case 'sensor_reading':
          await processSensorReading(item.data);
          break;
      }
      processed++;
    } catch (error) {
      console.error(`Failed to process item ${item.id}:`, error);
      item.retries++;

      if (item.retries < 3) {
        remaining.push(item);
      } else {
        console.error(`Max retries reached for ${item.id}, dropping`);
      }
    }
  }

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

  console.log(`✅ Processed ${processed} items, ${remaining.length} remaining`);

  if (processed > 0) {
    await processQueue();
  }

  return processed;
};

const processMagicMoment = async (data: any): Promise<void> => {
  console.log(`🎬 Processing magic moment: ${data.missionId}`);
};

const processMissionData = async (data: any): Promise<void> => {
  console.log(`📍 Processing mission data: ${data.missionId}`);
};

const processSensorReading = async (data: any): Promise<void> => {
  console.log(`📡 Processing sensor reading`);
};

export const getLastSyncTime = async (): Promise<number | null> => {
  const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return timestamp ? parseInt(timestamp, 10) : null;
};

export const getQueueStats = async (): Promise<{
  pendingCount: number;
  lastSyncTime: number | null;
  estimatedSize: number;
}> => {
  const queue = await getOfflineQueue();
  const lastSync = await getLastSyncTime();

  return {
    pendingCount: queue.length,
    lastSyncTime: lastSync,
    estimatedSize: JSON.stringify(queue).length,
  };
};

export const clearOfflineQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  console.log('🗑️ Offline queue cleared');
};

export const forceSyncNow = async (): Promise<number> => {
  console.log('🔄 Forced sync triggered');
  return await processOfflineQueue();
};

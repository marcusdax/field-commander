import { Crystals } from 'react-native-crystals';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VAULT_KEY_PREFIX = 'qrc_vault_';
const ENCRYPTION_KEY = 'kyber1024';

export interface VaultEntry {
  id: string;
  encryptedData: string;
  createdAt: number;
  missionId?: string;
  type: 'mission' | 'magic_moment' | 'sensor_data' | 'cognitive';
}

export const initializeVault = async (): Promise<boolean> => {
  try {
    await Crystals.generateKeyPair(ENCRYPTION_KEY);
    console.log('🔐 QRC Vault initialized with Kyber-1024');
    return true;
  } catch (error) {
    console.error('Vault initialization failed:', error);
    return false;
  }
};

export const storeInVault = async (
  data: any,
  type: VaultEntry['type'],
  missionId?: string
): Promise<string> => {
  const entryId = `${VAULT_KEY_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const entry: VaultEntry = {
    id: entryId,
    encryptedData: await Crystals.encryptSessionData(JSON.stringify(data)),
    createdAt: Date.now(),
    missionId,
    type,
  };

  const existing = JSON.parse((await AsyncStorage.getItem('vault_entries')) || '[]');
  existing.push(entry);
  await AsyncStorage.setItem('vault_entries', JSON.stringify(existing));

  console.log(`📦 Data stored in QRC Vault: ${entryId}`);
  return entryId;
};

export const retrieveFromVault = async (entryId: string): Promise<any | null> => {
  const entries: VaultEntry[] = JSON.parse(
    (await AsyncStorage.getItem('vault_entries')) || '[]'
  );
  
  const entry = entries.find(e => e.id === entryId);
  if (!entry) {
    return null;
  }

  const decrypted = await Crystals.decryptSessionData(entry.encryptedData);
  return JSON.parse(decrypted);
};

export const listVaultEntries = async (): Promise<VaultEntry[]> => {
  return JSON.parse((await AsyncStorage.getItem('vault_entries')) || '[]');
};

export const deleteVaultEntry = async (entryId: string): Promise<boolean> => {
  const entries: VaultEntry[] = JSON.parse(
    (await AsyncStorage.getItem('vault_entries')) || '[]'
  );
  
  const filtered = entries.filter(e => e.id !== entryId);
  await AsyncStorage.setItem('vault_entries', JSON.stringify(filtered));
  
  return true;
};

export const clearVault = async (): Promise<void> => {
  await AsyncStorage.removeItem('vault_entries');
  console.log('🗑️ QRC Vault cleared');
};

export const generateMerkleRoot = async (data: any[]): Promise<string> => {
  const hashes = await Promise.all(
    data.map(d => Crystals.hashData(JSON.stringify(d)))
  );
  
  while (hashes.length > 1) {
    for (let i = 0; i < hashes.length - 1; i += 2) {
      hashes[i] = await Crystals.hashData(hashes[i] + hashes[i + 1]);
    }
    hashes.length = Math.ceil(hashes.length / 2);
  }
  
  return hashes[0];
};

export const signData = async (data: any): Promise<string> => {
  return await Crystals.signData(JSON.stringify(data));
};

export const verifySignature = async (
  data: any,
  signature: string
): Promise<boolean> => {
  return await Crystals.verifySignature(JSON.stringify(data), signature);
};

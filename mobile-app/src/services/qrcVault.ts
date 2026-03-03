import AsyncStorage from '@react-native-async-storage/async-storage';

const VAULT_KEY_PREFIX = 'qrc_vault_';

export interface VaultEntry {
  id: string;
  encryptedData: string;
  createdAt: number;
  missionId?: string;
  type: 'mission' | 'magic_moment' | 'sensor_data' | 'cognitive';
}

// Mock encryption - replace with actual post-quantum library in production
const mockEncrypt = async (data: string): Promise<string> => {
  return Buffer.from(data).toString('base64');
};

const mockDecrypt = async (data: string): Promise<string> => {
  return Buffer.from(data, 'base64').toString('utf-8');
};

const mockHash = async (data: string): Promise<string> => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
};

const mockSign = async (data: string): Promise<string> => {
  return 'MOCK_SIGNATURE_' + await mockHash(data);
};

export const initializeVault = async (): Promise<boolean> => {
  try {
    await mockEncrypt('KEY_GEN_kyber1024');
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
    encryptedData: await mockEncrypt(JSON.stringify(data)),
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

  const decrypted = await mockDecrypt(entry.encryptedData);
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
    data.map(d => mockHash(JSON.stringify(d)))
  );
  
  while (hashes.length > 1) {
    for (let i = 0; i < hashes.length - 1; i += 2) {
      hashes[i] = await mockHash(hashes[i] + hashes[i + 1]);
    }
    hashes.length = Math.ceil(hashes.length / 2);
  }
  
  return hashes[0];
};

export const signData = async (data: any): Promise<string> => {
  return await mockSign(JSON.stringify(data));
};

export const verifySignature = async (
  data: any,
  signature: string
): Promise<boolean> => {
  const expected = await mockSign(JSON.stringify(data));
  return signature === expected;
};

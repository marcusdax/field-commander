import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  sealQrcPayload,
  openQrcPayload,
  computeMerkleRoot,
  hmacSha256Hex,
  sha256Hex,
} from './masternexCryptoCore.ts';

const VAULT_KEY_PREFIX = 'qrc_vault_';
const VAULT_SIGNING_SECRET = 'MASTERNEX-DILITHIUM1024-SOVEREIGN-SIGNING-KEY';

export interface VaultEntry {
  id: string;
  encryptedData: string;
  contentHash: string;
  createdAt: number;
  missionId?: string;
  type: 'mission' | 'magic_moment' | 'sensor_data' | 'cognitive';
}

export const initializeVault = async (): Promise<boolean> => {
  try {
    const probe = sealQrcPayload('KEY_GEN_kyber1024');
    const verified = openQrcPayload(probe);
    return verified === 'KEY_GEN_kyber1024';
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
  const serialized = JSON.stringify(data);
  const contentHash = sha256Hex(serialized);
  const entryId = `${VAULT_KEY_PREFIX}${Date.now()}_${contentHash.slice(0, 10)}`;

  const entry: VaultEntry = {
    id: entryId,
    encryptedData: sealQrcPayload(serialized),
    contentHash,
    createdAt: Date.now(),
    missionId,
    type,
  };

  const existing = JSON.parse((await AsyncStorage.getItem('vault_entries')) || '[]');
  existing.push(entry);
  await AsyncStorage.setItem('vault_entries', JSON.stringify(existing));

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

  const decrypted = openQrcPayload(entry.encryptedData);
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
};

export const generateMerkleRoot = async (data: any[]): Promise<string> => {
  return computeMerkleRoot(data);
};

export const signData = async (data: any): Promise<string> => {
  const canonical = typeof data === 'string' ? data : JSON.stringify(data);
  return `DILITHIUM1024_HMAC_${hmacSha256Hex(VAULT_SIGNING_SECRET, canonical)}`;
};

export const verifySignature = async (
  data: any,
  signature: string
): Promise<boolean> => {
  const expected = await signData(data);
  return signature === expected;
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TruthCreditWallet, TCTransaction, MultiplierConfig } from '../types/dta';

const WALLET_KEY = 'tc_wallet';
const HISTORY_KEY = 'tc_history';

const DEFAULT_MULTIPLIERS: MultiplierConfig = {
  baseTC: 25,
  verificationMultiplier: 1.0,
  civicImpactMultiplier: 1.0,
  zkpPremiumMultiplier: 1.2,
  speedBonus: 1.5,
  difficultyMultiplier: 1.0,
};

export const initializeWallet = async (): Promise<TruthCreditWallet> => {
  const existing = await AsyncStorage.getItem(WALLET_KEY);
  if (existing) {
    return JSON.parse(existing);
  }

  const wallet: TruthCreditWallet = {
    balance: 0,
    multiplier: 1.0,
    totalEarned: 0,
    pendingSettlement: 0,
    history: [],
  };

  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  return wallet;
};

export const settleDTA = async (
  missionId: string,
  multipliers: Partial<MultiplierConfig> = {}
): Promise<{ dtaToken: string; tcEarned: number }> => {
  const merged = { ...DEFAULT_MULTIPLIERS, ...multipliers };
  
  const tcEarned = Math.floor(
    merged.baseTC *
    merged.verificationMultiplier *
    merged.civicImpactMultiplier *
    merged.zkpPremiumMultiplier *
    merged.difficultyMultiplier
  );

  const dtaToken = `DTA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const wallet = await getWallet();
  wallet.balance += tcEarned;
  wallet.totalEarned += tcEarned;
  wallet.pendingSettlement += tcEarned;

  const transaction: TCTransaction = {
    id: `TX-${Date.now()}`,
    type: 'earned',
    amount: tcEarned,
    dtaToken,
    missionId,
    timestamp: Date.now(),
    description: `Magic Moment verified - Mission ${missionId}`,
  };

  wallet.history.unshift(transaction);

  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallet));

  console.log(`💰 DTA Settled: ${tcEarned} TC | Token: ${dtaToken}`);
  
  return { dtaToken, tcEarned };
};

export const getWallet = async (): Promise<TruthCreditWallet> => {
  const wallet = await AsyncStorage.getItem(WALLET_KEY);
  return wallet ? JSON.parse(wallet) : await initializeWallet();
};

export const getTransactionHistory = async (): Promise<TCTransaction[]> => {
  const wallet = await getWallet();
  return wallet.history;
};

export const applySpeedBonus = async (secondsUnderTarget: number): Promise<number> => {
  const bonus = Math.min(Math.floor(secondsUnderTarget / 10) * 5, 50);
  
  if (bonus > 0) {
    const wallet = await getWallet();
    wallet.balance += bonus;
    wallet.totalEarned += bonus;
    
    wallet.history.unshift({
      id: `TX-${Date.now()}`,
      type: 'bonus',
      amount: bonus,
      timestamp: Date.now(),
      description: `Speed bonus: ${secondsUnderTarget}s under target`,
    });
    
    await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  }
  
  return bonus;
};

export const confirmSettlement = async (dtaToken: string): Promise<boolean> => {
  const wallet = await getWallet();
  wallet.pendingSettlement = Math.max(0, wallet.pendingSettlement - 25);
  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  return true;
};

export const spendTruthCredits = async (
  amount: number,
  description: string
): Promise<boolean> => {
  const wallet = await getWallet();
  
  if (wallet.balance < amount) {
    throw new Error('Insufficient Truth Credits');
  }

  wallet.balance -= amount;

  wallet.history.unshift({
    id: `TX-${Date.now()}`,
    type: 'spent',
    amount: -amount,
    timestamp: Date.now(),
    description,
  });

  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  return true;
};

export const getStats = async (): Promise<{
  balance: number;
  totalEarned: number;
  missionsCompleted: number;
  averagePerMission: number;
}> => {
  const wallet = await getWallet();
  const completedMissions = wallet.history.filter(t => t.type === 'earned').length;
  
  return {
    balance: wallet.balance,
    totalEarned: wallet.totalEarned,
    missionsCompleted: completedMissions,
    averagePerMission: completedMissions > 0 
      ? Math.floor(wallet.totalEarned / completedMissions) 
      : 0,
  };
};

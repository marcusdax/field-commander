export interface DTAToken {
  token: string;
  missionId: string;
  immutableHash: string;
  timestamp: number;
  verified: boolean;
}

export interface TruthCreditWallet {
  balance: number;
  multiplier: number;
  totalEarned: number;
  pendingSettlement: number;
  history: TCTransaction[];
}

export interface TCTransaction {
  id: string;
  type: 'earned' | 'spent' | 'bonus' | 'penalty';
  amount: number;
  dtaToken?: string;
  missionId?: string;
  timestamp: number;
  description: string;
}

export interface DTAEvent {
  dtaToken: string;
  immutableHash: string;
  tcAwarded: number;
  analystZKP: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

export interface MultiplierConfig {
  baseTC: number;
  verificationMultiplier: number;
  civicImpactMultiplier: number;
  zkpPremiumMultiplier: number;
  speedBonus: number;
  difficultyMultiplier: number;
}

export interface LedgerSyncStatus {
  pendingCount: number;
  lastSyncedAt: number;
  lastSuccessfulBlock: number;
  queueSize: number;
}

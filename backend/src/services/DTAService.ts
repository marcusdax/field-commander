/**
 * DTAService — CitizenLedgerDTA payout executor
 * Calls verifyRecovery() on Polygon; DTA_MOCK=true bypasses chain for local dev.
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import type { DTAPayoutRequest, DTAPayoutResponse } from '../../mobile-app/src/types/nvin';

const DTA_ABI = [
  'function verifyRecovery(bytes32 plateHash, address agent, bytes32 evidenceHash, uint8 confidence) external',
  'function calculatePayout(uint8 confidence) public view returns (uint256)',
  'event PayoutExecuted(bytes32 indexed plateHash, address indexed agent, uint256 ethAmount, uint256 tcrAmount)',
];

export class DTAService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {
    const rpc = process.env['POLYGON_RPC_URL'];
    const addr = process.env['DTA_CONTRACT_ADDRESS'];
    const key = process.env['VERIFIER_PRIVATE_KEY'];
    if (rpc && addr && key) {
      this.provider = new ethers.JsonRpcProvider(rpc);
      const signer = new ethers.Wallet(key, this.provider);
      this.contract = new ethers.Contract(addr, DTA_ABI, signer);
    }
  }

  get isConfigured(): boolean { return this.contract !== null; }

  async processPayout(req: DTAPayoutRequest): Promise<DTAPayoutResponse> {
    if (!this.contract || process.env['DTA_MOCK'] === 'true') {
      return this.mockPayout(req);
    }

    // plateHash is a SHA-256 hex string — wrap in keccak for bytes32
    const plateHashBytes = ethers.keccak256(ethers.toUtf8Bytes(req.plateHash));
    // evidenceHash is already a 32-byte hex; normalise to 0x-prefixed 64 char
    const evidenceHashBytes = ('0x' + req.evidenceHash.replace(/^0x/, '').slice(0, 64).padStart(64, '0')) as `0x${string}`;
    const confidenceInt = Math.min(100, Math.max(0, Math.round(req.confidence * 100)));

    const tx = await (this.contract['verifyRecovery'] as (...args: unknown[]) => Promise<ethers.TransactionResponse>)(
      plateHashBytes, req.agentAddress, evidenceHashBytes, confidenceInt,
      { gasLimit: 300_000 }
    );
    const receipt = await tx.wait(1);
    if (!receipt) throw new Error('DTA: tx receipt null');

    const iface = new ethers.Interface(DTA_ABI);
    const payoutLog = receipt.logs
      .map((log: ethers.Log) => { try { return iface.parseLog(log); } catch { return null; } })
      .find((e): e is ethers.LogDescription => e?.name === 'PayoutExecuted');

    return {
      transactionHash: tx.hash,
      payoutAmountEth: ethers.formatEther(payoutLog?.args?.[2] ?? 0n),
      tcrReward: ethers.formatEther(payoutLog?.args?.[3] ?? 0n),
      blockNumber: receipt.blockNumber,
    };
  }

  private mockPayout(req: DTAPayoutRequest): DTAPayoutResponse {
    const conf = Math.round(req.confidence * 100);
    const multiplier = conf >= 95 ? 2 : conf >= 90 ? 1.5 : 1;
    return {
      transactionHash: '0x' + crypto.randomBytes(32).toString('hex'),
      payoutAmountEth: (0.5 * multiplier).toFixed(4),
      tcrReward: (0.5 * multiplier * 0.01).toFixed(6),
      blockNumber: 0,
    };
  }
}

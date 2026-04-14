/**
 * DTA API Route — POST /v1/dta/payout
 * Triggers CitizenLedgerDTA smart contract payout on Polygon.
 */

import type { Request, Response } from 'express';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS ?? '';
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL ?? 'https://polygon-rpc.com';

// ABI fragment — only the verifyRecovery function needed here
const ABI = [
  'function verifyRecovery(bytes32 plateHash, address agent, bytes32 evidenceHash, uint8 confidence) external',
  'event PayoutExecuted(bytes32 indexed plateHash, address indexed agent, uint256 amount)',
];

export async function requestDTAPayout(req: Request, res: Response): Promise<void> {
  const { plate_hash, agent_address, evidence_hash, confidence } = req.body as Record<string, unknown>;

  if (!plate_hash || !agent_address || !evidence_hash || typeof confidence !== 'number') {
    res.status(400).json({ error: 'plate_hash, agent_address, evidence_hash, and confidence are required' });
    return;
  }

  if ((confidence as number) < 85) {
    res.status(422).json({ error: 'Confidence below minimum threshold (85)' });
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    const tx = await contract.verifyRecovery(
      plate_hash,
      agent_address,
      evidence_hash,
      Math.round(confidence as number)
    );
    const receipt = await tx.wait();

    res.json({
      transaction_hash: receipt.hash,
      payout_amount: ethers.formatEther(receipt.logs?.[0]?.data ?? '0'),
      tcr_reward: '0',   // populated from contract event in production
      block_number: receipt.blockNumber,
    });
  } catch (err) {
    console.error('[DTA route] Error:', err);
    res.status(500).json({ error: 'Payout execution failed' });
  }
}

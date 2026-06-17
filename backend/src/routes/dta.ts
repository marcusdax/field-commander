import { Router } from 'express';
import { DTAService } from '../services/DTAService';
import { db } from '../db/client';
import type { DTAPayoutRequest } from '@field-commander/types';

export const dtaRouter = Router();
const dta = new DTAService();

dtaRouter.post('/payout', async (req, res) => {
  try {
    const body = req.body as DTAPayoutRequest;
    if (!body.plateHash || !body.agentAddress || !body.evidenceHash) {
      return res.status(400).json({ error: 'plateHash, agentAddress, evidenceHash required' });
    }
    if (body.confidence < 0.85) {
      return res.status(422).json({ error: 'Confidence below 85% threshold' });
    }

    const result = await dta.processPayout(body);

    db('recoveries')
      .where({ plate_hash: body.plateHash })
      .update({
        dta_tx_hash: result.transactionHash,
        payout_eth: result.payoutAmountEth,
        tcr_reward: result.tcrReward,
        status: 'PAID',
        verified_at: db.fn.now(),
      }).catch((err: Error) => console.warn('[DTA] DB update failed:', err.message));

    return res.json(result);
  } catch (err) {
    console.error('[DTA] payout error:', err);
    return res.status(500).json({ error: 'Payout failed' });
  }
});

dtaRouter.get('/earnings/:agentAddress', async (req, res) => {
  try {
    const { agentAddress } = req.params;
    const rows = await db('recoveries')
      .where({ agent_id: agentAddress, status: 'PAID' })
      .select('payout_eth', 'tcr_reward');

    const totalEth = rows.reduce((s: number, r: { payout_eth: string }) => s + parseFloat(r.payout_eth ?? '0'), 0);
    const totalTcr = rows.reduce((s: number, r: { tcr_reward: string }) => s + parseFloat(r.tcr_reward ?? '0'), 0);

    return res.json({
      agentAddress,
      totalEthEarned: totalEth.toFixed(8),
      totalTcrEarned: totalTcr.toFixed(8),
      recoveriesCount: rows.length,
    });
  } catch (err) {
    console.error('[DTA] earnings error:', err);
    return res.status(500).json({ error: 'Earnings lookup failed' });
  }
});

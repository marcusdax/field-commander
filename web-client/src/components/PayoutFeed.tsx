import React from 'react';
import { useStore } from '../store/useStore';

export default function PayoutFeed() {
  const { payouts, stats } = useStore();
  const totalEth = payouts.reduce((sum: number, p: any) => sum + Number(p.payoutEth), 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { l: 'Total Payouts', v: String(payouts.length) },
          { l: 'Session ETH', v: totalEth.toFixed(4) + ' ETH' },
          { l: 'Triggered (All Time)', v: String(stats?.payoutsTriggered ?? 0) },
        ].map(({ l, v }) => (
          <div key={l} style={{ backgroundColor: '#0f1627', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ backgroundColor: '#0f1627', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px', padding: '8px 16px', fontSize: 10, color: '#64748b', borderBottom: '1px solid #1e293b', textTransform: 'uppercase' }}>
          <span>Time</span><span>Tx Hash</span><span>ETH</span><span>Confidence</span>
        </div>
        {payouts.map((p: any) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px', padding: '8px 16px', fontSize: 11, borderBottom: '1px solid #0f1627', alignItems: 'center' }}>
            <span style={{ color: '#475569' }}>{String(p.timestamp).slice(11, 19)}</span>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{String(p.txHash).slice(0, 18)}…</span>
            <span style={{ color: '#22c55e' }}>{Number(p.payoutEth).toFixed(4)}</span>
            <span style={{ color: '#94a3b8' }}>{p.confidence}%</span>
          </div>
        ))}
        {payouts.length === 0 && <div style={{ padding: 24, fontSize: 12, color: '#475569', textAlign: 'center' }}>No payouts triggered yet</div>}
      </div>
    </div>
  );
}

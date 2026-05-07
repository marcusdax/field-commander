import React from 'react';
import { useStore } from '../store/useStore';

export default function PayoutFeed() {
  const { payouts, stats } = useStore();
  const totalEth = payouts.reduce((s, p) => s + parseFloat(p.ethAmount ?? '0'), 0);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: '#0d1526', border: '1px solid #a855f733', borderRadius: 8, padding: '16px 24px' }}>
          <div style={{ color: '#475569', fontSize: 9, letterSpacing: 3, marginBottom: 6 }}>TOTAL PAYOUTS</div>
          <div style={{ color: '#a855f7', fontSize: 28, fontWeight: 700 }}>{stats?.payoutsTriggered ?? 0}</div>
        </div>
        <div style={{ background: '#0d1526', border: '1px solid #22c55e33', borderRadius: 8, padding: '16px 24px' }}>
          <div style={{ color: '#475569', fontSize: 9, letterSpacing: 3, marginBottom: 6 }}>SESSION ETH PAID</div>
          <div style={{ color: '#22c55e', fontSize: 28, fontWeight: 700 }}>{totalEth.toFixed(4)}</div>
        </div>
        <div style={{ background: '#0d1526', border: '1px solid #f59e0b33', borderRadius: 8, padding: '16px 24px' }}>
          <div style={{ color: '#475569', fontSize: 9, letterSpacing: 3, marginBottom: 6 }}>BASE PAYOUT</div>
          <div style={{ color: '#f59e0b', fontSize: 28, fontWeight: 700 }}>0.5 ETH</div>
          <div style={{ color: '#475569', fontSize: 10, marginTop: 4 }}>85%=1× · 90%=1.5× · 95%=2×</div>
        </div>
      </div>

      {/* Payout log */}
      <div style={{ background: '#0d1526', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px', background: '#0a0f1a',
          color: '#334155', fontSize: 9, letterSpacing: 3,
          borderBottom: '1px solid #1e293b',
        }}>
          DTA PAYOUT LOG · CitizenLedgerDTA · Polygon
        </div>
        {payouts.length === 0 ? (
          <div style={{ color: '#334155', textAlign: 'center', padding: 40, fontSize: 12 }}>
            No payouts yet.  Triggers on hotlist match + confidence ≥ 85%.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['TIME', 'PLATE HASH', 'AGENT WALLET', 'ETH PAYOUT'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    color: '#334155', fontSize: 9, letterSpacing: 2, fontWeight: 400,
                    borderTop: '1px solid #1e293b',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map((p, i) => (
                <tr key={`${p.jobId}-${i}`} style={{ borderTop: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px 16px', color: '#475569', fontSize: 11 }}>
                    {new Date(p.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
                    {String(p.plateHash).slice(0, 16)}…
                  </td>
                  <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>
                    {String(p.agentAddress).slice(0, 12)}…
                  </td>
                  <td style={{ padding: '10px 16px', color: '#22c55e', fontSize: 14, fontWeight: 700 }}>
                    {parseFloat(p.ethAmount ?? '0').toFixed(4)} ETH
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

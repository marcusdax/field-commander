import React from 'react';
import { useStore } from '../store/useStore';

const ACTION_COLOR: Record<string, string> = {
  TRIGGER_DTA: '#ef4444',
  INTERCEPT: '#f59e0b',
  ALERT: '#eab308',
  MONITOR: '#22c55e',
};

export default function ScanFeed() {
  const { scans } = useStore();

  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{scans.length} events</div>
      <div style={{ backgroundColor: '#0f1627', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 60px 120px', padding: '8px 16px', fontSize: 10, color: '#64748b', borderBottom: '1px solid #1e293b', textTransform: 'uppercase' }}>
          <span>Time</span><span>Plate Hash</span><span>Status</span><span>KDA</span><span>Action</span>
        </div>
        {scans.map((s: any) => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 60px 120px', padding: '8px 16px', fontSize: 11, borderBottom: '1px solid #0f1627', alignItems: 'center' }}>
            <span style={{ color: '#475569' }}>{String(s.timestamp).slice(11, 19)}</span>
            <span style={{ fontFamily: 'monospace' }}>{String(s.plateHash).slice(0, 16)}…</span>
            <span style={{ color: s.hotlistHit ? '#ef4444' : '#22c55e' }}>{s.hotlistHit ? '● HIT' : '○ CLEAR'}</span>
            <span style={{ color: '#94a3b8' }}>{(Number(s.kdaScore) * 100).toFixed(0)}%</span>
            <span style={{ color: ACTION_COLOR[s.action] ?? '#94a3b8', fontSize: 10 }}>{s.action}</span>
          </div>
        ))}
        {scans.length === 0 && <div style={{ padding: 24, fontSize: 12, color: '#475569', textAlign: 'center' }}>Awaiting scan events…</div>}
      </div>
    </div>
  );
}

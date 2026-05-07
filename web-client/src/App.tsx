import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import Dashboard from './components/Dashboard';
import DevicePanel from './components/DevicePanel';
import ScanFeed from './components/ScanFeed';
import PayoutFeed from './components/PayoutFeed';

type View = 'Overview' | 'Devices' | 'Scan Feed' | 'DTA Payouts';
const VIEWS: View[] = ['Overview', 'Devices', 'Scan Feed', 'DTA Payouts'];

export default function App() {
  const { connected, initSocket } = useStore();
  const [view, setView] = useState<View>('Overview');
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => { initSocket(); }, [initSocket]);
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0a0f1a', color: '#e2e8f0', fontFamily: 'monospace' }}>
      <aside style={{ width: 200, backgroundColor: '#0f1627', borderRight: '1px solid #1e293b', padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 24px', fontSize: 14, fontWeight: 700, color: '#38bdf8', letterSpacing: 2 }}>SWIS CMD</div>
        {VIEWS.map((v) => (
          <div
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 13,
              backgroundColor: v === view ? '#1e293b' : 'transparent',
              color: v === view ? '#38bdf8' : '#94a3b8',
              borderLeft: v === view ? '2px solid #38bdf8' : '2px solid transparent',
            }}
          >
            {v}
          </div>
        ))}
      </aside>
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#0f1627' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: connected ? '#22c55e' : '#ef4444', boxShadow: connected ? '0 0 6px #22c55e' : 'none' }} />
          <span style={{ fontSize: 12, color: '#64748b' }}>{connected ? 'EDGE CONNECTED' : 'DISCONNECTED'}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>{time}</span>
        </div>
        <div style={{ flex: 1, padding: 24 }}>
          {view === 'Overview' && <Dashboard />}
          {view === 'Devices' && <DevicePanel />}
          {view === 'Scan Feed' && <ScanFeed />}
          {view === 'DTA Payouts' && <PayoutFeed />}
        </div>
      </main>
    </div>
  );
}

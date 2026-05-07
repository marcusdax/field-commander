import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import Dashboard from './components/Dashboard';
import ScanFeed from './components/ScanFeed';
import PayoutFeed from './components/PayoutFeed';
import DevicePanel from './components/DevicePanel';

type View = 'dashboard' | 'devices' | 'scans' | 'payouts';

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Overview',    icon: '⭡' },
  { id: 'devices',   label: 'Devices',     icon: '◈' },
  { id: 'scans',     label: 'Scan Feed',   icon: '◎' },
  { id: 'payouts',   label: 'DTA Payouts', icon: '◆' },
];

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [tick, setTick] = useState(0);
  const { connected, connect, stats } = useStore();

  useEffect(() => { connect(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const _ = tick; // keep clock ticking

  return (
    <div style={S.root}>
      {/* ─── Sidebar ──────────────────────────────────────── */}
      <nav style={S.sidebar}>
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ color: '#22d3ee', fontSize: 22 }}>⭡</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>FIELD COMMANDER</span>
          </div>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: 3 }}>SWIS COMMAND CENTER v4.0</div>
        </div>

        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            ...S.navBtn,
            background:  view === n.id ? 'rgba(34,211,238,0.08)' : 'transparent',
            color:       view === n.id ? '#22d3ee' : '#64748b',
            borderLeft:  view === n.id ? '2px solid #22d3ee' : '2px solid transparent',
          }}>
            <span style={{ marginRight: 10, fontSize: 16 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              display: 'inline-block',
              boxShadow: connected ? '0 0 6px #22c55e' : 'none',
            }} />
            <span style={{ color: connected ? '#22c55e' : '#ef4444', fontSize: 10, letterSpacing: 1 }}>
              {connected ? 'EDGE LIVE' : 'OFFLINE'}
            </span>
          </div>
          {stats && (
            <div style={{ color: '#334155', fontSize: 9, marginTop: 6, letterSpacing: 1 }}>
              {stats.devices.online}/{stats.devices.total} devices
            </div>
          )}
        </div>
      </nav>

      {/* ─── Main ─────────────────────────────────────────── */}
      <main style={S.main}>
        <header style={S.header}>
          <h1 style={S.pageTitle}>{NAV.find(n => n.id === view)?.label.toUpperCase()}</h1>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {stats && (
              <span style={{ color: '#475569', fontSize: 11, letterSpacing: 1 }}>
                QUEUE {stats.queueDepth} · {stats.payoutsTriggered} PAYOUTS · {stats.completed} COMPLETE
              </span>
            )}
            <span style={{ color: '#334155', fontSize: 11 }}>{new Date().toLocaleTimeString()}</span>
          </div>
        </header>
        <div style={S.content}>
          {view === 'dashboard' && <Dashboard />}
          {view === 'devices'   && <DevicePanel />}
          {view === 'scans'     && <ScanFeed />}
          {view === 'payouts'   && <PayoutFeed />}
        </div>
      </main>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root:      { display: 'flex', height: '100vh', background: '#0a0f1a', color: '#e2e8f0', overflow: 'hidden' },
  sidebar:   { width: 210, background: '#0d1526', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 },
  navBtn:    { width: '100%', padding: '11px 20px', textAlign: 'left', border: 'none', cursor: 'pointer', fontSize: 12, letterSpacing: 1, transition: 'all 0.12s', background: 'transparent' },
  main:      { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  header:    { padding: '14px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d1526', flexShrink: 0 },
  pageTitle: { fontSize: 13, fontWeight: 600, letterSpacing: 3, color: '#94a3b8' },
  content:   { flex: 1, overflow: 'auto', padding: 24 },
};

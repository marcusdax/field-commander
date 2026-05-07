import React, { useEffect, useState } from 'react';

interface Device {
  id: string;
  device_id: string;
  platform: string;
  status: 'online' | 'busy' | 'offline';
  total_jobs_completed: number;
  total_earnings_eth: string;
  last_heartbeat: string | null;
  registered_at: string;
  agent_address: string | null;
}

const EDGE_URL = process.env['REACT_APP_EDGE_URL'] ?? 'http://localhost:3002';

const STATUS_COLOR: Record<string, string> = {
  online:  '#22c55e',
  busy:    '#f59e0b',
  offline: '#475569',
};

const PLATFORM_ICON: Record<string, string> = {
  android: '⌘',
  ios:     '',
  linux:   'λ',
  windows: '⊞',
};

export default function DevicePanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch(`${EDGE_URL}/v1/devices`)
        .then(r => { if (!r.ok) throw new Error('no data'); return r.json() as Promise<Device[]>; })
        .then(setDevices)
        .catch(() => {})
        .finally(() => setLoading(false));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div style={{ color: '#475569' }}>Loading devices…</div>;

  return (
    <div>
      <div style={{ color: '#334155', fontSize: 9, letterSpacing: 3, marginBottom: 16 }}>
        {devices.length} REGISTERED DEVICES
      </div>
      {devices.length === 0 ? (
        <div style={{
          color: '#334155', textAlign: 'center', padding: 40,
          background: '#0d1526', borderRadius: 8, border: '1px solid #1e293b', fontSize: 12,
        }}>
          No devices yet.  POST to /v1/devices/register from a Field Commander node.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
          {devices.map(d => (
            <div key={d.id} style={{
              background: '#0d1526',
              border: `1px solid ${(STATUS_COLOR[d.status] ?? '#475569')}44`,
              borderRadius: 8, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                  {PLATFORM_ICON[d.platform] ?? '□'} {d.device_id.slice(0, 18)}
                </span>
                <span style={{ color: STATUS_COLOR[d.status] ?? '#475569', fontSize: 11 }}>
                  ● {d.status.toUpperCase()}
                </span>
              </div>
              <div style={{ color: '#475569', fontSize: 11, lineHeight: 1.7 }}>
                <div>Jobs completed: <span style={{ color: '#94a3b8' }}>{d.total_jobs_completed}</span></div>
                <div>Earnings: <span style={{ color: '#22c55e' }}>{parseFloat(d.total_earnings_eth || '0').toFixed(4)} ETH</span></div>
                {d.agent_address && (
                  <div>Wallet: <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 10 }}>{d.agent_address.slice(0, 10)}…</span></div>
                )}
              </div>
              <div style={{ color: '#334155', fontSize: 9, marginTop: 10, letterSpacing: 1 }}>
                LAST SEEN {d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleTimeString() : 'never'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';

const EDGE_URL = (process.env['REACT_APP_EDGE_URL'] as string) ?? 'http://localhost:3002';

interface Device {
  device_id: string;
  platform: string;
  status: string;
  jobs_completed: number;
  wallet_address: string;
  last_heartbeat: string;
}

const STATUS_COLOR: Record<string, string> = { online: '#22c55e', busy: '#f59e0b', offline: '#475569' };

export default function DevicePanel() {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch(`${EDGE_URL}/v1/devices`);
        if (res.ok) setDevices(await res.json());
      } catch (_) {}
    };
    fetchDevices();
    const t = setInterval(fetchDevices, 5000);
    return () => clearInterval(t);
  }, []);

  const col = (s: string) => STATUS_COLOR[s] ?? '#475569';

  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{devices.length} registered devices</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {devices.map((d) => (
          <div key={d.device_id} style={{ backgroundColor: '#0f1627', border: `1px solid ${col(d.status)}33`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: col(d.status) }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{String(d.device_id).slice(0, 12)}…</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{d.platform} · {d.jobs_completed} jobs</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{String(d.wallet_address ?? '').slice(0, 10)}…</div>
          </div>
        ))}
        {devices.length === 0 && <div style={{ fontSize: 12, color: '#475569' }}>No devices registered</div>}
      </div>
    </div>
  );
}

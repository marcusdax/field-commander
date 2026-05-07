import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { useStore } from '../store/useStore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const card: React.CSSProperties = { backgroundColor: '#0f1627', border: '1px solid #1e293b', borderRadius: 8, padding: 16 };

export default function Dashboard() {
  const { stats, throughputHistory, scans } = useStore();

  const chartData = {
    labels: throughputHistory.map((_: number, i: number) => (i % 5 === 0 ? String(i - 30) + 's' : '')),
    datasets: [{
      label: 'Scans',
      data: throughputHistory,
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56,189,248,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
    }],
  };

  const chartOpts: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { display: false }, y: { display: false } },
    plugins: { legend: { display: false } },
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { l: 'Devices Online', v: stats?.devices?.online ?? 0 },
          { l: 'Queue Depth', v: stats?.queueDepth ?? 0 },
          { l: 'Jobs Completed', v: stats?.completed ?? 0 },
          { l: 'Jobs Failed', v: stats?.failed ?? 0 },
          { l: 'DTA Payouts', v: stats?.payoutsTriggered ?? 0 },
        ].map(({ l, v }) => (
          <div key={l} style={card}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#38bdf8' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ ...card, height: 200 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Scan Throughput</div>
          <div style={{ height: 150 }}>
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Recent Scans</div>
          {scans.slice(0, 5).map((s: any) => (
            <div key={s.id} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid #1e293b', color: s.hotlistHit ? '#ef4444' : '#94a3b8' }}>
              <span style={{ color: '#64748b' }}>{s.timestamp.slice(11, 19)} </span>
              {String(s.plateHash).slice(0, 8)}… {s.hotlistHit ? '● HIT' : '○'}
            </div>
          ))}
          {scans.length === 0 && <div style={{ fontSize: 11, color: '#475569' }}>No scans yet</div>}
        </div>
      </div>
    </div>
  );
}

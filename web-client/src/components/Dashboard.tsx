import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useStore } from '../store/useStore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function Stat({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{
      background: '#0d1526', border: `1px solid ${color}33`,
      borderRadius: 8, padding: '16px 20px', flex: '1 1 140px',
    }}>
      <div style={{ color: '#475569', fontSize: 9, letterSpacing: 3, marginBottom: 8 }}>{label}</div>
      <div style={{ color, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#334155', fontSize: 10, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { stats, scans, throughputHistory } = useStore();
  const hotlistHits = scans.filter(s => s.hotlistMatch).length;

  const chartData = {
    labels: throughputHistory.map((_, i) => i % 5 === 0 ? `-${throughputHistory.length - i}` : ''),
    datasets: [{
      data: throughputHistory,
      borderColor: '#22d3ee',
      backgroundColor: 'rgba(34,211,238,0.06)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 1.5,
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
    scales: {
      x: { ticks: { color: '#334155', font: { size: 9 } }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#334155', font: { size: 9 } }, grid: { color: '#1e293b' }, min: 0 },
    },
  };

  return (
    <div>
      {/* Stat row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <Stat label="ONLINE DEVICES"   value={stats?.devices.online    ?? '—'} color="#22d3ee" sub={`${stats?.devices.busy ?? 0} busy`} />
        <Stat label="QUEUE DEPTH"      value={stats?.queueDepth        ?? '—'} color="#f59e0b" sub="pending jobs" />
        <Stat label="JOBS COMPLETED"   value={stats?.completed         ?? '—'} color="#22c55e" sub={`${stats?.failed ?? 0} failed`} />
        <Stat label="DTA PAYOUTS"      value={stats?.payoutsTriggered  ?? '—'} color="#a855f7" sub="recovery events" />
        <Stat label="HOTLIST HITS"     value={hotlistHits}                      color="#ef4444" sub="this session" />
      </div>

      {/* Throughput chart */}
      <div style={{ background: '#0d1526', border: '1px solid #1e293b', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ color: '#334155', fontSize: 9, letterSpacing: 3, marginBottom: 12 }}>JOB THROUGHPUT — LAST 30 TICKS</div>
        <div style={{ height: 120 }}><Line data={chartData} options={chartOpts} /></div>
      </div>

      {/* Recent scans */}
      <div style={{ background: '#0d1526', border: '1px solid #1e293b', borderRadius: 8, padding: '16px 20px' }}>
        <div style={{ color: '#334155', fontSize: 9, letterSpacing: 3, marginBottom: 12 }}>RECENT PLATE SCANS</div>
        {scans.length === 0 ? (
          <div style={{ color: '#334155', textAlign: 'center', padding: '24px 0', fontSize: 12 }}>
            Awaiting scan data… POST to /v1/nvin/ocr/submit to begin.
          </div>
        ) : scans.slice(0, 8).map(s => (
          <div key={s.jobId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 0', borderBottom: '1px solid #1e293b22', gap: 12,
          }}>
            <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12, flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.plateHash}
            </span>
            <span style={{ color: s.hotlistMatch ? '#ef4444' : '#22c55e', fontSize: 11, flex: 1 }}>
              {s.hotlistMatch ? '● HIT' : '○ CLEAR'}
            </span>
            <span style={{ color: '#64748b', fontSize: 11, flex: 1 }}>KDA {s.kdaScore.toFixed(3)}</span>
            <span style={{ color: '#334155', fontSize: 10, flex: 1, textAlign: 'right' }}>
              {new Date(s.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

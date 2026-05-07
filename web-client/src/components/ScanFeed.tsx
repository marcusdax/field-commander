import React from 'react';
import { useStore } from '../store/useStore';

const ACTION_COLOR: Record<string, string> = {
  TRIGGER_DTA:        '#ef4444',
  IMMEDIATE_RESPONSE: '#ef4444',
  UPLOAD_EVIDENCE:    '#f59e0b',
  ALERT:              '#f59e0b',
  MONITOR:            '#22d3ee',
  NO_ACTION:          '#334155',
};

export default function ScanFeed() {
  const { scans } = useStore();

  return (
    <div>
      <div style={{ color: '#334155', fontSize: 9, letterSpacing: 3, marginBottom: 16 }}>
        NVIN PLATE SCAN STREAM · {scans.length} EVENTS
      </div>
      <div style={{ background: '#0d1526', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
        {scans.length === 0 ? (
          <div style={{ color: '#334155', textAlign: 'center', padding: 40, fontSize: 12 }}>
            Waiting for scan events… POST to /v1/nvin/ocr/submit to begin.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a0f1a' }}>
                {['TIME', 'PLATE HASH', 'STATUS', 'KDA', 'ACTION'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    color: '#334155', fontSize: 9, letterSpacing: 2, fontWeight: 400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scans.map((s, i) => (
                <tr key={`${s.jobId}-${i}`} style={{ borderTop: '1px solid #1e293b', background: i % 2 ? '#0d1526' : 'transparent' }}>
                  <td style={{ padding: '9px 16px', color: '#475569', fontSize: 11 }}>
                    {new Date(s.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '9px 16px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
                    {s.plateHash}
                  </td>
                  <td style={{ padding: '9px 16px' }}>
                    <span style={{ color: s.hotlistMatch ? '#ef4444' : '#22c55e', fontSize: 12 }}>
                      {s.hotlistMatch ? '● HIT' : '○ CLEAR'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 16px', color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>
                    {s.kdaScore.toFixed(4)}
                  </td>
                  <td style={{ padding: '9px 16px' }}>
                    <span style={{
                      color: ACTION_COLOR[s.recommendedAction] ?? '#334155',
                      fontSize: 10, letterSpacing: 1,
                    }}>
                      {s.recommendedAction}
                    </span>
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

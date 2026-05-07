import { create } from 'zustand';
import { io } from 'socket.io-client';

const EDGE_URL = (process.env['REACT_APP_EDGE_URL'] as string) ?? 'http://localhost:3002';

interface ScanEvent {
  id: string;
  plateHash: string;
  timestamp: string;
  kdaScore: number;
  hotlistHit: boolean;
  action: string;
}

interface PayoutEvent {
  id: string;
  txHash: string;
  agentAddress: string;
  payoutEth: number;
  confidence: number;
  timestamp: string;
}

interface DeviceStats {
  total: number;
  online: number;
  busy: number;
  offline: number;
}

interface DashboardStats {
  devices: DeviceStats;
  queueDepth: number;
  submitted: number;
  completed: number;
  failed: number;
  payoutsTriggered: number;
}

interface Store {
  connected: boolean;
  stats: DashboardStats | null;
  scans: ScanEvent[];
  payouts: PayoutEvent[];
  throughputHistory: number[];
  socket: any;
  initSocket: () => void;
  fetchStats: () => Promise<void>;
}

let pollTimer: any = null;

export const useStore = create<Store>((set, get) => ({
  connected: false,
  stats: null,
  scans: [],
  payouts: [],
  throughputHistory: Array(30).fill(0) as number[],
  socket: null,

  initSocket: () => {
    if (get().socket) return;
    const socket = io(EDGE_URL, { transports: ['websocket'] });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('job:completed', (data: any) => {
      const scan: ScanEvent = {
        id: data.jobId ?? Math.random().toString(36).slice(2),
        plateHash: data.payload?.plateHash ?? '—',
        timestamp: new Date().toISOString(),
        kdaScore: data.result?.kdaScore ?? 0,
        hotlistHit: data.result?.hotlistHit ?? false,
        action: data.result?.recommendedAction ?? 'MONITOR',
      };
      set((s) => ({
        scans: [scan, ...s.scans].slice(0, 100),
        throughputHistory: [...s.throughputHistory.slice(1), (s.throughputHistory[s.throughputHistory.length - 1] ?? 0) + 1],
      }));
    });

    socket.on('dta:payout', (data: any) => {
      const payout: PayoutEvent = {
        id: Math.random().toString(36).slice(2),
        txHash: data.txHash ?? '0x0',
        agentAddress: data.agentAddress ?? '0x0',
        payoutEth: data.payoutEth ?? 0,
        confidence: data.confidence ?? 0,
        timestamp: new Date().toISOString(),
      };
      set((s) => ({ payouts: [payout, ...s.payouts].slice(0, 50) }));
    });

    set({ socket });
    if (!pollTimer) {
      pollTimer = setInterval(() => get().fetchStats(), 5000);
    }
    get().fetchStats();
  },

  fetchStats: async () => {
    try {
      const res = await fetch(`${EDGE_URL}/v1/dashboard`);
      if (res.ok) {
        const data: DashboardStats = await res.json();
        set({ stats: data });
      }
    } catch (_) {}
  },
}));

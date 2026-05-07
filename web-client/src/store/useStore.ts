import { create } from 'zustand';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

export interface DeviceStats {
  total: number;
  online: number;
  busy: number;
  offline: number;
}

export interface ScanEvent {
  jobId: string;
  plateHash: string;
  hotlistMatch: boolean;
  kdaScore: number;
  recommendedAction: string;
  timestamp: string;
}

export interface PayoutEvent {
  jobId: string;
  plateHash: string;
  agentAddress: string;
  ethAmount?: string;
  timestamp: string;
}

export interface DashboardStats {
  devices: DeviceStats;
  queueDepth: number;
  submitted: number;
  completed: number;
  failed: number;
  payoutsTriggered: number;
  timestamp: string;
}

interface AppStore {
  connected: boolean;
  stats: DashboardStats | null;
  scans: ScanEvent[];
  payouts: PayoutEvent[];
  throughputHistory: number[];
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
  fetchStats: () => Promise<void>;
}

const EDGE_URL = process.env['REACT_APP_EDGE_URL'] ?? 'http://localhost:3002';

let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useStore = create<AppStore>((set, get) => ({
  connected: false,
  stats: null,
  scans: [],
  payouts: [],
  throughputHistory: Array(30).fill(0) as number[],
  socket: null,

  connect: () => {
    get().socket?.disconnect();
    if (pollTimer) clearInterval(pollTimer);

    const socket = io(EDGE_URL, { transports: ['websocket', 'polling'], reconnectionDelay: 2000 });

    socket.on('connect',    () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('job:completed', (data: { jobId: string; result: Record<string, unknown> }) => {
      const r = data.result as Partial<ScanEvent>;
      const scan: ScanEvent = {
        jobId:             data.jobId,
        plateHash:         String(r.plateHash ?? '').slice(0, 18) + '...',
        hotlistMatch:      Boolean(r.hotlistMatch),
        kdaScore:          Number(r.kdaScore ?? 0),
        recommendedAction: String(r.recommendedAction ?? 'NO_ACTION'),
        timestamp:         new Date().toISOString(),
      };
      set(s => ({
        scans: [scan, ...s.scans].slice(0, 100),
        throughputHistory: [
          ...s.throughputHistory.slice(1),
          (s.throughputHistory[s.throughputHistory.length - 1] ?? 0) + 1,
        ],
      }));
    });

    socket.on('dta:payout', (data: Omit<PayoutEvent, 'timestamp'>) => {
      const payout: PayoutEvent = { ...data, timestamp: new Date().toISOString() };
      set(s => ({ payouts: [payout, ...s.payouts].slice(0, 50) }));
    });

    set({ socket });
    get().fetchStats();
    pollTimer = setInterval(() => get().fetchStats(), 5000);
  },

  disconnect: () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    get().socket?.disconnect();
    set({ socket: null, connected: false });
  },

  fetchStats: async () => {
    try {
      const res = await fetch(`${EDGE_URL}/v1/dashboard`);
      if (res.ok) set({ stats: await res.json() as DashboardStats });
    } catch { /* offline — silently ignore */ }
  },
}));

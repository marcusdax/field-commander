export * from './mission';
export * from './dta';

export interface AppState {
  mission: Mission | null;
  ghostMode: boolean;
  isRecording: boolean;
  truthCredits: number;
  dtaTokens: string[];
  offlineQueue: number;
}

export interface WebRTCPeer {
  peerId: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  stream?: MediaStream;
}

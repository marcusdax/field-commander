import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import { RTCView, mediaDevices, RTCPeerConnection } from 'react-native-webrtc';
import { useSovereignAR } from './hooks/useSovereignAR';
import { useLuminNodeSwarm } from './services/iotLuminNodeBridge';
import { useSWISDrawing } from './hooks/useSWISDrawing';
import { usePTECoPilot } from './hooks/usePTECoPilot';
import { useMagicMoment } from './services/magicMoment';
import { activateGhostMode, getGhostModeStatus } from './services/ghostRelay';
import { settleDTA, getWallet } from './services/dtaSettlement';
import { startOfflineSync, getQueueStats } from './services/offlineSync';
import { GhostModeStatus, LuminNode, AnomalyMarker } from './types/mission';

const FieldCommander = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ghostMode, setGhostMode] = useState(false);
  const [ghostStatus, setGhostStatus] = useState<GhostModeStatus | null>(null);
  const [missionID] = useState('SHADOW-' + Date.now().toString(36).toUpperCase());
  const [truthCredits, setTruthCredits] = useState(0);
  const [offlineQueue, setOfflineQueue] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const { anchors, placeWorldPin, getAnchorsSummary } = useSovereignAR({ missionId: missionID, ghostMode });
  const { nodes, alerts, pairNode, toggleWatchdog } = useLuminNodeSwarm();
  const { remoteAnchors, currentTool, setTool } = useSWISDrawing({ dataChannel: dataChannelRef.current });
  const { suggestions, acceptSuggestion, currentLocation, threatLevel } = usePTECoPilot({ missionId: missionID, ghostMode });
  const { isRecording: magicRecording, startRecording, stopRecording } = useMagicMoment({
    missionId: missionID,
    ghostMode,
    anchors,
    luminNodes: nodes.map(n => n.id),
  });

  useEffect(() => {
    const init = async () => {
      await requestPermissions();
      await setupCamera();
      await setupWebRTC();
      startOfflineSync();
      await loadWalletData();
      await updateQueueStats();
    };
    init();

    const interval = setInterval(updateQueueStats, 5000);
    return () => {
      clearInterval(interval);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      const audio = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      const location = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      
      return camera === PermissionsAndroid.RESULTS.GRANTED &&
             audio === PermissionsAndroid.RESULTS.GRANTED &&
             location === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const setupCamera = async () => {
    try {
      const mediaStream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
    } catch (error) {
      console.error('Camera setup failed:', error);
    }
  };

  const setupWebRTC = async () => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    peerConnectionRef.current = new RTCPeerConnection(config);

    if (stream) {
      stream.getTracks().forEach((track: any) => {
        peerConnectionRef.current?.addTrack(track, stream);
      });
    }

    const dataChannel = peerConnectionRef.current?.createDataChannel('swis');
    dataChannelRef.current = dataChannel || null;
  };

  const loadWalletData = async () => {
    const wallet = await getWallet();
    setTruthCredits(wallet.balance);
  };

  const updateQueueStats = async () => {
    const stats = await getQueueStats();
    setOfflineQueue(stats.pendingCount);
  };

  const handleGhostMode = async () => {
    try {
      if (ghostMode) {
        Alert.alert('Ghost Mode', 'Already active');
        return;
      }
      
      await activateGhostMode();
      setGhostMode(true);
      setGhostStatus(getGhostModeStatus());
      Alert.alert('Ghost Mode Active', 'You are now invisible. All data routed through Ghost Relay.');
    } catch (error) {
      console.error('Ghost Mode error:', error);
    }
  };

  const handleMagicMoment = async () => {
    if (isRecording || magicRecording) return;
    
    setIsRecording(true);
    await startRecording();
    
    setTimeout(async () => {
      await stopRecording();
      setIsRecording(false);
      await loadWalletData();
      Alert.alert('Magic Moment Captured', 'Verification submitted. DTA token generated.');
    }, 15000);
  };

  const handlePlacePin = async (type: AnomalyMarker['type']) => {
    await placeWorldPin(Math.random() * 300 + 50, Math.random() * 400 + 100, type);
  };

  const anchorsSummary = getAnchorsSummary();

  return (
    <View style={styles.container}>
      {stream && (
        <RTCView streamURL={stream.toURL()} style={styles.video} objectFit="cover" mirror={false} />
      )}

      <View style={styles.hud}>
        <Text style={styles.missionText}>MISSION {missionID}</Text>
        <Text style={styles.statusText}>
          {ghostMode ? '👻 PHANTOM' : '🌐 LIVE'} | {nodes.length} NODES | TC: {truthCredits} | Q: {offlineQueue}
        </Text>
        
        {threatLevel !== 'low' && (
          <View style={[styles.threatBadge, { backgroundColor: threatLevel === 'high' ? '#FF0000' : '#FFA500' }]}>
            <Text style={styles.threatText}>⚠️ {threatLevel.toUpperCase()} THREAT</Text>
          </View>
        )}

        {suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            <Text style={styles.suggestionsTitle}>PTE CO-PILOT</Text>
            {suggestions.slice(0, 2).map((s) => (
              <TouchableOpacity key={s.id} onPress={() => acceptSuggestion(s.id)}>
                <Text style={styles.suggestionText}>→ {s.content}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {anchorsSummary.total > 0 && (
          <View style={styles.anchorsBox}>
            <Text style={styles.anchorsTitle}>ANCHORS: {anchorsSummary.total}</Text>
            <Text style={styles.anchorsText}>
              🔴{anchorsSummary.threat} 🟡{anchorsSummary.verification} 🔵{anchorsSummary.info}
            </Text>
          </View>
        )}

        <View style={styles.toolRow}>
          <TouchableOpacity onPress={() => handlePlacePin('threat')} style={[styles.toolBtn, styles.threatBtn]}>
            <Text style={styles.toolBtnText}>🔴</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handlePlacePin('verification')} style={[styles.toolBtn, styles.verifyBtn]}>
            <Text style={styles.toolBtnText}>🟡</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handlePlacePin('info')} style={[styles.toolBtn, styles.infoBtn]}>
            <Text style={styles.toolBtnText}>🔵</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleGhostMode} style={[styles.button, ghostMode ? styles.ghostActive : styles.ghostInactive]}>
            <Text style={styles.buttonText}>{ghostMode ? '👻 PHANTOM' : 'GHOST MODE'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => pairNode(`NODE-${Date.now().toString(36)}`)} style={[styles.button, styles.nodeBtn]}>
            <Text style={styles.buttonText}>+ NODE</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleMagicMoment} style={[styles.magicButton, isRecording && styles.recordingButton]} disabled={isRecording}>
          <Text style={styles.magicButtonText}>{isRecording ? '⏺ CAPTURING...' : '🔥 MAGIC MOMENT'}</Text>
        </TouchableOpacity>
      </View>

      {alerts.length > 0 && (
        <View style={styles.alertsBox}>
          {alerts.slice(-3).map((alert, i) => (
            <Text key={i} style={styles.alertText}>🚨 {alert}</Text>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Shadow Analyst • L3 • {currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : 'LOCATING...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  hud: { position: 'absolute', top: 50, left: 20, right: 20 },
  missionText: { color: '#00FFFF', fontSize: 24, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  statusText: { color: '#FFF', fontSize: 12, marginTop: 5, opacity: 0.8 },
  threatBadge: { padding: 8, borderRadius: 5, marginTop: 10, alignSelf: 'flex-start' },
  threatText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  suggestionsBox: { backgroundColor: 'rgba(0, 255, 255, 0.2)', padding: 10, borderRadius: 10, marginTop: 10 },
  suggestionsTitle: { color: '#00FFFF', fontWeight: 'bold', fontSize: 12 },
  suggestionText: { color: '#FFF', fontSize: 12, marginTop: 2 },
  anchorsBox: { backgroundColor: 'rgba(255, 165, 0, 0.3)', padding: 8, borderRadius: 8, marginTop: 10 },
  anchorsTitle: { color: '#FFA500', fontWeight: 'bold', fontSize: 12 },
  anchorsText: { color: '#FFF', fontSize: 14, marginTop: 2 },
  toolRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
  toolBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  threatBtn: { backgroundColor: '#FF0000' },
  verifyBtn: { backgroundColor: '#FFA500' },
  infoBtn: { backgroundColor: '#0080FF' },
  toolBtnText: { fontSize: 20 },
  buttonRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
  button: { flex: 1, padding: 15, borderRadius: 30, borderWidth: 2, borderColor: '#FFF', alignItems: 'center' },
  ghostActive: { backgroundColor: '#00FF00' },
  ghostInactive: { backgroundColor: '#FF0000' },
  nodeBtn: { backgroundColor: '#00FF00' },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  magicButton: { backgroundColor: '#FF00FF', padding: 18, borderRadius: 30, marginTop: 15, borderWidth: 3, borderColor: '#FFF' },
  magicButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  recordingButton: { backgroundColor: '#FF0000' },
  alertsBox: { position: 'absolute', top: 200, left: 20, right: 20, backgroundColor: 'rgba(255, 0, 0, 0.8)', padding: 10, borderRadius: 10 },
  alertText: { color: '#FFF', fontSize: 14 },
  footer: { position: 'absolute', bottom: 30, left: 20, right: 20, alignItems: 'center' },
  footerText: { color: '#FFFFFF', fontSize: 12, opacity: 0.7 },
});

export default FieldCommander;

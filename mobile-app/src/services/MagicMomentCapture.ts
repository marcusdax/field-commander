/**
 * MagicMomentCapture — 15-second multi-sensory evidence buffer
 * Auto-triggers on hotlist match; captures video, audio, and GPS track.
 */

import type { MagicMomentCapture } from '../types/ocr';
import type { PlateReading, GeoLocation } from '../types/nvin';

const BUFFER_SECONDS = 15;
const GPS_SAMPLE_RATE_MS = 1_000;

class MagicMomentCaptureService {
  private videoBuffer: Uint8Array[] = [];
  private gpsTrack: GeoLocation[] = [];
  private gpsTimer: ReturnType<typeof setInterval> | null = null;
  private isBuffering = false;

  /**
   * Start the rolling 15-second video/audio/GPS buffer.
   */
  startBuffer(): void {
    if (this.isBuffering) return;
    this.isBuffering = true;
    this.gpsTimer = setInterval(() => this.sampleGPS(), GPS_SAMPLE_RATE_MS);
    console.log('[MagicMoment] Rolling buffer started');
  }

  /**
   * Stop the rolling buffer.
   */
  stopBuffer(): void {
    this.isBuffering = false;
    if (this.gpsTimer) {
      clearInterval(this.gpsTimer);
      this.gpsTimer = null;
    }
    this.videoBuffer = [];
    this.gpsTrack = [];
  }

  /**
   * Freeze the buffer and package a MagicMoment evidence bundle.
   * Called automatically on NVIN hotlist match.
   */
  async capture(plateReading: PlateReading, includeAudio = true): Promise<MagicMomentCapture> {
    const captureId = `mm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Freeze last BUFFER_SECONDS of buffered frames
    const frozenGPS = [...this.gpsTrack.slice(-BUFFER_SECONDS)];
    const frozenVideo = [...this.videoBuffer.slice(-BUFFER_SECONDS * 30)]; // 30 fps

    // Compute evidence hash (production: SHA-256 of all payload bytes)
    const evidenceHash = await this.computeEvidenceHash(plateReading, frozenGPS, frozenVideo);

    const capture: MagicMomentCapture = {
      captureId,
      plateReading,
      videoBufferSeconds: BUFFER_SECONDS,
      audioIncluded: includeAudio,
      gpsTrack: frozenGPS,
      evidenceHash,
      capturedAt: Date.now(),
    };

    console.log(`[MagicMoment] Captured ${captureId} — evidence hash: ${evidenceHash}`);
    return capture;
  }

  /**
   * Push a video frame into the rolling buffer.
   */
  pushFrame(frameData: Uint8Array): void {
    if (!this.isBuffering) return;
    this.videoBuffer.push(frameData);
    // Keep only the last BUFFER_SECONDS * 30 frames
    const maxFrames = BUFFER_SECONDS * 30;
    if (this.videoBuffer.length > maxFrames) {
      this.videoBuffer.splice(0, this.videoBuffer.length - maxFrames);
    }
  }

  // ---------------------------------------------------------------------------
  private async sampleGPS(): Promise<void> {
    // Production: navigator.geolocation.getCurrentPosition
    this.gpsTrack.push({ lat: 0, lon: 0 }); // placeholder
    if (this.gpsTrack.length > BUFFER_SECONDS) {
      this.gpsTrack.shift();
    }
  }

  private async computeEvidenceHash(
    _plate: PlateReading,
    _gps: GeoLocation[],
    _video: Uint8Array[]
  ): Promise<string> {
    // Production: SubtleCrypto SHA-256 over concatenated serialized payload
    return `hash_${Date.now().toString(36)}`;
  }
}

export const magicMoment = new MagicMomentCaptureService();
export default MagicMomentCaptureService;

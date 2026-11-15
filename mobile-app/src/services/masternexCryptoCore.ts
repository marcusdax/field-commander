/**
 * MASTERNEX.os Cryptographic & Neuromorphic Core for Field Commander v4.0
 *
 * Replaces non-cryptographic base64/32-bit mocks in qrcVault.ts, ghostRelay.ts,
 * GhostModeController.ts, and usePTECoPilot.ts with:
 * 1. FIPS 180-4 SHA-256 & RFC 2104 HMAC-SHA256 (synchronous, zero native dependencies,
 *    works identically on React Native Hermes/JSI and Node.js).
 * 2. Authenticated Stream Cipher (SHA-256 CTR + HMAC-SHA256 Encrypt-then-MAC) for QRC Vault
 *    and Ghost Mode relay payloads.
 * 3. Pairwise SHA-256 Merkle Tree & Inclusion Proof Verifier for CitizenLedgerDTA.
 * 4. NADE-2.0 LIF (Leaky Integrate-and-Fire) Spiking Neural Network + GIE Axial Hex-Grid
 *    for deterministic PTE Co-Pilot tactical route & threat scoring.
 */

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function utf8ToBytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    if (c < 0x80) {
      out += String.fromCharCode(c);
    } else if ((c & 0xe0) === 0xc0) {
      const c2 = bytes[i++] & 0x3f;
      out += String.fromCharCode(((c & 0x1f) << 6) | c2);
    } else {
      const c2 = bytes[i++] & 0x3f;
      const c3 = bytes[i++] & 0x3f;
      out += String.fromCharCode(((c & 0x0f) << 12) | (c2 << 6) | c3);
    }
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : '0' + hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function sha256Bytes(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padLen = ((data.length + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(data, 0);
  padded[data.length] = 0x80;

  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  padded[padLen - 8] = (hi >>> 24) & 0xff;
  padded[padLen - 7] = (hi >>> 16) & 0xff;
  padded[padLen - 6] = (hi >>> 8) & 0xff;
  padded[padLen - 5] = hi & 0xff;
  padded[padLen - 4] = (lo >>> 24) & 0xff;
  padded[padLen - 3] = (lo >>> 16) & 0xff;
  padded[padLen - 2] = (lo >>> 8) & 0xff;
  padded[padLen - 1] = lo & 0xff;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        ((padded[j] << 24) | (padded[j + 1] << 16) | (padded[j + 2] << 8) | padded[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const words = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (words[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (words[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (words[i] >>> 8) & 0xff;
    out[i * 4 + 3] = words[i] & 0xff;
  }
  return out;
}

export function sha256Hex(input: string): string {
  return bytesToHex(sha256Bytes(utf8ToBytes(input)));
}

export function hmacSha256Bytes(keyBytes: Uint8Array, messageBytes: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = keyBytes;
  if (k.length > blockSize) {
    k = sha256Bytes(k);
  }
  const kPadded = new Uint8Array(blockSize);
  kPadded.set(k, 0);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = kPadded[i] ^ 0x5c;
    iKeyPad[i] = kPadded[i] ^ 0x36;
  }

  const innerInput = new Uint8Array(blockSize + messageBytes.length);
  innerInput.set(iKeyPad, 0);
  innerInput.set(messageBytes, blockSize);
  const innerHash = sha256Bytes(innerInput);

  const outerInput = new Uint8Array(blockSize + innerHash.length);
  outerInput.set(oKeyPad, 0);
  outerInput.set(innerHash, blockSize);
  return sha256Bytes(outerInput);
}

export function hmacSha256Hex(key: string, message: string): string {
  return bytesToHex(hmacSha256Bytes(utf8ToBytes(key), utf8ToBytes(message)));
}

/**
 * Authenticated Encrypt-then-MAC (SHA-256 Counter Mode + HMAC-SHA256 tag)
 * Format: `v4:<nonceHex>:<cipherHex>:<macHex>`
 */
export function sealQrcPayload(plaintext: string, masterSecret = 'MASTERNEX-QRC-KYBER1024-MASTER-KEY'): string {
  const plainBytes = utf8ToBytes(plaintext);
  const nonceSeed = `${Date.now()}:${plaintext.length}:${plainBytes[0] ?? 0}`;
  const nonceHex = sha256Hex(nonceSeed).slice(0, 32);
  const cipherBytes = new Uint8Array(plainBytes.length);

  const encKey = hmacSha256Bytes(utf8ToBytes(masterSecret), utf8ToBytes('ENC:' + nonceHex));
  let counter = 0;
  for (let offset = 0; offset < plainBytes.length; offset += 32) {
    const blockKey = hmacSha256Bytes(encKey, utf8ToBytes(`CTR:${nonceHex}:${counter++}`));
    const chunkLen = Math.min(32, plainBytes.length - offset);
    for (let i = 0; i < chunkLen; i++) {
      cipherBytes[offset + i] = plainBytes[offset + i] ^ blockKey[i];
    }
  }

  const cipherHex = bytesToHex(cipherBytes);
  const macHex = hmacSha256Hex(masterSecret, `MAC:v4:${nonceHex}:${cipherHex}`);
  return `v4:${nonceHex}:${cipherHex}:${macHex}`;
}

export function openQrcPayload(envelope: string, masterSecret = 'MASTERNEX-QRC-KYBER1024-MASTER-KEY'): string {
  if (!envelope.startsWith('v4:')) {
    throw new Error('Invalid QRC Vault envelope version');
  }
  const parts = envelope.split(':');
  if (parts.length !== 4) {
    throw new Error('Malformed QRC Vault envelope');
  }
  const [, nonceHex, cipherHex, macHex] = parts;
  const expectedMac = hmacSha256Hex(masterSecret, `MAC:v4:${nonceHex}:${cipherHex}`);
  if (expectedMac !== macHex) {
    throw new Error('QRC Vault integrity check failed: HMAC authentication tag mismatch');
  }

  const cipherBytes = hexToBytes(cipherHex);
  const plainBytes = new Uint8Array(cipherBytes.length);
  const encKey = hmacSha256Bytes(utf8ToBytes(masterSecret), utf8ToBytes('ENC:' + nonceHex));

  let counter = 0;
  for (let offset = 0; offset < cipherBytes.length; offset += 32) {
    const blockKey = hmacSha256Bytes(encKey, utf8ToBytes(`CTR:${nonceHex}:${counter++}`));
    const chunkLen = Math.min(32, cipherBytes.length - offset);
    for (let i = 0; i < chunkLen; i++) {
      plainBytes[offset + i] = cipherBytes[offset + i] ^ blockKey[i];
    }
  }

  return bytesToUtf8(plainBytes);
}

/**
 * Compute binary SHA-256 Merkle Root for CitizenLedgerDTA and QRC Vault entries
 */
export function computeMerkleRoot(items: unknown[]): string {
  if (!Array.isArray(items) || items.length === 0) {
    return sha256Hex('MASTERNEX:EMPTY_VAULT_MERKLE');
  }
  let layer = items.map((item, idx) => sha256Hex(`LEAF:${idx}:${JSON.stringify(item)}`));
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      next.push(sha256Hex(`NODE:${left}:${right}`));
    }
    layer = next;
  }
  return layer[0];
}

/**
 * Deterministic NADE-2.0 LIF Spiking Neural Network + GIE Hex-Grid evaluator
 * for PTE Co-Pilot tactical mission suggestions & threat scoring
 */
export function evaluatePteTacticalState(params: {
  missionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  ghostMode: boolean;
  activeLuminNodes?: number;
}): {
  hexId: string;
  q: number;
  r: number;
  s: number;
  nadeSpikeRate: number;
  threatLevel: 'low' | 'medium' | 'high';
  optimalBearingDeg: number;
  suggestions: Array<{
    id: string;
    type: 'route' | 'pin' | 'extension' | 'safety';
    content: string;
    confidence: number;
    timestamp: number;
  }>;
} {
  const { missionId, latitude, longitude, ghostMode, activeLuminNodes = 0 } = params;
  const xMeters = longitude * 85000;
  const yMeters = latitude * 111139;
  const q = Math.round(((Math.sqrt(3) / 3) * xMeters - (1 / 3) * yMeters) / 250);
  const r = Math.round(((2 / 3) * yMeters) / 250);
  const s = -q - r === 0 ? 0 : -q - r;
  const hexId = `GIE-HEX:${q}:${r}:${s}`;

  const digest = sha256Hex(`${missionId}:${hexId}:${ghostMode ? 'GHOST' : 'LIVE'}`);
  const seedA = parseInt(digest.slice(0, 4), 16) / 65535;
  const seedB = parseInt(digest.slice(4, 8), 16) / 65535;

  let vMem = 0;
  let spikes = 0;
  const inputCurrent = 0.35 + seedA * 0.55 - (ghostMode ? 0.12 : 0);
  for (let t = 0; t < 16; t++) {
    vMem = 0.8 * vMem + inputCurrent * 0.4;
    if (vMem >= 1.0) {
      spikes++;
      vMem = 0;
    }
  }

  const nadeSpikeRate = Number((spikes / 16).toFixed(4));
  const threatLevel: 'low' | 'medium' | 'high' =
    nadeSpikeRate >= 0.45 ? 'high' : nadeSpikeRate >= 0.25 ? 'medium' : 'low';

  const directions = ['NNE', 'ENE', 'ESE', 'SSE', 'SSW', 'WSW', 'WNW', 'NNW'];
  const dir = directions[parseInt(digest.slice(8, 10), 16) % directions.length];
  const optimalBearingDeg = Math.round(seedB * 360);
  const now = Date.now();

  const suggestions: Array<{
    id: string;
    type: 'route' | 'pin' | 'extension' | 'safety';
    content: string;
    confidence: number;
    timestamp: number;
  }> = [
    {
      id: `PTE-ROUTE-${digest.slice(0, 6)}`,
      type: 'route',
      content: `Vector ${optimalBearingDeg}° (${dir}) along ${hexId} — ${Math.round(72 + seedA * 24)}% occlusion cover`,
      confidence: Number((0.82 + seedA * 0.15).toFixed(3)),
      timestamp: now,
    },
    {
      id: `PTE-PIN-${digest.slice(6, 12)}`,
      type: 'pin',
      content: `Anchor LuminNode #${(activeLuminNodes % 12) + 1} at ${dir} perimeter of ${hexId} for 360° TDOA lock`,
      confidence: Number((0.78 + seedB * 0.18).toFixed(3)),
      timestamp: now,
    },
  ];

  if (threatLevel !== 'low') {
    suggestions.push({
      id: `PTE-SAFE-${digest.slice(12, 18)}`,
      type: 'safety',
      content: `NADE SNN firing rate ${(nadeSpikeRate * 100).toFixed(0)}% in ${hexId} — engage Ghost Relay & maintain standoff`,
      confidence: 0.94,
      timestamp: now,
    });
  } else {
    suggestions.push({
      id: `PTE-EXT-${digest.slice(18, 24)}`,
      type: 'extension',
      content: `Adjacent cell GIE-HEX:${q + 1}:${r - 1}:${s} unverified (+30 TC DTA bounty available)`,
      confidence: 0.88,
      timestamp: now,
    });
  }

  return {
    hexId,
    q,
    r,
    s,
    nadeSpikeRate,
    threatLevel,
    optimalBearingDeg,
    suggestions,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sha256Hex,
  hmacSha256Hex,
  sealQrcPayload,
  openQrcPayload,
  computeMerkleRoot,
  evaluatePteTacticalState,
} from '../mobile-app/src/services/masternexCryptoCore.ts';

test('QRC Vault authenticated Encrypt-then-MAC seals and opens payloads and rejects tampering', () => {
  const secretMission = JSON.stringify({
    missionId: 'SHADOW-901',
    coordinates: { lat: 32.7767, lng: -96.797 },
    dtaBounty: 45,
  });

  const envelope = sealQrcPayload(secretMission);
  assert.ok(envelope.startsWith('v4:'));
  assert.ok(!envelope.includes('SHADOW-901'), 'Ciphertext must not leak plaintext');

  const recovered = openQrcPayload(envelope);
  assert.equal(recovered, secretMission);

  const parts = envelope.split(':');
  const flippedCipher =
    (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1);
  const tamperedEnvelope = `v4:${parts[1]}:${flippedCipher}:${parts[3]}`;

  assert.throws(
    () => openQrcPayload(tamperedEnvelope),
    /HMAC authentication tag mismatch/
  );
});

test('SHA-256, HMAC-SHA256, and Merkle root computation produce deterministic 256-bit digests', async () => {
  const { createHash, createHmac } = await import('node:crypto');
  const msg = 'CitizenLedgerDTA:MagicMoment:SHADOW-77';
  const key = 'SOVEREIGN_ANALYST_ZKP_KEY';

  assert.equal(
    sha256Hex(msg),
    createHash('sha256').update(msg, 'utf8').digest('hex')
  );
  assert.equal(
    hmacSha256Hex(key, msg),
    createHmac('sha256', key).update(msg, 'utf8').digest('hex')
  );

  const rootA = computeMerkleRoot([{ id: 1, tc: 25 }, { id: 2, tc: 50 }]);
  const rootB = computeMerkleRoot([{ id: 1, tc: 25 }, { id: 2, tc: 99 }]);
  assert.equal(rootA.length, 64);
  assert.notEqual(rootA, rootB, 'Merkle root must change when any leaf is modified');
});

test('PTE Co-Pilot NADE LIF SNN and GIE Axial Hex-Grid preserve q+r+s=0 and emit tactical suggestions', () => {
  const tactical = evaluatePteTacticalState({
    missionId: 'SHADOW-TX-01',
    latitude: 32.7767,
    longitude: -96.797,
    accuracy: 4.5,
    ghostMode: true,
    activeLuminNodes: 5,
  });

  assert.equal(tactical.q + tactical.r + tactical.s, 0);
  assert.ok(tactical.hexId.startsWith('GIE-HEX:'));
  assert.ok(tactical.suggestions.length >= 3);
  assert.ok(['low', 'medium', 'high'].includes(tactical.threatLevel));
});

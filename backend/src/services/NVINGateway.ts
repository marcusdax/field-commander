/**
 * NVINGateway — NVIN plate analysis orchestrator
 * Real Polygon evidence anchoring via ethers.js v6 + EvidenceLedger.sol.
 * Set CHAIN_MOCK=true to bypass on-chain calls in local dev.
 */

import { ethers } from 'ethers';
import type { NVINAnalysisRequest, NVINAnalysisResponse, KDAFusionOutput, AlertLevel } from '../../mobile-app/src/types/nvin';
import { OdasiEngine } from './OdasiEngine';

// Inline ABI — avoids compile-time dependency on hardhat artifacts
const EVIDENCE_LEDGER_ABI = [
  'function anchor(bytes32 plateHash, bytes32 evidenceHash, address agent) external',
  'event EvidenceAnchored(bytes32 indexed plateHash, bytes32 evidenceHash, uint256 timestamp, address indexed agent)',
];

export class NVINGateway {
  private odasi = new OdasiEngine();

  async analyze(request: NVINAnalysisRequest): Promise<NVINAnalysisResponse> {
    const [nade, gie, bne] = await Promise.all([
      this.odasi.runNADE(request),
      this.odasi.runGIE(request),
      this.odasi.runBNE(request),
    ]);

    // Override GIE geospatialRisk with real Redis georadius if available
    const geoRisk = await this.odasi.getGeoRisk(request.geolocation.lat, request.geolocation.lon);
    gie.geospatialRisk = geoRisk;

    const kda: KDAFusionOutput = this.odasi.fuseKDA({ nade, gie, bne });
    const hotlistMatch = await this.odasi.checkHotlist(request.plateText);
    const alertLevel = this.deriveAlertLevel(kda.unifiedScore, hotlistMatch);
    const chainHash = await this.anchorToChain(request, kda);

    return {
      hotlistMatch,
      anomalyScore: nade.anomalyScore,
      recoveryLikelihood: bne.recoveryLikelihood,
      routeRisk: gie.geospatialRisk,
      recommendedAction: kda.recommendedAction,
      chainHash,
      alertLevel,
    };
  }

  private deriveAlertLevel(score: number, hotlist: boolean): AlertLevel {
    if (hotlist || score >= 0.9) return 'RED';
    if (score >= 0.7) return 'ORANGE';
    if (score >= 0.5) return 'YELLOW';
    return 'GREEN';
  }

  private async anchorToChain(request: NVINAnalysisRequest, kda: KDAFusionOutput): Promise<string> {
    const contractAddress = process.env['EVIDENCE_LEDGER_ADDRESS'];
    const rpcUrl = process.env['POLYGON_RPC_URL'];
    const signerKey = process.env['BACKEND_SIGNER_KEY'];

    if (!contractAddress || !rpcUrl || !signerKey || process.env['CHAIN_MOCK'] === 'true') {
      // Dev fallback: deterministic keccak hash, no on-chain tx
      return ethers.keccak256(
        ethers.toUtf8Bytes(`${request.plateText}:${kda.unifiedScore.toFixed(6)}:${request.timestamp}`)
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerKey, provider);
    const contract = new ethers.Contract(contractAddress, EVIDENCE_LEDGER_ABI, signer);

    const plateHashBytes = ethers.keccak256(ethers.toUtf8Bytes(request.plateText.toUpperCase()));
    const evidenceHashBytes = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify({ plate: request.plateText, kda: kda.unifiedScore, ts: request.timestamp }))
    );
    const agentAddr = request.agentId ?? ethers.ZeroAddress;

    const tx = await (contract['anchor'] as (...args: unknown[]) => Promise<{ hash: string; wait: (n: number) => Promise<unknown> }>)(
      plateHashBytes, evidenceHashBytes, agentAddr, { gasLimit: 100_000 }
    );
    await tx.wait(1);
    return tx.hash;
  }
}

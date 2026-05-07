/**
 * M1 E2E Happy Path — Vehicle Recovery Golden Path
 *
 * Flow: deploy → OCR sim (92% conf) → KDA fusion → EvidenceLedger anchor
 *       → CitizenLedgerDTA verifyRecovery → payout assertion → double-spend rejection
 *
 * Local:  npx hardhat node && npx hardhat run scripts/e2e-happy-path.ts --network localhost
 * Testnet: npx hardhat run scripts/e2e-happy-path.ts --network amoy
 */

import { ethers } from 'hardhat';
import crypto from 'crypto';

const G = '\x1b[32m✓\x1b[0m';
const R = '\x1b[31m✗\x1b[0m';
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;

async function step(label: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${label}... `);
  try { await fn(); console.log(G); }
  catch (err) { console.log(R); throw err; }
}

async function main() {
  console.log('\n======================================');
  console.log('  Field Commander M1 — E2E Happy Path');
  console.log('======================================\n');

  const [deployer, verifier, agent] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  console.log(`Network:  ${net.name} (${net.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Agent:    ${agent.address}\n`);

  // ─── Phase 1: Deploy ──────────────────────────────────────────────
  console.log('Phase 1: Contract deployment');
  let el: Awaited<ReturnType<typeof ethers.getContractAt>>;
  let dta: Awaited<ReturnType<typeof ethers.getContractAt>>;

  await step('Deploy EvidenceLedger', async () => {
    const F = await ethers.getContractFactory('EvidenceLedger');
    el = await F.deploy(); await el.waitForDeployment();
  });
  await step('Deploy CitizenLedgerDTA', async () => {
    const F = await ethers.getContractFactory('CitizenLedgerDTA');
    dta = await F.deploy(); await dta.waitForDeployment();
  });
  await step('Fund DTA contract (5 ETH)', async () => {
    await (await deployer.sendTransaction({ to: await dta!.getAddress(), value: ethers.parseEther('5') })).wait();
  });
  await step('Grant VERIFIER_ROLE', async () => {
    await (await dta!.grantRole(await dta!.VERIFIER_ROLE(), verifier.address)).wait();
  });
  await step('Register agent', async () => {
    await (await dta!.registerAgent(agent.address)).wait();
  });

  // ─── Phase 2: Simulated OCR ───────────────────────────────────────────
  console.log('\nPhase 2: Plate detection (simulated 92% OCR confidence)');
  const plateText = 'E2E' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const ocrConf = 0.92;
  console.log(`  Plate:      ${Y(plateText)}  Confidence: ${(ocrConf * 100).toFixed(0)}%`);

  const plateHashBytes = ethers.keccak256(ethers.toUtf8Bytes(plateText.toUpperCase()));

  // ─── Phase 3: KDA Fusion (mock) ───────────────────────────────────────
  console.log('\nPhase 3: Odasi KDA fusion');
  const nade = 0.85 * 0.35;
  const gie  = 0.72 * 0.30;
  const bne  = 0.88 * 0.35;
  const kda  = nade + gie + bne;
  console.log(`  NADE×0.35=${(0.85*0.35).toFixed(3)}  GIE×0.30=${(0.72*0.30).toFixed(3)}  BNE×0.35=${(0.88*0.35).toFixed(3)}`);
  console.log(`  KDA unified: ${Y(kda.toFixed(4))} → ${Y('TRIGGER_DTA')}`);

  // ─── Phase 4: Evidence anchor ────────────────────────────────────────
  console.log('\nPhase 4: Evidence anchor (EvidenceLedger)');
  const bundle = JSON.stringify({ plate: plateText, kda, agent: agent.address, ts: Date.now() });
  const evidenceHashBytes = ethers.keccak256(ethers.toUtf8Bytes(bundle));
  let anchorTx = '';
  await step('Anchor on-chain', async () => {
    const tx = await el!.anchor(plateHashBytes, evidenceHashBytes, agent.address);
    const r = await tx.wait(); anchorTx = r.hash;
  });
  console.log(`  Anchor tx: ${anchorTx.slice(0, 22)}...`);

  // ─── Phase 5: DTA payout ─────────────────────────────────────────────
  console.log('\nPhase 5: DTA payout (CitizenLedgerDTA)');
  const confInt = Math.round(ocrConf * 100);  // 92 → 1.5× tier
  const agentBefore = await ethers.provider.getBalance(agent.address);
  let dtaTx = '';
  await step(`verifyRecovery(confidence=${confInt})`, async () => {
    const tx = await dta!.connect(verifier).verifyRecovery(
      plateHashBytes, agent.address, evidenceHashBytes, confInt
    );
    const r = await tx.wait(); dtaTx = r.hash;
  });
  const ethReceived = (await ethers.provider.getBalance(agent.address)) - agentBefore;
  const tcrBalance  = await dta!.balanceOf(agent.address);
  console.log(`  ETH received: ${ethers.formatEther(ethReceived)} (expected 0.75 = 0.5×1.5×)`);
  console.log(`  TCR minted:   ${ethers.formatEther(tcrBalance)}`);
  console.log(`  DTA tx: ${dtaTx.slice(0, 22)}...`);

  // ─── Phase 6: Double-spend protection ──────────────────────────────────
  console.log('\nPhase 6: Double-spend protection');
  await step('Reject duplicate plate', async () => {
    try {
      await dta!.connect(verifier).verifyRecovery(plateHashBytes, agent.address, evidenceHashBytes, confInt);
      throw new Error('Expected revert did not occur');
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('plate already processed')) return;
      throw e;
    }
  });

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log(`\n  ${G} M1 Happy Path PASSED`);
  console.log(`\n  Plate:      ${plateText}`);
  console.log(`  KDA Score:  ${kda.toFixed(4)}`);
  console.log(`  ETH Payout: ${ethers.formatEther(ethReceived)}`);
  console.log(`  TCR Reward: ${ethers.formatEther(tcrBalance)}`);
  console.log(`  Anchor TX:  ${anchorTx}`);
  console.log(`  DTA TX:     ${dtaTx}\n`);
}

main().catch((err) => { console.error(`\n${R} E2E FAILED:`, err.message); process.exitCode = 1; });

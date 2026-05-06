/**
 * Field Commander contract deployment
 * Run: npx hardhat run scripts/deploy.ts --network amoy
 *      npx hardhat run scripts/deploy.ts --network polygon
 */

import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log('\n====================================');
  console.log('  Field Commander — Contract Deploy');
  console.log('====================================');
  console.log(`Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} MATIC\n`);

  // 1. EvidenceLedger — cheap event-only anchor
  console.log('1/2  Deploying EvidenceLedger...');
  const EL = await ethers.getContractFactory('EvidenceLedger');
  const el = await EL.deploy();
  await el.waitForDeployment();
  const elAddr = await el.getAddress();
  console.log(`     ✓ EvidenceLedger:    ${elAddr}`);

  // 2. CitizenLedgerDTA — ERC-20 + payout engine
  console.log('2/2  Deploying CitizenLedgerDTA...');
  const DTA = await ethers.getContractFactory('CitizenLedgerDTA');
  const dta = await DTA.deploy();
  await dta.waitForDeployment();
  const dtaAddr = await dta.getAddress();
  console.log(`     ✓ CitizenLedgerDTA:  ${dtaAddr}`);

  // Grant VERIFIER_ROLE
  const verifier = process.env['VERIFIER_ADDRESS'];
  if (verifier) {
    const role = await dta.VERIFIER_ROLE();
    await (await dta.grantRole(role, verifier)).wait();
    console.log(`     ✓ VERIFIER_ROLE → ${verifier}`);
  }

  // Fund DTA contract
  const fundEth = process.env['INITIAL_FUND_ETH'] ?? '10';
  await (await deployer.sendTransaction({ to: dtaAddr, value: ethers.parseEther(fundEth) })).wait();
  console.log(`     ✓ DTA funded with ${fundEth} MATIC`);

  // Write deployment manifest
  const manifest = {
    network: network.name,
    chainId: Number(network.chainId),
    evidenceLedger:   elAddr,
    citizenLedgerDTA: dtaAddr,
    deployedAt:       new Date().toISOString(),
    deployer:         deployer.address,
  };
  const outDir = path.join(__dirname, '../deployments');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${network.name}.json`), JSON.stringify(manifest, null, 2));

  console.log('\n====================================');
  console.log('  Deployment complete!');
  console.log('====================================');
  console.log('\nAdd to backend .env:');
  console.log(`  EVIDENCE_LEDGER_ADDRESS=${elAddr}`);
  console.log(`  DTA_CONTRACT_ADDRESS=${dtaAddr}\n`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });

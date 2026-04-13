/**
 * CitizenLedgerDTA unit tests
 * Run: npx hardhat test
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { CitizenLedgerDTA } from '../typechain-types';

describe('CitizenLedgerDTA', () => {
  let dta: CitizenLedgerDTA;
  let owner: Awaited<ReturnType<typeof ethers.getSigner>>;
  let verifier: Awaited<ReturnType<typeof ethers.getSigner>>;
  let agent: Awaited<ReturnType<typeof ethers.getSigner>>;

  const PLATE_HASH = ethers.keccak256(ethers.toUtf8Bytes('ABC1234'));
  const EVIDENCE_HASH = ethers.keccak256(ethers.toUtf8Bytes('evidence_bundle_001'));

  beforeEach(async () => {
    [owner, verifier, agent] = await ethers.getSigners();
    const DTA = await ethers.getContractFactory('CitizenLedgerDTA');
    dta = await DTA.deploy() as CitizenLedgerDTA;

    // Fund contract
    await owner.sendTransaction({ to: await dta.getAddress(), value: ethers.parseEther('5') });

    // Grant roles
    const VERIFIER_ROLE = await dta.VERIFIER_ROLE();
    const AGENT_ROLE = await dta.AGENT_ROLE();
    await dta.grantRole(VERIFIER_ROLE, verifier.address);
    await dta.registerAgent(agent.address);
  });

  it('calculates payout tiers correctly', async () => {
    const base = await dta.basePayout();
    expect(await dta.calculatePayout(85)).to.equal(base);
    expect(await dta.calculatePayout(90)).to.equal(base * 15n / 10n);
    expect(await dta.calculatePayout(95)).to.equal(base * 2n);
  });

  it('rejects confidence below threshold', async () => {
    await expect(
      dta.connect(verifier).verifyRecovery(PLATE_HASH, agent.address, EVIDENCE_HASH, 84)
    ).to.be.revertedWith('DTA: confidence below threshold');
  });

  it('executes payout and mints TCR on valid recovery', async () => {
    const agentBalanceBefore = await ethers.provider.getBalance(agent.address);

    await dta.connect(verifier).verifyRecovery(PLATE_HASH, agent.address, EVIDENCE_HASH, 90);

    const agentBalanceAfter = await ethers.provider.getBalance(agent.address);
    expect(agentBalanceAfter).to.be.gt(agentBalanceBefore);

    const tcrBalance = await dta.balanceOf(agent.address);
    expect(tcrBalance).to.be.gt(0n);
  });

  it('prevents double-processing the same plate', async () => {
    await dta.connect(verifier).verifyRecovery(PLATE_HASH, agent.address, EVIDENCE_HASH, 90);
    await expect(
      dta.connect(verifier).verifyRecovery(PLATE_HASH, agent.address, EVIDENCE_HASH, 90)
    ).to.be.revertedWith('DTA: plate already processed');
  });
});

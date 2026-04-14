/**
 * Hardhat deployment script for CitizenLedgerDTA
 * Run: npx hardhat run scripts/deploy.ts --network polygon
 */

import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying CitizenLedgerDTA with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'MATIC');

  const DTA = await ethers.getContractFactory('CitizenLedgerDTA');
  const dta = await DTA.deploy();
  await dta.waitForDeployment();

  const address = await dta.getAddress();
  console.log('CitizenLedgerDTA deployed to:', address);

  // Grant VERIFIER_ROLE to the backend service wallet
  const verifierAddress = process.env.VERIFIER_ADDRESS;
  if (verifierAddress) {
    const VERIFIER_ROLE = await dta.VERIFIER_ROLE();
    await dta.grantRole(VERIFIER_ROLE, verifierAddress);
    console.log('VERIFIER_ROLE granted to:', verifierAddress);
  }

  // Fund the contract with initial ETH for payouts
  const fundAmount = ethers.parseEther('10');
  await deployer.sendTransaction({ to: address, value: fundAmount });
  console.log('Contract funded with', ethers.formatEther(fundAmount), 'MATIC');

  console.log('\nDeployment complete. Update .env:');
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

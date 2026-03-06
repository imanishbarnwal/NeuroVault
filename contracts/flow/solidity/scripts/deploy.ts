import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "FLOW");

  const Registry = await ethers.getContractFactory("NeuroVaultRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("NeuroVaultRegistry deployed to:", address);
  console.log("");
  console.log("Add to your .env:");
  console.log(`NEXT_PUBLIC_FLOW_REGISTRY_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

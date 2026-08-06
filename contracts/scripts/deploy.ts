import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const cvaAddress = process.env.ATOKEN_ADDRESS;
  if (!cvaAddress) {
    throw new Error("Set ATOKEN_ADDRESS (Monad aUSDC from Cleanverse query_deposit_atoken_list)");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const VaultFactory = await hre.ethers.getContractFactory("PayrollVault");
  const vault = await VaultFactory.deploy(cvaAddress);
  await vault.waitForDeployment();
  console.log("PayrollVault:", await vault.getAddress());

  const RunFactory = await hre.ethers.getContractFactory("PayrollRun");
  const payrollRun = await RunFactory.deploy(await vault.getAddress());
  await payrollRun.waitForDeployment();
  console.log("PayrollRun:", await payrollRun.getAddress());

  const KeeperFactory = await hre.ethers.getContractFactory("RecordKeeper");
  const recordKeeper = await KeeperFactory.deploy(await payrollRun.getAddress());
  await recordKeeper.waitForDeployment();
  console.log("RecordKeeper:", await recordKeeper.getAddress());

  await payrollRun.setRecordKeeper(await recordKeeper.getAddress());
  await vault.setPayrollRun(await payrollRun.getAddress());

  const addresses = {
    chainId: 10143,
    chain: "monad",
    cva: cvaAddress,
    vault: await vault.getAddress(),
    payrollRun: await payrollRun.getAddress(),
    recordKeeper: await recordKeeper.getAddress(),
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "..", "deployments", "monad-testnet.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("Saved deployment to", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

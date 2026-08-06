import { expect } from "chai";
import hre from "hardhat";
import { PayrollRun, PayrollVault, RecordKeeper, MockCVA } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Payroll contracts", () => {
  let deployer: HardhatEthersSigner;
  let employer: HardhatEthersSigner;
  let payee1: HardhatEthersSigner;
  let payee2: HardhatEthersSigner;
  let blockedPayee: HardhatEthersSigner;

  let cva: MockCVA;
  let vault: PayrollVault;
  let payrollRun: PayrollRun;
  let recordKeeper: RecordKeeper;

  async function deployStack() {
    [deployer, employer, payee1, payee2, blockedPayee] = await hre.ethers.getSigners();

    const MockCVAFactory = await hre.ethers.getContractFactory("MockCVA");
    cva = await MockCVAFactory.deploy();
    await cva.waitForDeployment();

    const VaultFactory = await hre.ethers.getContractFactory("PayrollVault");
    vault = await VaultFactory.deploy(await cva.getAddress());
    await vault.waitForDeployment();

    const RunFactory = await hre.ethers.getContractFactory("PayrollRun");
    payrollRun = await RunFactory.deploy(await vault.getAddress());
    await payrollRun.waitForDeployment();

    const KeeperFactory = await hre.ethers.getContractFactory("RecordKeeper");
    recordKeeper = await KeeperFactory.deploy(await payrollRun.getAddress());
    await recordKeeper.waitForDeployment();

    await payrollRun.setRecordKeeper(await recordKeeper.getAddress());
    await vault.setPayrollRun(await payrollRun.getAddress());

    const depositAmount = hre.ethers.parseEther("1000");
    await cva.mint(employer.address, depositAmount);
    await cva.connect(employer).approve(await vault.getAddress(), depositAmount);
    await vault.connect(employer).deposit(depositAmount);
  }

  beforeEach(async () => {
    await deployStack();
  });

  it("happy path: deposits and pays eligible payees", async () => {
    const amount = hre.ethers.parseEther("100");

    await expect(
      payrollRun.connect(employer).runPayroll([
        { wallet: payee1.address, amount },
        { wallet: payee2.address, amount },
      ])
    ).to.emit(payrollRun, "PayrollRunExecuted");

    expect(await cva.balanceOf(payee1.address)).to.equal(amount);
    expect(await cva.balanceOf(payee2.address)).to.equal(amount);

    const records = await recordKeeper.getPaymentsForRun(1);
    expect(records.length).to.equal(2);
  });

  it("rejected payee: skips blocked address without reverting batch", async () => {
    const amount = hre.ethers.parseEther("50");
    await cva.setBlocked(blockedPayee.address, true);

    const tx = await payrollRun.connect(employer).runPayroll([
      { wallet: payee1.address, amount },
      { wallet: blockedPayee.address, amount },
    ]);
    const receipt = await tx.wait();

    expect(await cva.balanceOf(payee1.address)).to.equal(amount);
    expect(await cva.balanceOf(blockedPayee.address)).to.equal(0n);

    const failed = receipt!.logs
      .map((log) => {
        try {
          return payrollRun.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((e) => e?.name === "PaymentFailed");
    expect(failed.length).to.equal(1);

    const records = await recordKeeper.getPaymentsForRun(1);
    expect(records.length).to.equal(1);
  });
});

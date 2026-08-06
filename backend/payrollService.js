/**
 * payrollService.js — CVI verify → on-chain run → CCP report builder.
 */

const { ethers } = require("ethers");
const { verifyPayee, queryApass, downloadTravelRule } = require("./cleanverseClient");

const PAYROLL_RUN_ABI = [
  "function runPayroll((address wallet, uint256 amount)[] payees) returns (uint256 runId)",
  "event PaymentRecorded(address indexed employer, address indexed payee, uint256 amount, uint256 indexed runId, uint256 timestamp)",
  "event PayrollRunExecuted(address indexed employer, uint256 runId, uint256 totalPaid, uint256 successCount, uint256 failCount)",
  "event PaymentFailed(address indexed employer, address indexed payee, uint256 amount, string reason)",
];

const RECORD_KEEPER_ABI = [
  "event PaymentRecorded(address indexed employer, address indexed payee, uint256 amount, uint256 indexed runId, uint256 timestamp)",
];

const CVI_OK = 4;

class PayrollService {
  constructor({ orgId, chain, atokenAddress, provider, employerSigner, payrollRunAddress, recordKeeperAddress }) {
    this.orgId = orgId;
    this.chain = chain;
    this.atokenAddress = atokenAddress;
    this.provider = provider;
    this.employerSigner = employerSigner;
    this.payrollRun = new ethers.Contract(payrollRunAddress, PAYROLL_RUN_ABI, employerSigner);
    this.recordKeeper = new ethers.Contract(recordKeeperAddress, RECORD_KEEPER_ABI, provider);

    this.payees = new Map();
    this.runs = [];
  }

  async verifyOrg() {
    const profile = await queryApass(this.chain, this.employerSigner.address);
    return { address: this.employerSigner.address, profile };
  }

  async addPayee(walletAddress, amountWei) {
    const result = await verifyPayee(this.chain, this.atokenAddress, walletAddress);
    const eligible = result.code === CVI_OK;

    const payee = {
      walletAddress,
      amount: amountWei,
      cviStatus: result.code,
      cviMessage: result.message,
      eligible,
      magickLink: result.magickLink || null,
    };

    this.payees.set(walletAddress.toLowerCase(), payee);
    return payee;
  }

  listPayees() {
    return Array.from(this.payees.values());
  }

  removePayee(walletAddress) {
    this.payees.delete(walletAddress.toLowerCase());
  }

  async getPayeeProfile(walletAddress) {
    return queryApass(this.chain, walletAddress);
  }

  async runPayroll() {
    const batch = [];
    const skipped = [];

    for (const info of this.payees.values()) {
      if (info.eligible) {
        batch.push({ wallet: info.walletAddress, amount: info.amount });
      } else {
        skipped.push({ wallet: info.walletAddress, reason: info.cviMessage });
      }
    }

    if (batch.length === 0) {
      throw new Error("No CVI-eligible payees to run payroll for.");
    }

    const tx = await this.payrollRun.runPayroll(batch);
    const receipt = await tx.wait();

    const payments = [];
    let runId = null;
    let executed = null;

    for (const log of receipt.logs) {
      let parsed;
      try {
        parsed = this.payrollRun.interface.parseLog(log);
      } catch {
        try {
          parsed = this.recordKeeper.interface.parseLog(log);
        } catch {
          continue;
        }
      }

      if (parsed.name === "PaymentRecorded") {
        runId = parsed.args.runId.toString();
        payments.push({
          employer: parsed.args.employer,
          payee: parsed.args.payee,
          amount: parsed.args.amount.toString(),
          timestamp: Number(parsed.args.timestamp),
          txHash: receipt.hash,
        });
      }

      if (parsed.name === "PayrollRunExecuted") {
        executed = {
          totalPaid: parsed.args.totalPaid.toString(),
          successCount: Number(parsed.args.successCount),
          failCount: Number(parsed.args.failCount),
        };
      }
    }

    const run = {
      runId,
      orgId: this.orgId,
      txHash: receipt.hash,
      payments,
      skipped,
      executed,
      reportStatus: "pending",
      reports: [],
      createdAt: new Date().toISOString(),
    };

    this.runs.unshift(run);
    return run;
  }

  async buildReports(runId) {
    const run = this.runs.find((r) => r.runId === runId);
    if (!run) throw new Error(`Unknown runId: ${runId}`);

    run.reportStatus = "generating";

    const reports = [];
    for (const payment of run.payments) {
      try {
        const report = await downloadTravelRule(payment.txHash, this.chain, payment.employer);
        reports.push({
          payee: payment.payee,
          amount: payment.amount,
          downloadUrl: report.downloadUrl,
          fileName: report.fileName,
        });
      } catch (err) {
        reports.push({
          payee: payment.payee,
          amount: payment.amount,
          error: err.message,
        });
      }
    }

    run.reports = reports;
    run.reportStatus = reports.some((r) => r.error) ? "partial" : "ready";
    return run;
  }

  listRuns() {
    return this.runs.map(({ reports, ...rest }) => ({
      ...rest,
      reportCount: reports.length,
      reportStatus: rest.reportStatus,
    }));
  }

  getRun(runId) {
    return this.runs.find((r) => r.runId === runId);
  }

  async getPayeeHistory(payeeAddress) {
    const normalized = payeeAddress.toLowerCase();
    const history = [];

    for (const run of this.runs) {
      for (const p of run.payments) {
        if (p.payee.toLowerCase() === normalized) {
          history.push({ ...p, runId: run.runId });
        }
      }
    }

    let profile = null;
    try {
      profile = await this.getPayeeProfile(payeeAddress);
    } catch {
      /* payee may not have A-Pass yet */
    }

    return { payeeAddress, profile, history };
  }
}

module.exports = { PayrollService, CVI_OK };

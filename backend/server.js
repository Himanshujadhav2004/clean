require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const { PayrollService } = require("./payrollService");
const { queryAtokenList } = require("./cleanverseClient");

const app = express();
app.use(cors());
app.use(express.json());

const ORG_ID = process.env.ORG_ID || "demo-org";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const employerSigner = process.env.EMPLOYER_PRIVATE_KEY
  ? new ethers.Wallet(process.env.EMPLOYER_PRIVATE_KEY, provider)
  : null;

let payroll = null;

function requirePayroll() {
  if (!payroll) {
    throw new Error(
      "Payroll service not configured. Set EMPLOYER_PRIVATE_KEY, PAYROLL_RUN_ADDRESS, RECORD_KEEPER_ADDRESS, ATOKEN_ADDRESS."
    );
  }
  return payroll;
}

if (employerSigner && process.env.PAYROLL_RUN_ADDRESS && process.env.RECORD_KEEPER_ADDRESS && process.env.ATOKEN_ADDRESS) {
  payroll = new PayrollService({
    orgId: ORG_ID,
    chain: process.env.CHAIN || "monad",
    atokenAddress: process.env.ATOKEN_ADDRESS,
    provider,
    employerSigner,
    payrollRunAddress: process.env.PAYROLL_RUN_ADDRESS,
    recordKeeperAddress: process.env.RECORD_KEEPER_ADDRESS,
  });
}

app.get("/health", async (_req, res) => {
  let blockNumber = null;
  try {
    blockNumber = await provider.getBlockNumber();
  } catch {
    /* rpc unavailable */
  }
  res.json({
    ok: true,
    chain: process.env.CHAIN || "monad",
    chainId: 10143,
    rpcConnected: blockNumber !== null,
    blockNumber,
    payrollConfigured: !!payroll,
    employer: employerSigner?.address || null,
  });
});

app.get("/config/atoken", async (_req, res) => {
  try {
    const data = await queryAtokenList(process.env.CHAIN || "monad");
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/orgs/:id", async (req, res) => {
  try {
    const svc = requirePayroll();
    if (svc.orgId !== req.params.id) {
      return res.status(404).json({ error: "Org not found" });
    }
    const org = await svc.verifyOrg();
    res.json(org);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/orgs/:id/payees", async (req, res) => {
  try {
    const svc = requirePayroll();
    const { walletAddress, amountWei } = req.body;
    if (!walletAddress || !amountWei) {
      return res.status(400).json({ error: "walletAddress and amountWei required" });
    }
    const result = await svc.addPayee(walletAddress, amountWei);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/orgs/:id/payees", async (req, res) => {
  try {
    const svc = requirePayroll();
    res.json(svc.listPayees());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/orgs/:id/payees/:wallet", async (req, res) => {
  try {
    const svc = requirePayroll();
    svc.removePayee(req.params.wallet);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/payees/:wallet/profile", async (req, res) => {
  try {
    const svc = requirePayroll();
    const profile = await svc.getPayeeProfile(req.params.wallet);
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/payees/:wallet/history", async (req, res) => {
  try {
    const svc = requirePayroll();
    const history = await svc.getPayeeHistory(req.params.wallet);
    res.json(history);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/orgs/:id/payroll-runs", async (req, res) => {
  try {
    const svc = requirePayroll();
    const run = await svc.runPayroll();
    res.json(run);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/orgs/:id/payroll-runs", async (req, res) => {
  try {
    const svc = requirePayroll();
    res.json(svc.listRuns());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/reports/:runId", async (req, res) => {
  try {
    const svc = requirePayroll();
    let run = svc.getRun(req.params.runId);
    if (!run) return res.status(404).json({ error: "Run not found" });

    if (run.reportStatus === "pending" || run.reportStatus === "generating") {
      run = await svc.buildReports(req.params.runId);
    }

    res.json(run);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Payroll backend on :${PORT} (Monad testnet / Cleanverse sandbox)`);
});

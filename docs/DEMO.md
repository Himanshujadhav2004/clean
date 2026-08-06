# 30-second demo script

## Setup (before recording)

1. Deploy contracts to Monad testnet
2. Set `backend/.env` with contract addresses + employer key
3. Start backend (`npm start`) and frontend (`npm run dev`)
4. Employer wallet funded with MON (gas) + aUSDC deposited in vault

## Recording flow (~30s)

**[0–5s] Employer dashboard**

> "This is CleanRail — compliant cross-border payroll on Monad. I'll paste a payee wallet…"

- Paste verified payee address → **green CVI Verified** badge appears
- Set amount → Add Payee

**[5–10s] Rejected payee**

> "If someone doesn't have a valid A-Pass, we catch it before the run."

- Paste unregistered wallet → **red No A-Pass** badge

**[10–18s] Run payroll**

> "Run Payroll submits one batch transaction. Non-compliant payees are skipped, not reverted."

- Click **Run Payroll** → show tx hash / success count

**[18–28s] Reports**

> "After confirmation, we pull Travel Rule compliance reports from Cleanverse CCP."

- Open **Reports** tab → Get Reports → download links

**[28–30s] Payee view**

> "Payees can look up their verification status and payment history."

## Seed data suggestions

| Role | Notes |
|------|-------|
| Employer | Your deployer/funded wallet |
| Payee 1 | Sandbox wallet with active A-Pass (verify_apass code 4) |
| Payee 2 | Random 0x address (code 2 — no A-Pass) |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CVI always fails | Confirm `CHAIN=monad` and correct aUSDC address |
| Tx reverts | Check vault balance + MON for gas |
| Report pending | CCP may be slow — UI shows "generating…" |
| Backend not configured | Deploy contracts and fill `.env` addresses |

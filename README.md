# Cross-Border Payroll Rails

Compliant payroll on **Monad Testnet** using Cleanverse CVI (A-Pass) + CVA (aUSDC) + CCP (Travel Rule reports).

## Repo layout

```
contracts/   Solidity + Hardhat (PayrollVault, RecordKeeper, PayrollRun)
backend/     Node/Express (CVI client, chain listener, CCP reports)
frontend/    React dashboard (employer, payee, reports)
docs/        Architecture, demo script, API notes
```

## Monad Testnet

| Setting   | Value |
|-----------|-------|
| Chain ID  | 10143 |
| RPC       | https://testnet-rpc.monad.xyz/ |
| Explorer  | https://testnet.monadexplorer.com/ |
| Faucet    | https://faucet.monad.xyz |

## Cleanverse sandbox

| Setting | Value |
|---------|-------|
| API     | https://uatapi.cleanverse.com/api/cooperate |
| Chain   | `monad` |
| aUSDC   | `0xaC0893567D43C3E7e6e35a72803df05416C1f20D` |

Docs: https://docs.cleanverse.com (access code in your onboarding email)

## Quick start

### 1. Contracts

```bash
cd contracts
npm install
npm test
cp .env.example .env   # add DEPLOYER_PRIVATE_KEY
npm run deploy:monad
```

Deploy order (automated in `scripts/deploy.ts`):

1. PayrollVault(cva)
2. PayrollRun(vault)
3. RecordKeeper(payrollRun)
4. payrollRun.setRecordKeeper(...)
5. vault.setPayrollRun(...)

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill PAYROLL_RUN_ADDRESS, RECORD_KEEPER_ADDRESS, EMPLOYER_PRIVATE_KEY
npm start
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## End-to-end demo

1. Fund employer wallet from Monad faucet + deposit aUSDC into PayrollVault
2. **Employer tab** — paste payee address → CVI badge (green = code 4)
3. Add a second payee without A-Pass → red badge, skipped on run
4. **Run Payroll** → batch tx on Monad, skip-and-log for failures
5. **Reports tab** → async CCP Travel Rule PDF per payment

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | RPC + config status |
| POST | /orgs/:id/payees | Add + CVI verify payee |
| GET | /orgs/:id/payees | List payees |
| POST | /orgs/:id/payroll-runs | Execute on-chain run |
| GET | /orgs/:id/payroll-runs | List runs |
| GET | /reports/:runId | Download CCP reports |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DEMO.md](docs/DEMO.md).

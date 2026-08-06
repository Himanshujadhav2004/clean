import { useEffect, useState } from "react";
import { apiClient, formatAmount, type Payee } from "../api";
import { CviBadge } from "./CviBadge";

export function EmployerDashboard() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [wallet, setWallet] = useState("");
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setPayees(await apiClient.listPayees());
    } catch {
      setPayees([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const amountWei = (Number(amount) * 1e6).toFixed(0);
      const payee = await apiClient.addPayee(wallet.trim(), amountWei);
      setMessage(
        payee.eligible
          ? "Payee added — CVI verified and eligible for payroll."
          : `Payee added but ineligible: ${payee.cviMessage}`
      );
      setWallet("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add payee");
    } finally {
      setLoading(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      const run = await apiClient.runPayroll();
      setMessage(
        `Payroll run #${run.runId} submitted (${run.executed?.successCount ?? 0} paid, ${run.executed?.failCount ?? 0} failed). Tx: ${run.txHash.slice(0, 10)}…`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payroll run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Employer Dashboard</h2>
        <p>Add payees with live CVI verification, then execute a batch payroll run on Monad testnet.</p>
      </header>

      <form className="form-row" onSubmit={handleAdd}>
        <input
          placeholder="Payee wallet address (0x…)"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          required
        />
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount (aUSDC)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Checking CVI…" : "Add Payee"}
        </button>
      </form>

      {error && <p className="alert error">{error}</p>}
      {message && <p className="alert ok">{message}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payee</th>
              <th>Amount</th>
              <th>CVI</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payees.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No payees yet — add a wallet above.
                </td>
              </tr>
            ) : (
              payees.map((p) => (
                <tr key={p.walletAddress}>
                  <td className="mono">{p.walletAddress}</td>
                  <td>{formatAmount(p.amount)} aUSDC</td>
                  <td>
                    <CviBadge code={p.cviStatus} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link"
                      onClick={async () => {
                        await apiClient.removePayee(p.walletAddress);
                        refresh();
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="panel-footer">
        <button className="primary" onClick={handleRun} disabled={running || payees.every((p) => !p.eligible)}>
          {running ? "Submitting tx…" : "Run Payroll"}
        </button>
      </footer>
    </section>
  );
}

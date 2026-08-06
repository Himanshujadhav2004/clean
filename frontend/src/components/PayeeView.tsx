import { useState } from "react";
import { apiClient, formatAmount, type CviStatus } from "../api";
import { CviBadge } from "./CviBadge";

export function PayeeView() {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cviCode, setCviCode] = useState<CviStatus | null>(null);
  const [history, setHistory] = useState<
    Array<{ payee: string; amount: string; timestamp: number; runId: string; txHash: string }>
  >([]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const [profileRes, histRes] = await Promise.all([
        apiClient.payeeProfile(wallet.trim()).catch(() => null),
        apiClient.payeeHistory(wallet.trim()),
      ]);
      setHistory(histRes.history);

      if (profileRes && typeof profileRes === "object" && "tier" in (profileRes as object)) {
        setCviCode(4);
      } else {
        setCviCode(2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Payee View</h2>
        <p>Connect your wallet address to see CVI status and payment history from on-chain records.</p>
      </header>

      <form className="form-row" onSubmit={lookup}>
        <input
          placeholder="Your wallet address"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Look Up"}
        </button>
      </form>

      {error && <p className="alert error">{error}</p>}

      {cviCode !== null && (
        <div className="card">
          <h3>Verification</h3>
          <CviBadge code={cviCode} />
        </div>
      )}

      {history.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={`${h.runId}-${i}`}>
                  <td>#{h.runId}</td>
                  <td>{formatAmount(h.amount)} aUSDC</td>
                  <td>{new Date(h.timestamp * 1000).toLocaleString()}</td>
                  <td className="mono">{h.txHash.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

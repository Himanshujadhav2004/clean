import { Fragment, useEffect, useState } from "react";
import { apiClient, formatAmount, type PayrollRun } from "../api";

export function ReportsTab() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, PayrollRun>>({});

  async function refresh() {
    try {
      setRuns(await apiClient.listRuns());
    } catch {
      setRuns([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function loadReport(runId: string) {
    setLoadingId(runId);
    try {
      const run = await apiClient.getReport(runId);
      setExpanded((prev) => ({ ...prev, [runId]: run }));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Compliance Reports</h2>
        <p>Past payroll runs with CCP Travel Rule reports (generated async after each run).</p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>Date</th>
              <th>Paid</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No payroll runs yet.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <Fragment key={run.runId}>
                  <tr>
                    <td>#{run.runId}</td>
                    <td>{new Date(run.createdAt).toLocaleString()}</td>
                    <td>{run.executed?.successCount ?? run.payments.length}</td>
                    <td>
                      <span className={`status ${run.reportStatus}`}>{run.reportStatus}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="link"
                        disabled={loadingId === run.runId}
                        onClick={() => loadReport(run.runId)}
                      >
                        {loadingId === run.runId ? "Generating…" : "Get Reports"}
                      </button>
                    </td>
                  </tr>
                  {expanded[run.runId]?.reports?.length ? (
                    <tr key={`${run.runId}-reports`}>
                      <td colSpan={5}>
                        <ul className="report-list">
                          {expanded[run.runId].reports.map((r, i) => (
                            <li key={i}>
                              <span className="mono">{r.payee.slice(0, 10)}…</span>
                              <span>{formatAmount(r.amount)} aUSDC</span>
                              {r.downloadUrl ? (
                                <a href={r.downloadUrl} target="_blank" rel="noreferrer">
                                  {r.fileName || "Download PDF"}
                                </a>
                              ) : (
                                <span className="muted">{r.error || "Unavailable"}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

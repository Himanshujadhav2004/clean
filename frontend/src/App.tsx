import { useEffect, useState } from "react";
import { apiClient } from "./api";
import { EmployerDashboard } from "./components/EmployerDashboard";
import { PayeeView } from "./components/PayeeView";
import { ReportsTab } from "./components/ReportsTab";
import "./App.css";

type Tab = "employer" | "payee" | "reports";

export default function App() {
  const [tab, setTab] = useState<Tab>("employer");
  const [health, setHealth] = useState<{ employer: string | null; payrollConfigured: boolean } | null>(
    null
  );

  useEffect(() => {
    apiClient.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">CleanRail · Monad Testnet</p>
          <h1>Cross-Border Payroll Rails</h1>
        </div>
        <div className="health">
          {health?.payrollConfigured ? (
            <span className="chip ok">On-chain ready</span>
          ) : (
            <span className="chip warn">Deploy contracts + set .env</span>
          )}
          {health?.employer && <span className="mono chip">{health.employer.slice(0, 8)}…</span>}
        </div>
      </header>

      <nav className="tabs">
        {(
          [
            ["employer", "Employer"],
            ["payee", "Payee"],
            ["reports", "Reports"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "employer" && <EmployerDashboard />}
        {tab === "payee" && <PayeeView />}
        {tab === "reports" && <ReportsTab />}
      </main>
    </div>
  );
}

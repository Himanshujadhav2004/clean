const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ORG_ID = import.meta.env.VITE_ORG_ID || "demo-org";

export type CviStatus = 1 | 2 | 3 | 4;

export interface Payee {
  walletAddress: string;
  amount: string;
  cviStatus: CviStatus;
  cviMessage: string;
  eligible: boolean;
  magickLink?: string | null;
}

export interface PayrollRun {
  runId: string;
  orgId: string;
  txHash: string;
  payments: Array<{
    employer: string;
    payee: string;
    amount: string;
    timestamp: number;
    txHash: string;
  }>;
  skipped: Array<{ wallet: string; reason: string }>;
  executed?: {
    totalPaid: string;
    successCount: number;
    failCount: number;
  };
  reportStatus: string;
  reports: Array<{
    payee: string;
    amount: string;
    downloadUrl?: string;
    fileName?: string;
    error?: string;
  }>;
  createdAt: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json as T;
}

export function cviLabel(code: CviStatus): { text: string; tone: "ok" | "warn" | "bad" } {
  switch (code) {
    case 4:
      return { text: "CVI Verified", tone: "ok" };
    case 3:
      return { text: "Frozen / Expired", tone: "bad" };
    case 2:
      return { text: "No A-Pass", tone: "bad" };
    default:
      return { text: "Token Not Found", tone: "warn" };
  }
}

export function formatAmount(wei: string, decimals = 6): string {
  const n = Number(wei) / 10 ** decimals;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const apiClient = {
  health: () => api<{ ok: boolean; employer: string | null; payrollConfigured: boolean }>("/health"),
  listPayees: () => api<Payee[]>(`/orgs/${ORG_ID}/payees`),
  addPayee: (walletAddress: string, amountWei: string) =>
    api<Payee>(`/orgs/${ORG_ID}/payees`, {
      method: "POST",
      body: JSON.stringify({ walletAddress, amountWei }),
    }),
  removePayee: (wallet: string) =>
    api<{ ok: boolean }>(`/orgs/${ORG_ID}/payees/${wallet}`, { method: "DELETE" }),
  runPayroll: () => api<PayrollRun>(`/orgs/${ORG_ID}/payroll-runs`, { method: "POST" }),
  listRuns: () => api<PayrollRun[]>(`/orgs/${ORG_ID}/payroll-runs`),
  getReport: (runId: string) => api<PayrollRun>(`/reports/${runId}`),
  payeeHistory: (wallet: string) =>
    api<{ payeeAddress: string; profile: unknown; history: Array<{
      employer: string;
      payee: string;
      amount: string;
      timestamp: number;
      runId: string;
      txHash: string;
    }> }>(`/payees/${wallet}/history`),
  payeeProfile: (wallet: string) => api<unknown>(`/payees/${wallet}/profile`),
};

export { ORG_ID, API_BASE };

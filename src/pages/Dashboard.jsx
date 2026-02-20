import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Dashboard() {
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lastRecipient, setLastRecipient] = useState(null);

  const loadDashboardData = async () => {
    setLoadError("");
    setLoadingWallet(true);
    setLoadingTxs(true);
    const [walletRes, txRes] = await Promise.allSettled([
      apiFetch("/wallet/me"),
      apiFetch("/transactions/me"),
    ]);

    if (walletRes.status === "fulfilled") {
      setWallet(walletRes.value);
    } else {
      setLoadError(walletRes.reason?.message || "Failed to load dashboard.");
    }
    if (txRes.status === "fulfilled") {
      setTxs(txRes.value);
    } else {
      setLoadError((prev) => prev || txRes.reason?.message || "Failed to load dashboard.");
    }
    if (walletRes.status !== "fulfilled" || txRes.status !== "fulfilled") {
      showToast("Some dashboard data failed to load.", "warning");
    }
    setLoadingWallet(false);
    setLoadingTxs(false);
  };

  useEffect(() => {
    loadDashboardData();
    try {
      const stored = JSON.parse(localStorage.getItem("vtu_last_recipient") || "null");
      if (stored && typeof stored === "object" && typeof stored.phone === "string" && stored.phone.trim()) {
        setLastRecipient({ phone: stored.phone.trim(), ported: !!stored.ported });
      }
    } catch {
      // ignore
    }
  }, []);

  const chartData = useMemo(() => {
    const recent = [...txs].slice(0, 7).reverse();
    const max = Math.max(1, ...recent.map((t) => Number(t.amount || 0)));
    return recent.map((t) => ({
      amount: Number(t.amount || 0),
      height: Math.max(12, Math.round((Number(t.amount || 0) / max) * 60)),
      label: t.tx_type,
    }));
  }, [txs]);

  const statusKey = (value) => String(value || "").toLowerCase();
  const statusLabel = (value) => {
    const key = statusKey(value);
    if (key === "success") return "Success";
    if (key === "pending") return "Pending";
    if (key === "failed") return "Failed";
    if (key === "refunded") return "Refunded";
    return String(value || "—");
  };

  const quickBuyLink = lastRecipient?.phone
    ? `/data?phone=${encodeURIComponent(lastRecipient.phone)}&ported=${lastRecipient.ported ? "1" : "0"}`
    : "/data";

  const maskPhone = (value) => {
    const raw = String(value || "").replace(/\s+/g, "");
    if (raw.length < 7) return raw || "—";
    return `${raw.slice(0, 4)}•••${raw.slice(-3)}`;
  };

  return (
    <div className="page">
      <section className="hero-card">
        <div>
          <div className="label">Wallet Balance</div>
          <div className="hero-value">{loadingWallet ? "Loading..." : `₦ ${wallet?.balance || "0.00"}`}</div>
          <div className="muted">Instant payments. Secure topups.</div>
        </div>
        <div className="hero-actions">
          <button className="ghost" type="button" onClick={loadDashboardData} disabled={loadingWallet || loadingTxs}>
            {loadingWallet || loadingTxs ? "Refreshing..." : "Refresh"}
          </button>
          <Link className="primary" to="/wallet">Fund Wallet</Link>
          <Link className="ghost" to="/data">Buy Data</Link>
        </div>
      </section>

      {loadError && (
        <section className="section">
          <div className="notice">{loadError}</div>
        </section>
      )}

      <section className="section">
        <div className="stats-grid">
          <div className="card stat-card">
            <div className="label">Monthly Spend</div>
            <div className="value">₦ {txs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toFixed(2)}</div>
            <div className="muted">Across data purchases</div>
          </div>
          <div className="card stat-card">
            <div className="label">Transactions</div>
            <div className="value">{loadingTxs ? "..." : txs.length}</div>
            <div className="muted">All time</div>
          </div>
          <div className="card stat-card">
            <div className="label">Success Rate</div>
            <div className="value">
              {txs.length === 0 ? "0%" : `${Math.round((txs.filter((t) => statusKey(t.status) === "success").length / txs.length) * 100)}%`}
            </div>
            <div className="muted">Last 30 days</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="section-head">
            <h3>Weekly Activity</h3>
            <span className="muted">Last 7 transactions</span>
          </div>
          <div className="mini-chart">
            {chartData.length === 0 && <div className="empty">No activity yet.</div>}
            {chartData.map((bar, idx) => (
              <div className="bar-wrap" key={`${bar.label}-${idx}`}>
                <div className="bar" style={{ height: `${bar.height}px` }} />
                <span>{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <h3>Quick Actions</h3>
        <div className="grid-3">
          <Link className="card action-card" to={quickBuyLink}>
            <div className="label">{lastRecipient?.phone ? "Quick Buy" : "Buy Data"}</div>
            <div className="value">{lastRecipient?.phone ? maskPhone(lastRecipient.phone) : "All Networks"}</div>
            <div className="muted">
              {lastRecipient?.phone ? "Use your last recipient instantly" : "Fast, reliable delivery"}
            </div>
          </Link>
          <Link className="card action-card" to="/wallet">
            <div className="label">Fund Wallet</div>
            <div className="value">Paystack</div>
            <div className="muted">Card / Bank transfer</div>
          </Link>
          <Link className="card action-card" to="/services">
            <div className="label">More Services</div>
            <div className="value">Airtime</div>
            <div className="muted">Cable, electricity, exams</div>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h3>Recent Transactions</h3>
          <Link className="link" to="/transactions">View all</Link>
        </div>
        <div className="card-list">
          {txs.slice(0, 4).map((tx) => (
            <div className="list-card" key={tx.id}>
              <div>
                <div className="list-title">{tx.tx_type}</div>
                <div className="muted">{tx.reference}</div>
              </div>
              <div className="list-meta">
                <div className="value">₦ {tx.amount}</div>
                <span className={`pill ${statusKey(tx.status)}`}>{statusLabel(tx.status)}</span>
              </div>
            </div>
          ))}
          {txs.length === 0 && (
            <div className="empty">No transactions yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

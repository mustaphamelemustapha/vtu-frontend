import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import { loadBeneficiaries } from "../services/beneficiaries";
import { useToast } from "../context/toast.jsx";

export default function Dashboard() {
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lastRecipient, setLastRecipient] = useState(null);
  const [quickBeneficiaries, setQuickBeneficiaries] = useState([]);

  const toServiceRoute = (service, fields = {}) => {
    const params = new URLSearchParams();
    const put = (key, value) => {
      const raw = String(value ?? "").trim();
      if (!raw) return;
      params.set(key, raw);
    };
    if (service === "data") {
      put("phone", fields.phone);
      put("ported", fields.ported ? "1" : "0");
      put("network", fields.preferred_network);
      const q = params.toString();
      return q ? `/data?${q}` : "/data";
    }
    if (service === "airtime") {
      put("network", fields.network);
      put("phone_number", fields.phone_number);
      put("amount", fields.amount);
      const q = params.toString();
      return q ? `/airtime?${q}` : "/airtime";
    }
    if (service === "cable") {
      put("provider", fields.provider);
      put("smartcard_number", fields.smartcard_number);
      put("package_code", fields.package_code);
      put("amount", fields.amount);
      const q = params.toString();
      return q ? `/cable?${q}` : "/cable";
    }
    if (service === "electricity") {
      put("disco", fields.disco);
      put("meter_type", fields.meter_type);
      put("meter_number", fields.meter_number);
      put("amount", fields.amount);
      const q = params.toString();
      return q ? `/electricity?${q}` : "/electricity";
    }
    if (service === "exam") {
      put("exam", fields.exam);
      put("quantity", fields.quantity);
      put("phone_number", fields.phone_number);
      const q = params.toString();
      return q ? `/exam?${q}` : "/exam";
    }
    return "/services";
  };

  const getQuickBeneficiaries = () => {
    const serviceOrder = ["data", "airtime", "cable", "electricity", "exam"];
    const serviceTitles = {
      data: "Data",
      airtime: "Airtime",
      cable: "Cable",
      electricity: "Electricity",
      exam: "Exam",
    };
    const merged = [];
    for (const service of serviceOrder) {
      const rows = loadBeneficiaries(service).slice(0, 4);
      rows.forEach((item) => {
        merged.push({
          id: `${service}:${item.id}`,
          service,
          serviceTitle: serviceTitles[service] || "Service",
          label: item.label || "Saved",
          subtitle: item.subtitle || "Beneficiary",
          to: toServiceRoute(service, item.fields || {}),
          last_used_at: item.last_used_at || "",
        });
      });
    }
    return merged
      .sort((a, b) => String(b.last_used_at || "").localeCompare(String(a.last_used_at || "")))
      .slice(0, 8);
  };

  const loadDashboardData = async () => {
    setLoadError("");
    setLoadingWallet(true);
    setLoadingTxs(true);
    const [walletRes, txRes, announcementRes] = await Promise.allSettled([
      apiFetch("/wallet/me"),
      apiFetch("/transactions/me"),
      apiFetch("/notifications/broadcast"),
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
    if (announcementRes.status === "fulfilled") {
      setAnnouncements(Array.isArray(announcementRes.value) ? announcementRes.value : []);
    } else {
      setAnnouncements([]);
    }
    if (walletRes.status !== "fulfilled" || txRes.status !== "fulfilled") {
      showToast("Some dashboard data failed to load.", "warning");
    }
    setQuickBeneficiaries(getQuickBeneficiaries());
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
    setQuickBeneficiaries(getQuickBeneficiaries());
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

  const announcementFeed = useMemo(() => {
    const chunks = announcements
      .map((item) => {
        const title = String(item?.title || "").trim();
        const message = String(item?.message || "").trim();
        if (!title && !message) return "";
        if (!message) return title;
        if (!title) return message;
        return `${title}: ${message}`;
      })
      .filter(Boolean);
    return chunks.join("  •  ");
  }, [announcements]);

  const announcementLevel = useMemo(() => {
    let score = 0;
    for (const item of announcements) {
      const level = String(item?.level || "").toLowerCase();
      if (level === "critical") score = Math.max(score, 4);
      else if (level === "warning") score = Math.max(score, 3);
      else if (level === "success") score = Math.max(score, 2);
      else if (level === "info") score = Math.max(score, 1);
    }
    if (score >= 4) return "critical";
    if (score >= 3) return "warning";
    if (score >= 2) return "success";
    return "info";
  }, [announcements]);

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

      {announcementFeed && (
        <section className="section">
          <div className={`dashboard-announcement card ${announcementLevel}`}>
            <div className="dashboard-announcement-badge">
              <span className={`pill ${announcementLevel}`}>{announcementLevel.toUpperCase()}</span>
              <span className="label">Live Updates</span>
            </div>
            <div className="dashboard-announcement-marquee" role="status" aria-live="polite">
              <div className="dashboard-announcement-track">
                <span>{announcementFeed}</span>
                <span aria-hidden="true">{announcementFeed}</span>
              </div>
            </div>
          </div>
        </section>
      )}

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
          <Link className="card action-card" to="/support">
            <div className="label">Help & Support</div>
            <div className="value">Contact Team</div>
            <div className="muted">FAQ, calls, WhatsApp and report tracking</div>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h3>Quick Buy</h3>
          <span className="muted">{quickBeneficiaries.length} saved</span>
        </div>
        {quickBeneficiaries.length === 0 ? (
          <div className="card">
            <div className="muted">
              Save beneficiaries from Data/Airtime/Cable/Electricity/Exam pages to quick-buy here.
            </div>
          </div>
        ) : (
          <div className="grid-3">
            {quickBeneficiaries.map((item) => (
              <Link className="card action-card beneficiary-quick-card" to={item.to} key={item.id}>
                <div className="label">{item.serviceTitle}</div>
                <div className="value">{item.label}</div>
                <div className="muted">{item.subtitle}</div>
              </Link>
            ))}
          </div>
        )}
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch, getProfile } from "../services/api";
import { loadBeneficiaries } from "../services/beneficiaries";
import { useToast } from "../context/toast.jsx";
import { queryKeys } from "../query/client.js";
import Button from "../components/ui/Button.jsx";

const DASHBOARD_CACHE_KEY = "axisvtu_dashboard_cache_v1";
const keepPrimaryAccountOnly = (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  return [items[0]];
};

function readDashboardCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY) || "{}");
    return {
      wallet: raw?.wallet && typeof raw.wallet === "object" ? raw.wallet : null,
      txs: Array.isArray(raw?.txs) ? raw.txs : [],
      announcements: Array.isArray(raw?.announcements) ? raw.announcements : [],
      fundingAccounts: keepPrimaryAccountOnly(raw?.fundingAccounts),
    };
  } catch {
    return {
      wallet: null,
      txs: [],
      announcements: [],
      fundingAccounts: [],
    };
  }
}

function writeDashboardCache(payload) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(payload || {}));
  } catch {
    // ignore storage errors
  }
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const cached = readDashboardCache();
  const [wallet, setWallet] = useState(cached.wallet);
  const [txs, setTxs] = useState(cached.txs);
  const [announcements, setAnnouncements] = useState(cached.announcements);
  const [fundingAccounts, setFundingAccounts] = useState(cached.fundingAccounts);
  const [loadingWallet, setLoadingWallet] = useState(!cached.wallet);
  const [loadingTxs, setLoadingTxs] = useState(cached.txs.length === 0);
  const [loadError, setLoadError] = useState("");
  const [lastRecipient, setLastRecipient] = useState(null);
  const [quickBeneficiaries, setQuickBeneficiaries] = useState([]);
  const retryTimerRef = useRef(null);
  const profile = getProfile();

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

  const loadDashboardData = async ({ silent = false, attempt = 1 } = {}) => {
    if (!silent) {
      setLoadError("");
      if (!wallet) setLoadingWallet(true);
      if (txs.length === 0) setLoadingTxs(true);
    }

    let nextWallet = wallet;
    let nextTxs = txs;
    let nextAnnouncements = announcements;
    let nextFundingAccounts = fundingAccounts;
    let walletFailed = false;
    let txFailed = false;

    try {
      const summary = await queryClient.fetchQuery({
        queryKey: queryKeys.dashboardSummary,
        queryFn: () => apiFetch("/dashboard/summary", { _suppressRetryToast: true }),
        staleTime: 60 * 1000,
      });
      const partialFailures = new Set(
        Array.isArray(summary?.partial_failures) ? summary.partial_failures.map((item) => String(item || "")) : []
      );

      walletFailed = partialFailures.has("wallet");
      txFailed = partialFailures.has("transactions");

      if (!walletFailed && summary?.wallet && typeof summary.wallet === "object") {
        nextWallet = summary.wallet;
        setWallet(summary.wallet);
      }

      if (!txFailed && Array.isArray(summary?.transactions)) {
        nextTxs = summary.transactions;
        setTxs(summary.transactions);
      }

      if (!partialFailures.has("announcements") && Array.isArray(summary?.announcements)) {
        nextAnnouncements = summary.announcements;
        setAnnouncements(summary.announcements);
      }

      if (
        !partialFailures.has("bank_transfer_accounts") &&
        Array.isArray(summary?.bank_transfer_accounts?.accounts)
      ) {
        nextFundingAccounts = keepPrimaryAccountOnly(summary.bank_transfer_accounts.accounts);
        setFundingAccounts(nextFundingAccounts);
      }
    } catch {
      const [walletRes, txRes, announcementRes, fundingAccountRes] = await Promise.allSettled([
        queryClient.fetchQuery({
          queryKey: queryKeys.walletMe,
          queryFn: () => apiFetch("/wallet/me", { _suppressRetryToast: true }),
          staleTime: 45 * 1000,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.transactionsMe,
          queryFn: () => apiFetch("/transactions/me", { _suppressRetryToast: true }),
          staleTime: 30 * 1000,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.notificationsBroadcast,
          queryFn: () => apiFetch("/notifications/broadcast", { _suppressRetryToast: true }),
          staleTime: 60 * 1000,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.transferAccounts,
          queryFn: () => apiFetch("/wallet/bank-transfer-accounts", { _suppressRetryToast: true }),
          staleTime: 45 * 1000,
        }),
      ]);

      walletFailed = walletRes.status !== "fulfilled";
      txFailed = txRes.status !== "fulfilled";

      if (walletRes.status === "fulfilled") {
        nextWallet = walletRes.value;
        setWallet(walletRes.value);
      }
      if (txRes.status === "fulfilled") {
        nextTxs = txRes.value;
        setTxs(txRes.value);
      }
      if (announcementRes.status === "fulfilled") {
        nextAnnouncements = Array.isArray(announcementRes.value) ? announcementRes.value : [];
        setAnnouncements(nextAnnouncements);
      } else {
        // keep previous/cached announcements on transient errors
        setAnnouncements((prev) => prev);
      }
      if (fundingAccountRes.status === "fulfilled") {
        nextFundingAccounts = keepPrimaryAccountOnly(fundingAccountRes.value?.accounts);
        setFundingAccounts(nextFundingAccounts);
      } else {
        // keep previous/cached funding accounts on transient errors
        setFundingAccounts((prev) => prev);
      }
    }

    if (nextWallet || (Array.isArray(nextTxs) && nextTxs.length> 0)) {
      writeDashboardCache({
        wallet: nextWallet,
        txs: nextTxs,
        announcements: nextAnnouncements,
        fundingAccounts: nextFundingAccounts,
        cached_at: Date.now(),
      });
    }

    const hasEssentialData = !!nextWallet || (Array.isArray(nextTxs) && nextTxs.length> 0);
    const criticalFailed = walletFailed && txFailed;

    if (!criticalFailed) {
      setLoadError("");
    } else {
      setLoadError(
        hasEssentialData
          ? "Live update delayed. Showing last available dashboard data."
          : "Dashboard is taking longer than usual. Retrying..."
      );
    }

    if (criticalFailed && attempt < 3) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        loadDashboardData({ silent: true, attempt: attempt + 1 });
      }, 1100 * attempt);
    } else if (criticalFailed && !hasEssentialData && !silent) {
      showToast("Dashboard is slow right now. Please hold on a moment.", "warning");
    }

    setQuickBeneficiaries(getQuickBeneficiaries());
    setLoadingWallet(false);
    setLoadingTxs(false);
  };

  useEffect(() => {
    loadDashboardData({ silent: false, attempt: 1 });
    try {
      const stored = JSON.parse(localStorage.getItem("vtu_last_recipient") || "null");
      if (stored && typeof stored === "object" && typeof stored.phone === "string" && stored.phone.trim()) {
        setLastRecipient({ phone: stored.phone.trim(), ported: !!stored.ported });
      }
    } catch {
      // ignore
    }
    setQuickBeneficiaries(getQuickBeneficiaries());
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
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
  const txTypeKey = (value) => String(value || "").toLowerCase();
  const formatAmount = (value) =>
    Number(value || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const txTypeLabel = (tx) => {
    const key = txTypeKey(tx?.tx_type);
    if (key === "wallet_fund") return "Credit";
    if (key === "data") return "Data";
    if (key === "airtime") return "Airtime";
    if (key === "cable") return "Cable TV";
    if (key === "electricity") return "Electricity";
    if (key === "exam") return "Exam PIN";
    return "Transaction";
  };

  const txRecipientPhone = (tx) =>
    tx?.meta?.recipient_phone ||
    tx?.meta?.phone_number ||
    tx?.phone_number ||
    "";

  const txBodyText = (tx) => {
    const key = txTypeKey(tx?.tx_type);
    const recipient = txRecipientPhone(tx);
    if (key === "wallet_fund") return "Wallet funding received.";
    if (key === "data") return recipient ? `Data sent to ${maskPhone(recipient)}.` : "Data purchase completed.";
    if (key === "airtime") return recipient ? `Airtime sent to ${maskPhone(recipient)}.` : "Airtime purchase completed.";
    if (key === "cable") return "Cable subscription payment completed.";
    if (key === "electricity") return "Electricity purchase completed.";
    if (key === "exam") return "Exam PIN purchase completed.";
    return "Transaction update.";
  };

  const isCreditTx = (tx) => {
    const key = txTypeKey(tx?.tx_type);
    const status = statusKey(tx?.status);
    return key === "wallet_fund" || status === "refunded";
  };

  const primaryFundingAccount = useMemo(
    () => (Array.isArray(fundingAccounts) && fundingAccounts.length> 0 ? fundingAccounts[0] : null),
    [fundingAccounts]
  );

  const copyAccountNumber = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(String(value));
      showToast("Account number copied.", "success");
    } catch {
      showToast("Copy failed. Please copy manually.", "error");
    }
  };

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
    if (score>= 4) return "critical";
    if (score>= 3) return "warning";
    if (score>= 2) return "success";
    return "info";
  }, [announcements]);

  const greetingName = useMemo(() => {
    const fallback = String(profile?.full_name || "").trim();
    if (!fallback) return "there";
    return fallback;
  }, [profile?.full_name]);

  return (
    <div className="page dashboard-page" data-testid="dashboard-page">
      <section className="dashboard-shell-top">
        <div className="hero-card dashboard-welcome-card">
          <div className="dashboard-welcome-head">
            <div className="label">DASHBOARD</div>
            <h2 className="dashboard-welcome-title" data-testid="dashboard-welcome-title">Welcome back, {greetingName}!</h2>
            <div className="muted">Your account is active and ready for instant VTU purchases.</div>
          </div>
          <div className="hero-value">{loadingWallet ? "Loading..." : `₦ ${wallet?.balance || "0.00"}`}</div>
          <div className="dashboard-welcome-actions">
            <Link className="primary hero-cta" to="/wallet">Fund Wallet</Link>
            <Link className="ghost hero-cta" to="/data">Buy Data</Link>
            <Link className="ghost hero-cta" to="/services">All Services</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card dashboard-funding-rail">
          <div className="section-head">
            <h3>Automated Bank Transfer</h3>
            <Link className="ghost beneficiary-save-btn" to="/wallet">Manage</Link>
          </div>
          {fundingAccounts.length === 0 ? (
            <div className="muted">No account generated yet. Open Wallet and tap Generate Account.</div>
          ) : (
            <div className="funding-account-grid">
              {primaryFundingAccount && (
                <div className="funding-account-card" key={`${primaryFundingAccount.bank_name}-${primaryFundingAccount.account_number}`}>
                  <div className="funding-account-top">
                    <div className="label">{primaryFundingAccount.bank_name}</div>
                    <Button variant="ghost" className="account-copy-btn"
                      type="button"
                      onClick={() => copyAccountNumber(primaryFundingAccount.account_number)}>
                      Copy
                    </Button>
                  </div>
                  <div className="funding-account-number">{primaryFundingAccount.account_number}</div>
                  <div className="muted">{primaryFundingAccount.account_name || "AxisVTU Wallet"}</div>
                </div>
              )}
            </div>
          )}
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
        <h3>Services</h3>
        <div className="grid-3 dashboard-services-grid">
          <Link className="card action-card dashboard-service-card" to={quickBuyLink}>
            <div className="label">Data</div>
            <div className="value">{lastRecipient?.phone ? maskPhone(lastRecipient.phone) : "All Networks"}</div>
            <div className="muted">
              {lastRecipient?.phone ? "Use your last recipient instantly" : "Fast, reliable delivery"}
            </div>
          </Link>
          <Link className="card action-card dashboard-service-card" to="/airtime">
            <div className="label">Airtime</div>
            <div className="value">Topup</div>
            <div className="muted">All major networks</div>
          </Link>
          <Link className="card action-card dashboard-service-card" to="/electricity">
            <div className="label">Electricity</div>
            <div className="value">Token</div>
            <div className="muted">Prepaid and postpaid</div>
          </Link>
          <Link className="card action-card dashboard-service-card" to="/cable">
            <div className="label">Cable TV</div>
            <div className="value">Subscriptions</div>
            <div className="muted">DStv, GOtv, Startimes</div>
          </Link>
          <Link className="card action-card dashboard-service-card" to="/exam">
            <div className="label">Exam PIN</div>
            <div className="value">WAEC / NECO</div>
            <div className="muted">Instant pin delivery</div>
          </Link>
          <Link className="card action-card dashboard-service-card" to="/support">
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
          <div className="grid-3 dashboard-quick-grid">
            {quickBeneficiaries.map((item) => (
              <Link className="card action-card dashboard-service-card beneficiary-quick-card" to={item.to} key={item.id}>
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
            <div className="list-card tx-list-card" key={tx.id}>
              <div className="tx-main">
                <div className="list-title">{txTypeLabel(tx)}</div>
                <div className="muted">{txBodyText(tx)}</div>
                <div className="muted">Ref: {tx.reference}</div>
              </div>
              <div className="list-meta tx-list-meta">
                <div className={`tx-amount ${isCreditTx(tx) ? "credit" : "debit"}`}>
                  {isCreditTx(tx) ? "+" : "-"}₦ {formatAmount(tx.amount)}
                </div>
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

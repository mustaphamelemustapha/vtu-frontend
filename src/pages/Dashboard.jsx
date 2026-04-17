import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch, getActiveAuthScope, getProfile } from "../services/api";
import { useToast } from "../context/toast.jsx";
import { queryKeys } from "../query/client.js";
import Button from "../components/ui/Button.jsx";

const DASHBOARD_CACHE_KEY = "axisvtu_dashboard_cache_v1";

const formatMoney = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseMoney = (value) => {
  const num = Number(String(value ?? 0).replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : 0;
};

function ServiceIcon({ type }) {
  if (type === "data") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 8C5.5 5.5 8.4 4.2 12 4.2C15.6 4.2 18.5 5.5 21 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 11.2C7.8 9.5 9.8 8.7 12 8.7C14.2 8.7 16.2 9.5 18 11.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9.1 14.4C10 13.6 10.9 13.2 12 13.2C13.1 13.2 14 13.6 14.9 14.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1.6" fill="currentColor" />
      </svg>
    );
  }

  if (type === "airtime") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="8" y="3" width="8" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10.8 5.8H13.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="17.7" r="1.2" fill="currentColor" />
        <path d="M4 10.4C5.2 9.1 6.5 8.5 8.1 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M20 10.4C18.8 9.1 17.5 8.5 15.9 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "electricity") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="3.5" width="16" height="17" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.6 7.6H16.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7.6 11.5H12.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M11.8 12.6L9.6 16H12.2L11.1 18.8L14.6 14.3H12.3L13.5 12.6H11.8Z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "cable") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 20H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 17V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 8.5L15.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "exam") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 3.8H14.8L18.5 7.5V20.2H7V3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14.8 3.8V7.5H18.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 11H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9.5 14.5H13.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21C16.4 21 20 17.4 20 13V8.4L12 4L4 8.4V13C4 17.4 7.6 21 12 21Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

const keepPrimaryAccountOnly = (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  return [items[0]];
};

function dashboardCacheKey(authScope) {
  return `${DASHBOARD_CACHE_KEY}:${authScope || "guest"}`;
}

function readDashboardCache(cacheKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(cacheKey) || "{}");
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

function writeDashboardCache(cacheKey, payload) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(payload || {}));
  } catch {
    // ignore storage errors
  }
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const profile = getProfile();
  const authScope = getActiveAuthScope();
  const cacheKey = dashboardCacheKey(authScope);
  const recipientCacheKey = `vtu_last_recipient:${authScope || "guest"}`;
  const cached = readDashboardCache(cacheKey);
  const [wallet, setWallet] = useState(cached.wallet);
  const [txs, setTxs] = useState(cached.txs);
  const [announcements, setAnnouncements] = useState(cached.announcements);
  const [fundingAccounts, setFundingAccounts] = useState(cached.fundingAccounts);
  const [loadingWallet, setLoadingWallet] = useState(!cached.wallet);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [lastRecipient, setLastRecipient] = useState(null);
  const [walletAnimSeq, setWalletAnimSeq] = useState(0);
  const [animatedWalletBalance, setAnimatedWalletBalance] = useState(parseMoney(cached.wallet?.balance || 0));
  const [balanceCounting, setBalanceCounting] = useState(false);
  const retryTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const walletRef = useRef(cached.wallet);
  const txsRef = useRef(cached.txs);
  const announcementsRef = useRef(cached.announcements);
  const fundingAccountsRef = useRef(cached.fundingAccounts);
  const balanceDisplayRef = useRef(parseMoney(cached.wallet?.balance || 0));

  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  useEffect(() => {
    txsRef.current = txs;
  }, [txs]);

  useEffect(() => {
    announcementsRef.current = announcements;
  }, [announcements]);

  useEffect(() => {
    fundingAccountsRef.current = fundingAccounts;
  }, [fundingAccounts]);

  const loadDashboardData = useCallback(async ({ silent = false, attempt = 1 } = {}) => {
    if (!mountedRef.current) return;
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoadError("");
      if (!walletRef.current) setLoadingWallet(true);
    }

    let nextWallet = walletRef.current;
    let nextTxs = txsRef.current;
    let nextAnnouncements = announcementsRef.current;
    let nextFundingAccounts = fundingAccountsRef.current;
    let walletFailed = false;
    let txFailed = false;

    try {
      const summary = await queryClient.fetchQuery({
        queryKey: queryKeys.dashboardSummary(authScope),
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
        if (mountedRef.current) setWallet(summary.wallet);
      }

      if (!txFailed && Array.isArray(summary?.transactions)) {
        nextTxs = summary.transactions;
        if (mountedRef.current) setTxs(summary.transactions);
      }

      if (!partialFailures.has("announcements") && Array.isArray(summary?.announcements)) {
        nextAnnouncements = summary.announcements;
        if (mountedRef.current) setAnnouncements(summary.announcements);
      }

      if (
        !partialFailures.has("bank_transfer_accounts") &&
        Array.isArray(summary?.bank_transfer_accounts?.accounts)
      ) {
        nextFundingAccounts = keepPrimaryAccountOnly(summary.bank_transfer_accounts.accounts);
        if (mountedRef.current) setFundingAccounts(nextFundingAccounts);
      }
    } catch {
      const [walletRes, txRes, announcementRes, fundingAccountRes] = await Promise.allSettled([
        queryClient.fetchQuery({
          queryKey: queryKeys.walletMe(authScope),
          queryFn: () => apiFetch("/wallet/me", { _suppressRetryToast: true }),
          staleTime: 45 * 1000,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.transactionsMe(authScope),
          queryFn: () => apiFetch("/transactions/me", { _suppressRetryToast: true }),
          staleTime: 30 * 1000,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.notificationsBroadcast(authScope),
          queryFn: () => apiFetch("/notifications/broadcast", { _suppressRetryToast: true }),
          staleTime: 60 * 1000,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.transferAccounts(authScope),
          queryFn: () => apiFetch("/wallet/bank-transfer-accounts", { _suppressRetryToast: true }),
          staleTime: 45 * 1000,
        }),
      ]);

      walletFailed = walletRes.status !== "fulfilled";
      txFailed = txRes.status !== "fulfilled";

      if (walletRes.status === "fulfilled") {
        nextWallet = walletRes.value;
        if (mountedRef.current) setWallet(walletRes.value);
      }
      if (txRes.status === "fulfilled") {
        nextTxs = txRes.value;
        if (mountedRef.current) setTxs(txRes.value);
      }
      if (announcementRes.status === "fulfilled") {
        nextAnnouncements = Array.isArray(announcementRes.value) ? announcementRes.value : [];
        if (mountedRef.current) setAnnouncements(nextAnnouncements);
      } else {
        // keep previous/cached announcements on transient errors
        if (mountedRef.current) setAnnouncements((prev) => prev);
      }
      if (fundingAccountRes.status === "fulfilled") {
        nextFundingAccounts = keepPrimaryAccountOnly(fundingAccountRes.value?.accounts);
        if (mountedRef.current) setFundingAccounts(nextFundingAccounts);
      } else {
        // keep previous/cached funding accounts on transient errors
        if (mountedRef.current) setFundingAccounts((prev) => prev);
      }
    }

    if (nextWallet || (Array.isArray(nextTxs) && nextTxs.length> 0)) {
      writeDashboardCache(cacheKey, {
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
      if (mountedRef.current) setLoadError("");
    } else {
      if (mountedRef.current) {
        setLoadError(
          hasEssentialData
            ? "Live update delayed. Showing last available dashboard data."
            : "Dashboard is taking longer than usual. Retrying..."
        );
      }
    }

    if (criticalFailed && attempt < 3) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        loadDashboardData({ silent: true, attempt: attempt + 1 });
      }, 1100 * attempt);
    } else if (criticalFailed && !hasEssentialData && !silent) {
      if (mountedRef.current) {
        showToast("Dashboard is slow right now. Please hold on a moment.", "warning");
      }
    }

    if (mountedRef.current) {
      setLoadingWallet(false);
      setIsRefreshing(false);
      setWalletAnimSeq((value) => value + 1);
    }
  }, [authScope, cacheKey, queryClient, showToast]);

  useEffect(() => {
    const target = parseMoney(wallet?.balance || 0);
    let start = parseMoney(balanceDisplayRef.current);
    if (start === target && target > 0) {
      start = Math.max(0, target * 0.88);
    }
    if (!mountedRef.current) return undefined;
    if (start === target) {
      setAnimatedWalletBalance(target);
      balanceDisplayRef.current = target;
      setBalanceCounting(false);
      return undefined;
    }

    setBalanceCounting(true);
    const duration = 680;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + (target - start) * eased;
      balanceDisplayRef.current = next;
      setAnimatedWalletBalance(next);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        balanceDisplayRef.current = target;
        setAnimatedWalletBalance(target);
        setBalanceCounting(false);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [wallet?.balance, walletAnimSeq]);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboardData({ silent: false, attempt: 1 });
    try {
      const stored = JSON.parse(localStorage.getItem(recipientCacheKey) || "null");
      if (stored && typeof stored === "object" && typeof stored.phone === "string" && stored.phone.trim()) {
        setLastRecipient({ phone: stored.phone.trim(), ported: !!stored.ported });
      }
    } catch {
      // ignore
    }
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [loadDashboardData, recipientCacheKey]);

  useEffect(() => {
    const handleOnline = () => loadDashboardData({ silent: true, attempt: 1 });
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        loadDashboardData({ silent: true, attempt: 1 });
      }
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [loadDashboardData]);

  const statusKey = (value) => String(value || "").toLowerCase();
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

  const showFundingSkeleton = loadingWallet && !primaryFundingAccount;
  const walletBalance = formatMoney(animatedWalletBalance);

  return (
    <div className="page dashboard-page" data-testid="dashboard-page">
      <section className="dashboard-shell-top">
        <div className="hero-card dashboard-welcome-card">
          <div className="dashboard-welcome-head">
            <div className="label">DASHBOARD</div>
            <h2 className="dashboard-welcome-title" data-testid="dashboard-welcome-title">Welcome back, {greetingName}!</h2>
            <div className="muted">
              {isRefreshing
                ? "Refreshing live balances..."
                : loadError
                  ? "Live sync delayed. Showing best available data."
                  : "Your account is active and ready for instant VTU purchases."}
            </div>
          </div>
          <div className="dashboard-welcome-actions">
            <Link className="primary hero-cta hero-cta-fund" to="/wallet">Fund Wallet</Link>
            <Link className="ghost hero-cta hero-cta-kyc" to="/profile">Update Profile</Link>
          </div>
          <div className="dashboard-welcome-visual" aria-hidden="true">
            <div className="dashboard-welcome-blob" />
            <img src="/brand/axisvtu-icon.png" alt="" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card dashboard-funding-rail">
          <div className="section-head">
            <h3>Automated Bank Transfer</h3>
            <Link className="ghost beneficiary-save-btn" to="/wallet">Manage</Link>
          </div>
          {showFundingSkeleton ? (
            <div className="funding-account-grid">
              <div className="funding-account-card skeleton">
                <div className="skeleton-line w-40" />
                <div className="skeleton-line w-80" />
                <div className="skeleton-line w-60" />
              </div>
            </div>
          ) : fundingAccounts.length === 0 ? (
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
                  <div className="funding-account-number-wrap">
                    <div className="funding-account-number">{primaryFundingAccount.account_number}</div>
                    <div className="funding-account-number-note">Tap copy to share your funding account</div>
                  </div>
                  <div className="muted">{primaryFundingAccount.account_name || "AxisVTU Wallet"}</div>
                  <div className="dashboard-wallet-mini">
                    <div className="dashboard-wallet-mini-head">
                      <span className="label">Wallet Balance</span>
                      <span className="dashboard-wallet-mini-badge">Live</span>
                    </div>
                    <div className={`dashboard-wallet-mini-value ${balanceCounting ? "balance-counting" : ""}`}>₦ {walletBalance}</div>
                    <div className="dashboard-wallet-mini-note">Credited automatically after transfer confirmation.</div>
                  </div>
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
          <div className="notice notice-inline-action">
            <span>{loadError}</span>
            <button className="ghost beneficiary-save-btn" type="button" onClick={() => loadDashboardData({ silent: false, attempt: 1 })}>
              Retry now
            </button>
          </div>
        </section>
      )}

      <section className="section">
        <h3>Services</h3>
        <div className="grid-3 dashboard-services-grid">
          <Link className="card action-card dashboard-service-card service-primary-card" to={quickBuyLink}>
            <div className="service-icon-wrap"><ServiceIcon type="data" /></div>
            <div className="service-title">Buy Data</div>
            <div className="service-subtitle">
              {lastRecipient?.phone ? `Quick buy ${maskPhone(lastRecipient.phone)}` : "All networks"}
            </div>
          </Link>
          <Link className="card action-card dashboard-service-card service-primary-card" to="/airtime">
            <div className="service-icon-wrap"><ServiceIcon type="airtime" /></div>
            <div className="service-title">Buy Airtime</div>
            <div className="service-subtitle">Instant topup</div>
          </Link>
          <Link className="card action-card dashboard-service-card service-primary-card" to="/electricity">
            <div className="service-icon-wrap"><ServiceIcon type="electricity" /></div>
            <div className="service-title">Electricity Bill</div>
            <div className="service-subtitle">Prepaid & postpaid</div>
          </Link>
          <Link className="card action-card dashboard-service-card service-primary-card" to="/cable">
            <div className="service-icon-wrap"><ServiceIcon type="cable" /></div>
            <div className="service-title">Cable Subscription</div>
            <div className="service-subtitle">DStv, GOtv, Startimes</div>
          </Link>
          <Link className="card action-card dashboard-service-card service-primary-card" to="/exam">
            <div className="service-icon-wrap"><ServiceIcon type="exam" /></div>
            <div className="service-title">Result Checker</div>
            <div className="service-subtitle">WAEC, NECO, JAMB</div>
          </Link>
          <Link className="card action-card dashboard-service-card service-primary-card" to="/support">
            <div className="service-icon-wrap"><ServiceIcon type="support" /></div>
            <div className="service-title">Support Center</div>
            <div className="service-subtitle">Get help quickly</div>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="card dashboard-tx-cta-card">
          <div className="section-head">
            <div>
              <h3>Transactions</h3>
              <div className="muted">View full history and receipts in one place.</div>
            </div>
            <Link className="primary dashboard-history-link" to="/transactions">Open History</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

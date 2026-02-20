import { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Wallet from "./pages/Wallet.jsx";
import Data from "./pages/Data.jsx";
import Services from "./pages/Services.jsx";
import Airtime from "./pages/Airtime.jsx";
import Cable from "./pages/Cable.jsx";
import Electricity from "./pages/Electricity.jsx";
import Exam from "./pages/Exam.jsx";
import Transactions from "./pages/Transactions.jsx";
import Support from "./pages/Support.jsx";
import Admin from "./pages/Admin.jsx";
import Profile from "./pages/Profile.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import { apiFetch, getToken, clearToken, getProfile, setProfile } from "./services/api";
import { ToastProvider } from "./context/toast.jsx";
import ToastHost from "./components/ToastHost.jsx";

const NOTIF_ITEMS_KEY = "axisvtu_notif_items";
const NOTIF_SNAPSHOT_KEY = "axisvtu_notif_snapshot";
const NOTIF_POLL_MS = 25000;
const MAX_NOTIF_ITEMS = 80;

function _safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function _toMoney(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _statusKey(value) {
  return String(value || "").toLowerCase();
}

function _txTypeLabel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "wallet_fund") return "Wallet Funding";
  if (key === "data") return "Data Purchase";
  if (key === "airtime") return "Airtime";
  if (key === "cable") return "Cable TV";
  if (key === "electricity") return "Electricity";
  if (key === "exam") return "Exam PIN";
  return "Transaction";
}

function _relativeTime(value) {
  const ms = new Date(value || "").getTime();
  if (!Number.isFinite(ms)) return "";
  const diff = Date.now() - ms;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function _normalizeNotifItem(item) {
  if (!item || typeof item !== "object") return null;
  const id = String(item.id || "").trim();
  if (!id) return null;
  if (typeof item.title === "string" && typeof item.text === "string") {
    return {
      id,
      type: String(item.type || "info"),
      title: item.title,
      text: item.text,
      seen: !!item.seen,
      created_at: item.created_at || new Date().toISOString(),
    };
  }
  if (typeof item.text === "string") {
    return {
      id,
      type: "info",
      title: "Update",
      text: item.text,
      seen: !!item.seen,
      created_at: item.created_at || new Date().toISOString(),
    };
  }
  return null;
}

function _loadNotifItems() {
  const raw = _safeParse(localStorage.getItem(NOTIF_ITEMS_KEY), []);
  const items = Array.isArray(raw) ? raw.map(_normalizeNotifItem).filter(Boolean) : [];
  return items.slice(0, MAX_NOTIF_ITEMS);
}

function _saveNotifItems(items) {
  localStorage.setItem(NOTIF_ITEMS_KEY, JSON.stringify((items || []).slice(0, MAX_NOTIF_ITEMS)));
}

function _buildSnapshot(wallet, txs, reports) {
  const tx_status = {};
  for (const tx of Array.isArray(txs) ? txs : []) {
    if (tx?.reference) tx_status[String(tx.reference)] = _statusKey(tx.status);
  }
  const report_status = {};
  for (const report of Array.isArray(reports) ? reports : []) {
    if (report?.id != null) report_status[String(report.id)] = _statusKey(report.status);
  }
  return {
    wallet_balance: Number(wallet?.balance || 0),
    tx_status,
    report_status,
    updated_at: new Date().toISOString(),
  };
}

function AdminRouteGuard({ children, currentRole, onProfileSync, onAuthExpired }) {
  const cachedProfile = getProfile();
  const cachedIsAdmin =
    String(currentRole || "").toLowerCase() === "admin" ||
    String(cachedProfile?.role || "").toLowerCase() === "admin";
  const [checking, setChecking] = useState(!cachedIsAdmin);
  const [allowed, setAllowed] = useState(cachedIsAdmin);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!cachedIsAdmin) setChecking(true);
      try {
        const profile = await apiFetch("/auth/me");
        if (cancelled) return;
        const nextProfile = {
          full_name: profile?.full_name,
          email: profile?.email,
          role: profile?.role,
        };
        onProfileSync?.(nextProfile);
        setAllowed(String(profile?.role || "").toLowerCase() === "admin");
      } catch (err) {
        if (cancelled) return;
        if (err?.code === "AUTH_EXPIRED") {
          clearToken();
          onAuthExpired?.();
        }
        setAllowed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [onAuthExpired, onProfileSync]);

  if (checking && !allowed) {
    return (
      <section className="section">
        <div className="card">
          <div className="muted">Verifying admin access...</div>
        </div>
      </section>
    );
  }

  if (!allowed) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileState, setProfileState] = useState(getProfile());
  const [darkMode, setDarkMode] = useState(false);
  const [notifItems, setNotifItems] = useState(() => _loadNotifItems());
  const [notifSyncAt, setNotifSyncAt] = useState(null);
  const [notifSyncing, setNotifSyncing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const notifSyncRef = useRef(false);

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/wallet")) return "Wallet";
    if (path.startsWith("/data")) return "Buy Data";
    if (path.startsWith("/transactions")) return "Transactions";
    if (path.startsWith("/support")) return "Support";
    if (path.startsWith("/admin")) return "Admin";
    return "Dashboard";
  })();

  const unreadCount = useMemo(
    () => notifItems.filter((item) => !item?.seen).length,
    [notifItems]
  );

  useEffect(() => {
    // PWA install prompt (supported browsers only)
    const isStandalone = (() => {
      try {
        return (
          window.matchMedia?.("(display-mode: standalone)")?.matches ||
          window.navigator?.standalone === true
        );
      } catch {
        return false;
      }
    })();
    if (isStandalone) {
      setCanInstall(false);
      return;
    }

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setCanInstall(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return { outcome: "unavailable" };
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      setCanInstall(false);
      return choice || { outcome: "dismissed" };
    } catch {
      return { outcome: "dismissed" };
    }
  };

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.body.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchProfile();
      refreshNotifications({ bootstrap: true });
      const onboarded = localStorage.getItem("vtu_onboarded");
      if (!onboarded) {
        setShowOnboarding(true);
      }
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const timer = window.setInterval(() => {
      refreshNotifications({ silent: true });
    }, NOTIF_POLL_MS);
    return () => window.clearInterval(timer);
  }, [authenticated]);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch("/auth/me");
      setProfile({ full_name: data.full_name, email: data.email, role: data.role });
      setProfileState({ full_name: data.full_name, email: data.email, role: data.role });
    } catch (err) {
      if (err?.code === "AUTH_EXPIRED") {
        clearToken();
        setAuthenticated(false);
        setProfileState({});
      }
    }
  };

  const refreshNotifications = async ({ bootstrap = false, silent = false } = {}) => {
    if (!authenticated) return;
    if (notifSyncRef.current) return;
    notifSyncRef.current = true;
    if (!silent) setNotifSyncing(true);

    try {
      const [wallet, txs, reports] = await Promise.all([
        apiFetch("/wallet/me"),
        apiFetch("/transactions/me"),
        apiFetch("/transactions/reports/me").catch(() => []),
      ]);

      const currentSnapshot = _buildSnapshot(wallet, txs, reports);
      const previousSnapshot = _safeParse(localStorage.getItem(NOTIF_SNAPSHOT_KEY), null);

      if (!previousSnapshot || bootstrap) {
        localStorage.setItem(NOTIF_SNAPSHOT_KEY, JSON.stringify(currentSnapshot));
        if (notifItems.length === 0) {
          const base = [
            {
              id: "welcome",
              type: "info",
              title: "Welcome to AxisVTU",
              text: "Notifications are now active. We will alert you on wallet and purchase updates.",
              seen: false,
              created_at: new Date().toISOString(),
            },
            {
              id: `wallet-baseline:${Number(wallet?.balance || 0).toFixed(2)}`,
              type: "info",
              title: "Wallet Snapshot",
              text: `Current wallet balance: ₦ ${_toMoney(wallet?.balance || 0)}`,
              seen: false,
              created_at: new Date().toISOString(),
            },
          ];
          setNotifItems(base);
          _saveNotifItems(base);
        }
        setNotifSyncAt(new Date().toISOString());
        return;
      }

      const generated = [];
      const previousWallet = Number(previousSnapshot.wallet_balance || 0);
      const currentWallet = Number(wallet?.balance || 0);
      if (Number.isFinite(previousWallet) && Number.isFinite(currentWallet) && currentWallet > previousWallet) {
        const diff = currentWallet - previousWallet;
        generated.push({
          id: `wallet-credit:${currentWallet.toFixed(2)}`,
          type: "success",
          title: "Wallet Funded",
          text: `Your wallet was credited with ₦ ${_toMoney(diff)}.`,
          seen: false,
          created_at: new Date().toISOString(),
        });
      }

      const prevTxMap = previousSnapshot.tx_status || {};
      for (const tx of Array.isArray(txs) ? txs : []) {
        const reference = String(tx?.reference || "").trim();
        if (!reference) continue;
        const nextStatus = _statusKey(tx?.status);
        const prevStatus = _statusKey(prevTxMap[reference]);
        const txTypeName = _txTypeLabel(tx?.tx_type);

        if (!prevStatus && ["success", "failed", "refunded"].includes(nextStatus)) {
          const title =
            nextStatus === "success"
              ? `${txTypeName} Successful`
              : nextStatus === "refunded"
                ? `${txTypeName} Refunded`
                : `${txTypeName} Failed`;
          generated.push({
            id: `tx-new:${reference}:${nextStatus}`,
            type: nextStatus === "success" ? "success" : nextStatus === "refunded" ? "info" : "error",
            title,
            text: `Ref ${reference} • ₦ ${_toMoney(tx?.amount || 0)}`,
            seen: false,
            created_at: new Date().toISOString(),
          });
        } else if (prevStatus && prevStatus !== nextStatus && ["success", "failed", "refunded"].includes(nextStatus)) {
          const title =
            nextStatus === "success"
              ? `${txTypeName} Successful`
              : nextStatus === "refunded"
                ? `${txTypeName} Refunded`
                : `${txTypeName} Failed`;
          generated.push({
            id: `tx-update:${reference}:${nextStatus}`,
            type: nextStatus === "success" ? "success" : nextStatus === "refunded" ? "info" : "error",
            title,
            text: `Status changed from ${prevStatus.toUpperCase()} to ${nextStatus.toUpperCase()} • Ref ${reference}`,
            seen: false,
            created_at: new Date().toISOString(),
          });
        }
      }

      const prevReportMap = previousSnapshot.report_status || {};
      for (const report of Array.isArray(reports) ? reports : []) {
        const reportId = String(report?.id ?? "").trim();
        if (!reportId) continue;
        const prevStatus = _statusKey(prevReportMap[reportId]);
        const nextStatus = _statusKey(report?.status);
        const reference = String(report?.transaction_reference || "—");
        if (prevStatus && prevStatus !== nextStatus && ["resolved", "rejected"].includes(nextStatus)) {
          generated.push({
            id: `report:${reportId}:${nextStatus}`,
            type: nextStatus === "resolved" ? "success" : "warning",
            title: `Support Issue ${nextStatus === "resolved" ? "Resolved" : "Rejected"}`,
            text: `Report on ${reference} is now ${nextStatus.toUpperCase()}.`,
            seen: false,
            created_at: new Date().toISOString(),
          });
        }
      }

      if (generated.length > 0) {
        setNotifItems((prev) => {
          const seenIds = new Set(prev.map((item) => item.id));
          const fresh = generated.filter((item) => !seenIds.has(item.id));
          const merged = [...fresh, ...prev].slice(0, MAX_NOTIF_ITEMS);
          _saveNotifItems(merged);
          return merged;
        });
      }

      localStorage.setItem(NOTIF_SNAPSHOT_KEY, JSON.stringify(currentSnapshot));
      setNotifSyncAt(new Date().toISOString());
    } catch {
      // Keep previous notifications; auto-poll will retry.
    } finally {
      notifSyncRef.current = false;
      if (!silent) setNotifSyncing(false);
    }
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const profile = profileState || {};
  const fullName = profile.full_name || "User";
  const isAdmin = (profile.role || "").toLowerCase() === "admin";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem(NOTIF_ITEMS_KEY);
    localStorage.removeItem(NOTIF_SNAPSHOT_KEY);
    setNotifItems([]);
    setNotifSyncAt(null);
    setNotifSyncing(false);
    setProfileState({});
    setAuthenticated(false);
    setNotificationsOpen(false);
    // Ensure we exit any deep route immediately (e.g. /profile) when logging out.
    navigate("/", { replace: true });
  };

  return (
    <ToastProvider>
      <ToastHost />
      {!authenticated ? (
        <Routes>
          <Route
            path="/admin-login"
            element={
              <AdminLogin
                onAuth={(nextProfile) => {
                  if (nextProfile) {
                    setProfile(nextProfile);
                    setProfileState(nextProfile);
                  }
                  setAuthenticated(true);
                }}
              />
            }
          />
          <Route
            path="*"
            element={
              <Login
                onAuth={(nextProfile) => {
                  if (nextProfile) {
                    setProfile(nextProfile);
                    setProfileState(nextProfile);
                  }
                  setAuthenticated(true);
                }}
              />
            }
          />
        </Routes>
      ) : (
        <div className="app-shell">
          {showOnboarding && (
            <div className="onboard-overlay" role="dialog" aria-live="polite">
              <div className="onboard-card">
                <div className="onboard-title">Welcome to AxisVTU</div>
                <div className="onboard-sub">Your quick start checklist.</div>
                <div className="onboard-list">
                  <div className="onboard-item">
                    <span className="onboard-step">1</span>
                    <div>
                      <div className="label">Fund your wallet</div>
                      <div className="muted">Add funds via Paystack to start.</div>
                    </div>
                  </div>
                  <div className="onboard-item">
                    <span className="onboard-step">2</span>
                    <div>
                      <div className="label">Buy a data plan</div>
                      <div className="muted">Pick MTN or Glo and deliver instantly.</div>
                    </div>
                  </div>
                  <div className="onboard-item">
                    <span className="onboard-step">3</span>
                    <div>
                      <div className="label">Track receipts</div>
                      <div className="muted">View status and receipts in Transactions.</div>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="ghost" onClick={() => setShowOnboarding(false)}>Later</button>
                  <button
                    className="primary"
                    onClick={() => {
                      localStorage.setItem("vtu_onboarded", "true");
                      setShowOnboarding(false);
                    }}
                  >
                    Start Now
                  </button>
                </div>
              </div>
            </div>
          )}
          <Nav
            onLogout={handleLogout}
            isAdmin={isAdmin}
            canInstall={canInstall}
            onInstall={handleInstall}
          />
          <main className="main">
            <header className="topbar">
              <div className="top-left">
                {location.pathname === "/" ? (
                  <>
                    <div className="avatar">
                      <span>{initials}</span>
                    </div>
                    <div>
                      <div className="hello">Hi, {fullName}</div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="hello">{pageTitle}</div>
                    <div className="subtle">AxisVTU</div>
                  </div>
                )}
              </div>
              <div className="top-actions">
                <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 6.5v2.2M12 15.3v2.2M6.5 12h2.2M15.3 12h2.2M7.9 7.9l1.6 1.6M14.5 14.5l1.6 1.6M7.9 16.1l1.6-1.6M14.5 9.5l1.6-1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <div className="notif-wrap">
                  <button
                    className="icon-btn"
                    aria-label="Notifications"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                  >
                    {unreadCount > 0 && <span className="notif-dot" />}
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                    {unreadCount > 0 && (
                      <span className="notif-count">{unreadCount > 99 ? "99+" : unreadCount}</span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="notif-panel">
                      <div className="notif-head">
                        <div className="notif-title">Notifications</div>
                        <span className="pill">{unreadCount} unread</span>
                      </div>
                      <div className="notif-sub">
                        {notifSyncing
                          ? "Syncing..."
                          : notifSyncAt
                            ? `Updated ${_relativeTime(notifSyncAt)}`
                            : "Waiting for sync..."}
                      </div>
                      <div className="notif-actions-row">
                        <button
                          className="ghost notif-action-btn"
                          type="button"
                          onClick={() => {
                            setNotifItems((prev) => {
                              const next = prev.map((item) => ({ ...item, seen: true }));
                              _saveNotifItems(next);
                              return next;
                            });
                          }}
                          disabled={unreadCount === 0}
                        >
                          Mark all read
                        </button>
                        <button
                          className="ghost notif-action-btn"
                          type="button"
                          onClick={() => refreshNotifications({ silent: false })}
                          disabled={notifSyncing}
                        >
                          {notifSyncing ? "Refreshing..." : "Refresh"}
                        </button>
                      </div>
                      {notifItems.length === 0 ? (
                        <div className="notif-empty">No notifications yet.</div>
                      ) : (
                        notifItems.slice(0, 20).map((item) => (
                          <div className={`notif-item ${item.seen ? "" : "unread"}`} key={item.id}>
                            <div className="notif-item-head">
                              <span className={`notif-tag ${item.type || "info"}`}>{item.type || "info"}</span>
                              <span className="notif-time">{_relativeTime(item.created_at)}</span>
                            </div>
                            <div className="notif-item-title">{item.title}</div>
                            <div>{item.text}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/data" element={<Data />} />
              <Route path="/services" element={<Services />} />
              <Route path="/airtime" element={<Airtime />} />
              <Route path="/cable" element={<Cable />} />
              <Route path="/electricity" element={<Electricity />} />
              <Route path="/exam" element={<Exam />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/support" element={<Support />} />
              <Route
                path="/profile"
                element={
                  <Profile
                    onLogout={handleLogout}
                    onProfileUpdate={(next) => setProfileState(next)}
                    darkMode={darkMode}
                    onToggleTheme={toggleTheme}
                    canInstall={canInstall}
                    onInstall={handleInstall}
                  />
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRouteGuard
                    currentRole={profile.role}
                    onProfileSync={(next) => {
                      setProfile(next);
                      setProfileState(next);
                    }}
                    onAuthExpired={() => {
                      setProfileState({});
                      setAuthenticated(false);
                    }}
                  >
                    <Admin />
                  </AdminRouteGuard>
                }
              />
              <Route path="/admin-login" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </ToastProvider>
  );
}

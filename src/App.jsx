import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Nav from "./components/Nav.jsx";
import {
  apiFetch,
  getToken,
  clearToken,
  getProfile,
  getActiveAuthScope,
  setProfile,
  warmBackend,
  prefetchDataPageCache,
} from "./services/api";
import { ToastProvider } from "./context/toast.jsx";
import ToastHost from "./components/ToastHost.jsx";
import { applySeo } from "./utils/seo.js";
import { queryKeys } from "./query/client.js";

const Login = lazy(() => import("./pages/Login.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Wallet = lazy(() => import("./pages/Wallet.jsx"));
const Data = lazy(() => import("./pages/Data.jsx"));
const Services = lazy(() => import("./pages/Services.jsx"));
const Airtime = lazy(() => import("./pages/Airtime.jsx"));
const Cable = lazy(() => import("./pages/Cable.jsx"));
const Electricity = lazy(() => import("./pages/Electricity.jsx"));
const Exam = lazy(() => import("./pages/Exam.jsx"));
const Transactions = lazy(() => import("./pages/Transactions.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.jsx"));

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

function _announcementType(level) {
  const key = String(level || "").toLowerCase();
  if (key === "critical") return "error";
  if (key === "warning") return "warning";
  if (key === "success") return "success";
  return "info";
}

function _announcementSnapshotValue(item) {
  const id = String(item?.id ?? "").trim();
  if (!id) return "";
  const stamp =
    item?.updated_at ||
    item?.starts_at ||
    item?.ends_at ||
    item?.created_at ||
    "";
  return `${id}:${String(stamp)}`;
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

function _buildSnapshot(wallet, txs, reports, broadcasts) {
  const tx_status = {};
  for (const tx of Array.isArray(txs) ? txs : []) {
    if (tx?.reference) tx_status[String(tx.reference)] = _statusKey(tx.status);
  }
  const report_status = {};
  for (const report of Array.isArray(reports) ? reports : []) {
    if (report?.id != null) report_status[String(report.id)] = _statusKey(report.status);
  }
  const announcement_status = {};
  for (const item of Array.isArray(broadcasts) ? broadcasts : []) {
    const id = String(item?.id ?? "").trim();
    if (!id) continue;
    announcement_status[id] = _announcementSnapshotValue(item);
  }
  return {
    wallet_balance: Number(wallet?.balance || 0),
    tx_status,
    report_status,
    announcement_status,
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

function _deriveDisplayName(profile) {
  const fullName = String(profile?.full_name || "").trim();
  if (fullName) return fullName;
  const email = String(profile?.email || "").trim();
  if (email.includes("@")) {
    const local = email.split("@")[0].trim();
    if (local) return local;
  }
  return "User";
}

function AppPageFallback() {
  return (
    <section className="section">
      <div className="card">
        <div className="muted">Loading page…</div>
      </div>
    </section>
  );
}

function MobileMenuIcon({ type }) {
  if (type === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === "wallet") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h15a1 1 0 0 1 1 1v3h-6a2 2 0 0 0 0 4h6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14 13h6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === "data") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18c0-4 4-8 8-8s8 4 8 8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 18c0-3 3-6 6-6s6 3 6 6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 18c0-2 1.5-3.5 3-3.5S15 16 15 18" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === "services") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6.5a2 2 0 0 1 2-2h3.5a2 2 0 0 1 2 2V10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14.5 6.5a2 2 0 0 1 2-2H18a2 2 0 0 1 2 2V10a2 2 0 0 1-2 2h-1.5a2 2 0 0 1-2-2V6.5z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 15a2 2 0 0 1 2-2h3.5a2 2 0 0 1 2 2v2.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V15z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14.5 15a2 2 0 0 1 2-2H18a2 2 0 0 1 2 2v2.5a2 2 0 0 1-2 2h-1.5a2 2 0 0 1-2-2V15z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === "transactions") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16M4 12h10M4 17h13" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === "profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === "support") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9.6 9.7a2.4 2.4 0 1 1 4.1 1.8c-.6.6-1.4 1-1.7 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 17.2h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "admin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l8 3v6c0 4.4-3 7.7-8 9-5-1.3-8-4.6-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return null;
}

export default function App() {
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileState, setProfileState] = useState(getProfile());
  const [darkMode, setDarkMode] = useState(() => {
    try {
      if (typeof document !== "undefined" && document.body.classList.contains("dark")) return true;
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  const [notifItems, setNotifItems] = useState(() => _loadNotifItems());
  const [notifSyncAt, setNotifSyncAt] = useState(null);
  const [notifSyncing, setNotifSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authScopeRef = useRef(null);

  useEffect(() => {
    if (authenticated) {
      const appPageTitleMap = {
        "/": "Dashboard | AxisVTU",
        "/wallet": "Wallet | AxisVTU",
        "/data": "Buy Data | AxisVTU",
        "/airtime": "Buy Airtime | AxisVTU",
        "/cable": "Cable TV Subscription | AxisVTU",
        "/electricity": "Electricity Bills | AxisVTU",
        "/exam": "Exam PINs | AxisVTU",
        "/transactions": "Transaction History | AxisVTU",
        "/profile": "Profile | AxisVTU",
        "/support": "Help & Support | AxisVTU",
        "/admin": "Admin Dashboard | AxisVTU",
      };
      const title = appPageTitleMap[location.pathname] || "AxisVTU App";
      applySeo({
        title,
        description: "AxisVTU dashboard for instant data, airtime, cable TV and electricity payments with clear wallet and receipt tracking.",
        path: `/app${location.pathname === "/" ? "" : location.pathname}`,
        noindex: true,
      });
      return;
    }

    const path = location.pathname || "/";
    if (path === "/register") {
      applySeo({
        title: "Create AxisVTU Account | AxisVTU",
        description: "Create your AxisVTU account in minutes and start buying data, airtime, cable TV and electricity with a premium user flow.",
        path: "/app/register",
        keywords: "register axisvtu, create vtu account, nigeria data airtime app",
      });
      return;
    }
    if (path === "/reset-password") {
      applySeo({
        title: "Reset Password | AxisVTU",
        description: "Securely reset your AxisVTU password and continue transactions without losing account access.",
        path: "/app/reset-password",
        keywords: "axisvtu reset password, forgot password axisvtu",
      });
      return;
    }
    if (path === "/admin-login") {
      applySeo({
        title: "Admin Login | AxisVTU",
        description: "AxisVTU admin sign-in portal.",
        path: "/app/admin-login",
        noindex: true,
      });
      return;
    }
    applySeo({
      title: "Login to AxisVTU | AxisVTU",
      description: "Sign in to AxisVTU and manage wallet funding, data purchases, airtime topups and bill payments in one polished dashboard.",
      path: "/app/login",
      keywords: "axisvtu login, vtu dashboard login nigeria",
    });
  }, [authenticated, location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const notifSyncRef = useRef(false);

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/wallet")) return "Wallet";
    if (path.startsWith("/data")) return "Buy Data";
    if (path.startsWith("/airtime")) return "Buy Airtime";
    if (path.startsWith("/cable")) return "Cable TV";
    if (path.startsWith("/electricity")) return "Electricity";
    if (path.startsWith("/exam")) return "Exam PIN";
    if (path.startsWith("/transactions")) return "Transactions";
    if (path.startsWith("/support")) return "Support";
    if (path.startsWith("/profile")) return "Profile";
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
    // Pre-warm backend on app load to avoid cold-start delays.
    warmBackend(7000).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    const body = document.body;
    let locked = false;

    const lock = () => {
      if (locked) return;
      body.classList.add("overlay-open");
      body.style.overflow = "hidden";
      const isTouchDevice =
        (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
        ("ontouchstart" in window);
      if (!isTouchDevice) {
        const y = window.scrollY || 0;
        body.dataset.overlayLockY = String(y);
        body.style.position = "fixed";
        body.style.top = `-${y}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
      }
      locked = true;
    };

    const unlock = () => {
      if (!locked) return;
      const y = Number(body.dataset.overlayLockY || 0);
      body.classList.remove("overlay-open");
      delete body.dataset.overlayLockY;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      if (Number.isFinite(y) && y > 0) {
        window.scrollTo(0, y);
      }
      locked = false;
    };

    const syncLock = () => {
      const hasOverlay = !!document.querySelector(
        ".modal-backdrop, .success-screen, .purchase-loading-screen, .onboard-overlay, .mobile-menu-backdrop"
      );
      if (hasOverlay) lock();
      else unlock();
    };

    syncLock();
    const observer = new MutationObserver(() => syncLock());
    observer.observe(body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      unlock();
    };
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
    const nextScope = authenticated ? getActiveAuthScope() : null;
    if (authScopeRef.current !== nextScope) {
      queryClient.clear();
      authScopeRef.current = nextScope;
    }
  }, [authenticated, profileState?.email, profileState?.full_name, queryClient]);

  useEffect(() => {
    if (!authenticated) return undefined;

    const run = () => {
      prefetchDataPageCache().catch(() => {});
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboardSummary(getActiveAuthScope()),
        queryFn: () => apiFetch("/dashboard/summary", { _suppressRetryToast: true }),
        staleTime: 60 * 1000,
      });
      queryClient.prefetchQuery({
        queryKey: queryKeys.dataPlans(getActiveAuthScope()),
        queryFn: () => apiFetch("/data/plans", { _suppressRetryToast: true }),
        staleTime: 5 * 60 * 1000,
      });
      queryClient.prefetchQuery({
        queryKey: queryKeys.walletMe(getActiveAuthScope()),
        queryFn: () => apiFetch("/wallet/me", { _suppressRetryToast: true }),
        staleTime: 45 * 1000,
      });
    };

    // Defer cache warm-up to idle-time so we don't block first paint.
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(run, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(run, 260);
    return () => window.clearTimeout(timer);
  }, [authenticated, queryClient]);

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
        queryClient.clear();
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
      const [wallet, txs, reports, broadcasts] = await Promise.all([
        apiFetch("/wallet/me"),
        apiFetch("/transactions/me"),
        apiFetch("/transactions/reports/me").catch(() => []),
        apiFetch("/notifications/broadcast").catch(() => []),
      ]);

      const currentSnapshot = _buildSnapshot(wallet, txs, reports, broadcasts);
      const previousSnapshot = _safeParse(localStorage.getItem(NOTIF_SNAPSHOT_KEY), null);

      if (!previousSnapshot || bootstrap) {
        localStorage.setItem(NOTIF_SNAPSHOT_KEY, JSON.stringify(currentSnapshot));
        if (notifItems.length === 0) {
          const now = new Date().toISOString();
          const base = [
            {
              id: "welcome",
              type: "info",
              title: "Welcome to AxisVTU",
              text: "Notifications are now active. We will alert you on wallet and purchase updates.",
              seen: false,
              created_at: now,
            },
            {
              id: `wallet-baseline:${Number(wallet?.balance || 0).toFixed(2)}`,
              type: "info",
              title: "Wallet Snapshot",
              text: `Current wallet balance: ₦ ${_toMoney(wallet?.balance || 0)}`,
              seen: false,
              created_at: now,
            },
          ];
          const activeBroadcasts = Array.isArray(broadcasts) ? broadcasts.slice(0, 8) : [];
          for (const item of activeBroadcasts) {
            const id = String(item?.id ?? "").trim();
            const title = String(item?.title || "").trim();
            const message = String(item?.message || "").trim();
            if (!id || !title || !message) continue;
            base.unshift({
              id: `broadcast:${id}:${_announcementSnapshotValue(item)}`,
              type: _announcementType(item?.level),
              title,
              text: message,
              seen: false,
              created_at: item?.created_at || now,
            });
          }
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

      const prevAnnouncementMap = previousSnapshot.announcement_status || {};
      for (const item of Array.isArray(broadcasts) ? broadcasts : []) {
        const id = String(item?.id ?? "").trim();
        const title = String(item?.title || "").trim();
        const message = String(item?.message || "").trim();
        if (!id || !title || !message) continue;
        const nextValue = _announcementSnapshotValue(item);
        const prevValue = String(prevAnnouncementMap[id] || "");
        if (!prevValue || prevValue !== nextValue) {
          generated.push({
            id: `broadcast:${id}:${nextValue}`,
            type: _announcementType(item?.level),
            title,
            text: message,
            seen: false,
            created_at: item?.created_at || new Date().toISOString(),
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
  const fullName = _deriveDisplayName(profile);
  const initials = useMemo(() => {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (!parts.length) return "AX";
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  }, [fullName]);
  const isAdmin = (profile.role || "").toLowerCase() === "admin";
  const isDashboardRoute = location.pathname === "/";
  const mobileMenuItems = useMemo(() => {
    const base = [
      { path: "/", label: "Dashboard", icon: "dashboard", group: "general" },
      { path: "/wallet", label: "Fund Wallet", icon: "wallet", group: "general" },
      { path: "/data", label: "Buy Data", icon: "data", group: "general" },
      { path: "/services", label: "Services", icon: "services", group: "general" },
      { path: "/transactions", label: "Transactions", icon: "transactions", group: "manage" },
      { path: "/profile", label: "Profile", icon: "profile", group: "manage" },
      { path: "/support", label: "Support", icon: "support", group: "manage" },
    ];
    if (isAdmin) base.push({ path: "/admin", label: "Admin", icon: "admin", group: "manage" });
    return base;
  }, [isAdmin]);

  const handleLogout = () => {
    clearToken();
    queryClient.clear();
    authScopeRef.current = null;
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

  const handleAuthSuccess = (nextProfile) => {
    queryClient.clear();
    authScopeRef.current = getActiveAuthScope();
    if (nextProfile) {
      setProfile(nextProfile);
      setProfileState(nextProfile);
    }
    setAuthenticated(true);
  };

  const openMobileRoute = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <ToastProvider>
      <ToastHost />
      {!authenticated ? (
        <Suspense fallback={<AppPageFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to={`/login${location.search}`} replace />} />
            <Route
              path="/admin-login"
              element={
                <AdminLogin
                  onAuth={handleAuthSuccess}
                />
              }
            />
            <Route
              path="/login"
              element={
                <Login
                  modeRoute="login"
                  onAuth={handleAuthSuccess}
                />
              }
            />
            <Route
              path="/register"
              element={
                <Login
                  modeRoute="register"
                  onAuth={handleAuthSuccess}
                />
              }
            />
            <Route
              path="/reset-password"
              element={
                <Login
                  modeRoute="reset"
                  onAuth={handleAuthSuccess}
                />
              }
            />
            <Route
              path="*"
              element={<Navigate to={`/login${location.search}`} replace />}
            />
          </Routes>
        </Suspense>
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
            <header className={`topbar ${isDashboardRoute ? "topbar-dashboard" : ""}`}>
              <div className="top-left">
                {isDashboardRoute ? (
                  <div className="page-head dashboard-head">
                    <div className="eyebrow">AxisVTU</div>
                    <div className="hello">Dashboard</div>
                  </div>
                ) : (
                  <div>
                    <div className="hello">{pageTitle}</div>
                    <div className="subtle">AxisVTU</div>
                  </div>
                )}
              </div>
              <div className="top-actions">
                <button
                  className="icon-btn mobile-menu-btn"
                  aria-label="Open menu"
                  onClick={() => {
                    setMobileMenuOpen((prev) => !prev);
                    if (notificationsOpen) setNotificationsOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </button>
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
              {mobileMenuOpen && (
                <>
                  <button
                    className="mobile-menu-backdrop"
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <aside className="mobile-side-menu open" role="menu" aria-label="Main menu">
                    <div className="mobile-side-menu-head">
                      <div className="mobile-side-menu-brand">
                        <img src="/brand/axisvtu-icon.png" alt="AxisVTU" />
                        <span>AxisVTU</span>
                      </div>
                      <button
                        className="mobile-side-menu-close"
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        ×
                      </button>
                    </div>

                    <div className="mobile-side-user-card">
                      <span className="mobile-side-user-avatar">{initials || "AX"}</span>
                      <span className="mobile-side-user-meta">
                        <strong>{fullName}</strong>
                        <small>{isAdmin ? "ADMIN" : "SMART"}</small>
                      </span>
                    </div>

                    <div className="mobile-side-menu-section">GENERAL</div>
                    {mobileMenuItems
                      .filter((item) => item.group === "general")
                      .map((item) => (
                        <button
                          key={item.path}
                          className={`mobile-side-menu-item ${location.pathname === item.path ? "active" : ""}`}
                          type="button"
                          onClick={() => openMobileRoute(item.path)}
                        >
                          <span className="mobile-side-menu-item-icon"><MobileMenuIcon type={item.icon} /></span>
                          <span>{item.label}</span>
                        </button>
                      ))}

                    <div className="mobile-side-menu-section">MANAGEMENT</div>
                    {mobileMenuItems
                      .filter((item) => item.group === "manage")
                      .map((item) => (
                        <button
                          key={item.path}
                          className={`mobile-side-menu-item ${location.pathname === item.path ? "active" : ""}`}
                          type="button"
                          onClick={() => openMobileRoute(item.path)}
                        >
                          <span className="mobile-side-menu-item-icon"><MobileMenuIcon type={item.icon} /></span>
                          <span>{item.label}</span>
                        </button>
                      ))}

                  {canInstall && (
                    <button
                        className="mobile-side-menu-item"
                      type="button"
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await handleInstall?.();
                      }}
                    >
                        <span className="mobile-side-menu-item-icon">⬇</span>
                      Install App
                    </button>
                  )}
                  <button
                      className="mobile-side-menu-item danger"
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                      <span className="mobile-side-menu-item-icon">↩</span>
                    Logout
                  </button>
                  </aside>
                </>
              )}
            </header>
            <Suspense fallback={<AppPageFallback />}>
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
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      )}
    </ToastProvider>
  );
}

import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Wallet from "./pages/Wallet.jsx";
import Data from "./pages/Data.jsx";
import Transactions from "./pages/Transactions.jsx";
import Admin from "./pages/Admin.jsx";
import Profile from "./pages/Profile.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import { apiFetch, getToken, clearToken, getProfile, setProfile } from "./services/api";
import { ToastProvider } from "./context/toast.jsx";
import ToastHost from "./components/ToastHost.jsx";

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileState, setProfileState] = useState(getProfile());
  const [darkMode, setDarkMode] = useState(false);
  const [notifItems, setNotifItems] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/wallet")) return "Wallet";
    if (path.startsWith("/data")) return "Buy Data";
    if (path.startsWith("/transactions")) return "Transactions";
    if (path.startsWith("/admin")) return "Admin";
    return "Dashboard";
  })();

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
      fetchNotifications();
      const onboarded = localStorage.getItem("vtu_onboarded");
      if (!onboarded) {
        setShowOnboarding(true);
      }
    }
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

  const fetchNotifications = async () => {
    try {
      const [wallet, txs] = await Promise.all([
        apiFetch("/wallet/me"),
        apiFetch("/transactions/me"),
      ]);
      const recent = (txs || []).slice(0, 3).map((tx) => ({
        id: tx.reference,
        text: `${tx.tx_type} ${tx.status.toLowerCase()} — ₦ ${tx.amount}`,
      }));
      const base = [
        { id: "welcome", text: "Welcome to AxisVTU" },
        { id: "balance", text: `Wallet balance: ₦ ${wallet?.balance || "0.00"}` },
      ];
      setNotifItems([...base, ...recent]);
    } catch {
      setNotifItems([{ id: "welcome", text: "Welcome to AxisVTU" }]);
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
          <Route path="/admin-login" element={<AdminLogin onAuth={() => setAuthenticated(true)} />} />
          <Route path="*" element={<Login onAuth={() => setAuthenticated(true)} />} />
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
            {location.pathname === "/" && (
              <header className="topbar">
                <div className="top-left">
                  <div className="avatar">
                    <span>{initials}</span>
                  </div>
                  <div>
                    <div className="hello">Hi, {fullName}</div>
                  </div>
                </div>
                <div className="top-actions">
                  <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 6.5v2.2M12 15.3v2.2M6.5 12h2.2M15.3 12h2.2M7.9 7.9l1.6 1.6M14.5 14.5l1.6 1.6M7.9 16.1l1.6-1.6M14.5 9.5l1.6-1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <div className="notif-wrap">
                    <button className="icon-btn" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}>
                      <span className="notif-dot" />
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                    </button>
                    {notificationsOpen && (
                      <div className="notif-panel">
                        <div className="notif-title">Notifications</div>
                        {notifItems.map((item) => (
                          <div className="notif-item" key={item.id}>{item.text}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </header>
            )}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/data" element={<Data />} />
              <Route path="/transactions" element={<Transactions />} />
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
              <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
              <Route path="/admin-login" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </ToastProvider>
  );
}

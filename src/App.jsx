import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Wallet from "./pages/Wallet.jsx";
import Data from "./pages/Data.jsx";
import Transactions from "./pages/Transactions.jsx";
import Admin from "./pages/Admin.jsx";
import { getToken, clearToken, getProfile, setProfile } from "./services/api";

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileState, setProfileState] = useState(getProfile());
  const [darkMode, setDarkMode] = useState(false);

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
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.body.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchProfile();
    }
  }, [authenticated]);


  const fetchProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1"}/auth/me`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({ full_name: data.full_name, email: data.email });
        setProfileState({ full_name: data.full_name, email: data.email });
      }
    } catch {
      // ignore
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
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (!authenticated) {
    return <Login onAuth={() => setAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      <Nav onLogout={() => { clearToken(); setAuthenticated(false); }} />
      <main className="main">
        <header className="topbar">
          <div className="top-left">
            <div className="avatar">
              <span>{initials}</span>
            </div>
            <div>
              <div className="hello">Hi, {fullName}</div>
              <div className="subtle">AxisVTU</div>
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
                  <div className="notif-item">Welcome to AxisVTU 👋</div>
                  <div className="notif-item">Wallet funding enabled.</div>
                </div>
              )}
            </div>
            <a className="ghost" href="/landing/" target="_blank" rel="noreferrer">Marketing</a>
            <button className="primary" onClick={() => { clearToken(); setAuthenticated(false); }}>Logout</button>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/data" element={<Data />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}

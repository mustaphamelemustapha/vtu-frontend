import { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Wallet from "./pages/Wallet.jsx";
import Data from "./pages/Data.jsx";
import Transactions from "./pages/Transactions.jsx";
import Admin from "./pages/Admin.jsx";
import { getToken, clearToken, getProfile } from "./services/api";

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const location = useLocation();

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/wallet")) return "Wallet";
    if (path.startsWith("/data")) return "Buy Data";
    if (path.startsWith("/transactions")) return "Transactions";
    if (path.startsWith("/admin")) return "Admin";
    return "Dashboard";
  })();

  const profile = getProfile();
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
            <button className="icon-btn" aria-label="Toggle theme" onClick={() => document.body.classList.toggle("dark")}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 3a8 8 0 1 0 7 11.5A9 9 0 0 1 14 3z" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            </button>
            <button className="icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            </button>
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

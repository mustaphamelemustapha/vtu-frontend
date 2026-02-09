import { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Wallet from "./pages/Wallet.jsx";
import Data from "./pages/Data.jsx";
import Transactions from "./pages/Transactions.jsx";
import Admin from "./pages/Admin.jsx";
import { getToken, clearToken } from "./services/api";

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

  if (!authenticated) {
    return <Login onAuth={() => setAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      <Nav onLogout={() => { clearToken(); setAuthenticated(false); }} />
      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">MMTech VTU</div>
            <h1>{pageTitle}</h1>
          </div>
          <div className="top-actions">
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

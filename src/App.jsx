import { useState } from "react";
import { Routes, Route } from "react-router-dom";
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

  if (!authenticated) {
    return <Login onAuth={() => setAuthenticated(true)} />;
  }

  return (
    <div className="layout">
      <Nav onLogout={() => { clearToken(); setAuthenticated(false); }} />
      <main>
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

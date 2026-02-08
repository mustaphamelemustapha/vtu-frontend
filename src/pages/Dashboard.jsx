import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Dashboard() {
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
    apiFetch("/transactions/me").then(setTxs).catch(() => {});
  }, []);

  return (
    <div>
      <h2>Overview</h2>
      <div className="grid">
        <div className="card">
          <div className="label">Wallet Balance</div>
          <div className="value">₦ {wallet?.balance || "0.00"}</div>
        </div>
        <div className="card">
          <div className="label">Transactions</div>
          <div className="value">{txs.length}</div>
        </div>
        <div className="card">
          <div className="label">Status</div>
          <div className="value">Active</div>
        </div>
      </div>
    </div>
  );
}

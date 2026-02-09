import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function Dashboard() {
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
    apiFetch("/transactions/me").then(setTxs).catch(() => {});
  }, []);

  return (
    <div className="page">
      <section className="hero-card">
        <div>
          <div className="label">Wallet Balance</div>
          <div className="hero-value">₦ {wallet?.balance || "0.00"}</div>
          <div className="muted">Instant payments. Secure topups.</div>
        </div>
        <div className="hero-actions">
          <Link className="primary" to="/wallet">Fund Wallet</Link>
          <Link className="ghost" to="/data">Buy Data</Link>
        </div>
      </section>

      <section className="section">
        <h3>Quick Actions</h3>
        <div className="grid-2">
          <Link className="card action-card" to="/data">
            <div className="label">Buy Data</div>
            <div className="value">All Networks</div>
            <div className="muted">Fast, reliable delivery</div>
          </Link>
          <Link className="card action-card" to="/wallet">
            <div className="label">Fund Wallet</div>
            <div className="value">Paystack</div>
            <div className="muted">Card / Bank transfer</div>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h3>Recent Transactions</h3>
          <Link className="link" to="/transactions">View all</Link>
        </div>
        <div className="card-list">
          {txs.slice(0, 4).map((tx) => (
            <div className="list-card" key={tx.id}>
              <div>
                <div className="list-title">{tx.tx_type}</div>
                <div className="muted">{tx.reference}</div>
              </div>
              <div className="list-meta">
                <div className="value">₦ {tx.amount}</div>
                <span className={`pill ${tx.status}`}>{tx.status}</span>
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

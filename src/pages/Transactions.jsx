import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch("/transactions/me").then(setTxs).catch(() => {});
  }, []);

  const filtered = txs.filter((tx) => {
    const matchesFilter = filter === "all" ? true : tx.status === filter;
    const matchesQuery = query
      ? `${tx.reference} ${tx.tx_type}`.toLowerCase().includes(query.toLowerCase())
      : true;
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="page">
      <section className="section">
        <div className="card">
          <div className="filter-row">
            <input
              placeholder="Search by reference or type"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="pill-group">
              {["all", "success", "pending", "failed"].map((status) => (
                <button
                  key={status}
                  className={`pill ${filter === status ? "active" : ""}`}
                  onClick={() => setFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card-list">
          {filtered.map((tx) => (
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
          {filtered.length === 0 && (
            <div className="empty">No transactions found.</div>
          )}
        </div>
      </section>
    </div>
  );
}

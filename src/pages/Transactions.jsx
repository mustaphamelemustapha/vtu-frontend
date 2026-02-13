import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState("");

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

  const counts = {
    all: txs.length,
    success: txs.filter((t) => t.status === "SUCCESS").length,
    pending: txs.filter((t) => t.status === "PENDING").length,
    failed: txs.filter((t) => t.status === "FAILED").length,
  };

  return (
    <div className="page">
      <section className="section">
        <div className="stats-grid">
          <div className="card stat-card">
            <div className="label">All</div>
            <div className="value">{counts.all}</div>
          </div>
          <div className="card stat-card">
            <div className="label">Success</div>
            <div className="value">{counts.success}</div>
          </div>
          <div className="card stat-card">
            <div className="label">Pending</div>
            <div className="value">{counts.pending}</div>
          </div>
          <div className="card stat-card">
            <div className="label">Failed</div>
            <div className="value">{counts.failed}</div>
          </div>
        </div>
      </section>

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
            <button className="list-card" key={tx.id} type="button" onClick={() => setSelected(tx)}>
              <div>
                <div className="list-title">{tx.tx_type}</div>
                <div className="muted">{tx.reference}</div>
              </div>
              <div className="list-meta">
                <div className="value">₦ {tx.amount}</div>
                <span className={`pill ${tx.status}`}>{tx.status}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="empty">No transactions found.</div>
          )}
        </div>
      </section>

      {selected && (
        <div className="modal-backdrop">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <div>
                <div className="label">Transaction Receipt</div>
                <h3>{selected.tx_type}</h3>
              </div>
              <button className="ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="list-card">
                <div>
                  <div className="list-title">Reference</div>
                  <div className="muted">{selected.reference}</div>
                </div>
                <div className="list-meta">
                  <div className="value">₦ {selected.amount}</div>
                  <span className={`pill ${selected.status}`}>{selected.status}</span>
                </div>
              </div>
              <div className="receipt-grid">
                <div>
                  <div className="label">Network</div>
                  <div>{selected.network || "—"}</div>
                </div>
                <div>
                  <div className="label">Plan</div>
                  <div>{selected.data_plan_code || "—"}</div>
                </div>
                <div>
                  <div className="label">Type</div>
                  <div>{selected.tx_type}</div>
                </div>
                <div>
                  <div className="label">Status</div>
                  <div>{selected.status}</div>
                </div>
                <div>
                  <div className="label">External Ref</div>
                  <div>{selected.external_reference || "—"}</div>
                </div>
                <div>
                  <div className="label">Failure Reason</div>
                  <div>{selected.failure_reason || "—"}</div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(selected.reference || "");
                  setCopied("Reference copied");
                  setTimeout(() => setCopied(""), 1200);
                }}
              >
                Copy Reference
              </button>
              <button className="primary" onClick={() => setSelected(null)}>Done</button>
            </div>
            {copied && <div className="notice">{copied}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

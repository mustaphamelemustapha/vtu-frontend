import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch("/transactions/me").then(setTxs).catch(() => {});
  }, []);

  const statusKey = (value) => String(value || "").toLowerCase();
  const statusLabel = (value) => {
    const key = statusKey(value);
    if (key === "success") return "Success";
    if (key === "pending") return "Pending";
    if (key === "failed") return "Failed";
    if (key === "refunded") return "Refunded";
    return String(value || "—");
  };

  const typeKey = (value) => String(value || "").toLowerCase();
  const typeLabel = (tx) => {
    const t = typeKey(tx?.tx_type);
    if (t === "wallet_fund") return "Wallet Funding";
    if (t === "data") return "Data Purchase";
    if (t === "airtime") return "Airtime";
    if (t === "cable") return "Cable TV";
    if (t === "electricity") return "Electricity";
    if (t === "exam") return "Exam Pins";
    return String(tx?.tx_type || "Transaction");
  };

  const receiptFields = (tx) => {
    const meta = tx?.meta || {};
    const t = typeKey(tx?.tx_type);
    const fields = [];

    if (t === "data") {
      fields.push({ label: "Network", value: tx.network || "—" });
      fields.push({ label: "Plan", value: tx.data_plan_code || "—" });
    } else if (t === "airtime") {
      fields.push({ label: "Network", value: (meta.network || tx.network || "—").toString() });
      fields.push({ label: "Phone", value: meta.phone_number || meta.phone || "—" });
    } else if (t === "cable") {
      fields.push({ label: "Provider", value: meta.provider || tx.network || "—" });
      fields.push({ label: "Smartcard", value: meta.smartcard_number || meta.smartcard || "—" });
      fields.push({ label: "Package", value: meta.package_code || tx.data_plan_code || "—" });
    } else if (t === "electricity") {
      fields.push({ label: "Disco", value: meta.disco || tx.network || "—" });
      fields.push({ label: "Meter", value: meta.meter_number || meta.meter || "—" });
      fields.push({ label: "Meter Type", value: meta.meter_type || "—" });
      fields.push({ label: "Token", value: meta.token || "—" });
    } else if (t === "exam") {
      fields.push({ label: "Exam", value: meta.exam || tx.network || "—" });
      fields.push({ label: "Quantity", value: meta.quantity ?? "—" });
      const pins = Array.isArray(meta.pins) ? meta.pins.join(", ") : null;
      if (pins) fields.push({ label: "Pins", value: pins });
    }

    fields.push({ label: "Tx Type", value: typeLabel(tx) });
    fields.push({ label: "Status", value: statusLabel(tx.status) });
    fields.push({ label: "External Ref", value: tx.external_reference || "—" });
    fields.push({ label: "Failure Reason", value: tx.failure_reason || "—" });
    return fields;
  };

  const filtered = txs.filter((tx) => {
    const matchesFilter = filter === "all" ? true : statusKey(tx.status) === filter;
    const matchesQuery = query
      ? `${tx.reference} ${tx.tx_type}`.toLowerCase().includes(query.toLowerCase())
      : true;
    return matchesFilter && matchesQuery;
  });

  const counts = {
    all: txs.length,
    success: txs.filter((t) => statusKey(t.status) === "success").length,
    pending: txs.filter((t) => statusKey(t.status) === "pending").length,
    failed: txs.filter((t) => statusKey(t.status) === "failed").length,
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
                  {status === "all" ? "All" : statusLabel(status)}
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
                <div className="list-title">{typeLabel(tx)}</div>
                <div className="muted">{tx.reference}</div>
              </div>
              <div className="list-meta">
                <div className="value">₦ {tx.amount}</div>
                <span className={`pill ${statusKey(tx.status)}`}>{statusLabel(tx.status)}</span>
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
                <h3>{typeLabel(selected)}</h3>
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
                  <span className={`pill ${statusKey(selected.status)}`}>{statusLabel(selected.status)}</span>
                </div>
              </div>
              <div className="receipt-grid">
                {receiptFields(selected).map((item, idx) => (
                  <div key={`${item.label}-${idx}`}>
                    <div className="label">{item.label}</div>
                    <div>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(selected.reference || "");
                  showToast("Reference copied.", "success");
                }}
              >
                Copy Reference
              </button>
              <button className="primary" onClick={() => setSelected(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

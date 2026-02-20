import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

function statusKey(value) {
  return String(value || "").toLowerCase();
}

function statusLabel(value) {
  const key = statusKey(value);
  if (key === "open") return "Open";
  if (key === "resolved") return "Resolved";
  if (key === "rejected") return "Rejected";
  return String(value || "Unknown");
}

function typeLabel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "wallet_fund") return "Wallet Funding";
  if (key === "data") return "Data Purchase";
  if (key === "airtime") return "Airtime";
  if (key === "cable") return "Cable TV";
  if (key === "electricity") return "Electricity";
  if (key === "exam") return "Exam PIN";
  return String(value || "Transaction");
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

function formatAmount(value) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return String(value ?? "0.00");
  return num.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Support() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [reports, setReports] = useState([]);
  const [txByReference, setTxByReference] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [reportRows, txRows] = await Promise.all([
        apiFetch("/transactions/reports/me"),
        apiFetch("/transactions/me"),
      ]);
      const txMap = {};
      for (const tx of Array.isArray(txRows) ? txRows : []) {
        if (tx?.reference) txMap[tx.reference] = tx;
      }
      const sorted = [...(Array.isArray(reportRows) ? reportRows : [])].sort((a, b) => {
        const aOpen = statusKey(a?.status) === "open" ? 0 : 1;
        const bOpen = statusKey(b?.status) === "open" ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime();
      });
      setTxByReference(txMap);
      setReports(sorted);
    } catch (err) {
      showToast(err?.message || "Failed to load support reports.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((item) => statusKey(item?.status) === filter);
  }, [filter, reports]);

  const counts = useMemo(() => {
    return {
      all: reports.length,
      open: reports.filter((item) => statusKey(item?.status) === "open").length,
      resolved: reports.filter((item) => statusKey(item?.status) === "resolved").length,
      rejected: reports.filter((item) => statusKey(item?.status) === "rejected").length,
    };
  }, [reports]);

  return (
    <div className="page support-page">
      <section className="section">
        <div className="card support-head">
          <div>
            <div className="label">Support</div>
            <h3>My Reported Issues</h3>
            <div className="muted">Track all transaction issues and support updates in one place.</div>
          </div>
          <div className="support-head-actions">
            <button className="ghost" type="button" onClick={() => navigate("/transactions")}>
              Go to Transactions
            </button>
            <button className="primary" type="button" onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="stats-grid">
          <div className="card stat-card">
            <div className="label">All Reports</div>
            <div className="value">{counts.all}</div>
          </div>
          <div className="card stat-card">
            <div className="label">Open</div>
            <div className="value">{counts.open}</div>
          </div>
          <div className="card stat-card">
            <div className="label">Resolved</div>
            <div className="value">{counts.resolved}</div>
          </div>
          <div className="card stat-card">
            <div className="label">Rejected</div>
            <div className="value">{counts.rejected}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="pill-group">
            {["all", "open", "resolved", "rejected"].map((item) => (
              <button
                key={item}
                className={`pill ${filter === item ? "active" : ""}`}
                type="button"
                onClick={() => setFilter(item)}
              >
                {item === "all" ? "All" : statusLabel(item)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="support-list">
          {!loading &&
            filtered.map((report) => {
              const tx = txByReference[report.transaction_reference] || null;
              return (
                <div className="card support-item" key={report.id}>
                  <div className="support-item-head">
                    <div>
                      <div className="list-title">{typeLabel(report.tx_type)}</div>
                      <div className="muted">{report.transaction_reference}</div>
                    </div>
                    <div className="support-item-meta">
                      {tx?.amount != null && <div className="value">₦ {formatAmount(tx.amount)}</div>}
                      <span className={`pill ${statusKey(report.status)}`}>{statusLabel(report.status)}</span>
                    </div>
                  </div>

                  <div className="support-meta-grid">
                    <div>
                      <div className="label">Issue Type</div>
                      <div>{String(report.category || "other").replaceAll("_", " ")}</div>
                    </div>
                    <div>
                      <div className="label">Submitted</div>
                      <div>{formatDate(report.created_at)}</div>
                    </div>
                  </div>

                  <div className="support-reason">
                    <div className="label">Your Message</div>
                    <div>{report.reason || "—"}</div>
                  </div>

                  <div className="support-timeline">
                    <div className="support-event">
                      <span className="support-dot done" />
                      <div>
                        <div className="label">Issue submitted</div>
                        <div className="muted">{formatDate(report.created_at)}</div>
                      </div>
                    </div>
                    <div className="support-event">
                      <span className={`support-dot ${statusKey(report.status) === "open" ? "pending" : "done"}`} />
                      <div>
                        <div className="label">
                          {statusKey(report.status) === "open"
                            ? "Awaiting support review"
                            : `Issue ${statusLabel(report.status).toLowerCase()}`}
                        </div>
                        <div className="muted">
                          {statusKey(report.status) === "open"
                            ? "Support is reviewing your report."
                            : formatDate(report.resolved_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {report.admin_note && (
                    <div className="notice support-note">
                      <div className="label">Support Note</div>
                      <div>{report.admin_note}</div>
                    </div>
                  )}

                  <div className="modal-actions">
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(report.transaction_reference || "");
                        showToast("Reference copied.", "success");
                      }}
                    >
                      Copy Reference
                    </button>
                    <button className="ghost" type="button" onClick={() => navigate("/transactions")}>
                      Open Receipt
                    </button>
                  </div>
                </div>
              );
            })}

          {!loading && filtered.length === 0 && (
            <div className="card">
              <div className="empty">No reports found for this filter.</div>
              <div className="modal-actions">
                <button className="primary" type="button" onClick={() => navigate("/transactions")}>
                  View Transactions
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

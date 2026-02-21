import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Transactions() {
  const navigate = useNavigate();
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [reportsByReference, setReportsByReference] = useState({});
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [reportedRefs, setReportedRefs] = useState(() => new Set());
  const [reportForm, setReportForm] = useState({
    category: "delivery_issue",
    reason: "",
  });
  const receiptCaptureRef = useRef(null);
  const { showToast } = useToast();

  const buildReportMap = (rows) => {
    const map = {};
    for (const row of Array.isArray(rows) ? rows : []) {
      const ref = String(row?.transaction_reference || "").trim();
      if (!ref) continue;
      if (!map[ref]) map[ref] = row;
    }
    return map;
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiFetch("/transactions/me"),
      apiFetch("/transactions/reports/me").catch(() => []),
    ])
      .then(([rows, reports]) => {
        if (!mounted) return;
        const items = Array.isArray(rows) ? rows : [];
        const reportMap = buildReportMap(reports);
        setTxs(items);
        setReportsByReference(reportMap);
        setReportedRefs(
          new Set(
            items
              .filter(
                (item) =>
                  item?.has_open_report ||
                  statusKey(reportMap[item.reference]?.status) === "open"
              )
              .map((item) => item.reference)
          )
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
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
  const getReportForTx = (tx) => reportsByReference[String(tx?.reference || "")] || null;
  const hasOpenReport = (tx) =>
    Boolean(
      (tx && tx.has_open_report) ||
      statusKey(getReportForTx(tx)?.status) === "open" ||
      (tx?.reference && reportedRefs.has(tx.reference))
    );
  const formatAmount = (value) => {
    const num = Number(value ?? 0);
    if (Number.isNaN(num)) return String(value ?? "0.00");
    return num.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  const formatDateTime = (value) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return String(value);
    }
  };
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

  const metaSearchText = (value) => {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(metaSearchText).join(" ");
    if (typeof value === "object") return Object.values(value).map(metaSearchText).join(" ");
    return String(value);
  };

  const filtered = txs.filter((tx) => {
    const matchesFilter = filter === "all" ? true : statusKey(tx.status) === filter;
    const queryNeedle = String(query || "").trim().toLowerCase();
    const haystack = [
      tx.reference,
      tx.tx_type,
      tx.network,
      tx.data_plan_code,
      tx.external_reference,
      tx.failure_reason,
      metaSearchText(tx.meta),
    ]
      .map((item) => String(item || "").toLowerCase())
      .join(" ");
    const matchesQuery = queryNeedle ? haystack.includes(queryNeedle) : true;
    return matchesFilter && matchesQuery;
  });

  const counts = {
    all: txs.length,
    success: txs.filter((t) => statusKey(t.status) === "success").length,
    pending: txs.filter((t) => statusKey(t.status) === "pending").length,
    failed: txs.filter((t) => statusKey(t.status) === "failed").length,
  };

  const openReportModal = () => {
    if (!selected?.reference) return;
    setReportForm({ category: "delivery_issue", reason: "" });
    setReportOpen(true);
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!selected?.reference) return;
    if (!String(reportForm.reason || "").trim()) {
      showToast("Please provide a short reason.", "error");
      return;
    }
    setReportBusy(true);
    try {
      await apiFetch(`/transactions/${encodeURIComponent(selected.reference)}/report`, {
        method: "POST",
        body: JSON.stringify({
          category: reportForm.category,
          reason: reportForm.reason,
        }),
      });
      const latestReport = await apiFetch("/transactions/reports/me")
        .then((rows) => buildReportMap(rows)[selected.reference] || null)
        .catch(() => null);
      showToast("Issue reported successfully. Support will review it.", "success");
      setReportedRefs((prev) => {
        const next = new Set(prev);
        next.add(selected.reference);
        return next;
      });
      if (latestReport) {
        setReportsByReference((prev) => ({ ...prev, [selected.reference]: latestReport }));
      }
      setTxs((prev) =>
        prev.map((tx) =>
          tx.reference === selected.reference ? { ...tx, has_open_report: true } : tx
        )
      );
      setSelected((prev) => (prev ? { ...prev, has_open_report: true } : prev));
      setReportOpen(false);
    } catch (err) {
      showToast(err?.message || "Failed to submit report.", "error");
    } finally {
      setReportBusy(false);
    }
  };

  const downloadReceipt = async () => {
    if (!selected || !receiptCaptureRef.current) return;
    setDownloadBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(receiptCaptureRef.current, {
        scale: 2,
        backgroundColor: "#f4f7fb",
        useCORS: true,
        logging: false,
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const renderWidth = canvas.width * ratio;
      const renderHeight = canvas.height * ratio;
      const x = (pageWidth - renderWidth) / 2;
      const y = margin;
      pdf.addImage(imageData, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");

      const safeReference = String(selected.reference || "transaction").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`axisvtu-receipt-${safeReference}.pdf`);
      showToast("Receipt downloaded successfully.", "success");
    } catch {
      showToast("Failed to download receipt. Please try again.", "error");
    } finally {
      setDownloadBusy(false);
    }
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
              placeholder="Search by reference, type, phone, meter, smartcard..."
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
              <button className="pill" type="button" onClick={() => navigate("/support")}>
                Support Desk
              </button>
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
                <div className="value">₦ {formatAmount(tx.amount)}</div>
                <div className="tx-pill-stack">
                  <span className={`pill ${statusKey(tx.status)}`}>{statusLabel(tx.status)}</span>
                  {getReportForTx(tx) && (
                    <span className={`pill ${statusKey(getReportForTx(tx)?.status)}`}>
                      Issue {statusLabel(getReportForTx(tx)?.status)}
                    </span>
                  )}
                  {!getReportForTx(tx) && hasOpenReport(tx) && (
                    <span className="pill warning">Issue Reported</span>
                  )}
                </div>
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
                  <div className="muted">{formatDateTime(selected.created_at)}</div>
                </div>
                <div className="list-meta">
                  <div className="value">₦ {formatAmount(selected.amount)}</div>
                  <span className={`pill ${statusKey(selected.status)}`}>{statusLabel(selected.status)}</span>
                </div>
              </div>
              {hasOpenReport(selected) && (
                <div className="notice info">
                  You have an active issue report for this transaction. Support will follow up.
                </div>
              )}
              {getReportForTx(selected) && (
                <div className="notice info">
                  <strong>Issue Status:</strong> {statusLabel(getReportForTx(selected)?.status)}
                  {getReportForTx(selected)?.admin_note
                    ? ` • Note: ${getReportForTx(selected)?.admin_note}`
                    : ""}
                </div>
              )}
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
              <button className="primary" onClick={downloadReceipt} disabled={downloadBusy}>
                {downloadBusy ? "Preparing..." : "Download Receipt"}
              </button>
              <button
                className="ghost"
                onClick={openReportModal}
                disabled={hasOpenReport(selected)}
                title={hasOpenReport(selected) ? "Issue already reported" : "Report issue"}
              >
                {hasOpenReport(selected) ? "Issue Reported" : "Report Issue"}
              </button>
              <button
                className="ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(selected.reference || "");
                  showToast("Reference copied.", "success");
                }}
              >
                Copy Reference
              </button>
              <button className="ghost" onClick={() => setSelected(null)}>Done</button>
            </div>
          </div>
          <div className="receipt-capture-layer" aria-hidden="true">
            <div className="receipt-sheet" ref={receiptCaptureRef}>
              <div className="receipt-sheet-header">
                <img src="/brand/axisvtu-logo.svg" alt="AxisVTU" />
                <div>
                  <div className="label">AxisVTU Official Receipt</div>
                  <h4>{typeLabel(selected)}</h4>
                </div>
                <span className={`pill ${statusKey(selected.status)}`}>{statusLabel(selected.status)}</span>
              </div>

              <div className="receipt-sheet-total">
                <div className="label">Amount Paid</div>
                <div className="value">₦ {formatAmount(selected.amount)}</div>
              </div>

              <div className="receipt-sheet-grid">
                <div>
                  <div className="label">Reference</div>
                  <div>{selected.reference || "—"}</div>
                </div>
                <div>
                  <div className="label">Date</div>
                  <div>{formatDateTime(selected.created_at)}</div>
                </div>
                {receiptFields(selected).map((item, idx) => (
                  <div key={`${item.label}-${idx}`}>
                    <div className="label">{item.label}</div>
                    <div>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="receipt-sheet-footer">
                <div>Generated by AxisVTU</div>
                <div>{new Date().toLocaleString("en-NG")}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportOpen && selected && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="label">Report Transaction Issue</div>
                <h3>{selected.reference}</h3>
              </div>
              <button className="ghost" onClick={() => setReportOpen(false)} disabled={reportBusy}>
                Close
              </button>
            </div>
            <form className="form-grid" onSubmit={submitReport}>
              <label>
                Issue Type
                <select
                  value={reportForm.category}
                  onChange={(e) => setReportForm((prev) => ({ ...prev, category: e.target.value }))}
                  disabled={reportBusy}
                >
                  <option value="delivery_issue">Delivery issue</option>
                  <option value="wrong_recipient">Wrong recipient</option>
                  <option value="duplicate_charge">Duplicate charge</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                What happened?
                <textarea
                  rows={4}
                  placeholder="Example: Data purchase was marked successful but I did not receive it."
                  value={reportForm.reason}
                  onChange={(e) => setReportForm((prev) => ({ ...prev, reason: e.target.value }))}
                  disabled={reportBusy}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setReportOpen(false)}
                  disabled={reportBusy}
                >
                  Cancel
                </button>
                <button className="primary" type="submit" disabled={reportBusy}>
                  {reportBusy ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

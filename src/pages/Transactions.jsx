import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { downloadReceiptPdf } from "../services/receiptDownload";
import { useToast } from "../context/toast.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";

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
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
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

  const applyFetchedRows = useCallback((rows, reports) => {
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
    setSelected((prev) => {
      if (!prev?.reference) return prev;
      const latest = items.find((item) => item.reference === prev.reference);
      return latest || prev;
    });
    setLastSyncedAt(new Date().toISOString());
  }, []);

  const refreshTransactions = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setRefreshBusy(true);
      try {
        const [rows, reports] = await Promise.all([
          apiFetch("/transactions/me"),
          apiFetch("/transactions/reports/me").catch(() => []),
        ]);
        applyFetchedRows(rows, reports);
      } finally {
        if (!silent) setRefreshBusy(false);
      }
    },
    [applyFetchedRows]
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiFetch("/transactions/me"),
      apiFetch("/transactions/reports/me").catch(() => []),
    ])
      .then(([rows, reports]) => {
        if (!mounted) return;
        applyFetchedRows(rows, reports);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [applyFetchedRows]);

  useEffect(() => {
    if (!liveRefresh) return undefined;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      refreshTransactions({ silent: true }).catch(() => {});
    }, 20000);
    return () => clearInterval(timer);
  }, [liveRefresh, refreshTransactions]);
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

  const receiptStatusTitle = (tx) => {
    const key = statusKey(tx?.status);
    if (key === "success") return "Purchase Successful";
    if (key === "pending") return "Purchase Pending";
    if (key === "failed") return "Purchase Failed";
    return "Transaction Receipt";
  };

  const receiptStatusSymbol = (tx) => {
    const key = statusKey(tx?.status);
    if (key === "success") return "✓";
    if (key === "pending") return "…";
    if (key === "failed") return "!";
    return "•";
  };

  const receiptFields = (tx) => {
    const meta = tx?.meta || {};
    const t = typeKey(tx?.tx_type);
    const fields = [];

    if (t === "data") {
      fields.push({ label: "Network", value: tx.network || "—" });
      fields.push({ label: "Plan", value: tx.data_plan_code || "—" });
      fields.push({ label: "Recipient", value: meta.recipient_phone || "—" });
    } else if (t === "airtime") {
      fields.push({ label: "Network", value: (meta.network || tx.network || "—").toString() });
      fields.push({ label: "Phone", value: meta.phone_number || meta.phone || "—" });
    } else if (t === "cable") {
      fields.push({ label: "Provider", value: meta.provider || tx.network || "—" });
      fields.push({ label: "Smartcard", value: meta.smartcard_number || meta.smartcard || "—" });
      fields.push({ label: "Phone", value: meta.phone_number || meta.phone || "—" });
      fields.push({ label: "Package", value: meta.package_code || tx.data_plan_code || "—" });
    } else if (t === "electricity") {
      fields.push({ label: "Disco", value: meta.disco || tx.network || "—" });
      fields.push({ label: "Meter", value: meta.meter_number || meta.meter || "—" });
      fields.push({ label: "Phone", value: meta.phone_number || meta.phone || "—" });
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

  const transactionReceiptRows = (tx) => {
    const rows = [
      { label: "Time", value: formatDateTime(tx?.created_at) },
      { label: "Reference", value: tx?.reference || "—" },
      { label: "Amount", value: `₦ ${formatAmount(tx?.amount)}` },
    ];
    const extras = receiptFields(tx).filter((item) => {
      const label = String(item?.label || "");
      const value = String(item?.value || "").trim();
      if (!label) return false;
      if (label === "Status" || label === "Tx Type") return false;
      return value && value !== "—";
    });
    return [...rows, ...extras];
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
      const safeReference = String(selected.reference || "transaction").replace(/[^a-zA-Z0-9_-]/g, "_");
      await downloadReceiptPdf({
        sourceNode: receiptCaptureRef.current,
        fileName: `axisvtu-receipt-${safeReference}.pdf`,
      });
      showToast("Receipt downloaded successfully.", "success");
    } catch (err) {
      console.error("Receipt download failed:", err);
      showToast("Failed to download receipt. Please try again.", "error");
    } finally {
      setDownloadBusy(false);
    }
  };

  return (
    <div className="page transactions-page">
      <section className="hero-card service-hero service-hero-transactions">
        <div>
          <div className="label">Transactions</div>
          <div className="hero-value">Receipt & Status Center</div>
          <div className="muted">
            Track every debit and credit, monitor live status, and download polished receipts instantly.
          </div>
        </div>
        <div className="hero-actions">
          <Button variant="ghost" type="button" onClick={() => navigate("/support")}>Support</Button>
          <Button type="button" onClick={() => navigate("/wallet")}>Wallet</Button>
        </div>
      </section>

      <section className="section">
        <Card className="tx-live-card">
          <div>
            <div className="label">Live Status Tracking</div>
            <div className="muted">
              {liveRefresh ? "Auto-refresh runs every 20 seconds." : "Auto-refresh is paused."}
              {lastSyncedAt
                ? ` Last sync: ${new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}.`
                : ""}
            </div>
          </div>
          <div className="tx-live-actions">
            <Button variant="ghost" type="button" onClick={() => refreshTransactions()} disabled={refreshBusy}>
              {refreshBusy ? "Refreshing..." : "Refresh Now"}
            </Button>
            <button
              className={`pill ${liveRefresh ? "active" : ""}`}
              type="button"
              onClick={() => setLiveRefresh((prev) => !prev)}>
              {liveRefresh ? "Live On" : "Live Off"}
            </button>
          </div>
        </Card>
      </section>

      <section className="section">
        <div className="stats-grid">
          <Card className="stat-card">
            <div className="label">All</div>
            <div className="value">{counts.all}</div>
          </Card>
          <Card className="stat-card">
            <div className="label">Success</div>
            <div className="value">{counts.success}</div>
          </Card>
          <Card className="stat-card">
            <div className="label">Pending</div>
            <div className="value">{counts.pending}</div>
          </Card>
          <Card className="stat-card">
            <div className="label">Failed</div>
            <div className="value">{counts.failed}</div>
          </Card>
        </div>
      </section>

      <section className="section">
        <Card>
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
                  onClick={() => setFilter(status)}>
                  {status === "all" ? "All" : statusLabel(status)}
                </button>
              ))}
              <button className="pill" type="button" onClick={() => navigate("/support")}>
                Support Desk
              </button>
            </div>
          </div>
        </Card>
      </section>

      <section className="section">
        <div className="card-list">
          {filtered.map((tx) => (
            <button className="list-card tx-list-item" key={tx.id} type="button" onClick={() => setSelected(tx)}>
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
              <div className="label">Transaction Receipt</div>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </div>
            <div className="modal-body">
              <div className="tx-receipt-hero">
                <div
                  className={`tx-receipt-icon ${
                    statusKey(selected.status) === "success"
                      ? "success"
                      : statusKey(selected.status) === "pending"
                        ? "pending"
                        : "failed"
                  }`}>
                  {receiptStatusSymbol(selected)}
                </div>
                <h3 className="tx-receipt-title">{receiptStatusTitle(selected)}</h3>
              </div>
              <div className="tx-receipt-card">
                <div className="tx-receipt-card-top">
                  <div className="tx-receipt-card-name">Transfer Receipt</div>
                  <span className={`pill ${statusKey(selected.status)}`}>{statusLabel(selected.status)}</span>
                </div>
                <div className="tx-receipt-card-rows">
                  {transactionReceiptRows(selected).map((item, idx) => (
                    <div className="tx-receipt-row" key={`${item.label}-${idx}`}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
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
            </div>
            <div className="modal-actions">
              <Button onClick={downloadReceipt} disabled={downloadBusy}>
                {downloadBusy ? "Preparing..." : "Download Receipt"}
              </Button>
              <Button variant="ghost" onClick={openReportModal}
                disabled={hasOpenReport(selected)}
                title={hasOpenReport(selected) ? "Issue already reported" : "Report issue"}>
                {hasOpenReport(selected) ? "Issue Reported" : "Report Issue"}
              </Button>
              <Button variant="ghost" onClick={() => {
                  navigator.clipboard?.writeText(selected.reference || "");
                  showToast("Reference copied.", "success");
                }}>
                Copy Reference
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>Done</Button>
            </div>
          </div>
          <div className="receipt-capture-layer" aria-hidden="true">
            <div className="receipt-sheet receipt-sheet-transfer" ref={receiptCaptureRef}>
              <div className="tx-receipt-hero">
                <div
                  className={`tx-receipt-icon ${
                    statusKey(selected.status) === "success"
                      ? "success"
                      : statusKey(selected.status) === "pending"
                        ? "pending"
                        : "failed"
                  }`}>
                  {receiptStatusSymbol(selected)}
                </div>
                <h3 className="tx-receipt-title">{receiptStatusTitle(selected)}</h3>
              </div>
              <div className="tx-receipt-card">
                <div className="tx-receipt-card-top">
                  <div className="tx-receipt-card-name">Transfer Receipt</div>
                  <span className={`pill ${statusKey(selected.status)}`}>{statusLabel(selected.status)}</span>
                </div>
                <div className="tx-receipt-card-rows">
                  {transactionReceiptRows(selected).map((item, idx) => (
                    <div className="tx-receipt-row" key={`${item.label}-${idx}`}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
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
              <Button variant="ghost" onClick={() => setReportOpen(false)} disabled={reportBusy}>
                Close
              </Button>
            </div>
            <form className="form-grid" onSubmit={submitReport}>
              <label>
                Issue Type
                <select
                  value={reportForm.category}
                  onChange={(e) => setReportForm((prev) => ({ ...prev, category: e.target.value }))}
                  disabled={reportBusy}>
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
                <Button variant="ghost" type="button"
                  onClick={() => setReportOpen(false)}
                  disabled={reportBusy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={reportBusy}>
                  {reportBusy ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

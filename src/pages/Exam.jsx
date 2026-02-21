import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { loadBeneficiaries, removeBeneficiary, saveBeneficiary } from "../services/beneficiaries";
import { useToast } from "../context/toast.jsx";

const MIN_PURCHASE_LOADING_MS = 1200;

export default function Exam() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ exam: "waec", quantity: 1, phone_number: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [renderReceiptSheet, setRenderReceiptSheet] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const receiptCaptureRef = useRef(null);

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
    apiFetch("/services/catalog").then(setCatalog).catch(() => {});
    setBeneficiaries(loadBeneficiaries("exam"));
  }, []);

  const validate = () => {
    const nextErrors = {};
    const exam = String(form.exam || "").trim().toLowerCase();
    const quantity = Number(form.quantity);
    const phoneNumber = String(form.phone_number || "").replace(/\D/g, "");

    if (!exam) nextErrors.exam = "Select an exam type.";
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      nextErrors.quantity = "Quantity must be between 1 and 10.";
    }
    if (phoneNumber && (phoneNumber.length < 10 || phoneNumber.length > 15)) {
      nextErrors.phone_number = "Enter a valid phone number or leave blank.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;
    return {
      exam,
      quantity,
      phone_number: phoneNumber || null,
    };
  };

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

  const statusKey = (value) => String(value || "").toLowerCase();
  const statusLabel = (value) => {
    const key = statusKey(value);
    if (key === "success") return "Success";
    if (key === "pending") return "Pending";
    if (key === "failed") return "Failed";
    return String(value || "—");
  };

  const buy = async (e) => {
    e.preventDefault();
    const payload = validate();
    if (!payload) return;
    const startedAt = Date.now();
    setLoading(true);
    try {
      const res = await apiFetch("/services/exam/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const estimatedAmount = Number(res.amount ?? payload.quantity * 2000);
      setPurchaseResult({
        ok: true,
        reference: res.reference || `AXIS-EXAM-${Date.now()}`,
        status: res.status || "success",
        created_at: res.created_at || new Date().toISOString(),
        exam: payload.exam,
        quantity: payload.quantity,
        phone_number: payload.phone_number,
        pins: Array.isArray(res.pins) ? res.pins : [],
        amount: estimatedAmount,
        failure_reason: "",
      });
      setBeneficiaries(
        saveBeneficiary("exam", {
          label: payload.phone_number || `${payload.exam.toUpperCase()} x${payload.quantity}`,
          subtitle: `${payload.exam.toUpperCase()} • Qty ${payload.quantity}`,
          fields: {
            exam: payload.exam,
            quantity: String(payload.quantity),
            phone_number: payload.phone_number || "",
          },
        })
      );
      showToast("Pins generated.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      const message = err?.message || "Purchase failed.";
      setPurchaseResult({
        ok: false,
        reference: `AXIS-EXAM-ATTEMPT-${Date.now()}`,
        status: "failed",
        created_at: new Date().toISOString(),
        exam: payload.exam,
        quantity: payload.quantity,
        phone_number: payload.phone_number,
        pins: [],
        amount: Number(payload.quantity) * 2000,
        failure_reason: message,
      });
      showToast(message, "error");
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_PURCHASE_LOADING_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_PURCHASE_LOADING_MS - elapsed));
      }
      setLoading(false);
    }
  };

  const copyPins = async () => {
    try {
      const value = (purchaseResult?.pins || []).join("\n");
      await navigator.clipboard?.writeText(value);
      showToast("Pins copied.", "success");
    } catch {
      showToast("Copy failed.", "error");
    }
  };

  const downloadReceipt = async () => {
    if (!purchaseResult) return;
    setDownloadBusy(true);
    setRenderReceiptSheet(true);
    try {
      await new Promise((resolve) => {
        if (typeof window !== "undefined" && window.requestAnimationFrame) {
          window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
        } else {
          setTimeout(resolve, 16);
        }
      });
      if (!receiptCaptureRef.current) throw new Error("receipt_capture_unavailable");
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

      const safeReference = String(purchaseResult.reference || "exam").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`axisvtu-exam-receipt-${safeReference}.pdf`);
      showToast("Receipt downloaded successfully.", "success");
    } catch {
      showToast("Failed to download receipt. Please try again.", "error");
    } finally {
      setRenderReceiptSheet(false);
      setDownloadBusy(false);
    }
  };

  const saveCurrentBeneficiary = () => {
    const phoneNumber = String(form.phone_number || "").replace(/\D/g, "");
    if (phoneNumber && (phoneNumber.length < 10 || phoneNumber.length > 15)) {
      showToast("Phone number is invalid.", "error");
      return;
    }
    const examType = String(form.exam || "").toLowerCase();
    if (!examType) {
      showToast("Select exam type first.", "error");
      return;
    }
    setBeneficiaries(
      saveBeneficiary("exam", {
        label: phoneNumber || `${examType.toUpperCase()} x${Number(form.quantity || 1)}`,
        subtitle: `${examType.toUpperCase()} • Qty ${Number(form.quantity || 1)}`,
        fields: {
          exam: examType,
          quantity: String(form.quantity || 1),
          phone_number: phoneNumber,
        },
      })
    );
    showToast("Beneficiary saved.", "success");
  };

  const applyBeneficiary = (item) => {
    const fields = item?.fields || {};
    setForm((prev) => ({
      ...prev,
      exam: String(fields.exam || prev.exam || "waec").toLowerCase(),
      quantity: fields.quantity ? Number(fields.quantity) || prev.quantity : prev.quantity,
      phone_number: String(fields.phone_number || prev.phone_number || ""),
    }));
    showToast("Beneficiary applied.", "success");
  };

  const removeSavedBeneficiary = (id) => {
    setBeneficiaries(removeBeneficiary("exam", id));
    showToast("Beneficiary removed.", "success");
  };

  const exams = catalog?.exam_types || ["waec", "neco", "jamb"];

  return (
    <div className="page">
      <section className="hero-card">
        <div>
          <div className="label">Exam Pins</div>
          <div className="hero-value">Buy Pins</div>
          <div className="muted">Purchase securely. Copy pins instantly. Keep receipts in history.</div>
        </div>
        <div className="hero-actions">
          <button className="ghost" type="button" onClick={() => navigate("/services")}>All Services</button>
          <button className="primary" type="button" onClick={() => navigate("/wallet")}>Fund Wallet</button>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="section-head">
            <h3>Buy Exam Pins</h3>
            <span className="muted">Balance: ₦ {wallet?.balance || "0.00"}</span>
          </div>
          <form className="form-grid" onSubmit={buy}>
            <label className={errors.exam ? "field-error" : ""}>
              Exam Type
              <select
                value={form.exam}
                onChange={(e) => {
                  setForm({ ...form, exam: e.target.value });
                  if (errors.exam) setErrors((prev) => ({ ...prev, exam: "" }));
                }}
              >
                {exams.map((x) => (
                  <option key={x} value={x}>{String(x).toUpperCase()}</option>
                ))}
              </select>
              {errors.exam && <div className="error inline">{errors.exam}</div>}
            </label>
            <label className={errors.quantity ? "field-error" : ""}>
              Quantity
              <input
                type="number"
                min="1"
                max="10"
                value={form.quantity}
                onChange={(e) => {
                  setForm({ ...form, quantity: e.target.value });
                  if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: "" }));
                }}
              />
              {errors.quantity && <div className="error inline">{errors.quantity}</div>}
            </label>
            <label className={errors.phone_number ? "field-error" : ""}>
              Phone Number (optional)
              <input
                placeholder="08012345678"
                value={form.phone_number}
                inputMode="numeric"
                autoComplete="tel"
                onChange={(e) => {
                  setForm({ ...form, phone_number: e.target.value });
                  if (errors.phone_number) setErrors((prev) => ({ ...prev, phone_number: "" }));
                }}
              />
              {errors.phone_number && <div className="error inline">{errors.phone_number}</div>}
            </label>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Buy Pins"}
            </button>
          </form>
          <div className="beneficiary-head row-between">
            <div className="label">Saved Beneficiaries</div>
            <button type="button" className="ghost beneficiary-save-btn" onClick={saveCurrentBeneficiary}>
              Save Current
            </button>
          </div>
          {beneficiaries.length === 0 ? (
            <div className="hint">No saved beneficiaries yet.</div>
          ) : (
            <div className="beneficiary-grid">
              {beneficiaries.map((item) => (
                <div className="beneficiary-item" key={item.id}>
                  <button type="button" className="beneficiary-main" onClick={() => applyBeneficiary(item)}>
                    <div className="beneficiary-title">{item.label}</div>
                    <div className="beneficiary-sub">{item.subtitle || "Saved exam recipient"}</div>
                  </button>
                  <button
                    type="button"
                    className="beneficiary-remove"
                    aria-label={`Remove ${item.label}`}
                    onClick={() => removeSavedBeneficiary(item.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="hint">Demo pricing: ₦ 2,000 per PIN for now.</div>
        </div>
      </section>

      {loading && (
        <div className="purchase-loading-screen" role="status" aria-live="polite">
          <div className="purchase-loading-card">
            <div className="purchase-loading-ring">
              <span />
              <span />
              <span />
            </div>
            <div className="purchase-loading-title">Processing Exam Pin Purchase</div>
            <div className="purchase-loading-sub">Please wait while we contact provider and verify the response.</div>
            <div className="purchase-loading-marquee">
              <div className="purchase-loading-track">
                <span>Connecting</span>
                <span>Validating</span>
                <span>Submitting</span>
                <span>Confirming</span>
                <span>Connecting</span>
                <span>Validating</span>
                <span>Submitting</span>
                <span>Confirming</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {purchaseResult && (
        <div className="success-screen" role="dialog" aria-live="polite">
          <div className="success-card">
            <div className={`success-icon ${purchaseResult.ok ? "" : "error"}`}>
              {purchaseResult.ok ? "✓" : "!"}
            </div>
            <div className="success-title">
              {purchaseResult.ok
                ? statusKey(purchaseResult.status) === "success"
                  ? "Pins Ready"
                  : "Pins Pending"
                : "Exam Purchase Failed"}
            </div>
            <div className="success-sub">
              {purchaseResult.ok
                ? "Copy and keep them safe."
                : "Your request could not be completed. You can download receipt details."}
            </div>
            {!!purchaseResult.failure_reason && (
              <div className="notice" style={{ marginBottom: 10 }}>
                {purchaseResult.failure_reason}
              </div>
            )}
            <div className="success-grid">
              <div>
                <div className="label">Exam</div>
                <div className="value">{String(purchaseResult.exam || "").toUpperCase() || "—"}</div>
              </div>
              <div>
                <div className="label">Quantity</div>
                <div className="value">{purchaseResult.quantity || 0}</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div className="value">₦ {formatAmount(purchaseResult.amount)}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{purchaseResult.reference}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="label">Pins</div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{(purchaseResult.pins || []).join("\n") || "—"}</pre>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary" type="button" onClick={downloadReceipt} disabled={downloadBusy}>
                {downloadBusy ? "Preparing..." : "Download Receipt"}
              </button>
              {purchaseResult.ok && (purchaseResult.pins || []).length > 0 && (
                <button className="ghost" type="button" onClick={copyPins}>Copy Pins</button>
              )}
              <button className="ghost" type="button" onClick={() => navigate("/transactions")}>View Receipt</button>
              <button className="ghost" type="button" onClick={() => setPurchaseResult(null)}>Done</button>
            </div>
          </div>
          {renderReceiptSheet && (
            <div className="receipt-capture-layer" aria-hidden="true">
              <div className="receipt-sheet" ref={receiptCaptureRef}>
              <div className="receipt-sheet-header">
                <img src="/brand/axisvtu-logo.svg" alt="AxisVTU" />
                <div>
                  <div className="label">AxisVTU Purchase Receipt</div>
                  <h4>Exam Pins</h4>
                </div>
                <span className={`pill ${statusKey(purchaseResult.status)}`}>{statusLabel(purchaseResult.status)}</span>
              </div>

              <div className="receipt-sheet-total">
                <div className="label">Amount</div>
                <div className="value">₦ {formatAmount(purchaseResult.amount)}</div>
              </div>

              <div className="receipt-sheet-grid">
                <div>
                  <div className="label">Reference</div>
                  <div>{purchaseResult.reference || "—"}</div>
                </div>
                <div>
                  <div className="label">Date</div>
                  <div>{formatDateTime(purchaseResult.created_at)}</div>
                </div>
                <div>
                  <div className="label">Exam</div>
                  <div>{String(purchaseResult.exam || "").toUpperCase() || "—"}</div>
                </div>
                <div>
                  <div className="label">Quantity</div>
                  <div>{purchaseResult.quantity || 0}</div>
                </div>
                <div>
                  <div className="label">Phone</div>
                  <div>{purchaseResult.phone_number || "—"}</div>
                </div>
                <div>
                  <div className="label">Status</div>
                  <div>{statusLabel(purchaseResult.status)}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="label">Pins</div>
                  <div>{(purchaseResult.pins || []).join(", ") || "—"}</div>
                </div>
                <div>
                  <div className="label">Failure Reason</div>
                  <div>{purchaseResult.failure_reason || "—"}</div>
                </div>
              </div>

              <div className="receipt-sheet-footer">
                <div>Generated by AxisVTU</div>
                <div>{new Date().toLocaleString("en-NG")}</div>
              </div>
            </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

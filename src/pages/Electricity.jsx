import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";
import { loadBeneficiaries, removeBeneficiary, saveBeneficiary } from "../services/beneficiaries";
import { buildReceiptShareText, shareReceiptOnWhatsApp, shareReceiptText } from "../services/receiptShare";
import { useToast } from "../context/toast.jsx";

const MIN_PURCHASE_LOADING_MS = 1200;

export default function Electricity() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ disco: "ikeja", meter_type: "prepaid", meter_number: "", amount: 2000 });
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
    setBeneficiaries(loadBeneficiaries("electricity"));
    const qDisco = String(searchParams.get("disco") || "").trim().toLowerCase();
    const qMeterType = String(searchParams.get("meter_type") || "").trim().toLowerCase();
    const qMeterNumber = String(searchParams.get("meter_number") || "").trim();
    const qAmount = Number(searchParams.get("amount") || "");
    setForm((prev) => ({
      ...prev,
      disco: qDisco || prev.disco,
      meter_type: qMeterType || prev.meter_type,
      meter_number: qMeterNumber || prev.meter_number,
      amount: Number.isFinite(qAmount) && qAmount > 0 ? qAmount : prev.amount,
    }));
  }, [searchParams]);

  const validate = () => {
    const nextErrors = {};
    const disco = String(form.disco || "").trim().toLowerCase();
    const meterType = String(form.meter_type || "").trim().toLowerCase();
    const meterNumber = String(form.meter_number || "").replace(/\D/g, "");
    const amount = Number(form.amount);

    if (!disco) nextErrors.disco = "Select a disco.";
    if (!["prepaid", "postpaid"].includes(meterType)) {
      nextErrors.meter_type = "Select a valid meter type.";
    }
    if (meterNumber.length < 6 || meterNumber.length > 13) {
      nextErrors.meter_number = "Enter a valid meter number.";
    }
    if (!Number.isFinite(amount) || amount < 500) {
      nextErrors.amount = "Minimum electricity amount is ₦500.";
    } else if (amount > 500000) {
      nextErrors.amount = "Maximum electricity amount is ₦500,000.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;
    return {
      disco,
      meter_type: meterType,
      meter_number: meterNumber,
      amount,
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
      const res = await apiFetch("/services/electricity/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPurchaseResult({
        ok: true,
        reference: res.reference || `AXIS-ELECTRICITY-${Date.now()}`,
        status: res.status || "success",
        created_at: res.created_at || new Date().toISOString(),
        disco: payload.disco,
        meter_type: payload.meter_type,
        meter_number: payload.meter_number,
        amount: payload.amount,
        token: res.token || "",
        failure_reason: "",
      });
      setBeneficiaries(
        saveBeneficiary("electricity", {
          label: payload.meter_number,
          subtitle: `${payload.disco.toUpperCase()} • ${payload.meter_type.toUpperCase()}`,
          fields: {
            disco: payload.disco,
            meter_type: payload.meter_type,
            meter_number: payload.meter_number,
            amount: String(payload.amount),
          },
        })
      );
      showToast("Electricity successful.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      const message = err?.message || "Electricity failed.";
      setPurchaseResult({
        ok: false,
        reference: `AXIS-ELECTRICITY-ATTEMPT-${Date.now()}`,
        status: "failed",
        created_at: new Date().toISOString(),
        disco: payload.disco,
        meter_type: payload.meter_type,
        meter_number: payload.meter_number,
        amount: payload.amount,
        token: "",
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

      const safeReference = String(purchaseResult.reference || "electricity").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`axisvtu-electricity-receipt-${safeReference}.pdf`);
      showToast("Receipt downloaded successfully.", "success");
    } catch {
      showToast("Failed to download receipt. Please try again.", "error");
    } finally {
      setRenderReceiptSheet(false);
      setDownloadBusy(false);
    }
  };

  const shareText = () =>
    buildReceiptShareText({
      title: "Electricity Receipt",
      reference: purchaseResult?.reference,
      status: statusLabel(purchaseResult?.status),
      amount: purchaseResult?.amount,
      fields: [
        { label: "Disco", value: String(purchaseResult?.disco || "").toUpperCase() || "—" },
        { label: "Meter Number", value: purchaseResult?.meter_number || "—" },
        { label: "Meter Type", value: String(purchaseResult?.meter_type || "").toUpperCase() || "—" },
        { label: "Token", value: purchaseResult?.token || "—" },
        { label: "Failure Reason", value: purchaseResult?.failure_reason || "—" },
      ],
    });

  const shareReceipt = async () => {
    if (!purchaseResult) return;
    const result = await shareReceiptText({
      title: "AxisVTU Electricity Receipt",
      text: shareText(),
    });
    if (!result.ok) {
      showToast("Unable to share receipt.", "error");
      return;
    }
    showToast(result.mode === "native" ? "Receipt shared." : "Opened WhatsApp share.", "success");
  };

  const shareReceiptWhatsApp = () => {
    if (!purchaseResult) return;
    const ok = shareReceiptOnWhatsApp(shareText());
    if (!ok) {
      showToast("Unable to open WhatsApp.", "error");
      return;
    }
    showToast("Opened WhatsApp share.", "success");
  };

  const saveCurrentBeneficiary = () => {
    const meterNumber = String(form.meter_number || "").replace(/\D/g, "");
    if (meterNumber.length < 6 || meterNumber.length > 13) {
      showToast("Enter valid meter number first.", "error");
      return;
    }
    setBeneficiaries(
      saveBeneficiary("electricity", {
        label: meterNumber,
        subtitle: `${String(form.disco || "").toUpperCase()} • ${String(form.meter_type || "").toUpperCase()}`,
        fields: {
          disco: String(form.disco || "").toLowerCase(),
          meter_type: String(form.meter_type || "").toLowerCase(),
          meter_number: meterNumber,
          amount: String(form.amount || ""),
        },
      })
    );
    showToast("Beneficiary saved.", "success");
  };

  const applyBeneficiary = (item) => {
    const fields = item?.fields || {};
    setForm((prev) => ({
      ...prev,
      disco: String(fields.disco || prev.disco || "ikeja").toLowerCase(),
      meter_type: String(fields.meter_type || prev.meter_type || "prepaid").toLowerCase(),
      meter_number: String(fields.meter_number || prev.meter_number || ""),
      amount: fields.amount ? Number(fields.amount) || prev.amount : prev.amount,
    }));
    showToast("Beneficiary applied.", "success");
  };

  const removeSavedBeneficiary = (id) => {
    setBeneficiaries(removeBeneficiary("electricity", id));
    showToast("Beneficiary removed.", "success");
  };

  const discos = catalog?.electricity_discos || ["ikeja", "eko", "abuja", "kano"];

  return (
    <div className="page">
      <section className="hero-card">
        <div>
          <div className="label">Electricity</div>
          <div className="hero-value">Buy Token</div>
          <div className="muted">Pay from your wallet and get your token instantly.</div>
        </div>
        <div className="hero-actions">
          <button className="ghost" type="button" onClick={() => navigate("/services")}>All Services</button>
          <button className="primary" type="button" onClick={() => navigate("/wallet")}>Fund Wallet</button>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="section-head">
            <h3>Buy Electricity</h3>
            <span className="muted">Balance: ₦ {wallet?.balance || "0.00"}</span>
          </div>
          <form className="form-grid" onSubmit={buy}>
            <label className={errors.disco ? "field-error" : ""}>
              Disco
              <select
                value={form.disco}
                onChange={(e) => {
                  setForm({ ...form, disco: e.target.value });
                  if (errors.disco) setErrors((prev) => ({ ...prev, disco: "" }));
                }}
              >
                {discos.map((d) => (
                  <option key={d} value={d}>{String(d).toUpperCase()}</option>
                ))}
              </select>
              {errors.disco && <div className="error inline">{errors.disco}</div>}
            </label>
            <label className={errors.meter_type ? "field-error" : ""}>
              Meter Type
              <select
                value={form.meter_type}
                onChange={(e) => {
                  setForm({ ...form, meter_type: e.target.value });
                  if (errors.meter_type) setErrors((prev) => ({ ...prev, meter_type: "" }));
                }}
              >
                <option value="prepaid">Prepaid</option>
                <option value="postpaid">Postpaid</option>
              </select>
              {errors.meter_type && <div className="error inline">{errors.meter_type}</div>}
            </label>
            <label className={errors.meter_number ? "field-error" : ""}>
              Meter Number
              <input
                placeholder="Enter meter number"
                value={form.meter_number}
                inputMode="numeric"
                onChange={(e) => {
                  setForm({ ...form, meter_number: e.target.value });
                  if (errors.meter_number) setErrors((prev) => ({ ...prev, meter_number: "" }));
                }}
                required
              />
              {errors.meter_number && <div className="error inline">{errors.meter_number}</div>}
            </label>
            <label className={errors.amount ? "field-error" : ""}>
              Amount (₦)
              <input
                type="number"
                min="500"
                value={form.amount}
                onChange={(e) => {
                  setForm({ ...form, amount: e.target.value });
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                }}
                required
              />
              {errors.amount && <div className="error inline">{errors.amount}</div>}
            </label>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Buy Electricity"}
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
                    <div className="beneficiary-sub">{item.subtitle || "Saved electricity recipient"}</div>
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
            <div className="purchase-loading-title">Processing Electricity Purchase</div>
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
                  ? "Electricity Successful"
                  : "Electricity Pending"
                : "Electricity Failed"}
            </div>
            <div className="success-sub">
              {purchaseResult.ok
                ? "Your token is ready."
                : "Your request could not be completed. You can download receipt details."}
            </div>
            {!!purchaseResult.failure_reason && (
              <div className="notice" style={{ marginBottom: 10 }}>
                {purchaseResult.failure_reason}
              </div>
            )}
            <div className="success-grid">
              <div>
                <div className="label">Disco</div>
                <div className="value">{String(purchaseResult.disco || "").toUpperCase() || "—"}</div>
              </div>
              <div>
                <div className="label">Meter</div>
                <div className="muted">{purchaseResult.meter_number || "—"}</div>
              </div>
              <div>
                <div className="label">Type</div>
                <div className="muted">{String(purchaseResult.meter_type || "").toUpperCase() || "—"}</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div className="value">₦ {formatAmount(purchaseResult.amount)}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{purchaseResult.reference}</div>
              </div>
              <div>
                <div className="label">Token</div>
                <div className="value" style={{ fontSize: 18 }}>{purchaseResult.token || "—"}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary" type="button" onClick={downloadReceipt} disabled={downloadBusy}>
                {downloadBusy ? "Preparing..." : "Download Receipt"}
              </button>
              <button className="ghost" type="button" onClick={shareReceipt}>Share Receipt</button>
              <button className="ghost" type="button" onClick={shareReceiptWhatsApp}>WhatsApp</button>
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
                  <h4>Electricity</h4>
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
                  <div className="label">Disco</div>
                  <div>{String(purchaseResult.disco || "").toUpperCase() || "—"}</div>
                </div>
                <div>
                  <div className="label">Meter Number</div>
                  <div>{purchaseResult.meter_number || "—"}</div>
                </div>
                <div>
                  <div className="label">Meter Type</div>
                  <div>{String(purchaseResult.meter_type || "").toUpperCase() || "—"}</div>
                </div>
                <div>
                  <div className="label">Token</div>
                  <div>{purchaseResult.token || "—"}</div>
                </div>
                <div>
                  <div className="label">Status</div>
                  <div>{statusLabel(purchaseResult.status)}</div>
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

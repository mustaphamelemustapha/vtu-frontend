import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";
import { loadBeneficiaries, removeBeneficiary, saveBeneficiary } from "../services/beneficiaries";
import { buildReceiptShareText, shareReceiptOnWhatsApp, shareReceiptText } from "../services/receiptShare";
import { useToast } from "../context/toast.jsx";

const MIN_PURCHASE_LOADING_MS = 1200;

export default function Cable() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ provider: "dstv", smartcard_number: "", package_code: "basic", amount: 5000 });
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
    setBeneficiaries(loadBeneficiaries("cable"));
    const qProvider = String(searchParams.get("provider") || "").trim().toLowerCase();
    const qSmartcard = String(searchParams.get("smartcard_number") || "").trim();
    const qPackageCode = String(searchParams.get("package_code") || "").trim().toLowerCase();
    const qAmount = Number(searchParams.get("amount") || "");
    setForm((prev) => ({
      ...prev,
      provider: qProvider || prev.provider,
      smartcard_number: qSmartcard || prev.smartcard_number,
      package_code: qPackageCode || prev.package_code,
      amount: Number.isFinite(qAmount) && qAmount > 0 ? qAmount : prev.amount,
    }));
  }, [searchParams]);

  const validate = () => {
    const nextErrors = {};
    const provider = String(form.provider || "").trim().toLowerCase();
    const smartcardNumber = String(form.smartcard_number || "").replace(/\s+/g, "");
    const packageCode = String(form.package_code || "").trim().toLowerCase();
    const amount = Number(form.amount);

    if (!provider) nextErrors.provider = "Select a provider.";
    if (!/^[a-zA-Z0-9]{5,20}$/.test(smartcardNumber)) {
      nextErrors.smartcard_number = "Use 5-20 letters/numbers for smartcard.";
    }
    if (packageCode.length < 2 || packageCode.length > 64) {
      nextErrors.package_code = "Enter a valid package code.";
    }
    if (!Number.isFinite(amount) || amount < 500) {
      nextErrors.amount = "Minimum cable amount is ₦500.";
    } else if (amount > 500000) {
      nextErrors.amount = "Maximum cable amount is ₦500,000.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;
    return {
      provider,
      smartcard_number: smartcardNumber,
      package_code: packageCode,
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
      const res = await apiFetch("/services/cable/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPurchaseResult({
        ok: true,
        reference: res.reference || `AXIS-CABLE-${Date.now()}`,
        status: res.status || "success",
        created_at: res.created_at || new Date().toISOString(),
        provider: payload.provider,
        smartcard: payload.smartcard_number,
        package_code: payload.package_code,
        amount: payload.amount,
        failure_reason: "",
      });
      setBeneficiaries(
        saveBeneficiary("cable", {
          label: payload.smartcard_number,
          subtitle: `${payload.provider.toUpperCase()} • ${payload.package_code}`,
          fields: {
            provider: payload.provider,
            smartcard_number: payload.smartcard_number,
            package_code: payload.package_code,
            amount: String(payload.amount),
          },
        })
      );
      showToast("Cable successful.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      const message = err?.message || "Cable failed.";
      setPurchaseResult({
        ok: false,
        reference: `AXIS-CABLE-ATTEMPT-${Date.now()}`,
        status: "failed",
        created_at: new Date().toISOString(),
        provider: payload.provider,
        smartcard: payload.smartcard_number,
        package_code: payload.package_code,
        amount: payload.amount,
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

      const safeReference = String(purchaseResult.reference || "cable").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`axisvtu-cable-receipt-${safeReference}.pdf`);
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
      title: "Cable Receipt",
      reference: purchaseResult?.reference,
      status: statusLabel(purchaseResult?.status),
      amount: purchaseResult?.amount,
      fields: [
        { label: "Provider", value: String(purchaseResult?.provider || "").toUpperCase() || "—" },
        { label: "Smartcard", value: purchaseResult?.smartcard || "—" },
        { label: "Package", value: purchaseResult?.package_code || "—" },
        { label: "Failure Reason", value: purchaseResult?.failure_reason || "—" },
      ],
    });

  const shareReceipt = async () => {
    if (!purchaseResult) return;
    const result = await shareReceiptText({
      title: "AxisVTU Cable Receipt",
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
    const smartcardNumber = String(form.smartcard_number || "").replace(/\s+/g, "");
    if (!/^[a-zA-Z0-9]{5,20}$/.test(smartcardNumber)) {
      showToast("Enter valid smartcard first.", "error");
      return;
    }
    setBeneficiaries(
      saveBeneficiary("cable", {
        label: smartcardNumber,
        subtitle: `${String(form.provider || "").toUpperCase()} • ${String(form.package_code || "")}`,
        fields: {
          provider: String(form.provider || "").toLowerCase(),
          smartcard_number: smartcardNumber,
          package_code: String(form.package_code || "").toLowerCase(),
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
      provider: String(fields.provider || prev.provider || "dstv").toLowerCase(),
      smartcard_number: String(fields.smartcard_number || prev.smartcard_number || ""),
      package_code: String(fields.package_code || prev.package_code || ""),
      amount: fields.amount ? Number(fields.amount) || prev.amount : prev.amount,
    }));
    showToast("Beneficiary applied.", "success");
  };

  const removeSavedBeneficiary = (id) => {
    setBeneficiaries(removeBeneficiary("cable", id));
    showToast("Beneficiary removed.", "success");
  };

  const providers = catalog?.cable_providers || [
    { id: "dstv", name: "DStv" },
    { id: "gotv", name: "GOtv" },
    { id: "startimes", name: "StarTimes" },
  ];

  return (
    <div className="page">
      <section className="hero-card">
        <div>
          <div className="label">Cable TV</div>
          <div className="hero-value">Renew</div>
          <div className="muted">Pay for subscriptions with one clean receipt.</div>
        </div>
        <div className="hero-actions">
          <button className="ghost" type="button" onClick={() => navigate("/services")}>All Services</button>
          <button className="primary" type="button" onClick={() => navigate("/wallet")}>Fund Wallet</button>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="section-head">
            <h3>Pay Cable</h3>
            <span className="muted">Balance: ₦ {wallet?.balance || "0.00"}</span>
          </div>
          <form className="form-grid" onSubmit={buy}>
            <label className={errors.provider ? "field-error" : ""}>
              Provider
              <select
                value={form.provider}
                onChange={(e) => {
                  setForm({ ...form, provider: e.target.value });
                  if (errors.provider) setErrors((prev) => ({ ...prev, provider: "" }));
                }}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.provider && <div className="error inline">{errors.provider}</div>}
            </label>
            <label className={errors.smartcard_number ? "field-error" : ""}>
              Smartcard / IUC Number
              <input
                placeholder="Enter smartcard number"
                value={form.smartcard_number}
                inputMode="numeric"
                onChange={(e) => {
                  setForm({ ...form, smartcard_number: e.target.value });
                  if (errors.smartcard_number) setErrors((prev) => ({ ...prev, smartcard_number: "" }));
                }}
                required
              />
              {errors.smartcard_number && <div className="error inline">{errors.smartcard_number}</div>}
            </label>
            <label className={errors.package_code ? "field-error" : ""}>
              Package Code
              <input
                placeholder="e.g. basic, premium"
                value={form.package_code}
                onChange={(e) => {
                  setForm({ ...form, package_code: e.target.value });
                  if (errors.package_code) setErrors((prev) => ({ ...prev, package_code: "" }));
                }}
                required
              />
              {errors.package_code && <div className="error inline">{errors.package_code}</div>}
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
              {loading ? "Processing..." : "Pay Cable"}
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
                    <div className="beneficiary-sub">{item.subtitle || "Saved cable recipient"}</div>
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
          <div className="hint">Tip: use a simple package code for now. We’ll add real bouquet lists next.</div>
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
            <div className="purchase-loading-title">Processing Cable Payment</div>
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
                  ? "Cable Successful"
                  : "Cable Pending"
                : "Cable Failed"}
            </div>
            <div className="success-sub">
              {purchaseResult.ok
                ? "Your subscription payment has been processed."
                : "Your request could not be completed. You can download receipt details."}
            </div>
            {!!purchaseResult.failure_reason && (
              <div className="notice" style={{ marginBottom: 10 }}>
                {purchaseResult.failure_reason}
              </div>
            )}
            <div className="success-grid">
              <div>
                <div className="label">Provider</div>
                <div className="value">{String(purchaseResult.provider || "").toUpperCase() || "—"}</div>
              </div>
              <div>
                <div className="label">Smartcard</div>
                <div className="muted">{purchaseResult.smartcard || "—"}</div>
              </div>
              <div>
                <div className="label">Package</div>
                <div className="muted">{purchaseResult.package_code || "—"}</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div className="value">₦ {formatAmount(purchaseResult.amount)}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{purchaseResult.reference}</div>
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
                  <h4>Cable TV</h4>
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
                  <div className="label">Provider</div>
                  <div>{String(purchaseResult.provider || "").toUpperCase() || "—"}</div>
                </div>
                <div>
                  <div className="label">Smartcard</div>
                  <div>{purchaseResult.smartcard || "—"}</div>
                </div>
                <div>
                  <div className="label">Package</div>
                  <div>{purchaseResult.package_code || "—"}</div>
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

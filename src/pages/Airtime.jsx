import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";
import { loadBeneficiaries, removeBeneficiary, saveBeneficiary } from "../services/beneficiaries";
import { buildReceiptShareText, shareReceiptCapture, shareReceiptCaptureOnWhatsApp } from "../services/receiptShare";
import { useToast } from "../context/toast.jsx";
import Button from "../components/ui/Button.jsx";

const MIN_PURCHASE_LOADING_MS = 1200;
const PENDING_CONFIRMATION_MESSAGE =
  "Provider confirmation is delayed. Your request is being verified. Check History shortly.";
const NETWORK_PREFIXES = {
  mtn: new Set([
    "0803", "0806", "0703", "0706", "0810", "0813", "0814", "0816",
    "0903", "0906", "0913", "0916", "0704", "07025", "07026",
  ]),
  airtel: new Set(["0802", "0808", "0708", "0812", "0701", "0902", "0907", "0901", "0912"]),
  glo: new Set(["0805", "0807", "0705", "0811", "0815", "0905", "0915"]),
  "9mobile": new Set(["0809", "0817", "0818", "0908", "0909"]),
};

function isUncertainPurchaseError(message) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("timed out") ||
    text.includes("timeout") ||
    text.includes("unable to reach server") ||
    text.includes("failed to fetch") ||
    text.includes("network error") ||
    text.includes("connection")
  );
}

function normalizePhoneForNetworkInference(phoneNumber) {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length >= 13) return `0${digits.slice(3)}`;
  return digits;
}

function inferNigerianNetwork(phoneNumber) {
  const normalized = normalizePhoneForNetworkInference(phoneNumber);
  if (normalized.length < 4) return "";
  const prefix5 = normalized.slice(0, 5);
  const prefix4 = normalized.slice(0, 4);
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.has(prefix5) || prefixes.has(prefix4)) return network;
  }
  return "";
}

export default function Airtime() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ network: "mtn", phone_number: "", amount: 200 });
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
    setBeneficiaries(loadBeneficiaries("airtime"));
    const qNetwork = String(searchParams.get("network") || "").trim().toLowerCase();
    const qPhone = String(searchParams.get("phone_number") || "").trim();
    const qAmount = Number(searchParams.get("amount") || "");
    setForm((prev) => ({
      ...prev,
      network: qNetwork || prev.network,
      phone_number: qPhone || prev.phone_number,
      amount: Number.isFinite(qAmount) && qAmount> 0 ? qAmount : prev.amount,
    }));
  }, [searchParams]);

  const validate = () => {
    const nextErrors = {};
    const network = String(form.network || "").trim().toLowerCase();
    const phoneNumber = String(form.phone_number || "").replace(/\D/g, "");
    const amount = Number(form.amount);

    if (!network) nextErrors.network = "Select a network.";
    if (phoneNumber.length < 10 || phoneNumber.length> 15) {
      nextErrors.phone_number = "Enter a valid phone number.";
    }
    const inferred = inferNigerianNetwork(phoneNumber);
    if (inferred && inferred !== network) {
      nextErrors.network = `Detected ${inferred.toUpperCase()} number. Please use ${inferred.toUpperCase()} network.`;
    }
    if (!Number.isFinite(amount) || amount < 50) {
      nextErrors.amount = "Minimum airtime amount is ₦50.";
    } else if (amount> 500000) {
      nextErrors.amount = "Maximum airtime amount is ₦500,000.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length> 0) return null;
    return { network, phone_number: phoneNumber, amount };
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
      const res = await apiFetch("/services/airtime/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPurchaseResult({
        ok: true,
        reference: res.reference || `AXIS-AIRTIME-${Date.now()}`,
        status: res.status || "success",
        created_at: res.created_at || new Date().toISOString(),
        network: payload.network,
        phone: payload.phone_number,
        amount: payload.amount,
        failure_reason:
          String(res.status || "").toLowerCase() === "pending"
            ? res.message || PENDING_CONFIRMATION_MESSAGE
            : "",
      });
      setBeneficiaries(
        saveBeneficiary("airtime", {
          label: payload.phone_number,
          subtitle: `${payload.network.toUpperCase()} • ₦ ${formatAmount(payload.amount)}`,
          fields: {
            network: payload.network,
            phone_number: payload.phone_number,
            amount: String(payload.amount),
          },
        })
      );
      showToast("Airtime successful.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      const message = err?.message || "Airtime failed.";
      if (isUncertainPurchaseError(message)) {
        setPurchaseResult({
          ok: true,
          reference: `AXIS-AIRTIME-PENDING-${Date.now()}`,
          status: "pending",
          created_at: new Date().toISOString(),
          network: payload.network,
          phone: payload.phone_number,
          amount: payload.amount,
          failure_reason: PENDING_CONFIRMATION_MESSAGE,
        });
        showToast("Purchase submitted. Confirmation is in progress.", "info");
      } else {
        setPurchaseResult({
          ok: false,
          reference: `AXIS-AIRTIME-ATTEMPT-${Date.now()}`,
          status: "failed",
          created_at: new Date().toISOString(),
          network: payload.network,
          phone: payload.phone_number,
          amount: payload.amount,
          failure_reason: message,
        });
        showToast(message, "error");
      }
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

      const safeReference = String(purchaseResult.reference || "airtime").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`axisvtu-airtime-receipt-${safeReference}.pdf`);
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
      title: "Airtime Receipt",
      reference: purchaseResult?.reference,
      status: statusLabel(purchaseResult?.status),
      amount: purchaseResult?.amount,
      fields: [
        { label: "Network", value: String(purchaseResult?.network || "").toUpperCase() || "—" },
        { label: "Phone", value: purchaseResult?.phone || "—" },
        { label: "Failure Reason", value: purchaseResult?.failure_reason || "—" },
      ],
    });

  const shareReceipt = async () => {
    if (!purchaseResult) return;
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
      const safeReference = String(purchaseResult.reference || "airtime").replace(/[^a-zA-Z0-9_-]/g, "_");
      const result = await shareReceiptCapture({
        sourceNode: receiptCaptureRef.current,
        title: "AxisVTU Airtime Receipt",
        text: shareText(),
        fileName: `axisvtu-airtime-receipt-${safeReference}.png`,
      });
      if (!result.ok) {
        showToast("Unable to share receipt.", "error");
        return;
      }
      showToast(
        result.mode === "native_file" ? "Receipt image shared." : "Receipt image prepared.",
        "success"
      );
    } catch {
      showToast("Unable to share receipt.", "error");
    } finally {
      setRenderReceiptSheet(false);
    }
  };

  const shareReceiptWhatsApp = async () => {
    if (!purchaseResult) return;
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
      const safeReference = String(purchaseResult.reference || "airtime").replace(/[^a-zA-Z0-9_-]/g, "_");
      const result = await shareReceiptCaptureOnWhatsApp({
        sourceNode: receiptCaptureRef.current,
        title: "AxisVTU Airtime Receipt",
        text: shareText(),
        fileName: `axisvtu-airtime-receipt-${safeReference}.png`,
      });
      if (!result.ok) {
        showToast("Unable to open WhatsApp.", "error");
        return;
      }
      showToast(
        result.mode === "native_file" ? "Choose WhatsApp to send the receipt image." : "Receipt image downloaded and WhatsApp opened.",
        "success"
      );
    } catch {
      showToast("Unable to open WhatsApp.", "error");
    } finally {
      setRenderReceiptSheet(false);
    }
  };

  const saveCurrentBeneficiary = () => {
    const phoneNumber = String(form.phone_number || "").replace(/\D/g, "");
    if (phoneNumber.length < 10 || phoneNumber.length> 15) {
      showToast("Enter valid phone number first.", "error");
      return;
    }
    setBeneficiaries(
      saveBeneficiary("airtime", {
        label: phoneNumber,
        subtitle: `${String(form.network || "").toUpperCase()} • ₦ ${formatAmount(form.amount)}`,
        fields: {
          network: String(form.network || "").toLowerCase(),
          phone_number: phoneNumber,
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
      network: String(fields.network || prev.network || "mtn").toLowerCase(),
      phone_number: String(fields.phone_number || prev.phone_number || ""),
      amount: fields.amount ? Number(fields.amount) || prev.amount : prev.amount,
    }));
    showToast("Beneficiary applied.", "success");
  };

  const removeSavedBeneficiary = (id) => {
    setBeneficiaries(removeBeneficiary("airtime", id));
    showToast("Beneficiary removed.", "success");
  };

  const networks = catalog?.airtime_networks || ["mtn", "glo", "airtel", "9mobile"];
  const inferredNetwork = inferNigerianNetwork(form.phone_number);

  return (
    <div className="page airtime-page">
      <section className="hero-card service-hero service-hero-airtime">
        <div>
          <div className="label">Airtime</div>
          <div className="hero-value">Top up</div>
          <div className="muted">Fast airtime delivery with a receipt you can track.</div>
        </div>
        <div className="hero-actions">
          <Button variant="ghost" type="button" onClick={() => navigate("/services")}>All Services</Button>
          <Button type="button" onClick={() => navigate("/wallet")}>Fund Wallet</Button>
        </div>
      </section>

      <section className="section">
        <div className="card airtime-form-card">
          <div className="section-head">
            <h3>Buy Airtime</h3>
            <span className="muted">Balance: ₦ {wallet?.balance || "0.00"}</span>
          </div>
          <form className="form-grid" onSubmit={buy}>
            <label className={errors.network ? "field-error" : ""}>
              Network
              <select
                value={form.network}
                onChange={(e) => {
                  setForm({ ...form, network: e.target.value });
                  if (errors.network) setErrors((prev) => ({ ...prev, network: "" }));
                }}>
                {networks.map((n) => (
                  <option key={n} value={n}>{String(n).toUpperCase()}</option>
                ))}
              </select>
              {errors.network && <div className="error inline">{errors.network}</div>}
            </label>
            <label className={errors.phone_number ? "field-error" : ""}>
              Phone Number
              <input
                placeholder="08012345678"
                value={form.phone_number}
                inputMode="numeric"
                autoComplete="tel"
                onChange={(e) => {
                  const value = e.target.value;
                  const detected = inferNigerianNetwork(value);
                  setForm((prev) => ({
                    ...prev,
                    phone_number: value,
                    network: detected || prev.network,
                  }));
                  if (errors.phone_number) setErrors((prev) => ({ ...prev, phone_number: "" }));
                  if (errors.network) setErrors((prev) => ({ ...prev, network: "" }));
                }}
                required
              />
              {errors.phone_number && <div className="error inline">{errors.phone_number}</div>}
              {inferredNetwork && (
                <div className="hint">Detected network: <strong>{inferredNetwork.toUpperCase()}</strong></div>
              )}
            </label>
            <label className={errors.amount ? "field-error" : ""}>
              Amount (₦)
              <input
                type="number"
                min="50"
                value={form.amount}
                onChange={(e) => {
                  setForm({ ...form, amount: e.target.value });
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                }}
                required
              />
              {errors.amount && <div className="error inline">{errors.amount}</div>}
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Buy Airtime"}
            </Button>
          </form>
          <div className="beneficiary-head row-between">
            <div className="label">Saved Beneficiaries</div>
            <Button variant="ghost" type="button" className="beneficiary-save-btn" onClick={saveCurrentBeneficiary}>
              Save Current
            </Button>
          </div>
          {beneficiaries.length === 0 ? (
            <div className="hint">No saved beneficiaries yet.</div>
          ) : (
            <div className="beneficiary-grid">
              {beneficiaries.map((item) => (
                <div className="beneficiary-item" key={item.id}>
                  <button type="button" className="beneficiary-main" onClick={() => applyBeneficiary(item)}>
                    <div className="beneficiary-title">{item.label}</div>
                    <div className="beneficiary-sub">{item.subtitle || "Saved airtime recipient"}</div>
                  </button>
                  <button
                    type="button"
                    className="beneficiary-remove"
                    aria-label={`Remove ${item.label}`}
                    onClick={() => removeSavedBeneficiary(item.id)}>
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
            <div className="purchase-loading-title">Processing Airtime Purchase</div>
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
        <div className="success-card airtime-success-card">
            <div className={`success-icon ${purchaseResult.ok ? "" : "error"}`}>
              {purchaseResult.ok ? "✓" : "!"}
            </div>
            <div className="success-title">
              {purchaseResult.ok
                ? statusKey(purchaseResult.status) === "success"
                  ? "Airtime Successful"
                  : "Airtime Pending"
                : "Airtime Failed"}
            </div>
            <div className="success-sub">
              {purchaseResult.ok
                ? statusKey(purchaseResult.status) === "pending"
                  ? "We have submitted your top up. Final confirmation may take a moment."
                  : "Your top up has been processed."
                : "Your request could not be completed. You can download receipt details."}
            </div>
            {!!purchaseResult.failure_reason && (
              <div className="notice" style={{ marginBottom: 10 }}>
                {purchaseResult.failure_reason}
              </div>
            )}
            <div className="success-grid">
              <div>
                <div className="label">Network</div>
                <div className="value">{String(purchaseResult.network || "").toUpperCase() || "—"}</div>
              </div>
              <div>
                <div className="label">Phone</div>
                <div className="muted">{purchaseResult.phone || "—"}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{purchaseResult.reference}</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div className="value">₦ {formatAmount(purchaseResult.amount)}</div>
              </div>
            </div>
            <div className="modal-actions">
              <Button type="button" onClick={downloadReceipt} disabled={downloadBusy}>
                {downloadBusy ? "Preparing..." : "Download Receipt"}
              </Button>
              <Button variant="ghost" type="button" onClick={shareReceipt}>Share Receipt</Button>
              <Button variant="ghost" type="button" onClick={shareReceiptWhatsApp}>WhatsApp</Button>
              <Button variant="ghost" type="button" onClick={() => navigate("/transactions")}>View Receipt</Button>
              <Button variant="ghost" type="button" onClick={() => setPurchaseResult(null)}>Done</Button>
            </div>
          </div>
          {renderReceiptSheet && (
            <div className="receipt-capture-layer" aria-hidden="true">
              <div className="receipt-sheet" ref={receiptCaptureRef}>
              <div className="receipt-sheet-header">
                <img src="/brand/axisvtu-logo.png" alt="AxisVTU" />
                <div>
                  <div className="label">AxisVTU Purchase Receipt</div>
                  <h4>Airtime</h4>
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
                  <div className="label">Network</div>
                  <div>{String(purchaseResult.network || "").toUpperCase() || "—"}</div>
                </div>
                <div>
                  <div className="label">Phone</div>
                  <div>{purchaseResult.phone || "—"}</div>
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

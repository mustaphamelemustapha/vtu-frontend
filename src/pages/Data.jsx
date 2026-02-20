import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Data() {
  const MIN_PURCHASE_LOADING_MS = 1200;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("all");
  const [ported, setPorted] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [compare, setCompare] = useState([]);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [wallet, setWallet] = useState(null);
  const [plansError, setPlansError] = useState("");
  const [walletError, setWalletError] = useState("");
  const receiptCaptureRef = useRef(null);
  const { showToast } = useToast();

  const parseSize = (value) => {
    if (!value) return null;
    const str = String(value).toLowerCase();
    const num = parseFloat(str);
    if (Number.isNaN(num)) return null;
    if (str.includes("mb")) return num / 1024;
    return num;
  };

  const networkClass = (value) => {
    const raw = String(value || "").toLowerCase();
    if (!raw) return "";
    if (raw === "9mobile") return "network-9mobile";
    return raw.replace(/[^a-z0-9_-]/g, "-");
  };

  const saveRecipient = (next) => {
    try {
      localStorage.setItem("vtu_last_recipient", JSON.stringify(next));
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  };

  const loadPlans = async () => {
    setLoadingPlans(true);
    setPlansError("");
    try {
      const data = await apiFetch("/data/plans");
      setPlans(data);
    } catch (err) {
      const msg = err?.message || "Failed to load data plans.";
      setPlansError(msg);
      showToast(msg, "error");
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadWallet = async () => {
    setWalletError("");
    try {
      const data = await apiFetch("/wallet/me");
      setWallet(data);
    } catch (err) {
      const msg = err?.message || "Failed to load wallet balance.";
      setWalletError(msg);
      showToast(msg, "error");
    }
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("vtu_last_recipient") || "null");
      if (stored && typeof stored === "object") {
        if (typeof stored.phone === "string") setPhone(stored.phone);
        if (typeof stored.ported === "boolean") setPorted(stored.ported);
      }
    } catch {
      // ignore
    }
    try {
      const qpPhone = searchParams.get("phone");
      const qpPorted = searchParams.get("ported");
      if (qpPhone) {
        const nextPorted = qpPorted === "1" || qpPorted === "true";
        setPhone(qpPhone);
        setPorted(nextPorted);
        saveRecipient({ phone: qpPhone, ported: nextPorted });
      }
    } catch {
      // ignore
    }
    loadPlans();
    loadWallet();
  }, [searchParams]);

  const buy = async (planCode) => {
    setMessage("");
    const startedAt = Date.now();
    try {
      if (!phone) {
        setFieldError("Enter a valid phone number.");
        showToast("Enter a valid phone number.", "error");
        return;
      }
      setFieldError("");
      const chosenPlan = plans.find((p) => p.plan_code === planCode) || null;
      setSelected(null);
      setLoading(true);
      const res = await apiFetch("/data/purchase", {
        method: "POST",
        body: JSON.stringify({ plan_code: planCode, phone_number: phone, ported_number: ported })
      });
      setPurchaseResult({
        ok: true,
        reference: res.reference || `AXIS-${Date.now()}`,
        status: res.status || "success",
        created_at: res.created_at || new Date().toISOString(),
        test_mode: !!res.test_mode,
        plan: chosenPlan,
        plan_code: chosenPlan?.plan_code || planCode,
        validity: chosenPlan?.validity || "",
        network: chosenPlan?.network || "",
        recipient: phone,
        amount: Number(chosenPlan?.price || 0),
        ported,
        failure_reason: "",
        provider_message: res.message || "",
      });
      loadWallet();
      showToast("Purchase successful.", "success");
    } catch (err) {
      setMessage(err.message);
      const chosenPlan = plans.find((p) => p.plan_code === planCode) || null;
      setPurchaseResult({
        ok: false,
        reference: `AXIS-ATTEMPT-${Date.now()}`,
        status: "failed",
        created_at: new Date().toISOString(),
        test_mode: false,
        plan: chosenPlan,
        plan_code: chosenPlan?.plan_code || planCode,
        validity: chosenPlan?.validity || "",
        network: chosenPlan?.network || "",
        recipient: phone,
        amount: Number(chosenPlan?.price || 0),
        ported,
        failure_reason: err?.message || "Data purchase failed.",
        provider_message: "",
      });
      showToast(err.message || "Purchase failed.", "error");
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_PURCHASE_LOADING_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_PURCHASE_LOADING_MS - elapsed));
      }
      setLoading(false);
    }
  };

  const downloadReceipt = async () => {
    if (!purchaseResult || !receiptCaptureRef.current) return;
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

      const safeReference = String(purchaseResult.reference || "data").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`axisvtu-data-receipt-${safeReference}.pdf`);
      showToast("Receipt downloaded successfully.", "success");
    } catch {
      showToast("Failed to download receipt. Please try again.", "error");
    } finally {
      setDownloadBusy(false);
    }
  };

  const filtered = plans.filter((plan) => {
    const matchesNetwork = network === "all" ? true : (plan.network || "").toLowerCase() === network;
    const haystack = `${plan.plan_name} ${plan.data_size} ${plan.validity}`.toLowerCase();
    const matchesQuery = query ? haystack.includes(query.toLowerCase()) : true;
    return matchesNetwork && matchesQuery;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price_low") return Number(a.price) - Number(b.price);
    if (sort === "price_high") return Number(b.price) - Number(a.price);
    if (sort === "data_high") {
      const aVal = parseSize(a.data_size) || 0;
      const bVal = parseSize(b.data_size) || 0;
      return bVal - aVal;
    }
    return 0;
  });

  const bestValue = sorted.reduce((best, plan) => {
    const size = parseSize(plan.data_size);
    if (!size || !plan.price) return best;
    const ratio = Number(plan.price) / size;
    if (!best || ratio < best.ratio) return { ratio, plan_code: plan.plan_code };
    return best;
  }, null);

  const toggleCompare = (plan) => {
    setCompare((prev) => {
      const exists = prev.find((p) => p.plan_code === plan.plan_code);
      if (exists) return prev.filter((p) => p.plan_code !== plan.plan_code);
      if (prev.length >= 2) return prev;
      return [...prev, plan];
    });
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

  const resultStatusKey = (value) => String(value || "").toLowerCase();
  const resultStatusLabel = (value) => {
    const key = resultStatusKey(value);
    if (key === "success") return "Success";
    if (key === "pending") return "Pending";
    if (key === "failed") return "Failed";
    return String(value || "—");
  };

  const receiptFields = (result) => {
    if (!result) return [];
    return [
      { label: "Network", value: result.network ? String(result.network).toUpperCase() : "—" },
      { label: "Plan", value: result.plan?.plan_name || "—" },
      { label: "Plan Code", value: result.plan_code || "—" },
      { label: "Validity", value: result.validity || "—" },
      { label: "Recipient", value: result.recipient || "—" },
      { label: "Ported Number", value: result.ported ? "Yes" : "No" },
      { label: "Status", value: resultStatusLabel(result.status) },
      { label: "Reference", value: result.reference || "—" },
      { label: "Failure Reason", value: result.failure_reason || "—" },
    ];
  };

  return (
    <div className="page">
      <section className="section">
        <div className="card">
          <h3>Recipient</h3>
          <div className="form-grid">
            <label>
              Phone Number
              <input
                placeholder="08012345678"
                value={phone}
                onChange={(e) => {
                  const nextPhone = e.target.value;
                  setPhone(nextPhone);
                  saveRecipient({ phone: nextPhone, ported });
                }}
              />
            </label>
            <label>
              Network
              <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option value="all">All Networks</option>
                <option value="mtn">MTN</option>
                <option value="glo">Glo</option>
                <option value="airtel">Airtel</option>
                <option value="9mobile">9mobile</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={ported}
                onChange={(e) => {
                  const nextPorted = e.target.checked;
                  setPorted(nextPorted);
                  saveRecipient({ phone, ported: nextPorted });
                }}
              />
              Ported number
            </label>
          </div>
          {fieldError && <div className="error">{fieldError}</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h3>Data Plans</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="muted">{sorted.length} plans</div>
            <button className="ghost" type="button" onClick={loadPlans} disabled={loadingPlans}>
              {loadingPlans ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        {(plansError || walletError) && (
          <div className="notice">
            {plansError || walletError}
          </div>
        )}
        <div className="tab-row">
          {[
            { id: "all", label: "All" },
            { id: "mtn", label: "MTN" },
            { id: "glo", label: "Glo" },
            { id: "airtel", label: "Airtel" },
            { id: "9mobile", label: "9mobile" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`pill tab ${network === item.id ? "active" : ""}`}
              onClick={() => setNetwork(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-bar">
          <input
            placeholder="Search plans (e.g. 1GB, 30d)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Recommended</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="data_high">Data: High to Low</option>
          </select>
        </div>
        <div className="plan-grid">
          {loadingPlans && Array.from({ length: 6 }).map((_, idx) => (
            <div className="card plan-card skeleton" key={`s-${idx}`}>
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-80" />
            </div>
          ))}
          {!loadingPlans && sorted.length === 0 && (
            <div className="empty card">No plans found. Try another network or search term.</div>
          )}
          {!loadingPlans && sorted.map((plan) => (
            <button
              type="button"
              className="card plan-card"
              key={plan.plan_code}
              onClick={() => setSelected(plan)}
            >
              <div className="plan-top">
                <span className={`badge ${networkClass(plan.network)}`}>
                  <span className={`logo ${networkClass(plan.network)}`} />
                  {plan.network?.toUpperCase()}
                </span>
                <span className="plan-cap">{plan.data_size}</span>
              </div>
              <div className="plan-name">{plan.plan_name}</div>
              <div className="plan-meta">
                <span>Validity {plan.validity}</span>
                <span className="price">₦ {plan.price}</span>
              </div>
              <div className="plan-foot">
                <span className="muted">
                  {(() => {
                    const sizeGb = parseSize(plan.data_size);
                    if (!sizeGb) return "—";
                    const rate = Number(plan.price) / sizeGb;
                    return `₦ ${rate.toFixed(0)} / GB`;
                  })()}
                </span>
                <span className="pill">Tap to buy</span>
              </div>
              {bestValue && bestValue.plan_code === plan.plan_code && (
                <div className="best-badge">Best Value</div>
              )}
              <div className="compare-row">
                <button
                  type="button"
                  className={`pill ${compare.find((p) => p.plan_code === plan.plan_code) ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompare(plan);
                  }}
                >
                  Compare
                </button>
              </div>
            </button>
          ))}
        </div>
        {message && <div className="notice">{message}</div>}
      </section>

      {compare.length === 2 && (
        <div className="compare-card card">
          <div className="section-head">
            <h3>Plan Comparison</h3>
            <button className="ghost" onClick={() => setCompare([])}>Clear</button>
          </div>
          <div className="compare-grid">
            {compare.map((plan) => (
              <div key={plan.plan_code} className="compare-item">
                <div className="plan-name">{plan.plan_name}</div>
                <div className="muted">{plan.network?.toUpperCase()}</div>
                <div className="value">₦ {plan.price}</div>
                <div className="muted">{plan.data_size} • {plan.validity}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="label">Confirm Purchase</div>
                <h3>{selected.plan_name}</h3>
              </div>
              <button className="ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="list-card">
                <div>
                  <div className="list-title">Recipient</div>
                  <div className="muted">{phone || "No number entered"}</div>
                </div>
                <div className="list-meta">
                  <div className="value">₦ {selected.price}</div>
                  <span className="pill">{selected.validity}</span>
                </div>
              </div>
              <div className="receipt-grid">
                <div>
                  <div className="label">Network</div>
                  <div>{selected.network?.toUpperCase()}</div>
                </div>
                <div>
                  <div className="label">Ported</div>
                  <div>{ported ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="label">Wallet Balance</div>
                  <div>₦ {wallet?.balance || "0.00"}</div>
                </div>
                <div>
                  <div className="label">Plan Code</div>
                  <div>{selected.plan_code}</div>
                </div>
              </div>
              {wallet && Number(wallet.balance) < Number(selected.price) && (
                <div className="notice">
                  Insufficient balance. Please fund your wallet to continue.
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button
                className="primary"
                disabled={loading || (wallet && Number(wallet.balance) < Number(selected.price))}
                onClick={() => buy(selected.plan_code)}
              >
                {loading ? "Processing..." : "Confirm & Buy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="purchase-loading-screen" role="status" aria-live="polite">
          <div className="purchase-loading-card">
            <div className="purchase-loading-ring">
              <span />
              <span />
              <span />
            </div>
            <div className="purchase-loading-title">Processing Data Purchase</div>
            <div className="purchase-loading-sub">Please wait while we contact the provider and verify response.</div>
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
                ? resultStatusKey(purchaseResult.status) === "success"
                  ? "Data Purchase Successful"
                  : "Data Purchase Pending"
                : "Data Purchase Failed"}
            </div>
            <div className="success-sub">
              {purchaseResult.ok
                ? resultStatusKey(purchaseResult.status) === "success"
                  ? "Your request was completed successfully."
                  : "Request submitted. Final delivery status may update shortly."
                : "We could not complete this request. Please review the receipt details below."}
            </div>
            {purchaseResult.test_mode && (
              <div className="notice" style={{ marginBottom: 10 }}>
                Simulation mode is enabled. This purchase was not sent to live provider.
              </div>
            )}
            {!!purchaseResult.failure_reason && (
              <div className="notice" style={{ marginBottom: 10 }}>
                {purchaseResult.failure_reason}
              </div>
            )}
            <div className="success-grid">
              <div>
                <div className="label">Plan</div>
                <div className="value">{purchaseResult.plan?.plan_name || "—"}</div>
              </div>
              <div>
                <div className="label">Recipient</div>
                <div className="muted">{purchaseResult.recipient || "—"}</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div className="muted">₦ {formatAmount(purchaseResult.amount)}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{purchaseResult.reference}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary" onClick={downloadReceipt} disabled={downloadBusy}>
                {downloadBusy ? "Preparing..." : "Download Receipt"}
              </button>
              <button className="ghost" onClick={() => navigate("/transactions")}>View Receipt</button>
              <button className="ghost" onClick={() => setPurchaseResult(null)}>Done</button>
            </div>
          </div>
          <div className="receipt-capture-layer" aria-hidden="true">
            <div className="receipt-sheet" ref={receiptCaptureRef}>
              <div className="receipt-sheet-header">
                <img src="/brand/axisvtu-logo.svg" alt="AxisVTU" />
                <div>
                  <div className="label">AxisVTU Purchase Receipt</div>
                  <h4>Data Purchase</h4>
                </div>
                <span className={`pill ${resultStatusKey(purchaseResult.status)}`}>
                  {resultStatusLabel(purchaseResult.status)}
                </span>
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
                {receiptFields(purchaseResult).map((item, idx) => (
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
    </div>
  );
}

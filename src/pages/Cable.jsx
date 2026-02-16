import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Cable() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ provider: "dstv", smartcard_number: "", package_code: "basic", amount: 5000 });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
    apiFetch("/services/catalog").then(setCatalog).catch(() => {});
  }, []);

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

  const buy = async (e) => {
    e.preventDefault();
    const payload = validate();
    if (!payload) return;
    setLoading(true);
    try {
      const res = await apiFetch("/services/cable/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess({
        reference: res.reference,
        provider: payload.provider,
        smartcard: payload.smartcard_number,
        package_code: payload.package_code,
        amount: payload.amount,
      });
      showToast("Cable successful.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      showToast(err?.message || "Cable failed.", "error");
    } finally {
      setLoading(false);
    }
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
          <div className="hint">Tip: use a simple package code for now. We’ll add real bouquet lists next.</div>
        </div>
      </section>

      {success && (
        <div className="success-screen" role="dialog" aria-live="polite">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <div className="success-title">Cable Successful</div>
            <div className="success-sub">Your subscription payment has been processed.</div>
            <div className="success-grid">
              <div>
                <div className="label">Provider</div>
                <div className="value">{String(success.provider).toUpperCase()}</div>
              </div>
              <div>
                <div className="label">Smartcard</div>
                <div className="muted">{success.smartcard}</div>
              </div>
              <div>
                <div className="label">Package</div>
                <div className="muted">{success.package_code}</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div className="value">₦ {success.amount}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{success.reference}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost" type="button" onClick={() => setSuccess(null)}>Close</button>
              <button className="primary" type="button" onClick={() => navigate("/transactions")}>View Receipt</button>
              <button className="ghost" type="button" onClick={() => navigate("/cable")}>Pay Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

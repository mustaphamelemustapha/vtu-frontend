import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Electricity() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ disco: "ikeja", meter_type: "prepaid", meter_number: "", amount: 2000 });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
    apiFetch("/services/catalog").then(setCatalog).catch(() => {});
  }, []);

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

  const buy = async (e) => {
    e.preventDefault();
    const payload = validate();
    if (!payload) return;
    setLoading(true);
    try {
      const res = await apiFetch("/services/electricity/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess({
        reference: res.reference,
        disco: payload.disco,
        meter_type: payload.meter_type,
        meter_number: payload.meter_number,
        amount: payload.amount,
        token: res.token,
      });
      showToast("Electricity successful.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      showToast(err?.message || "Electricity failed.", "error");
    } finally {
      setLoading(false);
    }
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
        </div>
      </section>

      {success && (
        <div className="success-screen" role="dialog" aria-live="polite">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <div className="success-title">Electricity Successful</div>
            <div className="success-sub">Your token is ready.</div>
            <div className="success-grid">
              <div>
                <div className="label">Disco</div>
                <div className="value">{String(success.disco).toUpperCase()}</div>
              </div>
              <div>
                <div className="label">Meter</div>
                <div className="muted">{success.meter_number}</div>
              </div>
              <div>
                <div className="label">Type</div>
                <div className="muted">{String(success.meter_type).toUpperCase()}</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div className="value">₦ {success.amount}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{success.reference}</div>
              </div>
              <div>
                <div className="label">Token</div>
                <div className="value" style={{ fontSize: 18 }}>{success.token || "—"}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost" type="button" onClick={() => setSuccess(null)}>Close</button>
              <button className="primary" type="button" onClick={() => navigate("/transactions")}>View Receipt</button>
              <button className="ghost" type="button" onClick={() => navigate("/electricity")}>Buy Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

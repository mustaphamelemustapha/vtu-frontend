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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
    apiFetch("/services/catalog").then(setCatalog).catch(() => {});
  }, []);

  const buy = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/services/electricity/purchase", {
        method: "POST",
        body: JSON.stringify({
          disco: form.disco,
          meter_type: form.meter_type,
          meter_number: form.meter_number,
          amount: Number(form.amount),
        }),
      });
      setSuccess({
        reference: res.reference,
        disco: form.disco,
        meter_type: form.meter_type,
        meter_number: form.meter_number,
        amount: form.amount,
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
            <label>
              Disco
              <select value={form.disco} onChange={(e) => setForm({ ...form, disco: e.target.value })}>
                {discos.map((d) => (
                  <option key={d} value={d}>{String(d).toUpperCase()}</option>
                ))}
              </select>
            </label>
            <label>
              Meter Type
              <select value={form.meter_type} onChange={(e) => setForm({ ...form, meter_type: e.target.value })}>
                <option value="prepaid">Prepaid</option>
                <option value="postpaid">Postpaid</option>
              </select>
            </label>
            <label>
              Meter Number
              <input
                placeholder="Enter meter number"
                value={form.meter_number}
                onChange={(e) => setForm({ ...form, meter_number: e.target.value })}
                required
              />
            </label>
            <label>
              Amount (₦)
              <input
                type="number"
                min="500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
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


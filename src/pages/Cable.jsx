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
      const res = await apiFetch("/services/cable/purchase", {
        method: "POST",
        body: JSON.stringify({
          provider: form.provider,
          smartcard_number: form.smartcard_number,
          package_code: form.package_code,
          amount: Number(form.amount),
        }),
      });
      setSuccess({
        reference: res.reference,
        provider: form.provider,
        smartcard: form.smartcard_number,
        package_code: form.package_code,
        amount: form.amount,
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
            <label>
              Provider
              <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label>
              Smartcard / IUC Number
              <input
                placeholder="Enter smartcard number"
                value={form.smartcard_number}
                onChange={(e) => setForm({ ...form, smartcard_number: e.target.value })}
                required
              />
            </label>
            <label>
              Package Code
              <input
                placeholder="e.g. basic, premium"
                value={form.package_code}
                onChange={(e) => setForm({ ...form, package_code: e.target.value })}
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


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Airtime() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ network: "mtn", phone_number: "", amount: 200 });
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
      const res = await apiFetch("/services/airtime/purchase", {
        method: "POST",
        body: JSON.stringify({
          network: form.network,
          phone_number: form.phone_number,
          amount: Number(form.amount),
        }),
      });
      setSuccess({
        reference: res.reference,
        network: form.network,
        phone: form.phone_number,
        amount: form.amount,
      });
      showToast("Airtime successful.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      showToast(err?.message || "Airtime failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const networks = catalog?.airtime_networks || ["mtn", "glo", "airtel", "9mobile"];

  return (
    <div className="page">
      <section className="hero-card">
        <div>
          <div className="label">Airtime</div>
          <div className="hero-value">Top up</div>
          <div className="muted">Fast airtime delivery with a receipt you can track.</div>
        </div>
        <div className="hero-actions">
          <button className="ghost" type="button" onClick={() => navigate("/services")}>All Services</button>
          <button className="primary" type="button" onClick={() => navigate("/wallet")}>Fund Wallet</button>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="section-head">
            <h3>Buy Airtime</h3>
            <span className="muted">Balance: ₦ {wallet?.balance || "0.00"}</span>
          </div>
          <form className="form-grid" onSubmit={buy}>
            <label>
              Network
              <select value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>
                {networks.map((n) => (
                  <option key={n} value={n}>{String(n).toUpperCase()}</option>
                ))}
              </select>
            </label>
            <label>
              Phone Number
              <input
                placeholder="08012345678"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                required
              />
            </label>
            <label>
              Amount (₦)
              <input
                type="number"
                min="50"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </label>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Buy Airtime"}
            </button>
          </form>
        </div>
      </section>

      {success && (
        <div className="success-screen" role="dialog" aria-live="polite">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <div className="success-title">Airtime Successful</div>
            <div className="success-sub">Your top up has been processed.</div>
            <div className="success-grid">
              <div>
                <div className="label">Network</div>
                <div className="value">{String(success.network).toUpperCase()}</div>
              </div>
              <div>
                <div className="label">Phone</div>
                <div className="muted">{success.phone}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{success.reference}</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div className="value">₦ {success.amount}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost" type="button" onClick={() => setSuccess(null)}>Close</button>
              <button className="primary" type="button" onClick={() => navigate("/transactions")}>View Receipt</button>
              <button className="ghost" type="button" onClick={() => navigate("/airtime")}>Buy Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


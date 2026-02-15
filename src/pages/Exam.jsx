import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Exam() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({ exam: "waec", quantity: 1, phone_number: "" });
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
      const res = await apiFetch("/services/exam/purchase", {
        method: "POST",
        body: JSON.stringify({
          exam: form.exam,
          quantity: Number(form.quantity || 1),
          phone_number: form.phone_number || null,
        }),
      });
      setSuccess({
        reference: res.reference,
        exam: form.exam,
        quantity: form.quantity,
        pins: res.pins || [],
      });
      showToast("Pins generated.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      showToast(err?.message || "Purchase failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const exams = catalog?.exam_types || ["waec", "neco", "jamb"];

  const copyPins = async () => {
    try {
      const value = (success?.pins || []).join("\n");
      await navigator.clipboard?.writeText(value);
      showToast("Pins copied.", "success");
    } catch {
      showToast("Copy failed.", "error");
    }
  };

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
            <label>
              Exam Type
              <select value={form.exam} onChange={(e) => setForm({ ...form, exam: e.target.value })}>
                {exams.map((x) => (
                  <option key={x} value={x}>{String(x).toUpperCase()}</option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max="10"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </label>
            <label>
              Phone Number (optional)
              <input
                placeholder="08012345678"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
            </label>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Buy Pins"}
            </button>
          </form>
          <div className="hint">Demo pricing: ₦ 2,000 per PIN for now.</div>
        </div>
      </section>

      {success && (
        <div className="success-screen" role="dialog" aria-live="polite">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <div className="success-title">Pins Ready</div>
            <div className="success-sub">Copy and keep them safe.</div>
            <div className="success-grid">
              <div>
                <div className="label">Exam</div>
                <div className="value">{String(success.exam).toUpperCase()}</div>
              </div>
              <div>
                <div className="label">Quantity</div>
                <div className="value">{success.quantity}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{success.reference}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="label">Pins</div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{(success.pins || []).join("\n") || "—"}</pre>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost" type="button" onClick={() => setSuccess(null)}>Close</button>
              <button className="primary" type="button" onClick={copyPins}>Copy Pins</button>
              <button className="ghost" type="button" onClick={() => navigate("/transactions")}>View Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


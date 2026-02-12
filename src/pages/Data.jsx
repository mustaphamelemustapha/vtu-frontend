import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Data() {
  const [plans, setPlans] = useState([]);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("all");
  const [ported, setPorted] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    apiFetch("/data/plans").then(setPlans).catch(() => {});
  }, []);

  const buy = async (planCode) => {
    setMessage("");
    try {
      if (!phone) {
        setMessage("Enter a valid phone number.");
        return;
      }
      setLoading(true);
      const res = await apiFetch("/data/purchase", {
        method: "POST",
        body: JSON.stringify({ plan_code: planCode, phone_number: phone, ported_number: ported })
      });
      setToast(`Purchase ${res.status}`);
      setSelected(null);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = network === "all"
    ? plans
    : plans.filter((plan) => (plan.network || "").toLowerCase() === network);

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
                onChange={(e) => setPhone(e.target.value)}
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
              <input type="checkbox" checked={ported} onChange={(e) => setPorted(e.target.checked)} />
              Ported number
            </label>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h3>Data Plans</h3>
          <div className="muted">{filtered.length} plans</div>
        </div>
        <div className="plan-grid">
          {filtered.map((plan) => (
            <button
              type="button"
              className="card plan-card"
              key={plan.plan_code}
              onClick={() => setSelected(plan)}
            >
              <div className="plan-top">
                <span className={`badge ${plan.network}`}>{plan.network?.toUpperCase()}</span>
                <span className="plan-cap">{plan.data_size}</span>
              </div>
              <div className="plan-name">{plan.plan_name}</div>
              <div className="plan-meta">
                <span>Validity {plan.validity}</span>
                <span className="price">₦ {plan.price}</span>
              </div>
            </button>
          ))}
        </div>
        {message && <div className="notice">{message}</div>}
      </section>

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
              <div className="muted">Network: {selected.network?.toUpperCase()}</div>
              <div className="muted">Ported number: {ported ? "Yes" : "No"}</div>
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button className="primary" disabled={loading} onClick={() => buy(selected.plan_code)}>
                {loading ? "Processing..." : "Confirm & Buy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" onAnimationEnd={() => setToast("")}>
          {toast}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Data() {
  const [plans, setPlans] = useState([]);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/data/plans").then(setPlans).catch(() => {});
  }, []);

  const buy = async (planCode) => {
    setMessage("");
    try {
      const res = await apiFetch("/data/purchase", {
        method: "POST",
        body: JSON.stringify({ plan_code: planCode, phone_number: phone })
      });
      setMessage(`Purchase ${res.status}`);
    } catch (err) {
      setMessage(err.message);
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
          </div>
        </div>
      </section>

      <section className="section">
        <h3>Data Plans</h3>
        <div className="grid-3">
          {filtered.map((plan) => (
            <div className="card plan-card" key={plan.plan_code}>
              <div className="label">{plan.plan_name}</div>
              <div className="value">₦ {plan.price}</div>
              <div className="muted">{plan.data_size} • {plan.validity}</div>
              <button className="primary" onClick={() => buy(plan.plan_code)}>Buy</button>
            </div>
          ))}
        </div>
        {message && <div className="notice">{message}</div>}
      </section>
    </div>
  );
}

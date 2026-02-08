import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Data() {
  const [plans, setPlans] = useState([]);
  const [phone, setPhone] = useState("");
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

  return (
    <div>
      <h2>Data Plans</h2>
      <div className="card">
        <input
          placeholder="Recipient phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="grid">
          {plans.map((plan) => (
            <div className="card" key={plan.plan_code}>
              <div className="label">{plan.plan_name}</div>
              <div className="value">₦ {plan.price}</div>
              <div className="muted">{plan.data_size} • {plan.validity}</div>
              <button className="primary" onClick={() => buy(plan.plan_code)}>Buy</button>
            </div>
          ))}
        </div>
        {message && <div className="notice">{message}</div>}
      </div>
    </div>
  );
}

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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [compare, setCompare] = useState([]);

  useEffect(() => {
    setLoadingPlans(true);
    apiFetch("/data/plans")
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
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
      const aVal = parseFloat(String(a.data_size));
      const bVal = parseFloat(String(b.data_size));
      return bVal - aVal;
    }
    return 0;
  });

  const bestValue = sorted.reduce((best, plan) => {
    const size = parseFloat(String(plan.data_size));
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
          <div className="muted">{sorted.length} plans</div>
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
          {!loadingPlans && sorted.map((plan) => (
            <button
              type="button"
              className="card plan-card"
              key={plan.plan_code}
              onClick={() => setSelected(plan)}
            >
              <div className="plan-top">
                <span className={`badge ${plan.network}`}>
                  <span className={`logo ${plan.network}`} />
                  {plan.network?.toUpperCase()}
                </span>
                <span className="plan-cap">{plan.data_size}</span>
              </div>
              <div className="plan-name">{plan.plan_name}</div>
              <div className="plan-meta">
                <span>Validity {plan.validity}</span>
                <span className="price">₦ {plan.price}</span>
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

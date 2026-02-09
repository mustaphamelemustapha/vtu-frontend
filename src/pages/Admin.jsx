import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Admin() {
  const [analytics, setAnalytics] = useState(null);
  const [form, setForm] = useState({ network: "mtn", role: "user", margin: 0 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/admin/analytics").then(setAnalytics).catch(() => {});
  }, []);

  const updatePricing = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await apiFetch("/admin/pricing", {
        method: "POST",
        body: JSON.stringify({
          network: form.network,
          role: form.role,
          margin: Number(form.margin)
        })
      });
      setMessage("Pricing updated");
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="page">
      <section className="section">
        <div className="grid-3">
          <div className="card">
            <div className="label">Total Revenue</div>
            <div className="value">₦ {analytics?.total_revenue || 0}</div>
          </div>
          <div className="card">
            <div className="label">Total Users</div>
            <div className="value">{analytics?.total_users || 0}</div>
          </div>
          <div className="card">
            <div className="label">API Success</div>
            <div className="value">{analytics?.api_success || 0}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h3>Pricing Rules</h3>
          <form onSubmit={updatePricing} className="form-grid">
            <label>
              Network
              <input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">User</option>
                <option value="reseller">Reseller</option>
              </select>
            </label>
            <label>
              Margin (₦)
              <input type="number" value={form.margin} onChange={(e) => setForm({ ...form, margin: e.target.value })} />
            </label>
            <button className="primary" type="submit">Update</button>
          </form>
          {message && <div className="notice">{message}</div>}
        </div>
      </section>
    </div>
  );
}

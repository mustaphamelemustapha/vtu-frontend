import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setProfile, setToken } from "../services/api";

export default function AdminLogin({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      setToken(data.access_token, rememberMe);
      const profile = await apiFetch("/auth/me");
      if ((profile.role || "").toLowerCase() !== "admin") {
        setError("This account is not an admin.");
        return;
      }
      setProfile({ full_name: profile.full_name, email: profile.email, role: profile.role });
      onAuth();
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <h1>Admin Login</h1>
        <p className="muted">Authorized access only.</p>
        <form onSubmit={submit} className="form-grid">
          <label>
            Email
            <input
              type="email"
              placeholder="admin@domain.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary" type="submit">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

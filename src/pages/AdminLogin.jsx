import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearToken, setAuthTokens, setProfile } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function AdminLogin({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { showToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error("Invalid authentication response");
      }
      setAuthTokens(data.access_token, data.refresh_token, rememberMe);
      const profile = await apiFetch("/auth/me");
      if ((profile.role || "").toLowerCase() !== "admin") {
        clearToken();
        setError("This account is not an admin.");
        showToast("This account is not an admin.", "error");
        return;
      }
      setProfile({ full_name: profile.full_name, email: profile.email, role: profile.role });
      onAuth({
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
      });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
      showToast(err.message || "Admin login failed.", "error");
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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearToken, setAuthTokens, setProfile, warmBackend } from "../services/api";
import { useToast } from "../context/toast.jsx";
import Button from "../components/ui/Button.jsx";

export default function AdminLogin({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { showToast } = useToast();

  const isTransientConnectionError = (value) => {
    const msg = String(value || "").toLowerCase();
    return (
      msg.includes("timed out") ||
      msg.includes("timeout") ||
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network error") ||
      msg.includes("service is busy") ||
      msg.includes("503") ||
      msg.includes("502") ||
      msg.includes("504")
    );
  };

  const presentError = (err, fallback = "Admin login failed.") => {
    const raw = String(err?.message || "").trim();
    if (!raw) return fallback;
    if (isTransientConnectionError(raw)) {
      return "Connection is unstable. Server may be waking up, please try again.";
    }
    if (raw.length> 160) return fallback;
    return raw;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      warmBackend(9000).catch(() => {});
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password }),
        _suppressRetryToast: true,
      });
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error("Invalid authentication response");
      }
      setAuthTokens(data.access_token, data.refresh_token, rememberMe);
      const profile = await apiFetch("/auth/me", { _suppressRetryToast: true });
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
      const next = presentError(err, "Admin login failed.");
      setError(next);
      showToast(next, isTransientConnectionError(next) ? "warning" : "error");
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
          <Button type="submit">
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}

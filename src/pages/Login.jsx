import { useState } from "react";
import { apiFetch, setToken } from "../services/api";

export default function Login({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    full_name: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (form.password !== form.confirm_password) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name
          })
        });
        setNotice("Account created. Please log in.");
        setMode("login");
        setForm({ email: form.email, password: "", confirm_password: "", full_name: "" });
        setLoading(false);
        return;
      }
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      setToken(data.access_token);
      onAuth();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="muted">Secure VTU platform for data and wallet payments.</p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="field">
              <label>Full name</label>
              <input
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                maxLength={72}
                required
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {mode === "register" && (
            <div className="field">
              <label>Confirm password</label>
              <div className="input-group">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}
          <div className="hint">Password max 72 characters.</div>
          {error && <div className="error">{error}</div>}
          {notice && <div className="notice">{notice}</div>}
          <button className="primary" type="submit">
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>
        </form>
        <button
          className="link"
          disabled={loading}
          onClick={() => {
            setError("");
            setNotice("");
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

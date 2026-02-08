import { useState } from "react";
import { apiFetch, setToken } from "../services/api";

export default function Login({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "register") {
        await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name
          })
        });
      }
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      setToken(data.access_token);
      onAuth();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="muted">Secure VTU platform for data and wallet payments.</p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <input
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <div className="error">{error}</div>}
          <button className="primary" type="submit">
            {mode === "login" ? "Login" : "Register"}
          </button>
        </form>
        <button className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

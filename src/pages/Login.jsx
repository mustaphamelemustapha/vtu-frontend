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
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const validateField = (name, value) => {
    let message = "";
    if (name === "email") {
      if (!value) message = "Email is required";
    }
    if (name === "password") {
      if (!value) message = "Password is required";
      if (value && value.length > 72) message = "Password max 72 characters";
    }
    if (name === "confirm_password") {
      if (mode === "register") {
        if (!value) message = "Confirm your password";
        if (value && value !== form.password) message = "Passwords do not match";
      }
    }
    if (name === "full_name" && mode === "register") {
      if (!value) message = "Full name is required";
    }
    setFieldErrors((prev) => ({ ...prev, [name]: message }));
    return message;
  };

  const validateAll = () => {
    const entries = [
      ["email", form.email],
      ["password", form.password],
      ["confirm_password", form.confirm_password],
      ["full_name", form.full_name]
    ];
    const errors = {};
    entries.forEach(([name, value]) => {
      const msg = validateField(name, value);
      if (msg) errors[name] = msg;
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!forgotEmail) {
      setError("Enter your email to reset password");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail })
      });
      setNotice("If the email exists, a reset link will be sent.");
      setForgotMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (!validateAll()) {
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
      if (!validateAll()) {
        setLoading(false);
        return;
      }
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      setToken(data.access_token, rememberMe);
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
        {forgotMode ? (
          <form onSubmit={submitForgot}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="Email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            {error && <div className="error">{error}</div>}
            {notice && <div className="notice">{notice}</div>}
            <button className="primary" type="submit">
              {loading ? "Please wait..." : "Send reset link"}
            </button>
            <button className="link" type="button" onClick={() => setForgotMode(false)}>
              Back to login
            </button>
          </form>
        ) : (
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="field">
              <label>Full name</label>
              <input
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                onBlur={(e) => validateField("full_name", e.target.value)}
                required
              />
              {fieldErrors.full_name && <div className="error inline">{fieldErrors.full_name}</div>}
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={(e) => validateField("email", e.target.value)}
              required
            />
            {fieldErrors.email && <div className="error inline">{fieldErrors.email}</div>}
          </div>
          <div className="field">
            <label>Password</label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onBlur={(e) => validateField("password", e.target.value)}
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
            {fieldErrors.password && <div className="error inline">{fieldErrors.password}</div>}
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
                  onBlur={(e) => validateField("confirm_password", e.target.value)}
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
              {fieldErrors.confirm_password && <div className="error inline">{fieldErrors.confirm_password}</div>}
            </div>
          )}
          <div className="hint">Password max 72 characters.</div>
          {mode === "login" && (
            <div className="row-between">
              <label className="check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <button className="link" type="button" onClick={() => setForgotMode(true)}>
                Forgot password?
              </button>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          {notice && <div className="notice">{notice}</div>}
          <button className="primary" type="submit">
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>
        </form>
        )}
        <button
          className="link"
          disabled={loading}
          onClick={() => {
            setError("");
            setNotice("");
            setFieldErrors({});
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

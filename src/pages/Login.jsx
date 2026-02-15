import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAuthTokens, setProfile } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Login({ onAuth }) {
  const navigate = useNavigate();
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
  const [resetMode, setResetMode] = useState(false);
  const [resetForm, setResetForm] = useState({ token: "", password: "", confirm: "" });
  const { showToast } = useToast();

  useEffect(() => {
    // Email reset link support: /app/?reset=1&token=...
    try {
      const params = new URLSearchParams(window.location.search || "");
      const token = params.get("token") || params.get("reset_token");
      const wantsReset = params.get("reset") === "1" || params.get("reset") === "true";
      if (token && (wantsReset || token.length > 10)) {
        setForgotMode(false);
        setMode("login");
        setResetMode(true);
        setResetForm({ token, password: "", confirm: "" });
        setNotice("Set a new password to finish resetting your account.");
      }
    } catch {
      // ignore
    }
  }, []);

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

  const passwordStrength = (value) => {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score; // 0-4
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
      showToast("Enter your email to reset password", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail })
      });
      const message = res?.message || "If the email exists, a reset link will be sent.";
      if (res?.reset_token) {
        // Dev/test convenience: backend may return a token outside production.
        setResetForm({ token: res.reset_token, password: "", confirm: "" });
        setNotice("Reset token generated. Set a new password.");
        showToast("Reset token generated. Set a new password.", "success");
        setForgotMode(false);
        setResetMode(true);
      } else {
        setNotice(message);
        showToast(message, "info");
        setForgotMode(false);
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message || "Password reset request failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!resetForm.token || !resetForm.password) {
      setError("All fields are required");
      showToast("All fields are required", "error");
      return;
    }
    if (resetForm.password !== resetForm.confirm) {
      setError("Passwords do not match");
      showToast("Passwords do not match", "error");
      return;
    }
    if (resetForm.password.length > 72) {
      setError("Password max 72 characters");
      showToast("Password max 72 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetForm.token, new_password: resetForm.password })
      });
      setNotice("Password reset successful. Please log in.");
      showToast("Password reset successful. Please log in.", "success");
      setResetMode(false);
      setMode("login");
      setResetForm({ token: "", password: "", confirm: "" });
    } catch (err) {
      setError(err.message);
      showToast(err.message || "Password reset failed.", "error");
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
          showToast("Please fix the highlighted fields.", "error");
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
        setProfile({ full_name: form.full_name, email: form.email, role: "user" });
        setNotice("Account created. Please log in.");
        showToast("Account created. Please log in.", "success");
        setMode("login");
        setForm({ email: form.email, password: "", confirm_password: "", full_name: "" });
        setLoading(false);
        return;
      }
      if (!validateAll()) {
        setLoading(false);
        showToast("Please fix the highlighted fields.", "error");
        return;
      }
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error("Invalid authentication response");
      }
      setAuthTokens(data.access_token, data.refresh_token, rememberMe);
      const profile = await apiFetch("/auth/me");
      setProfile({ full_name: profile.full_name, email: profile.email, role: profile.role });
      onAuth();
      if ((profile.role || "").toLowerCase() === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message || "Login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-shell">
        <div className="auth-left">
          <div className="auth-left-inner">
            <div className="auth-brand">
              <div className="auth-mark">
                <img src="/pwa/pwa-192.png" alt="AxisVTU" />
              </div>
              <div>
                <div className="auth-brand-title">AxisVTU</div>
                <div className="auth-brand-sub">Fast VTU. Clean receipts. Wallet-first.</div>
              </div>
            </div>
            <h2 className="auth-pitch">A premium VTU dashboard built for speed.</h2>
            <p className="muted">
              Fund your wallet, deliver data instantly, and track every transaction with receipts and status.
            </p>
            <div className="auth-bullets">
              <div className="auth-bullet">
                <span className="dot" aria-hidden="true" />
                <div>
                  <div className="auth-bullet-title">Wallet funding</div>
                  <div className="muted">Paystack checkout with verification flow.</div>
                </div>
              </div>
              <div className="auth-bullet">
                <span className="dot" aria-hidden="true" />
                <div>
                  <div className="auth-bullet-title">Buy data</div>
                  <div className="muted">MTN and Glo plans, simple confirmations.</div>
                </div>
              </div>
              <div className="auth-bullet">
                <span className="dot" aria-hidden="true" />
                <div>
                  <div className="auth-bullet-title">Receipts</div>
                  <div className="muted">Copy references, track history, stay audit-ready.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-card">
            <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
            <p className="muted">Secure VTU platform for data and wallet payments.</p>
        {resetMode ? (
          <form onSubmit={submitReset} className="auth-wide">
            <div className="field">
              <label>Reset token</label>
              <input
                placeholder="Paste reset token"
                value={resetForm.token}
                onChange={(e) => setResetForm({ ...resetForm, token: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>New password</label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={resetForm.password}
                  onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="input-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="strength">
                <div className={`bar s${passwordStrength(resetForm.password)}`} />
                <span>
                  {["Too weak", "Weak", "Okay", "Strong", "Excellent"][passwordStrength(resetForm.password)]}
                </span>
              </div>
            </div>
            <div className="field">
              <label>Confirm password</label>
              <div className="input-group">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={resetForm.confirm}
                  onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="input-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && <div className="error">{error}</div>}
            {notice && <div className="notice">{notice}</div>}
            <button className="primary" type="submit">
              {loading ? "Please wait..." : "Reset password"}
            </button>
            <button className="link" type="button" onClick={() => setResetMode(false)}>
              Back to login
            </button>
          </form>
        ) : forgotMode ? (
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
            <button className="link" type="button" onClick={() => { setForgotMode(false); setResetMode(true); }}>
              I have a reset token
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
                onChange={(e) => {
                  setForm({ ...form, full_name: e.target.value });
                  validateField("full_name", e.target.value);
                }}
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
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  validateField("email", e.target.value);
                }}
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
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  validateField("password", e.target.value);
                }}
                onBlur={(e) => validateField("password", e.target.value)}
                maxLength={72}
                required
              />
              <button
                type="button"
                className="input-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="strength">
              <div className={`bar s${passwordStrength(form.password)}`} />
              <span>
                {["Too weak", "Weak", "Okay", "Strong", "Excellent"][passwordStrength(form.password)]}
              </span>
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
                  onChange={(e) => {
                    setForm({ ...form, confirm_password: e.target.value });
                    validateField("confirm_password", e.target.value);
                  }}
                  onBlur={(e) => validateField("confirm_password", e.target.value)}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="input-btn"
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
      </div>
    </div>
  );
}

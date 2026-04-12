import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAuthTokens, setProfile, warmBackend } from "../services/api";
import { useToast } from "../context/toast.jsx";
import Button from "../components/ui/Button.jsx";

export default function Login({ onAuth, modeRoute = "login" }) {
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

  const presentError = (err, fallback = "Something went wrong. Please try again.") => {
    const raw = String(err?.message || "").trim();
    if (!raw) return fallback;
    if (isTransientConnectionError(raw)) {
      return "Connection is unstable. Server may be waking up, please try again.";
    }
    if (raw.length > 160) return fallback;
    return raw;
  };

  const decodeRoleFromToken = (token) => {
    try {
      const parts = String(token || "").split(".");
      if (parts.length < 2) return "user";
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
      const payload = JSON.parse(atob(padded));
      return String(payload?.role || "user").toLowerCase();
    } catch {
      return "user";
    }
  };

  const fetchProfileWithRetry = async (retries = 2) => {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await apiFetch("/auth/me", { _suppressRetryToast: true });
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || "").toLowerCase();
        const isBusy = msg.includes("service is busy") || msg.includes("503");
        if (!isBusy || attempt >= retries) break;
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    throw lastError || new Error("Failed to load profile");
  };

  useEffect(() => {
    setError("");
    setNotice("");
    setFieldErrors({});
    if (modeRoute === "register") {
      setMode("register");
      setForgotMode(false);
      setResetMode(false);
      return;
    }
    if (modeRoute === "reset") {
      setMode("login");
      setForgotMode(true);
      setResetMode(false);
      return;
    }
    setMode("login");
    setForgotMode(false);
    setResetMode(false);
  }, [modeRoute]);

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
      const next = presentError(err, "Password reset request failed.");
      if (isTransientConnectionError(next)) {
        setError("");
        setNotice(next);
      } else {
        setError(next);
      }
      showToast(next, isTransientConnectionError(next) ? "warning" : "error");
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
      const next = presentError(err, "Password reset failed.");
      if (isTransientConnectionError(next)) {
        setError("");
        setNotice(next);
      } else {
        setError(next);
      }
      showToast(next, isTransientConnectionError(next) ? "warning" : "error");
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
        navigate("/login", { replace: true });
        setLoading(false);
        return;
      }
      if (!validateAll()) {
        setLoading(false);
        showToast("Please fix the highlighted fields.", "error");
        return;
      }
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
      let profile = null;
      try {
        profile = await fetchProfileWithRetry(2);
      } catch (err) {
        const role = decodeRoleFromToken(data.access_token);
        profile = {
          full_name: form.email.split("@")[0] || "User",
          email: form.email,
          role,
        };
        setNotice("Logged in. Syncing profile...");
        showToast("Logged in. Syncing profile...", "warning");
        setError("");
      }
      setProfile({ full_name: profile.full_name, email: profile.email, role: profile.role });
      onAuth({
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
      });
      if ((profile.role || "").toLowerCase() === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const next = presentError(err, "Login failed.");
      if (isTransientConnectionError(next)) {
        setError("");
        setNotice(next);
      } else {
        setError(next);
      }
      showToast(next, isTransientConnectionError(next) ? "warning" : "error");
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
            <h2 className="auth-pitch">Welcome to AxisVTU</h2>
            <p className="muted">Sign in to buy data, airtime, pay bills, and manage your wallet in one place.</p>
            <div className="auth-tags">
              <span className="auth-tag">Fast login</span>
              <span className="auth-tag">Secure wallet</span>
              <span className="auth-tag">Instant purchases</span>
            </div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-card">
            <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
            <p className="muted">{mode === "login" ? "Enter your email and password to continue." : "Create your account to start using AxisVTU."}</p>
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
            <Button type="submit">
              {loading ? "Please wait..." : "Reset password"}
            </Button>
            <button className="link" type="button" onClick={() => navigate("/login")}>
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
            <Button type="submit">
              {loading ? "Please wait..." : "Send reset link"}
            </Button>
            <button className="link" type="button" onClick={() => { setForgotMode(false); setResetMode(true); }}>
              I have a reset token
            </button>
            <button className="link" type="button" onClick={() => navigate("/login")}>
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
                data-testid="auth-email"
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
            <label>{mode === "register" ? "Create password" : "Password"}</label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                data-testid="auth-password"
                placeholder={mode === "register" ? "Create password" : "Password"}
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  validateField("password", e.target.value);
                }}
                onBlur={(e) => validateField("password", e.target.value)}
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
                  placeholder="Confirm created password"
                  value={form.confirm_password}
                  onChange={(e) => {
                    setForm({ ...form, confirm_password: e.target.value });
                    validateField("confirm_password", e.target.value);
                  }}
                  onBlur={(e) => validateField("confirm_password", e.target.value)}
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
              <button className="link" type="button" onClick={() => navigate("/reset-password")}>
                Forgot password?
              </button>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          {notice && <div className="notice">{notice}</div>}
          <Button type="submit" data-testid="auth-submit">
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </Button>
        </form>
        )}
        <button
          className="link"
          disabled={loading}
          onClick={() => {
            setError("");
            setNotice("");
            setFieldErrors({});
            navigate(mode === "login" ? "/register" : "/login");
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

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
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetFlowType, setResetFlowType] = useState("password");
  const [resetForm, setResetForm] = useState({ token: "", password: "", confirm: "" });
  const { showToast } = useToast();
  const isPlainLoginView = mode === "login" && !forgotMode && !resetMode;
  const isRegisterView = mode === "register" && !forgotMode && !resetMode;
  const isResetRequestView = forgotMode && !resetMode;
  const isResetPageView = resetMode;
  const isResetSuccessView = forgotSuccess || resetSuccess;

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
    if (raw.length> 160) return fallback;
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
        if (!isBusy || attempt>= retries) break;
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    throw lastError || new Error("Failed to load profile");
  };

  useEffect(() => {
    setError("");
    setNotice("");
    setFieldErrors({});
    setForgotSuccess(false);
    setResetSuccess(false);
    if (modeRoute === "register") {
      setMode("register");
      setForgotMode(false);
      setResetMode(false);
      setResetFlowType("password");
      return;
    }
    if (modeRoute === "reset") {
      setMode("login");
      setForgotMode(true);
      setResetMode(false);
      setResetFlowType("password");
      return;
    }
    if (modeRoute === "reset-pin") {
      setMode("login");
      setForgotMode(false);
      setResetMode(true);
      setResetFlowType("pin");
      return;
    }
    setMode("login");
    setForgotMode(false);
    setResetMode(false);
    setResetFlowType("password");
  }, [modeRoute]);

  useEffect(() => {
    // Email reset link support: /app/?reset=1&token=...
    try {
      const params = new URLSearchParams(window.location.search || "");
      const token = params.get("token") || params.get("reset_token");
      const wantsReset = params.get("reset") === "1" || params.get("reset") === "true";
      const flow = String(params.get("flow") || params.get("kind") || "").toLowerCase();
      const resetFlag = String(params.get("reset") || "").toLowerCase();
      const path = String(window.location.pathname || "").toLowerCase();
      const looksLikePinReset = flow === "pin" || resetFlag === "pin" || path.includes("reset-pin");
      if (token && (wantsReset || token.length > 10 || looksLikePinReset)) {
        setForgotMode(false);
        setMode("login");
        setResetMode(true);
        setResetFlowType(looksLikePinReset ? "pin" : "password");
        setForgotSuccess(false);
        setResetSuccess(false);
        setResetForm({ token, password: "", confirm: "" });
        setNotice(
          looksLikePinReset
            ? "Create a new 4-digit PIN to finish resetting your account."
            : "Set a new password to finish resetting your account."
        );
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
    if (value.length>= 8) score += 1;
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
        setForgotSuccess(false);
        setResetSuccess(false);
        setNotice("Reset token generated. Set a new password.");
        showToast("Reset token generated. Set a new password.", "success");
        setForgotMode(false);
        setResetMode(true);
      } else {
        setForgotSuccess(true);
        setNotice(message);
        showToast(message, "info");
        setForgotMode(false);
        setResetMode(false);
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
      if (resetFlowType === "pin") {
        await apiFetch("/security/pin/reset-confirm", {
          method: "POST",
          body: JSON.stringify({
            token: resetForm.token,
            new_pin: resetForm.password,
            confirm_pin: resetForm.confirm
          })
        });
      } else {
        await apiFetch("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token: resetForm.token, new_password: resetForm.password })
        });
      }
      setResetMode(false);
      setForgotMode(false);
      setResetSuccess(true);
      setNotice("");
      showToast(
        resetFlowType === "pin" ? "Transaction PIN reset successful." : "Password reset successful.",
        "success"
      );
    } catch (err) {
      const next = presentError(
        err,
        resetFlowType === "pin" ? "Transaction PIN reset failed." : "Password reset failed."
      );
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
      await warmBackend(6500).catch(() => false);
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
      <div
        className={[
          "auth-shell",
          isPlainLoginView ? "auth-shell-simple" : "",
          isResetRequestView ? "auth-shell-reset" : "",
          isResetPageView ? "auth-shell-reset" : "",
          isResetSuccessView ? "auth-shell-reset" : "",
        ].filter(Boolean).join(" ")}
      >
        {!isResetRequestView && !isResetPageView && !isResetSuccessView && (
          <div className={`auth-left ${isPlainLoginView ? "auth-left-simple" : ""}`}>
            <div className={`auth-left-inner ${isPlainLoginView ? "auth-left-inner-simple" : ""}`}>
            {isPlainLoginView ? (
              <>
                <div className="auth-brand auth-brand-simple">
                  <div className="auth-mark auth-mark-simple">
                    <img src="/pwa/pwa-192.png" alt="AxisVTU" />
                  </div>
                </div>
                <div className="auth-simple-copy">
                  <h2 className="auth-pitch auth-pitch-simple">Hi, Welcome Back</h2>
                  <p className="muted auth-simple-sub">Sign in to continue with fast airtime, data and bill payments.</p>
                </div>
              </>
            ) : (
              <>
                <div className="auth-brand">
                  <div className="auth-mark">
                    <img src="/pwa/pwa-192.png" alt="AxisVTU" />
                  </div>
                </div>
                <h2 className="auth-pitch">Hi, Welcome Back</h2>
                <p className="muted">Sign in to continue with your AxisVTU account.</p>
              </>
            )}
            </div>
          </div>
        )}
        <div
          className={[
            "auth-right",
            isPlainLoginView ? "auth-right-simple" : "",
            isResetRequestView ? "auth-right-reset" : "",
            isResetPageView ? "auth-right-reset" : "",
            isResetSuccessView ? "auth-right-reset" : "",
          ].filter(Boolean).join(" ")}
        >
          {(isPlainLoginView || isRegisterView) && (
            <div className="auth-quick-link">
              <span>{isPlainLoginView ? "Don't have an account?" : "Already have an account?"}</span>{" "}
              <button
                type="button"
                className="link auth-quick-link-btn"
                onClick={() => navigate(isPlainLoginView ? "/register" : "/login")}
              >
                {isPlainLoginView ? "Get started" : "Sign in"}
              </button>
            </div>
          )}
          {isResetSuccessView ? (
            <div className="auth-reset-success">
              <div className="auth-reset-success-icon" aria-hidden="true">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M25 60L94 28L68 60L25 60Z" fill="url(#planeGrad)" />
                  <path d="M68 60L94 28L75 85L61 63L68 60Z" fill="#2f56c7" />
                  <path d="M58 61L61 63L75 85L52 60L58 61Z" fill="#1f3f9e" />
                  <path
                    d="M60 72C80 81 94 88 94 95C94 102 82 108 60 108"
                    stroke="#aac1ff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="1 7"
                  />
                  <defs>
                    <linearGradient id="planeGrad" x1="25" y1="28" x2="94" y2="60" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4e78df" />
                      <stop offset="1" stopColor="#2f56c7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1>{resetSuccess ? (resetFlowType === "pin" ? "PIN reset successfully" : "Password reset successfully") : "Request sent successfully"}</h1>
              <p className="muted auth-reset-success-copy">
                {resetSuccess ? (
                  <>
                    {resetFlowType === "pin"
                      ? "Your transaction PIN has been saved securely. You can now approve wallet debits."
                      : "Your new password has been saved. You can now sign in with your updated credentials."}
                  </>
                ) : (
                  <>
                    We have sent a confirmation email to <strong>{forgotEmail || "your email address"}</strong> if not found kindly check spam folder
                  </>
                )}
              </p>
              <p className="auth-reset-success-note">
                {resetSuccess ? "Please go back and sign in." : "Please check your email."}
              </p>
              <button className="primary auth-reset-back" type="button" onClick={() => navigate("/login")}>
                Back
              </button>
            </div>
          ) : (
          <div
            className={[
              "auth-card",
              isPlainLoginView ? "auth-card-simple" : "",
              (isResetRequestView || isResetPageView) ? "auth-card-reset" : "auth-card-compact",
              isResetSuccessView ? "auth-card-success" : "",
            ].filter(Boolean).join(" ")}
          >
            <h1>
              {resetMode
                ? (resetFlowType === "pin" ? "Reset Transaction PIN" : "Reset Password")
                : forgotMode
                  ? "Reset password"
                  : mode === "login"
                    ? "Sign in to AxisVTU"
                    : "Create account"}
            </h1>
            <p className="muted">
              {resetMode
                ? (resetFlowType === "pin" ? "Create a new PIN to continue." : "Please enter a strong password")
                : forgotMode
                  ? "Enter your email to receive a reset link."
                  : mode === "login"
                    ? "Enter your details below."
                    : "Create your account to start using AxisVTU."}
            </p>
        {resetMode ? (
          <form onSubmit={submitReset} className="auth-wide auth-form-compact auth-form-reset">
            <div className="field">
              <label>{resetFlowType === "pin" ? "New PIN" : "New password"}</label>
              <div className="input-group">
                <input
                  type={resetFlowType === "pin" ? "password" : (showPassword ? "text" : "password")}
                  placeholder={resetFlowType === "pin" ? "New PIN" : "New password"}
                  value={resetForm.password}
                  onChange={(e) =>
                    setResetForm({
                      ...resetForm,
                      password:
                        resetFlowType === "pin"
                          ? e.target.value.replace(/\D/g, "").slice(0, 4)
                          : e.target.value,
                    })
                  }
                  autoComplete={resetFlowType === "pin" ? "one-time-code" : "new-password"}
                  required
                  inputMode={resetFlowType === "pin" ? "numeric" : "text"}
                  maxLength={resetFlowType === "pin" ? 4 : undefined}
                />
                {resetFlowType === "pin" ? null : (
                  <button
                    type="button"
                    className="input-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                )}
              </div>
              <div className="strength">
                <div className={`bar s${resetFlowType === "pin" ? Math.min(4, resetForm.password.length) : passwordStrength(resetForm.password)}`} />
                <span>
                  {resetFlowType === "pin"
                    ? (resetForm.password.length < 4 ? "4 digits required" : "Looks good")
                    : ["Too weak", "Weak", "Okay", "Strong", "Excellent"][passwordStrength(resetForm.password)]}
                </span>
              </div>
            </div>
            <div className="field">
              <label>{resetFlowType === "pin" ? "Confirm PIN" : "Confirm password"}</label>
              <div className="input-group">
                <input
                  type={resetFlowType === "pin" ? "password" : (showConfirm ? "text" : "password")}
                  placeholder={resetFlowType === "pin" ? "Confirm PIN" : "Confirm password"}
                  value={resetForm.confirm}
                  onChange={(e) =>
                    setResetForm({
                      ...resetForm,
                      confirm:
                        resetFlowType === "pin"
                          ? e.target.value.replace(/\D/g, "").slice(0, 4)
                          : e.target.value,
                    })
                  }
                  autoComplete={resetFlowType === "pin" ? "one-time-code" : "new-password"}
                  required
                  inputMode={resetFlowType === "pin" ? "numeric" : "text"}
                  maxLength={resetFlowType === "pin" ? 4 : undefined}
                />
                {resetFlowType === "pin" ? null : (
                  <button
                    type="button"
                    className="input-btn"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}>
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                )}
              </div>
            </div>
            {error && <div className="auth-feedback auth-feedback-error">{error}</div>}
            {notice && <div className="auth-feedback auth-feedback-note">{notice}</div>}
            <Button type="submit">
              {loading ? "Please wait..." : (resetFlowType === "pin" ? "Reset PIN" : "Reset password")}
            </Button>
            <button className="link" type="button" onClick={() => navigate("/login")}>
              Back to login
            </button>
          </form>
        ) : forgotMode ? (
          <form onSubmit={submitForgot} className="auth-form-compact auth-form-reset">
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                placeholder="Email address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            {error && <div className="auth-feedback auth-feedback-error">{error}</div>}
            {notice && <div className="auth-feedback auth-feedback-note">{notice}</div>}
            <Button type="submit">
              {loading ? "Please wait..." : "Send reset link"}
            </Button>
            <button className="link" type="button" onClick={() => navigate("/login")}>
              Back to login
            </button>
          </form>
        ) : (
        <form onSubmit={submit} className={isPlainLoginView ? "auth-form-simple" : "auth-form-compact"}>
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
                autoComplete="name"
                required
              />
              {fieldErrors.full_name && <div className="error inline">{fieldErrors.full_name}</div>}
            </div>
          )}
          <div className="field">
            {!isPlainLoginView && <label>Email</label>}
              <input
                type={mode === "login" ? "text" : "email"}
                data-testid="auth-email"
                placeholder={isPlainLoginView ? "Email address" : "Email"}
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  validateField("email", e.target.value);
                }}
                onBlur={(e) => validateField("email", e.target.value)}
                autoComplete={mode === "login" ? "username" : "email"}
                required
              />
            {fieldErrors.email && <div className="error inline">{fieldErrors.email}</div>}
          </div>
          <div className="field">
            {!isPlainLoginView && <label>{mode === "register" ? "Create password" : "Password"}</label>}
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
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className="input-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {mode === "register" && (
              <div className="strength">
                <div className={`bar s${passwordStrength(form.password)}`} />
                <span>
                  {["Too weak", "Weak", "Okay", "Strong", "Excellent"][passwordStrength(form.password)]}
                </span>
              </div>
            )}
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
                  aria-label={showConfirm ? "Hide password" : "Show password"}>
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
          {error && <div className="auth-feedback auth-feedback-error">{error}</div>}
          {notice && <div className="auth-feedback auth-feedback-note">{notice}</div>}
          <Button type="submit" data-testid="auth-submit">
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        )}
        {!isPlainLoginView && (
          <button
            className="link"
            disabled={loading}
            onClick={() => {
              setError("");
              setNotice("");
              setFieldErrors({});
              navigate(mode === "login" ? "/register" : "/login");
            }}>
            {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </button>
          )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

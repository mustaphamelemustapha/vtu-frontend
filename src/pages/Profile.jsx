import { useEffect, useState } from "react";
import { apiFetch, getAuthPersisted, getProfile, setAuthPersisted, setProfile } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Profile({ onLogout, onProfileUpdate, darkMode, onToggleTheme, canInstall, onInstall }) {
  const [profile, setProfileState] = useState(getProfile());
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });
  const [persisted, setPersisted] = useState(getAuthPersisted());
  const [exporting, setExporting] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vtu_prefs") || "{}");
    } catch {
      return {};
    }
  });

  const initials = (profile.full_name || "User")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    apiFetch("/auth/me")
      .then((data) => {
        const next = { full_name: data.full_name, email: data.email, role: data.role };
        setProfile(next);
        setProfileState(next);
        onProfileUpdate?.(next);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Detect PWA standalone mode (iOS + modern browsers).
    const check = () => {
      try {
        const standalone =
          window.matchMedia?.("(display-mode: standalone)")?.matches ||
          window.navigator?.standalone === true;
        setIsStandalone(!!standalone);
      } catch {
        setIsStandalone(false);
      }
    };
    check();
    window.addEventListener?.("visibilitychange", check);
    return () => window.removeEventListener?.("visibilitychange", check);
  }, []);

  const savePrefs = (next) => {
    setPrefs(next);
    localStorage.setItem("vtu_prefs", JSON.stringify(next));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { full_name: (profile.full_name || "").trim() };
      if (!payload.full_name) {
        showToast("Full name is required.", "error");
        return;
      }
      const data = await apiFetch("/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const next = { full_name: data.full_name, email: data.email, role: data.role };
      setProfile(next);
      setProfileState(next);
      onProfileUpdate?.(next);
      showToast("Profile updated.", "success");
      setEditMode(false);
    } catch (err) {
      showToast(err?.message || "Profile update failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current_password || !pwForm.new_password) {
      showToast("Enter current and new password.", "error");
      return;
    }
    if (pwForm.new_password.length < 8) {
      showToast("New password must be at least 8 characters.", "error");
      return;
    }
    setPwLoading(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm),
      });
      showToast("Password updated.", "success");
      setPwOpen(false);
      setPwForm({ current_password: "", new_password: "" });
    } catch (err) {
      showToast(err?.message || "Password update failed.", "error");
    } finally {
      setPwLoading(false);
    }
  };

  const logout = () => {
    onLogout?.();
  };

  const copyText = async (value, label = "Copied") => {
    try {
      await navigator.clipboard?.writeText(String(value || ""));
      showToast(`${label}.`, "success");
    } catch {
      showToast("Copy failed.", "error");
    }
  };

  const togglePersisted = (next) => {
    try {
      setAuthPersisted(!!next);
      setPersisted(!!next);
      showToast(next ? "Keep me signed in enabled." : "Keep me signed in disabled.", "success");
    } catch {
      showToast("Unable to update session preference.", "error");
    }
  };

  const installApp = async () => {
    if (isStandalone) {
      showToast("AxisVTU is already installed.", "info");
      return;
    }

    // Chrome/Edge/Android: we can prompt only if beforeinstallprompt is available.
    if (canInstall && onInstall) {
      const res = await onInstall();
      if (res?.outcome === "accepted") showToast("AxisVTU installed.", "success");
      else if (res?.outcome === "dismissed") showToast("Install dismissed.", "info");
      else showToast("Install unavailable.", "info");
      return;
    }

    // iOS Safari and some browsers: cannot prompt; show "Add to Home Screen" instructions.
    setInstallHelpOpen(true);
  };

  const platformHint = (() => {
    const ua = String(navigator?.userAgent || "");
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSafari = isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    return { isIOS, isAndroid, isSafari };
  })();

  const exportTransactions = async () => {
    setExporting(true);
    try {
      const txs = await apiFetch("/transactions/me");
      const rows = Array.isArray(txs) ? txs : [];
      if (rows.length === 0) {
        showToast("No transactions to export yet.", "info");
        return;
      }

      const columns = [
        "reference",
        "tx_type",
        "status",
        "amount",
        "network",
        "data_plan_code",
        "external_reference",
        "failure_reason",
        "created_at",
      ].filter((k) => rows.some((r) => r && r[k] != null && String(r[k]).trim() !== ""));

      const esc = (v) => {
        const s = String(v ?? "");
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const csv = [
        columns.join(","),
        ...rows.map((r) => columns.map((c) => esc(r?.[c])).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `axisvtu-transactions-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Transactions exported.", "success");
    } catch (err) {
      showToast(err?.message || "Export failed.", "error");
    } finally {
      setExporting(false);
    }
  };

  const clearDeviceData = () => {
    try {
      localStorage.removeItem("vtu_last_recipient");
      localStorage.removeItem("vtu_last_fund");
      localStorage.removeItem("vtu_prefs");
      localStorage.removeItem("vtu_onboarded");
      setPrefs({});
      showToast("Saved device data cleared.", "success");
    } catch {
      showToast("Unable to clear device data.", "error");
    }
  };

  return (
    <div className="page">
      <section className="section">
        <div className="card profile-card">
          <div className="profile-head">
            <div className="profile-avatar">{initials}</div>
            <div>
              <div className="profile-name">{profile.full_name || "User"}</div>
              <div className="muted">{profile.email || "email@example.com"}</div>
            </div>
            <div className="profile-actions">
              <button className="ghost" type="button" onClick={() => copyText(profile.email || "", "Email copied")}>
                Copy Email
              </button>
              <button className="ghost" type="button" onClick={() => setEditMode(!editMode)}>
                {editMode ? "Cancel" : "Edit"}
              </button>
              <button className="primary" type="button" onClick={updateProfile} disabled={loading || !editMode}>
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <div className="label">Role</div>
              <div className="value">{(profile.role || "User").toString()}</div>
            </div>
            <div className="info-card">
              <div className="label">Status</div>
              <div className="value">Active</div>
            </div>
            <div className="info-card">
              <div className="label">Member Since</div>
              <div className="value">2026</div>
            </div>
          </div>
          <form className="form-grid">
            <label>
              Full name
              <input
                value={profile.full_name || ""}
                onChange={(e) => setProfileState({ ...profile, full_name: e.target.value })}
                placeholder="Full name"
                disabled={!editMode}
              />
            </label>
            <label>
              Email
              <input
                value={profile.email || ""}
                placeholder="Email address"
                type="email"
                disabled
              />
            </label>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h3>Preferences</h3>
          <div className="settings-grid">
            <div className="setting-row">
              <div>
                <div className="label">Dark Mode</div>
                <div className="muted">Switch between light and dark theme.</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={!!darkMode} onChange={() => onToggleTheme?.()} />
                <span className="slider" />
              </label>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Notifications</div>
                <div className="muted">Product updates and payments</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={!!prefs.notifications}
                  onChange={(e) => savePrefs({ ...prefs, notifications: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Security Alerts</div>
                <div className="muted">Login and password changes</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={!!prefs.security_alerts}
                  onChange={(e) => savePrefs({ ...prefs, security_alerts: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Keep me signed in</div>
                <div className="muted">Use this on your personal device only.</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={!!persisted} onChange={(e) => togglePersisted(e.target.checked)} />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h3>Tools</h3>
          <div className="settings-grid">
            <div className="setting-row">
              <div>
                <div className="label">Export Transactions</div>
                <div className="muted">Download your transaction history as CSV.</div>
              </div>
              <button className="ghost" type="button" onClick={exportTransactions} disabled={exporting}>
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Install App</div>
                <div className="muted">Add AxisVTU to your home screen.</div>
              </div>
              <button className="ghost" type="button" onClick={installApp}>
                {isStandalone ? "Installed" : "Add to Home Screen"}
              </button>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Clear saved device data</div>
                <div className="muted">Resets onboarding and saved form preferences.</div>
              </div>
              <button className="ghost danger" type="button" onClick={clearDeviceData}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h3>Legal & Compliance</h3>
          <div className="settings-grid">
            <div className="setting-row">
              <div>
                <div className="label">Terms of Service</div>
                <div className="muted">Usage terms that govern your account and transactions.</div>
              </div>
              <a className="ghost legal-link-btn" href="/landing/terms.html" target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Privacy Policy</div>
                <div className="muted">How AxisVTU collects, uses, stores, and protects your data.</div>
              </div>
              <a className="ghost legal-link-btn" href="/landing/privacy.html" target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Refund Policy</div>
                <div className="muted">Rules for failed transactions, reversals, and dispute handling.</div>
              </div>
              <a className="ghost legal-link-btn" href="/landing/refund-policy.html" target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">KYC/AML Policy</div>
                <div className="muted">Identity and anti-fraud controls for compliant platform operations.</div>
              </div>
              <a className="ghost legal-link-btn" href="/landing/kyc-aml.html" target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h3>Security</h3>
          <div className="settings-grid">
            <div className="setting-row">
              <div>
                <div className="label">Password</div>
                <div className="muted">Use strong passwords to keep your account safe.</div>
              </div>
              <button className="ghost" type="button" onClick={() => setPwOpen(true)}>
                Change Password
              </button>
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Logout</div>
                <div className="muted">End your current session.</div>
              </div>
              <button className="primary" type="button" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>

      {pwOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <h3>Change Password</h3>
              <button className="icon-btn" aria-label="Close" onClick={() => setPwOpen(false)}>
                X
              </button>
            </div>
            <form onSubmit={submitPassword} className="form-grid">
              <label>
                Current password
                <input
                  type="password"
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  placeholder="New password (min 8 chars)"
                  autoComplete="new-password"
                />
              </label>
              <div className="modal-actions">
                <button className="ghost" type="button" onClick={() => setPwOpen(false)} disabled={pwLoading}>
                  Cancel
                </button>
                <button className="primary" type="submit" disabled={pwLoading}>
                  {pwLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {installHelpOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <div>
                <div className="label">Install</div>
                <h3>Add AxisVTU to your home screen</h3>
              </div>
              <button className="ghost" type="button" onClick={() => setInstallHelpOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              {platformHint.isIOS && platformHint.isSafari && (
                <div className="notice">
                  On iPhone Safari: tap the Share button, then select "Add to Home Screen".
                </div>
              )}
              {platformHint.isIOS && !platformHint.isSafari && (
                <div className="notice">
                  On iPhone: open this site in Safari to use "Add to Home Screen".
                </div>
              )}
              {platformHint.isAndroid && (
                <div className="notice">
                  On Android Chrome: open the browser menu and tap "Install app" or "Add to Home screen".
                </div>
              )}
              {!platformHint.isIOS && !platformHint.isAndroid && (
                <div className="notice">
                  Use your browser menu and select "Install app" or "Add to Home screen".
                </div>
              )}
              <div className="hint">
                Note: Some browsers don’t allow automatic install prompts. This is a browser restriction, not an app issue.
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary" type="button" onClick={() => setInstallHelpOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

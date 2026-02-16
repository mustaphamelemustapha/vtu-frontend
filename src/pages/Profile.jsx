import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getProfile, setProfile } from "../services/api";
import { useToast } from "../context/toast.jsx";

const PHONE_KEY = "axisvtu_profile_phone";
const JOINED_LABEL_KEY = "axisvtu_joined_label";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

function roleLabel(role) {
  const raw = String(role || "user").toLowerCase();
  if (raw === "admin") return "Admin";
  if (raw === "reseller") return "Reseller";
  return "User";
}

function getJoinedLabel() {
  const existing = localStorage.getItem(JOINED_LABEL_KEY);
  if (existing) return existing;
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" });
  const label = `${month}, ${now.getFullYear()}`;
  localStorage.setItem(JOINED_LABEL_KEY, label);
  return label;
}

const AccountIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

const SecurityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 3l8 3v6c0 4.4-3 7.7-8 9-5-1.3-8-4.6-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

const AboutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 10v6M12 7.2h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M9.5 9.5a2.6 2.6 0 1 1 4.3 2c-.7.6-1.5 1.1-1.8 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M12 17.3h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export default function Profile({ onLogout, onProfileUpdate, onToggleTheme }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profile, setProfileState] = useState(getProfile());
  const [joinedLabel] = useState(getJoinedLabel());
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem(PHONE_KEY) || "");
  const [fullName, setFullName] = useState(getProfile()?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });

  useEffect(() => {
    apiFetch("/auth/me")
      .then((data) => {
        const next = { full_name: data.full_name, email: data.email, role: data.role };
        setProfile(next);
        setProfileState(next);
        setFullName(next.full_name || "");
        onProfileUpdate?.(next);
      })
      .catch(() => {});
  }, []);

  const initials = useMemo(() => {
    return (profile.full_name || "User")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [profile.full_name]);

  const saveAccountDetails = async () => {
    const nextName = String(fullName || "").trim();
    const nextPhone = String(phoneNumber || "").replace(/\D/g, "");
    if (nextName.length < 2) {
      showToast("Full name is too short.", "error");
      return;
    }
    if (nextPhone && (nextPhone.length < 10 || nextPhone.length > 15)) {
      showToast("Phone number must be 10 to 15 digits.", "error");
      return;
    }

    setSaving(true);
    try {
      const data = await apiFetch("/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: nextName }),
      });
      const nextProfile = { full_name: data.full_name, email: data.email, role: data.role };
      setProfile(nextProfile);
      setProfileState(nextProfile);
      setPhoneNumber(nextPhone);
      localStorage.setItem(PHONE_KEY, nextPhone);
      onProfileUpdate?.(nextProfile);
      showToast("Account details saved.", "success");
    } catch (err) {
      showToast(err?.message || "Unable to save details.", "error");
    } finally {
      setSaving(false);
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
      setPwForm({ current_password: "", new_password: "" });
      setPwOpen(false);
      showToast("Password changed.", "success");
    } catch (err) {
      showToast(err?.message || "Password update failed.", "error");
    } finally {
      setPwLoading(false);
    }
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm("Delete this account? You will be logged out immediately.");
    if (!confirmed) return;
    setDeleting(true);
    try {
      await apiFetch("/auth/delete-me", { method: "DELETE" });
      showToast("Account deleted.", "success");
      onLogout?.();
    } catch (err) {
      showToast(err?.message || "Unable to delete account.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page profile-ux">
      <section className="section">
        <div className="profile-ux-topbar card">
          <button className="ghost profile-ux-back" type="button" onClick={() => navigate("/")}>
            ← Back
          </button>
          <button className="ghost profile-ux-gear" type="button" onClick={() => onToggleTheme?.()}>
            ⚙
          </button>
        </div>
      </section>

      <section className="section">
        <div className="card profile-ux-user-card">
          <div className="profile-ux-user-avatar">{initials}</div>
          <div>
            <div className="profile-ux-user-name">{profile.full_name || "User"}</div>
            <div className="muted">Joined {joinedLabel}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="profile-ux-menu">
          <button className="card profile-ux-menu-item" type="button" onClick={() => setAccountOpen(true)}>
            <span className="profile-ux-menu-left">
              <span className="profile-ux-icon"><AccountIcon /></span>
              <span>Account</span>
            </span>
            <span className="profile-ux-chevron">›</span>
          </button>

          <button className="card profile-ux-menu-item" type="button" onClick={() => setSecurityOpen(true)}>
            <span className="profile-ux-menu-left">
              <span className="profile-ux-icon"><SecurityIcon /></span>
              <span>Security</span>
            </span>
            <span className="profile-ux-chevron">›</span>
          </button>

          <button className="card profile-ux-menu-item" type="button" onClick={() => setAboutOpen(true)}>
            <span className="profile-ux-menu-left">
              <span className="profile-ux-icon"><AboutIcon /></span>
              <span>About</span>
            </span>
            <span className="profile-ux-chevron">›</span>
          </button>

          <button className="card profile-ux-menu-item" type="button" onClick={() => setHelpOpen(true)}>
            <span className="profile-ux-menu-left">
              <span className="profile-ux-icon"><HelpIcon /></span>
              <span>Help</span>
            </span>
            <span className="profile-ux-chevron">›</span>
          </button>
        </div>
      </section>

      <section className="section">
        <div className="card profile-ux-credit">
          <div className="muted">Designed by</div>
          <div className="profile-ux-brand">
            <img src="/brand/mmtechglobe-logo.svg" alt="MMTechGlobe" />
            <span>MMTechGlobe</span>
          </div>
          <div className="profile-ux-cac">
            <img src="/brand/cac-logo.svg" alt="Certified by CAC" />
            <span>Certified by CAC</span>
          </div>
        </div>
      </section>

      {accountOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <h3>Account</h3>
              <button className="ghost" type="button" onClick={() => setAccountOpen(false)}>Close</button>
            </div>
            <div className="form-grid">
              <label>
                Full Name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </label>
              <label>
                Phone Number
                <input
                  value={phoneNumber}
                  inputMode="numeric"
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08012345678"
                />
              </label>
              <label>
                Account Type
                <input value={roleLabel(profile.role)} disabled />
              </label>
              <div className="modal-actions">
                <button className="primary" type="button" onClick={saveAccountDetails} disabled={saving}>
                  {saving ? "Saving..." : "Save Details"}
                </button>
                <button className="ghost danger" type="button" onClick={deleteAccount} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {securityOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <h3>Security</h3>
              <button className="ghost" type="button" onClick={() => setSecurityOpen(false)}>Close</button>
            </div>
            <div className="settings-grid">
              <div className="setting-row">
                <div>
                  <div className="label">Change Password</div>
                  <div className="muted">Update your password anytime.</div>
                </div>
                <button className="primary" type="button" onClick={() => setPwOpen(true)}>
                  Change
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <div className="label">Logout</div>
                  <div className="muted">Sign out of this session.</div>
                </div>
                <button className="ghost" type="button" onClick={onLogout}>Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <h3>About</h3>
              <button className="ghost" type="button" onClick={() => setAboutOpen(false)}>Close</button>
            </div>
            <div className="profile-ux-about-card">
              <div className="label">App Version</div>
              <div className="value">{APP_VERSION}</div>
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <h3>Help</h3>
              <button className="ghost" type="button" onClick={() => setHelpOpen(false)}>Close</button>
            </div>
            <div className="form-grid">
              <div className="notice">
                Need support? Email us at <a href="mailto:mmtechglobe@gmail.com">mmtechglobe@gmail.com</a>
              </div>
              <a className="ghost legal-link-btn" href="/landing/terms.html" target="_blank" rel="noreferrer">Terms</a>
              <a className="ghost legal-link-btn" href="/landing/privacy.html" target="_blank" rel="noreferrer">Privacy</a>
              <a className="ghost legal-link-btn" href="/landing/refund-policy.html" target="_blank" rel="noreferrer">Refund Policy</a>
            </div>
          </div>
        </div>
      )}

      {pwOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <h3>Change Password</h3>
              <button className="ghost" type="button" onClick={() => setPwOpen(false)}>Close</button>
            </div>
            <form className="form-grid" onSubmit={submitPassword}>
              <label>
                Current password
                <input
                  type="password"
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
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
    </div>
  );
}

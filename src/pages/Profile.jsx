import { useEffect, useState } from "react";
import { apiFetch, getProfile, setProfile } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Profile({ onLogout, onProfileUpdate }) {
  const [profile, setProfileState] = useState(getProfile());
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });
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
              <button className="ghost" onClick={() => setEditMode(!editMode)}>
                {editMode ? "Cancel" : "Edit"}
              </button>
              <button className="primary" onClick={updateProfile} disabled={loading || !editMode}>
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
    </div>
  );
}

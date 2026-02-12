import { useEffect, useState } from "react";
import { apiFetch, clearToken, getProfile, setProfile } from "../services/api";

export default function Profile() {
  const [profile, setProfileState] = useState(getProfile());
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [editMode, setEditMode] = useState(false);
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
        const next = { full_name: data.full_name, email: data.email };
        setProfile(next);
        setProfileState(next);
      })
      .catch(() => {});
  }, []);

  const savePrefs = (next) => {
    setPrefs(next);
    localStorage.setItem("vtu_prefs", JSON.stringify(next));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setNotice("");
    setLoading(true);
    try {
      // backend currently does not support updates; store locally for now
      setProfile(profile);
      setNotice("Profile saved locally. Server updates coming soon.");
      setEditMode(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    window.location.href = "/app/";
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
              <div className="value">User</div>
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
                onChange={(e) => setProfileState({ ...profile, email: e.target.value })}
                placeholder="Email address"
                type="email"
                disabled={!editMode}
              />
            </label>
            {notice && <div className="notice">{notice}</div>}
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
              <button className="ghost" type="button">Change Password</button>
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
    </div>
  );
}

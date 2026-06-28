import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getProfile } from "../services/api";
import { useToast } from "../context/toast.jsx";
import Button from "../components/ui/Button.jsx";

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, marginRight: 4 }}>
    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RevokeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, marginRight: 4 }}>
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, marginRight: 4 }}>
    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Developer() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profile] = useState(getProfile());
  const [loading, setLoading] = useState(true);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [devState, setDevState] = useState({
    is_developer: false,
    developer_status: "none",
    api_public_key: null,
    has_keys: false,
    webhook_url: "",
    webhook_secret_prefix: null
  });
  const [rawSecretKey, setRawSecretKey] = useState(null);
  const [rawTestSecret, setRawTestSecret] = useState(null);
  const [webhookInput, setWebhookInput] = useState("");
  const [copiedLive, setCopiedLive] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/developer/status");
      setDevState({
        ...data,
        webhook_url: data.webhook_url || "",
      });
      setWebhookInput(data.webhook_url || "");
    } catch (err) {
      showToast(err?.message || "Failed to load developer status.", "error");
    } finally {
      setLoading(false);
    }
  };

  const applyForDeveloper = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/developer/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additional_info: "" })
      });
      setDevState(prev => ({ ...prev, ...data }));
      if (data.api_secret_key) {
        setRawSecretKey(data.api_secret_key);
        setRawTestSecret("mele_test_" + data.api_secret_key.replace("mele_live_", ""));
      }
      showToast("Developer API access granted!", "success");
    } catch (err) {
      showToast(err?.message || "Application failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const generateKeys = async () => {
    if (!window.confirm("Generating a new live token will invalidate your previous token immediately. Continue?")) return;
    try {
      setLoading(true);
      const data = await apiFetch("/developer/keys/generate", { method: "POST" });
      setDevState(prev => ({
        ...prev,
        api_public_key: data.api_public_key,
        has_keys: true
      }));
      setRawSecretKey(data.api_secret_key);
      setRawTestSecret("mele_test_" + data.api_secret_key.replace("mele_live_", ""));
      showToast("Live token generated. Copy it now!", "success");
    } catch (err) {
      showToast(err?.message || "Failed to generate keys.", "error");
    } finally {
      setLoading(false);
    }
  };

  const revokeKeys = async () => {
    if (!window.confirm("Are you sure you want to revoke your API keys? Your integration will stop working immediately.")) return;
    try {
      setLoading(true);
      const data = await apiFetch("/developer/keys/revoke", { method: "POST" });
      setDevState(prev => ({ ...prev, ...data }));
      setRawSecretKey(null);
      setRawTestSecret(null);
      showToast("API keys revoked successfully.", "success");
    } catch (err) {
      showToast(err?.message || "Failed to revoke keys.", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveWebhook = async () => {
    if (!webhookInput) {
      showToast("Please enter a webhook URL", "error");
      return;
    }
    try {
      setSavingWebhook(true);
      const data = await apiFetch("/developer/webhook/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookInput })
      });
      setDevState(prev => ({
        ...prev,
        webhook_url: data.webhook_url,
        webhook_secret_prefix: data.webhook_secret_prefix
      }));
      showToast("Webhook endpoint saved.", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save webhook.", "error");
    } finally {
      setSavingWebhook(false);
    }
  };

  const copyToClipboard = (text, isTest) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isTest) {
      setCopiedTest(true);
      setTimeout(() => setCopiedTest(false), 2000);
    } else {
      setCopiedLive(true);
      setTimeout(() => setCopiedLive(false), 2000);
    }
  };

  const displayName = profile?.full_name || "Developer";
  const initials = displayName.charAt(0).toUpperCase();

  if (loading && !devState.has_keys && devState.developer_status === "none") {
    return (
      <div className="page" style={{ padding: "40px 20px" }}>
        <div className="card"><div className="muted">Loading developer settings...</div></div>
      </div>
    );
  }

  // Application Not Approved State
  if (devState.developer_status !== "approved") {
    return (
      <div className="page profile-ux" style={{ padding: "40px 20px", maxWidth: 800, margin: "0 auto" }}>
        <section className="section">
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <h2 style={{ marginBottom: 15 }}>Developer API Access</h2>
            <p className="muted" style={{ marginBottom: 30, maxWidth: 500, margin: "0 auto 30px" }}>
              Automate data, airtime, and bills purchases directly from your application. Apply for developer access to get your API keys.
            </p>
            {devState.developer_status === "applied" ? (
              <div className="pill warning" style={{ padding: "10px 20px", fontSize: 14 }}>
                Your application is pending review.
              </div>
            ) : (
              <Button onClick={applyForDeveloper} disabled={loading}>
                {loading ? "Applying..." : "Enable Developer Access"}
              </Button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: "40px 20px", maxWidth: 900, margin: "0 auto", color: "var(--text-color, #e2e8f0)" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Settings</h1>
      <p className="muted" style={{ marginBottom: 32, fontSize: 14 }}>
        Signed in as <strong>{displayName} (developer)</strong>
        <span className="pill" style={{ marginLeft: 12, background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontSize: 10, padding: "4px 8px", borderRadius: 4, fontWeight: "bold" }}>DEVELOPER</span>
      </p>

      {/* Account Section */}
      <section style={{ marginBottom: 30 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Account</h3>
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 24, borderRadius: 8, background: "var(--card-bg, #1e293b)", border: "1px solid var(--border-color, #334155)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f1f5f9", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold" }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{displayName}</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Role developer</div>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} style={{ background: "transparent", border: "1px solid #334155" }}>
            Dashboard
          </Button>
        </div>
      </section>

      {/* Live API Tokens */}
      <section style={{ marginBottom: 30 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Live API tokens</h3>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>For production traffic. These debit your real account balance.</p>
        
        <div className="card" style={{ padding: 24, borderRadius: 8, background: "var(--card-bg, #1e293b)", border: "1px solid var(--border-color, #334155)" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <Button onClick={generateKeys} disabled={loading} style={{ background: "#3b82f6", color: "#fff", border: "none" }}>
              + Generate live token
            </Button>
          </div>

          {!devState.has_keys ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 14 }}>
              No active live tokens.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid #334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", fontSize: 11, padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>LIVE</span>
                <span style={{ fontFamily: "monospace", fontSize: 14, color: "#e2e8f0" }}>
                  {rawSecretKey ? rawSecretKey : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                </span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Primary</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Button variant="ghost" onClick={() => copyToClipboard(rawSecretKey || "Token hidden", false)} style={{ fontSize: 13, padding: "4px 12px", border: "1px solid #334155", color: "#e2e8f0" }}>
                  {copiedLive ? <CheckIcon /> : <CopyIcon />} {copiedLive ? "Copied" : "Copy"}
                </Button>
                <Button variant="ghost" onClick={revokeKeys} style={{ fontSize: 13, padding: "4px 12px", border: "1px solid #334155", color: "#ef4444" }}>
                  <RevokeIcon /> Revoke
                </Button>
              </div>
            </div>
          )}
          {rawSecretKey && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 6, color: "#10b981", fontSize: 13 }}>
              This is your new live token. Please copy it now. For security reasons, it will never be shown again!
            </div>
          )}
        </div>
      </section>

      {/* Test (sandbox) Tokens */}
      <section style={{ marginBottom: 30 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Test (sandbox) tokens</h3>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>For development. These use the sandbox wallet — fake money, no real fulfillment.</p>
        
        <div className="card" style={{ padding: 24, borderRadius: 8, background: "var(--card-bg, #1e293b)", border: "1px solid var(--border-color, #334155)" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            {/* The user can't actually generate a standalone test token in our system since they are tied. We show it if they generated a live one. */}
            <Button disabled style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "none" }}>
              Test token is paired with Live token
            </Button>
          </div>

          {!rawTestSecret && devState.has_keys ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 14 }}>
              Your test token is masked. Generate a new live token to reveal the paired test token.
            </div>
          ) : !devState.has_keys ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 14 }}>
              No test tokens yet.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid #334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: 11, padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>TEST</span>
                <span style={{ fontFamily: "monospace", fontSize: 14, color: "#e2e8f0" }}>
                  {rawTestSecret}
                </span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Primary</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Button variant="ghost" onClick={() => copyToClipboard(rawTestSecret, true)} style={{ fontSize: 13, padding: "4px 12px", border: "1px solid #334155", color: "#e2e8f0" }}>
                  {copiedTest ? <CheckIcon /> : <CopyIcon />} {copiedTest ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Webhook Endpoints */}
      <section style={{ marginBottom: 30 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Webhook endpoints</h3>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>Get notified at your server when orders change state — paid, shipped, delivered, cancelled.</p>
        
        <div className="card" style={{ padding: 24, borderRadius: 8, background: "var(--card-bg, #1e293b)", border: "1px solid var(--border-color, #334155)" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, color: "#e2e8f0", marginBottom: 6 }}>Endpoint URL</label>
              <input 
                type="url" 
                value={webhookInput}
                onChange={e => setWebhookInput(e.target.value)}
                placeholder="https://yourdomain.com/webhooks/mele" 
                style={{ width: "100%", padding: "10px 14px", background: "rgba(15, 23, 42, 0.5)", border: "1px solid #334155", borderRadius: 6, color: "#f8fafc", outline: "none" }}
              />
            </div>
            <div style={{ width: 200 }}>
              <label style={{ display: "block", fontSize: 13, color: "#e2e8f0", marginBottom: 6 }}>Events</label>
              <input 
                type="text" 
                value="*" 
                disabled 
                style={{ width: "100%", padding: "10px 14px", background: "rgba(15, 23, 42, 0.3)", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8" }}
              />
            </div>
            <Button onClick={saveWebhook} disabled={savingWebhook} style={{ background: "#3b82f6", color: "#fff", border: "none", height: 40, padding: "0 20px" }}>
              {savingWebhook ? "Saving..." : "+ Save"}
            </Button>
          </div>
          
          {devState.webhook_url ? (
            <div style={{ marginTop: 24, padding: "16px 0", borderTop: "1px solid #334155" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, color: "#e2e8f0", marginBottom: 4 }}>{devState.webhook_url}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Receiving all events</div>
                </div>
                {devState.webhook_secret_prefix && (
                  <div style={{ fontSize: 12, color: "#94a3b8", background: "rgba(15, 23, 42, 0.5)", padding: "4px 8px", borderRadius: 4, border: "1px solid #334155" }}>
                    Secret: <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>{devState.webhook_secret_prefix}******</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 14, borderTop: "1px solid #334155" }}>
              No webhook endpoints yet. Add one above to start receiving events.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

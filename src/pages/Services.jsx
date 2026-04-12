import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";

export default function Services() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { showToast } = useToast();

  const loadCatalog = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiFetch("/services/catalog");
      setCatalog(data);
    } catch (err) {
      const msg = err?.message || "Failed to load services.";
      setLoadError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  return (
    <div className="page">
      <section className="hero-card">
        <div>
          <div className="label">All Services</div>
          <div className="hero-value">Payments Hub</div>
          <div className="muted">Airtime, cable, electricity, exam pins. Same wallet, clean receipts.</div>
        </div>
        <div className="hero-actions">
          <Link className="ghost" to="/transactions">History</Link>
          <Link className="primary" to="/wallet">Fund Wallet</Link>
        </div>
      </section>

      <section className="section">
        <h3>Services</h3>
        <div className="grid-3">
          <Card as={Link} className="action-card" to="/data">
            <div className="label">Data</div>
            <div className="value">Buy</div>
            <div className="muted">Plans and quick buy</div>
          </Card>
          <Card as={Link} className="action-card" to="/airtime">
            <div className="label">Airtime</div>
            <div className="value">Top up</div>
            <div className="muted">MTN, Glo, Airtel, 9mobile</div>
          </Card>
          <Card as={Link} className="action-card" to="/electricity">
            <div className="label">Electricity</div>
            <div className="value">Token</div>
            <div className="muted">Prepaid and postpaid meters</div>
          </Card>
          <Card as={Link} className="action-card" to="/cable">
            <div className="label">Cable TV</div>
            <div className="value">Renew</div>
            <div className="muted">DStv, GOtv, StarTimes</div>
          </Card>
          <Card as={Link} className="action-card" to="/exam">
            <div className="label">Exam Pins</div>
            <div className="value">Buy</div>
            <div className="muted">WAEC, NECO, JAMB</div>
          </Card>
        </div>
      </section>

      <section className="section">
        <Card>
          <div className="section-head">
            <h3>Available Providers</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="muted">{loading ? "Loading..." : loadError ? "Error" : "Loaded"}</span>
              <Button variant="ghost" type="button" onClick={loadCatalog} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
          {loadError && <div className="notice">{loadError}</div>}
          {catalog && !loadError ? (
            <div className="grid-2">
              <Card style={{ background: "transparent" }}>
                <div className="label">Airtime networks</div>
                <div className="value" style={{ fontSize: 16 }}>{(catalog.airtime_networks || []).join(", ")}</div>
              </Card>
              <Card style={{ background: "transparent" }}>
                <div className="label">Cable providers</div>
                <div className="value" style={{ fontSize: 16 }}>
                  {(catalog.cable_providers || []).map((p) => p?.name || p?.id).filter(Boolean).join(", ")}
                </div>
              </Card>
            </div>
          ) : (
            <div className="empty">{loading ? "Loading catalog…" : "Catalog unavailable. Tap refresh to retry."}</div>
          )}
          <div className="hint">
            If “Install” isn’t available on your device, use Profile → Add to Home Screen for iPhone Safari.
          </div>
        </Card>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

export default function Services() {
  const [catalog, setCatalog] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch("/services/catalog")
      .then(setCatalog)
      .catch((err) => showToast(err?.message || "Failed to load services.", "error"));
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
          <Link className="card action-card" to="/data">
            <div className="label">Data</div>
            <div className="value">Buy</div>
            <div className="muted">Plans and quick buy</div>
          </Link>
          <Link className="card action-card" to="/airtime">
            <div className="label">Airtime</div>
            <div className="value">Top up</div>
            <div className="muted">MTN, Glo, Airtel, 9mobile</div>
          </Link>
          <Link className="card action-card" to="/electricity">
            <div className="label">Electricity</div>
            <div className="value">Token</div>
            <div className="muted">Prepaid and postpaid meters</div>
          </Link>
          <Link className="card action-card" to="/cable">
            <div className="label">Cable TV</div>
            <div className="value">Renew</div>
            <div className="muted">DStv, GOtv, StarTimes</div>
          </Link>
          <Link className="card action-card" to="/exam">
            <div className="label">Exam Pins</div>
            <div className="value">Buy</div>
            <div className="muted">WAEC, NECO, JAMB</div>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="section-head">
            <h3>Available Providers</h3>
            <span className="muted">{catalog ? "Loaded" : "Loading..."}</span>
          </div>
          {catalog ? (
            <div className="grid-2">
              <div className="card" style={{ background: "transparent" }}>
                <div className="label">Airtime networks</div>
                <div className="value" style={{ fontSize: 16 }}>{(catalog.airtime_networks || []).join(", ")}</div>
              </div>
              <div className="card" style={{ background: "transparent" }}>
                <div className="label">Cable providers</div>
                <div className="value" style={{ fontSize: 16 }}>
                  {(catalog.cable_providers || []).map((p) => p?.name || p?.id).filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">Loading catalog…</div>
          )}
          <div className="hint">
            If “Install” isn’t available on your device, use Profile → Add to Home Screen for iPhone Safari.
          </div>
        </div>
      </section>
    </div>
  );
}

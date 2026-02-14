import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

const LAST_FUND_KEY = "vtu_last_fund";

export default function Wallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [amount, setAmount] = useState(1000);
  const [callback, setCallback] = useState(
    typeof window !== "undefined" ? `${window.location.origin}/app/wallet` : ""
  );
  const [message, setMessage] = useState("");
  const [lastReference, setLastReference] = useState("");
  const [lastAmount, setLastAmount] = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [searchParams] = useSearchParams();
  const [method, setMethod] = useState("paystack");
  const [verifying, setVerifying] = useState(false);
  const [pendingRef, setPendingRef] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
    apiFetch("/wallet/ledger").then(setLedger).catch(() => {});
  }, []);

  useEffect(() => {
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    if (ref) {
      setLastReference(ref);
      setPendingRef(ref);
      const stored = JSON.parse(localStorage.getItem(LAST_FUND_KEY) || "{}");
      if (stored?.amount) setLastAmount(stored.amount);
      verifyPayment(ref);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!successModal) return;
    const timer = setTimeout(() => {
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    }, 1800);
    return () => clearTimeout(timer);
  }, [successModal]);

  useEffect(() => {
    if (!pendingRef || successModal || pollCount >= 5) return;
    const timer = setTimeout(() => {
      verifyPayment(pendingRef);
      setPollCount((c) => c + 1);
    }, 8000);
    return () => clearTimeout(timer);
  }, [pendingRef, successModal, pollCount]);

  const fund = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      if (method === "monnify") {
        showToast("Monnify is coming soon. Please use Paystack for now.", "warning");
        return;
      }
      const path = "/wallet/fund";
      const res = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), callback_url: callback })
      });
      const paystackUrl = res?.data?.authorization_url;
      const paystackRef = res?.data?.reference;
      const monnifyUrl =
        res?.responseBody?.checkoutUrl ||
        res?.responseBody?.paymentUrl ||
        res?.responseBody?.paymentPageUrl;
      if (paystackRef) {
        setLastReference(paystackRef);
        setLastAmount(Number(amount));
        localStorage.setItem(LAST_FUND_KEY, JSON.stringify({ reference: paystackRef, amount: Number(amount) }));
        setPendingRef(paystackRef);
        setPollCount(0);
      }
      const url = paystackUrl || monnifyUrl;
      if (url) window.location.href = url;
    } catch (err) {
      setMessage(err.message);
      showToast(err.message || "Wallet funding failed.", "error");
    }
  };

  const verifyPayment = async (refOverride) => {
    const reference = refOverride || lastReference;
    if (!reference) {
      showToast("No recent transaction reference found.", "error");
      return;
    }
    setMessage("");
    try {
      setVerifying(true);
      const res = await apiFetch(`/wallet/paystack/verify?reference=${reference}`);
      if (res.status === "success") {
        setMessage("");
        setSuccessModal(true);
        showToast("Wallet funded successfully.", "success");
        apiFetch("/wallet/me").then(setWallet).catch(() => {});
        apiFetch("/wallet/ledger").then(setLedger).catch(() => {});
        setPendingRef("");
      } else {
        setMessage("Payment pending. Please wait and try again.");
        showToast("Payment pending. Please wait and try again.", "info");
      }
    } catch (err) {
      setMessage(err.message);
      showToast(err.message || "Verification failed.", "error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="page">
      <section className="hero-card wallet-hero">
        <div>
          <div className="label">Available Balance</div>
          <div className="hero-value">₦ {wallet?.balance || "0.00"}</div>
          <div className="muted">Keep your wallet funded for quick purchases.</div>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={() => setAmount(2000)}>+ ₦2,000</button>
          <button className="ghost" onClick={() => setAmount(5000)}>+ ₦5,000</button>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="section-head">
            <h3>Fund Wallet</h3>
            <span className="muted">Paystack checkout</span>
          </div>
          <form onSubmit={fund} className="form-grid">
            <label>
              Funding Method
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="paystack">Paystack (Card / Transfer)</option>
                <option value="monnify" disabled>Monnify (Coming soon)</option>
              </select>
            </label>
            <label>
              Amount (₦)
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="100" />
            </label>
            <label>
              Callback URL
              <input value={callback} onChange={(e) => setCallback(e.target.value)} />
            </label>
            <button className="primary" type="submit">
              {method === "monnify" ? "Monnify Coming Soon" : "Pay with Paystack"}
            </button>
          </form>
          {method === "paystack" && lastReference && (
            <button className="ghost" type="button" onClick={verifyPayment}>
              {verifying ? "Verifying..." : "Verify Paystack Payment"}
            </button>
          )}
          {message && <div className="error">{message}</div>}
        </div>
      </section>

      {successModal && (
        <div className="success-screen" role="dialog" aria-live="polite">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <div className="success-title">Wallet Funded</div>
            <div className="success-sub">Your payment was successful.</div>
            <div className="success-grid">
              <div>
                <div className="label">Amount</div>
                <div className="value">₦ {lastAmount || amount}</div>
              </div>
              <div>
                <div className="label">Reference</div>
                <div className="muted">{lastReference || "—"}</div>
              </div>
              <div>
                <div className="label">New Balance</div>
                <div className="value">₦ {wallet?.balance || "0.00"}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setSuccessModal(false)}>Close</button>
              <button className="primary" onClick={() => navigate("/data")}>Buy Data Now</button>
              <button className="ghost" onClick={() => navigate("/transactions")}>View Receipt</button>
            </div>
            <div className="hint">Auto-refreshing wallet balance.</div>
          </div>
        </div>
      )}

      {pendingRef && !successModal && (
        <div className="card pending-card">
          <div>
            <div className="label">Payment Pending</div>
            <div className="value">Reference: {pendingRef}</div>
            <div className="muted">We are confirming your payment. Webhooks can take a minute.</div>
          </div>
          <button className="ghost" type="button" onClick={() => verifyPayment(pendingRef)}>
            {verifying ? "Checking..." : "Check Status"}
          </button>
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <h3>Wallet Ledger</h3>
          <span className="muted">Latest credits and debits</span>
        </div>
        <div className="card-list">
          {ledger.map((entry) => (
            <div className="list-card" key={entry.id}>
              <div>
                <div className="list-title">{entry.entry_type}</div>
                <div className="muted">{entry.description || entry.reference}</div>
              </div>
              <div className="list-meta">
                <div className="value">₦ {entry.amount}</div>
                <span className={`pill ${entry.entry_type === "credit" ? "success" : "failed"}`}>
                  {entry.entry_type}
                </span>
              </div>
            </div>
          ))}
          {ledger.length === 0 && (
            <div className="empty">No ledger entries yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

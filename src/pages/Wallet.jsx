import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";

const LAST_FUND_KEY = "vtu_last_fund";

export default function Wallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
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

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
  }, []);

  useEffect(() => {
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    if (ref) {
      setLastReference(ref);
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

  const fund = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      if (method === "monnify") {
        setMessage("Monnify is coming soon. Please use Paystack for now.");
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
      }
      const url = paystackUrl || monnifyUrl;
      if (url) window.location.href = url;
    } catch (err) {
      setMessage(err.message);
    }
  };

  const verifyPayment = async (refOverride) => {
    const reference = refOverride || lastReference;
    if (!reference) {
      setMessage("No recent transaction reference found.");
      return;
    }
    setMessage("");
    try {
      setVerifying(true);
      const res = await apiFetch(`/wallet/paystack/verify?reference=${reference}`);
      if (res.status === "success") {
        setMessage("");
        setSuccessModal(true);
        apiFetch("/wallet/me").then(setWallet).catch(() => {});
      } else {
        setMessage("Payment pending. Please wait and try again.");
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="page">
      <section className="hero-card">
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
          <h3>Fund Wallet</h3>
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
    </div>
  );
}

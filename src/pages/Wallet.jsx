import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState(1000);
  const [callback, setCallback] = useState(
    typeof window !== "undefined" ? `${window.location.origin}/app/wallet` : ""
  );
  const [message, setMessage] = useState("");
  const [lastReference, setLastReference] = useState("");
  const [searchParams] = useSearchParams();
  const [method, setMethod] = useState("monnify");

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
  }, []);

  useEffect(() => {
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    if (ref) {
      setLastReference(ref);
      verifyPayment(ref);
    }
  }, [searchParams]);

  const fund = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const path = method === "monnify" ? "/wallet/monnify/init" : "/wallet/fund";
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
      if (paystackRef) setLastReference(paystackRef);
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
      const res = await apiFetch(`/wallet/paystack/verify?reference=${reference}`);
      if (res.status === "success") {
        setMessage("Wallet funded successfully.");
        apiFetch("/wallet/me").then(setWallet).catch(() => {});
      } else {
        setMessage("Payment pending. Please wait and try again.");
      }
    } catch (err) {
      setMessage(err.message);
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
                <option value="monnify">Monnify (Bank/Card/USSD)</option>
                <option value="paystack">Paystack (Card)</option>
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
              {method === "monnify" ? "Pay with Monnify" : "Pay with Paystack"}
            </button>
          </form>
          {method === "paystack" && (
            <button className="ghost" type="button" onClick={verifyPayment}>
              Verify Paystack Payment
            </button>
          )}
          {message && <div className="error">{message}</div>}
        </div>
      </section>
    </div>
  );
}

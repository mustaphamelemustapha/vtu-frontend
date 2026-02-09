import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState(1000);
  const [callback, setCallback] = useState(
    typeof window !== "undefined" ? `${window.location.origin}/app/wallet` : ""
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
  }, []);

  const fund = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await apiFetch("/wallet/fund", {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), callback_url: callback })
      });
      if (res?.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
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
              Amount (₦)
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="100" />
            </label>
            <label>
              Callback URL
              <input value={callback} onChange={(e) => setCallback(e.target.value)} />
            </label>
            <button className="primary" type="submit">Pay with Paystack</button>
          </form>
          {message && <div className="error">{message}</div>}
        </div>
      </section>
    </div>
  );
}

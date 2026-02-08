import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState(1000);
  const [callback, setCallback] = useState("http://localhost:5173/wallet");
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
    <div>
      <h2>Wallet</h2>
      <div className="card">
        <div className="label">Balance</div>
        <div className="value">₦ {wallet?.balance || "0.00"}</div>
      </div>
      <div className="card">
        <h3>Fund Wallet</h3>
        <form onSubmit={fund} className="form-row">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="100" />
          <input value={callback} onChange={(e) => setCallback(e.target.value)} />
          <button className="primary" type="submit">Pay with Paystack</button>
        </form>
        {message && <div className="error">{message}</div>}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

const ENABLE_BANK_TRANSFER = true;

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const { showToast } = useToast();
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferAccounts, setTransferAccounts] = useState([]);
  const [transferNeedsKyc, setTransferNeedsKyc] = useState(false);
  const [transferProvider, setTransferProvider] = useState("monnify");
  const [transferForm, setTransferForm] = useState({ bvn: "", nin: "" });
  const [phonePromptOpen, setPhonePromptOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");

  useEffect(() => {
    apiFetch("/wallet/me").then(setWallet).catch(() => {});
    apiFetch("/wallet/ledger").then(setLedger).catch(() => {});
  }, []);

  const openTransfer = async () => {
    setTransferOpen(true);
    setTransferBusy(true);
    try {
      const res = await apiFetch("/wallet/bank-transfer-accounts");
      setTransferAccounts(res?.accounts || []);
      setTransferNeedsKyc(!!res?.requires_kyc);
      setTransferProvider(String(res?.provider || "monnify").toLowerCase());
    } catch (err) {
      showToast(err.message || "Failed to load bank transfer accounts.", "error");
      setTransferAccounts([]);
      setTransferNeedsKyc(true);
    } finally {
      setTransferBusy(false);
    }
  };

  const createTransfer = async (e) => {
    e.preventDefault();
    setTransferBusy(true);
    try {
      const requestBody = transferProvider === "paystack"
        ? {}
        : {
            bvn: transferForm.bvn || null,
            nin: transferForm.nin || null,
          };
      const res = await apiFetch("/wallet/bank-transfer-accounts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });
      setTransferAccounts(res?.accounts || []);
      setTransferNeedsKyc(!!res?.requires_kyc);
      setTransferProvider(String(res?.provider || transferProvider || "monnify").toLowerCase());
      showToast("Bank transfer accounts generated.", "success");
    } catch (err) {
      if (String(err.message || "").toLowerCase().includes("phone")) {
        setPhonePromptOpen(true);
      } else {
        showToast(err.message || "Unable to generate accounts.", "error");
      }
    } finally {
      setTransferBusy(false);
    }
  };

  const savePhoneAndRetry = async (e) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setTransferBusy(true);
    try {
      await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ phone_number: phoneInput.trim() }),
      });
      setPhonePromptOpen(false);
      // Retry generation without requiring BVN/NIN; backend will accept phone for Paystack.
      const res = await apiFetch("/wallet/bank-transfer-accounts", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setTransferAccounts(res?.accounts || []);
      setTransferNeedsKyc(!!res?.requires_kyc);
      setTransferProvider(String(res?.provider || transferProvider || "paystack").toLowerCase());
      showToast("Bank transfer account generated.", "success");
      apiFetch("/wallet/me").then(setWallet).catch(() => {});
    } catch (err) {
      showToast(err.message || "Unable to save phone number.", "error");
    } finally {
      setTransferBusy(false);
    }
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard?.writeText(String(value || ""));
      showToast("Copied.", "success");
    } catch {
      showToast("Copy failed.", "error");
    }
  };

  return (
    <div className="page">
      <section className="hero-card wallet-hero">
        <div>
          <div className="label">Available Balance</div>
          <div className="hero-value">₦ {wallet?.balance || "0.00"}</div>
          <div className="muted">Generate your personal account number and fund via transfer.</div>
        </div>
        <div className="hero-actions">
          {ENABLE_BANK_TRANSFER && (
            <button className="primary" type="button" onClick={openTransfer} disabled={transferBusy}>
              Generate Account
            </button>
          )}
          <button className="ghost" type="button" onClick={() => apiFetch("/wallet/me").then(setWallet).catch(() => {})}>
            Refresh Balance
          </button>
        </div>
      </section>

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

      {ENABLE_BANK_TRANSFER && transferOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <div>
                <div className="label">Bank Transfer</div>
                <h3>Add money via mobile or internet banking</h3>
              </div>
              <button className="ghost" type="button" onClick={() => setTransferOpen(false)}>
                Close
              </button>
            </div>

            {transferBusy && <div className="notice">Loading...</div>}

            {!transferBusy && transferNeedsKyc && transferAccounts.length === 0 && transferProvider !== "paystack" && (
              <div className="card">
                <div className="muted">
                  Complete one-time verification details to generate your dedicated funding account.
                </div>
                <form onSubmit={createTransfer} className="form-grid" style={{ marginTop: 12 }}>
                  <label>
                    BVN (optional)
                    <input
                      value={transferForm.bvn}
                      onChange={(e) => setTransferForm({ ...transferForm, bvn: e.target.value })}
                      placeholder="Enter BVN"
                    />
                  </label>
                  <label>
                    NIN (optional)
                    <input
                      value={transferForm.nin}
                      onChange={(e) => setTransferForm({ ...transferForm, nin: e.target.value })}
                      placeholder="Enter NIN"
                    />
                  </label>
                  <button className="primary" type="submit" disabled={transferBusy}>
                    {transferBusy ? "Generating..." : "Generate Account Numbers"}
                  </button>
                </form>
              </div>
            )}

            {!transferBusy && transferNeedsKyc && transferAccounts.length === 0 && transferProvider === "paystack" && (
              <div className="card">
                <div className="muted">
                  Paystack needs your phone number to generate your dedicated account.
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="primary" type="button" onClick={() => setPhonePromptOpen(true)} disabled={transferBusy}>
                    Add Phone Number
                  </button>
                </div>
              </div>
            )}

            {!transferBusy && transferAccounts.length > 0 && (
              <div className="receipt-grid">
                {transferAccounts.map((acc, idx) => (
                  <div key={`${acc.bank_name}-${acc.account_number}-${idx}`}>
                    <div className="label">{acc.bank_name}</div>
                    <div className="value" style={{ fontSize: 18 }}>{acc.account_number}</div>
                    <div className="muted">{acc.account_name || "AxisVTU Wallet"}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="ghost" type="button" onClick={() => copyText(acc.account_number)}>
                        Copy Account
                      </button>
                      <button className="ghost" type="button" onClick={() => copyText(acc.bank_name)}>
                        Copy Bank
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!transferBusy && transferAccounts.length > 0 && (
              <div className="notice">
                Transfer to this account from PalmPay, 9PSB, or any bank app. Your wallet credits automatically after confirmation.
              </div>
            )}

            <div className="modal-actions">
              <button className="ghost" type="button" onClick={() => setTransferOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {phonePromptOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="label">Phone number required</div>
                <h3>Add your phone to generate bank account</h3>
              </div>
              <button className="ghost" type="button" onClick={() => setPhonePromptOpen(false)}>
                Close
              </button>
            </div>
            <form onSubmit={savePhoneAndRetry} className="form-grid">
              <label>
                Phone Number
                <input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 08123456789"
                  required
                />
              </label>
              <button className="primary" type="submit" disabled={transferBusy}>
                {transferBusy ? "Saving..." : "Save & Generate"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

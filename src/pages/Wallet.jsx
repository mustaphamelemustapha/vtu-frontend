import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, getActiveAuthScope } from "../services/api";
import { useToast } from "../context/toast.jsx";
import { queryKeys } from "../query/client.js";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";

const ENABLE_BANK_TRANSFER = true;

export default function Wallet() {
  const queryClient = useQueryClient();
  const authScope = getActiveAuthScope();
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState("");
  const { showToast } = useToast();
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferAccounts, setTransferAccounts] = useState([]);
  const [transferNeedsKyc, setTransferNeedsKyc] = useState(false);
  const [transferNeedsPhone, setTransferNeedsPhone] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [transferProvider, setTransferProvider] = useState("monnify");
  const [transferForm, setTransferForm] = useState({ bvn: "", nin: "" });
  const [phonePromptOpen, setPhonePromptOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const retryTimerRef = useRef(null);
  const walletRef = useRef(wallet);
  const ledgerRef = useRef(ledger);

  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  useEffect(() => {
    ledgerRef.current = ledger;
  }, [ledger]);

  const hydrateTransferState = (res, fallbackProvider = "monnify") => {
    setTransferAccounts(res?.accounts || []);
    setTransferNeedsKyc(!!res?.requires_kyc);
    setTransferNeedsPhone(!!res?.requires_phone);
    setTransferMessage(String(res?.message || ""));
    setTransferProvider(String(res?.provider || fallbackProvider).toLowerCase());
  };

  const refreshWalletViews = useCallback(async ({ silent = false, attempt = 1 } = {}) => {
    if (!silent) setWalletError("");
    const [walletRes, ledgerRes, transferRes] = await Promise.allSettled([
      queryClient.fetchQuery({
        queryKey: queryKeys.walletMe(authScope),
        queryFn: () => apiFetch("/wallet/me", { _suppressRetryToast: true }),
        staleTime: 15 * 1000,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.walletLedger(authScope),
        queryFn: () => apiFetch("/wallet/ledger", { _suppressRetryToast: true }),
        staleTime: 15 * 1000,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.transferAccounts(authScope),
        queryFn: () => apiFetch("/wallet/bank-transfer-accounts", { _suppressRetryToast: true }),
        staleTime: 15 * 1000,
      }),
    ]);
    if (walletRes.status === "fulfilled") setWallet(walletRes.value);
    if (ledgerRes.status === "fulfilled") setLedger(ledgerRes.value);
    if (transferRes.status === "fulfilled") hydrateTransferState(transferRes.value, "monnify");

    const criticalFailed = walletRes.status !== "fulfilled" && ledgerRes.status !== "fulfilled";
    const hasEssentialData =
      !!walletRef.current ||
      (Array.isArray(ledgerRef.current) && ledgerRef.current.length > 0) ||
      walletRes.status === "fulfilled" ||
      (ledgerRes.status === "fulfilled" && Array.isArray(ledgerRes.value) && ledgerRes.value.length > 0);

    if (!criticalFailed) {
      setWalletError("");
    } else {
      setWalletError(
        hasEssentialData
          ? "Live wallet update delayed. Showing last available data."
          : "Wallet is taking longer than usual. Retrying..."
      );
    }

    if (criticalFailed && attempt < 3) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        refreshWalletViews({ silent: true, attempt: attempt + 1 });
      }, 1000 * attempt);
    } else if (criticalFailed && !hasEssentialData && !silent) {
      showToast("Wallet is slow right now. Please hold on a moment.", "warning");
    }

    setWalletLoading(false);
  }, [authScope, queryClient, showToast]);

  useEffect(() => {
    refreshWalletViews().catch(() => {});
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [refreshWalletViews]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      refreshWalletViews({ silent: true }).catch(() => {});
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refreshWalletViews]);

  const openTransfer = async () => {
    setTransferOpen(true);
    setTransferBusy(true);
    try {
      const res = await queryClient.fetchQuery({
        queryKey: queryKeys.transferAccounts(authScope),
        queryFn: () => apiFetch("/wallet/bank-transfer-accounts", { _suppressRetryToast: true }),
        staleTime: 45 * 1000,
      });
      hydrateTransferState(res, "monnify");
    } catch (err) {
      showToast(err.message || "Failed to load bank transfer accounts.", "error");
      setTransferAccounts([]);
      setTransferNeedsKyc(true);
      setTransferNeedsPhone(false);
      setTransferMessage("Unable to load dedicated account now. Please try again.");
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
      queryClient.invalidateQueries({ queryKey: queryKeys.transferAccounts(authScope) });
      hydrateTransferState(res, transferProvider || "monnify");
      showToast("Bank transfer accounts generated.", "success");
    } catch (err) {
      if (String(err.message || "").toLowerCase().includes("phone")) {
        setTransferNeedsPhone(true);
        setPhonePromptOpen(true);
      } else {
        setTransferNeedsPhone(false);
        setTransferMessage(err.message || "Unable to generate account right now.");
        showToast(err.message || "Unable to generate accounts.", "error");
      }
    } finally {
      setTransferBusy(false);
    }
  };

  const savePhoneAndRetry = async (e) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    const normalizedPhone = String(phoneInput).replace(/\D/g, "");
    if (normalizedPhone.length < 10) {
      showToast("Enter a valid phone number.", "error");
      return;
    }
    setTransferBusy(true);
    try {
      setPhonePromptOpen(false);
      // Retry generation without requiring BVN/NIN; backend will accept phone for Paystack.
      const res = await apiFetch("/wallet/bank-transfer-accounts", {
        method: "POST",
        body: JSON.stringify({ phone_number: normalizedPhone }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.transferAccounts(authScope) });
      hydrateTransferState(res, transferProvider || "paystack");
      showToast("Bank transfer account generated.", "success");
      refreshWalletViews().catch(() => {});
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

  const hasGeneratedAccounts = transferAccounts.length> 0;
  const primaryAccount = hasGeneratedAccounts ? transferAccounts[0] : null;
  const showWalletLoadingState = walletLoading && !wallet && ledger.length === 0;

  return (
    <div className="page">
      <section className="hero-card wallet-hero wallet-hero-premium">
        <div>
          <div className="label">Wallet</div>
          <div className="hero-value">{walletLoading ? "Loading..." : `₦ ${wallet?.balance || "0.00"}`}</div>
          <div className="muted">Automated funding with your personal account number.</div>
        </div>
        <div className="hero-actions wallet-hero-actions-premium">
          {ENABLE_BANK_TRANSFER && (
            <Button data-testid="wallet-generate-account"
              onClick={openTransfer}
              disabled={transferBusy}>
              {hasGeneratedAccounts ? "Manage Accounts" : "Generate Account"}
            </Button>
          )}
        </div>
      </section>

      <section className="section">
        <Card className="wallet-account-board">
          <div className="section-head">
            <h3>Automated Bank Transfer</h3>
            <span className="muted">{transferProvider === "paystack" ? "Paystack" : "Monnify"}</span>
          </div>

          {primaryAccount ? (
            <div className="wallet-primary-account">
              <div>
                <div className="label">{primaryAccount.bank_name}</div>
                <div className="wallet-primary-account-number">{primaryAccount.account_number}</div>
                <div className="muted">{primaryAccount.account_name || "AxisVTU Wallet"}</div>
              </div>
              <Button variant="ghost"
                className="account-copy-btn"
                onClick={() => copyText(primaryAccount.account_number)}>
                Copy
              </Button>
            </div>
          ) : showWalletLoadingState ? (
            <div className="wallet-account-grid">
              <div className="wallet-account-card skeleton">
                <div className="skeleton-line w-40" />
                <div className="skeleton-line w-80" />
                <div className="skeleton-line w-60" />
              </div>
            </div>
          ) : (
            <div className="notice">
              {transferMessage || "No dedicated account yet. Tap Generate Account to create one."}
            </div>
          )}

          {transferAccounts.length> 1 && (
            <div className="wallet-account-grid">
              {transferAccounts.slice(1).map((acc, idx) => (
                <div className="wallet-account-card" key={`${acc.bank_name}-${acc.account_number}-${idx}`}>
                  <div className="label">{acc.bank_name}</div>
                  <div className="wallet-account-number">{acc.account_number}</div>
                  <div className="muted">{acc.account_name || "AxisVTU Wallet"}</div>
                  <Button variant="ghost"
                    className="beneficiary-save-btn"
                    onClick={() => copyText(acc.account_number)}>
                    Copy Account
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="section">
        <div className="section-head">
          <h3>Wallet Ledger</h3>
          <span className="muted">Latest credits and debits</span>
        </div>
        {walletError && (
          <div className="notice notice-inline-action notice-compact">
            <span>{walletError}</span>
            <button className="ghost beneficiary-save-btn" type="button" onClick={() => refreshWalletViews({ silent: false, attempt: 1 })}>
              Retry now
            </button>
          </div>
        )}
        <div className="card-list">
          {showWalletLoadingState && (
            <div className="list-card skeleton">
              <div style={{ width: "100%" }}>
                <div className="skeleton-line w-40" />
                <div className="skeleton-line w-80" />
              </div>
            </div>
          )}
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
          {ledger.length === 0 && !showWalletLoadingState && (
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
              <Button variant="ghost" type="button" onClick={() => setTransferOpen(false)}>
                Close
              </Button>
            </div>

            {transferBusy && <div className="notice">Loading...</div>}

            {!transferBusy && transferNeedsKyc && transferAccounts.length === 0 && transferProvider !== "paystack" && (
              <Card>
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
                  <Button type="submit" disabled={transferBusy}>
                    {transferBusy ? "Generating..." : "Generate Account Numbers"}
                  </Button>
                </form>
              </Card>
            )}

            {!transferBusy && transferNeedsKyc && transferAccounts.length === 0 && transferProvider === "paystack" && transferNeedsPhone && (
              <Card>
                <div className="muted">
                  Paystack needs your phone number to generate your dedicated account.
                </div>
                <div style={{ marginTop: 12 }}>
                  <Button type="button" onClick={() => setPhonePromptOpen(true)} disabled={transferBusy}>
                    Add Phone Number
                  </Button>
                </div>
              </Card>
            )}

            {!transferBusy && transferNeedsKyc && transferAccounts.length === 0 && transferProvider === "paystack" && !transferNeedsPhone && (
              <Card>
                <div className="muted">
                  {transferMessage || "We could not fetch your dedicated account right now. Please try again shortly."}
                </div>
                <div style={{ marginTop: 12 }}>
                  <Button type="button" onClick={createTransfer} disabled={transferBusy}>
                    Try Again
                  </Button>
                </div>
              </Card>
            )}

            {!transferBusy && transferAccounts.length> 0 && (
              <div className="receipt-grid">
                {transferAccounts.map((acc, idx) => (
                  <div key={`${acc.bank_name}-${acc.account_number}-${idx}`}>
                    <div className="label">{acc.bank_name}</div>
                    <div className="value" style={{ fontSize: 18 }}>{acc.account_number}</div>
                    <div className="muted">{acc.account_name || "AxisVTU Wallet"}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button variant="ghost" type="button" onClick={() => copyText(acc.account_number)}>
                        Copy Account
                      </Button>
                      <Button variant="ghost" type="button" onClick={() => copyText(acc.bank_name)}>
                        Copy Bank
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!transferBusy && transferAccounts.length> 0 && (
              <div className="notice">
                Transfer to this account from PalmPay, 9PSB, or any bank app. Your wallet credits automatically after confirmation.
              </div>
            )}

            <div className="modal-actions">
              <Button variant="ghost" type="button" onClick={() => setTransferOpen(false)}>
                Done
              </Button>
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
              <Button variant="ghost" type="button" onClick={() => setPhonePromptOpen(false)}>
                Close
              </Button>
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
              <Button type="submit" disabled={transferBusy}>
                {transferBusy ? "Saving..." : "Save & Generate"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

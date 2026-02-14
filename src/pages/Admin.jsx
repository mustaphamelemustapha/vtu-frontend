import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

const DEFAULT_PAGE_SIZE = 50;

function statusKey(value) {
  return String(value || "").toLowerCase();
}

function statusLabel(value) {
  const key = statusKey(value);
  if (key === "success") return "Success";
  if (key === "pending") return "Pending";
  if (key === "failed") return "Failed";
  if (key === "refunded") return "Refunded";
  return String(value || "—");
}

function typeLabel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "wallet_fund") return "Wallet Fund";
  if (key === "data") return "Data";
  return String(value || "—");
}

function formatMoney(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return String(value || "0.00");
  return num.toFixed(2);
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value || "—");
  }
}

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const str = String(v).trim();
    if (!str) return;
    sp.set(k, str);
  });
  const out = sp.toString();
  return out ? `?${out}` : "";
}

export default function Admin() {
  const { showToast } = useToast();

  const [tab, setTab] = useState("overview"); // overview|transactions|users|pricing
  const [analytics, setAnalytics] = useState(null);

  // Pricing
  const [pricingForm, setPricingForm] = useState({ network: "mtn", role: "user", margin: 0 });
  const [pricingBusy, setPricingBusy] = useState(false);

  // Transactions
  const [txState, setTxState] = useState({ items: [], total: 0, page: 1, page_size: DEFAULT_PAGE_SIZE });
  const [txBusy, setTxBusy] = useState(false);
  const [txFilters, setTxFilters] = useState({ q: "", status: "", tx_type: "", network: "" });
  const [selectedTx, setSelectedTx] = useState(null);

  // Users
  const [userState, setUserState] = useState({ items: [], total: 0, page: 1, page_size: DEFAULT_PAGE_SIZE });
  const [userBusy, setUserBusy] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [fundOpen, setFundOpen] = useState(false);
  const [fundForm, setFundForm] = useState({ amount: 1000, description: "Admin funding" });
  const [fundBusy, setFundBusy] = useState(false);

  useEffect(() => {
    apiFetch("/admin/analytics").then(setAnalytics).catch(() => {});
  }, []);

  const fetchTransactions = async (next = {}) => {
    const page = next.page ?? txState.page ?? 1;
    const page_size = next.page_size ?? txState.page_size ?? DEFAULT_PAGE_SIZE;
    setTxBusy(true);
    try {
      const data = await apiFetch(
        `/admin/transactions${qs({
          page,
          page_size,
          q: txFilters.q,
          status: txFilters.status,
          tx_type: txFilters.tx_type,
          network: txFilters.network,
        })}`
      );
      setTxState(data);
    } catch (err) {
      showToast(err?.message || "Failed to load transactions.", "error");
    } finally {
      setTxBusy(false);
    }
  };

  const fetchUsers = async (next = {}) => {
    const page = next.page ?? userState.page ?? 1;
    const page_size = next.page_size ?? userState.page_size ?? DEFAULT_PAGE_SIZE;
    setUserBusy(true);
    try {
      const data = await apiFetch(`/admin/users${qs({ page, page_size, q: userQuery })}`);
      setUserState(data);
    } catch (err) {
      showToast(err?.message || "Failed to load users.", "error");
    } finally {
      setUserBusy(false);
    }
  };

  useEffect(() => {
    if (tab === "transactions" && txState.items.length === 0) fetchTransactions({ page: 1 });
    if (tab === "users" && userState.items.length === 0) fetchUsers({ page: 1 });
  }, [tab]);

  const updatePricing = async (e) => {
    e.preventDefault();
    setPricingBusy(true);
    try {
      await apiFetch("/admin/pricing", {
        method: "POST",
        body: JSON.stringify({
          network: pricingForm.network,
          role: pricingForm.role,
          margin: Number(pricingForm.margin),
        }),
      });
      showToast("Pricing updated.", "success");
    } catch (err) {
      showToast(err?.message || "Pricing update failed.", "error");
    } finally {
      setPricingBusy(false);
    }
  };

  const suspendUser = async (user) => {
    if (!window.confirm(`Suspend ${user.email}?`)) return;
    try {
      await apiFetch(`/admin/users/${user.id}/suspend`, { method: "POST" });
      showToast("User suspended.", "success");
      fetchUsers();
    } catch (err) {
      showToast(err?.message || "Suspend failed.", "error");
    }
  };

  const activateUser = async (user) => {
    if (!window.confirm(`Activate ${user.email}?`)) return;
    try {
      await apiFetch(`/admin/users/${user.id}/activate`, { method: "POST" });
      showToast("User activated.", "success");
      fetchUsers();
    } catch (err) {
      showToast(err?.message || "Activate failed.", "error");
    }
  };

  const openFund = (user) => {
    setSelectedUser(user);
    setFundForm({ amount: 1000, description: "Admin funding" });
    setFundOpen(true);
  };

  const submitFund = async (e) => {
    e.preventDefault();
    if (!selectedUser?.id) return;
    const amount = Number(fundForm.amount || 0);
    if (!amount || amount <= 0) {
      showToast("Enter a valid amount.", "error");
      return;
    }
    setFundBusy(true);
    try {
      await apiFetch("/admin/fund-wallet", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.id,
          amount,
          description: fundForm.description || "Admin funding",
        }),
      });
      showToast("Wallet funded.", "success");
      setFundOpen(false);
    } catch (err) {
      showToast(err?.message || "Funding failed.", "error");
    } finally {
      setFundBusy(false);
    }
  };

  const txPages = useMemo(() => {
    const total = Number(txState.total || 0);
    const size = Number(txState.page_size || DEFAULT_PAGE_SIZE);
    return Math.max(1, Math.ceil(total / Math.max(1, size)));
  }, [txState.total, txState.page_size]);

  const userPages = useMemo(() => {
    const total = Number(userState.total || 0);
    const size = Number(userState.page_size || DEFAULT_PAGE_SIZE);
    return Math.max(1, Math.ceil(total / Math.max(1, size)));
  }, [userState.total, userState.page_size]);

  return (
    <div className="page admin-page">
      <section className="section">
        <div className="admin-head card">
          <div className="admin-title">
            <div>
              <div className="label">Admin</div>
              <h3>Console</h3>
              <div className="muted">Manage pricing, users, and platform activity.</div>
            </div>
            <div className="admin-tabs">
              {[
                { id: "overview", label: "Overview" },
                { id: "transactions", label: "Transactions" },
                { id: "users", label: "Users" },
                { id: "pricing", label: "Pricing" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`pill tab ${tab === t.id ? "active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {tab === "overview" && (
        <section className="section">
          <div className="grid-3">
            <div className="card stat-card">
              <div className="label">Total Revenue</div>
              <div className="value">₦ {analytics?.total_revenue || 0}</div>
              <div className="muted">Successful transactions</div>
            </div>
            <div className="card stat-card">
              <div className="label">Total Users</div>
              <div className="value">{analytics?.total_users || 0}</div>
              <div className="muted">Registered accounts</div>
            </div>
            <div className="card stat-card">
              <div className="label">API Success</div>
              <div className="value">{analytics?.api_success || 0}</div>
              <div className="muted">Provider deliveries</div>
            </div>
          </div>
          <div className="admin-overview-grid">
            <div className="card">
              <div className="section-head">
                <h3>Fast Actions</h3>
                <span className="muted">Most used admin tools</span>
              </div>
              <div className="grid-2">
                <button className="card action-card" type="button" onClick={() => setTab("transactions")}>
                  <div className="label">View</div>
                  <div className="value">All Transactions</div>
                  <div className="muted">Search, filter, open receipts</div>
                </button>
                <button className="card action-card" type="button" onClick={() => setTab("users")}>
                  <div className="label">Manage</div>
                  <div className="value">Users</div>
                  <div className="muted">Suspend/activate and fund wallets</div>
                </button>
              </div>
            </div>
            <div className="card">
              <h3>Notes</h3>
              <div className="muted">
                Pricing rules affect new purchases immediately. Use the Transactions tab to audit all platform activity.
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === "transactions" && (
        <section className="section">
          <div className="card">
            <div className="admin-toolbar">
              <input
                placeholder="Search by email, reference, plan code..."
                value={txFilters.q}
                onChange={(e) => setTxFilters({ ...txFilters, q: e.target.value })}
              />
              <select
                value={txFilters.status}
                onChange={(e) => setTxFilters({ ...txFilters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <select
                value={txFilters.tx_type}
                onChange={(e) => setTxFilters({ ...txFilters, tx_type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="data">Data</option>
                <option value="wallet_fund">Wallet Fund</option>
              </select>
              <button
                className="primary"
                type="button"
                onClick={() => fetchTransactions({ page: 1 })}
                disabled={txBusy}
              >
                {txBusy ? "Loading..." : "Search"}
              </button>
            </div>

            <div className="admin-subhead">
              <div className="muted">
                Showing page {txState.page} of {txPages} ({txState.total} total)
              </div>
              <div className="admin-pager">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => fetchTransactions({ page: Math.max(1, (txState.page || 1) - 1) })}
                  disabled={txBusy || (txState.page || 1) <= 1}
                >
                  Prev
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => fetchTransactions({ page: Math.min(txPages, (txState.page || 1) + 1) })}
                  disabled={txBusy || (txState.page || 1) >= txPages}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table" aria-label="All platform transactions">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Network</th>
                  </tr>
                </thead>
                <tbody>
                  {txState.items.map((tx) => (
                    <tr key={tx.id} onClick={() => setSelectedTx(tx)} role="button" tabIndex={0}>
                      <td className="mono">{formatDate(tx.created_at)}</td>
                      <td>{tx.user_email}</td>
                      <td>{typeLabel(tx.tx_type)}</td>
                      <td>
                        <span className={`pill ${statusKey(tx.status)}`}>{statusLabel(tx.status)}</span>
                      </td>
                      <td className="mono">₦ {formatMoney(tx.amount)}</td>
                      <td className="mono">{tx.reference}</td>
                      <td>{tx.network || "—"}</td>
                    </tr>
                  ))}
                  {!txBusy && txState.items.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty">No transactions found.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="admin-card-list" aria-label="Transactions list (mobile)">
                {txState.items.map((tx) => (
                  <button key={tx.id} type="button" className="list-card" onClick={() => setSelectedTx(tx)}>
                    <div>
                      <div className="list-title">{typeLabel(tx.tx_type)}</div>
                      <div className="muted">{tx.user_email}</div>
                      <div className="muted">{tx.reference}</div>
                    </div>
                    <div className="list-meta">
                      <div className="value">₦ {formatMoney(tx.amount)}</div>
                      <span className={`pill ${statusKey(tx.status)}`}>{statusLabel(tx.status)}</span>
                    </div>
                  </button>
                ))}
                {!txBusy && txState.items.length === 0 && <div className="empty">No transactions found.</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === "users" && (
        <section className="section">
          <div className="card">
            <div className="admin-toolbar">
              <input
                placeholder="Search users by email or name..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <button className="primary" type="button" onClick={() => fetchUsers({ page: 1 })} disabled={userBusy}>
                {userBusy ? "Loading..." : "Search"}
              </button>
            </div>

            <div className="admin-subhead">
              <div className="muted">
                Showing page {userState.page} of {userPages} ({userState.total} total)
              </div>
              <div className="admin-pager">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => fetchUsers({ page: Math.max(1, (userState.page || 1) - 1) })}
                  disabled={userBusy || (userState.page || 1) <= 1}
                >
                  Prev
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => fetchUsers({ page: Math.min(userPages, (userState.page || 1) + 1) })}
                  disabled={userBusy || (userState.page || 1) >= userPages}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table" aria-label="All users">
                <thead>
                  <tr>
                    <th>Joined</th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userState.items.map((u) => (
                    <tr key={u.id}>
                      <td className="mono">{formatDate(u.created_at)}</td>
                      <td>{u.email}</td>
                      <td>{u.full_name}</td>
                      <td>
                        <span className="pill">{String(u.role || "user")}</span>
                      </td>
                      <td>
                        <span className={`pill ${u.is_active ? "success" : "failed"}`}>
                          {u.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td>{u.is_verified ? "Yes" : "No"}</td>
                      <td className="admin-actions">
                        <button className="ghost" type="button" onClick={() => openFund(u)}>
                          Fund
                        </button>
                        {u.is_active ? (
                          <button className="ghost danger" type="button" onClick={() => suspendUser(u)}>
                            Suspend
                          </button>
                        ) : (
                          <button className="ghost" type="button" onClick={() => activateUser(u)}>
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!userBusy && userState.items.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty">No users found.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="admin-card-list" aria-label="Users list (mobile)">
                {userState.items.map((u) => (
                  <div key={u.id} className="list-card">
                    <div>
                      <div className="list-title">{u.full_name}</div>
                      <div className="muted">{u.email}</div>
                      <div className="muted">{String(u.role || "user")}</div>
                    </div>
                    <div className="list-meta">
                      <span className={`pill ${u.is_active ? "success" : "failed"}`}>
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                      <button className="ghost" type="button" onClick={() => openFund(u)}>
                        Fund
                      </button>
                      {u.is_active ? (
                        <button className="ghost danger" type="button" onClick={() => suspendUser(u)}>
                          Suspend
                        </button>
                      ) : (
                        <button className="ghost" type="button" onClick={() => activateUser(u)}>
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!userBusy && userState.items.length === 0 && <div className="empty">No users found.</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === "pricing" && (
        <section className="section">
          <div className="card">
            <h3>Pricing Rules</h3>
            <form onSubmit={updatePricing} className="form-grid">
              <label>
                Network
                <input
                  value={pricingForm.network}
                  onChange={(e) => setPricingForm({ ...pricingForm, network: e.target.value })}
                />
              </label>
              <label>
                Role
                <select value={pricingForm.role} onChange={(e) => setPricingForm({ ...pricingForm, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="reseller">Reseller</option>
                </select>
              </label>
              <label>
                Margin (₦)
                <input
                  type="number"
                  value={pricingForm.margin}
                  onChange={(e) => setPricingForm({ ...pricingForm, margin: e.target.value })}
                />
              </label>
              <button className="primary" type="submit" disabled={pricingBusy}>
                {pricingBusy ? "Updating..." : "Update"}
              </button>
            </form>
            <div className="muted">
              Tip: set a margin per network for normal users vs resellers.
            </div>
          </div>
        </section>
      )}

      {selectedTx && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-receipt">
            <div className="modal-head">
              <div>
                <div className="label">Platform Receipt</div>
                <h3>{typeLabel(selectedTx.tx_type)}</h3>
              </div>
              <button className="ghost" type="button" onClick={() => setSelectedTx(null)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <div className="list-card">
                <div>
                  <div className="list-title">{selectedTx.user_email}</div>
                  <div className="muted">{selectedTx.reference}</div>
                  <div className="muted">{formatDate(selectedTx.created_at)}</div>
                </div>
                <div className="list-meta">
                  <div className="value">₦ {formatMoney(selectedTx.amount)}</div>
                  <span className={`pill ${statusKey(selectedTx.status)}`}>{statusLabel(selectedTx.status)}</span>
                </div>
              </div>
              <div className="receipt-grid">
                <div>
                  <div className="label">Network</div>
                  <div>{selectedTx.network || "—"}</div>
                </div>
                <div>
                  <div className="label">Plan</div>
                  <div>{selectedTx.data_plan_code || "—"}</div>
                </div>
                <div>
                  <div className="label">Type</div>
                  <div>{typeLabel(selectedTx.tx_type)}</div>
                </div>
                <div>
                  <div className="label">Status</div>
                  <div>{statusLabel(selectedTx.status)}</div>
                </div>
                <div>
                  <div className="label">External Ref</div>
                  <div>{selectedTx.external_reference || "—"}</div>
                </div>
                <div>
                  <div className="label">Failure Reason</div>
                  <div>{selectedTx.failure_reason || "—"}</div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(selectedTx.reference || "");
                  showToast("Reference copied.", "success");
                }}
              >
                Copy Reference
              </button>
              <button className="primary" type="button" onClick={() => setSelectedTx(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {fundOpen && selectedUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="label">Fund Wallet</div>
                <h3>{selectedUser.email}</h3>
              </div>
              <button className="ghost" type="button" onClick={() => setFundOpen(false)}>
                Close
              </button>
            </div>
            <form onSubmit={submitFund} className="form-grid">
              <label>
                Amount (₦)
                <input
                  type="number"
                  min="1"
                  value={fundForm.amount}
                  onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                />
              </label>
              <label>
                Description
                <input
                  value={fundForm.description}
                  onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button className="ghost" type="button" onClick={() => setFundOpen(false)} disabled={fundBusy}>
                  Cancel
                </button>
                <button className="primary" type="submit" disabled={fundBusy}>
                  {fundBusy ? "Funding..." : "Fund Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


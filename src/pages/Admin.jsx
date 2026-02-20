import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";

const DEFAULT_PAGE_SIZE = 50;
const SERVICE_PROVIDER_OPTIONS = {
  data: ["mtn", "glo", "airtel", "9mobile"],
  airtime: ["mtn", "glo", "airtel", "9mobile"],
  cable: ["dstv", "gotv", "startimes"],
  electricity: ["ikeja", "eko", "abuja", "kano", "ibadan", "enugu", "portharcourt", "kaduna"],
  exam: ["waec", "neco", "jamb"],
};

function statusKey(value) {
  return String(value || "").toLowerCase();
}

function statusLabel(value) {
  const key = statusKey(value);
  if (key === "success") return "Success";
  if (key === "pending") return "Pending";
  if (key === "failed") return "Failed";
  if (key === "refunded") return "Refunded";
  if (key === "open") return "Open";
  if (key === "resolved") return "Resolved";
  if (key === "rejected") return "Rejected";
  return String(value || "—");
}

function typeLabel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "wallet_fund") return "Wallet Fund";
  if (key === "data") return "Data";
  if (key === "airtime") return "Airtime";
  if (key === "cable") return "Cable";
  if (key === "electricity") return "Electricity";
  if (key === "exam") return "Exam";
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

  const [tab, setTab] = useState("overview"); // overview|transactions|reports|users|pricing
  const [analytics, setAnalytics] = useState(null);

  // Pricing
  const [pricingForm, setPricingForm] = useState({ tx_type: "data", provider: "mtn", margin: 0 });
  const [pricingBusy, setPricingBusy] = useState(false);
  const [pricingRules, setPricingRules] = useState([]);
  const [pricingLoadBusy, setPricingLoadBusy] = useState(false);

  // Transactions
  const [txState, setTxState] = useState({ items: [], total: 0, page: 1, page_size: DEFAULT_PAGE_SIZE });
  const [txBusy, setTxBusy] = useState(false);
  const [txFilters, setTxFilters] = useState({ q: "", status: "", tx_type: "", network: "" });
  const [selectedTx, setSelectedTx] = useState(null);

  // Reports
  const [reportState, setReportState] = useState({ items: [], total: 0, page: 1, page_size: DEFAULT_PAGE_SIZE });
  const [reportBusy, setReportBusy] = useState(false);
  const [reportFilters, setReportFilters] = useState({ q: "", status: "" });

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

  const fetchReports = async (next = {}) => {
    const page = next.page ?? reportState.page ?? 1;
    const page_size = next.page_size ?? reportState.page_size ?? DEFAULT_PAGE_SIZE;
    setReportBusy(true);
    try {
      const data = await apiFetch(
        `/admin/reports${qs({
          page,
          page_size,
          q: reportFilters.q,
          status: reportFilters.status,
        })}`
      );
      setReportState(data);
    } catch (err) {
      showToast(err?.message || "Failed to load reports.", "error");
    } finally {
      setReportBusy(false);
    }
  };

  const fetchPricingRules = async () => {
    setPricingLoadBusy(true);
    try {
      const data = await apiFetch("/admin/pricing");
      setPricingRules(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      showToast(err?.message || "Failed to load pricing rules.", "error");
    } finally {
      setPricingLoadBusy(false);
    }
  };

  useEffect(() => {
    if (tab === "transactions" && txState.items.length === 0) fetchTransactions({ page: 1 });
    if (tab === "reports" && reportState.items.length === 0) fetchReports({ page: 1 });
    if (tab === "users" && userState.items.length === 0) fetchUsers({ page: 1 });
    if (tab === "pricing" && pricingRules.length === 0) fetchPricingRules();
  }, [tab]);

  const updatePricing = async (e) => {
    e.preventDefault();
    setPricingBusy(true);
    try {
      const txType = String(pricingForm.tx_type || "data").toLowerCase();
      const provider = String(pricingForm.provider || "").trim().toLowerCase();
      if (!provider) {
        showToast("Provider/network is required.", "error");
        return;
      }
      await apiFetch("/admin/pricing", {
        method: "POST",
        body: JSON.stringify({
          tx_type: txType,
          provider,
          network: provider,
          role: "user",
          margin: Number(pricingForm.margin),
        }),
      });
      showToast("Pricing updated.", "success");
      fetchPricingRules();
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

  const reportPages = useMemo(() => {
    const total = Number(reportState.total || 0);
    const size = Number(reportState.page_size || DEFAULT_PAGE_SIZE);
    return Math.max(1, Math.ceil(total / Math.max(1, size)));
  }, [reportState.total, reportState.page_size]);

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
                { id: "reports", label: "Reports" },
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
              <div className="label">Gross Profit (Est.)</div>
              <div className="value">₦ {analytics?.gross_profit_estimate || 0}</div>
              <div className="muted">{analytics?.gross_margin_pct || 0}% margin on data</div>
            </div>
            <div className="card stat-card">
              <div className="label">Total Users</div>
              <div className="value">{analytics?.total_users || 0}</div>
              <div className="muted">Registered accounts</div>
            </div>
          </div>
          <div className="grid-3" style={{ marginTop: 16 }}>
            <div className="card stat-card">
              <div className="label">Data Revenue</div>
              <div className="value">₦ {analytics?.data_revenue || 0}</div>
              <div className="muted">Successful data purchases</div>
            </div>
            <div className="card stat-card">
              <div className="label">Data Cost (Est.)</div>
              <div className="value">₦ {analytics?.data_cost_estimate || 0}</div>
              <div className="muted">From current base prices</div>
            </div>
            <div className="card stat-card">
              <div className="label">Service Revenue</div>
              <div className="value">₦ {analytics?.service_revenue || 0}</div>
              <div className="muted">Airtime, cable, electricity, exam</div>
            </div>
          </div>
          <div className="grid-3" style={{ marginTop: 16 }}>
            <div className="card stat-card">
              <div className="label">Service Cost (Est.)</div>
              <div className="value">₦ {analytics?.service_cost_estimate || 0}</div>
              <div className="muted">From service base amounts</div>
            </div>
            <div className="card stat-card">
              <div className="label">Service Profit (Est.)</div>
              <div className="value">₦ {analytics?.service_profit_estimate || 0}</div>
              <div className="muted">Revenue minus base estimate</div>
            </div>
            <div className="card stat-card">
              <div className="label">API Success</div>
              <div className="value">{analytics?.api_success || 0}</div>
              <div className="muted">Provider deliveries</div>
            </div>
            <div className="card stat-card">
              <div className="label">Open Reports</div>
              <div className="value">{analytics?.reports_open || 0}</div>
              <div className="muted">Unresolved transaction issues</div>
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
                <option value="airtime">Airtime</option>
                <option value="cable">Cable</option>
                <option value="electricity">Electricity</option>
                <option value="exam">Exam</option>
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

      {tab === "reports" && (
        <section className="section">
          <div className="card">
            <div className="admin-toolbar">
              <input
                placeholder="Search by user, reference, reason..."
                value={reportFilters.q}
                onChange={(e) => setReportFilters({ ...reportFilters, q: e.target.value })}
              />
              <select
                value={reportFilters.status}
                onChange={(e) => setReportFilters({ ...reportFilters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button
                className="primary"
                type="button"
                onClick={() => fetchReports({ page: 1 })}
                disabled={reportBusy}
              >
                {reportBusy ? "Loading..." : "Search"}
              </button>
            </div>

            <div className="admin-subhead">
              <div className="muted">
                Showing page {reportState.page} of {reportPages} ({reportState.total} total)
              </div>
              <div className="admin-pager">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => fetchReports({ page: Math.max(1, (reportState.page || 1) - 1) })}
                  disabled={reportBusy || (reportState.page || 1) <= 1}
                >
                  Prev
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => fetchReports({ page: Math.min(reportPages, (reportState.page || 1) + 1) })}
                  disabled={reportBusy || (reportState.page || 1) >= reportPages}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table" aria-label="Transaction reports">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {reportState.items.map((item) => (
                    <tr key={item.id}>
                      <td className="mono">{formatDate(item.created_at)}</td>
                      <td>{item.user_email}</td>
                      <td className="mono">{item.transaction_reference}</td>
                      <td>{typeLabel(item.tx_type)}</td>
                      <td>{String(item.category || "other").replaceAll("_", " ")}</td>
                      <td>
                        <span className={`pill ${statusKey(item.status)}`}>{statusLabel(item.status)}</span>
                      </td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                  {!reportBusy && reportState.items.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty">No reports found.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="admin-card-list" aria-label="Reports list (mobile)">
                {reportState.items.map((item) => (
                  <div key={item.id} className="list-card">
                    <div>
                      <div className="list-title">{item.user_email}</div>
                      <div className="muted">{item.transaction_reference}</div>
                      <div className="muted">{String(item.category || "other").replaceAll("_", " ")}</div>
                    </div>
                    <div className="list-meta">
                      <span className={`pill ${statusKey(item.status)}`}>{statusLabel(item.status)}</span>
                    </div>
                  </div>
                ))}
                {!reportBusy && reportState.items.length === 0 && <div className="empty">No reports found.</div>}
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
                Service Type
                <select
                  value={pricingForm.tx_type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    const defaults = SERVICE_PROVIDER_OPTIONS[nextType] || [];
                    setPricingForm({
                      ...pricingForm,
                      tx_type: nextType,
                      provider: defaults[0] || "",
                    });
                  }}
                >
                  <option value="data">Data</option>
                  <option value="airtime">Airtime</option>
                  <option value="cable">Cable</option>
                  <option value="electricity">Electricity</option>
                  <option value="exam">Exam</option>
                </select>
              </label>
              <label>
                Provider / Network
                {Array.isArray(SERVICE_PROVIDER_OPTIONS[pricingForm.tx_type]) &&
                SERVICE_PROVIDER_OPTIONS[pricingForm.tx_type].length > 0 ? (
                  <select
                    value={pricingForm.provider}
                    onChange={(e) => setPricingForm({ ...pricingForm, provider: e.target.value })}
                  >
                    {SERVICE_PROVIDER_OPTIONS[pricingForm.tx_type].map((item) => (
                      <option key={item} value={item}>
                        {String(item).toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={pricingForm.provider}
                    onChange={(e) => setPricingForm({ ...pricingForm, provider: e.target.value })}
                  />
                )}
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
              Tip: margin applies to user charge amount (base amount + margin). Reseller pricing stays disabled.
            </div>
            <div className="section-head" style={{ marginTop: 16 }}>
              <h3>Configured Rules</h3>
              <button className="ghost" type="button" onClick={fetchPricingRules} disabled={pricingLoadBusy}>
                {pricingLoadBusy ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table" aria-label="Pricing rules">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Provider</th>
                    <th>Role</th>
                    <th>Margin</th>
                    <th>Key</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRules
                    .filter((r) => String(r.role || "").toLowerCase() === "user")
                    .map((rule) => (
                      <tr key={rule.id}>
                        <td>{typeLabel(rule.tx_type)}</td>
                        <td>{rule.provider || rule.network}</td>
                        <td>{String(rule.role || "").toUpperCase()}</td>
                        <td className="mono">₦ {formatMoney(rule.margin)}</td>
                        <td className="mono">{rule.network}</td>
                      </tr>
                    ))}
                  {!pricingLoadBusy &&
                    pricingRules.filter((r) => String(r.role || "").toLowerCase() === "user").length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty">No pricing rules yet.</div>
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
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

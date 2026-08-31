import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../services/api";
import { useToast } from "../context/toast.jsx";
import Button from "../components/ui/Button.jsx";

const formatMoney = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (isoString) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
};

export default function Agent() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [referrals, setReferrals] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const data = await apiFetch("/agent/dashboard");
        setDashboard(data);
      } else if (activeTab === "offers") {
        const data = await apiFetch("/agent/campaigns");
        setCampaigns(Array.isArray(data) ? data : []);
      } else if (activeTab === "referrals") {
        const data = await apiFetch("/agent/referrals");
        setReferrals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      showToast(err.message || "Failed to load agent data", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaimReward = async (campaignId) => {
    try {
      await apiFetch("/agent/claim-reward", {
        method: "POST",
        body: JSON.stringify({ campaign_id: campaignId })
      });
      showToast("Reward claimed successfully! Wallet credited.", "success");
      fetchData(); // Refresh campaigns
    } catch (err) {
      showToast(err.message || "Failed to claim reward", "error");
    }
  };

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', overflowX: 'auto' }}>
      {["dashboard", "offers", "referrals"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            padding: '1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === tab ? 'bold' : 'normal',
            cursor: 'pointer',
            textTransform: 'capitalize',
            whiteSpace: 'nowrap'
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderDashboard = () => {
    if (loading) return <div className="card"><div className="muted">Loading dashboard...</div></div>;
    if (!dashboard) return <div className="card"><div className="muted">No data available.</div></div>;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div className="muted">Wallet Balance</div>
          <h2>₦ {formatMoney(dashboard.wallet_balance)}</h2>
        </div>
        <div className="card">
          <div className="muted">Total Data Sold</div>
          <h2>{dashboard.total_data_gb?.toFixed(2) || 0} GB</h2>
        </div>
        <div className="card">
          <div className="muted">Total Airtime Sold</div>
          <h2>₦ {formatMoney(dashboard.total_airtime_sold)}</h2>
        </div>
        <div className="card">
          <div className="muted">Total Referrals</div>
          <h2>{dashboard.total_referrals || 0}</h2>
        </div>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>Performance Summary</h3>
          <p className="muted">Current Level: {dashboard.level || "Starter"}</p>
          <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Progress to Next Level</span>
              <span>{dashboard.level_progress || 0}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${dashboard.level_progress || 0}%`, background: 'var(--primary)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOffers = () => {
    if (loading) return <div className="card"><div className="muted">Loading offers...</div></div>;
    if (campaigns.length === 0) return <div className="card"><div className="muted">No active campaigns at the moment.</div></div>;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {campaigns.map((camp) => {
          const isQualified = camp.progress >= camp.target;
          const isClaimed = camp.status === 'claimed';
          return (
            <div key={camp.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{camp.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{camp.description}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  ₦ {formatMoney(camp.reward_amount)}
                </div>
                {isClaimed ? (
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓ Claimed</span>
                ) : (
                  <Button 
                    onClick={() => handleClaimReward(camp.id)} 
                    disabled={!isQualified}
                  >
                    {isQualified ? "Claim Reward" : "Not Qualified"}
                  </Button>
                )}
              </div>
              {!isClaimed && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span className="muted">Progress</span>
                    <span>{camp.progress} / {camp.target}</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (camp.progress / camp.target) * 100)}%`, background: isQualified ? 'var(--success)' : 'var(--primary)' }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderReferrals = () => {
    if (loading) return <div className="card"><div className="muted">Loading referrals...</div></div>;
    if (referrals.length === 0) return <div className="card"><div className="muted">You haven't referred anyone yet.</div></div>;

    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
          <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Name</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Date Joined</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Status</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((ref) => (
              <tr key={ref.id}>
                <td style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>{ref.name}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-muted)' }}>{formatDate(ref.joined_at)}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '999px', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    background: ref.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: ref.status === 'active' ? 'var(--success)' : 'var(--warning)'
                  }}>
                    {ref.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', fontWeight: '500' }}>
                  ₦ {formatMoney(ref.total_revenue || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Agent Dashboard</h1>
        <Button onClick={fetchData} disabled={loading} style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      
      {renderTabs()}

      <div style={{ minHeight: '300px' }}>
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "offers" && renderOffers()}
        {activeTab === "referrals" && renderReferrals()}
      </div>
    </section>
  );
}

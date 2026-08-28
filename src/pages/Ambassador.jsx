import { useEffect, useState } from "react";
import { apiFetch, getProfile } from "../services/api";
import { useToast } from "../context/toast.jsx";
import { Navigate } from "react-router-dom";

const formatMoney = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Ambassador() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const toast = useToast();
  
  const profile = getProfile() || {};
  const isAmbassador = profile.role === "ambassador" || profile.role === "admin";

  useEffect(() => {
    if (!isAmbassador) return;
    
    let mounted = true;
    const fetchReferrals = async () => {
      try {
        const data = await apiFetch("/api/v1/agent/referrals");
        if (mounted) setReferrals(data);
      } catch (err) {
        if (mounted) toast.show(err.message || "Failed to load referrals", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchReferrals();
    return () => { mounted = false; };
  }, [isAmbassador, toast]);

  if (!isAmbassador) {
    return <Navigate to="/" replace />;
  }

  const totalReferrals = referrals.length;
  const totalVolumeGB = referrals.reduce((acc, ref) => acc + (ref.accumulated_gb || 0), 0);
  
  const milestoneCount = referrals.filter(r => r.is_50gb_milestone_reached).length;
  const milestonePaidCount = referrals.filter(r => r.is_milestone_bonus_paid).length;

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Ambassador Hub</h1>
          <p className="page-subtitle">Track your referred vendors and milestone rewards.</p>
        </div>
      </header>

      <div className="dash-grid" style={{ marginBottom: '24px' }}>
        <div className="dash-card stat-card" style={{ '--accent': 'var(--primary)' }}>
          <div className="stat-icon">👥</div>
          <div className="stat-val">{totalReferrals}</div>
          <div className="stat-label">Total Referred Vendors</div>
        </div>
        <div className="dash-card stat-card" style={{ '--accent': '#10b981' }}>
          <div className="stat-icon">📊</div>
          <div className="stat-val">{totalVolumeGB.toFixed(2)} GB</div>
          <div className="stat-label">Total Data Volume Sold</div>
        </div>
        <div className="dash-card stat-card" style={{ '--accent': '#f59e0b' }}>
          <div className="stat-icon">🏆</div>
          <div className="stat-val">{milestoneCount - milestonePaidCount}</div>
          <div className="stat-label">Pending Milestone Payouts</div>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Your Vendors</h2>
        {loading ? (
          <div className="loading-spinner">Loading vendors...</div>
        ) : referrals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <h3>No vendors referred yet</h3>
            <p>Start referring vendors to earn 10% commission on their first deposit and a 50GB milestone bonus.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>First Deposit</th>
                  <th>10% Commission</th>
                  <th>Data Volume (GB)</th>
                  <th>50GB Milestone</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => (
                  <tr key={ref.id}>
                    <td>
                      <div className="td-primary">{ref.referred_user_name}</div>
                      <div className="td-secondary">ID: {ref.id}</div>
                    </td>
                    <td>
                      {ref.first_deposit_amount ? `₦${formatMoney(ref.first_deposit_amount)}` : "Pending"}
                    </td>
                    <td>
                      {ref.is_ten_percent_paid ? (
                        <span className="badge success">Paid</span>
                      ) : ref.first_deposit_amount ? (
                        <span className="badge warning">Pending Payment</span>
                      ) : (
                        <span className="badge neutral">Awaiting Deposit</span>
                      )}
                    </td>
                    <td>
                      <strong>{(ref.accumulated_gb || 0).toFixed(2)}</strong> GB
                    </td>
                    <td>
                      {ref.is_milestone_bonus_paid ? (
                        <span className="badge success">Bonus Paid</span>
                      ) : ref.is_50gb_milestone_reached ? (
                        <span className="badge warning">Reached (Pending Payout)</span>
                      ) : (
                        <div className="progress-cell">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${Math.min(100, ((ref.accumulated_gb || 0) / 50) * 100)}%` }} 
                            />
                          </div>
                          <span className="progress-text">
                            {Math.min(100, (((ref.accumulated_gb || 0) / 50) * 100)).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      {new Date(ref.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

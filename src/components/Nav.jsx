import { NavLink } from "react-router-dom";

export default function Nav({ onLogout }) {
  return (
    <aside className="nav">
      <div className="brand">
        <div className="brand-mark">VTU</div>
        <div>
          <div className="brand-title">NairaConnect</div>
          <div className="brand-sub">SaaS VTU Platform</div>
        </div>
      </div>
      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/wallet">Wallet</NavLink>
        <NavLink to="/data">Data</NavLink>
        <NavLink to="/transactions">Transactions</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>
      <button className="ghost" onClick={onLogout}>Logout</button>
    </aside>
  );
}

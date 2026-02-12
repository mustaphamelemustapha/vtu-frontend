import { NavLink } from "react-router-dom";

const Icon = ({ children }) => (
  <span className="icon" aria-hidden="true">{children}</span>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 7h15a1 1 0 0 1 1 1v3h-6a2 2 0 0 0 0 4h6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M14 13h6" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const DataIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 18c0-4 4-8 8-8s8 4 8 8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6 18c0-3 3-6 6-6s6 3 6 6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 18c0-2 1.5-3.5 3-3.5S15 16 15 18" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const TxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 7h16M4 12h10M4 17h13" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 3l8 3v6c0 4.4-3 7.7-8 9-5-1.3-8-4.6-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default function Nav({ onLogout }) {
  return (
    <>
    <aside className="nav">
      <div className="brand">
        <div className="brand-mark">AV</div>
        <div>
          <div className="brand-title">AxisVTU</div>
          <div className="brand-sub">VTU Platform</div>
        </div>
      </div>
      <nav>
        <NavLink to="/" end><Icon><HomeIcon /></Icon>Dashboard</NavLink>
        <NavLink to="/wallet"><Icon><WalletIcon /></Icon>Wallet</NavLink>
        <NavLink to="/data"><Icon><DataIcon /></Icon>Buy Data</NavLink>
        <NavLink to="/transactions"><Icon><TxIcon /></Icon>Transactions</NavLink>
        <NavLink to="/admin"><Icon><AdminIcon /></Icon>Admin</NavLink>
      </nav>
      <button className="ghost" onClick={onLogout}>Logout</button>
    </aside>
    <nav className="bottom-nav">
      <NavLink to="/" end><Icon><HomeIcon /></Icon><span>Home</span></NavLink>
      <NavLink to="/wallet"><Icon><WalletIcon /></Icon><span>Wallet</span></NavLink>
      <NavLink to="/data"><Icon><DataIcon /></Icon><span>Data</span></NavLink>
      <NavLink to="/transactions"><Icon><TxIcon /></Icon><span>History</span></NavLink>
    </nav>
    </>
  );
}

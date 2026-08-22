import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PIPs from './pages/PIPs';
import Quality from './pages/Quality';
import Leaderboard from './pages/Leaderboard';
import Export from './pages/Export';
import Settings from './pages/Settings';
import { ProtectedRoute } from './components/ProtectedRoute';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/people', label: 'People' },
  { to: '/pips', label: 'PIPs' },
  { to: '/quality', label: 'Quality' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/export', label: 'Export' },
  { to: '/settings', label: 'Settings' }
];

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand" aria-label="Excevo logo">
          <svg className="brand-logo" viewBox="0 0 520 120" role="img" aria-label="EXCEVO logo">
            <defs>
              <linearGradient id="brandGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#68d4ff" />
                <stop offset="55%" stopColor="#5a8df8" />
                <stop offset="100%" stopColor="#8d5af4" />
              </linearGradient>
              <linearGradient id="brandGradientSoft" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>

            <g transform="translate(0 0)">
              <circle cx="54" cy="60" r="38" fill="url(#brandGradient)" opacity="0.92" />
              <circle cx="54" cy="60" r="18" fill="#0f172a" opacity="0.7" />
              <circle cx="54" cy="60" r="30" fill="none" stroke="url(#brandGradientSoft)" strokeWidth="4" opacity="0.8" />
              <path d="M42 40 Q54 22 66 40" fill="none" stroke="url(#brandGradientSoft)" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
              <path d="M42 80 Q54 98 66 80" fill="none" stroke="url(#brandGradientSoft)" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
              <path d="M30 54 L22 40" stroke="url(#brandGradientSoft)" strokeWidth="5" strokeLinecap="round" />
              <path d="M30 66 L22 80" stroke="url(#brandGradientSoft)" strokeWidth="5" strokeLinecap="round" />
              <path d="M78 54 L86 40" stroke="url(#brandGradientSoft)" strokeWidth="5" strokeLinecap="round" />
              <path d="M78 66 L86 80" stroke="url(#brandGradientSoft)" strokeWidth="5" strokeLinecap="round" />
              <circle cx="22" cy="40" r="6" fill="#6bd3ff" />
              <circle cx="22" cy="80" r="6" fill="#8a5ef2" />
              <circle cx="86" cy="40" r="6" fill="#6bd3ff" />
              <circle cx="86" cy="80" r="6" fill="#8a5ef2" />
              <text x="54" y="68" textAnchor="middle" fontSize="34" fontWeight="800" fill="#f8fafc" fontFamily="Arial, Helvetica, sans-serif">E</text>
            </g>

            <text x="120" y="70" fontSize="58" fontWeight="800" letterSpacing="1.5" fill="#f8fafc" fontFamily="Arial, Helvetica, sans-serif">EXCEVO</text>
          </svg>
        </div>
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </aside>

      <main className="main">
        <header className="topbar">
          <div />
          <div className="topbar-user">
            <div className="user-profile">
              <div className="user-avatar">
                {user?.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className="user-email">{user?.email}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Routes>
      <Route path="*" element={<Login />} />
    </Routes>;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
        <Route path="/pips" element={<ProtectedRoute><PIPs /></ProtectedRoute>} />
        <Route path="/quality" element={<ProtectedRoute><Quality /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
}

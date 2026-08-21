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
        <div className="brand">Excevo</div>
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar-footer">
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
      </aside>
      <main className="main">{children}</main>
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

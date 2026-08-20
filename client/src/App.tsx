import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PIPs from './pages/PIPs';
import Quality from './pages/Quality';
import Leaderboard from './pages/Leaderboard';
import Export from './pages/Export';
import Settings from './pages/Settings';

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
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Excevo</div>
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/people" element={<People />} />
        <Route path="/pips" element={<PIPs />} />
        <Route path="/quality" element={<Quality />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/export" element={<Export />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

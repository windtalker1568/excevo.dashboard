import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchJson } from '../api';
import type { DashboardData } from '../types';

const PIE_COLORS = ['#ef4444', '#22c55e'];

function formatNumber(n: number | null, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(digits);
}

function formatDateLabel(value: string) {
  if (!value) return 'Today';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ dateFrom: today, dateTo: today, teamLeader: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [teamLeaderOptions, setTeamLeaderOptions] = useState<string[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson('/api/filters/options')
      .then((options: { teamLeaders?: string[]; weeks?: string[] }) => {
        const nextWeeks = (options.weeks || []).slice().sort();
        setTeamLeaderOptions((options.teamLeaders || []).filter(Boolean));
        setWeeks(nextWeeks);
        if (!selectedWeek && nextWeeks.length) {
          setSelectedWeek(nextWeeks[nextWeeks.length - 1]);
        }
      })
      .catch(() => {
        setTeamLeaderOptions([]);
        setWeeks([]);
      });
  }, [selectedWeek]);

  useEffect(() => {
    if (!selectedWeek && weeks.length) {
      setSelectedWeek(weeks[weeks.length - 1]);
      return;
    }
    if (selectedWeek) {
      setFilters(prev => ({
        ...prev,
        dateFrom: addDays(selectedWeek, -180),
        dateTo: selectedWeek,
      }));
    }
  }, [selectedWeek, weeks]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.teamLeader) params.set('teamLeader', filters.teamLeader);
    fetchJson(`/api/dashboard?${params.toString()}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const trendData = useMemo(() => data?.ephSphTrend || [], [data]);
  const qualityTrend = useMemo(() => data?.qualityTrend || [], [data]);
  const lastUpdatedDate = selectedWeek || data?.recentQuality?.[0]?.weekCommencing || today;
  const pipData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'PIP', value: data.pipDistribution.pip },
      { name: 'No PIP', value: data.pipDistribution.noPip }
    ];
  }, [data]);

  return (
    <div>
      <div className="dashboard-header-row">
        <div className="dashboard-date-panel">
          <div className="dashboard-date-label">Current week</div>
          <select className="dashboard-week-select" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
            {weeks.map(week => <option key={week} value={week}>{formatDateLabel(week)}</option>)}
          </select>
        </div>
        <button
          type="button"
          className="advanced-filter-toggle"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          {showAdvancedFilters ? 'Hide advanced filter' : 'Advanced filter'}
        </button>
      </div>

      {showAdvancedFilters && (
        <div className="filters advanced-filters-panel">
          <div className="filter-group">
            <label>Date From</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
          </div>
          <div className="filter-group">
            <label>Date To</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
          </div>
          <div className="filter-group filter-group-wide">
            <label>By Team Leader</label>
            <select value={filters.teamLeader} onChange={e => setFilters({ ...filters, teamLeader: e.target.value })}>
              <option value="">All Team Leaders</option>
              {teamLeaderOptions.map(teamLeader => (
                <option key={teamLeader} value={teamLeader}>{teamLeader}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading && <div className="empty">Loading...</div>}
      {error && <div className="empty text-red">{error}</div>}

      {data && (
        <>
          <div className="card-grid">
            <div className="card"><h3>Total Advisors</h3><div className="value">{data.kpis.totalAdvisors}</div></div>
            <div className="card"><h3>Avg EPH</h3><div className="value text-green">{formatNumber(data.kpis.avgEph)}</div></div>
            <div className="card"><h3>Avg SPH</h3><div className="value text-purple">{formatNumber(data.kpis.avgSph)}</div></div>
            <div className="card"><h3>Avg True Score</h3><div className="value text-cyan">{formatNumber(data.kpis.avgTrueScore)}</div></div>
            <div className="card"><h3>Avg Potential Score</h3><div className="value text-orange">{formatNumber(data.kpis.avgPotentialScore)}</div></div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="section-title">EPH / SPH Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
                  <YAxis tick={{ fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
                  <Line type="monotone" dataKey="eph" stroke="#22c55e" name="EPH" dot={false} />
                  <Line type="monotone" dataKey="sph" stroke="#a855f7" name="SPH" dot={false} />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="section-title">Quality Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={qualityTrend}>
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fill: '#9ca3af' }} />
                  <YAxis tick={{ fill: '#9ca3af' }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
                  <Line type="monotone" dataKey="trueScore" stroke="#06b6d4" name="True Score" dot={false} />
                  <Line type="monotone" dataKey="potentialScore" stroke="#f97316" name="Potential Score" dot={false} />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="section-title">PIP Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pipData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {pipData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <h3 className="section-title">Recent Quality</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Week Commencing</th><th>Advisor</th><th>Team Leader</th><th>True Score</th><th>Potential Score</th></tr>
              </thead>
              <tbody>
                {data.recentQuality.length === 0 && <tr><td colSpan={5} className="empty">No recent quality records</td></tr>}
                {data.recentQuality.map((q, i) => (
                  <tr key={i}>
                    <td>{q.weekCommencing}</td>
                    <td>{q.advisor}</td>
                    <td>{q.teamLeader}</td>
                    <td className="text-cyan">{q.trueScore}</td>
                    <td className="text-orange">{q.potentialScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

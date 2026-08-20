import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchJson } from '../api';
import type { QualityRecord } from '../types';

function varianceClass(n: number | null | undefined) {
  if (n === null || n === undefined) return '';
  return n >= 0 ? 'text-green' : 'text-red';
}

export default function Quality() {
  const [teamLeader, setTeamLeader] = useState('');
  const [week, setWeek] = useState('');
  const [options, setOptions] = useState<{ teamLeaders: string[]; weeks: string[] }>({ teamLeaders: [], weeks: [] });
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson('/api/filters/options').then(setOptions).catch(() => setOptions({ teamLeaders: [], weeks: [] }));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (teamLeader) params.set('teamLeader', teamLeader);
    if (week) params.set('weekCommencing', week);
    Promise.all([
      fetchJson(`/api/quality?${params.toString()}`),
      fetchJson(`/api/quality/trend?teamLeader=${encodeURIComponent(teamLeader)}`)
    ])
      .then(([r, t]) => { setRecords(r); setTrend(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamLeader, week]);

  return (
    <div>
      <h1 className="page-title">Quality</h1>

      <div className="filters">
        <div className="filter-group">
          <label>Team Leader</label>
          <select value={teamLeader} onChange={e => setTeamLeader(e.target.value)}>
            <option value="">All Team Leaders</option>
            {options.teamLeaders.map(tl => <option key={tl} value={tl}>{tl}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Week</label>
          <select value={week} onChange={e => setWeek(e.target.value)}>
            <option value="">All Weeks</option>
            {options.weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Quality Trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend}>
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

      {loading && <div className="empty">Loading...</div>}
      {error && <div className="empty text-red">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Team Leader</th><th>Advisor</th><th>True Score</th><th>Potential Score</th>
              <th>Last Week True Score</th><th>Last Week Potential Score</th>
              <th>True Score Variance</th><th>Potential Score Variance</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan={8} className="empty">No quality records</td></tr>}
            {records.map((q, i) => (
              <tr key={i}>
                <td>{q.teamLeader}</td>
                <td>{q.advisor}</td>
                <td className="text-cyan">{q.trueScore}</td>
                <td className="text-orange">{q.potentialScore}</td>
                <td>{q.lastWeekTrueScore ?? '—'}</td>
                <td>{q.lastWeekPotentialScore ?? '—'}</td>
                <td className={varianceClass(q.trueScoreVariance)}>{q.trueScoreVariance === null || q.trueScoreVariance === undefined ? '—' : (q.trueScoreVariance > 0 ? '+' : '') + q.trueScoreVariance}</td>
                <td className={varianceClass(q.potentialScoreVariance)}>{q.potentialScoreVariance === null || q.potentialScoreVariance === undefined ? '—' : (q.potentialScoreVariance > 0 ? '+' : '') + q.potentialScoreVariance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

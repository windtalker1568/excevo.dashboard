import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchJson } from '../api';
import type { QualityRecord } from '../types';

function varianceClass(n: number | null | undefined) {
  if (n === null || n === undefined) return '';
  return n >= 0 ? 'text-green' : 'text-red';
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
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
    fetchJson('/api/filters/options')
      .then((result: { teamLeaders?: string[]; weeks?: string[] }) => {
        const teamLeaders = result.teamLeaders || [];
        const weeks = (result.weeks || []).slice().sort();
        setOptions({ teamLeaders, weeks });
        if (weeks.length) setWeek(weeks[weeks.length - 1]);
      })
      .catch(() => setOptions({ teamLeaders: [], weeks: [] }));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (teamLeader) params.set('teamLeader', teamLeader);

    Promise.all([
      fetchJson(`/api/quality?${params.toString()}`),
      fetchJson(`/api/quality/trend?teamLeader=${encodeURIComponent(teamLeader)}`)
    ])
      .then(([r, t]) => { setRecords(r); setTrend(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamLeader]);

  const priorWeek = useMemo(() => {
    if (!week || !options.weeks.length) return null;
    const currentIndex = options.weeks.indexOf(week);
    return currentIndex > 0 ? options.weeks[currentIndex - 1] : null;
  }, [week, options.weeks]);

  const summaryRows = useMemo(() => {
    const source = teamLeader
      ? records.filter(record => record.teamLeader === teamLeader)
      : records;

    const grouped = new Map<string, QualityRecord[]>();
    for (const record of source) {
      const key = teamLeader ? record.advisor : record.teamLeader;
      const current = grouped.get(key) || [];
      current.push(record);
      grouped.set(key, current);
    }

    return [...grouped.entries()].map(([label, rows]) => {
      const currentWeekRows = rows.filter(record => record.weekCommencing === week);
      const priorWeekRows = priorWeek ? rows.filter(record => record.weekCommencing === priorWeek) : [];
      const currentAverage = average(currentWeekRows.map(record => record.trueScore));
      const priorAverage = average(priorWeekRows.map(record => record.trueScore));
      return {
        label,
        currentAverage,
        priorAverage,
        variance: currentAverage !== null && priorAverage !== null ? currentAverage - priorAverage : null
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [records, priorWeek, teamLeader, week]);

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

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {teamLeader ? (
                  <>
                    <th>Advisor</th>
                    <th>Avg Quality Current Week</th>
                    <th>Avg Quality Prior Week</th>
                    <th>Quality Variance</th>
                  </>
                ) : (
                  <>
                    <th>Team Leader</th>
                    <th>Avg Quality Current Week</th>
                    <th>Avg Quality Prior Week</th>
                    <th>Quality Variance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {summaryRows.length === 0 && (
                <tr>
                  <td colSpan={teamLeader ? 4 : 4} className="empty">No quality records</td>
                </tr>
              )}
              {summaryRows.map((row, index) => (
                <tr key={`${row.label}-${index}`}>
                  <td>{row.label}</td>
                  <td className="text-cyan">{row.currentAverage === null ? '—' : row.currentAverage.toFixed(1)}</td>
                  <td>{row.priorAverage === null ? '—' : row.priorAverage.toFixed(1)}</td>
                  <td className={varianceClass(row.variance)}>
                    {row.variance === null ? '—' : `${row.variance >= 0 ? '+' : ''}${row.variance.toFixed(1)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

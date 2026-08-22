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
  const [advisor, setAdvisor] = useState('');
  const [week, setWeek] = useState('');
  const [options, setOptions] = useState<{ teamLeaders: string[]; weeks: string[]; advisors: string[] }>({ teamLeaders: [], weeks: [], advisors: [] });
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson('/api/filters/options')
      .then((result: { teamLeaders?: string[]; weeks?: string[]; advisors?: string[] }) => {
        const teamLeaders = (result.teamLeaders || []).filter((name): name is string => !!name && !!String(name).trim());
        const weeks = (result.weeks || []).slice().sort();
        const advisors = (result.advisors || []).filter((name): name is string => !!name && !!String(name).trim());
        setOptions({ teamLeaders, weeks, advisors });
        if (weeks.length && !week) setWeek(weeks[weeks.length - 1]);
      })
      .catch(() => setOptions({ teamLeaders: [], weeks: [], advisors: [] }));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (teamLeader) params.set('teamLeader', teamLeader);
    if (advisor) params.set('advisor', advisor);

    Promise.all([
      fetchJson(`/api/quality?${params.toString()}`),
      fetchJson(`/api/quality/trend?teamLeader=${encodeURIComponent(teamLeader)}`)
    ])
      .then(([r, t]) => { setRecords(r); setTrend(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamLeader, advisor]);

  const availableAdvisors = useMemo(() => {
    if (!teamLeader) return [];
    return Array.from(new Set((options.advisors || []).filter(advisorName => {
      const recordMatch = records.some(record => record.teamLeader === teamLeader && record.advisor === advisorName);
      return recordMatch;
    }))).sort((a, b) => a.localeCompare(b));
  }, [options.advisors, records, teamLeader]);

  useEffect(() => {
    if (teamLeader && advisor && !availableAdvisors.includes(advisor)) {
      setAdvisor('');
    }
  }, [advisor, availableAdvisors, teamLeader]);

  const priorWeek = useMemo(() => {
    if (!week || !options.weeks.length) return null;
    const currentIndex = options.weeks.indexOf(week);
    return currentIndex > 0 ? options.weeks[currentIndex - 1] : null;
  }, [week, options.weeks]);

  const summaryRows = useMemo(() => {
    const source = teamLeader
      ? records.filter(record => record.teamLeader === teamLeader)
      : records.filter(record => !!record.teamLeader && !!String(record.teamLeader).trim());

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
      const currentTrueAverage = average(currentWeekRows.map(record => record.trueScore));
      const currentPotentialAverage = average(currentWeekRows.map(record => record.potentialScore));
      const priorTrueAverage = average(priorWeekRows.map(record => record.trueScore));
      const priorPotentialAverage = average(priorWeekRows.map(record => record.potentialScore));
      return {
        label,
        currentTrueAverage,
        currentPotentialAverage,
        priorTrueAverage,
        priorPotentialAverage,
        varianceTrue: currentTrueAverage !== null && priorTrueAverage !== null ? currentTrueAverage - priorTrueAverage : null,
        variancePotential: currentPotentialAverage !== null && priorPotentialAverage !== null ? currentPotentialAverage - priorPotentialAverage : null
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [records, priorWeek, teamLeader, week]);

  return (
    <div>
      <h1 className="page-title">Quality</h1>

      <div className="filters">
        <div className="filter-group">
          <label>Team Leader</label>
          <select value={teamLeader} onChange={e => {
            setTeamLeader(e.target.value);
            setAdvisor('');
          }}>
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

        {teamLeader && (
          <div className="filter-group">
            <label>Advisor</label>
            <select value={advisor} onChange={e => setAdvisor(e.target.value)}>
              <option value="">All Advisors</option>
              {availableAdvisors.map(advisorName => <option key={advisorName} value={advisorName}>{advisorName}</option>)}
            </select>
          </div>
        )}

        {(teamLeader || advisor) && (
          <button type="button" className="btn btn-secondary" onClick={() => { setTeamLeader(''); setAdvisor(''); }}>Clear selection</button>
        )}
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
                    <th>Avg True Score Current Week</th>
                    <th>Avg True Score Prior Week</th>
                    <th>True Score Variance</th>
                    <th>Avg Potential Score Current Week</th>
                    <th>Avg Potential Score Prior Week</th>
                    <th>Potential Score Variance</th>
                  </>
                ) : (
                  <>
                    <th>Team Leader</th>
                    <th>Avg True Score Current Week</th>
                    <th>Avg True Score Prior Week</th>
                    <th>True Score Variance</th>
                    <th>Avg Potential Score Current Week</th>
                    <th>Avg Potential Score Prior Week</th>
                    <th>Potential Score Variance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {summaryRows.length === 0 && (
                <tr>
                  <td colSpan={teamLeader ? 7 : 7} className="empty">No quality records</td>
                </tr>
              )}
              {summaryRows.map((row, index) => (
                <tr key={`${row.label}-${index}`}>
                  <td>{row.label}</td>
                  <td className="text-cyan">{row.currentTrueAverage === null ? '—' : row.currentTrueAverage.toFixed(1)}</td>
                  <td>{row.priorTrueAverage === null ? '—' : row.priorTrueAverage.toFixed(1)}</td>
                  <td className={varianceClass(row.varianceTrue)}>
                    {row.varianceTrue === null ? '—' : `${row.varianceTrue >= 0 ? '+' : ''}${row.varianceTrue.toFixed(1)}`}
                  </td>
                  <td className="text-orange">{row.currentPotentialAverage === null ? '—' : row.currentPotentialAverage.toFixed(1)}</td>
                  <td>{row.priorPotentialAverage === null ? '—' : row.priorPotentialAverage.toFixed(1)}</td>
                  <td className={varianceClass(row.variancePotential)}>
                    {row.variancePotential === null ? '—' : `${row.variancePotential >= 0 ? '+' : ''}${row.variancePotential.toFixed(1)}`}
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

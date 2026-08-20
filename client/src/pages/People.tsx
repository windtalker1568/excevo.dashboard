import { useEffect, useState } from 'react';
import { fetchJson } from '../api';
import type { Person } from '../types';

function formatNumber(n: number | null, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(digits);
}

function varianceClass(n: number | null) {
  if (n === null || n === undefined) return '';
  return n >= 0 ? 'text-green' : 'text-red';
}

export default function People() {
  const [view, setView] = useState<'advisors' | 'teamLeaders'>('advisors');
  const [advisors, setAdvisors] = useState<Person[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchJson('/api/people/advisors'), fetchJson('/api/people/team-leaders')])
      .then(([a, t]) => { setAdvisors(a); setLeaders(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title">People</h1>
      <div className="toggle">
        <button className={view === 'advisors' ? 'active' : ''} onClick={() => setView('advisors')}>Advisors</button>
        <button className={view === 'teamLeaders' ? 'active' : ''} onClick={() => setView('teamLeaders')}>Team Leaders</button>
      </div>

      {loading && <div className="empty">Loading...</div>}
      {error && <div className="empty text-red">{error}</div>}

      {!loading && view === 'advisors' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Advisor</th><th>Team Leader</th><th>EPH</th><th>SPH</th>
                <th>Current Week True Score</th><th>Current Week Potential Score</th>
                <th>Prior Week True Score</th><th>Prior Week Potential Score</th>
                <th>True Score Variance</th><th>Potential Score Variance</th>
              </tr>
            </thead>
            <tbody>
              {advisors.length === 0 && <tr><td colSpan={10} className="empty">No people imported</td></tr>}
              {advisors.map((p, i) => (
                <tr key={i}>
                  <td>{p.advisor}</td>
                  <td>{p.teamLeader}</td>
                  <td className="text-green">{formatNumber(p.eph)}</td>
                  <td className="text-purple">{formatNumber(p.sph)}</td>
                  <td className="text-cyan">{p.currentWeekTrueScore ?? '—'}</td>
                  <td className="text-orange">{p.currentWeekPotentialScore ?? '—'}</td>
                  <td>{p.priorWeekTrueScore ?? '—'}</td>
                  <td>{p.priorWeekPotentialScore ?? '—'}</td>
                  <td className={varianceClass(p.trueScoreVariance)}>{p.trueScoreVariance === null ? '—' : (p.trueScoreVariance > 0 ? '+' : '') + p.trueScoreVariance}</td>
                  <td className={varianceClass(p.potentialScoreVariance)}>{p.potentialScoreVariance === null ? '—' : (p.potentialScoreVariance > 0 ? '+' : '') + p.potentialScoreVariance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && view === 'teamLeaders' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Team Leader</th><th>Avg Quality Current Week</th><th>Avg Quality Prior Week</th><th>Quality Variance</th><th>Avg EPH</th><th>Avg SPH</th></tr>
            </thead>
            <tbody>
              {leaders.length === 0 && <tr><td colSpan={6} className="empty">No team leaders</td></tr>}
              {leaders.map((l, i) => (
                <tr key={i}>
                  <td>{l.teamLeader}</td>
                  <td className="text-cyan">{formatNumber(l.avgQualityCurrentWeek)}</td>
                  <td>{formatNumber(l.avgQualityPriorWeek)}</td>
                  <td className={varianceClass(l.qualityVariance)}>{l.qualityVariance === null ? '—' : (l.qualityVariance > 0 ? '+' : '') + l.qualityVariance.toFixed(1)}</td>
                  <td className="text-green">{formatNumber(l.avgEph)}</td>
                  <td className="text-purple">{formatNumber(l.avgSph)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

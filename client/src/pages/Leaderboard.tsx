import { useEffect, useState } from 'react';
import { fetchJson } from '../api';

function formatNumber(n: number | null, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(digits);
}

export default function Leaderboard() {
  const [week, setWeek] = useState('');
  const [weeks, setWeeks] = useState<string[]>([]);
  const [data, setData] = useState<any>({ week: null, bestEph: [], bestSph: [], highestQuality: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson('/api/quality/weeks')
      .then((availableWeeks: string[]) => {
        const sortedWeeks = [...availableWeeks].sort();
        setWeeks(sortedWeeks);
        if (sortedWeeks.length > 0 && !week) {
          setWeek(sortedWeeks[sortedWeeks.length - 1]);
        }
      })
      .catch(() => setWeeks([]));
  }, []);

  useEffect(() => {
    if (!week && weeks.length > 0) {
      setWeek(weeks[weeks.length - 1]);
      return;
    }

    setLoading(true);
    setError(null);
    const params = week ? `?week=${encodeURIComponent(week)}` : '';
    fetchJson(`/api/leaderboard${params}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [week, weeks]);

  return (
    <div>
      <h1 className="page-title">Leaderboard</h1>
      <div className="filters" style={{ alignItems: 'center' }}>
        <div className="filter-group">
          <label>Week</label>
          <select value={week} onChange={e => setWeek(e.target.value)}>
            <option value="">Select Week</option>
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="empty">Loading...</div>}
      {error && <div className="empty text-red">{error}</div>}

      <h3 className="section-title">Best EPH</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Rank</th><th>Advisor</th><th>Team Leader</th><th>EPH</th><th>Quality</th></tr></thead>
          <tbody>
            {data.bestEph.length === 0 && <tr><td colSpan={5} className="empty">No eligible advisors</td></tr>}
            {data.bestEph.map((x: any, i: number) => (
              <tr key={i}><td>{x.rank}</td><td>{x.advisor}</td><td>{x.teamLeader}</td><td className="text-green">{formatNumber(x.eph)}</td><td className="text-cyan">{x.quality}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Best SPH</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Rank</th><th>Advisor</th><th>Team Leader</th><th>SPH</th><th>Quality</th></tr></thead>
          <tbody>
            {data.bestSph.length === 0 && <tr><td colSpan={5} className="empty">No eligible advisors</td></tr>}
            {data.bestSph.map((x: any, i: number) => (
              <tr key={i}><td>{x.rank}</td><td>{x.advisor}</td><td>{x.teamLeader}</td><td className="text-purple">{formatNumber(x.sph)}</td><td className="text-cyan">{x.quality}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Highest Quality</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Rank</th><th>Advisor</th><th>Team Leader</th><th>True Score</th></tr></thead>
          <tbody>
            {data.highestQuality.length === 0 && <tr><td colSpan={4} className="empty">No quality data</td></tr>}
            {data.highestQuality.map((x: any, i: number) => (
              <tr key={i}><td>{x.rank}</td><td>{x.advisor}</td><td>{x.teamLeader}</td><td className="text-cyan">{x.trueScore}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

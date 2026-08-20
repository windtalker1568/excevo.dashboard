import { useEffect, useState } from 'react';
import { fetchJson, exportExcel } from '../api';

const dataTypes = ['people', 'efficiency', 'quality', 'pips', 'leaderboard'];

export default function Export() {
  const [type, setType] = useState('people');
  const [filters, setFilters] = useState<any>({ dateFrom: '', dateTo: '', weekCommencing: '', teamLeader: '', advisor: '' });
  const [options, setOptions] = useState<{ teamLeaders: string[]; advisors: string[]; weeks: string[] }>({ teamLeaders: [], advisors: [], weeks: [] });
  const [preview, setPreview] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson('/api/filters/options').then(setOptions).catch(() => setOptions({ teamLeaders: [], advisors: [], weeks: [] }));
  }, []);

  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, String(v));
    }
    try {
      const res = await fetchJson(`/api/export/preview/${type}?${params.toString()}`);
      setPreview(res.data);
      setCount(res.count);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, String(v));
    }
    exportExcel(`/api/export/${type}?${params.toString()}`);
  };

  const relevantFilters = () => {
    if (type === 'people' || type === 'pips') return ['teamLeader', 'advisor'];
    if (type === 'efficiency') return ['dateFrom', 'dateTo', 'teamLeader', 'advisor'];
    if (type === 'quality') return ['weekCommencing', 'teamLeader', 'advisor'];
    if (type === 'leaderboard') return ['weekCommencing'];
    return [];
  };

  return (
    <div>
      <h1 className="page-title">Export</h1>
      <div className="filters">
        <div className="filter-group">
          <label>Data Type</label>
          <select value={type} onChange={e => { setType(e.target.value); setPreview([]); setCount(0); }}>
            {dataTypes.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        {relevantFilters().includes('dateFrom') && (
          <div className="filter-group"><label>Date From</label><input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} /></div>
        )}
        {relevantFilters().includes('dateTo') && (
          <div className="filter-group"><label>Date To</label><input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} /></div>
        )}
        {relevantFilters().includes('weekCommencing') && (
          <div className="filter-group">
            <label>Week Commencing</label>
            <select value={filters.weekCommencing} onChange={e => setFilters({ ...filters, weekCommencing: e.target.value })}>
              <option value="">All Weeks</option>
              {options.weeks.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        )}
        {relevantFilters().includes('teamLeader') && (
          <div className="filter-group">
            <label>Team Leader</label>
            <select value={filters.teamLeader} onChange={e => setFilters({ ...filters, teamLeader: e.target.value })}>
              <option value="">All Team Leaders</option>
              {options.teamLeaders.map(tl => <option key={tl} value={tl}>{tl}</option>)}
            </select>
          </div>
        )}
        {relevantFilters().includes('advisor') && (
          <div className="filter-group">
            <label>Advisor</label>
            <select value={filters.advisor} onChange={e => setFilters({ ...filters, advisor: e.target.value })}>
              <option value="">All Advisors</option>
              {options.advisors.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
        <button className="btn" onClick={applyFilters} disabled={loading}>Apply Filters</button>
        <button className="btn btn-secondary" onClick={download} disabled={count === 0}>Export to Excel</button>
      </div>

      {loading && <div className="empty">Loading preview...</div>}
      {error && <div className="empty text-red">{error}</div>}
      {count > 0 && <div className="section-title">Preview ({count} matching records)</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {preview.length > 0 ? Object.keys(preview[0]).map(k => <th key={k}>{k}</th>) : <th>Preview</th>}
            </tr>
          </thead>
          <tbody>
            {preview.length === 0 && <tr><td className="empty">Apply filters to preview records</td></tr>}
            {preview.map((row, i) => (
              <tr key={i}>{Object.values(row).map((v: any, j) => <td key={j}>{v ?? '—'}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

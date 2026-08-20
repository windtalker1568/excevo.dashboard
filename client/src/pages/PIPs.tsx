import { useEffect, useState } from 'react';
import { fetchJson } from '../api';
import type { PipRecord } from '../types';

export default function PIPs() {
  const [records, setRecords] = useState<PipRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJson(`/api/pips?search=${encodeURIComponent(search)}`)
      .then(setRecords)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <h1 className="page-title">PIPs</h1>
      <input className="search" type="text" placeholder="Search advisor, team leader, or reason..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading && <div className="empty">Loading...</div>}
      {error && <div className="empty text-red">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Advisor</th><th>Team Leader</th><th>Date Added</th><th>Reason for PIP</th><th>PIP Weeks</th></tr>
          </thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan={5} className="empty">No PIP records</td></tr>}
            {records.map((p, i) => (
              <tr key={i}>
                <td>{p.advisor}</td>
                <td>{p.teamLeader}</td>
                <td>{p.dateAdded ?? '—'}</td>
                <td>{p.reason}</td>
                <td>{p.pipWeeks ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

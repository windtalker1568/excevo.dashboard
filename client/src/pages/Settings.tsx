import { useEffect, useRef, useState } from 'react';
import { fetchJson, postFile } from '../api';

interface ImportSummary {
  success: boolean;
  message: string;
  recordsFound: number;
  added: number;
  updated: number;
  unchanged: number;
  rejected: number;
  errors?: string[];
}

function ImportSection({ title, type, lastImport }: { title: string; type: string; lastImport?: any }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const onImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await postFile(`/api/import/${type}`, file);
      setSummary(res);
    } catch (e: any) {
      setSummary({ success: false, message: e.message, recordsFound: 0, added: 0, updated: 0, unchanged: 0, rejected: 0, errors: [e.message] });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    await fetchJson(`/api/refresh/${type}`, { method: 'POST' });
    setSummary({ success: true, message: `${title} refreshed`, recordsFound: 0, added: 0, updated: 0, unchanged: 0, rejected: 0 });
  };

  return (
    <div className="import-card">
      <h3>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Last import: {lastImport ? new Date(lastImport.timestamp).toLocaleString() : 'Never'}
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" />
        <button className="btn" onClick={onImport} disabled={loading}>{loading ? 'Importing...' : 'Import'}</button>
        <button className="btn btn-secondary" onClick={onRefresh}>Refresh {title}</button>
      </div>
      {summary && (
        <>
          <p style={{ marginTop: 16, fontWeight: 600, color: summary.success ? 'var(--green)' : 'var(--red)' }}>
            {summary.message}
          </p>
          <div className="import-meta">
            <div className="meta-item"><div className="label">Records Found</div><div className="number">{summary.recordsFound}</div></div>
            <div className="meta-item"><div className="label">Added</div><div className="number">{summary.added}</div></div>
            <div className="meta-item"><div className="label">Updated</div><div className="number">{summary.updated}</div></div>
            <div className="meta-item"><div className="label">Unchanged</div><div className="number">{summary.unchanged}</div></div>
            <div className="meta-item"><div className="label">Rejected</div><div className="number">{summary.rejected}</div></div>
          </div>
          {summary.errors && summary.errors.length > 0 && (
            <div className="text-red" style={{ marginTop: 12, fontSize: '0.85rem' }}>
              {summary.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Settings() {
  const [imports, setImports] = useState<any[]>([]);

  useEffect(() => {
    fetchJson('/api/imports').then(setImports).catch(() => setImports([]));
  }, []);

  const lastFor = (type: string) => imports.find(i => i.type === type);

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <ImportSection title="People" type="people" lastImport={lastFor('people')} />
      <ImportSection title="Quality" type="quality" lastImport={lastFor('quality')} />
      <ImportSection title="Efficiency" type="efficiency" lastImport={lastFor('efficiency')} />
      <ImportSection title="PIP" type="pip" lastImport={lastFor('pip')} />
    </div>
  );
}

import { useRef, useState } from 'react';
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

interface SectionResult extends ImportSummary {}

interface DataImportSummary {
  success: boolean;
  message: string;
  results?: {
    people?: SectionResult;
    efficiency?: SectionResult;
    quality?: SectionResult;
    pip?: SectionResult;
  };
}

interface SyncStatus {
  people: number;
  advisorsCount: number;
  quality: number;
  efficiency: number;
  pips: number;
}

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<DataImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const onImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await postFile('/api/import/data', file);
      setSummary(res);
    } catch (e: any) {
      setSummary({ success: false, message: e.message, results: {} });
    } finally {
      setLoading(false);
    }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await fetchJson('/api/sync');
      setSync(res);
    } catch (e: any) {
      setSync({ people: 0, advisorsCount: 0, quality: 0, efficiency: 0, pips: 0 });
    } finally {
      setSyncing(false);
    }
  };

  const sections = summary?.results ? Object.entries(summary.results) : [];

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <div className="import-card">
        <h3>Import Data</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Upload one Excel workbook with sheets for People, SPH_EPH, Quality and PIP. This will replace all existing data.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" />
          <button className="btn" onClick={onImport} disabled={loading}>{loading ? 'Importing...' : 'Import Data'}</button>
          <button className="btn btn-secondary" onClick={onSync} disabled={syncing}>{syncing ? 'Syncing...' : 'Sync Data'}</button>
        </div>
        {summary && (
          <>
            <p style={{ marginTop: 16, fontWeight: 600, color: summary.success ? 'var(--green)' : 'var(--red)' }}>
              {summary.message}
            </p>
            <div className="import-meta" style={{ marginTop: 12 }}>
              {sections.map(([type, result]) => (
                <div key={type} className="import-card" style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <h4 style={{ textTransform: 'capitalize', marginBottom: 8 }}>{type}</h4>
                  <div className="import-meta">
                    <div className="meta-item"><div className="label">Found</div><div className="number">{result.recordsFound}</div></div>
                    <div className="meta-item"><div className="label">Added</div><div className="number">{result.added}</div></div>
                    <div className="meta-item"><div className="label">Updated</div><div className="number">{result.updated}</div></div>
                    <div className="meta-item"><div className="label">Unchanged</div><div className="number">{result.unchanged}</div></div>
                    <div className="meta-item"><div className="label">Rejected</div><div className="number">{result.rejected}</div></div>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <div className="text-red" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                      {result.errors.slice(0, 3).map((e: string, i: number) => <div key={i}>{e}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {summary.message && !summary.results && (
              <p className="text-red" style={{ marginTop: 12 }}>{summary.message}</p>
            )}
          </>
        )}
        {sync && (
          <div className="import-meta" style={{ marginTop: 16 }}>
            <div className="meta-item"><div className="label">People</div><div className="number">{sync.people}</div></div>
            <div className="meta-item"><div className="label">Advisors</div><div className="number">{sync.advisorsCount}</div></div>
            <div className="meta-item"><div className="label">Efficiency Rows</div><div className="number">{sync.efficiency}</div></div>
            <div className="meta-item"><div className="label">Quality Rows</div><div className="number">{sync.quality}</div></div>
            <div className="meta-item"><div className="label">PIPs</div><div className="number">{sync.pips}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

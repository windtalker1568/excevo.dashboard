const API = (import.meta as any).env.PROD ? '' : 'http://localhost:3000';

export async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function postFile(path: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return fetchJson(path, { method: 'POST', body: form });
}

export async function exportExcel(path: string) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `excevo-export-${Date.now()}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

const API_BASE = '/api';

export async function getTableCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/tables`);
  const data = await res.json();
  return data.tables;
}

export async function setTableCount(tables: number): Promise<number> {
  const res = await fetch(`${API_BASE}/tables`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tables }),
  });
  const data = await res.json();
  return data.tables;
}

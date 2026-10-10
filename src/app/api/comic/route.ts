import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');
  const endpoint = searchParams.get('endpoint');

  const base = 'https://komiku-api.fly.dev/api/comic';
  let url = '';

  if (action === 'search') url = `${base}/search/${encodeURIComponent(query || '')}`;
  else if (action === 'info') url = `${base}/info${endpoint}`;
  else if (action === 'chapter') url = `${base}/chapter${endpoint}`;
  else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Gagal ambil data' }, { status: 500 });
  }
}

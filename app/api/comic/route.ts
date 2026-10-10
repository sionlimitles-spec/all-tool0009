import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');
  const endpoint = searchParams.get('endpoint');

  const baseUrl = 'https://komiku-api.fly.dev/api/comic';
  let url = '';

  // Menentukan URL tujuan berdasarkan action
  if (action === 'search') {
    url = `${baseUrl}/search/${encodeURIComponent(query || '')}`;
  } else if (action === 'info') {
    url = `${baseUrl}/info${endpoint}`;
  } else if (action === 'chapter') {
    url = `${baseUrl}/chapter${endpoint}`;
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Timeout 15 detik agar tidak menggantung
      signal: AbortSignal.timeout(15000) 
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data dari API komik' },
      { status: 500 }
    );
  }
}

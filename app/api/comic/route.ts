import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action'); // 'search' atau 'chapter'
  const query = searchParams.get('query');
  const endpoint = searchParams.get('endpoint');

  let url = '';
  const baseUrl = 'https://komiku-api.fly.dev/api/comic';

  if (action === 'search') {
    // Contoh: /api/comic?action=search&query=one punch
    url = `${baseUrl}/search/${encodeURIComponent(query || '')}`;
  } else if (action === 'chapter') {
    // Contoh: /api/comic?action=chapter&endpoint=/ch/hack-g-u-chapter-1/
    url = `${baseUrl}/chapter${endpoint}`;
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Tambahkan timeout jika perlu, misal 10 detik
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

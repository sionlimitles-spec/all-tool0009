// src/app/api/route.js

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchT(url, opts = {}, ms = 15000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: c.signal, cache: "no-store" });
    clearTimeout(t);
    return r;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

/* ============ TIKTOK (Server Alternatif) ============ */
async function tiktokDownload(url) {
  // Server alternatif yang lebih stabil
  const endpoints = [
    `https://api.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`,
    `https://tikdown.vercel.app/api/download?url=${encodeURIComponent(url)}`,
  ];

  for (const u of endpoints) {
    try {
      const r = await fetchT(u, { headers: { "User-Agent": UA } }, 14000);
      if (!r.ok) continue;
      const d = await r.json();

      // Normalisasi respons dari berbagai server
      let videoData = null;
      if (d.code === 0 && d.data) {
        videoData = d.data;
      } else if (d.video || d.data?.video) {
        videoData = d.data || d;
      }

      if (videoData) {
        return {
          title: videoData.title || "tiktok-video",
          author: videoData.author?.unique_id || videoData.author || "",
          nickname: videoData.author?.nickname || "",
          cover: videoData.origin_cover || videoData.cover || videoData.thumbnail,
          video: videoData.hdplay || videoData.play || videoData.video,
          noWm: videoData.play || videoData.video || videoData.hdplay,
          music: videoData.music || videoData.audio,
          duration: videoData.duration || 0,
          stats: {
            plays: videoData.play_count || 0,
            likes: videoData.digg_count || 0,
            comments: videoData.comment_count || 0,
            shares: videoData.share_count || 0,
          },
        };
      }
    } catch (e) {
      console.warn(`[TikTok] Server gagal: ${u}`, e.message);
      continue;
    }
  }
  return null;
}

/* ============ YOUTUBE (Server Alternatif) ============ */
function extractYtId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function youtubeDownload(url, mode = "video") {
  const vid = extractYtId(url);
  if (!vid) return { error: "URL YouTube tidak valid." };

  // Coba beberapa server API yang berbeda
  const servers = [
    `https://api.vevioz.com/api/button/mp3/${vid}`,
    `https://api.vevioz.com/api/button/mp4/${vid}`,
  ];

  for (const serverUrl of servers) {
    try {
      const r = await fetchT(serverUrl, { headers: { "User-Agent": UA } }, 15000);
      if (!r.ok) continue;
      const html = await r.text();

      // Ekstrak URL download dari HTML
      const match = html.match(/href="(https:\/\/[^"]+\.(mp4|mp3)[^"]*)"/);
      if (match && match[1]) {
        return {
          videoId: vid,
          downloadUrl: match[1].replace(/&amp;/g, "&"),
          title: `YouTube ${vid}`,
          thumbnail: `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
          mode,
        };
      }
    } catch (e) {
      console.warn(`[YouTube] Server gagal: ${serverUrl}`, e.message);
      continue;
    }
  }

  // Fallback terakhir: kembalikan thumbnail saja
  return {
    error: "Server downloader sibuk. Coba lagi 15-30 detik.",
    videoId: vid,
    thumbnail: `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
  };
}

/* ============ TEMP MAIL - Menggunakan temp-mail.lol ============ */
async function createTempMail() {
  const r = await fetchT("https://api.tempmail.lol/v2/inbox/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }, 10000);

  if (!r.ok) throw new Error("Gagal membuat email sementara.");
  const d = await r.json();
  return {
    email: d.address,
    token: d.token,
    provider: "tempmail.lol",
    expiresAt: Date.now() + 3600000, // 1 jam
  };
}

async function inboxTempMail(token) {
  if (!token) return [];
  const r = await fetchT(`https://api.tempmail.lol/v2/inbox?token=${encodeURIComponent(token)}`, {}, 10000);
  if (!r.ok) return [];
  const d = await r.json();
  return (d.emails || []).map((m) => ({
    id: m.id,
    from: { address: m.from, name: m.from },
    subject: m.subject,
    intro: m.subject,
    createdAt: new Date(m.date).toISOString(),
    seen: false,
  }));
}

async function readTempMail(token, id) {
  const emails = await inboxTempMail(token);
  const email = emails.find((e) => e.id === id);
  if (!email) throw new Error("Email tidak ditemukan.");
  return {
    subject: email.subject,
    from: { address: email.from.address, name: email.from.name },
    text: email.body || "",
    html: email.html ? [email.html] : [],
    createdAt: email.createdAt,
  };
}

/* ============ PROXY ============ */
async function proxyStream(targetUrl, request) {
  const rangeHeader = request.headers.get("range") || "";
  const headers = { "User-Agent": UA, Referer: targetUrl };
  if (rangeHeader) headers.Range = rangeHeader;

  const r = await fetchT(targetUrl, { headers }, 45000);
  if (!r.ok && r.status !== 206) throw new Error(`Upstream ${r.status}`);

  const outHeaders = new Headers();
  ["content-type", "content-length", "content-range", "accept-ranges"].forEach((k) => {
    const v = r.headers.get(k);
    if (v) outHeaders.set(k, v);
  });
  if (!outHeaders.has("content-type")) outHeaders.set("Content-Type", "application/octet-stream");
  outHeaders.set("Accept-Ranges", "bytes");
  outHeaders.set("Access-Control-Allow-Origin", "*");

  return new NextResponse(r.body, { status: r.status, headers: outHeaders });
}

/* ============ HANDLER ============ */
export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "tiktok") {
      if (!body.url || !/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(body.url)) {
        return NextResponse.json({ error: "URL TikTok tidak valid." }, { status: 400 });
      }
      const d = await tiktokDownload(body.url);
      if (!d) return NextResponse.json({ error: "Video tidak ditemukan atau privat." }, { status: 400 });
      return NextResponse.json(d);
    }

    if (action === "youtube") {
      const d = await youtubeDownload(body.url, body.mode || "video");
      if (d.error) return NextResponse.json(d, { status: d.videoId ? 503 : 400 });
      return NextResponse.json(d);
    }

    if (action === "tempmail-create") {
      try {
        const data = await createTempMail();
        return NextResponse.json(data);
      } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    if (action === "tempmail-inbox") {
      if (!body.token) return NextResponse.json([]);
      return NextResponse.json(await inboxTempMail(body.token));
    }

    if (action === "tempmail-read") {
      if (!body.token || !body.id) return NextResponse.json({ error: "Parameter kurang." }, { status: 400 });
      return NextResponse.json(await readTempMail(body.token, body.id));
    }

    if (action === "ip-lookup") {
      const target = body.ip ? `/${body.ip}` : "";
      const r = await fetchT(`https://ipapi.co${target}/json/`, {}, 8000);
      return NextResponse.json(await r.json());
    }

    if (action === "scan-url") {
      if (!body.url) return NextResponse.json({ error: "URL wajib." }, { status: 400 });
      const r = await fetchT("https://urlscan.io/api/v1/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: body.url, visibility: "public" }),
      }, 15000);
      const d = await r.json();
      return NextResponse.json(d);
    }

    if (action === "scan-url-result") {
      if (!body.id) return NextResponse.json({ error: "ID wajib." }, { status: 400 });
      const r = await fetchT(`https://urlscan.io/api/v1/result/${body.id}/`, {}, 10000);
      const d = await r.json();
      return NextResponse.json({
        verdicts: d.verdicts?.overall || null,
        score: d.verdicts?.overall?.score || 0,
        malicious: d.verdicts?.overall?.malicious || false,
        categories: d.verdicts?.overall?.categories || [],
        page: d.page || null,
      });
    }

    if (action === "scan-hash") {
      if (!body.hash) return NextResponse.json({ error: "Hash wajib." }, { status: 400 });
      const r = await fetchT("https://mb-api.abuse.ch/api/v1/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `query=get_info&hash=${body.hash}`,
      }, 12000);
      const d = await r.json();
      return NextResponse.json(d);
    }

    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (e) {
    console.error("[API]", e);
    return NextResponse.json({ error: e.message || "Kesalahan server." }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const proxyUrl = searchParams.get("url");
  if (proxyUrl) {
    try {
      return await proxyStream(proxyUrl, req);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, service: "AllTool API", version: "5.0" });
           }

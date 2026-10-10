import { NextResponse } from "next/server";

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
  } catch (e) { clearTimeout(t); throw e; }
}

/* ============ TIKTOK ============ */
async function tiktokDownload(url) {
  const endpoints = [
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
  ];
  for (const u of endpoints) {
    try {
      const r = await fetchT(u, { headers: { "User-Agent": UA } }, 14000);
      if (!r.ok) continue;
      const d = await r.json();
      if (d.code === 0 && d.data) {
        const v = d.data;
        return {
          title: v.title || "tiktok-video",
          author: v.author?.unique_id || "",
          nickname: v.author?.nickname || "",
          cover: v.origin_cover || v.cover,
          video: v.hdplay || v.play,
          noWm: v.play || v.hdplay,
          music: v.music,
          duration: v.duration || 0,
          stats: { plays: v.play_count || 0, likes: v.digg_count || 0, comments: v.comment_count || 0, shares: v.share_count || 0 },
        };
      }
    } catch { continue; }
  }
  return null;
}

/* ============ YOUTUBE ============ */
function extractYtId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function youtubeDownload(url, mode = "video") {
  const vid = extractYtId(url);
  if (!vid) return { error: "URL YouTube tidak valid." };

  const body = {
    url: `https://www.youtube.com/watch?v=${vid}`,
    vQuality: mode === "audio" ? "128" : "720",
    isAudioOnly: mode === "audio",
    aFormat: "mp3",
  };

  const instances = [
    "https://api.cobalt.tools/api/json",
    "https://co.wuk.sh/api/json",
    "https://cobalt-api.kwiatekmiki.com/api/json",
    "https://co.eepy.today/api/json",
  ];

  for (const inst of instances) {
    try {
      const r = await fetchT(inst, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      }, 12000);
      if (!r.ok) continue;
      const d = await r.json();
      const dlUrl = d.url || d.audio;
      if (dlUrl) {
        return {
          videoId: vid,
          downloadUrl: dlUrl,
          title: d.filename || `YouTube ${vid}`,
          thumbnail: `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
          mode,
        };
      }
    } catch { continue; }
  }

  return {
    error: "Server downloader sibuk. Coba lagi 15-30 detik.",
    videoId: vid,
    thumbnail: `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
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
  ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"].forEach((k) => {
    const v = r.headers.get(k);
    if (v) outHeaders.set(k, v);
  });
  if (!outHeaders.has("content-type")) outHeaders.set("Content-Type", "application/octet-stream");
  outHeaders.set("Accept-Ranges", "bytes");
  outHeaders.set("Access-Control-Allow-Origin", "*");
  outHeaders.set("Cache-Control", "no-store");

  return new NextResponse(r.body, { status: r.status, headers: outHeaders });
}

/* ============ TEMP MAIL (diperbaiki) ============ */
let lastTmCreate = 0;
let cachedDomains = null;
let domainsFetchedAt = 0;

async function getDomains() {
  const now = Date.now();
  if (cachedDomains && now - domainsFetchedAt < 60000) return cachedDomains;
  try {
    const r = await fetchT("https://api.mail.tm/domains?page=1", {}, 8000);
    const d = await r.json();
    cachedDomains = (d["hydra:member"] || []).map((x) => x.domain);
    domainsFetchedAt = now;
    return cachedDomains;
  } catch { return cachedDomains || []; }
}

async function createTempMail(attempt = 0) {
  // Rate limit lokal: maksimal 1x per 3 detik
  const now = Date.now();
  if (now - lastTmCreate < 3000) {
    await new Promise((r) => setTimeout(r, 3000 - (now - lastTmCreate)));
  }
  lastTmCreate = Date.now();

  const domains = await getDomains();
  if (!domains.length) {
    throw new Error("Layanan temp mail sedang down. Coba lagi nanti.");
  }

  // Shuffle domain biar tidak selalu pakai domain yang sama
  const shuffled = [...domains].sort(() => Math.random() - 0.5);
  const candidate = shuffled.slice(0, 5);

  for (const dom of candidate) {
    const email = `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}@${dom}`;
    const pw = Math.random().toString(36).slice(2, 16);

    try {
      const cr = await fetchT("https://api.mail.tm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: email, password: pw }),
      }, 10000);

      if (cr.status === 429) {
        // Rate limited, tunggu dan coba lagi
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      if (!cr.ok) continue;

      const tr = await fetchT("https://api.mail.tm/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: email, password: pw }),
      }, 10000);

      if (!tr.ok) continue;
      const td = await tr.json();
      if (!td.token) continue;

      return { email, password: pw, token: td.token, expiresAt: Date.now() + 7200000 };
    } catch { continue; }
  }

  // Kalau semua gagal, retry sekali lagi setelah delay
  if (attempt < 1) {
    await new Promise((r) => setTimeout(r, 3000));
    return createTempMail(attempt + 1);
  }

  throw new Error("Semua domain sibuk. Tunggu 10 detik lalu coba lagi.");
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
      try {
        const r = await fetchT("https://api.mail.tm/messages?page=1", {
          headers: { Authorization: `Bearer ${body.token}` },
        }, 10000);
        if (!r.ok) return NextResponse.json([]);
        const j = await r.json();
        return NextResponse.json(j["hydra:member"] || []);
      } catch { return NextResponse.json([]); }
    }

    if (action === "tempmail-read") {
      if (!body.token || !body.id) return NextResponse.json({ error: "Parameter kurang." }, { status: 400 });
      const r = await fetchT(`https://api.mail.tm/messages/${body.id}`, {
        headers: { Authorization: `Bearer ${body.token}` },
      }, 10000);
      return NextResponse.json(await r.json());
    }

    if (action === "ip-lookup") {
      const target = body.ip ? `/${body.ip}` : "";
      const r = await fetchT(`https://ipapi.co${target}/json/`, {}, 8000);
      return NextResponse.json(await r.json());
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
    try { return await proxyStream(proxyUrl, req); }
    catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }
  return NextResponse.json({ ok: true, service: "AllTool API", version: "3.0" });
        }

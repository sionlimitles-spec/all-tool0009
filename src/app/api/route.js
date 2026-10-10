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

/* ============ TEMP MAIL — 1secmail (PRIMARY, tanpa auth, sangat stabil) ============ */
async function createTempMail1sec() {
  const r = await fetchT("https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1", {}, 8000);
  if (!r.ok) throw new Error("Provider 1secmail tidak tersedia.");
  const arr = await r.json();
  if (!Array.isArray(arr) || !arr[0]) throw new Error("Gagal generate email.");
  const [login, domain] = arr[0].split("@");
  return {
    email: arr[0],
    login,
    domain,
    token: null,
    provider: "1secmail",
    expiresAt: Date.now() + 7200000,
  };
}

async function inbox1sec(login, domain) {
  const r = await fetchT(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`, {}, 10000);
  if (!r.ok) throw new Error("Gagal ambil inbox.");
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

async function read1sec(login, domain, id) {
  const r = await fetchT(`https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${id}`, {}, 10000);
  if (!r.ok) throw new Error("Gagal baca pesan.");
  return await r.json();
}

/* ============ TEMP MAIL — mail.tm (FALLBACK) ============ */
let lastTmCreate = 0;
let cachedDomains = null;
let domainsFetchedAt = 0;

async function getTmDomains() {
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

async function createTempMailTm() {
  const now = Date.now();
  if (now - lastTmCreate < 3000) await new Promise((r) => setTimeout(r, 3000 - (now - lastTmCreate)));
  lastTmCreate = Date.now();

  const domains = await getTmDomains();
  if (!domains.length) throw new Error("Provider mail.tm tidak tersedia.");

  const shuffled = [...domains].sort(() => Math.random() - 0.5);
  for (const dom of shuffled.slice(0, 5)) {
    const email = `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-3)}@${dom}`;
    const pw = Math.random().toString(36).slice(2, 16);
    try {
      const cr = await fetchT("https://api.mail.tm/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: email, password: pw }),
      }, 10000);
      if (cr.status === 429) { await new Promise((r) => setTimeout(r, 4000)); continue; }
      if (!cr.ok) continue;

      const tr = await fetchT("https://api.mail.tm/token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: email, password: pw }),
      }, 10000);
      if (!tr.ok) continue;
      const td = await tr.json();
      if (!td.token) continue;

      return { email, password: pw, token: td.token, provider: "mailtm", expiresAt: Date.now() + 7200000 };
    } catch { continue; }
  }
  throw new Error("mail.tm sibuk.");
}

/* ============ VIRUS SCANNER ============ */
// Cek URL berbahaya via VirusTotal public URL (tanpa API key - terbatas)
async function scanUrlVirusTotal(url) {
  // VT butuh API key. Pakai urlscan.io (free tier, tidak butuh key untuk submission publik) sebagai alternatif
  try {
    const r = await fetchT("https://urlscan.io/api/v1/scan/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ url, visibility: "public" }),
    }, 15000);

    if (!r.ok) {
      return { error: "Layanan scan sedang sibuk. Coba lagi 30 detik." };
    }
    const d = await r.json();
    return {
      scanId: d.uuid,
      resultUrl: d.result,
      apiUrl: d.api,
      message: "Scan berhasil dimulai. Hasil siap dalam ~15 detik.",
    };
  } catch (e) {
    return { error: "Gagal scan: " + e.message };
  }
}

async function getUrlScanResult(id) {
  try {
    const r = await fetchT(`https://urlscan.io/api/v1/result/${id}/`, { headers: { "User-Agent": UA } }, 10000);
    if (!r.ok) return { error: "Hasil belum siap." };
    const d = await r.json();
    return {
      verdicts: d.verdicts?.overall || null,
      score: d.verdicts?.overall?.score || 0,
      malicious: d.verdicts?.overall?.malicious || false,
      categories: d.verdicts?.overall?.categories || [],
      page: d.page || null,
      lists: d.lists || null,
      stats: d.stats || null,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// Cek hash file via VirusTotal (lookup hash publik, tanpa API key untuk hash yang ada)
async function scanHash(hash) {
  try {
    // VT v3 public endpoint untuk lookup hash (butuh API key, tapi ada endpoint publik untuk beberapa)
    // Fallback: gunakan MalwareBazaar (abuse.ch, no key)
    const r = await fetchT("https://mb-api.abuse.ch/api/v1/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `query=get_info&hash=${hash}`,
    }, 12000);
    const d = await r.json();
    if (d.query_status === "ok" && d.data && d.data.length > 0) {
      const info = d.data[0];
      return {
        found: true,
        malware: true,
        signature: info.signature || "Unknown",
        fileType: info.file_type || "Unknown",
        fileName: info.file_name || "Unknown",
        firstSeen: info.first_seen,
        tags: info.tags || [],
      };
    }
    return { found: false, message: "Hash tidak ditemukan di database malware. Kemungkinan aman." };
  } catch (e) {
    return { error: "Gagal lookup: " + e.message };
  }
}

/* ============ HANDLER ============ */
export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    /* ---- TIKTOK ---- */
    if (action === "tiktok") {
      if (!body.url || !/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(body.url)) {
        return NextResponse.json({ error: "URL TikTok tidak valid." }, { status: 400 });
      }
      const d = await tiktokDownload(body.url);
      if (!d) return NextResponse.json({ error: "Video tidak ditemukan atau privat." }, { status: 400 });
      return NextResponse.json(d);
    }

    /* ---- YOUTUBE ---- */
    if (action === "youtube") {
      const d = await youtubeDownload(body.url, body.mode || "video");
      if (d.error) return NextResponse.json(d, { status: d.videoId ? 503 : 400 });
      return NextResponse.json(d);
    }

    /* ---- TEMP MAIL: create ---- */
    if (action === "tempmail-create") {
      // Coba 1secmail dulu
      try {
        const d = await createTempMail1sec();
        return NextResponse.json(d);
      } catch (e1) {
        console.warn("[temp mail 1sec gagal]", e1.message);
        // Fallback ke mail.tm
        try {
          const d = await createTempMailTm();
          return NextResponse.json(d);
        } catch (e2) {
          return NextResponse.json({ error: "Semua provider sedang sibuk. Tunggu 10 detik lalu coba lagi." }, { status: 500 });
        }
      }
    }

    /* ---- TEMP MAIL: inbox ---- */
    if (action === "tempmail-inbox") {
      // 1secmail
      if (body.provider === "1secmail" && body.login && body.domain) {
        try {
          const msgs = await inbox1sec(body.login, body.domain);
          // Normalisasi format ke bentuk yang sama
          return NextResponse.json(msgs.map((m) => ({
            id: m.id,
            from: { address: m.from, name: m.from },
            subject: m.subject,
            intro: m.subject,
            createdAt: m.date,
            seen: false,
          })));
        } catch { return NextResponse.json([]); }
      }
      // mail.tm
      if (body.token) {
        try {
          const r = await fetchT("https://api.mail.tm/messages?page=1", {
            headers: { Authorization: `Bearer ${body.token}` },
          }, 10000);
          if (!r.ok) return NextResponse.json([]);
          const j = await r.json();
          return NextResponse.json(j["hydra:member"] || []);
        } catch { return NextResponse.json([]); }
      }
      return NextResponse.json([]);
    }

    /* ---- TEMP MAIL: read ---- */
    if (action === "tempmail-read") {
      // 1secmail
      if (body.provider === "1secmail" && body.login && body.domain && body.id) {
        try {
          const d = await read1sec(body.login, body.domain, body.id);
          return NextResponse.json({
            subject: d.subject,
            from: { address: d.from, name: d.from },
            text: d.textBody || d.body || "",
            html: d.htmlBody ? [d.htmlBody] : [],
            createdAt: d.date,
          });
        } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
      }
      // mail.tm
      if (body.token && body.id) {
        try {
          const r = await fetchT(`https://api.mail.tm/messages/${body.id}`, {
            headers: { Authorization: `Bearer ${body.token}` },
          }, 10000);
          return NextResponse.json(await r.json());
        } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
      }
      return NextResponse.json({ error: "Parameter kurang." }, { status: 400 });
    }

    /* ---- IP LOOKUP ---- */
    if (action === "ip-lookup") {
      const target = body.ip ? `/${body.ip}` : "";
      const r = await fetchT(`https://ipapi.co${target}/json/`, {}, 8000);
      return NextResponse.json(await r.json());
    }

    /* ---- VIRUS SCAN: URL ---- */
    if (action === "scan-url") {
      if (!body.url) return NextResponse.json({ error: "URL wajib." }, { status: 400 });
      const d = await scanUrlVirusTotal(body.url);
      return NextResponse.json(d);
    }

    if (action === "scan-url-result") {
      if (!body.id) return NextResponse.json({ error: "ID wajib." }, { status: 400 });
      const d = await getUrlScanResult(body.id);
      return NextResponse.json(d);
    }

    /* ---- VIRUS SCAN: File hash ---- */
    if (action === "scan-hash") {
      if (!body.hash) return NextResponse.json({ error: "Hash wajib." }, { status: 400 });
      const d = await scanHash(body.hash);
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
    try { return await proxyStream(proxyUrl, req); }
    catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }
  return NextResponse.json({ ok: true, service: "AllTool API", version: "4.0" });
}

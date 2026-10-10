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

/* ============ TIKTOK (1080p no watermark) ============ */
async function tiktokDownload(url) {
  try {
    const r = await fetchT(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
      headers: { "User-Agent": UA },
    }, 12000);
    if (r.ok) {
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
          hd: v.hdplay || v.play,
          music: v.music,
          duration: v.duration || 0,
          stats: {
            plays: v.play_count || 0,
            likes: v.digg_count || 0,
            comments: v.comment_count || 0,
            shares: v.share_count || 0,
          },
        };
      }
    }
  } catch (e) {
    console.warn("[TikTok]", e.message);
  }
  return null;
}

/* ============ YOUTUBE (up to 1080p) ============ */
function extractYtId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function youtubeDownload(url, mode = "video", quality = "1080") {
  const vid = extractYtId(url);
  if (!vid) return { error: "URL YouTube tidak valid." };

  const cleanUrl = `https://www.youtube.com/watch?v=${vid}`;

  // Server 1: btch-downloader dengan quality
  try {
    const r = await fetchT(`https://btch-downloader-api-green.vercel.app/api/download/aio?url=${encodeURIComponent(cleanUrl)}`, {}, 15000);
    if (r.ok) {
      const d = await r.json();
      const media = d.result || d.data || d;
      const downloadUrl =
        media.mp4 || media.video || media.url ||
        (media.medias && media.medias[0]?.url) ||
        (media.links && media.links[0]?.url);

      if (downloadUrl) {
        return {
          videoId: vid,
          downloadUrl,
          title: media.title || `YouTube ${vid}`,
          thumbnail: media.thumbnail || `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
          mode,
          quality,
        };
      }
    }
  } catch (e) {
    console.warn("[YouTube btch]", e.message);
  }

  // Server 2: cobalt dengan quality
  try {
    const r = await fetchT("https://cobalt-api.kwiatekmiki.com/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        url: cleanUrl,
        vQuality: quality,
        isAudioOnly: mode === "audio",
      }),
    }, 12000);
    if (r.ok) {
      const d = await r.json();
      if (d.url) {
        return {
          videoId: vid,
          downloadUrl: d.url,
          title: d.filename || `YouTube ${vid}`,
          thumbnail: `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
          mode,
          quality,
        };
      }
    }
  } catch (e) {
    console.warn("[YouTube cobalt]", e.message);
  }

  // Server 3: cobalt.tools official
  try {
    const r = await fetchT("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        url: cleanUrl,
        vQuality: quality,
        isAudioOnly: mode === "audio",
      }),
    }, 12000);
    if (r.ok) {
      const d = await r.json();
      if (d.url) {
        return {
          videoId: vid,
          downloadUrl: d.url,
          title: `YouTube ${vid}`,
          thumbnail: `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
          mode,
          quality,
        };
      }
    }
  } catch (e) {
    console.warn("[YouTube cobalt.tools]", e.message);
  }

  return {
    error: "Server YouTube downloader sedang down. Coba lagi 1-2 menit.",
    videoId: vid,
    thumbnail: `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
  };
}

/* ============ TEMP MAIL ============ */
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
    expiresAt: Date.now() + 3600000,
  };
}

async function inboxTempMail(token) {
  if (!token) return [];
  const r = await fetchT(`https://api.tempmail.lol/v2/inbox?token=${encodeURIComponent(token)}`, {}, 10000);
  if (!r.ok) return [];
  const d = await r.json();
  if (d.expired) return [];
  return (d.emails || []).map((m) => {
    let text = m.body || m.text || "";
    const html = m.html || "";
    if (!text && html) {
      text = String(html)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    return {
      id: String(m.id || m.date),
      from: { address: m.from, name: m.from },
      subject: m.subject || "(Tanpa subjek)",
      intro: text.slice(0, 100) || m.subject || "",
      text: text || "(Tidak ada isi teks)",
      html: html ? [html] : [],
      createdAt: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
      seen: false,
    };
  });
}

/* ============ PROXY ============ */
async function proxyStream(targetUrl, request) {
  const rangeHeader = request.headers.get("range") || "";
  const headers = { "User-Agent": UA, Referer: targetUrl };
  if (rangeHeader) headers.Range = rangeHeader;

  const r = await fetchT(targetUrl, { headers }, 45000);
  if (!r.ok && r.status !== 206) throw new Error(`Upstream error ${r.status}`);

  const outHeaders = new Headers();
  ["content-type", "content-length", "content-range", "accept-ranges"].forEach((k) => {
    const v = r.headers.get(k);
    if (v) outHeaders.set(k, v);
  });
  if (!outHeaders.has("content-type")) outHeaders.set("Content-Type", "application/octet-stream");
  outHeaders.set("Accept-Ranges", "bytes");
  outHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(r.body, { status: r.status, headers: outHeaders });
}

/* ============ AI CHAT (OpenRouter) ============ */
async function aiChat(messages, model, apiKey) {
  const r = await fetchT("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://alltool.vercel.app",
      "X-Title": "AllTool AI",
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  }, 30000);

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`OpenRouter error: ${r.status} - ${err.slice(0, 200)}`);
  }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

/* ============ APK COMPILER (Web2Droid x2y API) ============ */
async function apkGenerate(payload) {
  const API_BASE = process.env.WEB2DROID_API_URL || "https://web2droid-x2y-api.vercel.app";
  const r = await fetchT(`${API_BASE}/api/v1/generate-apk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 30000);
  if (!r.ok) throw new Error(`APK generate gagal: ${r.status}`);
  return await r.json();
}

async function apkStatus(jobId) {
  const API_BASE = process.env.WEB2DROID_API_URL || "https://web2droid-x2y-api.vercel.app";
  const r = await fetchT(`${API_BASE}/api/v1/job/${jobId}`, {}, 15000);
  if (!r.ok) throw new Error(`Status check gagal: ${r.status}`);
  return await r.json();
}

/* ============ TERABOX ============ */
async function teraboxDownload(url) {
  const r = await fetchT(`https://terabox-worker.robinkumarshakya103.workers.dev/api?url=${encodeURIComponent(url)}`, {}, 15000);
  if (!r.ok) throw new Error("Terabox API gagal.");
  const d = await r.json();
  if (!d.success || !d.files || d.files.length === 0) {
    throw new Error(d.error || "File tidak ditemukan.");
  }
  return {
    files: d.files.map((f) => ({
      name: f.file_name,
      size: f.size,
      download: f.download_url,
      stream: f.streaming_url,
      original: f.original_download_url,
      thumbnail: f.thumbnail || "",
    })),
  };
}

/* ============ KOMIK (Manga API) ============ */
async function mangaPopular(page = 1) {
  const r = await fetchT(`https://mangamint.kaedenoki.net/api/manga/popular/${page}`, {}, 10000);
  return await r.json();
}

async function mangaSearch(q) {
  const r = await fetchT(`https://mangamint.kaedenoki.net/api/search/${encodeURIComponent(q)}`, {}, 10000);
  return await r.json();
}

async function mangaDetail(endpoint) {
  const r = await fetchT(`https://mangamint.kaedenoki.net/api/manga/detail/${encodeURIComponent(endpoint)}`, {}, 10000);
  return await r.json();
}

async function mangaChapter(chapterEndpoint) {
  const r = await fetchT(`https://mangamint.kaedenoki.net/api/chapter/${encodeURIComponent(chapterEndpoint)}`, {}, 10000);
  return await r.json();
}

/* ============ MEDIA DOWNLOADER (multi-platform) ============ */
async function mediaDownload(url) {
  // Coba TikTok dulu
  if (/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(url)) {
    const d = await tiktokDownload(url);
    if (d) return { platform: "tiktok", ...d };
  }

  // Coba YouTube
  if (/youtube\.com|youtu\.be/i.test(url)) {
    const d = await youtubeDownload(url, "video", "1080");
    if (!d.error) return { platform: "youtube", ...d };
  }

  // Fallback: coba cobalt generic
  try {
    const r = await fetchT("https://cobalt-api.kwiatekmiki.com/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url, vQuality: "1080" }),
    }, 15000);
    if (r.ok) {
      const d = await r.json();
      if (d.url) {
        return {
          platform: "generic",
          downloadUrl: d.url,
          title: d.filename || "media",
          thumbnail: "",
        };
      }
    }
  } catch (e) {}

  throw new Error("Platform tidak didukung atau video tidak dapat diunduh.");
}

/* ============ HANDLER ============ */
export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    /* --- TIKTOK --- */
    if (action === "tiktok") {
      if (!body.url || !/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(body.url)) {
        return Response.json({ error: "URL TikTok tidak valid." }, { status: 400 });
      }
      const d = await tiktokDownload(body.url);
      if (!d) return Response.json({ error: "Gagal ambil video. Pastikan video publik." }, { status: 400 });
      return Response.json(d);
    }

    /* --- YOUTUBE --- */
    if (action === "youtube") {
      const d = await youtubeDownload(body.url, body.mode || "video", body.quality || "1080");
      if (d.error) return Response.json(d, { status: d.videoId ? 503 : 400 });
      return Response.json(d);
    }

    /* --- TEMP MAIL --- */
    if (action === "tempmail-create") {
      try {
        const data = await createTempMail();
        return Response.json(data);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    if (action === "tempmail-inbox") {
      if (!body.token) return Response.json([]);
      try {
        return Response.json(await inboxTempMail(body.token));
      } catch {
        return Response.json([]);
      }
    }

    /* --- AI CHAT --- */
    if (action === "ai-chat") {
      try {
        const { messages, model, apiKey } = body;
        const content = await aiChat(messages, model, apiKey);
        return Response.json({ content });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    /* --- APK GENERATE --- */
    if (action === "apk-generate") {
      try {
        const result = await apkGenerate(body.payload);
        return Response.json(result);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    /* --- APK STATUS --- */
    if (action === "apk-status") {
      try {
        const result = await apkStatus(body.jobId);
        return Response.json(result);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    /* --- TERABOX --- */
    if (action === "terabox") {
      try {
        const d = await teraboxDownload(body.url);
        return Response.json(d);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    /* --- KOMIK --- */
    if (action === "manga-popular") {
      try { return Response.json(await mangaPopular(body.page || 1)); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (action === "manga-search") {
      try { return Response.json(await mangaSearch(body.q)); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (action === "manga-detail") {
      try { return Response.json(await mangaDetail(body.endpoint)); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (action === "manga-chapter") {
      try { return Response.json(await mangaChapter(body.chapterEndpoint)); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    /* --- MEDIA DOWNLOADER --- */
    if (action === "media") {
      try {
        const d = await mediaDownload(body.url);
        return Response.json(d);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    /* --- IP LOOKUP --- */
    if (action === "ip-lookup") {
      const target = body.ip ? `/${body.ip}` : "";
      const r = await fetchT(`https://ipapi.co${target}/json/`, {}, 8000);
      return Response.json(await r.json());
    }

    /* --- VIRUS SCAN --- */
    if (action === "scan-url") {
      if (!body.url) return Response.json({ error: "URL wajib." }, { status: 400 });
      const r = await fetchT("https://urlscan.io/api/v1/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: body.url, visibility: "public" }),
      }, 12000);
      return Response.json(await r.json());
    }
    if (action === "scan-url-result") {
      if (!body.id) return Response.json({ error: "ID wajib." }, { status: 400 });
      const r = await fetchT(`https://urlscan.io/api/v1/result/${body.id}/`, {}, 10000);
      const d = await r.json();
      return Response.json({
        verdicts: d.verdicts?.overall || null,
        score: d.verdicts?.overall?.score || 0,
        malicious: d.verdicts?.overall?.malicious || false,
        categories: d.verdicts?.overall?.categories || [],
        page: d.page || null,
      });
    }
    if (action === "scan-hash") {
      if (!body.hash) return Response.json({ error: "Hash wajib." }, { status: 400 });
      const r = await fetchT("https://mb-api.abuse.ch/api/v1/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `query=get_info&hash=${body.hash}`,
      }, 12000);
      return Response.json(await r.json());
    }

    return Response.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (e) {
    console.error("[API Error]", e);
    return Response.json({ error: e.message || "Kesalahan server." }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const proxyUrl = searchParams.get("url");
  if (proxyUrl) {
    try {
      return await proxyStream(proxyUrl, req);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }
  return Response.json({
    ok: true,
    service: "AllTool API",
    version: "8.0",
    endpoints: [
      "tiktok", "youtube", "tempmail-create", "tempmail-inbox",
      "ai-chat", "apk-generate", "apk-status", "terabox",
      "manga-popular", "manga-search", "manga-detail", "manga-chapter",
      "media", "ip-lookup", "scan-url", "scan-url-result", "scan-hash",
    ],
  });
        }

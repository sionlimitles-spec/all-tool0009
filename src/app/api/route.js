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
  ];
  for (const u of endpoints) {
    try {
      const r = await fetchT(u, { headers: { "User-Agent": UA } }, 12000);
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
          hd: v.hdplay || v.play,
          music: v.music,
          duration: v.duration || 0,
          stats: { plays: v.play_count || 0, likes: v.digg_count || 0, comments: v.comment_count || 0, shares: v.share_count || 0 },
        };
      }
    } catch { continue; }
  }
  return null;
}

/* ============ YOUTUBE (Invidious + Fallback) ============ */
function extractYtId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be",
  "https://invidious.snopyta.org",
];

async function youtubeDownload(url, mode = "video", quality = "1080") {
  const vid = extractYtId(url);
  if (!vid) return { error: "URL YouTube tidak valid." };
  const thumb = `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`;

  // ===== INVIDIOUS (gratis, tanpa key) =====
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const r = await fetchT(`${inst}/api/v1/videos/${vid}`, { headers: { "User-Agent": UA } }, 15000);
      if (!r.ok) continue;
      const d = await r.json();
      if (d.error) continue;

      const title = d.title || `YouTube ${vid}`;
      const streams = mode === "audio" 
        ? (d.adaptiveFormats || []).filter((f) => f.type?.startsWith("audio"))
        : (d.formatStreams || []).concat(d.adaptiveFormats || []).filter((f) => f.type?.startsWith("video"));

      if (streams.length > 0) {
        // Pilih kualitas terbaik
        let picked = streams[0];
        if (mode === "video") {
          const qNum = parseInt(quality);
          const matching = streams.filter((f) => {
            const h = f.resolution || f.qualityLabel || "";
            return h.includes(`${qNum}p`) || h.includes(`${qNum}`);
          });
          if (matching.length > 0) picked = matching[0];
        } else {
          picked = streams.find((f) => f.bitrate > 100000) || streams[0];
        }

        const downloadUrl = picked.url?.startsWith("http") ? picked.url : `${inst}${picked.url}`;
        return {
          videoId: vid,
          downloadUrl,
          title,
          thumbnail: thumb,
          mode, quality,
        };
      }
    } catch { continue; }
  }

  // ===== FALLBACK: btch-downloader =====
  try {
    const r = await fetchT(`https://btch-downloader-api-green.vercel.app/api/download/aio?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vid}`)}`, {}, 15000);
    if (r.ok) {
      const d = await r.json();
      const media = d.result || d.data || d;
      const downloadUrl = media.mp4 || media.video || media.url || (media.medias && media.medias[0]?.url) || (media.links && media.links[0]?.url);
      if (downloadUrl) {
        return { videoId: vid, downloadUrl, title: media.title || `YouTube ${vid}`, thumbnail: media.thumbnail || thumb, mode, quality };
      }
    }
  } catch {}

  // ===== FALLBACK: cobalt =====
  const cobaltInstances = ["https://cobalt-api.kwiatekmiki.com/api/json", "https://api.cobalt.tools/api/json"];
  for (const inst of cobaltInstances) {
    try {
      const r = await fetchT(inst, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${vid}`, vQuality: quality, isAudioOnly: mode === "audio" }),
      }, 12000);
      if (r.ok) {
        const d = await r.json();
        if (d.url) {
          return { videoId: vid, downloadUrl: d.url, title: d.filename || `YouTube ${vid}`, thumbnail: thumb, mode, quality };
        }
      }
    } catch { continue; }
  }

  return { error: "Semua server YouTube sedang down. Coba lagi 1-2 menit.", videoId: vid, thumbnail: thumb };
}

/* ============ MEDIA DOWNLOADER (btch multi-platform) ============ */
async function mediaDownload(url) {
  // TikTok
  if (/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(url)) {
    const d = await tiktokDownload(url);
    if (d) return { platform: "tiktok", downloadUrl: d.hd || d.noWm, title: d.title, thumbnail: d.cover };
  }

  // YouTube
  if (/youtube\.com|youtu\.be/i.test(url)) {
    const d = await youtubeDownload(url, "video", "1080");
    if (!d.error) return { platform: "youtube", downloadUrl: d.downloadUrl, title: d.title, thumbnail: d.thumbnail };
  }

  // btch-downloader untuk platform lain (IG, FB, X, Pinterest, dll)
  try {
    const r = await fetchT(`https://btch-downloader-api-green.vercel.app/api/download/aio?url=${encodeURIComponent(url)}`, {}, 18000);
    if (r.ok) {
      const d = await r.json();
      if (d.success || d.status === "success" || d.result) {
        const media = d.result || d.data || d;
        const downloadUrl = media.mp4 || media.video || media.url || media.download || 
          (media.medias && media.medias[0]?.url) || 
          (media.links && media.links[0]?.url) ||
          (media.urls && media.urls[0]?.url);
        if (downloadUrl) {
          const platform = d.platform || detectPlatform(url);
          return {
            platform: platform,
            downloadUrl,
            title: media.title || media.caption || `${platform} media`,
            thumbnail: media.thumbnail || media.cover || media.image || "",
          };
        }
      }
    }
  } catch (e) {
    console.warn("[btch]", e.message);
  }

  // Cobalt fallback
  const cobaltInstances = ["https://cobalt-api.kwiatekmiki.com/api/json", "https://api.cobalt.tools/api/json", "https://co.wuk.sh/api/json"];
  for (const inst of cobaltInstances) {
    try {
      const r = await fetchT(inst, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url, vQuality: "1080" }),
      }, 15000);
      if (r.ok) {
        const d = await r.json();
        if (d.url) return { platform: "generic", downloadUrl: d.url, title: d.filename || "media", thumbnail: "" };
      }
    } catch { continue; }
  }

  throw new Error("Platform tidak didukung atau video private.");
}

function detectPlatform(url) {
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/facebook\.com|fb\.watch/i.test(url)) return "facebook";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  if (/pinterest\.com/i.test(url)) return "pinterest";
  if (/reddit\.com/i.test(url)) return "reddit";
  return "media";
}

/* ============ TEMP MAIL ============ */
async function createTempMail() {
  const r = await fetchT("https://api.tempmail.lol/v2/inbox/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }, 10000);
  if (!r.ok) throw new Error("Gagal membuat email.");
  const d = await r.json();
  return { email: d.address, token: d.token, provider: "tempmail.lol", expiresAt: Date.now() + 3600000 };
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
        .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n").trim();
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
async function proxyStream(targetUrl, request, forceDownload = false, customName = "") {
  const rangeHeader = request.headers.get("range") || "";
  const headers = { "User-Agent": UA, Accept: "*/*" };

  // Referer handling khusus per domain
  try {
    const host = new URL(targetUrl).hostname;
    if (host.includes("mangadex.org") || host.includes("mangadex.network")) {
      // MangaDex: hotlink protection return gambar salah kalau Referer ada. 
      // Referer kosong = return gambar asli
      headers.Referer = "";
    } else if (host.includes("youtube") || host.includes("googlevideo")) {
      headers.Referer = "https://www.youtube.com/";
      headers.Origin = "https://www.youtube.com";
    } else if (host.includes("tiktok")) {
      headers.Referer = "https://www.tiktok.com/";
    } else if (host.includes("instagram") || host.includes("cdninstagram")) {
      headers.Referer = "https://www.instagram.com/";
    } else {
      headers.Referer = targetUrl;
    }
  } catch {
    headers.Referer = "";
  }

  if (rangeHeader) headers.Range = rangeHeader;

  const r = await fetchT(targetUrl, { headers }, 45000);
  if (!r.ok && r.status !== 206) throw new Error(`Upstream ${r.status}`);

  const outHeaders = new Headers();
  ["content-type", "content-length", "content-range", "accept-ranges", "last-modified"].forEach((k) => {
    const v = r.headers.get(k);
    if (v) outHeaders.set(k, v);
  });
  if (!outHeaders.has("content-type")) outHeaders.set("Content-Type", "application/octet-stream");

  if (forceDownload) {
    let filename = customName;
    if (!filename) {
      try {
        const urlPath = new URL(targetUrl).pathname;
        const rawName = urlPath.split("/").pop() || "download";
        filename = decodeURIComponent(rawName.split("?")[0]) || "download";
      } catch { filename = "download"; }
    }
    filename = filename.replace(/[^\w\s.-]/g, "_").slice(0, 100);
    outHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
    outHeaders.set("Cache-Control", "no-store");
  } else {
    // Gambar: cache 1 hari
    outHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  }

  outHeaders.set("Accept-Ranges", "bytes");
  outHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(r.body, { status: r.status, headers: outHeaders });
}

/* ============ AI CHAT ============ */
async function aiChat(messages, model, provider, apiKey) {
  if (!apiKey) throw new Error(`API key ${provider} belum diatur. Buka Pengaturan AI untuk menambahkan.`);

  if (provider === "groq") {
    const r = await fetchT("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
    }, 45000);
    if (!r.ok) { const err = await r.text(); throw new Error(`Groq error (${r.status}): ${err.slice(0, 200)}`); }
    const d = await r.json();
    return d.choices?.[0]?.message?.content || "";
  }

  if (provider === "gemini") {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages.filter((m) => m.role !== "system");
    const contents = chatMsgs.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const body = { contents };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const r = await fetchT(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, 45000);
    if (!r.ok) { const err = await r.text(); throw new Error(`Gemini error (${r.status}): ${err.slice(0, 200)}`); }
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  if (provider === "openrouter") {
    const r = await fetchT("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://alltool.vercel.app", "X-Title": "AllTool AI" },
      body: JSON.stringify({ model, messages, max_tokens: 2048 }),
    }, 45000);
    if (!r.ok) { const err = await r.text(); throw new Error(`OpenRouter error (${r.status}): ${err.slice(0, 200)}`); }
    const d = await r.json();
    return d.choices?.[0]?.message?.content || "";
  }

  throw new Error("Provider tidak dikenal: " + provider);
}

/* ============ MANGA (MangaDex dengan proxy gambar) ============ */
const MD_BASE = "https://api.mangadex.org";
const MD_UA = "AllTool/11.0 (contact: alltool@example.com)";

function getCoverUrl(manga) {
  const coverRel = (manga.relationships || []).find((r) => r.type === "cover_art");
  if (coverRel && coverRel.attributes?.fileName) {
    const directUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes.fileName}.256.jpg`;
    return `/api/proxy?url=${encodeURIComponent(directUrl)}`;
  }
  return "";
}

async function mangaPopular(limit = 24) {
  const url = `${MD_BASE}/manga?limit=${limit}&order[followedCount]=desc&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&hasAvailableChapters=true`;
  const r = await fetchT(url, { headers: { "User-Agent": MD_UA } }, 12000);
  if (!r.ok) throw new Error("Gagal load manga.");
  const d = await r.json();
  return {
    list: (d.data || []).map((m) => ({
      id: m.id,
      title: m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || "Untitled",
      thumb: getCoverUrl(m),
      status: m.attributes?.status || "unknown",
      year: m.attributes?.year || "",
    })),
  };
}

async function mangaSearch(q, limit = 24) {
  const url = `${MD_BASE}/manga?title=${encodeURIComponent(q)}&limit=${limit}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`;
  const r = await fetchT(url, { headers: { "User-Agent": MD_UA } }, 12000);
  if (!r.ok) throw new Error("Gagal search.");
  const d = await r.json();
  return {
    list: (d.data || []).map((m) => ({
      id: m.id,
      title: m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || "Untitled",
      thumb: getCoverUrl(m),
      status: m.attributes?.status || "unknown",
      year: m.attributes?.year || "",
    })),
  };
}

async function mangaDetail(id) {
  const r = await fetchT(`${MD_BASE}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`, { headers: { "User-Agent": MD_UA } }, 12000);
  if (!r.ok) throw new Error("Gagal load detail.");
  const d = await r.json();
  const m = d.data;
  const info = {
    id: m.id,
    title: m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || "Untitled",
    altTitle: Object.values(m.attributes?.title || {}).slice(1).join(", "),
    thumb: getCoverUrl(m),
    status: m.attributes?.status || "unknown",
    year: m.attributes?.year || "",
    desc: m.attributes?.description?.en || Object.values(m.attributes?.description || {})[0] || "",
    tags: (m.attributes?.tags || []).map((t) => t.attributes?.name?.en || "").filter(Boolean),
  };
  const chapters = await mangaChapters(id);
  return { info, chapters };
}

async function mangaChapters(mangaId, limit = 500) {
  const url = `${MD_BASE}/manga/${mangaId}/feed?limit=${limit}&translatedLanguage[]=en&translatedLanguage[]=id&order[chapter]=desc&includes[]=scanlation_group`;
  const r = await fetchT(url, { headers: { "User-Agent": MD_UA } }, 15000);
  if (!r.ok) return [];
  const d = await r.json();
  return (d.data || []).map((c) => ({
    id: c.id,
    chapter: c.attributes?.chapter || "?",
    title: c.attributes?.title || "",
    lang: c.attributes?.translatedLanguage || "",
    pages: c.attributes?.pages || 0,
    publishedAt: c.attributes?.publishAt || "",
  }));
}

async function mangaChapter(chapterId) {
  const r = await fetchT(`${MD_BASE}/at-home/server/${chapterId}`, { headers: { "User-Agent": MD_UA } }, 15000);
  if (!r.ok) throw new Error("Gagal load chapter.");
  const d = await r.json();
  if (!d.chapter) throw new Error("Data chapter tidak ditemukan.");
  const { hash, data, dataSaver } = d.chapter;
  const baseUrl = d.baseUrl;
  return {
    images: (data || []).map((f) => `/api/proxy?url=${encodeURIComponent(`${baseUrl}/data/${hash}/${f}`)}`),
    imagesSaver: (dataSaver || []).map((f) => `/api/proxy?url=${encodeURIComponent(`${baseUrl}/data-saver/${hash}/${f}`)}`),
    pages: (data || []).length,
  };
}

/* ============ HANDLER ============ */
export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "tiktok") {
      if (!body.url || !/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(body.url))
        return Response.json({ error: "URL TikTok tidak valid." }, { status: 400 });
      const d = await tiktokDownload(body.url);
      if (!d) return Response.json({ error: "Video tidak ditemukan atau private." }, { status: 400 });
      return Response.json(d);
    }

    if (action === "youtube") {
      const d = await youtubeDownload(body.url, body.mode || "video", body.quality || "1080");
      if (d.error) return Response.json(d, { status: d.videoId ? 503 : 400 });
      return Response.json(d);
    }

    if (action === "media") {
      try { return Response.json(await mediaDownload(body.url)); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    if (action === "tempmail-create") {
      try { return Response.json(await createTempMail()); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (action === "tempmail-inbox") {
      if (!body.token) return Response.json([]);
      try { return Response.json(await inboxTempMail(body.token)); }
      catch { return Response.json([]); }
    }

    if (action === "ai-chat") {
      try {
        const { messages, model, provider, apiKey } = body;
        const content = await aiChat(messages, model, provider, apiKey);
        if (!content) throw new Error("AI tidak memberikan respons.");
        return Response.json({ content });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    if (action === "manga-popular") {
      try { return Response.json(await mangaPopular()); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (action === "manga-search") {
      try { return Response.json(await mangaSearch(body.q)); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (action === "manga-detail") {
      try { return Response.json(await mangaDetail(body.id)); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }
    if (action === "manga-chapter") {
      try { return Response.json(await mangaChapter(body.id)); }
      catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    if (action === "ip-lookup") {
      const target = body.ip ? `/${body.ip}` : "";
      const r = await fetchT(`https://ipapi.co${target}/json/`, {}, 8000);
      return Response.json(await r.json());
    }

    if (action === "scan-url") {
      if (!body.url) return Response.json({ error: "URL wajib." }, { status: 400 });
      const r = await fetchT("https://urlscan.io/api/v1/scan/", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
  const forceDl = searchParams.get("dl") === "1";
  const customName = searchParams.get("name") || "";
  if (proxyUrl) {
    try { return await proxyStream(proxyUrl, req, forceDl, customName); }
    catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
  }
  return Response.json({ ok: true, service: "AllTool API", version: "12.0" });
}

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchT(url, opts = {}, ms = 12000) {
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

/* ============ TIKTOK ============ */
async function tiktokDownload(url) {
  try {
    const r = await fetchT(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
      headers: { "User-Agent": UA },
    }, 10000);
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

/* ============ YOUTUBE ============ */
function extractYtId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function youtubeDownload(url, mode = "video") {
  const vid = extractYtId(url);
  if (!vid) return { error: "URL YouTube tidak valid." };

  const cleanUrl = `https://www.youtube.com/watch?v=${vid}`;

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
        };
      }
    }
  } catch (e) {
    console.warn("[YouTube btch]", e.message);
  }

  try {
    const r = await fetchT("https://cobalt-api.kwiatekmiki.com/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        url: cleanUrl,
        vQuality: mode === "audio" ? "128" : "720",
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
        };
      }
    }
  } catch (e) {
    console.warn("[YouTube cobalt]", e.message);
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
  return (d.emails || []).map((m) => ({
    id: String(m.id || m.date),
    from: { address: m.from, name: m.from },
    subject: m.subject || "(Tanpa subjek)",
    intro: m.subject || "(Tanpa subjek)",
    createdAt: new Date(m.date).toISOString(),
    seen: false,
  }));
}

async function readTempMail(token, id) {
  const r = await fetchT(`https://api.tempmail.lol/v2/inbox?token=${encodeURIComponent(token)}`, {}, 10000);
  if (!r.ok) throw new Error("Gagal membaca inbox.");
  const d = await r.json();
  if (d.expired) throw new Error("Inbox sudah kedaluwarsa.");
  const email = (d.emails || []).find((e) => String(e.id || e.date) === String(id));
  if (!email) throw new Error("Email tidak ditemukan.");
  return {
    subject: email.subject || "(Tanpa subjek)",
    from: { address: email.from, name: email.from },
    text: email.body || "(Tidak ada isi teks)",
    html: email.html ? [email.html] : [],
    createdAt: new Date(email.date).toISOString(),
  };
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

/* ============ HANDLER ============ */
export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "tiktok") {
      if (!body.url || !/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(body.url)) {
        return Response.json({ error: "URL TikTok tidak valid." }, { status: 400 });
      }
      const d = await tiktokDownload(body.url);
      if (!d) return Response.json({ error: "Gagal ambil video. Pastikan video publik." }, { status: 400 });
      return Response.json(d);
    }

    if (action === "youtube") {
      const d = await youtubeDownload(body.url, body.mode || "video");
      if (d.error) return Response.json(d, { status: d.videoId ? 503 : 400 });
      return Response.json(d);
    }

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

    if (action === "tempmail-read") {
      if (!body.token || !body.id) return Response.json({ error: "Parameter kurang." }, { status: 400 });
      try {
        return Response.json(await readTempMail(body.token, body.id));
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    if (action === "ip-lookup") {
      const target = body.ip ? `/${body.ip}` : "";
      const r = await fetchT(`https://ipapi.co${target}/json/`, {}, 8000);
      return Response.json(await r.json());
    }

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
    version: "7.0",
    endpoints: ["tiktok", "youtube", "tempmail-create", "tempmail-inbox", "tempmail-read", "ip-lookup", "scan-url", "scan-url-result", "scan-hash"],
  });
      }

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as I from "lucide-react";
import {
  PROVIDERS, AI_MODELS, DEFAULT_MODEL, DEFAULT_PROVIDER, SYSTEM_PROMPT,
  getStoredModel, setStoredModel, getStoredKeys, saveStoredKeys,
  getStoredHistory, saveStoredHistory,
} from "./ai-config";

/* ============ UTILS ============ */
export const copy = async (t) => {
  try { await navigator.clipboard.writeText(t); return true; }
  catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy");
      document.body.removeChild(ta); return true;
    } catch { return false; }
  }
};
const fmt = (n) => !n ? "0" : n > 1e6 ? (n / 1e6).toFixed(1) + "M" : n > 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n);

/* FORCE DOWNLOAD */
async function forceDownload(targetUrl, filename, key, setState, onToast) {
  if (!targetUrl) { onToast?.("URL tidak tersedia", "error"); return; }
  setState((s) => ({ ...s, [key]: 0 }));

  let res = null;
  let usedDirect = false;

  try {
    res = await fetch(targetUrl, { mode: "cors", credentials: "omit" });
    if (!res.ok) {
      res = null;
    } else {
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html") || ct.includes("application/json") || ct.includes("text/plain")) {
        res = null;
      } else {
        usedDirect = true;
      }
    }
  } catch { res = null; }

  if (!res) {
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}&dl=1&name=${encodeURIComponent(filename)}`;
      res = await fetch(proxyUrl);
    } catch {
      onToast?.("Gagal akses server. Coba lagi.", "error");
      setState((s) => { const n = { ...s }; delete n[key]; return n; });
      return;
    }
  }

  if (!res.ok) {
    onToast?.(`Server error (${res.status}). Coba lagi 1-2 menit.`, "error");
    setState((s) => { const n = { ...s }; delete n[key]; return n; });
    return;
  }

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/json")) {
    onToast?.("Server kirim error, bukan file. Coba lagi.", "error");
    setState((s) => { const n = { ...s }; delete n[key]; return n; });
    return;
  }

  try {
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total) {
        setState((s) => ({ ...s, [key]: Math.min(99, Math.round((loaded / total) * 100)) }));
      } else {
        setState((s) => ({ ...s, [key]: Math.min(99, Math.round(loaded / 200000)) }));
      }
    }

    const blob = new Blob(chunks, { type: ct || "video/mp4" });
    if (blob.size < 1024) {
      onToast?.(`File terlalu kecil (${blob.size} bytes). Error.`, "error");
      setState((s) => { const n = { ...s }; delete n[key]; return n; });
      return;
    }

    const url2 = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url2;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url2), 5000);

    setState((s) => ({ ...s, [key]: 100 }));
    onToast?.(`${filename} berhasil diunduh${usedDirect ? "" : " (via server)"}`, "success");
    setTimeout(() => setState((s) => { const n = { ...s }; delete n[key]; return n; }), 1500);
  } catch (e) {
    onToast?.(`Gagal unduh: ${e.message}`, "error");
    setState((s) => { const n = { ...s }; delete n[key]; return n; });
  }
}

/* ============ TEXT ============ */
export function WordCounter() {
  const [t, setT] = useState("");
  const w = t.trim() ? t.trim().split(/\s+/).length : 0;
  const s = t.split(/[.!?]+/).filter((x) => x.trim()).length;
  const p = t.split(/\n+/).filter((x) => x.trim()).length;
  const stats = [["Kata", w], ["Karakter", t.length], ["Tanpa Spasi", t.replace(/\s/g, "").length], ["Kalimat", s], ["Paragraf", p], ["Menit Baca", Math.ceil(w / 200)]];
  return (
    <div className="col">
      <textarea className="txa" rows={10} value={t} onChange={(e) => setT(e.target.value)} placeholder="Tulis atau tempel teks di sini..." />
      <div className="grid">
        {stats.map(([l, v]) => (<div key={l} className="card"><div className="stat">{v}</div><div className="mut" style={{ marginTop: 6 }}>{l}</div></div>))}
      </div>
    </div>
  );
}

export function CaseConverter() {
  const [t, setT] = useState("");
  const ops = [
    ["UPPERCASE", (s) => s.toUpperCase()], ["lowercase", (s) => s.toLowerCase()],
    ["Title Case", (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())],
    ["Sentence", (s) => s.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase())],
    ["camelCase", (s) => s.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase())],
    ["snake_case", (s) => s.trim().toLowerCase().replace(/\s+/g, "_")],
    ["kebab-case", (s) => s.trim().toLowerCase().replace(/\s+/g, "-")],
  ];
  return (
    <div className="col">
      <textarea className="txa" rows={7} value={t} onChange={(e) => setT(e.target.value)} />
      <div className="row">
        {ops.map(([l, f]) => <button key={l} className="btn btn-s" onClick={() => setT(f(t))}>{l}</button>)}
        <button className="btn btn-p" onClick={() => copy(t)}><I.Copy size={14} />Copy</button>
      </div>
    </div>
  );
}

export function LoremIpsum() {
  const [n, setN] = useState(3);
  const [type, setType] = useState("paragraphs");
  const [out, setOut] = useState("");
  const W = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat".split(" ");
  const gen = () => {
    const r = () => W[Math.floor(Math.random() * W.length)];
    if (type === "words") return setOut(Array.from({ length: n }, r).join(" "));
    if (type === "sentences") return setOut(Array.from({ length: n }, () => Array.from({ length: 10 }, r).join(" ").replace(/^\w/, (c) => c.toUpperCase()) + ".").join(" "));
    setOut(Array.from({ length: n }, () => Array.from({ length: 4 }, () => Array.from({ length: 10 }, r).join(" ").replace(/^\w/, (c) => c.toUpperCase()) + ".").join(" ")).join("\n\n"));
  };
  return (
    <div className="col">
      <div className="card">
        <div className="row">
          <div style={{ width: 100 }}><div className="tag" style={{ marginBottom: 6 }}>Jumlah</div><input type="number" className="inp" value={n} onChange={(e) => setN(+e.target.value)} min={1} max={50} /></div>
          <div style={{ width: 150 }}><div className="tag" style={{ marginBottom: 6 }}>Tipe</div><select className="inp" value={type} onChange={(e) => setType(e.target.value)}><option value="paragraphs">Paragraf</option><option value="sentences">Kalimat</option><option value="words">Kata</option></select></div>
          <button className="btn btn-p" style={{ alignSelf: "flex-end" }} onClick={gen}>Generate</button>
          {out && <button className="btn btn-s" style={{ alignSelf: "flex-end" }} onClick={() => copy(out)}>Copy</button>}
        </div>
      </div>
      {out && <textarea className="txa" rows={12} value={out} readOnly />}
    </div>
  );
}

export function MarkdownPreview() {
  const [t, setT] = useState("# Halo\n\nIni **markdown** preview.\n\n- Item 1\n- Item 2\n\n`code inline`");
  const html = useMemo(() => {
    let h = t
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code style='background:rgba(167,139,250,0.15);padding:2px 6px;border-radius:4px;font-family:monospace;color:var(--p)'>$1</code>")
      .replace(/```([\s\S]*?)```/g, "<pre style='background:rgba(0,0,0,0.4);color:#e2e8f0;padding:14px;border-radius:10px;overflow-x:auto;border:1px solid var(--border)'><code>$1</code></pre>")
      .replace(/^\- (.+)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2' style='color:var(--p)'>$1</a>")
      .replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
    return "<p>" + h + "</p>";
  }, [t]);
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <textarea className="txa" rows={16} value={t} onChange={(e) => setT(e.target.value)} />
      <div className="card" style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.7, minHeight: 300 }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/* ============ DEVELOPER ============ */
export function JsonFormatter() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  const [e, setE] = useState("");
  const fmt2 = (min) => {
    try { const p = JSON.parse(i); setO(min ? JSON.stringify(p) : JSON.stringify(p, null, 2)); setE(""); }
    catch (err) { setE(err.message); setO(""); }
  };
  return (
    <div className="col">
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div><div className="tag" style={{ marginBottom: 6 }}>INPUT</div><textarea className="txa" rows={14} value={i} onChange={(e) => setI(e.target.value)} placeholder='{"name":"value"}' /></div>
        <div><div className="tag" style={{ marginBottom: 6 }}>OUTPUT</div><textarea className="txa" rows={14} value={o} readOnly /></div>
      </div>
      <div className="row">
        <button className="btn btn-p" onClick={() => fmt2(false)}>Format</button>
        <button className="btn btn-s" onClick={() => fmt2(true)}>Minify</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
      </div>
      {e && <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{e}</div>}
    </div>
  );
}

export function Base64Tool() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  const [m, setM] = useState("encode");
  const go = () => {
    try { setO(m === "encode" ? btoa(unescape(encodeURIComponent(i))) : decodeURIComponent(escape(atob(i)))); }
    catch { setO("Input tidak valid"); }
  };
  return (
    <div className="col">
      <div className="row">
        {["encode", "decode"].map((x) => <button key={x} className={`chip ${m === x ? "active" : ""}`} onClick={() => setM(x)}>{x === "encode" ? "Encode" : "Decode"}</button>)}
      </div>
      <textarea className="txa" rows={6} value={i} onChange={(e) => setI(e.target.value)} />
      <div className="row">
        <button className="btn btn-p" onClick={go}>{m === "encode" ? "Encode" : "Decode"}</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
      </div>
      {o && <textarea className="txa" rows={6} value={o} readOnly />}
    </div>
  );
}

export function UrlEncoder() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  return (
    <div className="col">
      <textarea className="txa" rows={4} value={i} onChange={(e) => setI(e.target.value)} placeholder="https://example.com/?q=hello world" />
      <div className="row">
        <button className="btn btn-p" onClick={() => setO(encodeURIComponent(i))}>Encode</button>
        <button className="btn btn-s" onClick={() => setO(decodeURIComponent(i))}>Decode</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
      </div>
      {o && <textarea className="txa" rows={4} value={o} readOnly />}
    </div>
  );
}

export function HtmlEditor() {
  const [html, setHtml] = useState(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; text-align: center; background: #0a0a14; color: #fff; }
    h1 { background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; }
    button { padding: 10px 20px; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Halo Dunia</h1>
  <p>Edit kode di kiri, preview di kanan.</p>
  <button onclick="alert('Klik!')">Klik Saya</button>
</body>
</html>`);
  const [tab, setTab] = useState("html");
  return (
    <div className="col">
      <div className="tabs">
        <button className={`tab ${tab === "html" ? "active" : ""}`} onClick={() => setTab("html")}>HTML</button>
        <button className={`tab ${tab === "preview" ? "active" : ""}`} onClick={() => setTab("preview")}>Preview</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: tab === "preview" ? "1fr" : "1fr 1fr" }}>
        {tab !== "preview" && <textarea className="txa" rows={22} value={html} onChange={(e) => setHtml(e.target.value)} style={{ fontFamily: "monospace" }} />}
        <iframe className="frame" style={{ minHeight: 500 }} srcDoc={html} sandbox="allow-scripts allow-modals" title="preview" />
      </div>
    </div>
  );
}

export function CssPlayground() {
  const [css, setCss] = useState(`.box {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  border-radius: 20px;
  box-shadow: 0 20px 40px -10px rgba(124,58,237,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-family: sans-serif;
}`);
  const full = `<!DOCTYPE html><html><head><style>body{margin:0;padding:40px;background:#0a0a14;min-height:100vh;display:flex;align-items:center;justify-content:center;}${css}</style></head><body><div class="box">Hello</div></body></html>`;
  return (
    <div className="col">
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <textarea className="txa" rows={18} value={css} onChange={(e) => setCss(e.target.value)} style={{ fontFamily: "monospace" }} />
        <iframe className="frame" style={{ minHeight: 400 }} srcDoc={full} title="css-preview" />
      </div>
    </div>
  );
}

export function HtmlMinifier() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  const min = () => setO(i.replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").replace(/>\s+</g, "><").replace(/\s*=\s*/g, "=").trim());
  return (
    <div className="col">
      <textarea className="txa" rows={10} value={i} onChange={(e) => setI(e.target.value)} placeholder="<div>  <p>  Hello  </p>  </div>" />
      <div className="row">
        <button className="btn btn-p" onClick={min}>Minify HTML</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
        <span className="soft">{i.length} to {o.length} chars</span>
      </div>
      {o && <textarea className="txa" rows={10} value={o} readOnly />}
    </div>
  );
}

export function CssMinifier() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  const min = () => setO(i.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{};:,])\s*/g, "$1").trim());
  return (
    <div className="col">
      <textarea className="txa" rows={10} value={i} onChange={(e) => setI(e.target.value)} placeholder="body { color: red; }" />
      <div className="row">
        <button className="btn btn-p" onClick={min}>Minify CSS</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
      </div>
      {o && <textarea className="txa" rows={10} value={o} readOnly />}
    </div>
  );
}

export function JsMinifier() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  const min = () => setO(i.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{};,:+\-*/=<>!&|?()\[\]])\s*/g, "$1").trim());
  return (
    <div className="col">
      <textarea className="txa" rows={10} value={i} onChange={(e) => setI(e.target.value)} placeholder="function hello() { console.log('hi'); }" />
      <div className="row">
        <button className="btn btn-p" onClick={min}>Minify JS</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
      </div>
      {o && <textarea className="txa" rows={10} value={o} readOnly />}
    </div>
  );
}

export function HashGenerator() {
  const [i, setI] = useState("");
  const [list, setList] = useState([]);
  const sha = async (algo, txt) => {
    const b = await crypto.subtle.digest(algo, new TextEncoder().encode(txt));
    return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
  };
  const go = async () => {
    if (!i) return;
    const [a, b, c, d] = await Promise.all([sha("SHA-1", i), sha("SHA-256", i), sha("SHA-384", i), sha("SHA-512", i)]);
    setList([["SHA-1", a], ["SHA-256", b], ["SHA-384", c], ["SHA-512", d]]);
  };
  return (
    <div className="col">
      <textarea className="txa" rows={3} value={i} onChange={(e) => setI(e.target.value)} placeholder="Teks yang akan di-hash..." />
      <button className="btn btn-p" style={{ alignSelf: "flex-start" }} onClick={go}>Generate Hash</button>
      <div className="col">
        {list.map(([n, v]) => (
          <div key={n} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="tag">{n}</span>
              <button className="btn btn-g" onClick={() => copy(v)}><I.Copy size={14} /></button>
            </div>
            <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", lineHeight: 1.6 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QrGenerator() {
  const [t, setT] = useState("");
  const [s, setS] = useState(300);
  const [fg, setFg] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const url = t ? `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encodeURIComponent(t)}&color=${fg.slice(1)}&bgcolor=${bg.slice(1)}` : "";
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="card">
        <div className="tag" style={{ marginBottom: 8 }}>TEKS / URL</div>
        <textarea className="txa" rows={4} value={t} onChange={(e) => setT(e.target.value)} placeholder="https://example.com" />
        <div className="mut" style={{ marginTop: 12 }}>Ukuran: {s}px</div>
        <input type="range" min={100} max={600} step={50} value={s} onChange={(e) => setS(+e.target.value)} style={{ width: "100%", accentColor: "var(--p)" }} />
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
          <div><div className="soft" style={{ marginBottom: 4 }}>WARNA QR</div><input type="color" value={fg} onChange={(e) => setFg(e.target.value)} style={{ width: "100%", height: 44, border: "none", borderRadius: 10, cursor: "pointer" }} /></div>
          <div><div className="soft" style={{ marginBottom: 4 }}>BACKGROUND</div><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ width: "100%", height: 44, border: "none", borderRadius: 10, cursor: "pointer" }} /></div>
        </div>
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {url ? (<><img src={url} alt="QR" style={{ borderRadius: 14 }} /><a className="btn btn-p" style={{ marginTop: 14 }} href={url} download="qrcode.png"><I.Download size={14} />Unduh</a></>) : (<div className="mut" style={{ textAlign: "center" }}><I.QrCode size={48} style={{ opacity: 0.3, margin: "0 auto 10px" }} /><div>QR code muncul di sini</div></div>)}
      </div>
    </div>
  );
}

/* ============ IMAGE ============ */
export function ImageCompressor() {
  const [f, setF] = useState(null);
  const [q, setQ] = useState(0.7);
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(false);
  const go = async () => {
    if (!f) return;
    setLoading(true);
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await new Promise((x) => { img.onload = x; });
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0);
    c.toBlob((b) => { if (b) setR({ url: URL.createObjectURL(b), size: b.size }); setLoading(false); }, "image/jpeg", q);
  };
  return (
    <div className="col">
      <input type="file" className="inp" accept="image/*" onChange={(e) => { setF(e.target.files?.[0] || null); setR(null); }} />
      {f && <div className="card">
        <div className="mut">Ukuran asli: {(f.size / 1024).toFixed(1)} KB</div>
        <div className="tag" style={{ marginTop: 12 }}>KUALITAS: {Math.round(q * 100)}%</div>
        <input type="range" min={0.1} max={1} step={0.05} value={q} onChange={(e) => setQ(+e.target.value)} style={{ width: "100%", accentColor: "var(--p)", marginTop: 6 }} />
        <button className="btn btn-p" style={{ marginTop: 14 }} disabled={loading} onClick={go}>{loading ? "Memproses..." : "Kompres"}</button>
      </div>}
      {r && <div className="card">
        <div className="mut">Baru: {(r.size / 1024).toFixed(1)} KB ({Math.round((1 - r.size / f.size) * 100)}% lebih kecil)</div>
        <img src={r.url} style={{ marginTop: 14, maxHeight: 250, borderRadius: 14, objectFit: "contain" }} />
        <a className="btn btn-p" style={{ marginTop: 14, display: "inline-flex" }} href={r.url} download="compressed.jpg"><I.Download size={14} />Unduh</a>
      </div>}
    </div>
  );
}

export function ImageResizer() {
  const [f, setF] = useState(null);
  const [w, setW] = useState(800);
  const [h, setH] = useState(600);
  const [ratio, setRatio] = useState(1);
  const [keep, setKeep] = useState(true);
  const [r, setR] = useState("");
  const hf = (file) => {
    setF(file); setR("");
    const img = new Image();
    img.onload = () => { setRatio(img.width / img.height); setW(img.width); setH(img.height); };
    img.src = URL.createObjectURL(file);
  };
  const go = async () => {
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await new Promise((x) => { img.onload = x; });
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    setR(c.toDataURL("image/png"));
  };
  return (
    <div className="col">
      <input type="file" className="inp" accept="image/*" onChange={(e) => e.target.files?.[0] && hf(e.target.files[0])} />
      {f && <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div><div className="tag" style={{ marginBottom: 6 }}>LEBAR</div><input type="number" className="inp" value={w} onChange={(e) => { const v = +e.target.value; setW(v); if (keep) setH(Math.round(v / ratio)); }} /></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>TINGGI</div><input type="number" className="inp" value={h} onChange={(e) => { const v = +e.target.value; setH(v); if (keep) setW(Math.round(v * ratio)); }} /></div>
        </div>
        <label style={{ display: "flex", gap: 8, marginTop: 12, fontSize: 13, alignItems: "center" }}><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />Jaga rasio</label>
        <button className="btn btn-p" style={{ marginTop: 14 }} onClick={go}>Ubah Ukuran</button>
      </div>}
      {r && <div className="card">
        <img src={r} style={{ maxHeight: 250, borderRadius: 14 }} />
        <a className="btn btn-p" style={{ marginTop: 14, display: "inline-flex" }} href={r} download="resized.png"><I.Download size={14} />Unduh</a>
      </div>}
    </div>
  );
}

export function ImageConverter() {
  const [f, setF] = useState(null);
  const [fmt, setFmt] = useState("image/png");
  const [r, setR] = useState("");
  const go = async () => {
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await new Promise((x) => { img.onload = x; });
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    if (fmt === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0);
    setR(c.toDataURL(fmt));
  };
  return (
    <div className="col">
      <input type="file" className="inp" accept="image/*" onChange={(e) => { setF(e.target.files?.[0] || null); setR(""); }} />
      {f && <div className="card">
        <div className="tag" style={{ marginBottom: 6 }}>FORMAT</div>
        <select className="inp" value={fmt} onChange={(e) => setFmt(e.target.value)}>
          <option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option>
        </select>
        <button className="btn btn-p" style={{ marginTop: 14 }} onClick={go}>Konversi</button>
      </div>}
      {r && <div className="card">
        <img src={r} style={{ maxHeight: 200, borderRadius: 14 }} />
        <a className="btn btn-p" style={{ marginTop: 14, display: "inline-flex" }} href={r} download={`converted.${fmt.split("/")[1]}`}><I.Download size={14} />Unduh</a>
      </div>}
    </div>
  );
}

/* ============ CALCULATORS ============ */
export function BmiCalculator() {
  const [w, setW] = useState(60);
  const [h, setH] = useState(170);
  const bmi = w / Math.pow(h / 100, 2);
  const cat = bmi < 18.5 ? "Kurus" : bmi < 25 ? "Normal" : bmi < 30 ? "Gemuk" : "Obesitas";
  const c = bmi < 18.5 ? "var(--blue)" : bmi < 25 ? "var(--green)" : bmi < 30 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="col">
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div><div className="tag" style={{ marginBottom: 6 }}>BERAT (KG)</div><input type="number" className="inp" value={w} onChange={(e) => setW(+e.target.value)} /></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>TINGGI (CM)</div><input type="number" className="inp" value={h} onChange={(e) => setH(+e.target.value)} /></div>
        </div>
      </div>
      <div className="card" style={{ textAlign: "center", padding: 36 }}>
        <div style={{ fontSize: 58, fontWeight: 800, color: c, letterSpacing: "-0.03em" }}>{bmi.toFixed(1)}</div>
        <div style={{ marginTop: 8, color: c, fontWeight: 700, fontSize: 18 }}>{cat}</div>
      </div>
    </div>
  );
}

export function AgeCalculator() {
  const [b, setB] = useState("2000-01-01");
  const calc = () => {
    const bd = new Date(b), n = new Date();
    if (isNaN(bd)) return null;
    let y = n.getFullYear() - bd.getFullYear(), m = n.getMonth() - bd.getMonth(), d = n.getDate() - bd.getDate();
    if (d < 0) { m--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    const td = Math.floor((n - bd) / 86400000);
    return { y, m, d, td, tw: Math.floor(td / 7), th: td * 24 };
  };
  const r = calc();
  return (
    <div className="col">
      <div className="card"><div className="tag" style={{ marginBottom: 6 }}>TANGGAL LAHIR</div><input type="date" className="inp" value={b} onChange={(e) => setB(e.target.value)} /></div>
      {r && <div className="grid">
        {[["Tahun", r.y], ["Bulan", r.m], ["Hari", r.d], ["Total Hari", r.td.toLocaleString("id-ID")], ["Total Minggu", r.tw.toLocaleString("id-ID")], ["Total Jam", r.th.toLocaleString("id-ID")]].map(([l, v]) => (
          <div key={l} className="card"><div className="stat">{v}</div><div className="mut" style={{ marginTop: 6 }}>{l}</div></div>
        ))}
      </div>}
    </div>
  );
}

export function Percentage() {
  const [a, setA] = useState(10);
  const [b, setB] = useState(200);
  return (
    <div className="col">
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div><div className="tag" style={{ marginBottom: 6 }}>NILAI A</div><input type="number" className="inp" value={a} onChange={(e) => setA(+e.target.value)} /></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>NILAI B</div><input type="number" className="inp" value={b} onChange={(e) => setB(+e.target.value)} /></div>
        </div>
      </div>
      {[[`${a}% dari ${b}`, ((a / 100) * b).toFixed(2)], [`${a} berapa % dari ${b}`, ((a / b) * 100).toFixed(2) + "%"], [`Perubahan ${a} ke ${b}`, (((b - a) / a) * 100).toFixed(2) + "%"]].map(([l, v]) => (
        <div key={l} className="card"><div className="mut">{l}</div><div className="stat" style={{ marginTop: 6 }}>{v}</div></div>
      ))}
    </div>
  );
}

export function UnitConverter() {
  const [c, setC] = useState("panjang");
  const [v, setV] = useState(1);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(1);
  const U = {
    panjang: [["Meter", 1], ["Kilometer", 1000], ["Centimeter", 0.01], ["Millimeter", 0.001], ["Inch", 0.0254], ["Foot", 0.3048], ["Yard", 0.9144], ["Mile", 1609.344]],
    berat: [["Kilogram", 1], ["Gram", 0.001], ["Milligram", 1e-6], ["Pound", 0.453592], ["Ounce", 0.0283495], ["Ton", 1000]],
    suhu: [["Celsius", 1], ["Fahrenheit", 1], ["Kelvin", 1]],
  };
  const convert = () => {
    if (c === "suhu") {
      const n = U.suhu.map((x) => x[0]), f = n[from], t = n[to];
      let cl = v;
      if (f === "Fahrenheit") cl = (v - 32) * 5 / 9;
      if (f === "Kelvin") cl = v - 273.15;
      if (t === "Celsius") return cl;
      if (t === "Fahrenheit") return cl * 9 / 5 + 32;
      if (t === "Kelvin") return cl + 273.15;
      return cl;
    }
    const u = U[c];
    return (v * u[from][1]) / u[to][1];
  };
  return (
    <div className="col">
      <div className="row">{["panjang", "berat", "suhu"].map((x) => <button key={x} className={`chip ${c === x ? "active" : ""}`} onClick={() => { setC(x); setFrom(0); setTo(1); }}>{x[0].toUpperCase() + x.slice(1)}</button>)}</div>
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div><div className="tag" style={{ marginBottom: 6 }}>NILAI</div><input type="number" className="inp" value={v} onChange={(e) => setV(+e.target.value)} /></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>DARI</div><select className="inp" value={from} onChange={(e) => setFrom(+e.target.value)}>{U[c].map((u, i) => <option key={u[0]} value={i}>{u[0]}</option>)}</select></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>KE</div><select className="inp" value={to} onChange={(e) => setTo(+e.target.value)}>{U[c].map((u, i) => <option key={u[0]} value={i}>{u[0]}</option>)}</select></div>
        </div>
      </div>
      <div className="card" style={{ textAlign: "center", padding: 30 }}>
        <div className="mut">{v} {U[c][from][0]} =</div>
        <div className="stat" style={{ fontSize: 32, marginTop: 10 }}>{convert().toLocaleString("id-ID", { maximumFractionDigits: 6 })}</div>
        <div className="mut" style={{ marginTop: 6 }}>{U[c][to][0]}</div>
      </div>
    </div>
  );
}

/* ============ SECURITY ============ */
export function PasswordGenerator() {
  const [len, setLen] = useState(16);
  const [up, setUp] = useState(true);
  const [lo, setLo] = useState(true);
  const [num, setNum] = useState(true);
  const [sym, setSym] = useState(true);
  const [pw, setPw] = useState("");
  const gen = useCallback(() => {
    let ch = "";
    if (up) ch += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lo) ch += "abcdefghijklmnopqrstuvwxyz";
    if (num) ch += "0123456789";
    if (sym) ch += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    if (!ch) ch = "abcdefghijklmnopqrstuvwxyz";
    const a = new Uint32Array(len);
    crypto.getRandomValues(a);
    let s = "";
    for (let i = 0; i < len; i++) s += ch[a[i] % ch.length];
    setPw(s);
  }, [len, up, lo, num, sym]);
  useEffect(() => { gen(); }, [gen]);
  const strength = pw.length >= 20 && up && lo && num && sym ? "Sangat Kuat" : pw.length >= 12 ? "Kuat" : "Lemah";
  const c = strength === "Sangat Kuat" ? "var(--green)" : strength === "Kuat" ? "var(--yellow)" : "var(--red)";
  return (
    <div className="col">
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 16, border: "1.5px solid var(--border-strong)", borderRadius: 12, fontFamily: "monospace", fontSize: 14, wordBreak: "break-all", background: "var(--ps)" }}>
          <span style={{ flex: 1 }}>{pw}</span>
          <button className="btn btn-g" onClick={() => copy(pw)}><I.Copy size={16} /></button>
          <button className="btn btn-g" onClick={gen}><I.RefreshCw size={16} /></button>
        </div>
        <div style={{ marginTop: 12, color: c, fontSize: 13, fontWeight: 700 }}>Kekuatan: {strength}</div>
      </div>
      <div className="card">
        <div className="tag" style={{ marginBottom: 6 }}>PANJANG: {len}</div>
        <input type="range" min={4} max={64} value={len} onChange={(e) => setLen(+e.target.value)} style={{ width: "100%", accentColor: "var(--p)" }} />
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
          {[["Huruf Besar", up, setUp], ["Huruf Kecil", lo, setLo], ["Angka", num, setNum], ["Simbol", sym, setSym]].map(([l, v, s]) => (
            <label key={l} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={v} onChange={(e) => s(e.target.checked)} />{l}</label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PasswordStrength() {
  const [pw, setPw] = useState("");
  const a = useMemo(() => {
    const c = { length: pw.length >= 12, upper: /[A-Z]/.test(pw), lower: /[a-z]/.test(pw), numbers: /\d/.test(pw), symbols: /[^A-Za-z0-9]/.test(pw), long: pw.length >= 16 };
    const score = Object.values(c).filter(Boolean).length;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/\d/.test(pw)) pool += 10;
    if (/[^A-Za-z0-9]/.test(pw)) pool += 32;
    const entropy = pw.length * Math.log2(pool || 1);
    const crack = entropy > 0 ? Math.pow(2, entropy) / 1e10 : 0;
    return { score, checks: c, entropy, crack };
  }, [pw]);
  const lv = ["Sangat Lemah", "Lemah", "Sedang", "Kuat", "Sangat Kuat", "Sempurna"];
  const cl = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a", "#059669"];
  const fmtTime = (s) => {
    if (s < 1) return "Instan";
    if (s < 60) return `${s.toFixed(0)} detik`;
    if (s < 3600) return `${(s / 60).toFixed(0)} menit`;
    if (s < 86400) return `${(s / 3600).toFixed(0)} jam`;
    if (s < 31536000) return `${(s / 86400).toFixed(0)} hari`;
    if (s < 31536000 * 1000) return `${(s / 31536000).toFixed(0)} tahun`;
    return "Miliaran tahun";
  };
  return (
    <div className="col">
      <input type="password" className="inp" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Masukkan password..." />
      {pw && <>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: cl[a.score], fontWeight: 800, fontSize: 16 }}>{lv[a.score]}</span>
            <span className="mut">Skor: {a.score}/6</span>
          </div>
          <div style={{ height: 10, background: "var(--border)", borderRadius: 5, marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: `${(a.score / 6) * 100}%`, height: "100%", background: cl[a.score], transition: "0.3s" }} />
          </div>
        </div>
        <div className="card">
          <div className="mut">Perkiraan waktu crack</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: cl[a.score] }}>{fmtTime(a.crack)}</div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[["Min 12 karakter", a.checks.length], ["Huruf besar", a.checks.upper], ["Huruf kecil", a.checks.lower], ["Angka", a.checks.numbers], ["Simbol", a.checks.symbols], ["Min 16 karakter", a.checks.long]].map(([l, v]) => (
            <div key={l} style={{ padding: 12, border: `1.5px solid ${v ? "var(--green)" : "var(--border)"}`, borderRadius: 11, fontSize: 12, color: v ? "var(--green)" : "var(--text-muted)", display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
              <span>{v ? "OK" : "X"}</span> {l}
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

/* ============ VIRUS SCANNER ============ */
export function VirusScanner({ onToast }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const detectType = (v) => {
    if (!v) return null;
    const t = v.trim();
    if (/^https?:\/\/.+/i.test(t)) return "url";
    if (/^[a-f0-9]{32}$/i.test(t)) return "hash-md5";
    if (/^[a-f0-9]{40}$/i.test(t)) return "hash-sha1";
    if (/^[a-f0-9]{64}$/i.test(t)) return "hash-sha256";
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(t)) return "url";
    return null;
  };

  const scanUrl = async (url) => {
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "scan-url", url }) });
      const d = await r.json();
      if (d.error) { setErr(d.error); onToast?.(d.error, "error"); }
      else { setResult({ type: "url-pending", ...d }); onToast?.("Menganalisis URL...", "info"); pollUrl(d.scanId, 0); }
    } catch { setErr("Kesalahan jaringan"); }
  };

  const scanHash = async (hash) => {
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "scan-hash", hash: hash.toLowerCase() }) });
      const d = await r.json();
      if (d.error) { setErr(d.error); onToast?.(d.error, "error"); }
      else { setResult({ type: "hash", ...d }); onToast?.(d.malware ? "File berbahaya!" : "File aman", d.malware ? "error" : "success"); }
    } catch { setErr("Kesalahan jaringan"); }
  };

  const pollUrl = async (id, attempt) => {
    if (attempt > 8) { setErr("Timeout. Cek manual di urlscan.io"); return; }
    setPollCount(attempt + 1);
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "scan-url-result", id }) });
      const d = await r.json();
      if (d.error || !d.verdicts) pollUrl(id, attempt + 1);
      else { setResult({ type: "url-result", ...d, scanId: id }); onToast?.(d.malicious ? "URL berbahaya!" : "URL aman", d.malicious ? "error" : "success"); }
    } catch { pollUrl(id, attempt + 1); }
  };

  const startScan = async () => {
    const t = input.trim();
    if (!t) { setErr("Masukkan URL, hash, atau upload file."); return; }
    setLoading(true); setErr(""); setResult(null); setPollCount(0);
    const type = detectType(t);
    if (!type) { setErr("Input tidak dikenali."); setLoading(false); return; }
    if (type === "url") { let url = t; if (!/^https?:\/\//i.test(url)) url = "https://" + url; await scanUrl(url); }
    else await scanHash(t);
    setLoading(false);
  };

  const handleFile = async (f) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { onToast?.("File terlalu besar (maks 50 MB)", "error"); return; }
    setFileName(f.name); setErr(""); setResult(null); setLoading(true);
    onToast?.(`Menghitung hash ${f.name}...`, "info");
    try {
      const buf = await f.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      setInput(hash);
      onToast?.("Hash siap. Scan otomatis...", "info");
      await scanHash(hash);
    } catch (e) { setErr("Gagal membaca file: " + e.message); }
    setLoading(false);
  };

  const reset = () => { setInput(""); setResult(null); setErr(""); setFileName(""); setPollCount(0); };
  const detected = detectType(input);
  const detectedLabel = { url: "URL", "hash-md5": "Hash MD5", "hash-sha1": "Hash SHA-1", "hash-sha256": "Hash SHA-256" }[detected] || null;

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 12 }}>SCAN OTOMATIS</div>
        <p className="mut" style={{ marginBottom: 14, lineHeight: 1.6 }}>Masukkan URL atau hash, atau upload file. Sistem otomatis mendeteksi dan scan.</p>
        <div className="row" style={{ marginBottom: 10 }}>
          <input className="inp" style={{ flex: 1, minWidth: 200, fontFamily: "monospace", fontSize: 13 }} value={input} onChange={(e) => { setInput(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && startScan()} placeholder="https://situs.com  atau  hash SHA-256" />
          <button className="btn btn-p" disabled={loading || !input} onClick={startScan}>
            {loading ? <I.Loader2 size={14} className="spin" /> : <I.ShieldAlert size={14} />}
            {loading ? "Scanning..." : "Scan"}
          </button>
        </div>
        {detectedLabel && !loading && (<div className="row" style={{ marginBottom: 10 }}><span className="pill"><I.Check size={11} />Terdeteksi: {detectedLabel}</span></div>)}
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }} onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${dragOver ? "var(--p)" : "var(--border-strong)"}`, borderRadius: 14, padding: 24, textAlign: "center", cursor: "pointer", background: dragOver ? "var(--ps)" : "transparent", transition: "all 0.2s" }}>
          <I.Upload size={26} style={{ color: "var(--p)", margin: "0 auto 8px" }} />
          <div style={{ fontWeight: 700, fontSize: 13 }}>Upload file untuk scan</div>
          <div className="soft" style={{ marginTop: 4 }}>Klik atau drag file ke sini (maks 50 MB)</div>
          {fileName && <div className="mut" style={{ marginTop: 8 }}>File: {fileName}</div>}
          <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {input && !loading && (<button className="btn btn-g" style={{ marginTop: 12, fontSize: 12 }} onClick={reset}><I.X size={12} />Reset</button>)}
        {err && <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{err}</div>}
      </div>
      {result?.type === "url-pending" && (<div className="card" style={{ textAlign: "center", padding: 30 }}><I.Loader2 size={32} className="spin" style={{ color: "var(--p)", margin: "0 auto 12px" }} /><div style={{ fontWeight: 700 }}>Menganalisis URL...</div><div className="mut" style={{ marginTop: 6 }}>Percobaan {pollCount}/8</div></div>)}
      {result?.type === "url-result" && (
        <div className="card fade">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Hasil Scan URL</b>
            <span className="pill" style={{ background: result.malicious ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: result.malicious ? "var(--red)" : "var(--green)" }}>{result.malicious ? "BERBAHAYA" : "AMAN"}</span>
          </div>
          <div className="col">
            {[["Skor", result.score ?? 0], ["Malicious", result.malicious ? "Ya" : "Tidak"], ["Kategori", (result.categories || []).join(", ") || "-"], ["Server", result.page?.server || "-"], ["IP", result.page?.ip || "-"], ["Negara", result.page?.country || "-"], ["Domain", result.page?.domain || "-"]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="mut">{l}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{String(v)}</span>
              </div>
            ))}
          </div>
          <a className="btn btn-s" style={{ marginTop: 14, display: "inline-flex" }} href={`https://urlscan.io/result/${result.scanId}/`} target="_blank" rel="noopener"><I.ExternalLink size={14} />Lihat Laporan</a>
        </div>
      )}
      {result?.type === "hash" && (
        <div className="card fade">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Hasil Scan File</b>
            <span className="pill" style={{ background: result.malware ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: result.malware ? "var(--red)" : "var(--green)" }}>{result.malware ? "MALWARE" : "BERSIH"}</span>
          </div>
          {fileName && (<div className="row" style={{ marginBottom: 10 }}><I.File size={14} style={{ color: "var(--p)" }} /><span style={{ fontSize: 13, fontWeight: 600 }}>{fileName}</span></div>)}
          {result.found ? (
            <div className="col">
              {[["Signature", result.signature], ["File Type", result.fileType], ["File Name", result.fileName], ["First Seen", result.firstSeen], ["Tags", (result.tags || []).join(", ") || "-"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="mut">{l}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 20 }}>
              <I.CheckCircle2 size={44} style={{ color: "var(--green)", margin: "0 auto 10px" }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>File bersih</div>
              <div className="mut" style={{ marginTop: 6 }}>{result.message || "Hash tidak ditemukan di database malware."}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============ TIKTOK DOWNLOADER ============ */
export function TikTokDownloader({ onToast }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState(null);
  const [dlState, setDlState] = useState({});

  const go = async () => {
    if (!url) return;
    setLoading(true); setR(null); setDlState({});
    try {
      const res = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "tiktok", url }) });
      const d = await res.json();
      if (!res.ok) onToast?.(d.error || "Gagal", "error");
      else { setR(d); onToast?.("Video siap. Klik tombol download.", "success"); }
    } catch { onToast?.("Kesalahan jaringan.", "error"); }
    setLoading(false);
  };

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 10 }}>URL VIDEO TIKTOK</div>
        <div className="row">
          <input className="inp" style={{ flex: 1, minWidth: 200 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@user/video/..." />
          <button className="btn btn-p" disabled={loading || !url} onClick={go}>
            {loading ? <I.Loader2 size={16} className="spin" /> : <I.Search size={16} />}
            {loading ? "Memproses..." : "Ambil Video"}
          </button>
        </div>
      </div>
      {r && (
        <div className="card fade">
          <div className="grid" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
            <img src={r.cover} style={{ width: "100%", borderRadius: 14, objectFit: "cover" }} alt="Cover" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{r.title}</div>
              <div className="mut" style={{ marginTop: 6 }}>@{r.author} {r.nickname && `• ${r.nickname}`}</div>
              <div className="row" style={{ marginTop: 12 }}>
                {[["Play", r.stats?.plays], ["Like", r.stats?.likes], ["Komen", r.stats?.comments], ["Share", r.stats?.shares]].map(([l, v]) => (
                  <div key={l} style={{ padding: "5px 11px", border: "1px solid var(--border)", borderRadius: 9, fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>{l}:</span> <b>{fmt(v)}</b>
                  </div>
                ))}
              </div>
              <div className="col" style={{ marginTop: 14 }}>
                <button className="btn btn-p" disabled={dlState["hd"] != null && dlState["hd"] < 100}
                  onClick={() => forceDownload(r.hd || r.noWm, `${(r.title || "tiktok").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}_hd.mp4`, "hd", setDlState, onToast)}>
                  {dlState["hd"] != null && dlState["hd"] < 100 ? <><I.Loader2 size={14} className="spin" />Memproses...</> : <><I.Download size={14} />Download HD 1080p</>}
                </button>
                <button className="btn btn-s" disabled={dlState["video"] != null && dlState["video"] < 100}
                  onClick={() => forceDownload(r.noWm, `${(r.title || "tiktok").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}_nowm.mp4`, "video", setDlState, onToast)}>
                  {dlState["video"] != null && dlState["video"] < 100 ? <><I.Loader2 size={14} className="spin" />Memproses...</> : <><I.Download size={14} />No Watermark</>}
                </button>
                {r.music && (
                  <button className="btn btn-s" disabled={dlState["music"] != null && dlState["music"] < 100}
                    onClick={() => forceDownload(r.music, "audio.mp3", "music", setDlState, onToast)}>
                    {dlState["music"] != null && dlState["music"] < 100 ? <><I.Loader2 size={14} className="spin" />Memproses...</> : <><I.Music size={14} />Audio MP3</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ YOUTUBE DOWNLOADER ============ */
export function YouTubeDownloader({ onToast }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("video");
  const [quality, setQuality] = useState("1080");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState(null);
  const [fb, setFb] = useState("");
  const [e, setE] = useState("");
  const [dlState, setDlState] = useState({});

  const go = async () => {
    if (!url) return;
    setLoading(true); setE(""); setR(null); setFb("");
    try {
      const res = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "youtube", url, mode, quality }) });
      const d = await res.json();
      if (!res.ok) { setE(d.error || "Gagal ambil video."); if (d.videoId) setFb(d.videoId); onToast?.(d.error || "Gagal", "error"); }
      else { setR(d); onToast?.("Video siap. Klik tombol download.", "success"); }
    } catch { setE("Kesalahan jaringan."); }
    setLoading(false);
  };

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 10 }}>URL VIDEO YOUTUBE</div>
        <div className="row" style={{ marginBottom: 10 }}>
          <button className={`chip ${mode === "video" ? "active" : ""}`} onClick={() => setMode("video")}><I.Video size={12} />Video MP4</button>
          <button className={`chip ${mode === "audio" ? "active" : ""}`} onClick={() => setMode("audio")}><I.Music size={12} />Audio MP3</button>
        </div>
        {mode === "video" && (
          <div className="row" style={{ marginBottom: 10 }}>
            {["360", "720", "1080"].map((q) => (
              <button key={q} className={`chip ${quality === q ? "active" : ""}`} onClick={() => setQuality(q)}>{q}p</button>
            ))}
          </div>
        )}
        <div className="row">
          <input className="inp" style={{ flex: 1, minWidth: 200 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          <button className="btn btn-p" disabled={loading || !url} onClick={go}>
            {loading ? <I.Loader2 size={16} className="spin" /> : <I.Search size={16} />}
            {loading ? "Memproses..." : "Ambil Video"}
          </button>
        </div>
        {e && <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{e}</div>}
      </div>
      {fb && !r && (
        <div className="card">
          <img src={`https://img.youtube.com/vi/${fb}/maxresdefault.jpg`} style={{ width: "100%", borderRadius: 14 }} alt="Thumbnail" />
          <div className="mut" style={{ marginTop: 12 }}>Server sibuk. Klik tombol untuk coba lagi.</div>
          <button className="btn btn-p" style={{ marginTop: 12 }} onClick={go} disabled={loading}><I.RefreshCw size={14} />Coba Lagi</button>
        </div>
      )}
      {r && (
        <div className="card fade">
          <img src={r.thumbnail} style={{ width: "100%", borderRadius: 14 }} alt="Thumbnail" />
          <div style={{ fontWeight: 700, marginTop: 14 }}>{r.title}</div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-p" disabled={dlState["video"] != null && dlState["video"] < 100}
              onClick={() => forceDownload(r.downloadUrl, `${(r.title || "youtube").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.${mode === "audio" ? "mp3" : "mp4"}`, "video", setDlState, onToast)}>
              {dlState["video"] != null && dlState["video"] < 100 ? <><I.Loader2 size={14} className="spin" />{dlState["video"]}%</> : <><I.Download size={14} />Download</>}
            </button>
            <a className="btn btn-s" href={r.downloadUrl} target="_blank" rel="noopener"><I.ExternalLink size={14} />Buka Manual</a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ MEDIA DOWNLOADER ============ */
export function MediaDownloader({ onToast }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState(null);
  const [e, setE] = useState("");
  const [dlState, setDlState] = useState({});

  const go = async () => {
    if (!url) return;
    setLoading(true); setE(""); setR(null); setDlState({});
    try {
      const res = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "media", url }) });
      const d = await res.json();
      if (!res.ok) { setE(d.error || "Gagal ambil media"); onToast?.(d.error || "Gagal", "error"); }
      else { setR(d); onToast?.(`Media ${d.platform} siap`, "success"); }
    } catch { setE("Kesalahan jaringan."); }
    setLoading(false);
  };

  const platforms = [
    { name: "TikTok", icon: "Music" }, { name: "YouTube", icon: "Youtube" },
    { name: "Instagram", icon: "Instagram" }, { name: "Facebook", icon: "Facebook" },
    { name: "X", icon: "Twitter" }, { name: "Pinterest", icon: "Image" },
    { name: "Reddit", icon: "MessageCircle" },
  ];

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 10 }}>URL VIDEO / MEDIA</div>
        <div className="row">
          <input className="inp" style={{ flex: 1, minWidth: 200 }} value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="Paste URL dari platform apa saja..." />
          <button className="btn btn-p" disabled={loading || !url} onClick={go} style={{ minWidth: 120 }}>
            {loading ? <I.Loader2 size={16} className="spin" /> : <I.Search size={16} />}
            {loading ? "Proses..." : "Ambil Media"}
          </button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {platforms.map((p) => {
            const C = I[p.icon] || I.Globe;
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "var(--ps)", borderRadius: 20, fontSize: 11, color: "var(--p)", fontWeight: 600 }}>
                <C size={12} />{p.name}
              </div>
            );
          })}
        </div>
        {e && <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{e}</div>}
      </div>
      {r && (
        <div className="card fade">
          <div className="tag" style={{ marginBottom: 10 }}>PLATFORM: {(r.platform || "").toUpperCase()}</div>
          {r.thumbnail && <img src={r.thumbnail} style={{ width: "100%", borderRadius: 14, maxHeight: 300, objectFit: "cover" }} alt="Preview" />}
          <div style={{ fontWeight: 700, marginTop: 12 }}>{r.title}</div>
          {r.downloadUrl && (
            <button className="btn btn-p" style={{ marginTop: 14, width: "100%" }} disabled={dlState.dl != null && dlState.dl < 100}
              onClick={() => forceDownload(r.downloadUrl, `${(r.title || "media").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.mp4`, "dl", setDlState, onToast)}>
              {dlState.dl != null && dlState.dl < 100 ? <><I.Loader2 size={14} className="spin" />{dlState.dl}%</> : <><I.Download size={14} />Download Media</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============ TERABOX DOWNLOADER ============ */
export function TeraboxDownloader({ onToast }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState(null);
  const [e, setE] = useState("");

  const go = async () => {
    if (!url) return;
    setLoading(true); setE(""); setR(null);
    try {
      const res = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "terabox", url }) });
      const d = await res.json();
      if (!res.ok) { setE(d.error || "Gagal"); onToast?.(d.error || "Gagal", "error"); }
      else { setR(d); onToast?.(`${d.files.length} file ditemukan`, "success"); }
    } catch { setE("Kesalahan jaringan."); }
    setLoading(false);
  };

  const fmtSize = (b) => {
    if (!b) return "-";
    if (b > 1e9) return (b / 1e9).toFixed(2) + " GB";
    if (b > 1e6) return (b / 1e6).toFixed(2) + " MB";
    if (b > 1e3) return (b / 1e3).toFixed(2) + " KB";
    return b + " B";
  };

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 10 }}>URL SHARE TERABOX</div>
        <div className="row">
          <input className="inp" style={{ flex: 1, minWidth: 200 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://terabox.com/s/..." />
          <button className="btn btn-p" disabled={loading || !url} onClick={go}>
            {loading ? <I.Loader2 size={16} className="spin" /> : <I.FolderOpen size={16} />}
            {loading ? "Memproses..." : "Ambil File"}
          </button>
        </div>
        {e && <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{e}</div>}
      </div>
      {r?.files && (
        <div className="card">
          <div className="tag" style={{ marginBottom: 12 }}>{r.files.length} FILE DITEMUKAN</div>
          <div className="col">
            {r.files.map((f, i) => (
              <div key={i} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {f.thumbnail && <img src={f.thumbnail} style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 8 }} alt="" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div className="soft" style={{ marginTop: 4 }}>{fmtSize(f.size)}</div>
                </div>
                <a className="btn btn-p" href={f.download} target="_blank" rel="noopener" style={{ fontSize: 12 }}><I.Download size={12} />Unduh</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ TEMP MAIL ============ */
export function TempMail({ onToast }) {
  const [mailbox, setMailbox] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const create = useCallback(async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true); setErr(""); setCooldown(5);
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "tempmail-create" }) });
      const d = await r.json();
      if (!r.ok || d.error) { setErr(d.error || "Gagal"); onToast?.(d.error || "Gagal", "error"); }
      else {
        setMailbox(d); setMsgs([]); setDetail(null); setNewCount(0);
        localStorage.setItem("alltool-mail-v13", JSON.stringify({ ...d, ts: Date.now() }));
        onToast?.("Email siap", "success");
      }
    } catch { setErr("Kesalahan jaringan"); onToast?.("Kesalahan jaringan", "error"); }
    setLoading(false);
  }, [onToast, cooldown, loading]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const i = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(i);
  }, [cooldown]);

  const inbox = useCallback(async (mb, silent = false) => {
    if (!mb?.token) return;
    if (!silent) setRefreshing(true);
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "tempmail-inbox", token: mb.token }) });
      const d = await r.json();
      const newMsgs = Array.isArray(d) ? d : [];
      setMsgs((prev) => {
        if (newMsgs.length === 0) return prev;
        const map = new Map();
        prev.forEach((m) => map.set(String(m.id), m));
        let added = 0;
        newMsgs.forEach((m) => { if (!map.has(String(m.id))) added++; map.set(String(m.id), m); });
        if (added > 0 && silent) { setNewCount(added); onToast?.(`${added} email baru!`, "success"); }
        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return merged;
      });
      setLastRefresh(new Date());
    } catch {}
    if (!silent) setRefreshing(false);
  }, [onToast]);

  const open = (id) => {
    const msg = msgs.find((m) => String(m.id) === String(id));
    if (msg) setDetail({ ...msg, id });
  };

  const deleteMsg = (id) => {
    setMsgs((prev) => prev.filter((m) => String(m.id) !== String(id)));
    if (detail?.id === id) setDetail(null);
    onToast?.("Pesan dihapus", "info");
  };

  useEffect(() => {
    const s = localStorage.getItem("alltool-mail-v13");
    if (s) {
      try {
        const mb = JSON.parse(s);
        if (mb.ts && Date.now() - mb.ts > 3500000) create();
        else { setMailbox(mb); inbox(mb); }
      } catch { create(); }
    } else create();
  }, [create, inbox]);

  useEffect(() => {
    if (!mailbox || !autoRefresh) return;
    const i = setInterval(() => inbox(mailbox, true), 15000);
    return () => clearInterval(i);
  }, [mailbox, inbox, autoRefresh]);

  const fmtTime = (s) => {
    try { return new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 10 }}>ALAMAT EMAIL SEMENTARA</div>
        {err && <div style={{ marginBottom: 12, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{err}</div>}
        <div className="row">
          <div className="inp" style={{ flex: 1, minWidth: 200, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", background: "var(--ps)", borderColor: "var(--border-strong)" }}>
            {loading && !mailbox ? "Memuat..." : mailbox?.email || "(kosong)"}
          </div>
          <button className="btn btn-s" onClick={() => { copy(mailbox?.email || ""); onToast?.("Email tersalin", "success"); }} disabled={!mailbox}><I.Copy size={14} />Salin</button>
          <button className="btn btn-p" disabled={loading || cooldown > 0} onClick={create}>
            {loading ? <I.Loader2 size={14} className="spin" /> : cooldown > 0 ? <>{cooldown}s</> : <I.RefreshCw size={14} />}
            {cooldown > 0 ? "" : "Baru"}
          </button>
        </div>
        {mailbox && (
          <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
            <div className="soft">Auto 15s {lastRefresh && `• ${lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}</div>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--text-muted)" }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />Auto
            </label>
          </div>
        )}
      </div>
      {detail ? (
        <div className="card fade">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <button className="btn btn-g" onClick={() => setDetail(null)}><I.ArrowLeft size={16} />Kembali</button>
            <button className="btn btn-g" onClick={() => deleteMsg(detail.id)} style={{ color: "var(--red)" }}><I.Trash2 size={16} />Hapus</button>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.4 }}>{detail.subject || "(Tanpa subjek)"}</div>
          <div className="mut" style={{ marginTop: 6 }}><b>Dari:</b> {detail.from?.address}</div>
          {detail.createdAt && <div className="soft" style={{ marginTop: 3 }}>{fmtTime(detail.createdAt)}</div>}
          {detail.html && detail.html.length > 0 && detail.html[0] ? (
            <div style={{ marginTop: 16, padding: 16, border: "1.5px solid var(--border)", borderRadius: 12, fontSize: 13, lineHeight: 1.7, background: "#fff", color: "#0f172a", overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: detail.html[0] }} />
          ) : (
            <div style={{ marginTop: 16, padding: 16, border: "1.5px solid var(--border)", borderRadius: 12, fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.7 }}>{detail.text || "(Tidak ada isi pesan)"}</div>
          )}
        </div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 8 }}>
              <b style={{ fontSize: 16 }}>Kotak Masuk {msgs.length > 0 && `(${msgs.length})`}</b>
              {newCount > 0 && <span className="pill" style={{ background: "var(--green)", color: "#fff" }}>+{newCount} baru</span>}
            </div>
            <button className="btn btn-s" disabled={refreshing} onClick={() => { setNewCount(0); inbox(mailbox); }}>
              {refreshing ? <I.Loader2 size={14} className="spin" /> : <I.RefreshCw size={14} />}Refresh
            </button>
          </div>
          {msgs.length === 0 && !refreshing && (
            <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
              <I.Mail size={44} style={{ margin: "0 auto 12px", opacity: 0.35 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Belum ada email masuk</div>
              <div className="soft" style={{ marginTop: 6 }}>Kirim email ke alamat di atas</div>
            </div>
          )}
          {msgs.map((m) => (
            <div key={m.id} className="card card-int" style={{ position: "relative" }}>
              <button onClick={() => open(m.id)} style={{ textAlign: "left", width: "100%", background: "none", border: "none", padding: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</div>
                    <div className="mut" style={{ marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.from?.address}</div>
                  </div>
                  <div className="soft" style={{ flexShrink: 0, textAlign: "right" }}>{fmtTime(m.createdAt)}</div>
                </div>
              </button>
              <button onClick={(e) => { e.stopPropagation(); deleteMsg(m.id); }} className="btn btn-g" style={{ position: "absolute", top: 8, right: 8, padding: 6, color: "var(--red)" }}><I.X size={14} /></button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ============ KOMIK READER (MangaMint — Indonesia) ============ */
export function KomikReader({ onToast }) {
  const [mode, setMode] = useState("home");
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);

  const loadPopular = async (p = 1) => {
    setLoading(true); setErr(""); setPage(p);
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "manga-popular", page: p }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else setMangaList(d.list || []);
    } catch { setErr("Gagal load manga."); }
    setLoading(false);
  };

  const doSearch = async () => {
    if (!search.trim()) return loadPopular(1);
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "manga-search", q: search }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else setMangaList(d.list || []);
    } catch { setErr("Gagal search."); }
    setLoading(false);
  };

  const openDetail = async (id) => {
    setLoading(true); setErr(""); setMode("detail");
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "manga-detail", id }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else setDetail(d);
    } catch { setErr("Gagal load detail."); }
    setLoading(false);
  };

  const openChapter = async (id) => {
    setLoading(true); setErr(""); setMode("reader");
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "manga-chapter", id }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      else setChapter(d);
    } catch { setErr("Gagal load chapter."); }
    setLoading(false);
  };

  useEffect(() => { loadPopular(1); }, []);

  /* READER MODE */
  if (mode === "reader" && chapter) {
    return (
      <div className="col">
        <div className="card" style={{ position: "sticky", top: 70, zIndex: 10, padding: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <button className="btn btn-g" onClick={() => { setMode("detail"); setChapter(null); }}>
              <I.ArrowLeft size={16} />Kembali
            </button>
            <div className="soft">{chapter.pages} halaman</div>
          </div>
        </div>
        {loading && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <I.Loader2 size={32} className="spin" style={{ color: "var(--p)", margin: "0 auto" }} />
            <div className="mut" style={{ marginTop: 12 }}>Memuat halaman...</div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {chapter.images?.map((img, i) => (
            <img key={i} src={img} alt={`page-${i + 1}`} loading="lazy" referrerPolicy="no-referrer" style={{ width: "100%", maxWidth: 800, display: "block", margin: "0 auto", background: "#000" }} />
          ))}
        </div>
        {chapter.nav && (chapter.nav.prev || chapter.nav.next) && (
          <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
            {chapter.nav.prev ? (
              <button className="btn btn-s" onClick={() => openChapter(chapter.nav.prev)}>
                <I.ArrowLeft size={14} />Sebelumnya
              </button>
            ) : <div />}
            {chapter.nav.next ? (
              <button className="btn btn-p" onClick={() => openChapter(chapter.nav.next)}>
                Selanjutnya<I.ArrowRight size={14} />
              </button>
            ) : <div />}
          </div>
        )}
      </div>
    );
  }

  /* DETAIL MODE */
  if (mode === "detail" && detail) {
    const info = detail.info;
    const chapters = detail.chapters || [];
    return (
      <div className="col">
        <button className="btn btn-g" style={{ alignSelf: "flex-start" }} onClick={() => { setMode("home"); setDetail(null); }}>
          <I.ArrowLeft size={16} />Kembali
        </button>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ position: "relative", minHeight: 220 }}>
            {info.thumb && (
              <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                <img src={info.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.4)", transform: "scale(1.2)" }} referrerPolicy="no-referrer" />
              </div>
            )}
            <div style={{ position: "relative", display: "flex", gap: 16, padding: 20 }}>
              <img src={info.thumb} alt={info.title} referrerPolicy="no-referrer" style={{ width: 120, height: 170, objectFit: "cover", borderRadius: 12, boxShadow: "0 20px 40px rgba(0,0,0,0.5)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, color: "#fff" }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>{info.title}</h2>
                <div className="row" style={{ marginBottom: 8 }}>
                  {info.type && <span className="pill" style={{ fontSize: 10 }}>{info.type}</span>}
                  {info.status && <span className="pill" style={{ fontSize: 10 }}>{info.status}</span>}
                </div>
                {info.rating && (
                  <div className="row" style={{ gap: 6, marginBottom: 6, fontSize: 13, color: "#fff" }}>
                    <I.Star size={14} fill="#fbbf24" color="#fbbf24" />
                    <b>{info.rating}</b>
                  </div>
                )}
                {info.author && (
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    <I.User size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                    {info.author}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {info.genres && info.genres.length > 0 && (
              <>
                <div className="tag" style={{ marginBottom: 8 }}>GENRE</div>
                <div className="row" style={{ marginBottom: 16 }}>
                  {info.genres.map((g, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "4px 10px", background: "var(--ps)", borderRadius: 12, color: "var(--p)", fontWeight: 600 }}>{g}</span>
                  ))}
                </div>
              </>
            )}
            <div className="tag" style={{ marginBottom: 8 }}>SINOPSIS</div>
            <div className="mut" style={{ fontSize: 13, lineHeight: 1.7 }}>{info.desc || "Tidak ada sinopsis."}</div>
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div className="tag">{chapters.length} CHAPTER</div>
          </div>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {chapters.map((c, i) => (
              <button key={c.id || i} onClick={() => openChapter(c.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--border)", textAlign: "left", background: "transparent", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || `Chapter ${i + 1}`}</div>
                  {c.date && <div className="soft" style={{ marginTop: 3 }}>{c.date}</div>}
                </div>
                <I.ChevronRight size={16} style={{ color: "var(--p)", flexShrink: 0 }} />
              </button>
            ))}
            {chapters.length === 0 && (<div className="mut" style={{ textAlign: "center", padding: 30 }}>Belum ada chapter</div>)}
          </div>
        </div>
      </div>
    );
  }

  /* HOME MODE */
  return (
    <div className="col">
      <div className="card">
        <div className="row">
          <input className="inp" style={{ flex: 1 }} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Cari manga, manhwa, atau manhua..." />
          <button className="btn btn-p" onClick={doSearch} disabled={loading}>
            {loading ? <I.Loader2 size={14} className="spin" /> : <I.Search size={14} />}Cari
          </button>
        </div>
      </div>

      {err && (
        <div className="card" style={{ color: "var(--red)", textAlign: "center", padding: 20 }}>
          <I.AlertCircle size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <div>{err}</div>
          <button className="btn btn-s" style={{ marginTop: 12 }} onClick={() => loadPopular(1)}>Coba Lagi</button>
        </div>
      )}

      {loading && mangaList.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <I.Loader2 size={36} className="spin" style={{ color: "var(--p)", margin: "0 auto" }} />
          <div className="mut" style={{ marginTop: 12 }}>Memuat komik...</div>
        </div>
      )}

      {mangaList.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {mangaList.map((m) => (
              <div key={m.id} onClick={() => openDetail(m.id)} style={{ cursor: "pointer", borderRadius: 14, overflow: "hidden", background: "var(--card-solid)", border: "1px solid var(--border)", transition: "all 0.2s" }}>
                <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", background: "var(--ps)" }}>
                  {m.thumb ? (
                    <img src={m.thumb} alt={m.title} loading="lazy" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <I.BookOpen size={32} style={{ opacity: 0.3 }} />
                    </div>
                  )}
                  {m.type && (
                    <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", borderRadius: 6, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 9, fontWeight: 700 }}>
                      {m.type.toUpperCase()}
                    </div>
                  )}
                  {m.chapter && (
                    <div style={{ position: "absolute", bottom: 8, right: 8, padding: "3px 8px", borderRadius: 6, background: "var(--p)", color: "#fff", fontSize: 9, fontWeight: 700 }}>
                      {m.chapter}
                    </div>
                  )}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 32 }}>
                    {m.title}
                  </div>
                  {m.updated && (<div className="soft" style={{ marginTop: 6, fontSize: 10 }}>{m.updated}</div>)}
                </div>
              </div>
            ))}
          </div>

          <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
            <button className="btn btn-s" disabled={page <= 1 || loading} onClick={() => loadPopular(page - 1)}>
              <I.ArrowLeft size={14} />Sebelumnya
            </button>
            <div className="pill">Halaman {page}</div>
            <button className="btn btn-p" disabled={loading} onClick={() => loadPopular(page + 1)}>
              Selanjutnya<I.ArrowRight size={14} />
            </button>
          </div>
        </>
      )}

      {mangaList.length === 0 && !loading && !err && (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <I.BookOpen size={48} style={{ opacity: 0.3, margin: "0 auto 12px" }} />
          <div className="mut">Tidak ada komik ditemukan</div>
        </div>
      )}
    </div>
  );
}

/* ============ AI CHAT ============ */
export function AIChat({ onToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [showSettings, setShowSettings] = useState(false);
  const [keys, setKeys] = useState({});
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setModel(getStoredModel());
    setKeys(getStoredKeys());
    setHistory(getStoredHistory());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeModel = AI_MODELS.find((m) => m.id === model) || AI_MODELS[0];
  const activeProvider = PROVIDERS[activeModel.provider];

  const changeModel = (m) => {
    setModel(m); setStoredModel(m);
    onToast?.(`Model: ${AI_MODELS.find((x) => x.id === m)?.name}`, "success");
  };

  const updateKey = (provider, value) => {
    const newKeys = { ...keys, [provider]: value };
    setKeys(newKeys); saveStoredKeys(newKeys);
  };

  const clearChat = () => { setMessages([]); onToast?.("Chat dibersihkan", "info"); };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const apiKey = keys[activeModel.provider] || "";
    if (!apiKey) {
      onToast?.(`API key ${activeProvider.name} belum diatur.`, "error");
      setShowSettings(true);
      return;
    }

    const userMsg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    const contextMsgs = [{ role: "system", content: SYSTEM_PROMPT }, ...newMsgs.slice(-10)];

    try {
      const r = await fetch("/api", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai-chat", messages: contextMsgs, model, provider: activeModel.provider, apiKey }),
      });
      const d = await r.json();
      if (d.error) {
        onToast?.(d.error, "error");
        setMessages([...newMsgs, { role: "assistant", content: `Error: ${d.error}`, error: true }]);
      } else {
        const aiMsg = { role: "assistant", content: d.content };
        setMessages([...newMsgs, aiMsg]);
        const newHistory = [...history, { model, user: text.slice(0, 100), ai: d.content.slice(0, 200), ts: Date.now() }];
        setHistory(newHistory.slice(-30));
        saveStoredHistory(newHistory.slice(-30));
      }
    } catch (e) {
      onToast?.("Gagal kirim pesan", "error");
      setMessages([...newMsgs, { role: "assistant", content: "Kesalahan jaringan.", error: true }]);
    }
    setLoading(false);
  };

  const groupedModels = AI_MODELS.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  return (
    <div className="col">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row" style={{ gap: 10 }}>
            <div className="ic" style={{ width: 40, height: 40, background: "linear-gradient(135deg, var(--p), var(--ph))", color: "#fff", border: "none" }}>
              <I.Bot size={20} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{activeModel.name}</div>
              <div className="soft">{activeProvider.name} {keys[activeModel.provider] ? "• Key aktif" : "• Belum ada key"}</div>
            </div>
          </div>
          <div className="row">
            <button className="btn btn-g" onClick={() => setShowHistory(!showHistory)}><I.Clock size={16} /></button>
            <button className="btn btn-g" onClick={clearChat}><I.Trash2 size={16} /></button>
            <button className="btn btn-g" onClick={() => setShowSettings(!showSettings)} style={{ color: !keys[activeModel.provider] ? "var(--red)" : "inherit" }}><I.Settings size={16} /></button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="card fade">
          <div className="tag" style={{ marginBottom: 12 }}>API KEY PROVIDER</div>
          <p className="mut" style={{ fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>Semua provider di bawah ini <b>GRATIS</b>. Daftar di web resmi untuk dapat API key.</p>
          {Object.values(PROVIDERS).map((p) => (
            <div key={p.id} style={{ marginBottom: 16, padding: 14, border: "1.5px solid var(--border)", borderRadius: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name} {keys[p.id] && <span style={{ color: "var(--green)", fontSize: 11 }}>OK</span>}</div>
                  <div className="soft" style={{ marginTop: 2 }}>{p.desc}</div>
                </div>
                <a href={p.keyUrl} target="_blank" rel="noopener" className="btn btn-s" style={{ fontSize: 11, padding: "6px 10px" }}><I.ExternalLink size={12} />Daftar</a>
              </div>
              <div className="row">
                <input className="inp" type="password" style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }} value={keys[p.id] || ""} onChange={(e) => updateKey(p.id, e.target.value)} placeholder={p.keyPlaceholder} />
                {keys[p.id] && <button className="btn btn-g" onClick={() => updateKey(p.id, "")} style={{ color: "var(--red)" }}><I.Trash2 size={14} /></button>}
              </div>
            </div>
          ))}

          <div className="tag" style={{ marginTop: 20, marginBottom: 12 }}>PILIH MODEL</div>
          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider} style={{ marginBottom: 14 }}>
              <div className="soft" style={{ marginBottom: 8, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>{PROVIDERS[provider]?.name}</div>
              <div className="col">
                {models.map((m) => (
                  <button key={m.id} onClick={() => changeModel(m.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 10, border: `1.5px solid ${model === m.id ? "var(--p)" : "var(--border)"}`, background: model === m.id ? "var(--ps)" : "transparent", textAlign: "left", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                      <div className="soft" style={{ marginTop: 3 }}>{m.desc}</div>
                    </div>
                    {model === m.id && <I.Check size={16} style={{ color: "var(--p)" }} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="card fade">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div className="tag">RIWAYAT ({history.length})</div>
            <button className="btn btn-g" onClick={() => { setHistory([]); saveStoredHistory([]); onToast?.("Riwayat dihapus", "info"); }} style={{ color: "var(--red)", fontSize: 11 }}><I.Trash2 size={12} />Hapus</button>
          </div>
          <div className="col" style={{ maxHeight: 300, overflowY: "auto" }}>
            {[...history].reverse().map((h, i) => (
              <div key={i} style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.user}</div>
                <div className="soft" style={{ marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.ai}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              <div className="ic" style={{ width: 60, height: 60, background: "linear-gradient(135deg, var(--p), var(--ph))", color: "#fff", border: "none", margin: "0 auto 16px" }}><I.Sparkles size={28} /></div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>Halo! Saya AllTool Assistant</div>
              <div className="mut" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>Tanya apa saja tentang AllTool.</div>
              {!keys[activeModel.provider] && (
                <div style={{ marginTop: 16, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", color: "var(--red)", fontSize: 12, maxWidth: 400, margin: "16px auto 0" }}>
                  <b>Setup dulu:</b> Klik ikon Settings di atas untuk input API key {activeProvider.name} (gratis).
                </div>
              )}
              <div className="row" style={{ marginTop: 20, justifyContent: "center" }}>
                {["Apa saja fitur AllTool?", "Cara download TikTok?", "Bagaimana pakai Virus Scanner?", "Apa itu Temp Mail?"].map((q) => (
                  <button key={q} className="chip" onClick={() => setInput(q)} style={{ fontSize: 11 }}>{q}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role === "user" ? "user" : "ai"}`}>
              <div className="chat-avatar">{m.role === "user" ? <I.User size={16} /> : <I.Bot size={16} />}</div>
              <div className="chat-bubble" style={m.error ? { borderLeft: "3px solid var(--red)" } : {}}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg ai">
              <div className="chat-avatar"><I.Bot size={16} /></div>
              <div className="chat-bubble" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span className="pulse">●</span>
                <span className="pulse" style={{ animationDelay: "0.2s" }}>●</span>
                <span className="pulse" style={{ animationDelay: "0.4s" }}>●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area">
          <textarea className="txa" rows={1} style={{ minHeight: 44, maxHeight: 120, resize: "none" }} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Ketik pesan... (Enter kirim)" />
          <button className="btn btn-p" onClick={sendMessage} disabled={loading || !input.trim()} style={{ minWidth: 44, padding: "10px 14px" }}>
            {loading ? <I.Loader2 size={16} className="spin" /> : <I.Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ APK COMPILER ============ */
export function ApkCompiler({ onToast }) {
  const [method, setMethod] = useState("pwabuilder");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [pkg, setPkg] = useState("com.alltool.app");
  const [version, setVersion] = useState("1.0.0");
  const [theme, setTheme] = useState("#7c3aed");
  const [htmlCode, setHtmlCode] = useState("");
  const [uploaded, setUploaded] = useState("");

  const valid = url.startsWith("http") && name.length >= 2;
  const validHtml = htmlCode.length > 20 && name.length >= 2;

  const openPwaBuilder = () => { if (!valid) return; copy(url); onToast?.("URL dicopy", "success"); window.open(`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(url)}`, "_blank", "noopener"); };
  const openAppsGeyser = () => { if (!valid) return; copy(url); onToast?.("URL dicopy", "success"); window.open("https://appsgeyser.com/create/", "_blank", "noopener"); };
  const openWebIntoApp = () => { if (!valid) return; copy(url); onToast?.("URL dicopy", "success"); window.open(`https://www.webintoapp.com/store/start.php?url=${encodeURIComponent(url)}`, "_blank", "noopener"); };

  const generateManifest = () => {
    if (!valid) return;
    const manifest = { name, short_name: name.slice(0, 12), start_url: url, display: "standalone", background_color: "#0a0a14", theme_color: theme, icons: [{ src: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=192&background=${theme.slice(1)}&color=fff`, sizes: "192x192", type: "image/png" }, { src: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=512&background=${theme.slice(1)}&color=fff`, sizes: "512x512", type: "image/png" }] };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = u; a.download = "manifest.json"; a.click(); URL.revokeObjectURL(u);
    onToast?.("manifest.json terunduh", "success");
  };

  const downloadAndroidProject = () => {
    if (!validHtml) return;
    const safe = name.replace(/[^a-zA-Z0-9]/g, "");
    const files = {
      "README.md": `# ${name}\n\nBuild via Android Studio atau GitHub Actions.\n\nPackage: ${pkg}\nVersion: ${version}\n`,
      "app/src/main/assets/index.html": htmlCode,
      "app/src/main/AndroidManifest.xml": `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${pkg}">\n<uses-permission android:name="android.permission.INTERNET" />\n<application android:label="${name}" android:usesCleartextTraffic="true" android:theme="@android:style/Theme.NoTitleBar">\n<activity android:name=".MainActivity" android:exported="true">\n<intent-filter><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent-filter>\n</activity></application></manifest>`,
      [`app/src/main/java/${pkg.replace(/\./g, "/")}/MainActivity.java`]: `package ${pkg};\n\nimport android.os.Bundle;\nimport android.webkit.WebView;\nimport android.webkit.WebViewClient;\nimport android.webkit.WebSettings;\nimport android.app.Activity;\n\npublic class MainActivity extends Activity {\n  private WebView webView;\n  @Override protected void onCreate(Bundle s) {\n    super.onCreate(s);\n    webView = new WebView(this);\n    WebSettings ws = webView.getSettings();\n    ws.setJavaScriptEnabled(true);\n    ws.setDomStorageEnabled(true);\n    webView.setWebViewClient(new WebViewClient());\n    webView.loadUrl("file:///android_asset/index.html");\n    setContentView(webView);\n  }\n  @Override public void onBackPressed() { if (webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }\n}`,
      "app/build.gradle": `plugins { id 'com.android.application' }\nandroid { namespace '${pkg}'\ncompileSdk 34\ndefaultConfig { applicationId "${pkg}"; minSdk 21; targetSdk 34; versionCode 1; versionName "${version}" }\ncompileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }\n}`,
      "build.gradle": `buildscript { repositories { google(); mavenCentral() } dependencies { classpath 'com.android.tools.build:gradle:8.1.0' } }\nallprojects { repositories { google(); mavenCentral() } }`,
      "settings.gradle": `include ':app'\nrootProject.name = "${safe}"`,
      "gradle.properties": `android.useAndroidX=true\norg.gradle.jvmargs=-Xmx2048m`,
      ".github/workflows/build.yml": `name: Build APK\non:\n  push:\n    branches: [ main ]\n  workflow_dispatch:\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - uses: actions/setup-java@v3\n        with:\n          distribution: 'temurin'\n          java-version: '17'\n      - uses: gradle/gradle-build-action@v2\n      - run: gradle assembleDebug\n      - uses: actions/upload-artifact@v3\n        with:\n          name: app-debug\n          path: app/build/outputs/apk/debug/app-debug.apk`,
    };
    import("jszip").then(({ default: JSZip }) => {
      const zip = new JSZip();
      Object.entries(files).forEach(([path, content]) => zip.file(path, content));
      zip.generateAsync({ type: "blob" }).then((blob) => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = u; a.download = `${safe}_android_project.zip`; a.click(); URL.revokeObjectURL(u);
        onToast?.("Project terunduh", "success");
      });
    });
  };

  const handleFile = (f) => {
    const r = new FileReader();
    r.onload = () => {
      const text = String(r.result);
      setHtmlCode(text); setUploaded(f.name);
      onToast?.(`File ${f.name} dimuat`, "success");
      const m = text.match(/<title>(.+?)<\/title>/i);
      if (m && !name) setName(m[1]);
    };
    r.readAsText(f);
  };

  const methods = [
    { id: "pwabuilder", name: "PWABuilder", desc: "Microsoft. Kualitas terbaik.", iconName: "Building2" },
    { id: "appsgeyser", name: "AppsGeyser", desc: "Paling simpel, cepat.", iconName: "Zap" },
    { id: "webintoapp", name: "WebIntoApp", desc: "Support HTML upload.", iconName: "Rocket" },
    { id: "manual", name: "Build Manual (ZIP)", desc: "Download source Android project.", iconName: "Terminal" },
  ];

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 12 }}>PILIH METODE</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {methods.map((m) => {
            const Icon = I[m.iconName] || I.Wrench;
            return (
              <button key={m.id} onClick={() => setMethod(m.id)} className="card card-int" style={{ textAlign: "left", border: method === m.id ? "1.5px solid var(--p)" : "1px solid var(--border)" }}>
                <div className="ic" style={{ marginBottom: 10 }}><Icon size={20} /></div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</div>
                <div className="mut" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
      {(method === "pwabuilder" || method === "appsgeyser" || method === "webintoapp") && (
        <div className="card">
          <div className="tag" style={{ marginBottom: 12 }}>KONFIGURASI</div>
          <div className="col">
            <div><div className="tag" style={{ marginBottom: 6 }}>URL WEBSITE</div><input className="inp" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" /></div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div><div className="tag" style={{ marginBottom: 6 }}>NAMA APLIKASI</div><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" /></div>
              <div><div className="tag" style={{ marginBottom: 6 }}>WARNA TEMA</div><input type="color" value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: "100%", height: 44, border: "none", borderRadius: 11, cursor: "pointer" }} /></div>
            </div>
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            {method === "pwabuilder" && <button className="btn btn-p" disabled={!valid} onClick={openPwaBuilder}><I.ExternalLink size={14} />Buka PWABuilder</button>}
            {method === "appsgeyser" && <button className="btn btn-p" disabled={!valid} onClick={openAppsGeyser}><I.ExternalLink size={14} />Buka AppsGeyser</button>}
            {method === "webintoapp" && <button className="btn btn-p" disabled={!valid} onClick={openWebIntoApp}><I.ExternalLink size={14} />Buka WebIntoApp</button>}
            <button className="btn btn-s" disabled={!valid} onClick={generateManifest}><I.Download size={14} />Download manifest.json</button>
          </div>
        </div>
      )}
      {method === "manual" && (
        <>
          <div className="card">
            <div className="tag" style={{ marginBottom: 12 }}>UPLOAD ATAU PASTE HTML</div>
            <input type="file" className="inp" accept=".html,.htm,text/html" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {uploaded && <div className="mut" style={{ marginTop: 8 }}>File: {uploaded}</div>}
            <textarea className="txa" style={{ marginTop: 12 }} rows={10} value={htmlCode} onChange={(e) => setHtmlCode(e.target.value)} placeholder="<!DOCTYPE html>..." />
          </div>
          <div className="card">
            <div className="tag" style={{ marginBottom: 12 }}>IDENTITAS APLIKASI</div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div><div className="tag" style={{ marginBottom: 6 }}>NAMA</div><input className="inp" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><div className="tag" style={{ marginBottom: 6 }}>PACKAGE NAME</div><input className="inp" value={pkg} onChange={(e) => setPkg(e.target.value)} /></div>
              <div><div className="tag" style={{ marginBottom: 6 }}>VERSION</div><input className="inp" value={version} onChange={(e) => setVersion(e.target.value)} /></div>
              <div><div className="tag" style={{ marginBottom: 6 }}>WARNA TEMA</div><input type="color" value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: "100%", height: 44, border: "none", borderRadius: 11, cursor: "pointer" }} /></div>
            </div>
            <button className="btn btn-p" style={{ marginTop: 16 }} disabled={!validHtml} onClick={downloadAndroidProject}><I.Download size={14} />Download Project (.zip)</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============ COLOR PICKER ============ */
export function ColorPicker({ onToast }) {
  const [c, setC] = useState("#7c3aed");
  const h2r = (h) => { const x = h.replace("#", ""); return { r: parseInt(x.slice(0, 2), 16) || 0, g: parseInt(x.slice(2, 4), 16) || 0, b: parseInt(x.slice(4, 6), 16) || 0 }; };
  const r2h = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };
  const rgb = h2r(c); const hsl = r2h(rgb.r, rgb.g, rgb.b);
  const fmts = [["HEX", c.toUpperCase()], ["RGB", `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`], ["HSL", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`]];
  const pal = ["#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#f43f5e", "#1e293b", "#334155", "#64748b", "#94a3b8"];
  return (
    <div className="col">
      <div className="card">
        <div className="row" style={{ gap: 20 }}>
          <input type="color" value={c} onChange={(e) => setC(e.target.value)} style={{ width: 90, height: 90, border: "none", borderRadius: 16, cursor: "pointer", boxShadow: "var(--shadow-lg)" }} />
          <input className="inp" style={{ flex: 1, minWidth: 150, fontFamily: "monospace", fontSize: 16 }} value={c} onChange={(e) => setC(e.target.value)} />
        </div>
        <div className="col" style={{ marginTop: 16 }}>
          {fmts.map(([n, v]) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, border: "1.5px solid var(--border)", borderRadius: 12 }}>
              <div><div className="mut">{n}</div><div style={{ fontFamily: "monospace", fontSize: 15, marginTop: 3 }}>{v}</div></div>
              <button className="btn btn-g" onClick={() => { copy(v); onToast?.(`${n} tersalin`, "success"); }}><I.Copy size={16} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="tag" style={{ marginBottom: 12 }}>PALET CEPAT</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
          {pal.map((x) => <button key={x} onClick={() => setC(x)} style={{ aspectRatio: 1, background: x, borderRadius: 14, cursor: "pointer", boxShadow: "var(--shadow)", border: "1px solid var(--border)" }} />)}
        </div>
      </div>
    </div>
  );
}

/* ============ TEXT TO SPEECH ============ */
export function TextToSpeech() {
  const [t, setT] = useState("");
  const [voices, setVoices] = useState([]);
  const [v, setV] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const up = () => { const x = window.speechSynthesis.getVoices(); setVoices(x); if (x.length && !v) setV(x[0].name); };
    up();
    window.speechSynthesis.onvoiceschanged = up;
    return () => window.speechSynthesis.cancel();
  }, [v]);
  const speak = () => { if (!t) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); const voice = voices.find((x) => x.name === v); if (voice) u.voice = voice; u.rate = rate; u.pitch = pitch; u.onend = () => setPlaying(false); u.onstart = () => setPlaying(true); window.speechSynthesis.speak(u); };
  const stop = () => { window.speechSynthesis.cancel(); setPlaying(false); };
  return (
    <div className="col">
      <textarea className="txa" rows={6} value={t} onChange={(e) => setT(e.target.value)} placeholder="Teks untuk diucapkan..." />
      <div className="card">
        <div className="tag" style={{ marginBottom: 6 }}>SUARA</div>
        <select className="inp" value={v} onChange={(e) => setV(e.target.value)}>
          {voices.map((x) => <option key={x.name} value={x.name}>{x.name} ({x.lang})</option>)}
        </select>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
          <div><div className="tag" style={{ marginBottom: 6 }}>KECEPATAN: {rate.toFixed(1)}x</div><input type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(e) => setRate(+e.target.value)} style={{ width: "100%", accentColor: "var(--p)" }} /></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>NADA: {pitch.toFixed(1)}</div><input type="range" min={0.5} max={2} step={0.1} value={pitch} onChange={(e) => setPitch(+e.target.value)} style={{ width: "100%", accentColor: "var(--p)" }} /></div>
        </div>
      </div>
      <div className="row">
        <button className="btn btn-p" disabled={!t || playing} onClick={speak}><I.Play size={14} />Putar</button>
        <button className="btn btn-s" disabled={!playing} onClick={stop}><I.Square size={14} />Stop</button>
      </div>
    </div>
  );
}

/* ============ IP LOOKUP ============ */
export function IpLookup({ onToast }) {
  const [ip, setIp] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [e, setE] = useState("");
  const go = async (target = "") => {
    setLoading(true); setE(""); setData(null);
    try {
      const r = await fetch("/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ip-lookup", ip: target }) });
      const d = await r.json();
      if (d.error) { setE(d.reason || "Tidak ditemukan"); onToast?.("IP tidak ditemukan", "error"); }
      else { setData(d); onToast?.("Info IP diambil", "success"); }
    } catch { setE("Gagal"); }
    setLoading(false);
  };
  useEffect(() => { go(); }, []);
  const rows = [["IP", "ip"], ["Kota", "city"], ["Region", "region"], ["Negara", "country_name"], ["Kode Negara", "country_code"], ["Kode Pos", "postal"], ["Latitude", "latitude"], ["Longitude", "longitude"], ["Zona Waktu", "timezone"], ["ISP", "org"], ["ASN", "asn"]];
  return (
    <div className="col">
      <div className="card">
        <div className="row">
          <input className="inp" style={{ flex: 1, minWidth: 200, fontFamily: "monospace" }} value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Kosongkan untuk IP Anda..." />
          <button className="btn btn-p" disabled={loading} onClick={() => go(ip)}>
            {loading ? <I.Loader2 size={14} className="spin" /> : <I.Globe size={14} />}Cek IP
          </button>
        </div>
        {e && <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{e}</div>}
      </div>
      {data && <div className="card">
        {rows.map(([l, k]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <span className="mut">{l}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{String(data[k] ?? "-")}</span>
          </div>
        ))}
      </div>}
    </div>
  );
              }

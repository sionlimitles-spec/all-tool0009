"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as I from "lucide-react";

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

const slugify = (s) => s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

/* ============ TEXT TOOLS ============ */
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
        {stats.map(([l, v]) => (
          <div key={l} className="card"><div className="stat">{v}</div><div className="mut" style={{ marginTop: 6 }}>{l}</div></div>
        ))}
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
    ["aLtErNaTiNg", (s) => s.split("").map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join("")],
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
    if (type === "sentences") return setOut(Array.from({ length: n }, () => Array.from({ length: 10 + Math.floor(Math.random() * 8) }, r).join(" ").replace(/^\w/, (c) => c.toUpperCase()) + ".").join(" "));
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

export function TextDiff() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const A = a.split("\n"), B = b.split("\n");
  const max = Math.max(A.length, B.length);
  return (
    <div className="col">
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <textarea className="txa" rows={8} value={a} onChange={(e) => setA(e.target.value)} placeholder="Teks pertama..." />
        <textarea className="txa" rows={8} value={b} onChange={(e) => setB(e.target.value)} placeholder="Teks kedua..." />
      </div>
      {(a || b) && (
        <div className="card" style={{ fontFamily: "monospace", fontSize: 12 }}>
          {Array.from({ length: max }, (_, i) => {
            const same = A[i] === B[i];
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "3px 0" }}>
                <span style={{ background: same ? "transparent" : "rgba(239,68,68,0.12)", color: same ? "var(--text)" : "var(--red)", padding: "3px 8px", borderRadius: 6 }}>{A[i] || " "}</span>
                <span style={{ background: same ? "transparent" : "rgba(34,197,94,0.12)", color: same ? "var(--text)" : "var(--green)", padding: "3px 8px", borderRadius: 6 }}>{B[i] || " "}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RemoveDuplicates() {
  const [t, setT] = useState("");
  const [out, setOut] = useState("");
  const [ci, setCi] = useState(true);
  const [sort, setSort] = useState(false);
  const go = () => {
    const seen = new Set(), r = [];
    for (const line of t.split("\n")) { const k = ci ? line : line.toLowerCase(); if (!seen.has(k)) { seen.add(k); r.push(line); } }
    if (sort) r.sort();
    setOut(r.join("\n"));
  };
  const removed = t && out ? t.split("\n").length - out.split("\n").length : 0;
  return (
    <div className="col">
      <textarea className="txa" rows={8} value={t} onChange={(e) => setT(e.target.value)} placeholder="Satu item per baris..." />
      <div className="row">
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={ci} onChange={(e) => setCi(e.target.checked)} />Case sensitive</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} />Urutkan</label>
        <button className="btn btn-p" onClick={go}>Proses</button>
        {out && <button className="btn btn-s" onClick={() => copy(out)}>Copy</button>}
      </div>
      {out && <><div className="mut">{removed} baris duplikat dihapus</div><textarea className="txa" rows={8} value={out} readOnly /></>}
    </div>
  );
}

export function TextRepeater() {
  const [t, setT] = useState("");
  const [n, setN] = useState(5);
  const [sep, setSep] = useState("\n");
  const [out, setOut] = useState("");
  return (
    <div className="col">
      <textarea className="txa" rows={4} value={t} onChange={(e) => setT(e.target.value)} placeholder="Teks yang akan diulang..." />
      <div className="row">
        <div style={{ width: 90 }}><div className="tag" style={{ marginBottom: 6 }}>Jumlah</div><input type="number" className="inp" value={n} onChange={(e) => setN(+e.target.value)} min={1} max={500} /></div>
        <div style={{ width: 150 }}><div className="tag" style={{ marginBottom: 6 }}>Pemisah</div><select className="inp" value={sep} onChange={(e) => setSep(e.target.value)}><option value="\n">Baris baru</option><option value=" ">Spasi</option><option value=", ">Koma</option><option value="">Tanpa</option></select></div>
        <button className="btn btn-p" style={{ alignSelf: "flex-end" }} onClick={() => setOut(Array.from({ length: n }, () => t).join(sep))}>Ulangi</button>
        {out && <button className="btn btn-s" style={{ alignSelf: "flex-end" }} onClick={() => copy(out)}>Copy</button>}
      </div>
      {out && <textarea className="txa" rows={8} value={out} readOnly />}
    </div>
  );
}

export function FancyText() {
  const [t, setT] = useState("Hello World");
  const maps = [
    ["Bold", "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭", "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇"],
    ["Italic", "𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡", "𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻"],
    ["Script", "𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵", "𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏"],
    ["Mono", "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉", "𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣"],
    ["Circle", "ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ", "ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ"],
  ];
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", az = "abcdefghijklmnopqrstuvwxyz";
  const conv = (txt, up, lo) => txt.split("").map((c) => {
    const i = AZ.indexOf(c); if (i >= 0) return up[i];
    const j = az.indexOf(c); if (j >= 0) return lo[j];
    return c;
  }).join("");
  return (
    <div className="col">
      <input className="inp" value={t} onChange={(e) => setT(e.target.value)} />
      {maps.map(([n, up, lo]) => (
        <div key={n} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="tag">{n}</div>
            <div style={{ fontSize: 16, marginTop: 6, wordBreak: "break-all" }}>{conv(t, up, lo)}</div>
          </div>
          <button className="btn btn-g" onClick={() => copy(conv(t, up, lo))}><I.Copy size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function ReverseText() {
  const [t, setT] = useState("");
  const [m, setM] = useState("chars");
  const [out, setOut] = useState("");
  const go = () => m === "chars" ? setOut(t.split("").reverse().join("")) : m === "words" ? setOut(t.split(/\s+/).reverse().join(" ")) : setOut(t.split("\n").reverse().join("\n"));
  return (
    <div className="col">
      <textarea className="txa" rows={5} value={t} onChange={(e) => setT(e.target.value)} />
      <div className="row">
        {[["chars", "Karakter"], ["words", "Kata"], ["lines", "Baris"]].map(([k, l]) => <button key={k} className={`chip ${m === k ? "active" : ""}`} onClick={() => setM(k)}>{l}</button>)}
        <button className="btn btn-p" onClick={go}>Balik</button>
        {out && <button className="btn btn-s" onClick={() => copy(out)}>Copy</button>}
      </div>
      {out && <textarea className="txa" rows={5} value={out} readOnly />}
    </div>
  );
}

export function MarkdownPreview() {
  const [t, setT] = useState("# Halo\n\nIni **markdown** preview.\n\n- Item 1\n- Item 2\n\n`code inline`\n\n```js\nconsole.log('hi');\n```");
  const html = useMemo(() => {
    let h = t
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code style='background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace'>$1</code>")
      .replace(/```([\s\S]*?)```/g, "<pre style='background:#1e293b;color:#e2e8f0;padding:14px;border-radius:10px;overflow-x:auto'><code>$1</code></pre>")
      .replace(/^\- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2' style='color:#7c3aed'>$1</a>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");
    return "<p>" + h + "</p>";
  }, [t]);
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <textarea className="txa" rows={16} value={t} onChange={(e) => setT(e.target.value)} />
      <div className="card" style={{ background: "#fff", color: "#0f172a", fontSize: 14, lineHeight: 1.7, minHeight: 300 }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function SlugGenerator() {
  const [t, setT] = useState("");
  const slug = slugify(t);
  return (
    <div className="col">
      <textarea className="txa" rows={4} value={t} onChange={(e) => setT(e.target.value)} placeholder="Judul artikel..." />
      <div className="card">
        <div className="tag" style={{ marginBottom: 8 }}>SLUG</div>
        <div style={{ fontFamily: "monospace", fontSize: 15, wordBreak: "break-all", color: "var(--p)", fontWeight: 600 }}>{slug || "(kosong)"}</div>
        {slug && <button className="btn btn-p" style={{ marginTop: 12 }} onClick={() => copy(slug)}><I.Copy size={14} />Copy</button>}
      </div>
    </div>
  );
}

/* ============ DEVELOPER TOOLS ============ */
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

export function HtmlEncoder() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  const enc = () => setO(i.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
  const dec = () => { const el = document.createElement("textarea"); el.innerHTML = i; setO(el.value); };
  return (
    <div className="col">
      <textarea className="txa" rows={5} value={i} onChange={(e) => setI(e.target.value)} placeholder="<div>Hello</div>" />
      <div className="row">
        <button className="btn btn-p" onClick={enc}>Encode</button>
        <button className="btn btn-s" onClick={dec}>Decode</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
      </div>
      {o && <textarea className="txa" rows={5} value={o} readOnly />}
    </div>
  );
}

/* ============ HTML EDITOR (LIVE PREVIEW) ============ */
export function HtmlEditor() {
  const [html, setHtml] = useState(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; text-align: center; }
    h1 { color: #7c3aed; }
    button { padding: 10px 20px; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer; }
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
        {tab !== "preview" && (
          <textarea className="txa" rows={22} value={html} onChange={(e) => setHtml(e.target.value)} style={{ fontFamily: "monospace" }} />
        )}
        <iframe className="frame" style={{ minHeight: 500 }} srcDoc={html} sandbox="allow-scripts allow-modals" title="preview" />
      </div>
      <div className="soft">Live preview: setiap perubahan di HTML langsung terlihat di frame kanan.</div>
    </div>
  );
}

/* ============ CSS PLAYGROUND ============ */
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
  const full = `<!DOCTYPE html><html><head><style>body{margin:0;padding:40px;background:#faf5ff;min-height:100vh;display:flex;align-items:center;justify-content:center;}${css}</style></head><body><div class="box">Hello</div></body></html>`;
  return (
    <div className="col">
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <textarea className="txa" rows={18} value={css} onChange={(e) => setCss(e.target.value)} style={{ fontFamily: "monospace" }} />
        <iframe className="frame" style={{ minHeight: 400 }} srcDoc={full} title="css-preview" />
      </div>
    </div>
  );
}

/* ============ HTML/CSS/JS MINIFIER ============ */
export function HtmlMinifier() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  const min = () => {
    const r = i
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .replace(/\s*=\s*/g, "=")
      .trim();
    setO(r);
  };
  return (
    <div className="col">
      <textarea className="txa" rows={10} value={i} onChange={(e) => setI(e.target.value)} placeholder="<div>  <p>  Hello  </p>  </div>" />
      <div className="row">
        <button className="btn btn-p" onClick={min}>Minify HTML</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
        <span className="soft">{i.length} → {o.length} chars</span>
      </div>
      {o && <textarea className="txa" rows={10} value={o} readOnly />}
    </div>
  );
}

export function CssMinifier() {
  const [i, setI] = useState("");
  const [o, setO] = useState("");
  const min = () => {
    const r = i.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{};:,])\s*/g, "$1").trim();
    setO(r);
  };
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
  const min = () => {
    const r = i
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{};,:+\-*/=<>!&|?()\[\]])\s*/g, "$1")
      .trim();
    setO(r);
  };
  return (
    <div className="col">
      <textarea className="txa" rows={10} value={i} onChange={(e) => setI(e.target.value)} placeholder="function hello() { console.log('hi'); }" />
      <div className="row">
        <button className="btn btn-p" onClick={min}>Minify JS</button>
        {o && <button className="btn btn-s" onClick={() => copy(o)}>Copy</button>}
        <span className="soft">{i.length} → {o.length} chars</span>
      </div>
      {o && <textarea className="txa" rows={10} value={o} readOnly />}
      <div className="soft">Catatan: Minifier sederhana, tidak menghilangkan semua karakter. Test dulu sebelum pakai produksi.</div>
    </div>
  );
}

export function JwtDecoder() {
  const [t, setT] = useState("");
  const [h, setH] = useState("");
  const [p, setP] = useState("");
  const [e, setE] = useState("");
  const go = () => {
    try {
      const parts = t.split(".");
      if (parts.length < 2) throw new Error("Format JWT tidak valid");
      const d = (x) => JSON.parse(atob(x.replace(/-/g, "+").replace(/_/g, "/")));
      setH(JSON.stringify(d(parts[0]), null, 2));
      setP(JSON.stringify(d(parts[1]), null, 2));
      setE("");
    } catch (err) { setE(err.message); setH(""); setP(""); }
  };
  return (
    <div className="col">
      <textarea className="txa" rows={3} value={t} onChange={(e) => setT(e.target.value)} placeholder="eyJhbGci..." />
      <button className="btn btn-p" style={{ alignSelf: "flex-start" }} onClick={go}>Decode</button>
      {e && <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{e}</div>}
      {h && <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div><div className="tag" style={{ marginBottom: 6 }}>HEADER</div><textarea className="txa" rows={10} value={h} readOnly /></div>
        <div><div className="tag" style={{ marginBottom: 6 }}>PAYLOAD</div><textarea className="txa" rows={10} value={p} readOnly /></div>
      </div>}
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

export function UuidGenerator() {
  const [n, setN] = useState(5);
  const [up, setUp] = useState(false);
  const [nd, setNd] = useState(false);
  const [list, setList] = useState([]);
  const go = () => {
    const a = [];
    for (let i = 0; i < n; i++) {
      let u = crypto.randomUUID();
      if (nd) u = u.replace(/-/g, "");
      if (up) u = u.toUpperCase();
      a.push(u);
    }
    setList(a);
  };
  useEffect(() => { go(); }, []);
  return (
    <div className="col">
      <div className="card">
        <div className="row">
          <div style={{ width: 100 }}><div className="tag" style={{ marginBottom: 6 }}>Jumlah</div><input type="number" className="inp" value={n} onChange={(e) => setN(+e.target.value)} min={1} max={100} /></div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, alignSelf: "flex-end" }}><input type="checkbox" checked={up} onChange={(e) => setUp(e.target.checked)} />Uppercase</label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, alignSelf: "flex-end" }}><input type="checkbox" checked={nd} onChange={(e) => setNd(e.target.checked)} />Tanpa strip</label>
          <button className="btn btn-p" style={{ alignSelf: "flex-end" }} onClick={go}>Generate</button>
          {list.length > 0 && <button className="btn btn-s" style={{ alignSelf: "flex-end" }} onClick={() => copy(list.join("\n"))}>Copy Semua</button>}
        </div>
      </div>
      <div className="col">
        {list.map((u, i) => (
          <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", flex: 1 }}>{u}</span>
            <button className="btn btn-g" onClick={() => copy(u)}><I.Copy size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegexTester() {
  const [p, setP] = useState("");
  const [f, setF] = useState("g");
  const [t, setT] = useState("");
  const { matches, err, hl } = useMemo(() => {
    if (!p) return { matches: [], err: "", hl: t };
    try {
      const re = new RegExp(p, f);
      const m = t.match(re);
      const re2 = new RegExp(p, f.includes("g") ? f : f + "g");
      const hl = t.replace(re2, (x) => `<mark style="background:var(--p);color:#fff;border-radius:4px;padding:1px 4px">${x}</mark>`);
      return { matches: m ? Array.from(m) : [], err: "", hl };
    } catch (e) { return { matches: [], err: e.message, hl: t }; }
  }, [p, f, t]);
  return (
    <div className="col">
      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div><div className="tag" style={{ marginBottom: 6 }}>PATTERN</div><input className="inp" style={{ fontFamily: "monospace" }} value={p} onChange={(e) => setP(e.target.value)} placeholder="\d+" /></div>
        <div><div className="tag" style={{ marginBottom: 6 }}>FLAGS</div><input className="inp" style={{ fontFamily: "monospace" }} value={f} onChange={(e) => setF(e.target.value)} /></div>
      </div>
      <textarea className="txa" rows={6} value={t} onChange={(e) => setT(e.target.value)} />
      {err && <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{err}</div>}
      {p && !err && <div className="card">
        <div className="tag">HIGHLIGHT ({matches.length} MATCH)</div>
        <div style={{ marginTop: 10, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: hl }} />
      </div>}
    </div>
  );
}

export function TimestampConverter() {
  const [ts, setTs] = useState(String(Math.floor(Date.now() / 1000)));
  const [dt, setDt] = useState(new Date().toISOString().slice(0, 16));
  const toDate = () => { const n = +ts; const d = new Date(n < 1e12 ? n * 1000 : n); return isNaN(d) ? "Invalid" : d.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "long" }); };
  const toTs = () => Math.floor(new Date(dt).getTime() / 1000);
  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 8 }}>TIMESTAMP → TANGGAL</div>
        <input className="inp" style={{ fontFamily: "monospace" }} value={ts} onChange={(e) => setTs(e.target.value)} />
        <div style={{ marginTop: 12, padding: 14, background: "var(--ps)", borderRadius: 11, fontFamily: "monospace", fontSize: 13 }}>{toDate()}</div>
        <button className="btn btn-s" style={{ marginTop: 10 }} onClick={() => setTs(String(Math.floor(Date.now() / 1000)))}>Sekarang</button>
      </div>
      <div className="card">
        <div className="tag" style={{ marginBottom: 8 }}>TANGGAL → TIMESTAMP</div>
        <input type="datetime-local" className="inp" value={dt} onChange={(e) => setDt(e.target.value)} />
        <div style={{ marginTop: 12, padding: 14, background: "var(--ps)", borderRadius: 11, fontFamily: "monospace", fontSize: 13 }}>{toTs()}</div>
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
        {url ? (
          <>
            <img src={url} alt="QR" style={{ borderRadius: 14 }} />
            <a className="btn btn-p" style={{ marginTop: 14 }} href={url} download="qrcode.png"><I.Download size={14} />Unduh</a>
          </>
        ) : (
          <div className="mut" style={{ textAlign: "center" }}>
            <I.QrCode size={48} style={{ opacity: 0.3, margin: "0 auto 10px" }} />
            <div>QR code muncul di sini</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ IMAGE TOOLS ============ */
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

export function ImageToBase64() {
  const [d, setD] = useState("");
  const hf = (f) => { const r = new FileReader(); r.onload = () => setD(String(r.result)); r.readAsDataURL(f); };
  return (
    <div className="col">
      <input type="file" className="inp" accept="image/*" onChange={(e) => e.target.files?.[0] && hf(e.target.files[0])} />
      {d && <><img src={d} style={{ maxHeight: 200, borderRadius: 14, objectFit: "contain" }} />
        <button className="btn btn-p" style={{ alignSelf: "flex-start" }} onClick={() => copy(d)}>Copy Data URI</button>
        <textarea className="txa" rows={6} value={d} readOnly /></>}
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
      {[[`${a}% dari ${b}`, ((a / 100) * b).toFixed(2)], [`${a} berapa % dari ${b}`, ((a / b) * 100).toFixed(2) + "%"], [`Perubahan ${a} → ${b}`, (((b - a) / a) * 100).toFixed(2) + "%"]].map(([l, v]) => (
        <div key={l} className="card"><div className="mut">{l}</div><div className="stat" style={{ marginTop: 6 }}>{v}</div></div>
      ))}
    </div>
  );
}

export function LoanCalculator() {
  const [amt, setAmt] = useState(10000000);
  const [rate, setRate] = useState(10);
  const [y, setY] = useState(3);
  const mr = rate / 100 / 12, mn = y * 12;
  const monthly = mr === 0 ? amt / mn : (amt * mr) / (1 - Math.pow(1 + mr, -mn));
  const total = monthly * mn, interest = total - amt;
  const f = (n) => "Rp " + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 6 }}>JUMLAH PINJAMAN (RP)</div>
        <input type="number" className="inp" value={amt} onChange={(e) => setAmt(+e.target.value)} />
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
          <div><div className="tag" style={{ marginBottom: 6 }}>BUNGA / TAHUN (%)</div><input type="number" step={0.1} className="inp" value={rate} onChange={(e) => setRate(+e.target.value)} /></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>TENOR (TAHUN)</div><input type="number" className="inp" value={y} onChange={(e) => setY(+e.target.value)} /></div>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {[["Cicilan / Bulan", f(monthly)], ["Total Bayar", f(total)], ["Total Bunga", f(interest)]].map(([l, v]) => (
          <div key={l} className="card"><div className="mut">{l}</div><div style={{ fontWeight: 800, fontSize: 17, color: "var(--p)", marginTop: 8 }}>{v}</div></div>
        ))}
      </div>
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
      <div className="row">
        {["panjang", "berat", "suhu"].map((x) => <button key={x} className={`chip ${c === x ? "active" : ""}`} onClick={() => { setC(x); setFrom(0); setTo(1); }}>{x[0].toUpperCase() + x.slice(1)}</button>)}
      </div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 16, border: "1.5px solid var(--bd-strong)", borderRadius: 12, fontFamily: "monospace", fontSize: 14, wordBreak: "break-all", background: "var(--ps)" }}>
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
          <div style={{ height: 10, background: "var(--bd)", borderRadius: 5, marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: `${(a.score / 6) * 100}%`, height: "100%", background: cl[a.score], transition: "0.3s" }} />
          </div>
        </div>
        <div className="card">
          <div className="mut">Perkiraan waktu crack</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: cl[a.score] }}>{fmtTime(a.crack)}</div>
          <div className="soft" style={{ marginTop: 6 }}>Entropi: {a.entropy.toFixed(0)} bits</div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[["Min 12 karakter", a.checks.length], ["Huruf besar", a.checks.upper], ["Huruf kecil", a.checks.lower], ["Angka", a.checks.numbers], ["Simbol", a.checks.symbols], ["Min 16 karakter", a.checks.long]].map(([l, v]) => (
            <div key={l} style={{ padding: 12, border: `1.5px solid ${v ? "var(--green)" : "var(--bd)"}`, borderRadius: 11, fontSize: 12, color: v ? "var(--green)" : "var(--mut)", display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
              <span>{v ? "OK" : "X"}</span> {l}
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

/* ============ DOWNLOADERS ============ */
export function TikTokDownloader({ onToast }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState(null);
  const [dlState, setDlState] = useState({});

  const go = async () => {
    if (!url) return;
    setLoading(true); setR(null); setDlState({});
    try {
      const res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tiktok", url }),
      });
      const d = await res.json();
      if (!res.ok) onToast?.(d.error || "Gagal memproses.", "error");
      else {
        setR(d);
        onToast?.("Video siap diunduh", "success");
        setTimeout(() => handleDownload(d.noWm || d.video, `${(d.title || "tiktok").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}_nowm.mp4`, "video"), 300);
      }
    } catch { onToast?.("Kesalahan jaringan.", "error"); }
    setLoading(false);
  };

  const handleDownload = async (targetUrl, filename, key) => {
    if (!targetUrl) return;
    setDlState((s) => ({ ...s, [key]: 0 }));
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const total = Number(res.headers.get("content-length")) || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) setDlState((s) => ({ ...s, [key]: Math.min(99, Math.round((loaded / total) * 100)) }));
        else setDlState((s) => ({ ...s, [key]: Math.min(99, Math.round(loaded / 100000)) }));
      }
      const blob = new Blob(chunks);
      const url2 = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url2; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url2), 5000);
      setDlState((s) => ({ ...s, [key]: 100 }));
      onToast?.(`${filename} terunduh`, "success");
      setTimeout(() => setDlState((s) => { const n = { ...s }; delete n[key]; return n; }), 1200);
    } catch {
      onToast?.("Fallback: membuka di tab baru", "info");
      window.open(targetUrl, "_blank", "noopener");
      setDlState((s) => { const n = { ...s }; delete n[key]; return n; });
    }
  };

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 10 }}>URL VIDEO TIKTOK</div>
        <div className="row">
          <input className="inp" style={{ flex: 1, minWidth: 200 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@user/video/..." />
          <button className="btn btn-p" disabled={loading || !url} onClick={go}>
            {loading ? <I.Loader2 size={16} className="spin" /> : <I.Download size={16} />}
            {loading ? "Memproses..." : "Download Otomatis"}
          </button>
        </div>
        <div className="soft" style={{ marginTop: 10 }}>Download otomatis dimulai setelah video diproses.</div>
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
                  <div key={l} style={{ padding: "5px 11px", border: "1px solid var(--bd)", borderRadius: 9, fontSize: 11 }}>
                    <span style={{ color: "var(--mut)" }}>{l}:</span> <b>{fmt(v)}</b>
                  </div>
                ))}
              </div>
              <div className="col" style={{ marginTop: 14 }}>
                <button className="btn btn-p" disabled={dlState["video"] != null && dlState["video"] < 100}
                  onClick={() => dlState["video"] != null && dlState["video"] < 100 ? null : handleDownload(r.noWm, `${(r.title || "tiktok").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}_nowm.mp4`, "video")}>
                  {dlState["video"] != null && dlState["video"] < 100 ? <><I.Loader2 size={14} className="spin" />{dlState["video"]}%</> : <><I.Download size={14} />Tanpa Watermark</>}
                </button>
                <button className="btn btn-s" disabled={dlState["hd"] != null && dlState["hd"] < 100}
                  onClick={() => dlState["hd"] != null && dlState["hd"] < 100 ? null : handleDownload(r.video, `${(r.title || "tiktok").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}_hd.mp4`, "hd")}>
                  {dlState["hd"] != null && dlState["hd"] < 100 ? <><I.Loader2 size={14} className="spin" />{dlState["hd"]}%</> : <><I.Download size={14} />HD</>}
                </button>
                {r.music && (
                  <button className="btn btn-s" disabled={dlState["music"] != null && dlState["music"] < 100}
                    onClick={() => dlState["music"] != null && dlState["music"] < 100 ? null : handleDownload(r.music, "audio.mp3", "music")}>
                    {dlState["music"] != null && dlState["music"] < 100 ? <><I.Loader2 size={14} className="spin" />{dlState["music"]}%</> : <><I.Music size={14} />Audio</>}
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

export function YouTubeDownloader({ onToast }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("video");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState(null);
  const [fb, setFb] = useState("");
  const [e, setE] = useState("");
  const [dlState, setDlState] = useState({});

  const go = async () => {
    if (!url) return;
    setLoading(true); setE(""); setR(null); setFb("");
    try {
      const res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "youtube", url, mode }),
      });
      const d = await res.json();
      if (!res.ok) {
        setE(d.error || "Gagal");
        if (d.videoId) setFb(d.videoId);
        onToast?.(d.error || "Gagal memproses", "error");
      } else {
        setR(d);
        onToast?.("Video siap diunduh", "success");
        setTimeout(() => handleDownload(d.downloadUrl, `${(d.title || "youtube").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.${mode === "audio" ? "mp3" : "mp4"}`, "video"), 300);
      }
    } catch { setE("Kesalahan jaringan."); }
    setLoading(false);
  };

  const handleDownload = async (targetUrl, filename, key) => {
    if (!targetUrl) return;
    setDlState((s) => ({ ...s, [key]: 0 }));
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const total = Number(res.headers.get("content-length")) || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) setDlState((s) => ({ ...s, [key]: Math.min(99, Math.round((loaded / total) * 100)) }));
        else setDlState((s) => ({ ...s, [key]: Math.min(99, Math.round(loaded / 200000)) }));
      }
      const blob = new Blob(chunks);
      const url2 = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url2; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url2), 5000);
      setDlState((s) => ({ ...s, [key]: 100 }));
      onToast?.("Terunduh", "success");
      setTimeout(() => setDlState((s) => { const n = { ...s }; delete n[key]; return n; }), 1200);
    } catch {
      onToast?.("Fallback: buka di tab baru", "info");
      window.open(targetUrl, "_blank", "noopener");
      setDlState((s) => { const n = { ...s }; delete n[key]; return n; });
    }
  };

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 10 }}>URL VIDEO YOUTUBE</div>
        <div className="row" style={{ marginBottom: 10 }}>
          <button className={`chip ${mode === "video" ? "active" : ""}`} onClick={() => setMode("video")}><I.Video size={12} />Video MP4</button>
          <button className={`chip ${mode === "audio" ? "active" : ""}`} onClick={() => setMode("audio")}><I.Music size={12} />Audio MP3</button>
        </div>
        <div className="row">
          <input className="inp" style={{ flex: 1, minWidth: 200 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          <button className="btn btn-p" disabled={loading || !url} onClick={go}>
            {loading ? <I.Loader2 size={16} className="spin" /> : <I.Youtube size={16} />}
            {loading ? "Memproses..." : "Download"}
          </button>
        </div>
        {e && <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{e}</div>}
      </div>
      {fb && !r && (
        <div className="card">
          <img src={`https://img.youtube.com/vi/${fb}/maxresdefault.jpg`} style={{ width: "100%", borderRadius: 14 }} alt="Thumbnail" />
          <div className="mut" style={{ marginTop: 12 }}>Server downloader sibuk. Klik tombol untuk coba lagi.</div>
          <button className="btn btn-p" style={{ marginTop: 12 }} onClick={go} disabled={loading}>
            <I.RefreshCw size={14} />Coba Lagi
          </button>
        </div>
      )}
      {r && (
        <div className="card fade">
          <img src={r.thumbnail} style={{ width: "100%", borderRadius: 14 }} alt="Thumbnail" />
          <div style={{ fontWeight: 700, marginTop: 14 }}>{r.title}</div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-p" disabled={dlState["video"] != null && dlState["video"] < 100}
              onClick={() => handleDownload(r.downloadUrl, `${(r.title || "youtube").slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.${mode === "audio" ? "mp3" : "mp4"}`, "video")}>
              {dlState["video"] != null && dlState["video"] < 100 ? <><I.Loader2 size={14} className="spin" />{dlState["video"]}%</> : <><I.Download size={14} />Unduh Ulang</>}
            </button>
            <a className="btn btn-s" href={r.downloadUrl} target="_blank" rel="noopener"><I.ExternalLink size={14} />Buka Manual</a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ TEMP MAIL (v3 - lebih stabil) ============ */
export function TempMail({ onToast }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const create = useCallback(async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true); setErr("");
    setCooldown(5);
    try {
      const r = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tempmail-create" }),
      });
      const d = await r.json();
      if (!r.ok || d.error) {
        setErr(d.error || "Gagal membuat email");
        onToast?.(d.error || "Gagal", "error");
      } else {
        setEmail(d.email); setToken(d.token); setMsgs([]); setDetail(null);
        localStorage.setItem("alltool-mail-v3", JSON.stringify({ email: d.email, token: d.token, ts: Date.now() }));
        onToast?.("Email sementara dibuat", "success");
      }
    } catch {
      setErr("Kesalahan jaringan");
      onToast?.("Kesalahan jaringan", "error");
    }
    setLoading(false);
  }, [onToast, cooldown, loading]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const i = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(i);
  }, [cooldown]);

  const inbox = useCallback(async (tk, silent = false) => {
    if (!tk) return;
    if (!silent) setRefreshing(true);
    try {
      const r = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tempmail-inbox", token: tk }),
      });
      const d = await r.json();
      setMsgs(Array.isArray(d) ? d : []);
      setLastRefresh(new Date());
    } catch {}
    if (!silent) setRefreshing(false);
  }, []);

  const open = async (id) => {
    setLoading(true);
    try {
      const r = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tempmail-read", token, id }),
      });
      setDetail(await r.json());
    } catch { onToast?.("Gagal membuka email", "error"); }
    setLoading(false);
  };

  useEffect(() => {
    const s = localStorage.getItem("alltool-mail-v3");
    if (s) {
      try {
        const { email: e, token: tk, ts } = JSON.parse(s);
        if (ts && Date.now() - ts > 7200000) create();
        else { setEmail(e); setToken(tk); inbox(tk); }
      } catch { create(); }
    } else create();
  }, [create, inbox]);

  useEffect(() => {
    if (!token || !autoRefresh) return;
    const i = setInterval(() => inbox(token, true), 15000);
    return () => clearInterval(i);
  }, [token, inbox, autoRefresh]);

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 10 }}>ALAMAT EMAIL SEMENTARA</div>
        {err && <div style={{ marginBottom: 12, padding: 12, background: "rgba(239,68,68,0.1)", borderRadius: 10, color: "var(--red)", fontSize: 13 }}>{err}</div>}
        <div className="row">
          <div className="inp" style={{ flex: 1, minWidth: 200, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", background: "var(--ps)", borderColor: "var(--bd-strong)" }}>
            {loading && !email ? "Memuat..." : email || "(kosong)"}
          </div>
          <button className="btn btn-s" onClick={() => { copy(email); onToast?.("Email tersalin", "success"); }} disabled={!email}>
            <I.Copy size={14} />Salin
          </button>
          <button className="btn btn-p" disabled={loading || cooldown > 0} onClick={create}>
            {loading ? <I.Loader2 size={14} className="spin" /> : cooldown > 0 ? <>{cooldown}s</> : <I.RefreshCw size={14} />}
            {cooldown > 0 ? "" : "Baru"}
          </button>
        </div>
        <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
          <div className="soft">Auto-refresh 15s {lastRefresh && `• terakhir ${lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}</div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--mut)" }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />Auto
          </label>
        </div>
      </div>

      {detail ? (
        <div className="card fade">
          <button className="btn btn-g" onClick={() => setDetail(null)} style={{ marginBottom: 12 }}>
            <I.ArrowLeft size={16} />Kembali
          </button>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{detail.subject || "(Tanpa subjek)"}</div>
          <div className="mut" style={{ marginTop: 6 }}>Dari: {detail.from?.address}</div>
          <div style={{ marginTop: 16, padding: 16, border: "1.5px solid var(--bd)", borderRadius: 12, fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.7 }}>
            {detail.text || "(Tidak ada isi teks)"}
          </div>
        </div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b style={{ fontSize: 16 }}>Kotak Masuk {msgs.length > 0 && `(${msgs.length})`}</b>
            <button className="btn btn-s" disabled={refreshing} onClick={() => inbox(token)}>
              {refreshing ? <I.Loader2 size={14} className="spin" /> : <I.RefreshCw size={14} />}Refresh
            </button>
          </div>
          {msgs.length === 0 && !refreshing && (
            <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--mut)" }}>
              <I.Mail size={44} style={{ margin: "0 auto 12px", opacity: 0.35 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Belum ada email masuk</div>
              <div className="soft" style={{ marginTop: 6 }}>Coba kirim email ke alamat di atas</div>
            </div>
          )}
          {msgs.map((m) => (
            <button key={m.id} className="card card-int" style={{ textAlign: "left", width: "100%" }} onClick={() => open(m.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject || "(Tanpa subjek)"}</div>
                  <div className="mut" style={{ marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.from?.address}</div>
                  <div className="mut" style={{ marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{m.intro}</div>
                </div>
                <div className="soft" style={{ flexShrink: 0 }}>{new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/* ============ WEB TO APK ============ */
export function WebToApk() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("#7c3aed");
  const valid = url.startsWith("http") && name.length >= 2;

  const pwabuilder = () => {
    if (!valid) return;
    navigator.clipboard?.writeText(url);
    window.open(`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(url)}`, "_blank", "noopener");
  };

  const apkBuild = () => {
    if (!valid) return;
    const manifest = {
      name, short_name: name.slice(0, 12), start_url: url,
      display: "standalone", background_color: "#ffffff", theme_color: theme,
      icons: [
        { src: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=192&background=${theme.slice(1)}&color=fff`, sizes: "192x192", type: "image/png" },
        { src: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=512&background=${theme.slice(1)}&color=fff`, sizes: "512x512", type: "image/png" },
      ],
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = "manifest.json"; a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div className="col">
      <div className="card">
        <div className="tag" style={{ marginBottom: 12 }}>KONFIGURASI APLIKASI</div>
        <div className="col">
          <div>
            <div className="tag" style={{ marginBottom: 6 }}>URL WEBSITE</div>
            <input className="inp" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <div className="tag" style={{ marginBottom: 6 }}>NAMA APLIKASI</div>
              <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" />
            </div>
            <div>
              <div className="tag" style={{ marginBottom: 6 }}>WARNA TEMA</div>
              <input type="color" value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: "100%", height: 44, border: "none", borderRadius: 11, cursor: "pointer" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <div className="ic" style={{ marginBottom: 12 }}><I.Smartphone size={22} /></div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Build APK via PWABuilder</div>
          <div className="mut" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
            Cara paling cepat. PWABuilder (Microsoft) akan generate APK dari URL Anda secara otomatis.
          </div>
          <button className="btn btn-p" style={{ marginTop: 14, width: "100%" }} disabled={!valid} onClick={pwabuilder}>
            <I.ExternalLink size={14} />Buka PWABuilder
          </button>
          <div className="soft" style={{ marginTop: 8 }}>URL akan dicopy otomatis ke clipboard.</div>
        </div>

        <div className="card">
          <div className="ic" style={{ marginBottom: 12 }}><I.FileJson size={22} /></div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Download manifest.json</div>
          <div className="mut" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
            Untuk PWA manual. Upload ke root website Anda agar dapat di-install seperti aplikasi.
          </div>
          <button className="btn btn-s" style={{ marginTop: 14, width: "100%" }} disabled={!valid} onClick={apkBuild}>
            <I.Download size={14} />Download Manifest
          </button>
        </div>
      </div>

      <div className="card" style={{ background: "var(--ps)", border: "none" }}>
        <div className="tag" style={{ marginBottom: 8 }}>LANGKAH MEMBUAT APK</div>
        <ol style={{ fontSize: 13, lineHeight: 1.9, paddingLeft: 20, color: "var(--text)" }}>
          <li>Isi URL, nama, warna di form atas</li>
          <li>Klik <b>Buka PWABuilder</b></li>
          <li>Klik <b>Start</b> → tunggu analisis</li>
          <li>Klik <b>Package for stores</b></li>
          <li>Pilih <b>Android</b> → <b>Download</b></li>
          <li>Anda dapat file APK siap install</li>
        </ol>
      </div>
    </div>
  );
}

/* ============ UTILITY ============ */
export function IpLookup({ onToast }) {
  const [ip, setIp] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [e, setE] = useState("");
  const go = async (target = "") => {
    setLoading(true); setE(""); setData(null);
    try {
      const r = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ip-lookup", ip: target }),
      });
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
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--bd)" }}>
            <span className="mut">{l}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{String(data[k] ?? "-")}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

export function ColorPicker({ onToast }) {
  const [c, setC] = useState("#7c3aed");
  const h2r = (h) => { const x = h.replace("#", ""); return { r: parseInt(x.slice(0, 2), 16) || 0, g: parseInt(x.slice(2, 4), 16) || 0, b: parseInt(x.slice(4, 6), 16) || 0 }; };
  const r2h = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };
  const rgb = h2r(c);
  const hsl = r2h(rgb.r, rgb.g, rgb.b);
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
            <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, border: "1.5px solid var(--bd)", borderRadius: 12 }}>
              <div><div className="mut">{n}</div><div style={{ fontFamily: "monospace", fontSize: 15, marginTop: 3 }}>{v}</div></div>
              <button className="btn btn-g" onClick={() => { copy(v); onToast?.(`${n} tersalin`, "success"); }}><I.Copy size={16} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="tag" style={{ marginBottom: 12 }}>PALET CEPAT</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
          {pal.map((x) => <button key={x} onClick={() => setC(x)} style={{ aspectRatio: 1, background: x, borderRadius: 14, cursor: "pointer", transition: "transform 0.15s", boxShadow: "var(--shadow)" }} />)}
        </div>
      </div>
    </div>
  );
}

export function CronParser() {
  const [c, setC] = useState("*/5 * * * *");
  const presets = [["Setiap menit", "* * * * *"], ["Setiap 5 menit", "*/5 * * * *"], ["Setiap jam", "0 * * * *"], ["Harian 00:00", "0 0 * * *"], ["Senin 09:00", "0 9 * * 1"]];
  const parts = c.trim().split(/\s+/);
  const desc = () => {
    if (parts.length !== 5) return "Format tidak valid. Gunakan 5 field.";
    const [m, h, d, mo, dw] = parts;
    let s = "";
    if (m.startsWith("*/")) s += `Setiap ${m.slice(2)} menit`;
    else if (m === "*") s += "Setiap menit";
    else s += `Pada menit ${m}`;
    if (h !== "*") s += `, jam ${h}`;
    if (d !== "*") s += `, tanggal ${d}`;
    if (mo !== "*") s += `, bulan ${mo}`;
    if (dw !== "*") s += `, hari ke-${dw}`;
    return s + ".";
  };
  return (
    <div className="col">
      <input className="inp" style={{ fontFamily: "monospace", fontSize: 16 }} value={c} onChange={(e) => setC(e.target.value)} />
      <div className="row">{presets.map(([l, v]) => <button key={v} className="chip" onClick={() => setC(v)}>{l}</button>)}</div>
      <div className="card"><div className="tag" style={{ marginBottom: 8 }}>PENJELASAN</div><div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>{desc()}</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {["Menit", "Jam", "Hari", "Bulan", "Minggu"].map((f, i) => (
          <div key={f} className="card" style={{ textAlign: "center", padding: 14 }}>
            <div className="soft">{f}</div>
            <div style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--p)", marginTop: 8, fontSize: 16 }}>{parts[i] || "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarcodeGenerator() {
  const [t, setT] = useState("1234567890");
  const [ty, setTy] = useState("code128");
  const url = t ? `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(t)}&code=${ty.toUpperCase()}&dpi=96` : "";
  return (
    <div className="col">
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <div><div className="tag" style={{ marginBottom: 6 }}>TEKS / ANGKA</div><input className="inp" style={{ fontFamily: "monospace" }} value={t} onChange={(e) => setT(e.target.value)} /></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>FORMAT</div>
            <select className="inp" value={ty} onChange={(e) => setTy(e.target.value)}>
              <option value="code128">Code 128</option><option value="code39">Code 39</option><option value="ean13">EAN-13</option><option value="upca">UPC-A</option><option value="qrcode">QR Code</option>
            </select>
          </div>
        </div>
      </div>
      {url && <div className="card" style={{ textAlign: "center" }}>
        <img src={url} style={{ maxWidth: "100%", margin: "0 auto" }} alt="Barcode" />
        <a className="btn btn-p" style={{ marginTop: 16 }} href={url} download="barcode.png"><I.Download size={14} />Unduh</a>
      </div>}
    </div>
  );
}

export function TextToSpeech() {
  const [t, setT] = useState("");
  const [voices, setVoices] = useState([]);
  const [v, setV] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const up = () => {
      const x = window.speechSynthesis.getVoices();
      setVoices(x);
      if (x.length && !v) setV(x[0].name);
    };
    up();
    window.speechSynthesis.onvoiceschanged = up;
    return () => window.speechSynthesis.cancel();
  }, [v]);
  const speak = () => {
    if (!t) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    const voice = voices.find((x) => x.name === v);
    if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch;
    u.onend = () => setPlaying(false);
    u.onstart = () => setPlaying(true);
    window.speechSynthesis.speak(u);
  };
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

export function RandomString({ onToast }) {
  const [len, setLen] = useState(16);
  const [n, setN] = useState(5);
  const [up, setUp] = useState(true);
  const [lo, setLo] = useState(true);
  const [num, setNum] = useState(true);
  const [sym, setSym] = useState(false);
  const [list, setList] = useState([]);
  const go = () => {
    let ch = "";
    if (up) ch += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lo) ch += "abcdefghijklmnopqrstuvwxyz";
    if (num) ch += "0123456789";
    if (sym) ch += "!@#$%^&*()_+-=";
    if (!ch) ch = "abcdefghijklmnopqrstuvwxyz";
    const r = [];
    for (let i = 0; i < n; i++) {
      const a = new Uint32Array(len);
      crypto.getRandomValues(a);
      let s = "";
      for (let j = 0; j < len; j++) s += ch[a[j] % ch.length];
      r.push(s);
    }
    setList(r);
  };
  useEffect(() => { go(); }, []);
  return (
    <div className="col">
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div><div className="tag" style={{ marginBottom: 6 }}>PANJANG: {len}</div><input type="range" min={4} max={128} value={len} onChange={(e) => setLen(+e.target.value)} style={{ width: "100%", accentColor: "var(--p)" }} /></div>
          <div><div className="tag" style={{ marginBottom: 6 }}>JUMLAH</div><input type="number" className="inp" value={n} onChange={(e) => setN(+e.target.value)} min={1} max={100} /></div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
          {[["Huruf Besar", up, setUp], ["Huruf Kecil", lo, setLo], ["Angka", num, setNum], ["Simbol", sym, setSym]].map(([l, v, s]) => (
            <label key={l} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={v} onChange={(e) => s(e.target.checked)} />{l}</label>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-p" onClick={go}>Generate</button>
          {list.length > 0 && <button className="btn btn-s" onClick={() => { copy(list.join("\n")); onToast?.("Tersalin", "success"); }}>Copy Semua</button>}
        </div>
      </div>
      <div className="col">
        {list.map((s, i) => (
          <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", flex: 1 }}>{s}</span>
            <button className="btn btn-g" onClick={() => copy(s)}><I.Copy size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
                                                         }

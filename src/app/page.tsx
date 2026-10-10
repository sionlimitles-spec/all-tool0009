'use client';

import { useState, useEffect } from 'react';
import * as I from 'lucide-react';

export function KomikReader() {
  const [view, setView] = useState("search");
  const [q, setQ] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [pick, setPick] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapter, setChapter] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const getStatus = (d: string, t: string) => {
    if (!d) return t;
    const x = d.toLowerCase();
    if (x.includes("tamat") || x.includes("completed")) return "Tamat";
    if (x.includes("hiatus")) return "Hiatus";
    return "Ongoing";
  };

  const load = async (query = "") => {
    setLoading(true); setErr(""); setList([]);
    try {
      const r = await fetch(`/api/comic?action=search&query=${encodeURIComponent(query || "manhwa")}`);
      const d = await r.json();
      if (d.success) setList(d.data);
      else setErr("Komik tidak ditemukan");
    } catch { setErr("Gagal memuat komik"); }
    setLoading(false);
  };

  useEffect(() => { load("manhwa"); }, []);

  const openDetail = async (c: any) => {
    setPick(c); setView("detail"); setChapters([]); setLoading(true); setErr(""); window.scrollTo(0,0);
    try {
      const r = await fetch(`/api/comic?action=info&endpoint=${encodeURIComponent(c.endpoint)}`);
      const d = await r.json();
      if (d.success) setChapters(d.data.chapters || d.data || []);
      else setErr("Gagal memuat chapter");
    } catch { setErr("Gagal memuat chapter"); }
    setLoading(false);
  };

  const openChapter = async (ep: string) => {
    setView("reader"); setChapter(null); setLoading(true); setErr(""); window.scrollTo(0,0);
    try {
      const r = await fetch(`/api/comic?action=chapter&endpoint=${encodeURIComponent(ep)}`);
      const d = await r.json();
      if (d.success) setChapter(d.data);
      else setErr("Gagal memuat gambar");
    } catch { setErr("Gagal memuat gambar"); }
    setLoading(false);
  };

  if (view === "reader") {
    return (
      <div className="col">
        <button className="btn btn-g" style={{ alignSelf: "flex-start" }} onClick={() => setView("detail")}>
          <I.ArrowLeft size={16} />Kembali
        </button>
        {loading && <div className="card" style={{ textAlign:"center", padding:40 }}><I.Loader2 size={32} className="spin" style={{ margin:"0 auto", color:"var(--p)" }} /></div>}
        {err && <div className="card" style={{ color:"var(--red)", textAlign:"center" }}>{err}</div>}
        {chapter?.image?.length > 0 && (
          <div style={{ background:"#000", borderRadius:14, overflow:"hidden" }}>
            {chapter.image.map((img: string, i: number) => (
              <img key={i} src={img} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width:"100%", maxWidth:800, display:"block", margin:"0 auto" }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === "detail" && pick) {
    return (
      <div className="col">
        <button className="btn btn-g" style={{ alignSelf:"flex-start" }} onClick={() => { setView("search"); setPick(null); }}>
          <I.ArrowLeft size={16} />Kembali
        </button>
        <div className="card">
          <div className="row" style={{ gap:16, alignItems:"flex-start" }}>
            <img src={pick.image} alt="" referrerPolicy="no-referrer" style={{ width:110, height:150, objectFit:"cover", borderRadius:12, flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <h3 style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>{pick.title}</h3>
              <div className="row" style={{ marginBottom:8 }}>
                <span className="pill" style={{ fontSize:10 }}>{getStatus(pick.desc, pick.type)}</span>
                <span className="pill" style={{ fontSize:10 }}>{pick.type}</span>
              </div>
              <p className="mut" style={{ fontSize:12, lineHeight:1.6 }}>{pick.desc}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="tag" style={{ marginBottom:12 }}>{chapters.length} CHAPTER</div>
          {loading && <div className="mut" style={{ textAlign:"center", padding:20 }}>Memuat chapter...</div>}
          <div style={{ maxHeight:450, overflowY:"auto" }}>
            {chapters.map((c: any, i: number) => (
              <button key={i} onClick={() => openChapter(c.endpoint)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 12px", borderBottom:"1px solid var(--border)", background:"transparent", textAlign:"left" }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{c.name}</span>
                <I.ChevronRight size={16} style={{ color:"var(--p)" }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col">
      <div className="card">
        <div className="row">
          <input className="inp" style={{ flex:1 }} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load(q)} placeholder="Cari manga, manhwa, manhua..." />
          <button className="btn btn-p" onClick={() => load(q)} disabled={loading}>
            {loading ? <I.Loader2 size={14} className="spin" /> : <I.Search size={14} />}Cari
          </button>
        </div>
      </div>
      {err && <div className="card" style={{ color:"var(--red)", textAlign:"center", padding:20 }}>{err}</div>}
      {loading && list.length === 0 && <div className="card" style={{ textAlign:"center", padding:40 }}><I.Loader2 size={32} className="spin" style={{ margin:"0 auto", color:"var(--p)" }} /></div>}
      {list.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:12 }}>
          {list.map((c: any, i: number) => (
            <div key={i} onClick={() => openDetail(c)} style={{ cursor:"pointer", borderRadius:12, overflow:"hidden", background:"var(--card-solid)", border:"1px solid var(--border)" }}>
              <div style={{ position:"relative", aspectRatio:"3/4", background:"var(--ps)" }}>
                <img src={c.image} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <div style={{ position:"absolute", top:8, left:8, padding:"3px 8px", borderRadius:6, background:"rgba(0,0,0,0.75)", color:"#fff", fontSize:9, fontWeight:700 }}>
                  {getStatus(c.desc, c.type).toUpperCase()}
                </div>
              </div>
              <div style={{ padding:10 }}>
                <div style={{ fontSize:12, fontWeight:700, lineHeight:1.3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", minHeight:32 }}>{c.title}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WordCounter() {
  const [t, setT] = useState("");
  const w = t.trim() ? t.trim().split(/\s+/).length : 0;
  return (
    <div className="col">
      <textarea className="txa" rows={8} value={t} onChange={e => setT(e.target.value)} placeholder="Tulis teks..." />
      <div className="grid">
        <div className="card"><div className="stat">{w}</div><div className="mut">Kata</div></div>
        <div className="card"><div className="stat">{t.length}</div><div className="mut">Karakter</div></div>
      </div>
    </div>
  );
}

function CaseConverter() {
  const [t, setT] = useState("");
  return (
    <div className="col">
      <textarea className="txa" rows={6} value={t} onChange={e => setT(e.target.value)} />
      <div className="row">
        <button className="btn btn-s" onClick={() => setT(t.toUpperCase())}>UPPER</button>
        <button className="btn btn-s" onClick={() => setT(t.toLowerCase())}>lower</button>
        <button className="btn btn-s" onClick={() => setT(t.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()))}>Title</button>
      </div>
    </div>
  );
}

const MENU = [
  { id: "komik", name: "Komik Reader", desc: "Baca manga, manhwa, manhua Indonesia.", icon: "BookOpen", color: "linear-gradient(135deg,#7c3aed,#6d28d9)" },
  { id: "word", name: "Word Counter", desc: "Hitung kata & karakter teks.", icon: "FileText", color: "linear-gradient(135deg,#0ea5e9,#0369a1)" },
  { id: "case", name: "Case Converter", desc: "Ubah huruf besar/kecil.", icon: "Type", color: "linear-gradient(135deg,#10b981,#047857)" },
];

export default function Home() {
  const [active, setActive] = useState<string | null>(null);

  if (active) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg1)" }}>
        <div className="max-w-5xl mx-auto p-4">
          <button className="btn btn-g" onClick={() => setActive(null)} style={{ marginBottom: 16 }}>
            <I.ArrowLeft size={16} />Kembali
          </button>
          <h1 className="h1" style={{ marginBottom: 20 }}>
            <span className="grad">{MENU.find(m => m.id === active)?.name}</span>
          </h1>
          {active === "komik" && <KomikReader />}
          {active === "word" && <WordCounter />}
          {active === "case" && <CaseConverter />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg1)" }}>
      <header style={{ borderBottom: "1px solid var(--border)", padding: "18px 20px" }}>
        <div className="max-w-5xl mx-auto row" style={{ gap: 12 }}>
          <div className="ic" style={{ background: "linear-gradient(135deg, var(--p), var(--ph))", color: "#fff", border: "none" }}>
            <I.Zap size={20} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>All<span className="grad">Tool</span></h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4" style={{ paddingTop: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 className="h1" style={{ marginBottom: 12 }}>
            Semua Tool, <span className="grad">Satu Tempat</span>
          </h2>
          <p className="sub">Kumpulan tools berguna yang bisa diakses gratis.</p>
        </div>

        <div className="grid">
          {MENU.map(m => {
            const Icon = (I as any)[m.icon] || I.Wrench;
            return (
              <div key={m.id} className="card card-int" onClick={() => setActive(m.id)}>
                <div className="ic" style={{ background: m.color, color: "#fff", border: "none", marginBottom: 14 }}>
                  <Icon size={20} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{m.name}</div>
                <div className="mut" style={{ fontSize: 12, lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
        }

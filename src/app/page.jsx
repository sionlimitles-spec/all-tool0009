"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import * as I from "lucide-react";
import * as T from "@/lib/tools";
import { supabaseReady, signUp, signIn, signOut, getUser, onAuthChange, cloudGetFavorites, cloudAddFavorite, cloudRemoveFavorite } from "@/lib/supabase";

/* ============ REGISTRY ============ */
const TOOLS = [
  // TEXT
  { id: "word-counter", n: "Word Counter", d: "Hitung kata, karakter, kalimat, paragraf.", c: "text", i: "Hash", f: T.WordCounter },
  { id: "case-converter", n: "Case Converter", d: "Ubah kapitalisasi teks.", c: "text", i: "Type", f: T.CaseConverter },
  { id: "lorem-ipsum", n: "Lorem Ipsum", d: "Generator teks dummy.", c: "text", i: "FileText", f: T.LoremIpsum },
  { id: "text-diff", n: "Text Diff", d: "Bandingkan dua teks.", c: "text", i: "GitCompare", f: T.TextDiff },
  { id: "remove-duplicates", n: "Remove Duplicates", d: "Hapus baris duplikat.", c: "text", i: "ListX", f: T.RemoveDuplicates },
  { id: "text-repeater", n: "Text Repeater", d: "Ulangi teks berkali-kali.", c: "text", i: "Repeat", f: T.TextRepeater },
  { id: "fancy-text", n: "Fancy Text", d: "Teks gaya unik untuk medsos.", c: "text", i: "Sparkles", f: T.FancyText },
  { id: "reverse-text", n: "Reverse Text", d: "Balik urutan karakter.", c: "text", i: "ArrowLeftRight", f: T.ReverseText },
  { id: "markdown-preview", n: "Markdown Preview", d: "Live render markdown.", c: "text", i: "FileCode", f: T.MarkdownPreview },
  { id: "slug-generator", n: "Slug Generator", d: "Buat URL slug dari judul.", c: "text", i: "Link2", f: T.SlugGenerator },

  // DEVELOPER
  { id: "json-formatter", n: "JSON Formatter", d: "Format, validasi, minify JSON.", c: "developer", i: "Braces", f: T.JsonFormatter },
  { id: "base64", n: "Base64 Encoder", d: "Encode dan decode Base64.", c: "developer", i: "Binary", f: T.Base64Tool },
  { id: "url-encoder", n: "URL Encoder", d: "Encode dan decode URL.", c: "developer", i: "Link", f: T.UrlEncoder },
  { id: "html-encoder", n: "HTML Entity", d: "Encode karakter HTML.", c: "developer", i: "Code", f: T.HtmlEncoder },
  { id: "html-editor", n: "HTML Editor", d: "Live preview HTML/CSS/JS.", c: "developer", i: "Code2", f: T.HtmlEditor },
  { id: "css-playground", n: "CSS Playground", d: "Live CSS editor.", c: "developer", i: "Palette", f: T.CssPlayground },
  { id: "html-minifier", n: "HTML Minifier", d: "Minify HTML code.", c: "developer", i: "FileCode2", f: T.HtmlMinifier },
  { id: "css-minifier", n: "CSS Minifier", d: "Minify CSS code.", c: "developer", i: "Paintbrush", f: T.CssMinifier },
  { id: "js-minifier", n: "JS Minifier", d: "Minify JavaScript code.", c: "developer", i: "FileTerminal", f: T.JsMinifier },
  { id: "jwt-decoder", n: "JWT Decoder", d: "Decode JSON Web Token.", c: "developer", i: "Key", f: T.JwtDecoder },
  { id: "hash-generator", n: "Hash Generator", d: "SHA-1, SHA-256, SHA-384, SHA-512.", c: "developer", i: "Shield", f: T.HashGenerator },
  { id: "uuid-generator", n: "UUID Generator", d: "Buat UUID v4 acak.", c: "developer", i: "Fingerprint", f: T.UuidGenerator },
  { id: "regex-tester", n: "Regex Tester", d: "Uji ekspresi reguler.", c: "developer", i: "Search", f: T.RegexTester },
  { id: "timestamp-converter", n: "Timestamp Converter", d: "Konversi Unix timestamp.", c: "developer", i: "Clock", f: T.TimestampConverter },
  { id: "qr-generator", n: "QR Code Generator", d: "Buat QR code custom.", c: "developer", i: "QrCode", f: T.QrGenerator },

  // IMAGE
  { id: "image-compressor", n: "Image Compressor", d: "Kompres gambar kualitas custom.", c: "image", i: "Minimize", f: T.ImageCompressor },
  { id: "image-resizer", n: "Image Resizer", d: "Ubah ukuran gambar.", c: "image", i: "Maximize", f: T.ImageResizer },
  { id: "image-to-base64", n: "Image to Base64", d: "Konversi gambar ke Base64.", c: "image", i: "Image", f: T.ImageToBase64 },
  { id: "image-converter", n: "Image Converter", d: "Konversi format gambar.", c: "image", i: "RefreshCw", f: T.ImageConverter },

  // CALCULATOR
  { id: "bmi-calculator", n: "BMI Calculator", d: "Hitung indeks massa tubuh.", c: "calculator", i: "Activity", f: T.BmiCalculator },
  { id: "age-calculator", n: "Age Calculator", d: "Hitung umur dari lahir.", c: "calculator", i: "Calendar", f: T.AgeCalculator },
  { id: "percentage", n: "Percentage", d: "Hitung persentase.", c: "calculator", i: "Percent", f: T.Percentage },
  { id: "loan-calculator", n: "Loan Calculator", d: "Simulasi cicilan pinjaman.", c: "calculator", i: "Wallet", f: T.LoanCalculator },
  { id: "unit-converter", n: "Unit Converter", d: "Konversi panjang, berat, suhu.", c: "calculator", i: "Scale", f: T.UnitConverter },

  // SECURITY
  { id: "password-generator", n: "Password Generator", d: "Buat password kuat.", c: "security", i: "Lock", f: T.PasswordGenerator },
  { id: "password-strength", n: "Password Strength", d: "Cek kekuatan password.", c: "security", i: "ShieldCheck", f: T.PasswordStrength },

  // MEDIA / DOWNLOADER
  { id: "downloader-tiktok", n: "TikTok Downloader", d: "Unduh TikTok tanpa watermark.", c: "media", i: "Music", f: T.TikTokDownloader },
  { id: "downloader-youtube", n: "YouTube Downloader", d: "Unduh video/audio YouTube.", c: "media", i: "Youtube", f: T.YouTubeDownloader },
  { id: "temp-mail", n: "Temp Mail", d: "Email sementara instan.", c: "media", i: "Mail", f: T.TempMail },
  { id: "ip-lookup", n: "IP Lookup", d: "Cek lokasi alamat IP.", c: "media", i: "Globe", f: T.IpLookup },
  { id: "web-to-apk", n: "Web to APK", d: "Ubah website jadi APK Android.", c: "media", i: "Smartphone", f: T.WebToApk },

  // UTILITY
  { id: "color-picker", n: "Color Picker", d: "Konversi HEX, RGB, HSL.", c: "utility", i: "Palette", f: T.ColorPicker },
  { id: "cron-parser", n: "Cron Parser", d: "Baca ekspresi cron.", c: "utility", i: "Timer", f: T.CronParser },
  { id: "barcode-generator", n: "Barcode Generator", d: "Buat barcode dari teks.", c: "utility", i: "Barcode", f: T.BarcodeGenerator },
  { id: "text-to-speech", n: "Text to Speech", d: "Ubah teks jadi suara.", c: "utility", i: "Volume2", f: T.TextToSpeech },
  { id: "random-string", n: "Random String", d: "String acak dengan pola.", c: "utility", i: "Shuffle", f: T.RandomString },
];

const CATS = [
  { id: "all", n: "Semua" }, { id: "text", n: "Teks" }, { id: "developer", n: "Developer" },
  { id: "image", n: "Gambar" }, { id: "calculator", n: "Kalkulator" }, { id: "security", n: "Keamanan" },
  { id: "media", n: "Media" }, { id: "utility", n: "Utilitas" },
];

const LANGS = [
  ["id", "Indonesia"], ["en", "English"], ["ar", "العربية"], ["zh", "中文"], ["ja", "日本語"],
  ["ko", "한국어"], ["es", "Español"], ["fr", "Français"], ["de", "Deutsch"], ["it", "Italiano"],
  ["pt", "Português"], ["ru", "Русский"], ["hi", "हिन्दी"], ["th", "ไทย"], ["vi", "Tiếng Việt"],
  ["ms", "Bahasa Melayu"], ["tl", "Filipino"], ["tr", "Türkçe"], ["nl", "Nederlands"], ["pl", "Polski"],
  ["sv", "Svenska"], ["no", "Norsk"], ["da", "Dansk"], ["fi", "Suomi"], ["cs", "Čeština"],
  ["hu", "Magyar"], ["ro", "Română"], ["el", "Ελληνικά"], ["he", "עברית"], ["uk", "Українська"],
  ["fa", "فارسی"], ["bn", "বাংলা"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["mr", "मराठी"],
  ["gu", "ગુજરાતી"], ["ur", "اردو"], ["sw", "Kiswahili"], ["af", "Afrikaans"], ["sq", "Shqip"],
  ["hy", "Հայերեն"], ["ka", "ქართული"], ["az", "Azərbaycan"], ["kk", "Қазақша"], ["uz", "O'zbek"],
  ["mn", "Монгол"], ["km", "ខ្មែរ"], ["lo", "ລາວ"], ["my", "မြန်မာ"], ["ne", "नेपाली"],
];

const ACCENTS = ["violet", "blue", "emerald", "rose", "amber", "pink", "cyan"];
const ACCENT_HEX = { violet: "#7c3aed", blue: "#2563eb", emerald: "#059669", rose: "#e11d48", amber: "#d97706", pink: "#db2777", cyan: "#0891b2" };

const Icon = ({ name, size = 18, color }) => {
  const C = I[name] || I.Wrench;
  return <C size={size} color={color} />;
};

/* ============ MAIN ============ */
export default function App() {
  const [page, setPage] = useState("home");
  const [current, setCurrent] = useState(null);
  const [sidebar, setSidebar] = useState(false);
  const [palette, setPalette] = useState(false);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ lang: "id", theme: "light", accent: "violet", fontSize: "medium", favorites: [] });

  const toast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const addHistory = useCallback((toolId, meta = {}) => {
    try {
      const local = JSON.parse(localStorage.getItem("alltool-history") || "[]");
      const entry = { tool_id: toolId, meta, created_at: new Date().toISOString() };
      local.unshift(entry);
      localStorage.setItem("alltool-history", JSON.stringify(local.slice(0, 50)));
      setHistory(local.slice(0, 50));
    } catch {}
  }, []);

  useEffect(() => {
    const s = localStorage.getItem("alltool-settings");
    if (s) { try { setSettings((prev) => ({ ...prev, ...JSON.parse(s) })); } catch {} }
    const h = JSON.parse(localStorage.getItem("alltool-history") || "[]");
    setHistory(h);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("alltool-settings", JSON.stringify(settings));
    const r = document.documentElement;
    let eff = settings.theme;
    if (eff === "system") eff = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    r.setAttribute("data-theme", eff);
    r.setAttribute("data-accent", settings.accent);
    r.setAttribute("data-fontsize", settings.fontSize);
  }, [settings, mounted]);

  useEffect(() => {
    if (!supabaseReady) return;
    getUser().then(async (u) => {
      setUser(u);
      if (u) {
        const favs = await cloudGetFavorites(u.id);
        if (favs.length) setSettings((s) => ({ ...s, favorites: Array.from(new Set([...s.favorites, ...favs])) }));
      }
    });
    return onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        const favs = await cloudGetFavorites(u.id);
        if (favs.length) setSettings((s) => ({ ...s, favorites: Array.from(new Set([...s.favorites, ...favs])) }));
      }
    });
  }, []);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setPalette(true); }
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) { e.preventDefault(); setPalette(true); }
      if (e.key === "Escape") { setPalette(false); setAuthModal(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const openTool = (id) => {
    const tool = TOOLS.find((t) => t.id === id);
    if (tool) {
      setCurrent(tool); setPage("tool"); setSidebar(false); setPalette(false);
      window.scrollTo(0, 0);
      addHistory(id);
    }
  };

  const toggleFav = async (id) => {
    const isFav = settings.favorites.includes(id);
    setSettings((s) => ({ ...s, favorites: isFav ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }));
    if (user) {
      if (isFav) await cloudRemoveFavorite(user.id, id);
      else await cloudAddFavorite(user.id, id);
    }
    toast(isFav ? "Dihapus dari favorit" : "Ditambahkan ke favorit", "success");
  };

  const handleAuth = async (mode, email, password) => {
    const fn = mode === "signup" ? signUp : signIn;
    const { error } = await fn(email, password);
    if (error) { toast(error, "error"); return; }
    toast(mode === "signup" ? "Akun dibuat" : "Login berhasil", "success");
    setAuthModal(false);
  };

  const handleLogout = async () => { await signOut(); setUser(null); toast("Logout berhasil", "info"); };

  const filtered = useMemo(() => TOOLS.filter((t) =>
    (cat === "all" || t.c === cat) &&
    (!search || t.n.toLowerCase().includes(search.toLowerCase()) || t.d.toLowerCase().includes(search.toLowerCase()))
  ), [cat, search]);

  const favTools = useMemo(() => TOOLS.filter((t) => settings.favorites.includes(t.id)), [settings.favorites]);

  return (
    <div className="bg-page">
      <div className={`overlay ${sidebar ? "on" : ""}`} onClick={() => setSidebar(false)} style={{ display: sidebar ? "block" : "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }} />

      <aside className={`side ${sidebar ? "on" : ""}`}>
        <button onClick={() => { setPage("home"); setCurrent(null); setSidebar(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 8px", marginBottom: 20, textAlign: "left" }}>
          <div className="ic" style={{ background: "linear-gradient(135deg, var(--p), var(--ph))", color: "#fff", width: 42, height: 42 }}>
            <I.Sparkles size={22} />
          </div>
          <div>
            <div className="grad" style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>AllTool</div>
            <div className="soft" style={{ fontWeight: 600 }}>v3.0 · {TOOLS.length} tools</div>
          </div>
        </button>

        <nav className="col" style={{ gap: 4 }}>
          <NavItem active={page === "home"} onClick={() => { setPage("home"); setCurrent(null); setSidebar(false); }} icon="Home" label="Beranda" />
          <NavItem active={page === "tools"} onClick={() => { setPage("tools"); setCurrent(null); setSidebar(false); }} icon="Wrench" label="Semua Tools" badge={TOOLS.length} />
          <NavItem active={page === "history"} onClick={() => { setPage("history"); setCurrent(null); setSidebar(false); }} icon="Clock" label="Riwayat" badge={history.length} />
          <NavItem active={page === "settings"} onClick={() => { setPage("settings"); setCurrent(null); setSidebar(false); }} icon="Settings" label="Pengaturan" />
          <NavItem active={page === "about"} onClick={() => { setPage("about"); setCurrent(null); setSidebar(false); }} icon="Info" label="Tentang" />
        </nav>

        {favTools.length > 0 && (
          <>
            <div style={{ marginTop: 22, marginBottom: 8, padding: "0 8px" }}>
              <div className="soft" style={{ fontWeight: 700, letterSpacing: "0.06em" }}>FAVORIT ({favTools.length})</div>
            </div>
            <div className="col" style={{ gap: 4 }}>
              {favTools.slice(0, 6).map((t) => (
                <NavItem key={t.id} active={current?.id === t.id} onClick={() => openTool(t.id)} icon={t.i} label={t.n} />
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: "auto", paddingTop: 20 }} className="col">
          {supabaseReady && (
            user ? (
              <div className="card" style={{ padding: 12 }}>
                <div className="soft">SIGNED IN</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, wordBreak: "break-all" }}>{user.email}</div>
                <button className="btn btn-s" style={{ marginTop: 10, width: "100%", fontSize: 12 }} onClick={handleLogout}>
                  <I.LogOut size={12} />Logout
                </button>
              </div>
            ) : (
              <button className="btn btn-p" onClick={() => setAuthModal(true)} style={{ width: "100%" }}>
                <I.User size={14} />Login / Daftar
              </button>
            )
          )}
          <div className="card" style={{ background: "var(--ps)", border: "none", padding: 12, textAlign: "center" }}>
            <div className="soft" style={{ color: "var(--p)", fontWeight: 600 }}>Next.js · Vercel · Supabase</div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="hdr">
          <button className="btn-g" onClick={() => setSidebar(!sidebar)} style={{ display: sidebar ? "none" : "flex" }} aria-label="Menu">
            <I.Menu size={22} />
          </button>
          <button onClick={() => setPalette(true)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", border: "1.5px solid var(--bd)", borderRadius: 12, background: "var(--card-solid)", color: "var(--mut)", fontSize: 13, textAlign: "left", maxWidth: 480 }}>
            <I.Search size={16} />
            <span style={{ flex: 1 }}>Cari tools... (Ctrl K)</span>
            <kbd className="kbd">/</kbd>
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn-g" onClick={() => setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))} aria-label="Theme">
            <Icon name={settings.theme === "dark" ? "Sun" : "Moon"} size={22} />
          </button>
          <button className="btn-g" onClick={() => { setPage("settings"); setCurrent(null); }} aria-label="Settings">
            <I.Settings size={22} />
          </button>
        </header>

        <main style={{ padding: "28px 24px 60px", maxWidth: 1280, margin: "0 auto" }}>
          {page === "home" && <HomePage filtered={filtered} cat={cat} setCat={setCat} openTool={openTool} favTools={favTools} toggleFav={toggleFav} favorites={settings.favorites} />}
          {page === "tools" && <ToolsPage filtered={filtered} cat={cat} setCat={setCat} openTool={openTool} favorites={settings.favorites} toggleFav={toggleFav} />}
          {page === "history" && <HistoryPage history={history} openTool={openTool} />}
          {page === "tool" && current && <ToolPage tool={current} onBack={() => setPage("tools")} isFav={settings.favorites.includes(current.id)} toggleFav={() => toggleFav(current.id)} toast={toast} />}
          {page === "settings" && <SettingsPage settings={settings} setSettings={setSettings} toast={toast} user={user} />}
          {page === "about" && <AboutPage />}
        </main>
      </div>

      {palette && <Palette onClose={() => setPalette(false)} openTool={openTool} />}
      {authModal && <AuthModal onClose={() => setAuthModal(false)} onSubmit={handleAuth} />}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon name={t.type === "success" ? "CheckCircle2" : t.type === "error" ? "AlertCircle" : "Info"} size={18} color={t.type === "success" ? "var(--green)" : t.type === "error" ? "var(--red)" : "var(--p)"} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ SUB ============ */
function NavItem({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 13px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, background: active ? "linear-gradient(135deg, var(--p), var(--ph))" : "transparent", color: active ? "#fff" : "var(--text)", transition: "all 0.18s", width: "100%", textAlign: "left", boxShadow: active ? "0 4px 12px -4px var(--p)" : "none" }}>
      <Icon name={icon} size={16} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && <span style={{ fontSize: 11, opacity: 0.75 }}>{badge}</span>}
    </button>
  );
}

function ToolCard({ tool, openTool, isFav, toggleFav }) {
  return (
    <div className="card card-int" onClick={() => openTool(tool.id)}>
      <div className="ic" style={{ marginBottom: 14 }}><Icon name={tool.i} size={22} /></div>
      <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>{tool.n}</div>
      <div className="mut" style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5 }}>{tool.d}</div>
      <button onClick={(e) => { e.stopPropagation(); toggleFav(); }} className="btn-g" style={{ position: "absolute", top: 12, right: 12, padding: 7 }}>
        <I.Heart size={15} fill={isFav ? "var(--p)" : "none"} color={isFav ? "var(--p)" : "var(--soft)"} />
      </button>
    </div>
  );
}

function HomePage({ filtered, cat, setCat, openTool, favTools, toggleFav, favorites }) {
  return (
    <>
      <section style={{ marginBottom: 36 }}>
        <div className="pill" style={{ marginBottom: 16 }}>
          <I.Sparkles size={12} /> {TOOLS.length} tools · 100% gratis
        </div>
        <h1 className="h1">
          <span className="grad">Semua Alat Digital.</span>
          <br />Satu Platform.
        </h1>
        <p className="sub" style={{ maxWidth: 640 }}>
          50+ tools gratis untuk developer, desainer, dan produktivitas harian. Downloader TikTok tanpa watermark, YouTube, temp mail, HTML editor, web to APK, dan banyak lagi.
        </p>

        <div className="grid" style={{ marginTop: 28, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {[
            { i: "Zap", t: "Cepat", d: "Instan" },
            { i: "Shield", t: "Aman", d: "Privasi" },
            { i: "Globe", t: "50 Bahasa", d: "Global" },
            { i: "Sparkles", t: "Gratis", d: "Selamanya" },
          ].map((s) => (
            <div key={s.t} className="card">
              <Icon name={s.i} size={22} color="var(--p)" />
              <div className="mut" style={{ marginTop: 10 }}>{s.t}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {favTools.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="row" style={{ marginBottom: 16 }}>
            <I.Heart size={18} fill="var(--p)" color="var(--p)" />
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Favorit Anda</h2>
          </div>
          <div className="grid">
            {favTools.map((t) => <ToolCard key={t.id} tool={t} openTool={openTool} isFav={true} toggleFav={() => toggleFav(t.id)} />)}
          </div>
        </section>
      )}

      <section>
        <div className="row" style={{ marginBottom: 16, justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 19, fontWeight: 800 }}>Semua Tools</h2>
          <span className="mut">{filtered.length} item</span>
        </div>
        <div className="row" style={{ marginBottom: 18 }}>
          {CATS.map((c) => <button key={c.id} className={`chip ${cat === c.id ? "active" : ""}`} onClick={() => setCat(c.id)}>{c.n}</button>)}
        </div>
        <div className="grid">
          {filtered.map((t) => <ToolCard key={t.id} tool={t} openTool={openTool} isFav={favorites.includes(t.id)} toggleFav={() => toggleFav(t.id)} />)}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 80, textAlign: "center", color: "var(--mut)" }}>
            <I.SearchX size={48} style={{ margin: "0 auto 14px", opacity: 0.35 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Tidak ada tools ditemukan</div>
          </div>
        )}
      </section>
    </>
  );
}

function ToolsPage({ filtered, cat, setCat, openTool, favorites, toggleFav }) {
  return (
    <>
      <h1 className="h1" style={{ marginBottom: 6 }}><span className="grad">Semua Tools</span></h1>
      <p className="sub" style={{ marginBottom: 24 }}>{TOOLS.length} alat tersedia. Klik untuk membuka.</p>
      <div className="row" style={{ marginBottom: 18 }}>
        {CATS.map((c) => <button key={c.id} className={`chip ${cat === c.id ? "active" : ""}`} onClick={() => setCat(c.id)}>{c.n}</button>)}
      </div>
      <div className="grid">
        {filtered.map((t) => <ToolCard key={t.id} tool={t} openTool={openTool} isFav={favorites.includes(t.id)} toggleFav={() => toggleFav(t.id)} />)}
      </div>
    </>
  );
}

function HistoryPage({ history, openTool }) {
  return (
    <>
      <h1 className="h1" style={{ marginBottom: 6 }}><span className="grad">Riwayat</span></h1>
      <p className="sub" style={{ marginBottom: 24 }}>Tools yang baru Anda buka.</p>
      {history.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--mut)" }}>
          <I.Clock size={44} style={{ margin: "0 auto 12px", opacity: 0.35 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Belum ada riwayat</div>
        </div>
      ) : (
        <div className="col">
          {history.map((h, i) => {
            const tool = TOOLS.find((t) => t.id === h.tool_id);
            if (!tool) return null;
            return (
              <button key={i} className="card card-int" style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 14 }} onClick={() => openTool(tool.id)}>
                <div className="ic" style={{ width: 40, height: 40 }}><Icon name={tool.i} size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{tool.n}</div>
                  <div className="soft" style={{ marginTop: 3 }}>{new Date(h.created_at).toLocaleString("id-ID")}</div>
                </div>
                <I.ArrowRight size={16} color="var(--mut)" />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function ToolPage({ tool, onBack, isFav, toggleFav, toast }) {
  const Comp = tool.f;
  return (
    <div className="fade">
      <button className="btn btn-g" onClick={onBack} style={{ marginBottom: 14, marginLeft: -8 }}><I.ArrowLeft size={16} />Kembali</button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 28, flexWrap: "wrap" }}>
        <div className="ic" style={{ width: 58, height: 58 }}><Icon name={tool.i} size={26} /></div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="h1" style={{ fontSize: 28 }}>{tool.n}</h1>
          <p className="sub">{tool.d}</p>
        </div>
        <button className="btn btn-s" onClick={toggleFav}>
          <I.Heart size={15} fill={isFav ? "var(--p)" : "none"} color={isFav ? "var(--p)" : "currentColor"} />
          {isFav ? "Favorit" : "Favoritkan"}
        </button>
      </div>
      <Comp onToast={toast} />
    </div>
  );
}

function SettingsPage({ settings, setSettings, toast, user }) {
  const set = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));
  const [searchLang, setSearchLang] = useState("");
  const filtered = LANGS.filter(([, n]) => n.toLowerCase().includes(searchLang.toLowerCase()));

  return (
    <>
      <h1 className="h1" style={{ marginBottom: 6 }}><span className="grad">Pengaturan</span></h1>
      <p className="sub" style={{ marginBottom: 28 }}>Sesuaikan tampilan, bahasa, dan preferensi aplikasi.</p>
      <div className="col" style={{ maxWidth: 720 }}>
        <div className="card">
          <div className="tag" style={{ marginBottom: 14 }}>TEMA</div>
          <div className="row">
            {["light", "dark", "system"].map((t) => (
              <button key={t} className={`chip ${settings.theme === t ? "active" : ""}`} onClick={() => set("theme")(t)}>
                <Icon name={t === "light" ? "Sun" : t === "dark" ? "Moon" : "Monitor"} size={14} />
                {t === "light" ? "Terang" : t === "dark" ? "Gelap" : "Sistem"}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="tag" style={{ marginBottom: 14 }}>WARNA AKSEN</div>
          <div className="row" style={{ gap: 14 }}>
            {ACCENTS.map((a) => (
              <button key={a} onClick={() => set("accent")(a)} style={{ width: 46, height: 46, borderRadius: "50%", background: ACCENT_HEX[a], outline: settings.accent === a ? `3px solid ${ACCENT_HEX[a]}` : "none", outlineOffset: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s" }}>
                {settings.accent === a && <I.Check size={20} color="#fff" />}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="tag" style={{ marginBottom: 14 }}>UKURAN HURUF</div>
          <div className="row">
            {["small", "medium", "large"].map((f) => (
              <button key={f} className={`chip ${settings.fontSize === f ? "active" : ""}`} onClick={() => set("fontSize")(f)}>
                {f === "small" ? "Kecil" : f === "medium" ? "Sedang" : "Besar"}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="tag" style={{ marginBottom: 14 }}>BAHASA ({LANGS.length})</div>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <I.Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--mut)" }} />
            <input className="inp" style={{ paddingLeft: 38 }} value={searchLang} onChange={(e) => setSearchLang(e.target.value)} placeholder="Cari bahasa..." />
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", border: "1.5px solid var(--bd)", borderRadius: 12 }}>
            {filtered.map(([code, name]) => (
              <button key={code} onClick={() => set("lang")(code)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "11px 15px", fontSize: 13, background: settings.lang === code ? "var(--ps)" : "transparent", color: settings.lang === code ? "var(--p)" : "var(--text)", borderBottom: "1px solid var(--bd)", textAlign: "left" }}>
                <span style={{ fontWeight: settings.lang === code ? 700 : 400 }}>{name}</span>
                {settings.lang === code && <I.Check size={15} />}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="tag" style={{ marginBottom: 8 }}>SUPABASE</div>
          {supabaseReady ? (
            user ? (
              <>
                <p className="mut" style={{ marginBottom: 12 }}>Tersambung sebagai <b>{user.email}</b>. Favorit tersinkron ke cloud.</p>
                <div className="row" style={{ padding: 12, background: "rgba(34,197,94,0.1)", borderRadius: 10, border: "1px solid rgba(34,197,94,0.3)" }}>
                  <I.CheckCircle2 size={16} color="var(--green)" />
                  <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>Cloud sync aktif</span>
                </div>
              </>
            ) : <p className="mut">Login untuk sinkronkan favorit ke cloud.</p>
          ) : (
            <p className="mut">Supabase belum dikonfigurasi. Favorit tersimpan di perangkat saja.</p>
          )}
        </div>

        <div className="card">
          <div className="tag" style={{ marginBottom: 8 }}>RESET DATA</div>
          <p className="mut" style={{ marginBottom: 14 }}>Hapus preferensi lokal dan mulai dari awal.</p>
          <button className="btn btn-danger" onClick={() => { localStorage.clear(); setSettings({ lang: "id", theme: "light", accent: "violet", fontSize: "medium", favorites: [] }); toast("Data direset", "success"); }}>
            <I.Trash2 size={14} />Reset Semua Data
          </button>
        </div>
      </div>
    </>
  );
}

function AboutPage() {
  return (
    <>
      <h1 className="h1" style={{ marginBottom: 6 }}><span className="grad">Tentang AllTool</span></h1>
      <p className="sub" style={{ marginBottom: 28 }}>Platform kumpulan alat serbaguna gratis untuk semua orang.</p>
      <div className="col" style={{ maxWidth: 720 }}>
        <div className="card">
          <p className="mut" style={{ lineHeight: 1.8 }}>
            AllTool v3.0 adalah platform kumpulan alat serbaguna yang dapat digunakan secara gratis.
            Terdiri dari {TOOLS.length} alat yang mencakup teks, developer, gambar, kalkulator, keamanan, media, dan utilitas.
            Semua alat dirancang untuk cepat, bersih, tanpa iklan, dan tanpa gangguan.
          </p>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[
            { i: "Zap", t: "Cepat", d: "Semua alat dioptimalkan untuk performa maksimal." },
            { i: "Shield", t: "Aman", d: "Data diproses di browser, tidak dikirim ke server." },
            { i: "Globe", t: "Multi Bahasa", d: "Tersedia dalam 50 bahasa dunia." },
            { i: "Sparkles", t: "Gratis", d: "Selamanya gratis tanpa iklan." },
          ].map((f) => (
            <div key={f.t} className="card">
              <div className="ic" style={{ width: 42, height: 42 }}><Icon name={f.i} size={20} /></div>
              <h3 style={{ marginTop: 14, fontSize: 15, fontWeight: 700 }}>{f.t}</h3>
              <p className="mut" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>{f.d}</p>
            </div>
          ))}
        </div>
        <div className="card" style={{ textAlign: "center", padding: 28 }}>
          <div className="soft" style={{ marginBottom: 8 }}>DIBUAT DENGAN</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Next.js · Vercel · Supabase · Tailwind CSS · Lucide</div>
          <div className="soft" style={{ marginTop: 8 }}>AllTool v3.0 · 2025</div>
        </div>
      </div>
    </>
  );
}

function Palette({ onClose, openTool }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const list = useMemo(() => !q ? TOOLS.slice(0, 12) : TOOLS.filter((t) => t.n.toLowerCase().includes(q.toLowerCase()) || t.d.toLowerCase().includes(q.toLowerCase())).slice(0, 20), [q]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && list[sel]) { openTool(list[sel].id); onClose(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [list, sel, openTool, onClose]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--bd)" }}>
          <I.Search size={20} style={{ color: "var(--mut)" }} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tools..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16 }} />
          <button className="btn-g" onClick={onClose}><I.X size={18} /></button>
        </div>
        <div style={{ maxHeight: "55vh", overflowY: "auto", padding: 10 }}>
          {list.length === 0 && <div style={{ padding: 50, textAlign: "center", color: "var(--mut)", fontSize: 14 }}>Tidak ditemukan</div>}
          {list.map((t, i) => (
            <button key={t.id} onClick={() => { openTool(t.id); onClose(); }} onMouseEnter={() => setSel(i)} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "11px 14px", borderRadius: 12, background: sel === i ? "var(--ps)" : "transparent", textAlign: "left" }}>
              <div className="ic" style={{ width: 36, height: 36 }}><Icon name={t.i} size={17} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: sel === i ? "var(--p)" : "var(--text)" }}>{t.n}</div>
                <div className="mut" style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.d}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 20px", borderTop: "1px solid var(--bd)", fontSize: 11, color: "var(--soft)" }}>
          <span>Enter untuk buka</span><span>Esc untuk tutup</span>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ onClose, onSubmit }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    await onSubmit(mode, email, password);
    setLoading(false);
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420, padding: 32 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>{mode === "login" ? "Masuk" : "Daftar"}</h2>
            <p className="mut" style={{ marginTop: 6 }}>Sinkronkan favorit ke cloud.</p>
          </div>
          <button className="btn-g" onClick={onClose}><I.X size={18} /></button>
        </div>
        <form onSubmit={submit} className="col">
          <div>
            <div className="tag" style={{ marginBottom: 6 }}>EMAIL</div>
            <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" required />
          </div>
          <div>
            <div className="tag" style={{ marginBottom: 6 }}>PASSWORD</div>
            <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required minLength={6} />
          </div>
          <button className="btn btn-p" disabled={loading} type="submit" style={{ width: "100%", marginTop: 6 }}>
            {loading ? <I.Loader2 size={14} className="spin" /> : <I.LogIn size={14} />}
            {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13 }}>
          <span className="mut">{mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}</span>
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: "var(--p)", fontWeight: 700 }}>
            {mode === "login" ? "Daftar" : "Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
    }

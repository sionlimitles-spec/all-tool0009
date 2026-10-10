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
          <Nav

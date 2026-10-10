// Multi-provider AI config
// User bisa pakai:
// 1. Groq (gratis, cepat, daftar di console.groq.com) — RECOMMENDED
// 2. Gemini (gratis, daftar di aistudio.google.com)
// 3. OpenRouter (gratis + premium, daftar di openrouter.ai)

export const PROVIDERS = {
  groq: {
    id: "groq",
    name: "Groq",
    desc: "Gratis, paling cepat. Daftar di console.groq.com",
    keyUrl: "https://console.groq.com/keys",
    keyPrefix: "gsk_",
    keyPlaceholder: "gsk_...",
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    desc: "Gratis 60 req/menit. Daftar di aistudio.google.com",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyPrefix: "AIza",
    keyPlaceholder: "AIza...",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    desc: "Gratis + premium. Daftar di openrouter.ai",
    keyUrl: "https://openrouter.ai/keys",
    keyPrefix: "sk-or-",
    keyPlaceholder: "sk-or-v1-...",
  },
};

export const AI_MODELS = [
  // ========== GROQ (GRATIS) ==========
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    name: "Llama 3.3 70B",
    desc: "Model terbaik Groq. Cepat, pintar, multibahasa.",
  },
  {
    id: "llama-3.1-8b-instant",
    provider: "groq",
    name: "Llama 3.1 8B Instant",
    desc: "Paling cepat. Bagus untuk chat umum.",
  },
  {
    id: "mixtral-8x7b-32768",
    provider: "groq",
    name: "Mixtral 8x7B",
    desc: "Bagus untuk reasoning.",
  },
  {
    id: "gemma2-9b-it",
    provider: "groq",
    name: "Gemma 2 9B",
    desc: "Model kecil dari Google via Groq.",
  },

  // ========== GEMINI (GRATIS) ==========
  {
    id: "gemini-2.0-flash-exp",
    provider: "gemini",
    name: "Gemini 2.0 Flash",
    desc: "Model terbaru Google. Cepat & pintar.",
  },
  {
    id: "gemini-1.5-flash",
    provider: "gemini",
    name: "Gemini 1.5 Flash",
    desc: "Stabil, cepat, konteks 1 juta token.",
  },
  {
    id: "gemini-1.5-pro",
    provider: "gemini",
    name: "Gemini 1.5 Pro",
    desc: "Model pro Google. Untuk task kompleks.",
  },

  // ========== OPENROUTER (GRATIS) ==========
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    provider: "openrouter",
    name: "Llama 3.3 70B (Free)",
    desc: "Gratis via OpenRouter. Perlu API key OpenRouter.",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    provider: "openrouter",
    name: "DeepSeek V3 (Free)",
    desc: "Bagus untuk coding.",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    provider: "openrouter",
    name: "Gemini 2.0 Flash (Free)",
    desc: "Gemini gratis via OpenRouter.",
  },
];

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const DEFAULT_PROVIDER = "groq";

export const SYSTEM_PROMPT = `Kamu adalah "AllTool Assistant" — asisten AI ramah yang membantu pengguna website AllTool.

## Tentang AllTool
AllTool adalah platform kumpulan 40+ alat digital gratis. Dibuat dengan Next.js, Vercel, dan Supabase.

## Daftar Alat

### AI
- **AI Chat**: Ngobrol dengan berbagai model AI (Groq, Gemini, OpenRouter).

### Downloader & Media
- **Media Downloader**: Download dari TikTok, Instagram, Facebook, X/Twitter, YouTube, Pinterest, Reddit.
- **TikTok Downloader**: Download TikTok HD 1080p tanpa watermark + audio MP3.
- **YouTube Downloader**: Download YouTube hingga 1080p, bisa pilih video/audio.
- **TeraBox Downloader**: Ambil file dari link share TeraBox.
- **Temp Mail**: Email sementara instan dengan auto-refresh.
- **IP Lookup**: Cek lokasi, ISP, info jaringan dari alamat IP.

### Hiburan
- **Komik Reader**: Baca manga/manhwa dari database MangaDex (resmi, gratis).

### Developer
- **JSON Formatter, Base64, URL Encoder, Hash Generator, QR Generator**
- **HTML Editor** dengan live preview
- **CSS Playground** dengan preview
- **HTML/CSS/JS Minifier**
- **Virus Scanner** (scan URL + file via urlscan.io & MalwareBazaar)

### Gambar
- **Image Compressor, Resizer, Converter** (PNG, JPG, WebP)

### Kalkulator
- **BMI, Age, Percentage, Unit Converter**

### Keamanan
- **Password Generator, Password Strength Checker**

### Teks
- **Word Counter, Case Converter, Lorem Ipsum, Markdown Preview**

### Utilitas
- **APK Compiler**: Ubah web jadi APK Android
- **Color Picker** (HEX/RGB/HSL)
- **Text to Speech**

## Fitur Platform
- 50 bahasa, 7 warna aksen, dark mode
- Command Palette (Ctrl+K)
- Favorites + riwayat (sync ke cloud dengan login)

## Cara Menjawab
1. Ramah, jelas, Bahasa Indonesia.
2. Format rapi: pakai poin kalau ada langkah.
3. Kalau user tanya cara pakai tool, jelaskan step-by-step.
4. Jangan mengaku AI dari OpenAI/Google/dll. Kamu AllTool Assistant.`;

// ============ STORAGE KEYS ============
export const STORAGE_KEY_MODEL = "alltool-ai-model-v2";
export const STORAGE_KEY_KEYS = "alltool-ai-keys-v2";
export const STORAGE_KEY_HISTORY = "alltool-ai-history-v2";

export function getStoredModel() {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  return localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
}

export function setStoredModel(model) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

// Keys disimpan sebagai { groq: "gsk_...", gemini: "AIza...", openrouter: "sk-or-..." }
export function getStoredKeys() {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY_KEYS) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch { return {}; }
}

export function saveStoredKeys(keys) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_KEYS, JSON.stringify(keys));
}

export function getStoredHistory() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || "[]"); }
  catch { return []; }
}

export function saveStoredHistory(h) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(h.slice(-50)));
}

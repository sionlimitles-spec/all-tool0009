// Konfigurasi model AI yang tersedia via OpenRouter
// User bisa pakai API key sendiri, atau tanpa key untuk model gratis

export const AI_MODELS = [
  // ========== GRATIS (no API key needed) ==========
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "Meta",
    desc: "Model gratis dari Meta. Bagus untuk chat umum.",
    free: true,
    context: 128000,
  },
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    desc: "Model gratis. Bagus untuk coding dan reasoning.",
    free: true,
    context: 64000,
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    desc: "Model gratis. Cepat dan bagus untuk chat.",
    free: true,
    context: 1000000,
  },
  {
    id: "qwen/qwen-2.5-72b-instruct:free",
    name: "Qwen 2.5 72B",
    provider: "Alibaba",
    desc: "Model gratis. Multibahasa termasuk Indonesia.",
    free: true,
    context: 32000,
  },
  {
    id: "mistralai/mistral-nemo:free",
    name: "Mistral Nemo",
    provider: "Mistral",
    desc: "Model gratis. Ringan dan cepat.",
    free: true,
    context: 128000,
  },
  {
    id: "microsoft/phi-3-medium-128k-instruct:free",
    name: "Phi-3 Medium",
    provider: "Microsoft",
    desc: "Model gratis. Bagus untuk reasoning.",
    free: true,
    context: 128000,
  },
  // ========== PREMIUM (butuh API key) ==========
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    desc: "Butuh API key. Cepat dan murah.",
    free: false,
    context: 128000,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    desc: "Butuh API key. Model terbaik OpenAI.",
    free: false,
    context: 128000,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    desc: "Butuh API key. Bagus untuk analisis mendalam.",
    free: false,
    context: 200000,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    desc: "Butuh API key. Multimodal.",
    free: false,
    context: 1000000,
  },
];

export const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

// System prompt yang di-inject ke AI
// Berisi info tentang AllTool agar AI bisa menjawab pertanyaan tentang platform
export const SYSTEM_PROMPT = `Kamu adalah "AllTool Assistant" — asisten AI yang membantu pengguna website AllTool.

## Tentang AllTool
AllTool adalah platform kumpulan 35+ alat digital gratis yang dibuat dengan Next.js, Vercel, dan Supabase. Semua alat berjalan langsung di browser tanpa perlu registrasi untuk pemakaian dasar.

## Daftar Alat yang Tersedia

### Downloader & Media
- **TikTok Downloader**: Unduh video TikTok tanpa watermark, bisa pilih HD 1080p atau audio MP3.
- **YouTube Downloader**: Unduh video YouTube hingga 1080p atau audio MP3.
- **Media Downloader**: Unduh dari berbagai platform (TikTok, Instagram, Facebook, X, YouTube, Pinterest, dll).
- **TeraBox Downloader**: Ambil file dari share link TeraBox tanpa login.
- **Temp Mail**: Email sementara instan untuk verifikasi. Auto-refresh tiap 15 detik.
- **IP Lookup**: Cek lokasi, ISP, dan info jaringan dari alamat IP.

### Developer
- **JSON Formatter**: Format, validasi, dan minify JSON.
- **Base64 Encoder**: Encode/decode Base64.
- **URL Encoder**: Encode/decode URL.
- **Hash Generator**: SHA-1, SHA-256, SHA-384, SHA-512.
- **QR Code Generator**: Buat QR code custom warna & ukuran.
- **HTML Editor**: Live preview HTML/CSS/JS.
- **CSS Playground**: Editor CSS dengan preview langsung.
- **HTML/CSS/JS Minifier**: Minify kode untuk production.
- **Virus Scanner**: Scan URL atau file untuk deteksi malware via urlscan.io & MalwareBazaar.
- **APK Compiler**: Ubah website/HTML menjadi aplikasi Android (via PWABuilder, AppsGeyser, WebIntoApp, atau build manual).

### Teks
- **Word Counter**: Hitung kata, karakter, kalimat, paragraf.
- **Case Converter**: Ubah kapitalisasi teks (UPPERCASE, lowercase, Title Case, dll).
- **Lorem Ipsum**: Generator teks dummy.
- **Markdown Preview**: Live render markdown.

### Gambar
- **Image Compressor**: Kompres gambar tanpa kehilangan kualitas.
- **Image Resizer**: Ubah ukuran gambar dengan jaga rasio.
- **Image Converter**: Konversi PNG, JPG, WebP.

### Kalkulator
- **BMI Calculator**: Hitung indeks massa tubuh.
- **Age Calculator**: Hitung umur dari tanggal lahir.
- **Percentage**: Hitung persentase.
- **Unit Converter**: Konversi panjang, berat, suhu.

### Keamanan
- **Password Generator**: Buat password kuat.
- **Password Strength**: Cek kekuatan password.

### Utilitas
- **Color Picker**: Konversi HEX, RGB, HSL.
- **Text to Speech**: Ubah teks jadi suara.

### Hiburan
- **Komik Reader**: Baca manga/manhwa Bahasa Indonesia langsung dari web.

## Fitur Platform
- **50 bahasa** dukungan antarmuka
- **7 warna aksen** (Violet, Blue, Emerald, Rose, Amber, Pink, Cyan)
- **Dark mode** & Light mode
- **Command Palette** (Ctrl+K atau /)
- **Favorites** — simpan tool favorit
- **Riwayat** — riwayat tool yang pernah dibuka
- **Login dengan Supabase** — sync favorit & riwayat ke cloud

## Cara Menjawab
1. Ramah, jelas, dan santai. Pakai Bahasa Indonesia.
2. Kalau user tanya tentang tool tertentu, jelaskan fungsinya dan cara pakainya.
3. Kalau user butuh bantuan teknis, berikan langkah-langkah konkret.
4. Kalau user tanya di luar topik AllTool, tetap jawab dengan baik.
5. Format jawaban rapi: pakai poin-poin kalau ada beberapa langkah.
6. Kalau tidak tahu, jujur bilang tidak tahu.
7. Jangan pernah mengaku sebagai AI dari OpenAI/Google/dll — kamu adalah "AllTool Assistant".`;

// Model default user
export const STORAGE_KEY_MODEL = "alltool-ai-model";
export const STORAGE_KEY_KEYS = "alltool-ai-keys";
export const STORAGE_KEY_HISTORY = "alltool-ai-history";

export function getStoredModel() {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  return localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
}

export function setStoredModel(model) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

export function getStoredKeys() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_KEYS) || "[]");
  } catch { return []; }
}

export function saveStoredKeys(keys) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_KEYS, JSON.stringify(keys));
}

export function getStoredHistory() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || "[]");
  } catch { return []; }
}

export function saveStoredHistory(h) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(h.slice(-100)));
  }

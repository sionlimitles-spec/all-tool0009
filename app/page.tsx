'use client';

import { useState, useEffect } from 'react';

// Helper untuk mengekstrak status dari deskripsi komik
const getComicStatus = (desc: string, type: string) => {
  if (!desc) return type;
  const lowerDesc = desc.toLowerCase();
  if (lowerDesc.includes('tamat') || lowerDesc.includes('completed')) return 'Tamat';
  if (lowerDesc.includes('hiatus')) return 'Hiatus';
  if (lowerDesc.includes('update')) return 'Ongoing';
  return type;
};

// Helper untuk warna badge status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Tamat': return 'bg-emerald-500 text-white';
    case 'Hiatus': return 'bg-yellow-500 text-black';
    case 'Ongoing': return 'bg-purple-600 text-white';
    default: return 'bg-blue-500 text-white'; // Untuk Manga/Manhwa/Manhua
  }
};

export default function KomikReader() {
  // State Navigasi Utama
  const [activeTab, setActiveTab] = useState<'home' | 'library'>('home');
  const [view, setView] = useState<'search' | 'detail' | 'reader'>('search');
  
  // State Data
  const [query, setQuery] = useState('');
  const [comics, setComics] = useState<any[]>([]);
  const [selectedComic, setSelectedComic] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterImages, setChapterImages] = useState<string[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(-1);
  
  // State UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortAsc, setSortAsc] = useState(false); // Fitur Sortir Chapter
  const [readingMode, setReadingMode] = useState<'webtoon' | 'manga'>('webtoon'); // Fitur Mode Baca
  const [currentPage, setCurrentPage] = useState(0); // Untuk mode Manga

  // State LocalStorage (Favorit & Riwayat)
  const [favorites, setFavorites] = useState<any[]>([]);
  const [history, setHistory] = useState<any>(null);

  // Load data dari LocalStorage & Fetch Komik Default saat aplikasi dibuka
  useEffect(() => {
    const savedFav = localStorage.getItem('komik_favorites');
    if (savedFav) setFavorites(JSON.parse(savedFav));
    
    const savedHist = localStorage.getItem('komik_history');
    if (savedHist) setHistory(JSON.parse(savedHist));

    // Fitur Discover: Fetch komik default jika belum ada pencarian
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/comic?action=search&query=manhwa`);
        const data = await res.json();
        if (data.success) setComics(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  // Simpan Favorit
  const toggleFavorite = (comic: any) => {
    const isFav = favorites.find(f => f.endpoint === comic.endpoint);
    let newFavs;
    if (isFav) {
      newFavs = favorites.filter(f => f.endpoint !== comic.endpoint);
    } else {
      newFavs = [...favorites, comic];
    }
    setFavorites(newFavs);
    localStorage.setItem('komik_favorites', JSON.stringify(newFavs));
  };

  // Simpan Riwayat Baca
  const saveHistory = (comic: any, chapter: any) => {
    const hist = { comic, chapter, timestamp: Date.now() };
    setHistory(hist);
    localStorage.setItem('komik_history', JSON.stringify(hist));
  };

  // Fitur Share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedComic?.title,
          text: `Baca ${selectedComic?.title} di Komik Reader!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share dibatalkan');
      }
    } else {
      alert('Browser kamu tidak mendukung fitur share bawaan.');
    }
  };

  // 1. Fungsi Mencari Komik
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setComics([]);
    setView('search');

    try {
      const response = await fetch(`/api/comic?action=search&query=${encodeURIComponent(query)}`);
      const result = await response.json();
      
      if (result.success) {
        setComics(result.data);
      } else {
        setError('Komik tidak ditemukan.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat mencari komik.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fungsi Mengambil Detail Komik & Daftar Chapter
  const handleComicClick = async (comic: any) => {
    setSelectedComic(comic);
    setChapters([]);
    setLoading(true);
    setError('');
    setView('detail');
    window.scrollTo(0, 0);

    try {
      const response = await fetch(`/api/comic?action=info&endpoint=${encodeURIComponent(comic.endpoint)}`);
      const result = await response.json();
      
      if (result.success) {
        setChapters(result.data.chapters || result.data || []);
      } else {
        setError('Gagal memuat daftar chapter.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat chapter.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fungsi Membaca Chapter
  const handleReadChapter = async (chapterEndpoint: string, index: number) => {
    setLoading(true);
    setError('');
    setChapterImages([]);
    setView('reader');
    setCurrentChapterIndex(index);
    setCurrentPage(0); // Reset halaman ke awal
    window.scrollTo(0, 0);

    try {
      const response = await fetch(`/api/comic?action=chapter&endpoint=${encodeURIComponent(chapterEndpoint)}`);
      const result = await response.json();
      
      if (result.success) {
        setChapterImages(result.data.image);
        // Simpan ke riwayat
        saveHistory(selectedComic, chapters[index]);
      } else {
        setError('Gagal memuat gambar chapter.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat gambar.');
    } finally {
      setLoading(false);
    }
  };

  // Navigasi Next/Prev Chapter
  const handleNextChapter = () => {
    if (currentChapterIndex > 0) {
      const nextIdx = currentChapterIndex - 1;
      handleReadChapter(chapters[nextIdx].endpoint, nextIdx);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const prevIdx = currentChapterIndex + 1;
      handleReadChapter(chapters[prevIdx].endpoint, prevIdx);
    }
  };

  // Fitur Sortir Chapter
  const sortedChapters = [...chapters].sort((a, b) => {
    if (sortAsc) return a.name.localeCompare(b.name);
    return b.name.localeCompare(a.name);
  });

  // --- RENDER KOMPONEN ---

  // TAMPILAN READER (BACA KOMIK)
  if (view === 'reader') {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header Reader (Tidak Sticky) */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex justify-between items-center">
          <button onClick={() => setView('detail')} className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm font-medium">
            ← Kembali
          </button>
          <div className="text-center truncate px-4">
            <h2 className="text-sm font-semibold truncate">{selectedComic?.title}</h2>
            <p className="text-xs text-purple-400">{chapters[currentChapterIndex]?.name}</p>
          </div>
          <button 
            onClick={() => setReadingMode(readingMode === 'webtoon' ? 'manga' : 'webtoon')}
            className="text-xs bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700"
          >
            {readingMode === 'webtoon' ? 'Mode Manga' : 'Mode Webtoon'}
          </button>
        </div>

        {loading && <div className="text-center text-purple-400 py-20 animate-pulse">Memuat gambar...</div>}
        {error && <div className="text-center text-red-400 py-10">{error}</div>}

        {/* Gambar Komik */}
        <div className="flex flex-col items-center pb-20">
          {readingMode === 'webtoon' ? (
            // Mode Webtoon: Gulir terus menerus
            chapterImages.map((imgUrl, index) => (
              <img 
                key={index} 
                src={imgUrl} 
                alt={`Page ${index + 1}`} 
                className="w-full max-w-3xl object-contain" 
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ))
          ) : (
            // Mode Manga: Satu gambar per halaman
            <div className="w-full max-w-3xl flex flex-col items-center">
              {chapterImages.length > 0 && (
                <>
                  <img 
                    src={chapterImages[currentPage]} 
                    alt={`Page ${currentPage + 1}`} 
                    className="w-full object-contain" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex justify-between w-full p-4 mt-4">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="px-6 py-2 bg-zinc-800 rounded-lg disabled:opacity-30"
                    >
                      ← Sebelumnya
                    </button>
                    <span className="text-zinc-400 text-sm self-center">
                      {currentPage + 1} / {chapterImages.length}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(chapterImages.length - 1, p + 1))}
                      disabled={currentPage === chapterImages.length - 1}
                      className="px-6 py-2 bg-purple-600 rounded-lg disabled:opacity-30"
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigasi Bawah Chapter */}
        {chapterImages.length > 0 && (
          <div className="bg-zinc-900 border-t border-zinc-800 p-3 flex justify-between items-center max-w-3xl mx-auto rounded-t-xl">
            <button 
              onClick={handlePrevChapter} 
              disabled={currentChapterIndex >= chapters.length - 1}
              className="px-4 py-2 bg-zinc-800 rounded-lg text-sm disabled:opacity-30 hover:bg-zinc-700 transition"
            >
              ← Chapter Sebelumnya
            </button>
            <button 
              onClick={handleNextChapter} 
              disabled={currentChapterIndex <= 0}
              className="px-4 py-2 bg-purple-600 rounded-lg text-sm disabled:opacity-30 hover:bg-purple-500 transition"
            >
              Chapter Selanjutnya →
            </button>
          </div>
        )}
      </div>
    );
  }

  // TAMPILAN UTAMA (HOME / DETAIL / LIBRARY)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
      
      {/* HEADER APLIKASI (FIX: Tidak Sticky lagi) */}
      <header className="bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg shadow-lg shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Komik<span className="text-purple-500">Reader</span></h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* FORM PENCARIAN */}
        {view === 'search' && activeTab === 'home' && (
          <form onSubmit={handleSearch} className="relative mb-8">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari manga, manhwa, atau manhua..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 pl-12 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-zinc-500"
            />
            <svg className="w-5 h-5 text-zinc-500 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <button type="submit" className="absolute right-2 top-2 bottom-2 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors">
              Cari
            </button>
          </form>
        )}

        {/* RIWAYAT BACA */}
        {view === 'search' && activeTab === 'home' && history && !loading && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Lanjut Baca</h3>
            <div 
              onClick={() => handleComicClick(history.comic)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex gap-4 cursor-pointer hover:border-purple-500/50 transition-colors"
            >
              <img src={history.comic.image} alt={history.comic.title} className="w-16 h-20 object-cover rounded-lg" referrerPolicy="no-referrer" />
              <div className="flex flex-col justify-center">
                <h4 className="font-semibold text-sm line-clamp-1">{history.comic.title}</h4>
                <p className="text-xs text-purple-400 mt-1">{history.chapter.name}</p>
                <p className="text-xs text-zinc-500 mt-1">Terakhir dibaca</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB NAVIGASI BAWAH */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 flex justify-around p-3 z-40 max-w-4xl mx-auto">
          <button onClick={() => { setActiveTab('home'); setView('search'); }} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'home' ? 'text-purple-500' : 'text-zinc-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Beranda
          </button>
          <button onClick={() => { setActiveTab('library'); setView('search'); }} className={`flex flex-col items-center gap-1 text-xs ${activeTab === 'library' ? 'text-purple-500' : 'text-zinc-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            Favorit
          </button>
        </div>

        {/* --- KONTEN --- */}

        {/* 1. TAB HOME: HASIL PENCARIAN / DISCOVER */}
        {activeTab === 'home' && view === 'search' && (
          <>
            {loading && <div className="text-center text-purple-400 py-10 animate-pulse">Memuat data...</div>}
            {error && <div className="text-center text-red-400 py-10">{error}</div>}
            
            {comics.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {comics.map((comic, index) => {
                  const status = getComicStatus(comic.desc, comic.type);
                  return (
                    <div key={index} onClick={() => handleComicClick(comic)} className="group cursor-pointer">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
                        {/* FIX: Gambar lebih HD dengan referrerPolicy */}
                        <img 
                          src={comic.image} 
                          alt={comic.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mt-3 line-clamp-2 group-hover:text-purple-400 transition-colors">{comic.title}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{comic.type}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              !loading && !error && (
                <div className="text-center py-20 text-zinc-600">
                  <p>Ketik judul komik di atas untuk mulai membaca.</p>
                </div>
              )
            )}
          </>
        )}

        {/* 2. TAB LIBRARY: DAFTAR FAVORIT */}
        {activeTab === 'library' && view === 'search' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Komik Favoritmu</h2>
            {favorites.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {favorites.map((comic, index) => {
                  const status = getComicStatus(comic.desc, comic.type);
                  return (
                    <div key={index} onClick={() => handleComicClick(comic)} className="group cursor-pointer">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
                        <img 
                          src={comic.image} 
                          alt={comic.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mt-3 line-clamp-2 group-hover:text-purple-400 transition-colors">{comic.title}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{comic.type}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-600">
                <p>Belum ada komik favorit. Tekan ikon hati di halaman detail komik.</p>
              </div>
            )}
          </div>
        )}

        {/* 3. VIEW DETAIL KOMIK */}
        {view === 'detail' && selectedComic && (
          <div className="animate-in fade-in duration-300">
            <button onClick={() => setView('search')} className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
              ← Kembali
            </button>

            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              <div className="relative w-40 sm:w-48 flex-shrink-0 mx-auto sm:mx-0">
                <img 
                  src={selectedComic.image} 
                  alt={selectedComic.title} 
                  className="w-full aspect-[3/4] object-cover rounded-2xl shadow-2xl border border-zinc-800" 
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
                <button 
                  onClick={() => toggleFavorite(selectedComic)}
                  className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg border-2 border-zinc-950 transition-colors ${favorites.find(f => f.endpoint === selectedComic.endpoint) ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                >
                  <svg className="w-5 h-5" fill={favorites.find(f => f.endpoint === selectedComic.endpoint) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </button>
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold mb-2">{selectedComic.title}</h2>
                  <button onClick={handleShare} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${getStatusColor(getComicStatus(selectedComic.desc, selectedComic.type))}`}>
                    {getComicStatus(selectedComic.desc, selectedComic.type)}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 uppercase tracking-wider">
                    {selectedComic.type}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{selectedComic.desc}</p>
              </div>
            </div>

            {/* Daftar Chapter dengan Fitur Sortir */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-purple-400">Daftar Chapter</h3>
                <button 
                  onClick={() => setSortAsc(!sortAsc)} 
                  className="text-xs bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition"
                >
                  {sortAsc ? 'Terlama → Terbaru' : 'Terbaru → Terlama'}
                </button>
              </div>
              {loading ? (
                <p className="text-center text-zinc-500 py-4 animate-pulse">Memuat chapter...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedChapters.map((chapter, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleReadChapter(chapter.endpoint, idx)} 
                      className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-left hover:bg-purple-900/20 hover:border-purple-500/50 transition-all text-sm font-medium flex justify-between items-center group"
                    >
                      <span className="line-clamp-1">{chapter.name}</span>
                      <svg className="w-4 h-4 text-zinc-600 group-hover:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ))}
                  {sortedChapters.length === 0 && !loading && (
                    <p className="text-zinc-500 text-sm italic col-span-2 text-center py-4">Daftar chapter tidak tersedia.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
        }

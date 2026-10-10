'use client';

import { useState } from 'react';

export default function KomikReader() {
  // State untuk pencarian
  const [query, setQuery] = useState('');
  const [comics, setComics] = useState<any[]>([]);
  
  // State untuk navigasi & detail
  const [selectedComic, setSelectedComic] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterImages, setChapterImages] = useState<string[]>([]);
  
  // State untuk status UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Fungsi Mencari Komik
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setComics([]);
    setSelectedComic(null);
    setChapters([]);
    setChapterImages([]);

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

    try {
      // Memanggil action=info untuk mendapatkan daftar chapter
      const response = await fetch(`/api/comic?action=info&endpoint=${encodeURIComponent(comic.endpoint)}`);
      const result = await response.json();
      
      if (result.success) {
        // Biasanya data chapter ada di result.data.chapters atau langsung result.data
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

  // 3. Fungsi Membaca Chapter (Mengambil Gambar)
  const handleReadChapter = async (chapterEndpoint: string) => {
    setLoading(true);
    setError('');
    setChapterImages([]);

    try {
      const response = await fetch(`/api/comic?action=chapter&endpoint=${encodeURIComponent(chapterEndpoint)}`);
      const result = await response.json();
      
      if (result.success) {
        setChapterImages(result.data.image);
      } else {
        setError('Gagal memuat gambar chapter.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat gambar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white p-4 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8 pt-4">
          <div className="bg-purple-600 p-3 rounded-xl shadow-lg shadow-purple-500/30">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Komik Reader</h1>
            <p className="text-gray-400 text-sm">Baca manga dan manhwa Bahasa Indonesia.</p>
          </div>
        </div>

        {/* FORM PENCARIAN */}
        {!selectedComic && chapterImages.length === 0 && (
          <form onSubmit={handleSearch} className="flex gap-2 mb-8 bg-[#1a1a24] p-2 rounded-xl border border-gray-800">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari manga, manhwa, atau manhua..."
              className="flex-1 bg-transparent px-4 py-2 outline-none text-white placeholder-gray-500"
            />
            <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
              Cari
            </button>
          </form>
        )}

        {/* STATUS LOADING & ERROR */}
        {loading && <div className="text-center text-purple-400 py-10 animate-pulse">Memuat data...</div>}
        {error && <div className="text-center text-red-400 bg-red-900/20 py-4 rounded-lg border border-red-900/50">{error}</div>}

        {/* --- TAMPILAN 1: HASIL PENCARIAN --- */}
        {!selectedComic && comics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {comics.map((comic, index) => (
              <div 
                key={index} 
                onClick={() => handleComicClick(comic)}
                className="bg-[#1a1a24] rounded-xl overflow-hidden cursor-pointer border border-gray-800 hover:border-purple-500 transition-all group"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img src={comic.image} alt={comic.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2">{comic.title}</h3>
                  <p className="text-xs text-purple-400 mt-1">{comic.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAMPILAN 2: DETAIL KOMIK & DAFTAR CHAPTER --- */}
        {selectedComic && chapterImages.length === 0 && (
          <div>
            <button onClick={() => setSelectedComic(null)} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              ← Kembali ke Pencarian
            </button>
            
            <div className="flex gap-6 mb-8 bg-[#1a1a24] p-4 rounded-xl border border-gray-800">
              <img src={selectedComic.image} alt={selectedComic.title} className="w-32 h-44 object-cover rounded-lg shadow-lg" />
              <div>
                <h2 className="text-xl font-bold mb-2">{selectedComic.title}</h2>
                <p className="text-sm text-gray-400 line-clamp-4">{selectedComic.desc}</p>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-4 text-purple-400">Daftar Chapter</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chapters.map((chapter, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleReadChapter(chapter.endpoint)} 
                  className="p-3 bg-[#1a1a24] border border-gray-800 rounded-lg text-left hover:bg-purple-900/30 hover:border-purple-500 transition-all text-sm font-medium"
                >
                  {chapter.name}
                </button>
              ))}
              {chapters.length === 0 && !loading && (
                <p className="text-gray-500 text-sm italic">Daftar chapter tidak tersedia atau masih dimuat...</p>
              )}
            </div>
          </div>
        )}

        {/* --- TAMPILAN 3: BACA KOMIK (GAMBAR) --- */}
        {chapterImages.length > 0 && (
          <div className="flex flex-col items-center">
            <button 
              onClick={() => setChapterImages([])} 
              className="mb-6 px-4 py-2 bg-[#1a1a24] border border-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors sticky top-4 z-10"
            >
              ← Tutup Chapter
            </button>
            <div className="w-full flex flex-col items-center gap-1">
              {chapterImages.map((imgUrl, index) => (
                <img 
                  key={index} 
                  src={imgUrl} 
                  alt={`Page ${index + 1}`} 
                  className="w-full max-w-2xl rounded-sm" 
                  loading="lazy" // Agar gambar dimuat secara bertahap (hemat kuota)
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
                                                                                                        }

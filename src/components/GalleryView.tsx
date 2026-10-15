import React, { useState } from 'react';
import { useColoring } from '../context/ColoringContext';
import { COLORING_PAGES } from '../data/coloringPages';
import { Heart, Trash2, Play, Download, Sparkles } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';

type GalleryTab = 'My Coloring' | 'Favorites' | 'Completed' | 'New';

export const GalleryView: React.FC = () => {
  const {
    savedArtworks,
    favorites,
    openColoringPage,
    deleteArtwork,
    toggleFavorite,
    setScreen,
    brushConfig,
  } = useColoring();

  const [activeTab, setActiveTab] = useState<GalleryTab>('My Coloring');

  const getFilteredItems = () => {
    switch (activeTab) {
      case 'My Coloring':
        return savedArtworks;
      case 'Favorites':
        return COLORING_PAGES.filter(p => favorites.includes(p.id));
      case 'Completed':
        return savedArtworks.filter(s => s.progressPercent >= 40 || s.isCompleted);
      case 'New':
      default:
        return COLORING_PAGES.slice(0, 4);
    }
  };

  const items = getFilteredItems();

  const handleOpenPageById = (pageId: string) => {
    const page = COLORING_PAGES.find(p => p.id === pageId);
    if (page) {
      soundEngine.playFillSound(brushConfig.soundEnabled);
      hapticsEngine.triggerTap(brushConfig.hapticEnabled);
      openColoringPage(page);
    }
  };

  const handleDownload = (dataUrl: string, title: string) => {
    const link = document.createElement('a');
    link.download = `KawaiiColor_${title.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#FFF5F7] overflow-y-auto pb-24 no-scrollbar select-none">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 pt-4 pb-3 bg-white/80 backdrop-blur-md border-b border-pink-100 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#E5738E]" />
          <h1 className="text-lg font-extrabold text-[#4A3B43] tracking-tight">Gallery</h1>
        </div>
        <span className="text-xs text-[#8E7C85] font-semibold">
          {savedArtworks.length} saved works
        </span>
      </header>

      <main className="flex flex-col gap-4 p-4">
        {/* Gallery Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-pink-100 shadow-2xs">
          {(['My Coloring', 'Favorites', 'Completed', 'New'] as GalleryTab[]).map(tab => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#E5738E] text-white shadow-xs'
                    : 'text-[#8E7C85] hover:text-[#4A3B43]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Gallery Grid */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center text-[#E5738E] mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#4A3B43]">No coloring here yet</h3>
            <p className="text-xs text-[#8E7C85] max-w-xs mt-1">
              Pick a coloring page from the catalog to begin your cozy artwork!
            </p>
            <button
              onClick={() => setScreen('home')}
              className="mt-4 px-4 py-2 bg-[#E5738E] text-white text-xs font-bold rounded-2xl shadow-sm cursor-pointer"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {items.map(item => {
              const isSavedArtwork = 'previewDataUrl' in item;
              const pageId = isSavedArtwork ? item.pageId : item.id;
              const title = item.title;
              const progress = isSavedArtwork ? item.progressPercent : 0;
              const isFav = favorites.includes(pageId);

              return (
                <div
                  key={item.id}
                  className="group relative bg-white rounded-3xl p-2.5 border border-pink-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => handleOpenPageById(pageId)}
                    className="relative w-full aspect-[3/4] rounded-2xl bg-[#FCF8F7] border border-pink-50 overflow-hidden cursor-pointer flex items-center justify-center p-1"
                  >
                    {isSavedArtwork && item.previewDataUrl ? (
                      <img
                        src={item.previewDataUrl}
                        alt={title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{
                          __html: COLORING_PAGES.find(p => p.id === pageId)?.lineArtSvg || '',
                        }}
                      />
                    )}

                    {/* Progress Badge */}
                    {progress > 0 && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#E5738E] shadow-2xs">
                        {progress}%
                      </div>
                    )}
                  </div>

                  {/* Info & Quick Actions */}
                  <div className="flex flex-col pt-2 px-1">
                    <span className="text-xs font-bold text-[#4A3B43] truncate">{title}</span>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-pink-50">
                      <button
                        onClick={() => handleOpenPageById(pageId)}
                        className="flex items-center gap-1 text-[11px] font-bold text-[#E5738E] hover:underline cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-[#E5738E]" />
                        <span>Color</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {isSavedArtwork && item.previewDataUrl && (
                          <button
                            onClick={() => handleDownload(item.previewDataUrl, title)}
                            className="p-1 text-[#8E7C85] hover:text-[#4A3B43] rounded-full hover:bg-pink-50 cursor-pointer"
                            title="Download PNG"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleFavorite(pageId)}
                          className="p-1 text-[#8E7C85] hover:text-[#E5738E] rounded-full hover:bg-pink-50 cursor-pointer"
                          title="Favorite"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isFav ? 'fill-[#E5738E] text-[#E5738E]' : 'text-[#8E7C85]'
                            }`}
                          />
                        </button>
                        {isSavedArtwork && (
                          <button
                            onClick={() => deleteArtwork(item.id)}
                            className="p-1 text-[#8E7C85] hover:text-red-500 rounded-full hover:bg-pink-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

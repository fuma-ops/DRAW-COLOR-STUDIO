import React, { useState } from 'react';
import { useColoring } from '../context/ColoringContext';
import { CategoryType, ColoringPage } from '../types';
import { COLORING_PAGES } from '../data/coloringPages';
import { Heart, Sparkles, Search, Play, Settings, Video } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';

const CATEGORIES: CategoryType[] = [
  'All',
  'Cute',
  'Cozy Life',
  'Food',
  'Flowers',
  'Fashion',
  'Nature',
  'Seasonal',
];

const PageThumbnail: React.FC<{ page: ColoringPage; savedPreview?: string }> = ({
  page,
  savedPreview,
}) => {
  const [imgError, setImgError] = useState(false);

  if (savedPreview) {
    return <img src={savedPreview} alt={page.title} className="w-full h-full object-contain" />;
  }

  if (page.imageUrl && !imgError) {
    return (
      <img
        src={page.imageUrl}
        alt={page.title}
        className="w-full h-full object-contain p-1"
        onError={() => setImgError(true)}
      />
    );
  }

  if (page.lineArtSvg) {
    return (
      <div
        className="w-full h-full p-1"
        dangerouslySetInnerHTML={{ __html: page.lineArtSvg }}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-[#8E7C85]">
      {page.title}
    </div>
  );
};

export const HomeView: React.FC = () => {
  const {
    openColoringPage,
    openStudioMode,
    setScreen,
    favorites,
    toggleFavorite,
    savedArtworks,
    setIsSettingsOpen,
    brushConfig,
  } = useColoring();

  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPages = COLORING_PAGES.filter(p => {
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const handleSelectPage = (page: ColoringPage) => {
    soundEngine.playFillSound(brushConfig.soundEnabled);
    hapticsEngine.triggerTap(brushConfig.hapticEnabled);
    openColoringPage(page);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#FFF5F7] overflow-y-auto pb-24 no-scrollbar select-none">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 px-4 pt-4 pb-3 bg-white/80 backdrop-blur-md border-b border-pink-100 flex items-center justify-between shadow-2xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-lg sm:text-xl font-extrabold text-[#4A3B43] tracking-tight">
              Hi! Let's color today
            </span>
            <span className="text-lg">✨</span>
          </div>
          <span className="text-[11px] text-[#8E7C85] font-medium">
            Relax with cute line art & soft textures
          </span>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full bg-pink-50 hover:bg-pink-100 text-[#7A6872] transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Feed */}
      <main className="flex flex-col gap-4 p-4">
        {/* Search Input Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A2929B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cozy illustrations, sweets, cats..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-pink-100/90 text-xs font-medium placeholder:text-[#B5A5AF] focus:outline-none focus:ring-2 focus:ring-pink-300 shadow-2xs"
          />
        </div>

        {/* Featured Daily Spotlight Banner (Hero Artwork) */}
        <div
          onClick={() => handleSelectPage(COLORING_PAGES[0])}
          className="group relative w-full bg-gradient-to-r from-pink-100 via-purple-50 to-pink-50 rounded-3xl p-4 border border-pink-200/80 shadow-md cursor-pointer overflow-hidden transition-all hover:shadow-lg active:scale-[0.99]"
        >
          <div className="relative z-10 flex flex-col max-w-[62%]">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-bold text-[#E5738E] mb-1.5 w-fit shadow-2xs">
              <Sparkles className="w-3 h-3" />
              <span>Today's Pick</span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#4A3B43] leading-snug">
              {COLORING_PAGES[0].title}
            </h3>
            <p className="text-[11px] text-[#7A6872] mt-1 line-clamp-2">
              {COLORING_PAGES[0].subtitle}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#E5738E]">
              <span>Color Now</span>
              <Play className="w-3 h-3 fill-[#E5738E]" />
            </div>
          </div>
          {/* Hero Thumbnail Preview */}
          <div className="absolute right-3 -bottom-2 w-32 h-44 rounded-2xl bg-white shadow-md border-2 border-white overflow-hidden transform rotate-2 group-hover:rotate-0 transition-transform">
            <PageThumbnail page={COLORING_PAGES[0]} />
          </div>
        </div>

        {/* 🌟 HERO BANNER: Kid Step-by-Step Bee Drawing & Video Generator */}
        <div
          onClick={() => setScreen('kid_video_generator')}
          className="w-full bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500 rounded-3xl p-4 text-white shadow-lg cursor-pointer transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between border-2 border-amber-300 ring-2 ring-amber-200/50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/25 backdrop-blur-xs rounded-2xl flex items-center justify-center text-2xl shadow-inner animate-bounce">
              🐝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wide">DESSINE L'ABEILLE PAS À PAS</span>
                <span className="px-2 py-0.5 bg-yellow-300 text-amber-950 font-black text-[10px] rounded-full shadow-xs">
                  POUR ENFANTS ✨
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-bold mt-0.5 leading-snug">
                Tête 🟡 • Yeux 😊 • Corps 🐝 • Antennes 🎈 • Ailes 🪽 • Félicitations 🎉 & Vidéo 🎬
              </p>
            </div>
          </div>
          <div className="p-2.5 bg-white text-amber-600 rounded-2xl shadow-md font-black text-xs flex items-center gap-1 shrink-0">
            <span>Jouer</span>
            <Play className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
          </div>
        </div>

        {/* Studio Mode Creator Banner */}
        <div
          onClick={() => openStudioMode(COLORING_PAGES[0])}
          className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 rounded-3xl p-3.5 text-white shadow-md cursor-pointer transition-all hover:shadow-lg active:scale-[0.99] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-2xl">
              <Video className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wide">KAWAII COLORING STUDIO</span>
                <span className="px-1.5 py-0.5 bg-white text-pink-600 font-extrabold text-[9px] rounded-full">
                  NEW
                </span>
              </div>
              <p className="text-[10px] text-pink-100 font-medium">
                Automated bot coloring & Ultra HD video creator for YouTube ASMR
              </p>
            </div>
          </div>
          <div className="p-1.5 bg-white/20 rounded-full">
            <Play className="w-3.5 h-3.5 fill-white text-white" />
          </div>
        </div>

        {/* User-Recorded Drawing and Automatic Coloring Engine Banner */}
        <div
          onClick={() => setScreen('recording_studio')}
          className="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 rounded-3xl p-3.5 text-white shadow-md cursor-pointer transition-all hover:shadow-lg active:scale-[0.99] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-2xl text-lg">
              ✍️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wide">USER RECORDING & REPLAY ENGINE</span>
                <span className="px-1.5 py-0.5 bg-yellow-300 text-amber-900 font-extrabold text-[9px] rounded-full">
                  PHASES 1–6
                </span>
              </div>
              <p className="text-[10px] text-purple-100 font-medium">
                Record your drawing sequence, replay faithfully & color automatically from reference
              </p>
            </div>
          </div>
          <div className="p-1.5 bg-white/20 rounded-full">
            <Play className="w-3.5 h-3.5 fill-white text-white" />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E5738E] text-white shadow-sm shadow-pink-300/60 scale-105'
                    : 'bg-white text-[#7A6872] hover:text-[#4A3B43] border border-pink-100/70 shadow-2xs'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Coloring Pages Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {filteredPages.map(page => {
            const isFav = favorites.includes(page.id);
            const saved = savedArtworks.find(s => s.pageId === page.id);
            const progress = saved ? saved.progressPercent : 0;

            return (
              <div
                key={page.id}
                onClick={() => handleSelectPage(page)}
                className="group relative bg-white rounded-3xl p-2.5 border border-pink-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden active:scale-[0.98]"
              >
                {/* Artwork Thumbnail Container */}
                <div className="relative w-full aspect-[3/4] rounded-2xl bg-[#FCF8F7] border border-pink-50 overflow-hidden flex items-center justify-center p-1">
                  <PageThumbnail page={page} savedPreview={saved?.previewDataUrl} />

                  {/* Favorite Button */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleFavorite(page.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-xs text-[#7A6872] hover:bg-white shadow-xs transition-transform active:scale-90 cursor-pointer"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFav ? 'fill-[#E5738E] text-[#E5738E]' : 'text-[#8E7C85]'
                      }`}
                    />
                  </button>

                  {/* Progress Badge */}
                  {progress > 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#E5738E] shadow-2xs">
                      {progress}%
                    </div>
                  )}
                </div>

                {/* Card Title & Info */}
                <div className="flex flex-col pt-2 px-1">
                  <span className="text-xs font-bold text-[#4A3B43] truncate group-hover:text-[#E5738E] transition-colors">
                    {page.title}
                  </span>
                  <div className="flex items-center justify-between mt-0.5 text-[10px] text-[#8E7C85]">
                    <span>{page.category}</span>
                    <span>{page.difficulty}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

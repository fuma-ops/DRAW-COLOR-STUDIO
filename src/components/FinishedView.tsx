import React, { useState, useEffect } from 'react';
import { useColoring } from '../context/ColoringContext';
import { WallpaperPreviewModal } from './WallpaperPreviewModal';
import { Home, Download, Share2, Smartphone, Sparkles, RefreshCw, Heart } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';

export const FinishedView: React.FC = () => {
  const {
    activeFinishedArtwork,
    setScreen,
    brushConfig,
  } = useColoring();

  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    soundEngine.playCelebrationChime(brushConfig.soundEnabled);
    hapticsEngine.triggerSuccess(brushConfig.hapticEnabled);
  }, [brushConfig.soundEnabled, brushConfig.hapticEnabled]);

  if (!activeFinishedArtwork) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#FFF5F7]">
        <span className="text-sm font-bold text-[#4A3B43]">No artwork selected</span>
        <button
          onClick={() => setScreen('home')}
          className="mt-3 px-4 py-2 bg-[#E5738E] text-white text-xs font-bold rounded-2xl cursor-pointer"
        >
          Go Home
        </button>
      </div>
    );
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `KawaiiColor_${activeFinishedArtwork.title.replace(/\s+/g, '_')}.png`;
    link.href = activeFinishedArtwork.previewDataUrl;
    link.click();
    soundEngine.playFillSound(brushConfig.soundEnabled);
  };

  const handleShare = async () => {
    soundEngine.playFillSound(brushConfig.soundEnabled);
    if (navigator.share && activeFinishedArtwork.previewDataUrl) {
      try {
        const res = await fetch(activeFinishedArtwork.previewDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${activeFinishedArtwork.title}.png`, { type: 'image/png' });
        await navigator.share({
          title: `My Kawaii Coloring: ${activeFinishedArtwork.title}`,
          text: 'Look at what I colored in Kawaii Color! 🌸',
          files: [file],
        });
      } catch {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } else {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-gradient-to-b from-[#FFF5F7] via-[#FFE5EC] to-[#FDE8EE] overflow-y-auto pb-6 p-4 select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between py-2">
        <button
          onClick={() => setScreen('home')}
          className="p-2 rounded-full bg-white/80 hover:bg-white text-[#7A6872] shadow-2xs transition-colors cursor-pointer"
          title="Home"
        >
          <Home className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1 text-base font-extrabold text-[#4A3B43]">
          <Sparkles className="w-4 h-4 text-[#E5738E]" />
          <span>Finished!</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Center Artwork Framing */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto py-2">
        <div className="relative max-w-xs w-full aspect-[3/4] bg-white rounded-3xl p-3 shadow-2xl border-4 border-white flex items-center justify-center overflow-hidden transform hover:scale-[1.01] transition-transform">
          <img
            src={activeFinishedArtwork.previewDataUrl}
            alt={activeFinishedArtwork.title}
            className="w-full h-full object-contain rounded-2xl"
          />
          {/* Sparkle Badges Overlay */}
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#E5738E] shadow-xs flex items-center gap-1">
            <Heart className="w-3 h-3 fill-[#E5738E]" />
            <span>Masterpiece</span>
          </div>
        </div>
        <div className="flex flex-col items-center text-center mt-3">
          <h2 className="text-base font-extrabold text-[#4A3B43] tracking-tight">
            {activeFinishedArtwork.title}
          </h2>
          <span className="text-xs font-medium text-[#8E7C85] mt-0.5">
            Colored with {brushConfig.name} & soft textures
          </span>
        </div>
      </main>

      {/* Action Buttons Row */}
      <footer className="flex flex-col gap-3 w-full max-w-xs mx-auto z-10">
        <div className="grid grid-cols-3 gap-2">
          {/* Save Button */}
          <button
            onClick={handleDownload}
            className="flex flex-col items-center justify-center py-2.5 px-2 bg-white/90 hover:bg-white rounded-2xl border border-pink-100 text-[#4A3B43] shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#E5738E] mb-1" />
            <span className="text-[11px] font-bold">Save</span>
          </button>
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center justify-center py-2.5 px-2 bg-white/90 hover:bg-white rounded-2xl border border-pink-100 text-[#4A3B43] shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#E5738E] mb-1" />
            <span className="text-[11px] font-bold">Share</span>
          </button>
          {/* Wallpaper Button */}
          <button
            onClick={() => setShowWallpaperModal(true)}
            className="flex flex-col items-center justify-center py-2.5 px-2 bg-white/90 hover:bg-white rounded-2xl border border-pink-100 text-[#4A3B43] shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-[#E5738E] mb-1" />
            <span className="text-[11px] font-bold whitespace-nowrap">Wallpaper</span>
          </button>
        </div>

        {/* Primary CTA: Color Another One */}
        <button
          onClick={() => setScreen('home')}
          className="w-full py-3.5 bg-[#E5738E] hover:bg-[#D65F7B] text-white text-xs font-bold rounded-2xl shadow-lg shadow-pink-300/60 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Color Another One</span>
        </button>
      </footer>

      {/* Share Toast */}
      {shareSuccess && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#4A3B43] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl z-50 flex items-center gap-1.5 animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5 text-pink-300" />
          <span>Ready to share! Image downloaded 🌸</span>
        </div>
      )}

      {/* Wallpaper Preview Lockscreen Mockup Modal */}
      {showWallpaperModal && (
        <WallpaperPreviewModal
          artworkUrl={activeFinishedArtwork.previewDataUrl}
          artworkTitle={activeFinishedArtwork.title}
          onClose={() => setShowWallpaperModal(false)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

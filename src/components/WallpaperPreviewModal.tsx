import React from 'react';
import { X, Download, Heart } from 'lucide-react';

interface WallpaperPreviewModalProps {
  artworkUrl: string;
  artworkTitle: string;
  onClose: () => void;
  onDownload: () => void;
}

export const WallpaperPreviewModal: React.FC<WallpaperPreviewModalProps> = ({
  artworkUrl,
  artworkTitle,
  onClose,
  onDownload,
}) => {
  const currentTime = '09:41';
  const currentDate = 'Wednesday, October 7';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative max-w-xs w-full flex flex-col items-center gap-4">
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Realistic Mobile Phone Mockup Frame */}
        <div className="relative w-[280px] h-[580px] bg-[#1C1A1B] rounded-[44px] p-2.5 shadow-2xl border-[6px] border-[#2A2426] overflow-hidden flex flex-col justify-between">
          {/* Wallpaper Artwork Background */}
          <img
            src={artworkUrl}
            alt={artworkTitle}
            className="absolute inset-0 w-full h-full object-cover -z-0"
          />

          {/* Soft Dimming Scrim for Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none" />

          {/* Dynamic Island / Notch */}
          <div className="relative z-10 mx-auto w-24 h-5 bg-black rounded-full flex items-center justify-end px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
          </div>

          {/* Lock Screen Time & Date */}
          <div className="relative z-10 flex flex-col items-center text-white pt-3 drop-shadow-md">
            <span className="text-xs font-semibold tracking-wide text-white/90">{currentDate}</span>
            <span className="text-5xl font-extrabold tracking-tight font-sans mt-0.5">{currentTime}</span>
          </div>

          {/* Cozy Lock Screen Notification */}
          <div className="relative z-10 mx-2 bg-white/70 backdrop-blur-md rounded-2xl p-2.5 border border-white/40 shadow-lg flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl bg-[#E5738E] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-[#4A3B43]">Kawaii Color</span>
              <span className="text-[10px] text-[#7A6872] leading-tight">
                Your artwork looks stunning as your lockscreen wallpaper! 💖
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onDownload}
            className="flex-1 py-2.5 bg-[#E5738E] hover:bg-[#D65F7B] text-white text-xs font-bold rounded-2xl shadow-lg shadow-pink-900/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Save Wallpaper Image
          </button>
        </div>
      </div>
    </div>
  );
};

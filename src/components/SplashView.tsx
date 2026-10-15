import React from 'react';
import { useColoring } from '../context/ColoringContext';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';

export const SplashView: React.FC = () => {
  const { setScreen, brushConfig } = useColoring();

  const handleGetStarted = () => {
    soundEngine.playFillSound(brushConfig.soundEnabled);
    hapticsEngine.triggerTap(brushConfig.hapticEnabled);
    setScreen('home');
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-center p-6 bg-gradient-to-b from-[#FFF5F7] via-[#FFE5EC] to-[#FDE8EE] overflow-hidden select-none">
      {/* Decorative Pastel Background Shapes & Sparkles */}
      <div className="absolute top-10 left-6 w-32 h-32 rounded-full bg-pink-200/40 blur-2xl pointer-events-none" />
      <div className="absolute bottom-20 right-6 w-40 h-40 rounded-full bg-purple-200/30 blur-2xl pointer-events-none" />

      {/* Floating Sparkles & Hearts */}
      <div className="absolute top-16 right-10 animate-bounce duration-1000">
        <Sparkles className="w-5 h-5 text-pink-400 opacity-80" />
      </div>
      <div className="absolute top-36 left-8">
        <Heart className="w-4 h-4 text-pink-300 fill-pink-300 opacity-70" />
      </div>
      <div className="absolute bottom-32 left-10">
        <Sparkles className="w-4 h-4 text-purple-300 opacity-70" />
      </div>

      {/* App Branding Top */}
      <div className="flex flex-col items-center text-center mt-6 z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-xs border border-pink-200/60 shadow-2xs mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#E5738E]" />
          <span className="text-[11px] font-bold text-[#7A6872] tracking-wider uppercase">
            Relaxing Digital Studio
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#4A3B43] tracking-tight font-sans">
          Kawaii <span className="text-[#E5738E]">Color</span>
        </h1>
        <p className="text-sm font-medium text-[#7A6872] mt-1.5 max-w-xs">
          Color your happy moments 💖
        </p>
      </div>

      {/* Mascot Cute Illustration Center */}
      <div className="relative z-10 my-auto flex flex-col items-center">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-white/80 backdrop-blur-xs border-4 border-white shadow-xl flex items-center justify-center p-4">
          <svg viewBox="0 0 300 300" className="w-full h-full object-contain">
            {/* Bunny Ears */}
            <path
              d="M 90 140 C 60 70 80 20 115 35 C 135 45 130 90 120 130 Z"
              fill="#FFFFFF"
              stroke="#4A3B43"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 95 110 C 75 70 85 40 105 45 C 115 50 115 80 110 105 Z"
              fill="#FFB7C5"
              stroke="#4A3B43"
              strokeWidth="2.5"
            />
            <path
              d="M 210 130 C 200 90 195 45 215 35 C 250 20 270 70 240 140 Z"
              fill="#FFFFFF"
              stroke="#4A3B43"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 220 105 C 215 80 215 50 225 45 C 245 40 255 70 235 110 Z"
              fill="#FFB7C5"
              stroke="#4A3B43"
              strokeWidth="2.5"
            />
            {/* Ear Bow */}
            <path
              d="M 95 125 C 75 110 50 105 45 125 C 40 140 70 145 95 130 Z"
              fill="#FF8DA1"
              stroke="#4A3B43"
              strokeWidth="3.5"
            />
            <path
              d="M 105 125 C 125 110 150 105 155 125 C 160 140 130 145 105 130 Z"
              fill="#FF8DA1"
              stroke="#4A3B43"
              strokeWidth="3.5"
            />
            <circle cx="100" cy="127" r="7" fill="#FFB7C5" stroke="#4A3B43" strokeWidth="3" />
            {/* Bunny Head */}
            <ellipse
              cx="160"
              cy="180"
              rx="75"
              ry="65"
              fill="#FFFFFF"
              stroke="#4A3B43"
              strokeWidth="4.5"
            />
            {/* Anime Eyes */}
            <ellipse cx="125" cy="175" rx="11" ry="14" fill="#4A3B43" />
            <circle cx="121" cy="170" r="4.5" fill="#FFFFFF" />
            <circle cx="129" cy="181" r="2.5" fill="#FFFFFF" />
            <ellipse cx="195" cy="175" rx="11" ry="14" fill="#4A3B43" />
            <circle cx="191" cy="170" r="4.5" fill="#FFFFFF" />
            <circle cx="199" cy="181" r="2.5" fill="#FFFFFF" />
            {/* Blush */}
            <ellipse cx="108" cy="195" rx="10" ry="6" fill="#FFB7C5" opacity="0.8" />
            <ellipse cx="212" cy="195" rx="10" ry="6" fill="#FFB7C5" opacity="0.8" />
            {/* Nose & Mouth */}
            <polygon points="157,185 163,185 160,190" fill="#4A3B43" />
            <path
              d="M 154 195 C 157 200 160 200 160 195 C 160 200 163 200 166 195"
              fill="none"
              stroke="#4A3B43"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Paws Holding Big Heart */}
            <path
              d="M 160 270 C 160 260 115 220 115 190 C 115 165 145 160 160 180 C 175 160 205 165 205 190 C 205 220 160 260 160 270 Z"
              fill="#FF8DA1"
              stroke="#4A3B43"
              strokeWidth="4"
            />
            {/* Left Paw */}
            <ellipse
              cx="120"
              cy="205"
              rx="12"
              ry="10"
              fill="#FFFFFF"
              stroke="#4A3B43"
              strokeWidth="3.5"
            />
            {/* Right Paw */}
            <ellipse
              cx="200"
              cy="205"
              rx="12"
              ry="10"
              fill="#FFFFFF"
              stroke="#4A3B43"
              strokeWidth="3.5"
            />
          </svg>
        </div>

        {/* Small Floating Hearts around Mascot */}
        <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-[#8E7C85]">
          <Heart className="w-3.5 h-3.5 fill-[#E5738E] text-[#E5738E]" />
          <span>Realistic Crayon & Watercolor Textures</span>
        </div>
      </div>

      {/* Buttons Bottom */}
      <div className="w-full max-w-xs flex flex-col gap-2.5 z-10 mb-2">
        <button
          onClick={handleGetStarted}
          className="w-full py-3.5 bg-[#E5738E] hover:bg-[#D65F7B] text-white text-sm font-bold rounded-2xl shadow-lg shadow-pink-300/60 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleGetStarted}
          className="w-full py-2.5 bg-white/70 hover:bg-white text-[#7A6872] text-xs font-bold rounded-2xl border border-pink-100 transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

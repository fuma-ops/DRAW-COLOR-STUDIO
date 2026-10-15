import React from 'react';
import { useColoring } from '../context/ColoringContext';
import { Home, Image as ImageIcon, Heart, SlidersHorizontal } from 'lucide-react';
import { hapticsEngine } from '../utils/haptics';

export const BottomNavBar: React.FC = () => {
  const { screen, setScreen, setIsSettingsOpen, brushConfig } = useColoring();

  // Hide bottom navigation on Splash, Coloring, Studio, and Finished screens
  if (screen === 'splash' || screen === 'coloring' || screen === 'finished' || screen === 'studio' || screen === 'recording_studio' || screen === 'kid_video_generator') {
    return null;
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, action: () => setScreen('home') },
    { id: 'gallery', label: 'Library', icon: ImageIcon, action: () => setScreen('gallery') },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Heart,
      action: () => setScreen('gallery'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SlidersHorizontal,
      action: () => setIsSettingsOpen(true),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-pink-100 max-w-md mx-auto">
      <div className="grid grid-cols-4 items-center h-16 px-2">
        {navItems.map(item => {
          const isActive =
            (item.id === 'home' && screen === 'home') ||
            (item.id === 'gallery' && screen === 'gallery');

          return (
            <button
              key={item.id}
              onClick={() => {
                hapticsEngine.triggerTap(brushConfig.hapticEnabled);
                item.action();
              }}
              className="flex flex-col items-center justify-center h-full cursor-pointer group transition-colors"
            >
              <item.icon
                className={`w-5 h-5 transition-transform ${
                  isActive
                    ? 'text-[#E5738E] scale-110'
                    : 'text-[#8E7C85] group-hover:text-[#4A3B43]'
                }`}
              />
              <span
                className={`text-[10px] font-bold mt-1 tracking-tight ${
                  isActive ? 'text-[#E5738E]' : 'text-[#8E7C85]'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[#E5738E] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

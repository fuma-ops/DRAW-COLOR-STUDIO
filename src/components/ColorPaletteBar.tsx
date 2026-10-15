import React, { useState } from 'react';
import { useColoring } from '../context/ColoringContext';
import { COLOR_PALETTES } from '../data/palettes';
import { Plus, Palette as PaletteIcon, Check } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';

export const ColorPaletteBar: React.FC = () => {
  const {
    selectedColor,
    setSelectedColor,
    activePalette,
    setActivePalette,
    recentColors,
    addRecentColor,
    brushConfig,
    setBrushConfig,
  } = useColoring();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const [customHex, setCustomHex] = useState('#FF8DA1');

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    setBrushConfig(prev => ({ ...prev, color }));
    soundEngine.playFillSound(brushConfig.soundEnabled);
    hapticsEngine.triggerTap(brushConfig.hapticEnabled);
  };

  const handleAddCustomColor = (e: React.FormEvent) => {
    e.preventDefault();
    if (customHex) {
      addRecentColor(customHex);
      setShowColorPicker(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5 px-3 pb-3">
      {/* Palette Selector Bar */}
      <div className="flex items-center justify-between text-xs">
        <button
          onClick={() => setShowPaletteMenu(!showPaletteMenu)}
          className="flex items-center gap-1.5 font-medium text-[#7A6872] hover:text-[#4A3B43] bg-white/70 px-2.5 py-1 rounded-full border border-pink-100/80 transition-colors shadow-2xs cursor-pointer"
        >
          <PaletteIcon className="w-3.5 h-3.5 text-pink-400" />
          <span>{activePalette.name}</span>
        </button>
        <span className="text-[11px] text-[#A2929B] font-medium">
          {activePalette.colors.length} shades
        </span>
      </div>

      {/* Palette Dropdown Modal */}
      {showPaletteMenu && (
        <div className="relative z-50">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-2xs"
            onClick={() => setShowPaletteMenu(false)}
          />
          <div className="absolute bottom-2 left-0 right-0 max-w-xs bg-white rounded-2xl p-3 shadow-xl border border-pink-100 z-10 flex flex-col gap-2 animate-in fade-in zoom-in-95">
            <div className="text-xs font-bold text-[#4A3B43] px-1">Choose Palette</div>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {COLOR_PALETTES.map(pal => (
                <button
                  key={pal.id}
                  onClick={() => {
                    setActivePalette(pal);
                    setSelectedColor(pal.colors[0]);
                    setBrushConfig(prev => ({ ...prev, color: pal.colors[0] }));
                    setShowPaletteMenu(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                    activePalette.id === pal.id ? 'bg-pink-50 border border-pink-200' : 'hover:bg-pink-50/50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#4A3B43]">{pal.name}</span>
                    <div className="flex items-center gap-1 mt-1">
                      {pal.colors.slice(0, 6).map((c, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  {activePalette.id === pal.id && <Check className="w-4 h-4 text-[#E5738E]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Swatches Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
        {/* Active Palette Swatches */}
        {activePalette.colors.map(c => {
          const isSelected = selectedColor.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              onClick={() => handleSelectColor(c)}
              className={`relative shrink-0 w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'scale-110 border-white shadow-md shadow-pink-300/60 ring-2 ring-[#E5738E]'
                  : 'border-white/80 shadow-xs hover:scale-105 opacity-90 hover:opacity-100'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          );
        })}

        {/* Plus / Custom Color Picker Button */}
        <button
          onClick={() => setShowColorPicker(true)}
          className="shrink-0 w-8 h-8 rounded-full bg-white/90 hover:bg-white border-2 border-dashed border-pink-300 text-pink-500 flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
          title="Pick Custom Color"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Custom Color Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-pink-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#4A3B43]">Pick Custom Shade</h3>
              <button
                onClick={() => setShowColorPicker(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <input
                type="color"
                value={customHex}
                onChange={e => setCustomHex(e.target.value)}
                className="w-28 h-28 rounded-2xl cursor-pointer border-4 border-pink-100 shadow-inner"
              />
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={customHex}
                  onChange={e => setCustomHex(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-pink-200 bg-pink-50/30 text-center uppercase"
                  placeholder="#FF8DA1"
                />
              </div>

              {/* Recent swatches */}
              <div className="w-full flex flex-col gap-1">
                <span className="text-[11px] text-[#8E7C85] font-medium">Recent Colors</span>
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                  {recentColors.map((rc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomHex(rc)}
                      className="w-6 h-6 rounded-full border border-black/10 shadow-2xs cursor-pointer"
                      style={{ backgroundColor: rc }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleAddCustomColor}
              className="w-full py-2.5 bg-[#E5738E] hover:bg-[#D65F7B] text-white text-xs font-bold rounded-2xl shadow-md shadow-pink-200 transition-all active:scale-[0.98] cursor-pointer"
            >
              Apply Color
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

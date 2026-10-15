import React from 'react';
import { BrushType } from '../types';
import { useColoring } from '../context/ColoringContext';
import { Sparkles, SlidersHorizontal, Eraser } from 'lucide-react';

interface BrushItem {
  id: BrushType;
  label: string;
  tipStyle: string;
}

const BRUSHES: BrushItem[] = [
  { id: 'pencil', label: 'Pencil', tipStyle: 'pencil' },
  { id: 'colored_pencil', label: 'Color Pencil', tipStyle: 'colored_pencil' },
  { id: 'crayon', label: 'Crayon', tipStyle: 'crayon' },
  { id: 'marker', label: 'Marker', tipStyle: 'marker' },
  { id: 'watercolor', label: 'Watercolor', tipStyle: 'watercolor' },
  { id: 'pastel', label: 'Pastel', tipStyle: 'pastel' },
  { id: 'glitter', label: 'Glitter', tipStyle: 'glitter' },
  { id: 'eraser', label: 'Eraser', tipStyle: 'eraser' },
];

export const BrushSelector: React.FC = () => {
  const { brushConfig, updateBrushType, selectedColor, setIsSettingsOpen } = useColoring();

  return (
    <div className="w-full flex flex-col gap-2 pt-1 pb-2">
      {/* Brush Tabs Header */}
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {BRUSHES.map(b => {
            const isActive = brushConfig.type === b.id;
            return (
              <button
                key={b.id}
                onClick={() => updateBrushType(b.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-[#E5738E] text-white shadow-sm shadow-pink-200'
                    : 'text-[#8E7C85] hover:text-[#4A3B43] bg-white/60 hover:bg-white/90'
                }`}
              >
                {b.id === 'glitter' && <Sparkles className="w-3 h-3 text-amber-300" />}
                {b.id === 'eraser' && <Eraser className="w-3 h-3" />}
                {b.label}
              </button>
            );
          })}
        </div>

        {/* Settings button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 ml-1 rounded-full bg-white/80 hover:bg-white text-[#7A6872] hover:text-[#4A3B43] shadow-xs shrink-0 transition-transform active:scale-95 cursor-pointer"
          title="Brush Settings"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Realistic 3D Tool Tips */}
      <div className="flex items-end justify-center gap-2.5 sm:gap-4 px-2 pt-1 overflow-x-auto no-scrollbar">
        {BRUSHES.map(b => {
          const isSelected = brushConfig.type === b.id;
          const isEraser = b.id === 'eraser';
          const tipColor = isEraser ? '#FCE4EC' : selectedColor;

          return (
            <button
              key={b.id}
              onClick={() => updateBrushType(b.id)}
              className={`group flex flex-col items-center cursor-pointer transition-all duration-200 ${
                isSelected ? '-translate-y-2 scale-105' : 'opacity-85 hover:opacity-100 hover:-translate-y-1'
              }`}
            >
              {/* Tool Body Representation */}
              <div className="relative flex flex-col items-center">
                {/* Active Indicator Halo */}
                {isSelected && (
                  <div
                    className="absolute -inset-1.5 rounded-t-xl bg-pink-300/40 -z-10 blur-[2px]"
                  />
                )}

                {/* 3D Pencil / Crayon / Marker Tip */}
                {b.id === 'crayon' && (
                  <div className="flex flex-col items-center">
                    {/* Crayon Point */}
                    <div
                      className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[18px]"
                      style={{ borderBottomColor: tipColor }}
                    />
                    {/* Crayon Paper Wrapper */}
                    <div
                      className="w-[18px] h-14 rounded-b-md shadow-sm border border-black/10 flex flex-col justify-between py-1"
                      style={{
                        backgroundColor: '#FFF0F3',
                        backgroundImage: `linear-gradient(180deg, ${tipColor} 0%, ${tipColor} 18%, #FFF0F3 18%, #FFF0F3 82%, ${tipColor} 82%, ${tipColor} 100%)`,
                      }}
                    >
                      <div className="w-full h-1 bg-black/15 my-auto" />
                    </div>
                  </div>
                )}

                {(b.id === 'pencil' || b.id === 'colored_pencil') && (
                  <div className="flex flex-col items-center">
                    {/* Graphite Point */}
                    <div
                      className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[8px]"
                      style={{ borderBottomColor: b.id === 'pencil' ? '#333333' : tipColor }}
                    />
                    {/* Sharpened Wood Cone */}
                    <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-[#E8C59D]" />
                    {/* Pencil Hex Barrel */}
                    <div
                      className="w-4 h-14 rounded-b-sm shadow-sm flex items-center justify-center"
                      style={{
                        backgroundColor: b.id === 'pencil' ? '#E5C07B' : tipColor,
                        boxShadow: 'inset 1px 0 2px rgba(255,255,255,0.4), inset -1px 0 2px rgba(0,0,0,0.15)',
                      }}
                    >
                      <div className="w-0.5 h-full bg-white/30" />
                    </div>
                  </div>
                )}

                {b.id === 'marker' && (
                  <div className="flex flex-col items-center">
                    {/* Chisel Nib */}
                    <div
                      className="w-2.5 h-3 rounded-t-sm"
                      style={{ backgroundColor: tipColor }}
                    />
                    {/* Plastic Collar */}
                    <div className="w-3.5 h-2 bg-slate-300 rounded-t-xs" />
                    {/* Marker Body */}
                    <div
                      className="w-5 h-14 rounded-b-lg shadow-sm border border-slate-200 flex flex-col items-center justify-center"
                      style={{ backgroundColor: '#FFFFFF' }}
                    >
                      <div
                        className="w-3 h-8 rounded-full opacity-80"
                        style={{ backgroundColor: tipColor }}
                      />
                    </div>
                  </div>
                )}

                {b.id === 'watercolor' && (
                  <div className="flex flex-col items-center">
                    {/* Wet Brush Bristles */}
                    <div
                      className="w-3.5 h-5 rounded-t-full shadow-inner"
                      style={{
                        backgroundColor: tipColor,
                        backgroundImage: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))',
                      }}
                    />
                    {/* Silver Ferrule */}
                    <div className="w-4 h-3 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 border-t border-slate-400" />
                    {/* Wooden Brush Handle */}
                    <div className="w-3 h-14 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 rounded-b-full shadow-sm" />
                  </div>
                )}

                {b.id === 'pastel' && (
                  <div className="flex flex-col items-center">
                    {/* Soft pastel chalk block */}
                    <div
                      className="w-4 h-5 rounded-t-sm shadow-inner"
                      style={{
                        backgroundColor: tipColor,
                        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 70%)',
                      }}
                    />
                    {/* Chalk paper sleeve */}
                    <div className="w-4.5 h-12 bg-[#F3E8EE] rounded-b-xs border border-pink-200 flex items-center justify-center">
                      <div className="w-2.5 h-6 rounded-full opacity-60" style={{ backgroundColor: tipColor }} />
                    </div>
                  </div>
                )}

                {b.id === 'glitter' && (
                  <div className="flex flex-col items-center">
                    {/* Sparkle wand tip */}
                    <div className="relative">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center animate-pulse"
                        style={{ backgroundColor: tipColor }}
                      >
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    {/* Pastel Wand Shaft */}
                    <div
                      className="w-3 h-16 rounded-b-md shadow-sm"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, #FFB7C5, #FFB7C5 5px, #E8DFF5 5px, #E8DFF5 10px)`,
                      }}
                    />
                  </div>
                )}

                {b.id === 'eraser' && (
                  <div className="flex flex-col items-center">
                    {/* Beveled Rubber Eraser */}
                    <div className="w-5 h-6 bg-pink-200 border border-pink-300 rounded-t-sm transform -skew-x-3 shadow-xs" />
                    {/* Metal band */}
                    <div className="w-5 h-2 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400" />
                    {/* Cardboard sleeve */}
                    <div className="w-5 h-12 bg-[#4A3B43] rounded-b-xs flex items-center justify-center">
                      <span className="text-[7px] text-pink-200 font-bold tracking-tighter">ERASE</span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

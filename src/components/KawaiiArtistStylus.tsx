import React from 'react';
import { BrushType, StudioCursorStyle } from '../types';

interface KawaiiArtistStylusProps {
  x: number;
  y: number;
  canvasWidth: number;
  canvasHeight: number;
  color: string;
  brushType: BrushType;
  isDrawing: boolean;
  pressure?: number;
  tiltAngle?: number;
  visible: boolean;
  stylusStyle?: StudioCursorStyle;
  toolStyle?: 'marker' | 'pencil' | 'stylus';
  toolName?: string;
}

/**
 * Gorgeous, realistic Kawaii Artist Stylus for automated studio coloring:
 * - Anchored in exact canvas percentage coordinates so it never glitches, jumps, or misaligns.
 * - Features realistic stylus down-press, contact glow, drop shadow, and pigment ring.
 * - Visually switches between Feutre (Marker), Crayon de Bois (Pencil), and Apple Pencil (Stylus).
 */
export const KawaiiArtistStylus: React.FC<KawaiiArtistStylusProps> = ({
  x,
  y,
  canvasWidth,
  canvasHeight,
  color,
  brushType,
  isDrawing,
  visible,
  stylusStyle = 'auto',
  toolStyle,
  toolName,
}) => {
  if (!visible || canvasWidth <= 0 || canvasHeight <= 0) return null;

  // Percentage within canvas space
  const leftPct = (x / canvasWidth) * 100;
  const topPct = (y / canvasHeight) * 100;

  // Sizing based on pressure and drawing state
  const isPressing = isDrawing;
  const shadowDistance = isPressing ? 2 : 12;
  const shadowBlur = isPressing ? 4 : 16;
  const penScale = isPressing ? 0.98 : 1;

  if (stylusStyle === 'hidden') return null;

  // Resolve active visual tool style
  const activeStyle: 'stylus' | 'pencil' | 'marker' =
    stylusStyle === 'circle'
      ? 'stylus'
      : stylusStyle === 'auto' || !stylusStyle
      ? toolStyle || (brushType === 'colored_pencil' || brushType === 'pencil' ? 'pencil' : brushType === 'marker' ? 'marker' : 'stylus')
      : (stylusStyle as 'stylus' | 'pencil' | 'marker');

  const displayToolName =
    toolName ||
    (activeStyle === 'marker'
      ? 'Feutre Copic 💖'
      : activeStyle === 'pencil'
      ? 'Crayon Bois ✏️'
      : 'Apple Pencil ✨');

  if (stylusStyle === 'circle') {
    return (
      <div
        className="absolute pointer-events-none z-30 transition-transform duration-75 select-none"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: isPressing ? '26px' : '20px',
            height: isPressing ? '26px' : '20px',
            border: `2px solid ${color}`,
            backgroundColor: `${color}33`,
            boxShadow: `0 0 10px ${color}88, 0 1px 4px rgba(0,0,0,0.2)`,
            transform: isPressing ? 'scale(1.15)' : 'scale(1)',
            transition: 'all 0.1s ease',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full bg-white border border-black/40"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute pointer-events-none z-30 select-none"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: 'translate(0, 0)',
        transition: 'none',
      }}
    >
      {/* 1. Contact Pigment Glow & Target Dot at the exact tip (0, 0) */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100 flex items-center justify-center"
        style={{
          left: 0,
          top: 0,
          width: isPressing ? '24px' : '14px',
          height: isPressing ? '24px' : '14px',
        }}
      >
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            backgroundColor: isPressing ? `${color}44` : `${color}20`,
            boxShadow: isPressing ? `0 0 12px ${color}cc` : 'none',
            transform: isPressing ? 'scale(1.2)' : 'scale(0.8)',
          }}
        />
        <div
          className="w-1.5 h-1.5 rounded-full border border-white/90 shadow-2xs z-10"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* 2. Realistic Stylus / Apple Pencil / Wooden Pencil Body */}
      <div
        className="relative pointer-events-none transition-transform duration-100"
        style={{
          transformOrigin: '0 0',
          transform: `rotate(-38deg) scale(${penScale}) translate(${isPressing ? '0px, 0px' : '2px, -3px'})`,
          filter: `drop-shadow(${shadowDistance}px ${shadowDistance}px ${shadowBlur}px rgba(74, 59, 67, ${
            isPressing ? 0.35 : 0.22
          }))`,
        }}
      >
        {/* Floating Tool Badge above contact tip */}
        <div
          className="absolute left-4 -top-8 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-pink-200 shadow-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none select-none transition-all duration-200 z-20"
          style={{
            transform: isPressing ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-[10px] font-extrabold text-[#4A3B43]">
            {displayToolName}
          </span>
        </div>

        {activeStyle === 'pencil' ? (
          <div
            className="relative flex items-center shadow-md rounded-r-md overflow-hidden border border-[#2C1B24]"
            style={{ width: '150px', height: '16px' }}
          >
            {/* Sharpened Cedar Wood Cone + Lead Nib */}
            <svg width="26" height="16" viewBox="0 0 26 16" className="shrink-0">
              <polygon points="0,8 26,0 26,16" fill="#EAC696" stroke="#2C1B24" strokeWidth="0.8" />
              <polygon points="0,8 10,4.5 10,11.5" fill={color} />
            </svg>
            {/* Hexagonal Pencil Shaft */}
            <div
              className="h-full flex-1 relative overflow-hidden flex items-center"
              style={{ backgroundColor: color }}
            >
              <div className="absolute inset-x-0 top-0 h-[4px] bg-white/45" />
              <div className="absolute inset-x-0 bottom-0 h-[4px] bg-black/25" />
              <div className="absolute inset-x-2 top-[3px] h-[1.5px] bg-white/70" />
            </div>
            {/* Gold Metallic Ferrule */}
            <div className="w-5 h-full bg-[#F4C430] border-l border-r border-[#2C1B24] flex items-center justify-center">
              <div className="w-[1px] h-full bg-[#D4A017]" />
            </div>
            {/* Cute Pastel Pink Rubber Eraser */}
            <div className="w-6 h-full rounded-r-xs bg-[#FFB2C3] flex items-center justify-center" />
          </div>
        ) : activeStyle === 'marker' ? (
          <div
            className="relative flex items-center rounded-r-xl border border-[#2C1B24] overflow-hidden shadow-md"
            style={{ width: '140px', height: '20px' }}
          >
            {/* Chisel Tip */}
            <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
              <polygon points="0,10 20,3 20,17" fill={color} stroke="#2C1B24" strokeWidth="0.8" />
            </svg>
            {/* Marker Barrel */}
            <div className="h-full flex-1 bg-white relative overflow-hidden flex items-center px-2">
              <div
                className="w-7 h-full absolute right-0 top-0 border-l border-[#2C1B24]"
                style={{ backgroundColor: color }}
              />
              <span className="text-[9px] font-extrabold text-[#503E48] tracking-widest z-10 select-none">
                KAWAII ✨
              </span>
            </div>
          </div>
        ) : (
          <div
            className="relative flex items-center rounded-r-full border border-[#2C1B24] overflow-hidden shadow-md"
            style={{ width: '155px', height: '14px' }}
          >
            {/* High-precision Stylus Nib */}
            <svg width="22" height="14" viewBox="0 0 22 14" className="shrink-0">
              <polygon points="0,7 22,1.5 22,12.5" fill="#EEEEEE" stroke="#2C1B24" strokeWidth="0.8" />
              <polygon points="0,7 8,4.5 8,9.5" fill={color} />
            </svg>
            {/* Stylus Shaft */}
            <div className="h-full flex-1 bg-gradient-to-b from-[#FFFFFF] via-[#F8F6F7] to-[#E5E0E3] relative overflow-hidden flex items-center">
              <div className="absolute inset-x-0 top-0.5 h-[2px] bg-white/90" />
              <div
                className="w-4 h-full ml-1 rounded-sm shadow-inner transition-colors duration-200 border-x border-[#2C1B24]/30"
                style={{ backgroundColor: color }}
              />
              <div className="ml-3 flex items-center gap-1 opacity-80">
                <span className="text-[7.5px] font-bold text-[#6D5864] tracking-widest uppercase">
                  {brushType.replace('_', ' ')}
                </span>
                <span className="text-[8px]">✨</span>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-3 rounded-r-full bg-gradient-to-r from-gray-200 to-gray-400 border-l border-[#2C1B24]/20" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

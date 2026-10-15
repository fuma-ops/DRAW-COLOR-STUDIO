import React, { useRef, useEffect, useState } from 'react';
import { useColoring } from '../context/ColoringContext';
import { PaperTextureType, FillSoundPreset } from '../types';
import { drawBrushStamp } from '../utils/regionFill';
import { soundEngine, FILL_SOUND_PRESETS } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';
import { X, Volume2, VolumeX, Smartphone, RotateCcw, Sparkles, Play } from 'lucide-react';
import { CuteCursor } from './CuteCursor';

const PAPER_TEXTURES: { id: PaperTextureType; label: string }[] = [
  { id: 'rough', label: 'Rough Paper' },
  { id: 'coldpress', label: 'Cold Press' },
  { id: 'linen', label: 'Linen' },
  { id: 'smooth', label: 'Smooth' },
];

export const BrushSettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    brushConfig,
    setBrushConfig,
    selectedColor,
    studioConfig,
    updateStudioConfig,
  } = useColoring();

  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchCursorPos, setScratchCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scratchCursorVisible, setScratchCursorVisible] = useState(false);
  const [testingSoundId, setTestingSoundId] = useState<string | null>(null);
  const lastPointRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Clear scratchpad
  const clearScratchpad = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FCF8F7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Initial demo wavy stroke
    const midY = canvas.height / 2;
    for (let x = 40; x < canvas.width - 40; x += 3) {
      const y = midY + Math.sin(x * 0.04) * 20;
      drawBrushStamp(
        ctx,
        x,
        y,
        brushConfig.type,
        selectedColor,
        brushConfig.size,
        brushConfig.opacity,
        brushConfig.textureIntensity
      );
    }
  };

  useEffect(() => {
    if (isSettingsOpen) {
      setTimeout(clearScratchpad, 50);
    }
  }, [isSettingsOpen, brushConfig.type, brushConfig.size, brushConfig.opacity, brushConfig.textureIntensity, selectedColor]);

  if (!isSettingsOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setScratchCursorPos({ x: e.clientX, y: e.clientY });
    setScratchCursorVisible(true);
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    setIsScratching(true);
    lastPointRef.current = { x, y, time: Date.now() };

    const ctx = canvas.getContext('2d')!;
    drawBrushStamp(
      ctx,
      x,
      y,
      brushConfig.type,
      selectedColor,
      brushConfig.size,
      brushConfig.opacity,
      brushConfig.textureIntensity
    );
    soundEngine.startStroke(brushConfig.type, brushConfig.soundEnabled);
    hapticsEngine.triggerStrokePulse(brushConfig.hapticEnabled);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    setScratchCursorPos({ x: e.clientX, y: e.clientY });
    setScratchCursorVisible(true);
    if (!isScratching || !lastPointRef.current) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const ctx = canvas.getContext('2d')!;

    const now = Date.now();
    const last = lastPointRef.current;
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.hypot(dx, dy);
    const dt = Math.max(1, now - last.time);
    const physicalSpeed = dist / dt;

    soundEngine.onBrushMove(physicalSpeed, brushConfig.type, brushConfig.soundEnabled);
    hapticsEngine.triggerStrokePulse(brushConfig.hapticEnabled);

    const step = Math.max(1.0, brushConfig.size * 0.12);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      drawBrushStamp(
        ctx,
        last.x + dx * t,
        last.y + dy * t,
        brushConfig.type,
        selectedColor,
        brushConfig.size,
        brushConfig.opacity,
        brushConfig.textureIntensity
      );
    }
    lastPointRef.current = { x, y, time: now };
  };

  const handlePointerUp = () => {
    if (isScratching) {
      setIsScratching(false);
      lastPointRef.current = null;
      soundEngine.stopStroke();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-pink-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E5738E]" />
            <h3 className="text-base font-bold text-[#4A3B43]">Brush Settings</h3>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1 rounded-full text-[#8E7C85] hover:text-[#4A3B43] hover:bg-pink-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Scratchpad Canvas Preview */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8E7C85]">
            <span>Live Scratchpad (Hold & drag continuously)</span>
            <button
              onClick={clearScratchpad}
              className="flex items-center gap-1 text-[11px] text-[#E5738E] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>
          <div
            className="relative w-full h-24 rounded-2xl overflow-hidden border-2 border-pink-100 bg-[#FCF8F7] shadow-inner cursor-none"
            onPointerEnter={(e) => {
              setScratchCursorPos({ x: e.clientX, y: e.clientY });
              setScratchCursorVisible(true);
            }}
            onPointerLeave={() => {
              setScratchCursorVisible(false);
              handlePointerUp();
            }}
          >
            <canvas
              ref={scratchCanvasRef}
              width={400}
              height={140}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-full cursor-none block touch-none"
              style={{ touchAction: 'none' }}
            />
            <span className="absolute bottom-1 right-2 text-[10px] text-[#A2929B] pointer-events-none">
              Hold & drag continuously ✏️
            </span>

            {/* Cute Cursor on Scratchpad */}
            <CuteCursor
              brushType={brushConfig.type}
              coloringMode="brush"
              color={selectedColor}
              brushSize={brushConfig.size}
              isDrawing={isScratching}
              visible={scratchCursorVisible}
              x={scratchCursorPos.x}
              y={scratchCursorPos.y}
            />
          </div>
        </div>

        {/* Controls Sliders */}
        <div className="flex flex-col gap-3.5">
          {/* Size */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-semibold text-[#4A3B43]">
              <span>Size</span>
              <span className="text-[#8E7C85] font-mono">{brushConfig.size}px</span>
            </div>
            <input
              type="range"
              min="2"
              max="60"
              value={brushConfig.size}
              onChange={e => setBrushConfig(prev => ({ ...prev, size: Number(e.target.value) }))}
              className="w-full accent-[#E5738E] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Opacity */}
          <div className="flex justify-between text-xs font-semibold text-[#4A3B43]">
            <span>Opacity</span>
            <span className="text-[#8E7C85] font-mono">{Math.round(brushConfig.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={brushConfig.opacity}
            onChange={e => setBrushConfig(prev => ({ ...prev, opacity: Number(e.target.value) }))}
            className="w-full accent-[#E5738E] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
          />

          {/* Texture Intensity */}
          <div className="flex justify-between text-xs font-semibold text-[#4A3B43]">
            <span>Texture Intensity</span>
            <span className="text-[#8E7C85] font-mono">{Math.round(brushConfig.textureIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.0"
            step="0.05"
            value={brushConfig.textureIntensity}
            onChange={e => setBrushConfig(prev => ({ ...prev, textureIntensity: Number(e.target.value) }))}
            className="w-full accent-[#E5738E] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
          />

          {/* Paper Texture Selector */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-xs font-semibold text-[#4A3B43]">Paper Grain</span>
            <div className="grid grid-cols-2 gap-2">
              {PAPER_TEXTURES.map(pt => (
                <button
                  key={pt.id}
                  onClick={() => setBrushConfig(prev => ({ ...prev, paperTexture: pt.id }))}
                  className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    brushConfig.paperTexture === pt.id
                      ? 'bg-pink-100/80 border-[#E5738E] text-[#4A3B43] font-bold'
                      : 'border-pink-100 hover:bg-pink-50 text-[#7A6872]'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio & Haptic Toggles */}
          <div className="flex items-center justify-between pt-2 border-t border-pink-100">
            <div className="flex items-center gap-2">
              {brushConfig.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#E5738E]" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-xs font-semibold text-[#4A3B43]">ASMR Audio</span>
            </div>
            <button
              onClick={() => setBrushConfig(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                brushConfig.soundEnabled ? 'bg-[#E5738E]' : 'bg-gray-200'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  brushConfig.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#E5738E]" />
              <span className="text-xs font-semibold text-[#4A3B43]">Haptic Feedback</span>
            </div>
            <button
              onClick={() => setBrushConfig(prev => ({ ...prev, hapticEnabled: !prev.hapticEnabled }))}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                brushConfig.hapticEnabled ? 'bg-[#E5738E]' : 'bg-gray-200'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  brushConfig.hapticEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Cute Fill Sound Selector */}
          <div className="pt-2 border-t border-pink-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E5738E]" />
                <span className="text-xs font-semibold text-[#4A3B43]">Son de Remplissage (8 Effets)</span>
              </div>
              <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded-full">
                Kids & Relax ✨
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={studioConfig.fillSoundPreset || 'bubble_sparkle'}
                onChange={e => {
                  const p = e.target.value as FillSoundPreset;
                  updateStudioConfig({ fillSoundPreset: p });
                  soundEngine.setFillSoundPreset(p);
                  soundEngine.playFillSound(true, p);
                  setTestingSoundId(p);
                  setTimeout(() => setTestingSoundId(null), 500);
                }}
                className="flex-1 bg-white border border-pink-200 rounded-xl px-2 py-1 text-xs text-[#4A3B43] font-bold shadow-2xs cursor-pointer"
              >
                {FILL_SOUND_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const currentPreset = studioConfig.fillSoundPreset || 'bubble_sparkle';
                  soundEngine.playFillSound(true, currentPreset);
                  setTestingSoundId(currentPreset);
                  setTimeout(() => setTestingSoundId(null), 500);
                }}
                className="px-2.5 py-1 bg-[#E5738E] hover:bg-[#D65F7B] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                title="Tester le son"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>{testingSoundId ? '🎶' : 'Tester'}</span>
              </button>
            </div>
            <p className="text-[10px] text-[#8E7C85] italic truncate">
              {FILL_SOUND_PRESETS.find(p => p.id === (studioConfig.fillSoundPreset || 'bubble_sparkle'))?.description}
            </p>
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={() => setIsSettingsOpen(false)}
          className="w-full py-2.5 bg-[#E5738E] hover:bg-[#D65F7B] text-white text-xs font-bold rounded-2xl shadow-md shadow-pink-200 transition-all active:scale-[0.98] cursor-pointer"
        >
          Save & Return to Canvas
        </button>
      </div>
    </div>
  );
};

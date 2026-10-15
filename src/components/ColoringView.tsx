import React, { useRef, useState } from 'react';
import { useColoring } from '../context/ColoringContext';
import { CanvasRenderer, CanvasRendererHandle } from './CanvasRenderer';
import { BrushSelector } from './BrushSelector';
import { ColorPaletteBar } from './ColorPaletteBar';
import { BrushSettingsModal } from './BrushSettingsModal';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  PaintBucket,
  Brush,
  RotateCcw,
  Check,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Heart,
  Eye,
  Upload,
  X,
  FileCheck,
  Video,
} from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';

export const ColoringView: React.FC = () => {
  const {
    activePage,
    setScreen,
    coloringMode,
    setColoringMode,
    saveArtwork,
    setActiveFinishedArtwork,
    favorites,
    toggleFavorite,
    brushConfig,
    updateBrushType,
    importCustomImagePage,
    openStudioMode,
  } = useColoring();

  const canvasRef = useRef<CanvasRendererHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showOriginalModal, setShowOriginalModal] = useState<boolean>(false);
  const [originalImagePreview, setOriginalImagePreview] = useState<string>('');

  const isFavorite = favorites.includes(activePage.id);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleTestOriginalImage = () => {
    if (activePage.imageUrl) {
      setOriginalImagePreview(activePage.imageUrl);
    } else if (canvasRef.current) {
      const lineArtUrl = canvasRef.current.exportOriginalLineArt();
      setOriginalImagePreview(lineArtUrl);
    }
    setShowOriginalModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        importCustomImagePage(dataUrl, file.name.replace(/\.[^/.]+$/, ''));
        triggerToast('Original artwork imported into canvas 🎨');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBack = () => {
    // Auto-save work in progress before leaving
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.exportImage();
      const pct = canvasRef.current.getProgressPercent();
      saveArtwork({
        id: `artwork_${activePage.id}`,
        pageId: activePage.id,
        title: activePage.title,
        category: activePage.category,
        previewDataUrl: dataUrl,
        canvasDataUrl: dataUrl,
        progressPercent: pct,
        isCompleted: pct >= 80,
        isFavorite: favorites.includes(activePage.id),
        lastEditedAt: Date.now(),
        createdAt: Date.now(),
      });
    }
    setScreen('home');
  };

  const handleSaveAndFinish = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.exportImage();
    const pct = canvasRef.current.getProgressPercent();
    const saved = {
      id: `artwork_${activePage.id}`,
      pageId: activePage.id,
      title: activePage.title,
      category: activePage.category,
      previewDataUrl: dataUrl,
      canvasDataUrl: dataUrl,
      progressPercent: pct,
      isCompleted: pct >= 40,
      isFavorite,
      lastEditedAt: Date.now(),
      createdAt: Date.now(),
    };
    saveArtwork(saved);
    setActiveFinishedArtwork(saved);
    soundEngine.playCelebrationChime(brushConfig.soundEnabled);
    hapticsEngine.triggerSuccess(brushConfig.hapticEnabled);
    setScreen('finished');
  };

  const handleReset = () => {
    if (window.confirm('Reset this coloring page to start fresh?')) {
      canvasRef.current?.resetCanvas();
      triggerToast('Canvas reset ✨');
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#FFF5F7] overflow-hidden select-none">
      {/* Top Header App Bar */}
      <header className="sticky top-0 z-30 px-3 py-2 bg-white/80 backdrop-blur-md border-b border-pink-100 flex items-center justify-between shadow-2xs">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            className="p-2 rounded-full text-[#7A6872] hover:text-[#4A3B43] hover:bg-pink-50 transition-colors active:scale-95 cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col ml-1">
            <span className="text-xs font-bold text-[#4A3B43] truncate max-w-[140px] sm:max-w-[200px]">
              {activePage.title}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-[#A2929B] font-medium">
              <span>{progressPercent}% colored</span>
              <span>•</span>
              <span className="capitalize">{coloringMode === 'fill' ? 'Tap to fill' : 'Paint brush'}</span>
            </div>
          </div>
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Undo */}
          <button
            onClick={() => canvasRef.current?.undo()}
            disabled={!canUndo}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              canUndo ? 'text-[#4A3B43] hover:bg-pink-50 active:scale-95' : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          {/* Redo */}
          <button
            onClick={() => canvasRef.current?.redo()}
            disabled={!canRedo}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              canRedo ? 'text-[#4A3B43] hover:bg-pink-50 active:scale-95' : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          {/* Favorite Toggle */}
          <button
            onClick={() => toggleFavorite(activePage.id)}
            className="p-1.5 rounded-full text-[#7A6872] hover:bg-pink-50 active:scale-95 transition-colors cursor-pointer"
            title="Favorite"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-[#E5738E] text-[#E5738E]' : 'text-[#8E7C85]'
              }`}
            />
          </button>
          {/* Studio Mode Button */}
          <button
            onClick={() => openStudioMode(activePage)}
            className="ml-1 px-2.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-95 text-white text-xs font-bold rounded-full shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            title="Launch Kawaii Studio: Automated coloring & Ultra HD YouTube filming"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Studio</span>
          </button>
          {/* Save / Done Button */}
          <button
            onClick={handleSaveAndFinish}
            className="ml-1 px-3 py-1.5 bg-[#E5738E] hover:bg-[#D65F7B] text-white text-xs font-bold rounded-full shadow-sm shadow-pink-300/50 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </header>

      {/* Floating Canvas Controls Floating Bar */}
      <div className="absolute top-14 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Mode Selector Pill */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-full p-1 border border-pink-100 shadow-md flex items-center gap-1">
          <button
            onClick={() => {
              setColoringMode('brush');
              if (brushConfig.type === 'eraser') {
                updateBrushType('crayon');
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              coloringMode === 'brush' && brushConfig.type !== 'eraser'
                ? 'bg-[#E5738E] text-white shadow-2xs'
                : 'text-[#8E7C85] hover:text-[#4A3B43]'
            }`}
          >
            <Brush className="w-3 h-3" />
            <span>Brush</span>
          </button>
          <button
            onClick={() => setColoringMode('fill')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              coloringMode === 'fill'
                ? 'bg-[#E5738E] text-white shadow-2xs'
                : 'text-[#8E7C85] hover:text-[#4A3B43]'
            }`}
          >
            <PaintBucket className="w-3 h-3" />
            <span>Bucket Fill</span>
          </button>
        </div>

        {/* Center: TEST ORIGINAL IMAGE & Import Button */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-full p-1 border border-pink-100 shadow-md flex items-center gap-1">
          <button
            onClick={handleTestOriginalImage}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[11px] font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Compare with 100% untouched original image asset"
          >
            <Eye className="w-3 h-3 text-amber-600" />
            <span>TEST ORIGINAL IMAGE</span>
          </button>
          <label
            className="flex items-center gap-1 px-2 py-1 bg-pink-50 hover:bg-pink-100 text-[#4A3B43] border border-pink-200 rounded-full text-[11px] font-semibold cursor-pointer transition-all active:scale-95 shadow-2xs"
            title="Import/upload any image.png as a coloring page"
          >
            <Upload className="w-3.5 h-3.5 text-pink-500" />
            <span className="hidden sm:inline">Import</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Quick Zoom & Reset Tools */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-full p-1 border border-pink-100 shadow-md flex items-center gap-0.5">
          <button
            onClick={() => canvasRef.current?.zoomOut()}
            className="p-1 text-[#7A6872] hover:text-[#4A3B43] hover:bg-pink-50 rounded-full cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => canvasRef.current?.resetZoom()}
            className="px-1 text-[10px] font-bold text-[#8E7C85] hover:text-[#4A3B43] cursor-pointer"
            title="Reset Zoom"
          >
            100%
          </button>
          <button
            onClick={() => canvasRef.current?.zoomIn()}
            className="p-1 text-[#7A6872] hover:text-[#4A3B43] hover:bg-pink-50 rounded-full cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3 bg-pink-200 mx-0.5" />
          <button
            onClick={handleReset}
            className="p-1 text-[#7A6872] hover:text-red-500 hover:bg-pink-50 rounded-full cursor-pointer"
            title="Reset All Coloring"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <main className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-2">
        <CanvasRenderer
          ref={canvasRef}
          onProgressUpdate={pct => setProgressPercent(pct)}
          onHistoryChange={(undoable, redoable) => {
            setCanUndo(undoable);
            setCanRedo(redoable);
          }}
          onAutoSave={(dataUrl, pct) => {
            saveArtwork({
              id: `artwork_${activePage.id}`,
              pageId: activePage.id,
              title: activePage.title,
              category: activePage.category,
              previewDataUrl: dataUrl,
              canvasDataUrl: dataUrl,
              progressPercent: pct,
              isCompleted: pct >= 80,
              isFavorite: favorites.includes(activePage.id),
              lastEditedAt: Date.now(),
              createdAt: Date.now(),
            });
          }}
        />

        {showToast && (
          <div className="absolute top-20 bg-[#4A3B43] text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg animate-in fade-in zoom-in-95 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-300" />
            {showToast}
          </div>
        )}
      </main>

      {/* Bottom Tool Drawer */}
      <footer className="sticky bottom-0 z-30 bg-white/90 backdrop-blur-md border-t border-pink-100/90 rounded-t-3xl shadow-lg flex flex-col">
        <BrushSelector />
        <ColorPaletteBar />
      </footer>

      {/* Brush Settings Scratchpad Modal */}
      <BrushSettingsModal />

      {/* TEST ORIGINAL IMAGE MODAL */}
      {showOriginalModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-amber-200 animate-in fade-in zoom-in-95">
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-200/90 rounded-full text-amber-800 shadow-xs">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#4A3B43]">TEST ORIGINAL IMAGE (UNTOUCHED)</h3>
                  <p className="text-[10px] text-amber-800 font-semibold">Layer 1: Read-Only Line Art • 0% AI Modification</p>
                </div>
              </div>
              <button
                onClick={() => setShowOriginalModal(false)}
                className="p-1.5 rounded-full text-[#7A6872] hover:bg-amber-100/80 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-[#FAF8F8]">
              {originalImagePreview ? (
                <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-2 bg-white shadow-inner max-w-full">
                  <img
                    src={originalImagePreview}
                    alt="Original Uploaded Line Art"
                    className="max-h-[50vh] max-w-full object-contain block mx-auto rounded-lg"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-[#8E7C85] bg-white rounded-2xl border border-gray-200 w-full">
                  <p className="text-sm font-semibold">No original line art image loaded.</p>
                  <p className="text-xs mt-1 text-[#A2929B]">Drop or import your image file using the button below.</p>
                </div>
              )}

              <div className="mt-3.5 w-full bg-amber-50/80 border border-amber-200 rounded-2xl p-3 text-[11px] text-[#4A3B43] space-y-1.5">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span>Pixel Preservation:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                    100% BIT-EXACT
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#7A6872]">
                  <span>Canvas Resolution:</span>
                  <span className="font-mono text-[10px] font-bold">{activePage.width} × {activePage.height}px</span>
                </div>
                <div className="flex items-center justify-between text-[#7A6872]">
                  <span>Active Asset Source:</span>
                  <span className="truncate max-w-[210px] font-mono text-[10px]">{activePage.imageUrl || 'Vector Line Art Asset'}</span>
                </div>
                <p className="text-[10px] text-[#8E7C85] pt-1 border-t border-amber-200/60 leading-tight">
                  This preview renders the source line art with zero filters, no AI reinterpretation, and no color layers.
                  When you color, your strokes are kept strictly on transparent Layer 2.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
              <label className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#4A3B43] border border-pink-200 text-xs font-semibold rounded-full cursor-pointer flex items-center gap-1.5 transition-all active:scale-95">
                <Upload className="w-3.5 h-3.5 text-pink-600" />
                <span>Upload Another Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    handleFileUpload(e);
                    setShowOriginalModal(false);
                  }}
                />
              </label>
              <button
                onClick={() => setShowOriginalModal(false)}
                className="px-4 py-1.5 bg-[#4A3B43] text-white text-xs font-bold rounded-full hover:bg-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

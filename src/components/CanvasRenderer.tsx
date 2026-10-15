import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { BrushType } from '../types';
import { useColoring } from '../context/ColoringContext';
import {
  getRegionMask,
  createRegionMaskCanvas,
  renderTexturedRegionFill,
  drawBrushStamp,
  RegionMask,
  MultiColorTextureConfig,
} from '../utils/regionFill';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';
import { PaperTextureManager } from '../utils/paperTextures';
import { CuteCursor } from './CuteCursor';

export interface CanvasRendererHandle {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetCanvas: () => void;
  exportImage: () => string;
  exportImageHD: (multiplier?: number) => string;
  exportOriginalLineArt: () => string;
  getProgressPercent: () => number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomLevel: number;
  getDisplayCanvas: () => HTMLCanvasElement | null;
  getLineArtData: () => ImageData | null;
  getColorCanvas: () => HTMLCanvasElement | null;
  fillRegionAt: (x: number, y: number, color: string, brushType?: BrushType) => boolean;
  animateBucketFill: (
    seedX: number,
    seedY: number,
    color: string,
    durationMs?: number,
    brushType?: BrushType,
    multiColor?: MultiColorTextureConfig
  ) => Promise<boolean>;
  commitRegionStrokes: () => void;
  paintStrokeAtRegion: (
    seedX: number,
    seedY: number,
    strokePoints: { x: number; y: number }[],
    color: string,
    brushType?: BrushType
  ) => boolean;
  startArtistStroke: (
    p: { x: number; y: number },
    color: string,
    brushType: BrushType,
    size: number,
    opacity: number,
    seedX: number,
    seedY: number
  ) => boolean;
  continueArtistStroke: (pt: { x: number; y: number }) => void;
  endArtistStroke: () => void;
  triggerObjectSpringBump: (
    center: { x: number; y: number },
    scalePeak?: number,
    durationMs?: number
  ) => void;
}

interface CanvasRendererProps {
  onProgressUpdate?: (percent: number) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onAutoSave?: (dataUrl: string, percent: number) => void;
  onReady?: () => void;
  interactive?: boolean;
  overlay?: React.ReactNode;
  onCanvasClick?: (pt: { x: number; y: number }) => void;
}

export const CanvasRenderer = forwardRef<CanvasRendererHandle, CanvasRendererProps>(
  ({ onProgressUpdate, onHistoryChange, onAutoSave, onReady, interactive = true, overlay, onCanvasClick }, ref) => {
    const { activePage, brushConfig, coloringMode, selectedColor, savedArtworks } = useColoring();
    const containerRef = useRef<HTMLDivElement>(null);
    const displayCanvasRef = useRef<HTMLCanvasElement>(null);

    // Persistent offscreen canvas layers
    const colorCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const lineArtCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const lineArtDataRef = useRef<ImageData | null>(null);

    // Active live stroke layers for continuous drawing
    const strokeCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const maskedStrokeCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const activeRegionMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const activeRegionRef = useRef<RegionMask | null>(null);

    // History undo/redo stacks
    const undoStackRef = useRef<ImageData[]>([]);
    const redoStackRef = useRef<ImageData[]>([]);
    const maxHistory = 20;

    // Viewport transform
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Focal-Point Micro-Zoom & Spring Bump State for completed elements
    const [springScale, setSpringScale] = useState<number>(1);
    const [springOrigin, setSpringOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
    const springAnimRef = useRef<number | null>(null);

    // Cute tool cursor state
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [cursorVisible, setCursorVisible] = useState<boolean>(false);
    const [isDrawingState, setIsDrawingState] = useState<boolean>(false);

    // Drawing state
    const isDrawingRef = useRef<boolean>(false);
    const lastPointRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const artistLastPointRef = useRef<{ x: number; y: number } | null>(null);
    const lastArtistSeedRef = useRef<string>('');
    const animFrameRef = useRef<number | null>(null);

    const onProgressUpdateRef = useRef(onProgressUpdate);
    onProgressUpdateRef.current = onProgressUpdate;
    const onHistoryChangeRef = useRef(onHistoryChange);
    onHistoryChangeRef.current = onHistoryChange;
    const onAutoSaveRef = useRef(onAutoSave);
    onAutoSaveRef.current = onAutoSave;
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    const brushConfigRef = useRef(brushConfig);
    brushConfigRef.current = brushConfig;

    const activeStrokeColorRef = useRef<string | null>(null);
    const selectedColorRef = useRef(selectedColor);
    if (!isDrawingRef.current) {
      selectedColorRef.current = selectedColor;
    }

    const coloringModeRef = useRef(coloringMode);
    coloringModeRef.current = coloringMode;

    const width = activePage.width || 600;
    const height = activePage.height || 800;

    // Full composite rendering
    const renderComposite = useCallback(() => {
      const display = displayCanvasRef.current;
      const colorCanvas = colorCanvasRef.current;
      const lineArtCanvas = lineArtCanvasRef.current;
      const strokeCanvas = strokeCanvasRef.current;
      const maskedStrokeCanvas = maskedStrokeCanvasRef.current;
      const regionMaskCanvas = activeRegionMaskCanvasRef.current;
      const currentBrush = brushConfigRef.current;

      if (!display || !colorCanvas || !lineArtCanvas) return;
      const ctx = display.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw warm paper base background
      ctx.fillStyle = '#FCF8F7';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw committed color layer (ALL persistent colored areas)
      ctx.drawImage(colorCanvas, 0, 0);

      // 3. Draw active live stroke in-progress (masked strictly to active region)
      if (isDrawingRef.current && strokeCanvas && maskedStrokeCanvas) {
        const maskedCtx = maskedStrokeCanvas.getContext('2d');
        if (maskedCtx) {
          maskedCtx.clearRect(0, 0, width, height);
          maskedCtx.drawImage(strokeCanvas, 0, 0);
          if (regionMaskCanvas) {
            maskedCtx.save();
            maskedCtx.globalCompositeOperation = 'destination-in';
            maskedCtx.drawImage(regionMaskCanvas, 0, 0);
            maskedCtx.restore();
          }
          ctx.drawImage(maskedStrokeCanvas, 0, 0);
        }
      }

      // 4. Draw paper texture grain overlay
      const patternCanvas = PaperTextureManager.getPatternCanvas(
        currentBrush.paperTexture,
        256,
        256
      );
      const pat = ctx.createPattern(patternCanvas, 'repeat');
      if (pat) {
        ctx.save();
        ctx.globalAlpha = 0.28 * currentBrush.textureIntensity;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 5. Draw sharp black line art on top with multiply blend
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(lineArtCanvas, 0, 0);
      ctx.restore();
    }, [width, height]);

    const scheduleRender = useCallback(() => {
      if (animFrameRef.current !== null) return;
      animFrameRef.current = requestAnimationFrame(() => {
        animFrameRef.current = null;
        renderComposite();
      });
    }, [renderComposite]);

    // Save current color canvas to undo stack
    const pushUndoState = useCallback(() => {
      const colorCanvas = colorCanvasRef.current;
      if (!colorCanvas) return;
      const ctx = colorCanvas.getContext('2d');
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, width, height);
      undoStackRef.current.push(imgData);
      if (undoStackRef.current.length > maxHistory) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      if (onHistoryChangeRef.current) {
        onHistoryChangeRef.current(undoStackRef.current.length > 1, redoStackRef.current.length > 0);
      }
    }, [width, height]);

    const updateProgress = useCallback(() => {
      const colorCanvas = colorCanvasRef.current;
      if (!colorCanvas) return;
      const ctx = colorCanvas.getContext('2d');
      if (!ctx) return;
      const data = ctx.getImageData(0, 0, width, height).data;
      let coloredPixels = 0;
      const sampleStep = 8;
      let totalSampled = 0;
      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        totalSampled++;
        if (data[i + 3] > 30) {
          coloredPixels++;
        }
      }
      const ratio = totalSampled > 0 ? (coloredPixels / totalSampled) * 1.5 : 0;
      const percent = Math.min(100, Math.round(ratio * 100));
      if (onProgressUpdateRef.current) {
        onProgressUpdateRef.current(percent);
      }
    }, [width, height]);

    // INITIALIZATION: ONLY RUN ON PAGE ID CHANGE!
    useEffect(() => {
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = width;
      colorCanvas.height = height;
      colorCanvasRef.current = colorCanvas;

      const lineCanvas = document.createElement('canvas');
      lineCanvas.width = width;
      lineCanvas.height = height;
      lineArtCanvasRef.current = lineCanvas;

      const strokeCanvas = document.createElement('canvas');
      strokeCanvas.width = width;
      strokeCanvas.height = height;
      strokeCanvasRef.current = strokeCanvas;

      const maskedStrokeCanvas = document.createElement('canvas');
      maskedStrokeCanvas.width = width;
      maskedStrokeCanvas.height = height;
      maskedStrokeCanvasRef.current = maskedStrokeCanvas;

      const lineCtx = lineCanvas.getContext('2d')!;
      const img = new Image();
      let objectUrl: string | null = null;

      const onImageLoaded = () => {
        lineCtx.clearRect(0, 0, width, height);
        lineCtx.drawImage(img, 0, 0, width, height);
        lineArtDataRef.current = lineCtx.getImageData(0, 0, width, height);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }

        // Check if there is previously saved color progress for this page
        const existingArtwork = savedArtworks.find(
          s => s.pageId === activePage.id && s.canvasDataUrl
        );

        if (existingArtwork && existingArtwork.canvasDataUrl) {
          const colorImg = new Image();
          colorImg.onload = () => {
            const colorCtx = colorCanvas.getContext('2d')!;
            colorCtx.clearRect(0, 0, width, height);
            colorCtx.drawImage(colorImg, 0, 0, width, height);
            undoStackRef.current = [];
            redoStackRef.current = [];
            pushUndoState();
            renderComposite();
            updateProgress();
          };
          colorImg.src = existingArtwork.canvasDataUrl;
        } else {
          undoStackRef.current = [];
          redoStackRef.current = [];
          pushUndoState();
          renderComposite();
          updateProgress();
        }

        if (onReadyRef.current) {
          onReadyRef.current();
        }
      };

      img.onload = onImageLoaded;
      img.onerror = () => {
        if (activePage.lineArtSvg) {
          const svgBlob = new Blob([activePage.lineArtSvg], {
            type: 'image/svg+xml;charset=utf-8',
          });
          const fallbackUrl = URL.createObjectURL(svgBlob);
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            lineCtx.clearRect(0, 0, width, height);
            lineCtx.drawImage(fallbackImg, 0, 0, width, height);
            lineArtDataRef.current = lineCtx.getImageData(0, 0, width, height);
            undoStackRef.current = [];
            redoStackRef.current = [];
            pushUndoState();
            renderComposite();
            updateProgress();
            URL.revokeObjectURL(fallbackUrl);
          };
          fallbackImg.src = fallbackUrl;
          return;
        }

        lineCtx.fillStyle = '#FFFFFF';
        lineCtx.fillRect(0, 0, width, height);
        lineCtx.strokeStyle = '#2D2426';
        lineCtx.lineWidth = 4;
        lineCtx.strokeRect(16, 16, width - 32, height - 32);
        // Cute heart icon fallback without any text
        lineCtx.fillStyle = '#FF9EBE';
        lineCtx.beginPath();
        const hcx = width / 2;
        const hcy = height / 2;
        lineCtx.arc(hcx - 12, hcy - 10, 14, 0, Math.PI * 2);
        lineCtx.arc(hcx + 12, hcy - 10, 14, 0, Math.PI * 2);
        lineCtx.fill();
        lineArtDataRef.current = lineCtx.getImageData(0, 0, width, height);
        renderComposite();
      };

      if (activePage.imageUrl) {
        img.src = activePage.imageUrl;
      } else if (activePage.lineArtSvg) {
        const svgBlob = new Blob([activePage.lineArtSvg], {
          type: 'image/svg+xml;charset=utf-8',
        });
        objectUrl = URL.createObjectURL(svgBlob);
        img.src = objectUrl;
      }

      return () => {
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePage.id]);

    useEffect(() => {
      renderComposite();
    }, [brushConfig.paperTexture, brushConfig.textureIntensity, renderComposite]);

    const undo = useCallback(() => {
      const colorCanvas = colorCanvasRef.current;
      if (!colorCanvas || undoStackRef.current.length <= 1) return;
      const current = undoStackRef.current.pop()!;
      redoStackRef.current.push(current);
      const prev = undoStackRef.current[undoStackRef.current.length - 1];
      const ctx = colorCanvas.getContext('2d')!;
      ctx.putImageData(prev, 0, 0);
      renderComposite();
      updateProgress();
      if (onHistoryChangeRef.current) {
        onHistoryChangeRef.current(undoStackRef.current.length > 1, redoStackRef.current.length > 0);
      }
    }, [renderComposite, updateProgress]);

    const redo = useCallback(() => {
      const colorCanvas = colorCanvasRef.current;
      if (!colorCanvas || redoStackRef.current.length === 0) return;
      const next = redoStackRef.current.pop()!;
      undoStackRef.current.push(next);
      const ctx = colorCanvas.getContext('2d')!;
      ctx.putImageData(next, 0, 0);
      renderComposite();
      updateProgress();
      if (onHistoryChangeRef.current) {
        onHistoryChangeRef.current(undoStackRef.current.length > 1, redoStackRef.current.length > 0);
      }
    }, [renderComposite, updateProgress]);

    const resetCanvas = useCallback(() => {
      const colorCanvas = colorCanvasRef.current;
      if (!colorCanvas) return;
      const ctx = colorCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, width, height);
      pushUndoState();
      renderComposite();
      updateProgress();
    }, [width, height, pushUndoState, renderComposite, updateProgress]);

    const exportImage = useCallback((): string => {
      const display = displayCanvasRef.current;
      return display ? display.toDataURL('image/png') : '';
    }, []);

    const exportImageHD = useCallback(
      (multiplier = 4): string => {
        const colorCanvas = colorCanvasRef.current;
        const lineArtCanvas = lineArtCanvasRef.current;
        if (!colorCanvas || !lineArtCanvas) {
          return exportImage();
        }

        const exportW = Math.round(width * multiplier);
        const exportH = Math.round(height * multiplier);

        const hdCanvas = document.createElement('canvas');
        hdCanvas.width = exportW;
        hdCanvas.height = exportH;
        const hdCtx = hdCanvas.getContext('2d');
        if (!hdCtx) return exportImage();

        hdCtx.imageSmoothingEnabled = true;
        hdCtx.imageSmoothingQuality = 'high';

        // 1. Clean crisp white background
        hdCtx.fillStyle = '#FFFFFF';
        hdCtx.fillRect(0, 0, exportW, exportH);

        // 2. Draw colored layer scaled with high quality
        hdCtx.drawImage(colorCanvas, 0, 0, exportW, exportH);

        // 3. Draw black line art on top with multiply blend for razor-sharp lines
        hdCtx.save();
        hdCtx.globalCompositeOperation = 'multiply';
        hdCtx.drawImage(lineArtCanvas, 0, 0, exportW, exportH);
        hdCtx.restore();

        return hdCanvas.toDataURL('image/png');
      },
      [width, height, exportImage]
    );

    const getProgressPercent = useCallback((): number => {
      const colorCanvas = colorCanvasRef.current;
      if (!colorCanvas) return 0;
      const ctx = colorCanvas.getContext('2d');
      if (!ctx) return 0;
      const data = ctx.getImageData(0, 0, width, height).data;
      let colored = 0;
      const step = 8;
      let total = 0;
      for (let i = 0; i < data.length; i += 4 * step) {
        total++;
        if (data[i + 3] > 30) colored++;
      }
      return Math.min(100, Math.round((colored / total) * 150));
    }, [width, height]);

    const zoomIn = () => setZoom(z => Math.min(3.0, z + 0.25));
    const zoomOut = () => setZoom(z => Math.max(0.75, z - 0.25));
    const resetZoom = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };

    const stampPath = (
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      strokeCtx: CanvasRenderingContext2D
    ) => {
      const currentBrush = brushConfigRef.current;
      const curColor = activeStrokeColorRef.current || selectedColorRef.current;
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy);
      const step = Math.max(1.0, currentBrush.size * 0.12);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const sx = p0.x + dx * t;
        const sy = p0.y + dy * t;
        drawBrushStamp(
          strokeCtx,
          sx,
          sy,
          currentBrush.type,
          curColor,
          currentBrush.size,
          currentBrush.opacity,
          currentBrush.textureIntensity
        );
      }
    };

    useImperativeHandle(ref, () => ({
      undo,
      redo,
      canUndo: undoStackRef.current.length > 1,
      canRedo: redoStackRef.current.length > 0,
      resetCanvas,
      exportImage,
      exportImageHD,
      exportOriginalLineArt: () => {
        if (!lineArtCanvasRef.current) return '';
        return lineArtCanvasRef.current.toDataURL('image/png');
      },
      getProgressPercent,
      zoomIn,
      zoomOut,
      resetZoom,
      zoomLevel: zoom,
      getDisplayCanvas: () => displayCanvasRef.current,
      getLineArtData: () => lineArtDataRef.current,
      getColorCanvas: () => colorCanvasRef.current,
      fillRegionAt: (x: number, y: number, color: string, brushType?: BrushType) => {
        if (!lineArtDataRef.current || !colorCanvasRef.current) return false;
        const region = getRegionMask(lineArtDataRef.current, x, y);
        if (!region) return false;
        const colorCtx = colorCanvasRef.current.getContext('2d');
        if (!colorCtx) return false;
        const effectiveBrush = brushType || brushConfigRef.current.type;
        const cfg = brushConfigRef.current;
        renderTexturedRegionFill(
          colorCtx,
          region,
          effectiveBrush,
          color,
          cfg.opacity,
          cfg.textureIntensity,
          cfg.paperTexture
        );
        renderComposite();
        pushUndoState();
        updateProgress();
        return true;
      },
      animateBucketFill: async (
        seedX: number,
        seedY: number,
        color: string,
        durationMs: number = 380,
        brushType?: BrushType,
        multiColor?: MultiColorTextureConfig
      ) => {
        if (!lineArtDataRef.current || !colorCanvasRef.current) return false;
        const region = getRegionMask(lineArtDataRef.current, seedX, seedY);
        if (!region) return false;
        const colorCanvas = colorCanvasRef.current;
        const colorCtx = colorCanvas.getContext('2d');
        if (!colorCtx) return false;
        const effectiveBrush = brushType || brushConfigRef.current.type;
        const cfg = brushConfigRef.current;

        // 1. Prepare target filled layer for this region
        const fillCanvas = document.createElement('canvas');
        fillCanvas.width = width;
        fillCanvas.height = height;
        const fillCtx = fillCanvas.getContext('2d')!;
        renderTexturedRegionFill(
          fillCtx,
          region,
          effectiveBrush,
          color,
          cfg.opacity,
          cfg.textureIntensity,
          cfg.paperTexture,
          multiColor
        );

        // 2. Prepare region mask
        const regionMask = createRegionMaskCanvas(region);

        // 3. Compute maximum radius from seed point to the region boundary
        const { minX, minY, maxX, maxY } = region;
        const d1 = Math.hypot(seedX - minX, seedY - minY);
        const d2 = Math.hypot(seedX - maxX, seedY - minY);
        const d3 = Math.hypot(seedX - minX, seedY - maxY);
        const d4 = Math.hypot(seedX - maxX, seedY - maxY);
        const maxRadius = Math.max(18, Math.max(d1, d2, d3, d4) + 12);

        const baseSnapshot = document.createElement('canvas');
        baseSnapshot.width = width;
        baseSnapshot.height = height;
        const baseCtx = baseSnapshot.getContext('2d')!;
        baseCtx.drawImage(colorCanvas, 0, 0);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d')!;

        // Progressive ink-bleed spread duration over 300ms–450ms
        const duration = Math.max(300, Math.min(450, durationMs || 380));
        const startTime = performance.now();

        await new Promise<void>(resolve => {
          const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, Math.max(0, elapsed / duration));

            // Ease-out cubic curve (1 - Math.pow(1 - progress, 3)): pigment starts fast and settles softly into boundaries
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentRadius = maxRadius * ease;

            tempCtx.clearRect(0, 0, width, height);
            tempCtx.drawImage(fillCanvas, 0, 0);

            // Progressive ink-bleed feathered radial mask
            tempCtx.save();
            tempCtx.globalCompositeOperation = 'destination-in';

            // Soft radial edge feathering gradient: color absorbs naturally into paper grain rather than hard digital edges
            const featherWidth = Math.max(16, Math.min(52, currentRadius * 0.35));
            const innerRadius = Math.max(0, currentRadius - featherWidth);

            const radGrad = tempCtx.createRadialGradient(
              seedX,
              seedY,
              innerRadius,
              seedX,
              seedY,
              currentRadius
            );
            radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            radGrad.addColorStop(0.60, 'rgba(255, 255, 255, 0.98)');
            radGrad.addColorStop(0.80, 'rgba(255, 255, 255, 0.72)');
            radGrad.addColorStop(0.92, 'rgba(255, 255, 255, 0.30)');
            radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            tempCtx.fillStyle = radGrad;
            tempCtx.beginPath();
            tempCtx.arc(seedX, seedY, currentRadius, 0, Math.PI * 2);
            tempCtx.fill();

            // Strictly clip inside exact enclosed region boundary
            tempCtx.drawImage(regionMask, 0, 0);
            tempCtx.restore();

            // Reconstruct colorCanvas: base + current animated expanding ink bleed
            colorCtx.clearRect(0, 0, width, height);
            colorCtx.drawImage(baseSnapshot, 0, 0);
            colorCtx.drawImage(tempCanvas, 0, 0);

            // Directly render composite frame for 60fps/120fps sync
            renderComposite();

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              // Finalize exact pristine textured fill onto colorCanvas
              colorCtx.clearRect(0, 0, width, height);
              colorCtx.drawImage(baseSnapshot, 0, 0);
              colorCtx.drawImage(fillCanvas, 0, 0);
              renderComposite();
              pushUndoState();
              updateProgress();
              resolve();
            }
          };
          requestAnimationFrame(step);
        });

        return true;
      },
      paintStrokeAtRegion: (
        seedX: number,
        seedY: number,
        strokePoints: { x: number; y: number }[],
        color: string,
        brushType?: BrushType
      ) => {
        if (!lineArtDataRef.current || !colorCanvasRef.current || strokePoints.length === 0) return false;
        const region = getRegionMask(lineArtDataRef.current, seedX, seedY);
        if (!region) return false;
        const colorCtx = colorCanvasRef.current.getContext('2d');
        if (!colorCtx) return false;
        const effectiveBrush = brushType || brushConfigRef.current.type;
        const cfg = brushConfigRef.current;
        const regionMask = createRegionMaskCanvas(region);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d')!;

        for (let i = 0; i < strokePoints.length - 1; i++) {
          stampPath(strokePoints[i], strokePoints[i + 1], tempCtx);
        }

        tempCtx.save();
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(regionMask, 0, 0);
        tempCtx.restore();

        colorCtx.save();
        colorCtx.globalCompositeOperation = 'source-over';
        colorCtx.drawImage(tempCanvas, 0, 0);
        colorCtx.restore();

        scheduleRender();
        return true;
      },
      startArtistStroke: (
        p: { x: number; y: number },
        color: string,
        brushType: BrushType,
        size: number,
        opacity: number,
        seedX: number,
        seedY: number
      ) => {
        if (!lineArtDataRef.current || !colorCanvasRef.current || !strokeCanvasRef.current) return false;

        const seedKey = `${seedX},${seedY}`;
        if (!activeRegionRef.current || lastArtistSeedRef.current !== seedKey) {
          const region = getRegionMask(lineArtDataRef.current, seedX, seedY);
          if (region) {
            activeRegionRef.current = region;
            activeRegionMaskCanvasRef.current = createRegionMaskCanvas(region);
            lastArtistSeedRef.current = seedKey;
          }
        }

        brushConfigRef.current = {
          ...brushConfigRef.current,
          type: brushType,
          color,
          size,
          opacity,
        };
        activeStrokeColorRef.current = color;
        selectedColorRef.current = color;

        const strokeCanvas = strokeCanvasRef.current;
        const strokeCtx = strokeCanvas.getContext('2d');
        if (!strokeCtx) return false;

        strokeCtx.clearRect(0, 0, width, height);

        drawBrushStamp(
          strokeCtx,
          p.x,
          p.y,
          brushType,
          color,
          size,
          opacity,
          brushConfigRef.current.textureIntensity
        );

        artistLastPointRef.current = { x: p.x, y: p.y };
        isDrawingRef.current = true;
        scheduleRender();
        return true;
      },
      continueArtistStroke: (pt: { x: number; y: number }) => {
        if (!isDrawingRef.current || !artistLastPointRef.current || !strokeCanvasRef.current) return;
        const strokeCtx = strokeCanvasRef.current.getContext('2d');
        if (!strokeCtx) return;
        stampPath(artistLastPointRef.current, pt, strokeCtx);
        artistLastPointRef.current = { x: pt.x, y: pt.y };
        scheduleRender();
      },
      endArtistStroke: () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        artistLastPointRef.current = null;
        activeStrokeColorRef.current = null;

        const colorCanvas = colorCanvasRef.current;
        const strokeCanvas = strokeCanvasRef.current;
        const maskedStrokeCanvas = maskedStrokeCanvasRef.current;
        const regionMaskCanvas = activeRegionMaskCanvasRef.current;

        if (colorCanvas && strokeCanvas && maskedStrokeCanvas) {
          const colorCtx = colorCanvas.getContext('2d')!;
          const maskedCtx = maskedStrokeCanvas.getContext('2d')!;
          const strokeCtx = strokeCanvas.getContext('2d')!;

          maskedCtx.clearRect(0, 0, width, height);
          maskedCtx.drawImage(strokeCanvas, 0, 0);

          if (regionMaskCanvas) {
            maskedCtx.save();
            maskedCtx.globalCompositeOperation = 'destination-in';
            maskedCtx.drawImage(regionMaskCanvas, 0, 0);
            maskedCtx.restore();
          }

          colorCtx.save();
          colorCtx.globalCompositeOperation = 'source-over';
          colorCtx.drawImage(maskedStrokeCanvas, 0, 0);
          colorCtx.restore();

          strokeCtx.clearRect(0, 0, width, height);
          maskedCtx.clearRect(0, 0, width, height);
        }

        renderComposite();
        updateProgress();
      },
      commitRegionStrokes: () => {
        pushUndoState();
        renderComposite();
        updateProgress();
      },
      triggerObjectSpringBump: (
        center: { x: number; y: number },
        scalePeak = 1.06,
        durationMs = 400
      ) => {
        if (springAnimRef.current !== null) {
          cancelAnimationFrame(springAnimRef.current);
          springAnimRef.current = null;
        }
        const origX = Math.max(5, Math.min(95, Math.round((center.x / width) * 100)));
        const origY = Math.max(5, Math.min(95, Math.round((center.y / height) * 100)));
        setSpringOrigin({ x: origX, y: origY });

        const startTime = performance.now();
        const peak = Math.max(1.04, Math.min(1.08, scalePeak));

        const animateBump = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / durationMs);

          // Spring bump: gentle scale pulse (scale(1.04) to scale(1.08) centered on bounding box centroid)
          const pulse = Math.sin(progress * Math.PI) * Math.pow(1 - progress, 0.6);
          const currentScale = 1.0 + pulse * (peak - 1.0);

          setSpringScale(currentScale);

          if (progress < 1) {
            springAnimRef.current = requestAnimationFrame(animateBump);
          } else {
            setSpringScale(1.0);
            springAnimRef.current = null;
          }
        };

        springAnimRef.current = requestAnimationFrame(animateBump);
      },
    }));

    const getCanvasPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
      const display = displayCanvasRef.current;
      if (!display) return null;
      const rect = display.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      return { x, y };
    };

    // Pointer Event Handlers
    const handlePointerDown = (e: React.PointerEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);

      if (isDrawingRef.current) {
        handlePointerUp();
      }

      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}

      const pt = getCanvasPoint(e.clientX, e.clientY);
      if (pt && onCanvasClick) {
        onCanvasClick(pt);
        return;
      }
      if (!pt || !lineArtDataRef.current || !colorCanvasRef.current) return;

      const currentBrush = brushConfigRef.current;
      const curColor = selectedColorRef.current;
      const curMode = coloringModeRef.current;
      const lineData = lineArtDataRef.current;
      const region = getRegionMask(lineData, pt.x, pt.y);

      // 1. Bucket Fill Tool Mode
      if (curMode === 'fill') {
        if (region) {
          const colorCtx = colorCanvasRef.current.getContext('2d')!;
          renderTexturedRegionFill(
            colorCtx,
            region,
            currentBrush.type,
            curColor,
            currentBrush.opacity,
            currentBrush.textureIntensity,
            currentBrush.paperTexture
          );
          renderComposite();
          pushUndoState();
          updateProgress();
          if (onAutoSaveRef.current && displayCanvasRef.current) {
            const dataUrl = displayCanvasRef.current.toDataURL('image/png');
            const pct = getProgressPercent();
            onAutoSaveRef.current(dataUrl, pct);
          }
          soundEngine.playFillSound(currentBrush.soundEnabled);
          hapticsEngine.triggerTap(currentBrush.hapticEnabled);
        }
        return;
      }

      // 2. Real Continuous Paintbrush Mode
      if (!region) {
        return;
      }

      isDrawingRef.current = true;
      setIsDrawingState(true);
      activeRegionRef.current = region;
      activeRegionMaskCanvasRef.current = createRegionMaskCanvas(region);
      lastPointRef.current = { x: pt.x, y: pt.y, time: Date.now() };

      const strokeCanvas = strokeCanvasRef.current;
      if (strokeCanvas) {
        const strokeCtx = strokeCanvas.getContext('2d')!;
        strokeCtx.clearRect(0, 0, width, height);
        drawBrushStamp(
          strokeCtx,
          pt.x,
          pt.y,
          currentBrush.type,
          curColor,
          currentBrush.size,
          currentBrush.opacity,
          currentBrush.textureIntensity
        );
      }

      soundEngine.startStroke(currentBrush.type, currentBrush.soundEnabled);
      hapticsEngine.triggerStrokePulse(currentBrush.hapticEnabled);
      renderComposite();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);

      if (!isDrawingRef.current || !lastPointRef.current || coloringModeRef.current === 'fill') return;

      const pt = getCanvasPoint(e.clientX, e.clientY);
      if (!pt) return;

      const strokeCanvas = strokeCanvasRef.current;
      if (!strokeCanvas) return;

      const strokeCtx = strokeCanvas.getContext('2d')!;
      const currentBrush = brushConfigRef.current;
      const now = Date.now();
      const last = lastPointRef.current;
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      const dist = Math.hypot(dx, dy);
      const dt = Math.max(1, now - last.time);
      const physicalSpeed = dist / dt;

      stampPath(last, pt, strokeCtx);
      lastPointRef.current = { x: pt.x, y: pt.y, time: now };
      soundEngine.onBrushMove(physicalSpeed, currentBrush.type, currentBrush.soundEnabled);
      hapticsEngine.triggerStrokePulse(currentBrush.hapticEnabled);
      scheduleRender();
    };

    const handlePointerUp = useCallback(() => {
      setIsDrawingState(false);
      soundEngine.stopStroke();

      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      lastPointRef.current = null;

      const colorCanvas = colorCanvasRef.current;
      const maskedStrokeCanvas = maskedStrokeCanvasRef.current;
      const strokeCanvas = strokeCanvasRef.current;
      const regionMaskCanvas = activeRegionMaskCanvasRef.current;
      const currentBrush = brushConfigRef.current;

      if (colorCanvas && strokeCanvas && maskedStrokeCanvas) {
        const colorCtx = colorCanvas.getContext('2d')!;
        const maskedCtx = maskedStrokeCanvas.getContext('2d')!;
        const strokeCtx = strokeCanvas.getContext('2d')!;

        maskedCtx.clearRect(0, 0, width, height);
        maskedCtx.drawImage(strokeCanvas, 0, 0);

        if (regionMaskCanvas) {
          maskedCtx.save();
          maskedCtx.globalCompositeOperation = 'destination-in';
          maskedCtx.drawImage(regionMaskCanvas, 0, 0);
          maskedCtx.restore();
        }

        if (currentBrush.type === 'eraser') {
          colorCtx.save();
          colorCtx.globalCompositeOperation = 'destination-out';
          colorCtx.drawImage(maskedStrokeCanvas, 0, 0);
          colorCtx.restore();
        } else {
          colorCtx.save();
          colorCtx.globalCompositeOperation = 'source-over';
          colorCtx.drawImage(maskedStrokeCanvas, 0, 0);
          colorCtx.restore();
        }

        strokeCtx.clearRect(0, 0, width, height);
        maskedCtx.clearRect(0, 0, width, height);
      }

      activeRegionRef.current = null;
      activeRegionMaskCanvasRef.current = null;
      renderComposite();
      pushUndoState();
      updateProgress();

      if (onAutoSaveRef.current && displayCanvasRef.current) {
        const dataUrl = displayCanvasRef.current.toDataURL('image/png');
        const pct = getProgressPercent();
        onAutoSaveRef.current(dataUrl, pct);
      }
    }, [width, height, getProgressPercent, pushUndoState, renderComposite, updateProgress]);

    useEffect(() => {
      const onGlobalPointerUp = () => {
        if (isDrawingRef.current) {
          handlePointerUp();
        } else {
          soundEngine.stopStroke();
        }
      };

      const onBlur = () => {
        soundEngine.stopStroke();
        if (isDrawingRef.current) {
          handlePointerUp();
        }
      };

      window.addEventListener('pointerup', onGlobalPointerUp);
      window.addEventListener('pointercancel', onGlobalPointerUp);
      window.addEventListener('blur', onBlur);
      return () => {
        window.removeEventListener('pointerup', onGlobalPointerUp);
        window.removeEventListener('pointercancel', onGlobalPointerUp);
        window.removeEventListener('blur', onBlur);
      };
    }, [handlePointerUp]);

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none bg-gradient-to-b from-[#FFF5F7] to-[#FDE8EE] ${
          interactive ? 'cursor-none' : 'cursor-default'
        }`}
        style={{ touchAction: 'none' }}
        onPointerEnter={interactive ? (e) => {
          setCursorPos({ x: e.clientX, y: e.clientY });
          setCursorVisible(true);
        } : undefined}
        onPointerDown={interactive ? handlePointerDown : undefined}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerUp={interactive ? handlePointerUp : undefined}
        onPointerCancel={interactive ? handlePointerUp : undefined}
        onPointerLeave={interactive ? () => {
          setCursorVisible(false);
          setIsDrawingState(false);
          handlePointerUp();
        } : undefined}
      >
        <div
          className="relative transition-transform duration-75 shadow-lg rounded-3xl overflow-visible border-4 border-white pointer-events-none"
          style={{
            transform: `scale(${zoom * springScale}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: `${springOrigin.x}% ${springOrigin.y}%`,
            transition: 'transform 40ms linear',
            maxHeight: 'calc(100% - 16px)',
            maxWidth: 'calc(100% - 16px)',
            aspectRatio: `${width}/${height}`,
            touchAction: 'none',
          }}
        >
          <canvas
            ref={displayCanvasRef}
            width={width}
            height={height}
            className={`w-full h-full object-contain rounded-2xl block ${
              interactive ? 'cursor-none pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{ touchAction: 'none' }}
            onPointerDown={interactive ? handlePointerDown : undefined}
          />

          {overlay && (
            <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
              {overlay}
            </div>
          )}
        </div>

        {interactive && (
          <CuteCursor
            brushType={brushConfig.type}
            coloringMode={coloringMode}
            color={selectedColor}
            brushSize={brushConfig.size}
            isDrawing={isDrawingState}
            visible={cursorVisible}
            x={cursorPos.x}
            y={cursorPos.y}
          />
        )}
      </div>
    );
  }
);

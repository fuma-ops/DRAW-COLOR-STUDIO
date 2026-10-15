import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  DrawingToolType,
  RecordedStroke,
  StrokePoint,
  DrawingAssets,
  DrawingVerificationResult,
  AutoColorRegion,
  StudioEnginePhase,
} from '../types/recordedDrawing';
import { PRESET_DRAWING_ASSETS } from '../data/presetDrawingAssets';
import {
  interpolateStrokePoints,
  renderStrokeOnContext,
  UserDrawingReplayer,
  verifyDrawingAgainstReference,
  buildAutoColorPlanFromReferences,
  loadImageData,
} from '../utils/userStrokeEngine';
import { KawaiiArtistStylus } from './KawaiiArtistStylus';
import { VirtualCursorState } from '../utils/autoColorBot';
import { StudioVideoRecorder, RecordingResult } from '../utils/studioRecorder';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';
import { getRegionMask, createRegionMaskCanvas } from '../utils/regionFill';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Video,
  PenTool,
  Paintbrush,
  Eraser,
  Pencil,
  Sliders,
  Maximize2,
  Palette,
  ChevronRight,
  ChevronLeft,
  X,
  Volume2,
} from 'lucide-react';

interface UserDrawingRecordingStudioProps {
  onBackToStudio?: () => void;
}

export const UserDrawingRecordingStudio: React.FC<UserDrawingRecordingStudioProps> = ({
  onBackToStudio,
}) => {
  // Phase Workflow
  const [currentPhase, setCurrentPhase] = useState<StudioEnginePhase>('draw');

  // Active Assets (Default: Kawaii Honey Bee for testing unusual drawing order)
  const [assets, setAssets] = useState<DrawingAssets>(PRESET_DRAWING_ASSETS[0]);
  const [dottedOpacity, setDottedOpacity] = useState<number>(0.55);
  const [showDottedGuide, setShowDottedGuide] = useState<boolean>(true);
  const [showBwOverlayPeek, setShowBwOverlayPeek] = useState<boolean>(false);
  const [bwOverlayOpacity, setBwOverlayOpacity] = useState<number>(0.35);

  // Drawing Canvas Layers
  const presentationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pigmentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineArtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<DrawingToolType>('pen');
  const [strokeColor, setStrokeColor] = useState<string>('#18181B');
  const [strokeSize, setStrokeSize] = useState<number>(5);
  const [strokeOpacity, setStrokeOpacity] = useState<number>(1.0);

  // Recorded Stroke Sequence (Phase 2)
  const [recordedStrokes, setRecordedStrokes] = useState<RecordedStroke[]>([]);
  const [undoStack, setUndoStack] = useState<RecordedStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<RecordedStroke[][]>([]);
  const isPointerDownRef = useRef<boolean>(false);
  const activeStrokePointsRef = useRef<StrokePoint[]>([]);
  const strokeStartTimeRef = useRef<number>(0);

  // Stylus State (Phase 2 & 3)
  const [cursorState, setCursorState] = useState<VirtualCursorState>({
    x: 400,
    y: 400,
    isDrawing: false,
    color: '#18181B',
    brushType: 'crayon',
    tiltAngle: 28,
    pressure: 0.5,
    visible: false,
  });

  // Replay State (Phase 3)
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [isReplayPaused, setIsReplayPaused] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(2.0);
  const [replayProgress, setReplayProgress] = useState<number>(0);
  const replayerRef = useRef<UserDrawingReplayer | null>(null);

  // Verification State (Phase 4)
  const [verificationResult, setVerificationResult] = useState<DrawingVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [showMissingContourHighlights, setShowMissingContourHighlights] = useState<boolean>(true);

  // Auto-Coloring State (Phase 5)
  const [autoColorPlans, setAutoColorPlans] = useState<AutoColorRegion[]>([]);
  const [isAutoColoring, setIsAutoColoring] = useState<boolean>(false);
  const [coloringRegionIndex, setColoringRegionIndex] = useState<number>(0);
  const [coloringProgress, setColoringProgress] = useState<number>(0);
  const isColoringCancelledRef = useRef<boolean>(false);

  // Video Export State (Phase 6)
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [exportVideoFormat, setExportVideoFormat] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [exportResolution, setExportResolution] = useState<'4k' | '1080p' | '720p'>('1080p');
  const [exportSequence, setExportSequence] = useState<'replay_and_color' | 'replay_only' | 'color_only'>('replay_and_color');
  const [recordedVideoResult, setRecordedVideoResult] = useState<RecordingResult | null>(null);
  const recorderRef = useRef<StudioVideoRecorder | null>(null);

  // Status & Guidance Message
  const [statusMessage, setStatusMessage] = useState<string>(
    'Tracez le personnage à votre guise ! Essayez de dessiner les ailes en premier, puis le visage, puis le corps 🐝'
  );

  // File Inputs for Custom 3 References
  const dottedFileInputRef = useRef<HTMLInputElement>(null);
  const bwFileInputRef = useRef<HTMLInputElement>(null);
  const coloredFileInputRef = useRef<HTMLInputElement>(null);

  // Redraw all strokes on canvas
  const redrawCanvasStrokes = useCallback((strokesToRender: RecordedStroke[]) => {
    const canvas = presentationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesToRender.forEach(s => renderStrokeOnContext(ctx, s));
  }, []);

  // Sync canvas size with asset dimensions
  useEffect(() => {
    const pCanvas = presentationCanvasRef.current;
    const pigCanvas = pigmentCanvasRef.current;
    const lCanvas = lineArtCanvasRef.current;
    if (pCanvas && pigCanvas && lCanvas) {
      pCanvas.width = assets.width;
      pCanvas.height = assets.height;
      pigCanvas.width = assets.width;
      pigCanvas.height = assets.height;
      lCanvas.width = assets.width;
      lCanvas.height = assets.height;
      redrawCanvasStrokes(recordedStrokes);
    }
  }, [assets, redrawCanvasStrokes, recordedStrokes]);

  // Coordinate conversion from pointer client coordinates to canvas internal coordinates
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = presentationCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  };

  // ==========================================
  // PHASE 2: MANUAL DRAWING & RECORDING
  // ==========================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReplaying || isAutoColoring) return;
    const pt = getCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    isPointerDownRef.current = true;
    strokeStartTimeRef.current = performance.now();
    activeStrokePointsRef.current = [
      {
        x: pt.x,
        y: pt.y,
        time: 0,
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      },
    ];

    // Play subtle cute stroke audio
    soundEngine.startStroke(activeTool === 'marker' ? 'marker' : 'pencil', true);
    hapticsEngine.triggerTap(true);

    const canvas = presentationCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        renderStrokeOnContext(ctx, {
          id: 'temp',
          sequenceNumber: recordedStrokes.length,
          tool: activeTool,
          color: strokeColor,
          size: strokeSize,
          opacity: strokeOpacity,
          points: activeStrokePointsRef.current,
          startTime: strokeStartTimeRef.current,
          endTime: strokeStartTimeRef.current,
          durationMs: 0,
        });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;

    // Update live cursor display
    setCursorState({
      x: pt.x,
      y: pt.y,
      isDrawing: isPointerDownRef.current,
      color: strokeColor,
      brushType: activeTool === 'marker' ? 'marker' : activeTool === 'pencil' ? 'pencil' : 'watercolor',
      toolStyle: activeTool === 'marker' ? 'marker' : activeTool === 'pencil' ? 'pencil' : 'stylus',
      toolName:
        activeTool === 'marker'
          ? 'Feutre Copic 💖'
          : activeTool === 'pencil'
          ? 'Crayon Bois ✏️'
          : activeTool === 'eraser'
          ? 'Gomme Magique ✨'
          : 'Plume Kawaii 🖋️',
      tiltAngle: 28,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
      visible: true,
    });

    if (!isPointerDownRef.current) return;

    const last = activeStrokePointsRef.current[activeStrokePointsRef.current.length - 1];
    const dx = pt.x - last.x;
    const dy = pt.y - last.y;
    const dist = Math.hypot(dx, dy);

    // Only record if moved at least 2 pixels
    if (dist >= 2) {
      const now = performance.now();
      const newPt: StrokePoint = {
        x: pt.x,
        y: pt.y,
        time: Math.round(now - strokeStartTimeRef.current),
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      };

      activeStrokePointsRef.current.push(newPt);

      // Draw progressive segment to canvas
      const canvas = presentationCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderStrokeOnContext(ctx, {
            id: 'temp',
            sequenceNumber: recordedStrokes.length,
            tool: activeTool,
            color: strokeColor,
            size: strokeSize,
            opacity: strokeOpacity,
            points: [last, newPt],
            startTime: strokeStartTimeRef.current,
            endTime: now,
            durationMs: now - strokeStartTimeRef.current,
          });
        }
      }

      soundEngine.onBrushMove(dist, activeTool === 'marker' ? 'marker' : 'pencil', true);
    }
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    const rawPoints = activeStrokePointsRef.current;
    if (rawPoints.length === 0) return;

    // Smooth & interpolate points to eliminate gaps
    const smoothedPoints = interpolateStrokePoints(rawPoints, 3);
    const endTime = performance.now();
    const durationMs = Math.round(endTime - strokeStartTimeRef.current);

    const newStroke: RecordedStroke = {
      id: `stroke-${Date.now()}-${recordedStrokes.length}`,
      sequenceNumber: recordedStrokes.length,
      tool: activeTool,
      color: strokeColor,
      size: strokeSize,
      opacity: strokeOpacity,
      points: smoothedPoints,
      startTime: strokeStartTimeRef.current,
      endTime,
      durationMs,
    };

    // Save previous state to undo stack
    setUndoStack(prev => [...prev, [...recordedStrokes]]);
    setRedoStack([]); // Clear redo on new action

    const nextStrokes = [...recordedStrokes, newStroke];
    setRecordedStrokes(nextStrokes);

    // Redraw with high-precision anti-aliased spline
    redrawCanvasStrokes(nextStrokes);

    setStatusMessage(`Trait #${nextStrokes.length} enregistré ! (${newStroke.tool.toUpperCase()})`);
  };

  const handlePointerCancelOrLeave = () => {
    if (isPointerDownRef.current) {
      handlePointerUp();
    }
    setCursorState(prev => ({ ...prev, visible: false }));
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isReplaying || isAutoColoring) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, [...recordedStrokes]]);
    setRecordedStrokes(previous);
    redrawCanvasStrokes(previous);
    setStatusMessage(`Annulation effectuée (${previous.length} traits restants)`);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isReplaying || isAutoColoring) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, [...recordedStrokes]]);
    setRecordedStrokes(next);
    redrawCanvasStrokes(next);
    setStatusMessage(`Rétablissement effectué (${next.length} traits)`);
  };

  const handleResetDrawing = () => {
    if (isReplaying || isAutoColoring) return;
    setUndoStack(prev => [...prev, [...recordedStrokes]]);
    setRedoStack([]);
    setRecordedStrokes([]);
    const canvas = presentationCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    const pigCanvas = pigmentCanvasRef.current;
    if (pigCanvas) {
      const pCtx = pigCanvas.getContext('2d');
      pCtx?.clearRect(0, 0, pigCanvas.width, pigCanvas.height);
    }
    setVerificationResult(null);
    setStatusMessage('Toile réinitialisée. Vous pouvez commencer à dessiner librement ✨');
  };

  // ==========================================
  // PHASE 3: REPLAY THE USER'S DRAWING
  // ==========================================
  const handleStartReplay = async () => {
    if (recordedStrokes.length === 0) {
      setStatusMessage('Veuillez dessiner au moins un trait avant de lancer le rejeu ✍️');
      return;
    }
    const canvas = presentationCanvasRef.current;
    if (!canvas) return;

    setIsReplaying(true);
    setIsReplayPaused(false);
    setCurrentPhase('replay');
    setStatusMessage(`Rejeu fidèle de votre dessin en cours... (${recordedStrokes.length} traits) 🎬`);

    // Clean canvas completely
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);

    const replayer = new UserDrawingReplayer(recordedStrokes, canvas, replaySpeed, {
      onProgress: (currentStrokeIdx, totalStrokes, progress0to1, cursor) => {
        setReplayProgress(Math.round(progress0to1 * 100));
        setCursorState(cursor);
      },
      onComplete: () => {
        setIsReplaying(false);
        setReplayProgress(100);
        setStatusMessage('Rejeu terminé avec succès ! Vérification des contours disponible ✨');
        // Automatically verify drawing contours after replay
        handleVerifyDrawing();
      },
    });

    replayerRef.current = replayer;
    await replayer.start();
  };

  const handleToggleReplayPause = () => {
    if (!replayerRef.current) return;
    if (isReplayPaused) {
      replayerRef.current.resume();
      setIsReplayPaused(false);
    } else {
      replayerRef.current.pause();
      setIsReplayPaused(true);
    }
  };

  const handleStopReplay = () => {
    if (replayerRef.current) {
      replayerRef.current.stop();
      replayerRef.current = null;
    }
    setIsReplaying(false);
    setIsReplayPaused(false);
    redrawCanvasStrokes(recordedStrokes);
    setStatusMessage('Rejeu interrompu.');
  };

  // ==========================================
  // PHASE 4: VERIFY DRAWING AGAINST B&W REFERENCE
  // ==========================================
  const handleVerifyDrawing = async () => {
    const canvas = presentationCanvasRef.current;
    if (!canvas) return;

    setIsVerifying(true);
    setStatusMessage('Comparaison du tracé avec le modèle noir et blanc de référence... 🔍');

    try {
      const { imageData: bwImageData } = await loadImageData(
        assets.bwReferenceUrl,
        assets.width,
        assets.height
      );
      const result = verifyDrawingAgainstReference(canvas, bwImageData);
      setVerificationResult(result);
      setCurrentPhase('verify');
      setStatusMessage(result.message);
    } catch (err) {
      console.error('Verification error:', err);
      setStatusMessage('Erreur lors de la vérification.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ==========================================
  // PHASE 5: AUTOMATIC COLORING FROM COLORED REFERENCE
  // ==========================================
  const handleStartAutoColoring = async () => {
    if (isAutoColoring) return;
    setIsAutoColoring(true);
    setCurrentPhase('color');
    isColoringCancelledRef.current = false;
    setStatusMessage('Analyse des régions et calcul des couleurs de référence... 🎨');

    try {
      const [{ imageData: bwData }, { imageData: colData }] = await Promise.all([
        loadImageData(assets.bwReferenceUrl, assets.width, assets.height),
        loadImageData(assets.coloredReferenceUrl, assets.width, assets.height),
      ]);

      const plans = await buildAutoColorPlanFromReferences(bwData, colData);
      setAutoColorPlans(plans);

      if (plans.length === 0) {
        setStatusMessage('Aucune région coloriable détectée.');
        setIsAutoColoring(false);
        return;
      }

      setStatusMessage(`${plans.length} zones trouvées ! Début du coloriage aux feutres Copic... ✨`);

      const pigmentCanvas = pigmentCanvasRef.current;
      if (!pigmentCanvas) return;
      const pigCtx = pigmentCanvas.getContext('2d')!;

      for (let rIdx = 0; rIdx < plans.length; rIdx++) {
        if (isColoringCancelledRef.current) break;

        const region = plans[rIdx];
        setColoringRegionIndex(rIdx);
        setColoringProgress(Math.round(((rIdx + 1) / plans.length) * 100));

        // Create clipping mask to ensure ZERO bleeding outside boundary outlines
        const mask = getRegionMask(bwData, region.seedX, region.seedY);
        if (!mask) continue;
        const maskCanvas = createRegionMaskCanvas(mask);

        // Sound effect
        soundEngine.playFillSound(true, 'bubble_sparkle');

        // Draw progressive marker sweeping strokes inside region
        const strokes = region.strokes;
        for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
          if (isColoringCancelledRef.current) break;
          const stroke = strokes[sIdx];
          if (stroke.length < 2) continue;

          // Temporary canvas for masked stroke
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = assets.width;
          tempCanvas.height = assets.height;
          const tempCtx = tempCanvas.getContext('2d')!;

          tempCtx.strokeStyle = region.color;
          tempCtx.lineWidth = 22;
          tempCtx.lineCap = 'round';
          tempCtx.lineJoin = 'round';
          tempCtx.beginPath();
          tempCtx.moveTo(stroke[0].x, stroke[0].y);
          tempCtx.lineTo(stroke[1].x, stroke[1].y);
          tempCtx.stroke();

          // Clip to region mask
          tempCtx.globalCompositeOperation = 'destination-in';
          tempCtx.drawImage(maskCanvas, 0, 0);

          // Stamp onto pigment layer (beneath line art)
          pigCtx.drawImage(tempCanvas, 0, 0);

          // Update virtual stylus position
          setCursorState({
            x: stroke[1].x,
            y: stroke[1].y,
            isDrawing: true,
            color: region.color,
            brushType: 'marker',
            toolStyle: 'marker',
            toolName: 'Feutre Copic 💖',
            tiltAngle: 28,
            pressure: 0.8,
            visible: true,
          });

          await new Promise(r => setTimeout(r, 60));
        }

        await new Promise(r => setTimeout(r, 90));
      }

      setCursorState(prev => ({ ...prev, visible: false }));
      setStatusMessage('Coloriage automatique terminé avec succès ! 🌟 Prêt pour l’export vidéo.');
    } catch (err) {
      console.error('Auto coloring error:', err);
      setStatusMessage('Erreur lors du coloriage automatique.');
    } finally {
      setIsAutoColoring(false);
    }
  };

  // ==========================================
  // PHASE 6: VIDEO RECORDING & EXPORT
  // ==========================================
  const handleExportFinalComposite = async () => {
    // Generate high resolution combined image
    const outCanvas = document.createElement('canvas');
    outCanvas.width = assets.width;
    outCanvas.height = assets.height;
    const outCtx = outCanvas.getContext('2d')!;

    // 1. White paper background
    outCtx.fillStyle = '#FFFFFF';
    outCtx.fillRect(0, 0, assets.width, assets.height);

    // 2. Pigment layer (color)
    if (pigmentCanvasRef.current) {
      outCtx.drawImage(pigmentCanvasRef.current, 0, 0);
    }

    // 3. User line art (ink)
    if (presentationCanvasRef.current) {
      outCtx.drawImage(presentationCanvasRef.current, 0, 0);
    }

    const dataUrl = outCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${assets.id}-artwork-hd.png`;
    a.click();
    setStatusMessage('Image Ultra HD téléchargée ! ✨');
  };

  const handleStartFullVideoRecording = async () => {
    if (isRecordingVideo) return;
    setIsRecordingVideo(true);
    setCurrentPhase('export');
    setStatusMessage('Démarrage de la capture vidéo en temps réel 🎥...');

    // Combined presentation canvas
    const displayCanvas = presentationCanvasRef.current;
    if (!displayCanvas) return;

    const recorder = new StudioVideoRecorder({
      sourceCanvas: displayCanvas,
      aspectRatio: exportVideoFormat,
      resolution: exportResolution,
      includeAudio: true,
      includeCursor: true,
      cursorStyle: 'auto',
      getCursorState: () => cursorState,
    });

    recorderRef.current = recorder;
    await recorder.start();

    // Run selected sequence
    if (exportSequence === 'replay_and_color' || exportSequence === 'replay_only') {
      await handleStartReplay();
    }
    if (exportSequence === 'replay_and_color' || exportSequence === 'color_only') {
      await handleStartAutoColoring();
    }

    // Stop recording and get result
    await new Promise(r => setTimeout(r, 1200));
    try {
      const result = await recorder.stop();
      setRecordedVideoResult(result);
      setStatusMessage(`Vidéo générée avec succès (${Math.round(result.durationMs / 1000)}s) ! 🎬`);
    } catch (err) {
      console.error('Video recording error:', err);
    } finally {
      setIsRecordingVideo(false);
    }
  };

  // Custom File Upload Handlers (Phase 1)
  const handleFileUpload = (
    type: 'dotted' | 'bw' | 'colored',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      if (!url) return;
      setAssets(prev => ({
        ...prev,
        id: 'custom-asset',
        name: 'Custom User Character',
        ...(type === 'dotted' && { dottedGuideUrl: url }),
        ...(type === 'bw' && { bwReferenceUrl: url }),
        ...(type === 'colored' && { coloredReferenceUrl: url }),
      }));
      setStatusMessage(`Référence ${type.toUpperCase()} importée avec succès !`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#FFF7F9] overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Studio Header */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-pink-100/90 px-4 flex items-center justify-between shrink-0 shadow-2xs z-30">
        <div className="flex items-center gap-3">
          {onBackToStudio && (
            <button
              onClick={onBackToStudio}
              className="px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#7A6872] flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Studio Auto</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#4A3B43] tracking-tight">
              KAWAII DRAWING & REPLAY ENGINE
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold text-[10px] shadow-2xs">
              RECORD & REPLAY
            </span>
          </div>
        </div>

        {/* Phase Navigator Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-pink-50/80 p-1 rounded-2xl border border-pink-100">
          {(
            [
              { id: 'draw', label: '1. Dessiner & Enregistrer', icon: PenTool },
              { id: 'replay', label: '2. Rejouer Mon Dessin', icon: Play },
              { id: 'verify', label: '3. Vérifier Contours', icon: CheckCircle2 },
              { id: 'color', label: '4. Coloriage Auto', icon: Paintbrush },
              { id: 'export', label: '5. Vidéo & Export', icon: Video },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentPhase(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentPhase === tab.id
                  ? 'bg-white text-pink-600 shadow-xs'
                  : 'text-[#7A6872] hover:text-[#4A3B43]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          {currentPhase === 'draw' && (
            <button
              onClick={handleStartReplay}
              disabled={recordedStrokes.length === 0}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white text-xs font-extrabold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>REPLAY MY DRAWING ✨</span>
            </button>
          )}

          {currentPhase === 'replay' && (
            <button
              onClick={handleToggleReplayPause}
              className="px-4 py-2 rounded-2xl bg-pink-500 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {isReplayPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
              <span>{isReplayPaused ? 'Reprendre' : 'Pause'}</span>
            </button>
          )}

          {currentPhase === 'verify' && (
            <button
              onClick={handleStartAutoColoring}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer hover:shadow-lg transition-all"
            >
              <Paintbrush className="w-4 h-4" />
              <span>START COLORING 🎨</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar (Phase 1 & 2 Controls) */}
        <aside className="w-64 bg-white/90 border-r border-pink-100 flex flex-col p-3 overflow-y-auto no-scrollbar gap-3 z-10 shrink-0">
          {/* Preset Selector */}
          <div className="bg-pink-50/70 p-3 rounded-2xl border border-pink-100">
            <span className="text-[11px] font-black text-[#4A3B43] flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Modèle d'Exemple</span>
            </span>
            <div className="flex flex-col gap-1.5">
              {PRESET_DRAWING_ASSETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setAssets(preset);
                    handleResetDrawing();
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    assets.id === preset.id
                      ? 'bg-white text-pink-600 shadow-xs border border-pink-200'
                      : 'text-[#7A6872] hover:bg-white/60'
                  }`}
                >
                  <span className="truncate">{preset.name}</span>
                  {assets.id === preset.id && <CheckCircle2 className="w-3.5 h-3.5 text-pink-500 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Phase 1: Import 3 References */}
          <div className="bg-white p-3 rounded-2xl border border-pink-100/90 shadow-2xs">
            <span className="text-[11px] font-black text-[#4A3B43] flex items-center gap-1 mb-2">
              <Upload className="w-3.5 h-3.5 text-pink-500" />
              <span>Importer 3 Références</span>
            </span>
            <div className="flex flex-col gap-2">
              {/* 1. Dotted Guide */}
              <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px]">
                <span className="font-bold text-[#4A3B43]">1. Guide Pointillé</span>
                <button
                  onClick={() => dottedFileInputRef.current?.click()}
                  className="px-2 py-0.5 rounded-lg bg-pink-100 text-pink-700 font-extrabold text-[10px] hover:bg-pink-200 cursor-pointer"
                >
                  Remplacer
                </button>
                <input
                  type="file"
                  ref={dottedFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFileUpload('dotted', e)}
                />
              </div>

              {/* 2. B&W Line Art */}
              <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px]">
                <span className="font-bold text-[#4A3B43]">2. Réf. Noir & Blanc</span>
                <button
                  onClick={() => bwFileInputRef.current?.click()}
                  className="px-2 py-0.5 rounded-lg bg-pink-100 text-pink-700 font-extrabold text-[10px] hover:bg-pink-200 cursor-pointer"
                >
                  Remplacer
                </button>
                <input
                  type="file"
                  ref={bwFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFileUpload('bw', e)}
                />
              </div>

              {/* 3. Colored Reference */}
              <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px]">
                <span className="font-bold text-[#4A3B43]">3. Réf. Couleur</span>
                <button
                  onClick={() => coloredFileInputRef.current?.click()}
                  className="px-2 py-0.5 rounded-lg bg-pink-100 text-pink-700 font-extrabold text-[10px] hover:bg-pink-200 cursor-pointer"
                >
                  Remplacer
                </button>
                <input
                  type="file"
                  ref={coloredFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFileUpload('colored', e)}
                />
              </div>
            </div>
          </div>

          {/* Guide Layers Visibility Controls */}
          <div className="bg-white p-3 rounded-2xl border border-pink-100/90 shadow-2xs">
            <span className="text-[11px] font-black text-[#4A3B43] flex items-center gap-1 mb-2">
              <Layers className="w-3.5 h-3.5 text-pink-500" />
              <span>Visibilité des Repères</span>
            </span>
            <div className="flex flex-col gap-2.5">
              {/* Dotted Guide Toggle */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#4A3B43] mb-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDottedGuide}
                      onChange={e => setShowDottedGuide(e.target.checked)}
                      className="accent-pink-500 rounded"
                    />
                    <span>Guide Pointillé</span>
                  </label>
                  <span className="text-[10px] text-pink-500">{Math.round(dottedOpacity * 100)}%</span>
                </div>
                {showDottedGuide && (
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={dottedOpacity}
                    onChange={e => setDottedOpacity(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 h-1 bg-pink-100 rounded-lg"
                  />
                )}
              </div>

              {/* B&W Reference Peek Layer (Toggleable comparison, NOT displayed on top while recording) */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#4A3B43] mb-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBwOverlayPeek}
                      onChange={e => setShowBwOverlayPeek(e.target.checked)}
                      className="accent-pink-500 rounded"
                    />
                    <span>Aperçu Réf. N&B (Comparaison)</span>
                  </label>
                  <span className="text-[10px] text-pink-500">{Math.round(bwOverlayOpacity * 100)}%</span>
                </div>
                {showBwOverlayPeek && (
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={bwOverlayOpacity}
                    onChange={e => setBwOverlayOpacity(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 h-1 bg-pink-100 rounded-lg"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Phase 2: Drawing Tools Picker */}
          <div className="bg-white p-3 rounded-2xl border border-pink-100/90 shadow-2xs">
            <span className="text-[11px] font-black text-[#4A3B43] flex items-center gap-1 mb-2">
              <PenTool className="w-3.5 h-3.5 text-pink-500" />
              <span>Outil de Tracé</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {(
                [
                  { id: 'pen', label: 'Plume 🖋️', defaultSize: 5 },
                  { id: 'pencil', label: 'Crayon ✏️', defaultSize: 4 },
                  { id: 'marker', label: 'Feutre 🖍️', defaultSize: 8 },
                  { id: 'eraser', label: 'Gomme 🧼', defaultSize: 14 },
                ] as const
              ).map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTool(t.id);
                    setStrokeSize(t.defaultSize);
                  }}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTool === t.id
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'bg-pink-50/70 text-[#7A6872] hover:bg-pink-100'
                  }`}
                >
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Thickness Slider */}
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#4A3B43]">
                <span>Épaisseur</span>
                <span className="text-pink-500 font-extrabold">{strokeSize}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                value={strokeSize}
                onChange={e => setStrokeSize(parseInt(e.target.value, 10))}
                className="w-full accent-pink-500 h-1 bg-pink-100 rounded-lg"
              />
            </div>

            {/* Quick Colors */}
            <div className="flex items-center gap-1.5 pt-1">
              {['#18181B', '#3E2723', '#475569', '#EF4444', '#3B82F6'].map(col => (
                <button
                  key={col}
                  onClick={() => setStrokeColor(col)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    strokeColor === col ? 'scale-110 border-pink-400 shadow-xs' : 'border-white'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          {/* Stroke Sequence Metrics & History */}
          <div className="bg-pink-50/60 p-3 rounded-2xl border border-pink-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#4A3B43]">Séquence Enregistrée</span>
              <span className="px-2 py-0.5 rounded-full bg-white text-pink-600 font-black text-[11px] shadow-2xs">
                {recordedStrokes.length} traits
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="flex-1 py-1.5 rounded-xl bg-white text-[#4A3B43] border border-pink-200 text-xs font-bold hover:bg-pink-100 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="flex-1 py-1.5 rounded-xl bg-white text-[#4A3B43] border border-pink-200 text-xs font-bold hover:bg-pink-100 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Rétablir
              </button>
              <button
                onClick={handleResetDrawing}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                title="Effacer tout"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Center Presentation Stage */}
        <main className="flex-1 flex flex-col items-center justify-center p-3 relative bg-[#FAF2F4] overflow-hidden">
          {/* Status Message Pill */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-25 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-pink-200/90 shadow-md flex items-center gap-2 max-w-lg">
            <Sparkles className="w-4 h-4 text-pink-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-[#4A3B43] truncate">{statusMessage}</span>
          </div>

          {/* Canvas Viewport Frame */}
          <div
            ref={containerRef}
            className="relative shadow-2xl rounded-2xl overflow-hidden border-2 border-pink-200/90 bg-white"
            style={{
              width: 'min(78vh, 78vw)',
              height: 'min(78vh, 78vw)',
              aspectRatio: '1/1',
            }}
          >
            {/* 1. Underlying Pigment Layer (Phase 5 - Automatic Felt Marker Pigment) */}
            <canvas
              ref={pigmentCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {/* 2. Dotted Guide Layer (Phase 1 - Visual Guide for User's Hand) */}
            {showDottedGuide && (
              <img
                src={assets.dottedGuideUrl}
                alt="Dotted Guide"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-15 select-none transition-opacity"
                style={{ opacity: dottedOpacity }}
              />
            )}

            {/* 3. Black & White Reference Peek Layer (Phase 3 & 4 Comparison only) */}
            {showBwOverlayPeek && (
              <img
                src={assets.bwReferenceUrl}
                alt="B&W Reference Peek"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-18 select-none transition-opacity"
                style={{ opacity: bwOverlayOpacity }}
              />
            )}

            {/* 4. Active User Presentation Canvas (Phase 2 & 3 - User Strokes and Replay) */}
            <canvas
              ref={presentationCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancelOrLeave}
              onPointerLeave={handlePointerCancelOrLeave}
              className="absolute inset-0 w-full h-full z-20 cursor-crosshair touch-none"
            />

            {/* 5. Virtual Pen Cursor (Phase 3 Replay & Stylus tracking) */}
            {cursorState.visible && (
              <KawaiiArtistStylus
                x={cursorState.x}
                y={cursorState.y}
                canvasWidth={assets.width}
                canvasHeight={assets.height}
                color={cursorState.color}
                brushType={cursorState.brushType}
                isDrawing={cursorState.isDrawing}
                pressure={cursorState.pressure}
                tiltAngle={cursorState.tiltAngle}
                visible={cursorState.visible}
                toolStyle={cursorState.toolStyle}
                toolName={cursorState.toolName}
              />
            )}

            {/* 6. Missing Contour Warning Highlights (Phase 4 Verification) */}
            {currentPhase === 'verify' &&
              showMissingContourHighlights &&
              verificationResult &&
              verificationResult.missingContourPoints.slice(0, 150).map((pt, i) => (
                <div
                  key={`missing-pt-${i}`}
                  className="absolute pointer-events-none z-25 rounded-full w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-2 border-rose-500 bg-rose-400/25 animate-ping"
                  style={{
                    left: `${(pt.x / assets.width) * 100}%`,
                    top: `${(pt.y / assets.height) * 100}%`,
                  }}
                />
              ))}
          </div>

          {/* Replay Floating Controls HUD (Phase 3) */}
          {currentPhase === 'replay' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-pink-200 shadow-xl flex items-center gap-4">
              <button
                onClick={handleToggleReplayPause}
                className="p-2 rounded-xl bg-pink-500 text-white cursor-pointer hover:bg-pink-600 shadow-xs"
              >
                {isReplayPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#4A3B43]">Vitesse:</span>
                {[0.5, 1, 2, 4].map(spd => (
                  <button
                    key={spd}
                    onClick={() => {
                      setReplaySpeed(spd);
                      replayerRef.current?.setSpeed(spd);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-xs font-extrabold cursor-pointer ${
                      replaySpeed === spd
                        ? 'bg-pink-500 text-white'
                        : 'bg-pink-50 text-[#7A6872] hover:bg-pink-100'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-32">
                <div className="flex-1 bg-pink-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-amber-400 h-full transition-all duration-100"
                    style={{ width: `${replayProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-extrabold text-[#4A3B43]">{replayProgress}%</span>
              </div>

              <button
                onClick={handleStopReplay}
                className="px-2.5 py-1 rounded-xl bg-slate-100 text-[#4A3B43] hover:bg-slate-200 text-xs font-bold cursor-pointer"
              >
                Arrêter
              </button>
            </div>
          )}
        </main>

        {/* Right Sidebar: Phase Details & Diagnostics */}
        <aside className="w-72 bg-white/90 border-l border-pink-100 flex flex-col p-3 overflow-y-auto no-scrollbar gap-3 shrink-0">
          {/* Phase 4 Verification Diagnostic Panel */}
          {verificationResult && (
            <div className="bg-white p-3 rounded-2xl border border-pink-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#4A3B43] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Résultat Vérification</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    verificationResult.status === 'excellent'
                      ? 'bg-emerald-100 text-emerald-700'
                      : verificationResult.status === 'good'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {verificationResult.coveragePercent}% de précision
                </span>
              </div>

              <p className="text-[11px] text-[#7A6872] leading-relaxed mb-3">
                {verificationResult.message}
              </p>

              {verificationResult.missingContourPoints.length > 0 && (
                <div className="mb-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-rose-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMissingContourHighlights}
                      onChange={e => setShowMissingContourHighlights(e.target.checked)}
                      className="accent-rose-500 rounded"
                    />
                    <span>Mettre en valeur les manques (néon)</span>
                  </label>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPhase('draw')}
                  className="flex-1 py-1.5 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Corriger le dessin ✏️
                </button>
                <button
                  onClick={handleStartAutoColoring}
                  className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-extrabold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Colorier 🎨
                </button>
              </div>
            </div>
          )}

          {/* Phase 5 Auto-Coloring Panel */}
          {currentPhase === 'color' && (
            <div className="bg-white p-3 rounded-2xl border border-pink-100 shadow-sm">
              <span className="text-xs font-black text-[#4A3B43] flex items-center gap-1.5 mb-2">
                <Paintbrush className="w-4 h-4 text-pink-500" />
                <span>Coloriage Automatique</span>
              </span>
              <p className="text-[11px] text-[#7A6872] mb-3">
                Régions colorées à partir du modèle couleur sans déborder des contours tracés.
              </p>
              <div className="w-full bg-pink-100 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-pink-500 to-teal-400 h-full transition-all duration-200"
                  style={{ width: `${coloringProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-[#4A3B43] mb-3">
                <span>Progression</span>
                <span>{coloringProgress}%</span>
              </div>
              <button
                onClick={handleExportFinalComposite}
                className="w-full py-2 rounded-xl bg-pink-500 text-white font-extrabold text-xs shadow-xs hover:bg-pink-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger Dessin HD (PNG)</span>
              </button>
            </div>
          )}

          {/* Phase 6 Video Creator & Export Panel */}
          <div className="bg-white p-3 rounded-2xl border border-pink-100 shadow-sm">
            <span className="text-xs font-black text-[#4A3B43] flex items-center gap-1.5 mb-2">
              <Video className="w-4 h-4 text-rose-500" />
              <span>Générateur Vidéo (Phase 6)</span>
            </span>

            {/* Format Picker */}
            <div className="flex flex-col gap-1.5 mb-2.5">
              <span className="text-[11px] font-bold text-[#4A3B43]">Format Vidéo</span>
              <div className="grid grid-cols-3 gap-1">
                {(['16:9', '9:16', '1:1'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setExportVideoFormat(fmt)}
                    className={`py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      exportVideoFormat === fmt
                        ? 'bg-pink-500 text-white'
                        : 'bg-pink-50 text-[#7A6872] hover:bg-pink-100'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="flex flex-col gap-1.5 mb-2.5">
              <span className="text-[11px] font-bold text-[#4A3B43]">Résolution</span>
              <div className="grid grid-cols-3 gap-1">
                {(['1080p', '4k', '720p'] as const).map(res => (
                  <button
                    key={res}
                    onClick={() => setExportResolution(res)}
                    className={`py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      exportResolution === res
                        ? 'bg-pink-500 text-white'
                        : 'bg-pink-50 text-[#7A6872] hover:bg-pink-100'
                    }`}
                  >
                    {res.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sequence Selection */}
            <div className="flex flex-col gap-1 mb-3">
              <span className="text-[11px] font-bold text-[#4A3B43]">Contenu de la Vidéo</span>
              <select
                value={exportSequence}
                onChange={e => setExportSequence(e.target.value as any)}
                className="w-full px-2 py-1.5 bg-pink-50 rounded-xl text-xs font-bold text-[#4A3B43] border border-pink-200 focus:outline-none"
              >
                <option value="replay_and_color">Rejeu du tracé + Coloriage automatique</option>
                <option value="replay_only">Rejeu du tracé seul</option>
                <option value="color_only">Coloriage automatique seul</option>
              </select>
            </div>

            <button
              onClick={handleStartFullVideoRecording}
              disabled={isRecordingVideo || recordedStrokes.length === 0}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white font-extrabold text-xs shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Video className="w-4 h-4 fill-white" />
              <span>{isRecordingVideo ? 'Enregistrement en cours...' : 'ENREGISTRER LA VIDÉO 🎬'}</span>
            </button>

            {/* Download Link when ready */}
            {recordedVideoResult && (
              <div className="mt-3 p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold text-emerald-800">
                  🎉 Vidéo prête ({Math.round(recordedVideoResult.sizeBytes / 1024 / 1024 * 10) / 10} MB)
                </span>
                <a
                  href={recordedVideoResult.url}
                  download={`${assets.id}-drawing-and-color.webm`}
                  className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger Vidéo WebM</span>
                </a>
              </div>
            )}
          </div>

          {/* Quick Info & Rules */}
          <div className="bg-pink-50/70 p-3 rounded-2xl border border-pink-100 text-[10px] text-[#7A6872] leading-relaxed">
            <span className="font-bold text-[#4A3B43] block mb-1">Règles du Studio :</span>
            <ul className="list-disc pl-3.5 space-y-1">
              <li>L’artiste décide de l’ordre (ex: ailes → visage → corps).</li>
              <li>Le rejeu reproduit exactement vos tracés et levées de crayon.</li>
              <li>Le coloriage respecte les couleurs du modèle sans déborder.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

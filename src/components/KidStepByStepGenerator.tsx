import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  KID_BEE_DRAWING_STEPS,
  KID_BEE_COLORING_STEPS,
  KID_SIDE_BEE_DRAWING_STEPS,
  KID_SIDE_BEE_COLORING_STEPS,
  KidDrawingStep,
  KidColoringStep,
  sampleSvgPath,
  splitSvgSubpaths,
  BEE_SPELLING_EN,
  BEE_SPELLING_FR,
  SpellingLetter,
} from '../utils/kidDrawingSteps';
import { analyzeAnyDottedDrawing } from '../utils/dottedDrawingAnalyzer';
import { processColoredCharacterImage, ValidationReport } from '../utils/singleImagePipeline';
import { PRESET_DRAWING_ASSETS } from '../data/presetDrawingAssets';
import { DrawingAssets } from '../types/recordedDrawing';
import { soundEngine } from '../utils/audioSynth';
import { hapticsEngine } from '../utils/haptics';
import { KawaiiArtistStylus } from './KawaiiArtistStylus';
import { VirtualCursorState } from '../utils/autoColorBot';
import { StudioVideoRecorder, RecordingResult } from '../utils/studioRecorder';
import { englishVoiceEngine } from '../utils/englishVoiceEngine';
import { buildTutorialScript } from '../utils/kidScript';
import { drawKidScene, getPaperRect, drawPencilCursor, SceneState } from '../utils/kidScene';
import {
  Play,
  Square,
  Video,
  Download,
  Sparkles,
  Volume2,
  VolumeX,
  Music,
  CheckCircle2,
  X,
  Sliders,
  Upload,
  RefreshCw,
  Palette,
  Eye,
  Layers,
  Heart,
  Star,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Edit3,
  Wand2,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

interface KidStepByStepGeneratorProps {
  onClose?: () => void;
  onBackToStudio?: () => void;
}

export const KidStepByStepGenerator: React.FC<KidStepByStepGeneratorProps> = ({
  onClose,
  onBackToStudio,
}) => {
  // Step & Phase Tracking
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'draw' | 'color' | 'spelling' | 'finished'>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentColorStepIndex, setCurrentColorStepIndex] = useState<number>(0);

  // Dynamic Drawing & Coloring Steps
  const [drawingSteps, setDrawingSteps] = useState<KidDrawingStep[]>(KID_SIDE_BEE_DRAWING_STEPS);
  const [coloringSteps, setColoringSteps] = useState<KidColoringStep[]>(KID_SIDE_BEE_COLORING_STEPS);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState<boolean>(false);
  const [isAnalyzingDotted, setIsAnalyzingDotted] = useState<boolean>(false);
  const [isProcessingSingleImage, setIsProcessingSingleImage] = useState<boolean>(false);
  const [isValidatingWorkflow, setIsValidatingWorkflow] = useState<boolean>(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>({
    isValid: true,
    outlineScore: 100,
    totalContourPaths: 6,
    detectedParts: ['Round Head', 'Cute Eyes & Smile', 'Chubby Body & Stinger', 'Sweet Stripes', 'Soft Wings', 'Tiny Feet'],
    colorRegionsCount: 4,
    warnings: [],
    autoFixedGaps: 0,
  });
  const [previewingStepId, setPreviewingStepId] = useState<string | null>(null);

  // Language: Default to English as explicitly requested for joyful kid-friendly words
  const [lang, setLang] = useState<'fr' | 'en'>('en');

  // Video Export Settings
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [videoResolution] = useState<'4k' | '1080p' | '720p'>('1080p');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedResult, setRecordedResult] = useState<RecordingResult | null>(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.1);
  const [enableVoice, setEnableVoice] = useState<boolean>(true);
  const [enableMusic, setEnableMusic] = useState<boolean>(true);

  // Assets: Default to Kawaii Side-View Bee (matches user's reference)
  const [assets, setAssets] = useState<DrawingAssets>(PRESET_DRAWING_ASSETS[0]);
  const [dottedOpacity, setDottedOpacity] = useState<number>(0.65);

  // Dreamy Pink Glitter Contour state (replaces text felicitation)
  const [activeGlitterContour, setActiveGlitterContour] = useState<{
    path: string;
    center: { x: number; y: number };
    top: number;
    id: string;
  } | null>(null);

  // Spelling Letters Glow State
  const [activeSpellingIndex, setActiveSpellingIndex] = useState<number | null>(null);
  const [isWordSpellingGlow, setIsWordSpellingGlow] = useState<boolean>(false);

  // Canvases
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pigmentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Video Recorder
  const recorderRef = useRef<StudioVideoRecorder | null>(null);

  // Cute stage (background scene), dotted-guide highlight and narration helpers
  const stageBoxRef = useRef<HTMLDivElement | null>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const highlightRef = useRef<{ paths: string[]; mode: 'off' | 'preview' | 'drawing' }>({ paths: [], mode: 'off' });
  const captionRef = useRef<string>('');
  const activeColorRef = useRef<string | null>(null);
  const guideImgRef = useRef<HTMLImageElement | null>(null);
  const cursorRef = useRef<VirtualCursorState | null>(null);
  const glitterRef = useRef<{ path: string; center: { x: number; y: number }; top: number; id: string } | null>(null);
  const liveRef = useRef<{
    phase: 'idle' | 'draw' | 'color' | 'spelling' | 'finished';
    title: string;
    emoji: string;
    stepText: string;
    progressTotal: number;
    progressDone: number;
    palette: string[];
    dottedOpacity: number;
    spelling: { chars: string[]; active: number | null; all: boolean };
  } | null>(null);
  const [isPreparingVoice, setIsPreparingVoice] = useState<boolean>(false);
  const [voiceProgress, setVoiceProgress] = useState<{ done: number; total: number } | null>(null);

  // Cancellation and loop control
  const isLoopCancelledRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  // File upload input refs
  const dottedFileInputRef = useRef<HTMLInputElement | null>(null);
  const coloredFileInputRef = useRef<HTMLInputElement | null>(null);
  const singleImageInputRef = useRef<HTMLInputElement | null>(null);

  // Virtual cursor state
  const [cursorState, setCursorState] = useState<VirtualCursorState>({
    x: 400,
    y: 240,
    isDrawing: false,
    color: '#18181B',
    brushType: 'pencil',
    tiltAngle: 28,
    pressure: 0.5,
    visible: false,
    toolName: 'Magic Stylus 🖋️',
  });

  // Track completed steps
  const [completedDrawSteps, setCompletedDrawSteps] = useState<Set<number>>(new Set());
  const [completedColorSteps, setCompletedColorSteps] = useState<Set<number>>(new Set());

  // Initialize Canvas Dimensions
  useEffect(() => {
    const c = canvasRef.current;
    const pig = pigmentCanvasRef.current;
    const hl = highlightCanvasRef.current;
    if (c && pig) {
      c.width = 800;
      c.height = 800;
      pig.width = 800;
      pig.height = 800;
    }
    if (hl) {
      hl.width = 800;
      hl.height = 800;
    }
  }, []);

  // Dotted guide image used when filming
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      guideImgRef.current = img;
    };
    img.src = assets.dottedGuideUrl;
  }, [assets.dottedGuideUrl]);

  // Animation loop: paints the cute stage background and the pulsing dotted-shape highlight
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = performance.now() / 1000;

      const box = stageBoxRef.current;
      const stage = stageCanvasRef.current;
      const state = makeSceneState(t);
      if (box && stage && state) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.max(2, Math.round(box.clientWidth * dpr));
        const H = Math.max(2, Math.round(box.clientHeight * dpr));
        if (stage.width !== W || stage.height !== H) {
          stage.width = W;
          stage.height = H;
        }
        const sctx = stage.getContext('2d');
        if (sctx) drawKidScene(sctx, W, H, state);
      }

      const hc = highlightCanvasRef.current;
      if (hc) {
        const hctx = hc.getContext('2d');
        if (hctx) {
          hctx.clearRect(0, 0, hc.width, hc.height);
          const hl = highlightRef.current;
          if (hl.mode !== 'off' && hl.paths.length) {
            hctx.save();
            hctx.lineCap = 'round';
            hctx.lineJoin = 'round';
            hctx.setLineDash([14, 12]);
            hctx.lineDashOffset = -t * 38;
            hctx.globalAlpha = hl.mode === 'preview' ? 0.65 + 0.35 * Math.sin(t * 6) : 0.35;
            hctx.strokeStyle = '#FF4F9A';
            hctx.lineWidth = hl.mode === 'preview' ? 11 : 8;
            hctx.shadowColor = '#FF8CC0';
            hctx.shadowBlur = 14;
            for (const d of hl.paths) hctx.stroke(new Path2D(d));
            hctx.restore();
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup speech & sound on unmount
  useEffect(() => {
    return () => {
      isLoopCancelledRef.current = true;
      isPlayingRef.current = false;
      englishVoiceEngine.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      soundEngine.stopRelaxingMusic();
      soundEngine.stopStroke();
    };
  }, []);

  /**
   * Narrator. Uses the studio voice (Gemini TTS through Web Audio), so it sounds warm AND is
   * captured inside the exported video. The promise resolves only when the line has finished.
   * Music is lowered while the narrator speaks, and the line is shown as a subtitle.
   */
  const NARRATOR_VOICE = 'Aoede';
  const speakCheer = useCallback(
    async (text: string): Promise<void> => {
      captionRef.current = text;
      const words = text.split(/\s+/).length;
      if (!enableVoice) {
        await new Promise(r => setTimeout(r, Math.max(1400, words * 330)));
        return;
      }
      soundEngine.duckMusic(true);
      try {
        await Promise.race([
          englishVoiceEngine.speak(text, {
            lang: lang === 'fr' ? 'fr-FR' : 'en-US',
            preferredVoiceName: NARRATOR_VOICE,
            rate: 1.0,
            pitch: 1.2,
          }),
          // safety net: never freeze the tutorial if audio is blocked
          new Promise(r => setTimeout(r, Math.max(7000, text.length * 170))),
        ]);
      } catch (err) {
        console.warn('Narrator error', err);
      } finally {
        soundEngine.duckMusic(false);
      }
    },
    [enableVoice, lang]
  );

  /**
   * Dreamy Pink Glitter Contour Celebration (Replaces text felicitation)
   * Outlines the completed area with a glowing pink glitter border and animated stars!
   */
  const triggerPinkGlitterContour = useCallback(
    async (step: KidDrawingStep | KidColoringStep) => {
      soundEngine.playFillSound(true, 'bubble_sparkle');
      soundEngine.playCelebrationChime(true);
      hapticsEngine.triggerSuccess(true);

      // Trace the REAL outline of the shape that was just drawn / colored (not a box around it)
      const contourPath =
        'paths' in step && step.paths.length > 0
          ? step.paths.map(p => p.d).join(' ')
          : 'fillPath' in step && step.fillPath
          ? step.fillPath
          : step.glitterContourPath || '';
      const center = step.glitterCenter || { x: 400, y: 400 };
      // Sparkles float just above the shape, so they never cover the face
      const boxNums = (step.glitterContourPath || '').match(/-?\d+(\.\d+)?/g);
      const top = boxNums && boxNums.length > 1 ? Number(boxNums[1]) : center.y - 60;

      setActiveGlitterContour({
        path: contourPath,
        center,
        top,
        id: step.id,
      });

      await new Promise(r => setTimeout(r, 1500));
      setActiveGlitterContour(null);
    },
    []
  );

  /**
   * Progressive drawing of an SVG path with the virtual pencil.
   * Moves like a human hand: starts gently, speeds up on straight parts, slows down in curves and
   * near the end, with tiny speed variations and a small hesitation before each stroke.
   * The pen is LIFTED between disjoint strokes, never dragged across empty paper.
   */
  const animateDrawPath = async (
    ctx: CanvasRenderingContext2D,
    pathString: string,
    strokeColor: string,
    strokeWidth: number,
    presetPoints?: { x: number; y: number }[]
  ) => {
    let subpathPointSets: { x: number; y: number }[][] = [];

    if (presetPoints && presetPoints.length >= 2) {
      subpathPointSets = [presetPoints];
    } else {
      const subpaths = splitSvgSubpaths(pathString);
      for (const sub of subpaths) {
        const pts = sampleSvgPath(sub, 50);
        if (pts.length >= 2) subpathPointSets.push(pts);
      }
    }

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const baseDelay = Math.max(6, 13 / speed);

    for (const points of subpathPointSets) {
      if (isLoopCancelledRef.current) break;
      if (points.length < 2) continue;

      // 1. Move the lifted pencil to the start, then hesitate for a moment like a real hand
      setCursorState(prev => ({
        ...prev,
        x: points[0].x,
        y: points[0].y,
        isDrawing: false,
        visible: true,
        color: strokeColor,
      }));
      await wait(260 + Math.random() * 180);

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      soundEngine.startStroke('pencil', true);

      // 2. Draw along the points with natural speed changes
      const n = points.length;
      for (let i = 1; i < n; i++) {
        if (isLoopCancelledRef.current) break;
        const pPrev = points[i - 1];
        const pCurr = points[i];

        // If distance between points > 22px, the pencil must never drag across air: lift it
        const dist = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
        if (dist > 22) {
          setCursorState(prev => ({ ...prev, x: pCurr.x, y: pCurr.y, isDrawing: false }));
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(pPrev.x, pPrev.y);
        ctx.lineTo(pCurr.x, pCurr.y);
        ctx.stroke();

        // Pressure & speed: slow at both ends of the stroke, slower in tight curves, tiny jitter
        const t = i / (n - 1);
        const edge = Math.min(t, 1 - t);
        const easeEnds = 1 + 1.8 * Math.max(0, 1 - edge / 0.12);
        const a = points[Math.max(0, i - 3)];
        const c = points[Math.min(n - 1, i + 3)];
        const a1 = Math.atan2(pCurr.y - a.y, pCurr.x - a.x);
        const a2 = Math.atan2(c.y - pCurr.y, c.x - pCurr.x);
        let turn = Math.abs(a2 - a1);
        if (turn > Math.PI) turn = 2 * Math.PI - turn;
        const curve = 1 + Math.min(1.2, turn * 1.3);
        const jitter = 0.85 + Math.random() * 0.3;
        const delay = baseDelay * easeEnds * curve * jitter;

        setCursorState(prev => ({
          ...prev,
          x: pCurr.x,
          y: pCurr.y,
          isDrawing: true,
          pressure: Math.min(0.85, 0.42 + 0.4 * Math.sin(Math.PI * t)),
        }));

        await wait(delay);
      }

      soundEngine.stopStroke();
      setCursorState(prev => ({ ...prev, isDrawing: false }));
      // pencil lifts, tiny breath before the next stroke
      await wait(140 + Math.random() * 160);
    }
  };

  /**
   * Progressive Felt-tip Marker Color Filling Area-by-Area
   * Clamped with Path2D clipping mask to guarantee zero bleeding into neighboring regions!
   */
  const animateColorStep = async (
    pigCtx: CanvasRenderingContext2D,
    colorStep: KidColoringStep
  ) => {
    soundEngine.playFillSound(true, 'fairy_dust');

    const fillPath = new Path2D(colorStep.fillPath);

    pigCtx.save();
    pigCtx.clip(fillPath);

    const seed = colorStep.regionSeed;
    const startRadius = 15;
    const maxRadius = 320;
    const stepsCount = 18;

    for (let step = 1; step <= stepsCount; step++) {
      if (isLoopCancelledRef.current) break;

      const progress = step / stepsCount;
      const currentRadius = startRadius + (maxRadius - startRadius) * progress;

      pigCtx.save();
      pigCtx.fillStyle = colorStep.colorHex;
      pigCtx.globalAlpha = 0.22;

      pigCtx.beginPath();
      pigCtx.arc(seed.x, seed.y, currentRadius, 0, Math.PI * 2);
      pigCtx.fill();

      pigCtx.beginPath();
      pigCtx.arc(
        seed.x + (Math.sin(step) * 12),
        seed.y + (Math.cos(step) * 12),
        currentRadius * 0.95,
        0,
        Math.PI * 2
      );
      pigCtx.fill();
      pigCtx.restore();

      const cursorAngle = step * 0.9;
      const curX = seed.x + Math.cos(cursorAngle) * Math.min(currentRadius * 0.7, 120);
      const curY = seed.y + Math.sin(cursorAngle) * Math.min(currentRadius * 0.7, 120);

      setCursorState(prev => ({
        ...prev,
        x: curX,
        y: curY,
        isDrawing: true,
        visible: true,
        color: colorStep.colorHex,
        toolName: 'Felt Marker 🖍️',
      }));

      const stepDelay = Math.max(25, Math.round(75 / speed));
      await new Promise(r => setTimeout(r, stepDelay));
    }

    // Final clean solid coat strictly inside clip
    pigCtx.fillStyle = colorStep.colorHex;
    pigCtx.globalAlpha = 1.0;
    pigCtx.fill(fillPath);
    pigCtx.restore();

    setCursorState(prev => ({ ...prev, isDrawing: false }));
  };

  /**
   * Reset all canvases
   */
  const resetAllCanvases = () => {
    const canvas = canvasRef.current;
    const pigCanvas = pigmentCanvasRef.current;
    if (canvas && pigCanvas) {
      const ctx = canvas.getContext('2d');
      const pigCtx = pigCanvas.getContext('2d');
      if (ctx && pigCtx) {
        ctx.clearRect(0, 0, 800, 800);
        pigCtx.clearRect(0, 0, 800, 800);
      }
    }
    setCompletedDrawSteps(new Set());
    setCompletedColorSteps(new Set());
    setCurrentStepIndex(0);
    setCurrentColorStepIndex(0);
    setActiveGlitterContour(null);
    setActiveSpellingIndex(null);
    setIsWordSpellingGlow(false);
  };

  /**
   * Run the whole step-by-step tutorial sequence
   * Strictly adheres to the user-ordered drawingSteps and dynamic coloringSteps!
   */
  const runAutoStepSequence = async () => {
    if (isPlayingRef.current) {
      stopAll();
      await new Promise(r => setTimeout(r, 200));
    }

    await prepareVoice();
    resetAllCanvases();
    isLoopCancelledRef.current = false;
    setIsPlaying(true);
    isPlayingRef.current = true;

    if (enableMusic) {
      soundEngine.startRelaxingMusic('music_box');
    }

    const canvas = canvasRef.current;
    const pigCanvas = pigmentCanvasRef.current;
    if (!canvas || !pigCanvas) return;
    const ctx = canvas.getContext('2d');
    const pigCtx = pigCanvas.getContext('2d');
    if (!ctx || !pigCtx) return;

    // ==========================================
    // PHASE 1: STEP-BY-STEP DRAWING
    // Follows drawingSteps in the EXACT order customized by the artist!
    // ==========================================
    setCurrentPhase('draw');

    // Narration script: varied, story-like lines (not the same slogan every time)
    const script = buildTutorialScript(drawingSteps, coloringSteps, lang, lang === 'fr' ? 'petit ami' : 'friend');
    activeColorRef.current = null;
    highlightRef.current = { paths: [], mode: 'off' };
    await speakCheer(script.welcome);
    await new Promise(r => setTimeout(r, 400));

    for (let sIdx = 0; sIdx < drawingSteps.length; sIdx++) {
      if (isLoopCancelledRef.current) break;
      setCurrentStepIndex(sIdx);
      const step = drawingSteps[sIdx];

      const lines = script.draw[sIdx];

      // 1. The dotted shape lights up (pulsing) while the narrator explains what comes next
      highlightRef.current = { paths: step.paths.map(p => p.d), mode: 'preview' };
      await speakCheer(lines.intro);
      if (isLoopCancelledRef.current) break;
      await new Promise(r => setTimeout(r, 450));

      // 2. The pencil follows the dots (voice is quiet, pencil sound only)
      highlightRef.current = { paths: step.paths.map(p => p.d), mode: 'drawing' };
      captionRef.current = '';
      for (const p of step.paths) {
        if (isLoopCancelledRef.current) break;
        await animateDrawPath(ctx, p.d, step.strokeColor, step.strokeWidth, p.points);
      }
      highlightRef.current = { paths: [], mode: 'off' };

      if (isLoopCancelledRef.current) break;

      // 3. Little celebration: glitter outline + a short reaction from the narrator
      setCompletedDrawSteps(prev => new Set([...prev, sIdx]));
      await Promise.all([triggerPinkGlitterContour(step), speakCheer(lines.outro)]);

      await new Promise(r => setTimeout(r, 350));
    }

    if (isLoopCancelledRef.current) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    // DRAWING FINISHED CHEER
    await speakCheer(script.drawDone);
    await new Promise(r => setTimeout(r, 450));

    // ==========================================
    // PHASE 2: AREA-BY-AREA COLORING
    // Uses the dynamic coloringSteps extracted from the colored character!
    // ==========================================
    setCurrentPhase('color');

    for (let cIdx = 0; cIdx < coloringSteps.length; cIdx++) {
      if (isLoopCancelledRef.current) break;
      setCurrentColorStepIndex(cIdx);
      const colorStep = coloringSteps[cIdx];

      const colorLines = script.color[cIdx];
      activeColorRef.current = colorStep.colorHex; // its pencil lifts up in the tray

      // The area to color pulses while the narrator names the color
      highlightRef.current = { paths: [colorStep.fillPath], mode: 'preview' };
      await speakCheer(colorLines.intro);
      if (isLoopCancelledRef.current) break;
      await new Promise(r => setTimeout(r, 300));

      // Animate progressive felt marker filling
      highlightRef.current = { paths: [], mode: 'off' };
      captionRef.current = '';
      await animateColorStep(pigCtx, colorStep);

      if (isLoopCancelledRef.current) break;

      setCompletedColorSteps(prev => new Set([...prev, cIdx]));
      await Promise.all([triggerPinkGlitterContour(colorStep), speakCheer(colorLines.outro)]);

      await new Promise(r => setTimeout(r, 300));
    }
    activeColorRef.current = null;

    if (isLoopCancelledRef.current) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    // ==========================================
    // PHASE 3: SPELLING REPETITION WITH GLOWING LETTERS!
    // ==========================================
    setCurrentPhase('spelling');

    const spellingLetters = lang === 'fr' ? BEE_SPELLING_FR : BEE_SPELLING_EN;

    await speakCheer(script.spellIntro);
    await new Promise(r => setTimeout(r, 300));

    for (let lIdx = 0; lIdx < spellingLetters.length; lIdx++) {
      if (isLoopCancelledRef.current) break;
      setActiveSpellingIndex(lIdx);
      const letter = spellingLetters[lIdx];

      soundEngine.playFillSound(true, 'bubble_sparkle');
      hapticsEngine.triggerTap(true);

      const letterSound = lang === 'fr' ? letter.soundFr : letter.soundEn;
      await speakCheer(letterSound);

      await new Promise(r => setTimeout(r, 250));
    }

    if (isLoopCancelledRef.current) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    // ENTIRE WORD GLOWS TOGETHER
    setActiveSpellingIndex(null);
    setIsWordSpellingGlow(true);
    soundEngine.playCelebrationChime(true);
    soundEngine.playFillSound(true, 'bubble_sparkle');

    await speakCheer(script.spellDone);

    await new Promise(r => setTimeout(r, 1200));
    setIsWordSpellingGlow(false);
    captionRef.current = '';
    setCurrentPhase('finished');
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCursorState(prev => ({ ...prev, visible: false }));

    // Stop recording if active. (Uses the recorder itself, not React state: this function was created
    // BEFORE `isRecording` turned true, so the state value here is stale and the film was never finalized.)
    if (recorderRef.current && recorderRef.current.getIsRecording()) {
      try {
        soundEngine.playCelebrationChime(true);
        await new Promise(r => setTimeout(r, 2500)); // hold the final "All done!" frame
        const result = await recorderRef.current.stop();
        setRecordedResult(result);
        setIsRecording(false);
        recorderRef.current = null;
      } catch (e) {
        console.error('Error stopping video recording', e);
        setIsRecording(false);
      }
    }
  };

  /**
   * Downloads every narrator line before the tutorial/video starts, so there are no silent gaps
   * and the (recorded) voice is already in memory.
   */
  const prepareVoice = async () => {
    if (!enableVoice) return;
    setIsPreparingVoice(true);
    try {
      const script = buildTutorialScript(drawingSteps, coloringSteps, lang, lang === 'fr' ? 'petit ami' : 'friend');
      await englishVoiceEngine.prefetchLines(
        script.all,
        NARRATOR_VOICE,
        lang === 'fr' ? 'fr-FR' : 'en-US',
        (done, total) => setVoiceProgress({ done, total })
      );
    } catch (err) {
      console.warn('Voice preparation warning', err);
    } finally {
      setIsPreparingVoice(false);
      setVoiceProgress(null);
    }
  };

  /**
   * PRIMARY ACTION 2: "RECORD TUTO"
   * The film = the cute kids scene + paper with dotted guide, pencil cursor, glitter and subtitles.
   */
  const startRecordingVideo = async () => {
    const canvas = canvasRef.current;
    const pigCanvas = pigmentCanvasRef.current;
    if (!canvas || !pigCanvas) return;

    setRecordedResult(null);
    await prepareVoice();

    setIsRecording(true);

    const compCanvas = document.createElement('canvas');
    compCanvas.width = 800;
    compCanvas.height = 800;

    const recorder = new StudioVideoRecorder({
      sourceCanvas: compCanvas,
      aspectRatio: videoAspectRatio,
      resolution: videoResolution,
      includeAudio: true,
      watermarkText: '🌸 Kawaii Kids Art Studio',
      showWatermark: false,
      includeCursor: false,
      sceneRenderer: (ctx, cw, ch) => renderVideoFrame(ctx, cw, ch),
    });
    recorderRef.current = recorder;

    try {
      await recorder.start();
      await runAutoStepSequence();
    } catch (err) {
      console.error('Recording initialization error', err);
      setIsRecording(false);
    }
  };

  /**
   * PRIMARY ACTION 3: "STOP"
   */
  const stopAll = () => {
    isLoopCancelledRef.current = true;
    isPlayingRef.current = false;
    setIsPlaying(false);

    englishVoiceEngine.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    soundEngine.duckMusic(false);
    soundEngine.stopRelaxingMusic();
    soundEngine.stopStroke();
    highlightRef.current = { paths: [], mode: 'off' };
    captionRef.current = '';
    activeColorRef.current = null;

    if (recorderRef.current && recorderRef.current.getIsRecording()) {
      recorderRef.current
        .stop()
        .then(result => {
          setRecordedResult(result);
          setIsRecording(false);
        })
        .catch(() => setIsRecording(false));
    }

    setCursorState(prev => ({ ...prev, visible: false }));
    setActiveGlitterContour(null);
  };

  /**
   * SINGLE-IMAGE AUTOMATIC PIPELINE:
   * When user uploads ONE fully colored character image:
   * 1. Extracts clean B&W outlines
   * 2. Generates dotted drawing guide
   * 3. Proposes logical drawing order
   * 4. Extracts enclosed coloring regions & sampled colors
   * 5. Opens Validation & Preview Step before animation!
   */
  const processUploadedColoredImage = async (file: File) => {
    setIsProcessingSingleImage(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const processed = await processColoredCharacterImage(dataUrl);

      // Clear previous canvas paint so ONLY the new clean dotted guide is shown!
      resetAllCanvases();
      setDottedOpacity(0.95);

      setAssets(prev => ({
        ...prev,
        coloredReferenceUrl: processed.originalColoredUrl,
        bwReferenceUrl: processed.bwOutlineUrl,
        dottedGuideUrl: processed.dottedGuideUrl,
      }));

      setDrawingSteps(processed.drawingSteps);
      setColoringSteps(processed.coloringSteps);
      setValidationReport(processed.validation);
      setIsValidatingWorkflow(true);

      soundEngine.playCelebrationChime(true);
    } catch (err) {
      console.error('Error processing single colored character:', err);
    } finally {
      setIsProcessingSingleImage(false);
    }
  };

  // Upload handlers
  const handleUploadColored = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedColoredImage(file);
  };

  const handleUploadDotted = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      setIsAnalyzingDotted(true);
      try {
        const content = await file.text();
        const url = URL.createObjectURL(file);
        resetAllCanvases();
        setDottedOpacity(0.95);
        setAssets(prev => ({
          ...prev,
          dottedGuideUrl: url,
        }));

        const extractedSteps = await analyzeAnyDottedDrawing(content, KID_SIDE_BEE_DRAWING_STEPS);
        if (extractedSteps && extractedSteps.length > 0) {
          setDrawingSteps(extractedSteps);
          soundEngine.playCelebrationChime(true);
        }
      } catch (err) {
        console.error('Error analyzing uploaded dotted guide:', err);
      } finally {
        setIsAnalyzingDotted(false);
      }
    } else {
      // For bitmap drawings, remove colors and extract clean dotted guide!
      processUploadedColoredImage(file);
    }
  };

  const handleReanalyzeDotted = async () => {
    setIsAnalyzingDotted(true);
    try {
      const extractedSteps = await analyzeAnyDottedDrawing(assets.dottedGuideUrl, KID_SIDE_BEE_DRAWING_STEPS);
      if (extractedSteps && extractedSteps.length > 0) {
        setDrawingSteps(extractedSteps);
        soundEngine.playCelebrationChime(true);
      }
    } catch (err) {
      console.warn('Re-analyze failed:', err);
    } finally {
      setIsAnalyzingDotted(false);
    }
  };

  // Step reordering methods
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= drawingSteps.length) return;

    const newSteps = [...drawingSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    const reindexed = newSteps.map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
      totalSteps: newSteps.length,
    }));
    setDrawingSteps(reindexed);
    soundEngine.playFillSound(true, 'bubble_sparkle');
  };

  const previewStep = async (step: KidDrawingStep) => {
    setPreviewingStepId(step.id);
    await triggerPinkGlitterContour(step);
    if (enableVoice) {
      await speakCheer(lang === 'fr' ? step.instructionFr : step.instructionEn);
    }
    setPreviewingStepId(null);
  };

  const updateStepInstruction = (index: number, newText: string) => {
    setDrawingSteps(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        instructionEn: newText,
        instructionFr: newText,
      };
      return copy;
    });
  };

  const resetStepsToDefault = () => {
    setDrawingSteps(KID_SIDE_BEE_DRAWING_STEPS);
    setColoringSteps(KID_SIDE_BEE_COLORING_STEPS);
    soundEngine.playFillSound(true, 'fairy_dust');
  };

  const currentStep = drawingSteps[currentStepIndex] || drawingSteps[0];
  const currentColorStep = coloringSteps[currentColorStepIndex] || coloringSteps[0];
  const spellingLetters = lang === 'fr' ? BEE_SPELLING_FR : BEE_SPELLING_EN;

  // ---------------------------------------------------------------------------------------
  // Cute scene state (shared by the live stage and the exported video)
  // ---------------------------------------------------------------------------------------
  const uniquePalette = (hexes: string[]): string[] => {
    const toRgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const out: string[] = [];
    for (const hex of hexes) {
      const c = toRgb(hex);
      if (!out.some(o => {
        const d = toRgb(o);
        return Math.abs(c[0] - d[0]) + Math.abs(c[1] - d[1]) + Math.abs(c[2] - d[2]) < 90;
      })) out.push(hex);
    }
    return out.slice(0, 8);
  };
  const nearestHex = (palette: string[], hex: string | null): string | null => {
    if (!hex || palette.length === 0) return null;
    const toRgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const c = toRgb(hex);
    let best = palette[0];
    let bd = Infinity;
    for (const p of palette) {
      const d = toRgb(p);
      const dist = Math.abs(c[0] - d[0]) + Math.abs(c[1] - d[1]) + Math.abs(c[2] - d[2]);
      if (dist < bd) { bd = dist; best = p; }
    }
    return best;
  };

  const makeSceneState = (t: number): SceneState | null => {
    const live = liveRef.current;
    if (!live) return null;
    return {
      t,
      phase: live.phase,
      title: live.title,
      emoji: live.emoji,
      stepText: live.stepText,
      caption: captionRef.current,
      progressTotal: live.progressTotal,
      progressDone: live.progressDone,
      palette: live.palette,
      activeColor: nearestHex(live.palette, activeColorRef.current),
    };
  };

  /** One frame of the exported video: scene + paper (guide, highlight, paint, lines) + pencil + glitter + letters */
  const renderVideoFrame = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    const live = liveRef.current;
    const sceneState = makeSceneState(performance.now() / 1000);
    if (!live || !sceneState) return;
    const paper = drawKidScene(ctx, cw, ch, sceneState);
    const sc = paper.w / 800;
    const u = Math.min(cw, ch) / 1080;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(paper.x, paper.y, paper.w, paper.h, 26 * u);
    ctx.clip();

    // 1. faint dotted guide (always visible, so viewers can see where the pen will go)
    const g = guideImgRef.current;
    if (g && g.complete && g.naturalWidth) {
      const k = Math.min(paper.w / g.naturalWidth, paper.h / g.naturalHeight);
      const gw = g.naturalWidth * k;
      const gh = g.naturalHeight * k;
      ctx.globalAlpha = live.dottedOpacity;
      ctx.drawImage(g, paper.x + (paper.w - gw) / 2, paper.y + (paper.h - gh) / 2, gw, gh);
      ctx.globalAlpha = 1;
    }
    // 2. pulsing highlight of the current shape, 3. colors, 4. pencil lines
    for (const layer of [highlightCanvasRef.current, pigmentCanvasRef.current, canvasRef.current]) {
      if (layer) ctx.drawImage(layer, paper.x, paper.y, paper.w, paper.h);
    }

    // 5. pink glitter outline when a shape is finished
    const gl = glitterRef.current;
    if (gl) {
      ctx.save();
      ctx.translate(paper.x, paper.y);
      ctx.scale(sc, sc);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#FF69B4';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#FF69B4';
      ctx.lineWidth = 8;
      ctx.setLineDash([16, 10]);
      ctx.stroke(new Path2D(gl.path));
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.stroke(new Path2D(gl.path));
      ctx.setLineDash([]);
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('✨💖✨', gl.center.x, Math.max(56, gl.top - 6));
      ctx.restore();
    }

    // 6. spelling letters
    if (live.phase === 'spelling' || live.phase === 'finished') {
      const chars = live.spelling.chars;
      const tile = 78 * sc;
      const gap = 14 * sc;
      const totalW = chars.length * tile + (chars.length - 1) * gap;
      const x0 = paper.x + (paper.w - totalW) / 2;
      const y0 = paper.y + paper.h - tile - 26 * sc;
      chars.forEach((chr, i) => {
        const glowing = live.spelling.active === i || live.spelling.all;
        ctx.save();
        ctx.fillStyle = glowing ? '#FBBF24' : 'rgba(254, 243, 199, 0.95)';
        if (glowing) { ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 24; }
        ctx.beginPath();
        ctx.roundRect(x0 + i * (tile + gap), y0 - (glowing ? 10 * sc : 0), tile, tile, 18 * sc);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#78350F';
        ctx.font = `900 ${44 * sc}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chr, x0 + i * (tile + gap) + tile / 2, y0 + tile / 2 - (glowing ? 10 * sc : 0));
      });
    }

    // 7. the pencil "hand"
    const cur = cursorRef.current;
    if (cur && cur.visible) {
      drawPencilCursor(ctx, paper.x + cur.x * sc, paper.y + cur.y * sc, cur.color, 46 * sc, cur.isDrawing);
    }
    ctx.restore();
  };

  // Keep the shared refs up to date on every render
  {
    const live = currentPhase;
    const isDraw = live === 'draw';
    const isColor = live === 'color';
    const total = isColor ? coloringSteps.length : drawingSteps.length;
    liveRef.current = {
      phase: currentPhase,
      title:
        live === 'color'
          ? lang === 'fr' ? 'On colorie !' : "Let's color!"
          : live === 'spelling'
          ? lang === 'fr' ? 'On épelle !' : "Let's spell!"
          : live === 'finished'
          ? lang === 'fr' ? 'Bravo !' : 'All done!'
          : lang === 'fr' ? 'Dessine avec moi !' : 'Draw with me!',
      emoji: isDraw ? currentStep?.emoji || '🐝' : isColor ? '🎨' : live === 'spelling' ? '🔤' : live === 'finished' ? '🎉' : '🐝',
      stepText: isDraw
        ? `${lang === 'fr' ? 'Étape' : 'Step'} ${currentStepIndex + 1} ${lang === 'fr' ? 'sur' : 'of'} ${drawingSteps.length} · ${
            lang === 'fr' ? currentStep?.partName : currentStep?.partNameEn
          }`
        : isColor
        ? `${lang === 'fr' ? 'Coloriage' : 'Coloring'} ${currentColorStepIndex + 1} ${lang === 'fr' ? 'sur' : 'of'} ${coloringSteps.length}`
        : '',
      progressTotal: total,
      progressDone: isDraw ? completedDrawSteps.size : isColor ? completedColorSteps.size : live === 'idle' ? 0 : total,
      palette: uniquePalette(coloringSteps.map(c => c.colorHex)),
      dottedOpacity,
      spelling: { chars: spellingLetters.map(l => l.char), active: activeSpellingIndex, all: isWordSpellingGlow },
    };
    cursorRef.current = cursorState;
    glitterRef.current = activeGlitterContour;
  }

  // Stage geometry follows the chosen video format (what you see = what you film)
  const stageNominal = videoAspectRatio === '16:9' ? { w: 1920, h: 1080 } : videoAspectRatio === '9:16' ? { w: 1080, h: 1920 } : { w: 1080, h: 1080 };
  const paperRect = getPaperRect(stageNominal.w, stageNominal.h);
  const stageMax = videoAspectRatio === '16:9' ? 'max-w-[980px]' : videoAspectRatio === '9:16' ? 'max-w-[400px]' : 'max-w-[620px]';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 text-slate-800 flex flex-col relative select-none">
      {/* Hidden file inputs */}
      <input
        ref={dottedFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadDotted}
      />
      <input
        ref={coloredFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadColored}
      />
      <input
        ref={singleImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadColored}
      />

      {/* Top Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-amber-200/60 shadow-sm sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-md shadow-amber-300/40 text-2xl animate-bounce">
              🐝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-amber-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                  Kawaii Drawing & Coloring Studio
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  1-Image Auto Workflow ✨
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Upload 1 colored character • Auto outlines & dotted guide • Smooth pen drawing & clean coloring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(l => (l === 'fr' ? 'en' : 'fr'))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold shadow-sm flex items-center gap-1 text-slate-700 active:scale-95 transition-all"
              title="Change Voice Language"
            >
              {lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English (Joyful for Kids)'}
            </button>

            {/* Voice Cheer Toggle */}
            <button
              onClick={() => setEnableVoice(v => !v)}
              className={`p-2 rounded-xl border text-xs font-bold shadow-sm transition-all active:scale-95 ${
                enableVoice
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
              title="Joyful child teacher voice"
            >
              {enableVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Background Music Toggle */}
            <button
              onClick={() => {
                const next = !enableMusic;
                setEnableMusic(next);
                if (next) soundEngine.startRelaxingMusic('music_box');
                else soundEngine.stopRelaxingMusic();
              }}
              className={`p-2 rounded-xl border text-xs font-bold shadow-sm transition-all active:scale-95 ${
                enableMusic
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
              title="Music box melody"
            >
              <Music className="w-4 h-4" />
            </button>

            {(onClose || onBackToStudio) && (
              <button
                onClick={onClose || onBackToStudio}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Back to Studio / Home"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* PRIMARY 3 CONTROL BUTTONS + VALIDATION & REORDER */}
      <div className="bg-white/95 backdrop-blur border-b border-amber-200 py-3 px-4 sticky top-[73px] z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* BUTTON 1: LANCE LE TUTO */}
            <button
              onClick={runAutoStepSequence}
              disabled={isRecording}
              className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                isPlaying && !isRecording
                  ? 'bg-amber-600 text-white ring-4 ring-amber-300 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-600 hover:to-yellow-500 text-slate-900 shadow-amber-300/60'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isPlaying && !isRecording ? 'Drawing in progress...' : '🚀 Lance le tuto'}</span>
            </button>

            {/* BUTTON 2: RECORD TUTO (Generates video file) */}
            <button
              onClick={startRecordingVideo}
              disabled={isPlaying}
              className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                isRecording
                  ? 'bg-rose-600 text-white ring-4 ring-rose-300 animate-pulse'
                  : 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:opacity-95 text-white shadow-rose-300/60'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{isRecording ? 'Recording video...' : '🎥 Record tuto'}</span>
            </button>

            {/* BUTTON 3: STOP */}
            <button
              onClick={stopAll}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm border border-slate-300 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>⏹️ Stop</span>
            </button>

            {/* BUTTON 4: VALIDATION & PREVIEW MODAL */}
            <button
              onClick={() => setIsValidatingWorkflow(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-sm border border-emerald-300 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
              title="Review outlines, dotted guide, and proposed steps before animating"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>🔍 Validate & Preview</span>
            </button>

            {/* BUTTON 5: REORDER DRAWING STEPS */}
            <button
              onClick={() => setIsReorderModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-sm border border-indigo-200 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
              title="You are the artist! Reorder and customize drawing sequence"
            >
              <ListOrdered className="w-4 h-4" />
              <span>🧩 Reorder Steps ({drawingSteps.length})</span>
            </button>
          </div>

          {/* Quick status & speed selector */}
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="px-2 text-slate-500">Speed:</span>
              {[0.8, 1.1, 1.6].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    speed === s ? 'bg-amber-500 text-white shadow-sm' : 'hover:bg-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Video Aspect Ratio Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setVideoAspectRatio('16:9')}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                  videoAspectRatio === '16:9' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                16:9 (YouTube)
              </button>
              <button
                onClick={() => setVideoAspectRatio('9:16')}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                  videoAspectRatio === '9:16' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                9:16 (Shorts/TikTok)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">
        {/* LEFT COLUMN: 1-IMAGE WORKFLOW & REFERENCES */}
        <div className="w-full lg:w-[285px] shrink-0 flex flex-col gap-4">
          {/* 1-CLICK UPLOAD HERO CARD */}
          <div className="bg-gradient-to-br from-amber-500 to-rose-500 text-white p-4 rounded-3xl shadow-lg flex flex-col gap-2.5 relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-200" />
                <h3 className="font-black text-sm">1-Click Auto Character</h3>
              </div>
              <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">New</span>
            </div>
            <p className="text-[11px] text-white/90 leading-relaxed z-10">
              Upload only <strong>one fully colored image</strong>. The studio automatically extracts clean outlines, builds the dotted guide, and maps the colors!
            </p>
            <button
              onClick={() => singleImageInputRef.current?.click()}
              disabled={isProcessingSingleImage}
              className="mt-1 w-full py-2.5 px-4 bg-white hover:bg-amber-50 text-slate-900 font-extrabold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all z-10"
            >
              {isProcessingSingleImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                  <span>Analyzing Character...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-rose-500" />
                  <span>Upload Colored Character</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-sm border border-amber-200">
            <h2 className="font-black text-slate-800 text-sm flex items-center justify-between mb-2">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Character References
              </span>
            </h2>

            {/* Quick Character Preset Selector */}
            <div className="flex items-center gap-1 mb-3 bg-amber-50 border border-amber-200 p-1 rounded-xl">
              {PRESET_DRAWING_ASSETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    stopAll();
                    setAssets(preset);
                    setDrawingSteps(KID_SIDE_BEE_DRAWING_STEPS);
                    setColoringSteps(KID_SIDE_BEE_COLORING_STEPS);
                    resetAllCanvases();
                  }}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black transition-all ${
                    assets.id === preset.id
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-amber-900 hover:bg-amber-100'
                  }`}
                  title={preset.name}
                >
                  {preset.id === 'kawaii-side-bee' ? '🐝 Side-View Bee (Reference)' : '🐝 Front-View Bee'}
                </button>
              ))}
            </div>

            {/* RUBRIQUE 1: DOTTED DRAWING */}
            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 flex flex-col gap-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  1. Dotted Guide (Generated)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => dottedFileInputRef.current?.click()}
                    className="p-1 px-2 text-[10px] font-bold rounded-lg bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 flex items-center gap-1 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Replace
                  </button>
                  <button
                    onClick={handleReanalyzeDotted}
                    disabled={isAnalyzingDotted}
                    className="p-1 px-2 text-[10px] font-bold rounded-lg bg-amber-200 text-amber-900 hover:bg-amber-300 flex items-center gap-1 transition-colors"
                    title="Extract exact paths matching the dots"
                  >
                    <Wand2 className={`w-3 h-3 ${isAnalyzingDotted ? 'animate-spin' : ''}`} />
                    Analyze
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white border border-amber-200 overflow-hidden flex items-center justify-center p-1 shadow-inner relative">
                  <img
                    src={assets.dottedGuideUrl}
                    alt="Dotted Bee Guide"
                    className="w-full h-full object-contain"
                  />
                  {isAnalyzingDotted && (
                    <div className="absolute inset-0 bg-amber-500/30 backdrop-blur-[1px] flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 flex-1">
                  <p className="font-bold text-slate-700">Aligned to Character Contours</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Dots follow actual lines without guessing or jumping.
                  </p>
                </div>
              </div>

              {/* Dotted Opacity */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 pt-1 border-t border-amber-200/50">
                <span>Guide Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={dottedOpacity}
                  onChange={e => setDottedOpacity(parseFloat(e.target.value))}
                  className="w-20 accent-amber-500"
                />
              </div>
            </div>

            {/* RUBRIQUE 2: COLORED VERSION */}
            <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  2. Colored Reference Image
                </span>
                <button
                  onClick={() => coloredFileInputRef.current?.click()}
                  className="p-1 px-2 text-[10px] font-bold rounded-lg bg-white border border-rose-200 text-rose-800 hover:bg-rose-100 flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white border border-rose-200 overflow-hidden flex items-center justify-center p-1 shadow-inner">
                  <img
                    src={assets.coloredReferenceUrl}
                    alt="Modèle colorié"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-slate-600 flex-1">
                  <p className="font-bold text-slate-700">Source of Outlines & Palette</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Colors sampled directly from character regions.
                  </p>
                </div>
              </div>

              {/* Extracted Palette Badges */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-200/50">
                <span className="text-slate-500">Palette:</span>
                <div className="flex items-center gap-1.5">
                  {coloringSteps.map(c => (
                    <span
                      key={c.id}
                      className="w-4 h-4 rounded-full border border-black/15 shadow-xs"
                      style={{ backgroundColor: c.colorHex }}
                      title={c.partNameEn}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* STEP REORDER & ORGANIZER SUMMARY */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{drawingSteps.length} Steps Ready (Reorderable)</span>
              </div>
              <button
                onClick={() => setIsReorderModalOpen(true)}
                className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Reorder
              </button>
            </div>

            <div className="space-y-1.5">
              {drawingSteps.map((s, idx) => {
                const isCompleted = completedDrawSteps.has(idx);
                const isCurrent = currentPhase === 'draw' && currentStepIndex === idx;
                return (
                  <div
                    key={s.id}
                    className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                      <span className="w-5 text-center text-xs text-slate-400 font-extrabold">{idx + 1}</span>
                      <span>{s.emoji}</span>
                      <span className="truncate">
                        {lang === 'fr' ? s.partName : s.partNameEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStep(idx, 'up')}
                        disabled={idx === 0 || isPlaying}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-600"
                        title="Move step up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveStep(idx, 'down')}
                        disabled={idx === drawingSteps.length - 1 || isPlaying}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-600"
                        title="Move step down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => previewStep(s)}
                        className="p-1 rounded hover:bg-pink-100 text-rose-500"
                        title="Preview on canvas with pink glitter"
                      >
                        <Eye className="w-3 h-3" />
                      </button>

                      {isCompleted && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: DRAWING CANVAS WITH GLITTER CONTOUR OVERLAY & VIRTUAL PEN */}
        <div className="flex flex-col items-center flex-1 min-w-0 w-full">
          {/* Active Voice Prompt Indicator */}
          <div className={`w-full ${stageMax} mb-3 bg-white/95 rounded-2xl p-3 shadow-sm border border-amber-200 flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">
                {currentPhase === 'draw'
                  ? currentStep?.emoji || '🟡'
                  : currentPhase === 'color'
                  ? currentColorStep?.emoji || '🎨'
                  : '🐝'}
              </span>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  {currentPhase === 'draw'
                    ? `Step ${currentStep?.stepNumber || 1} of ${drawingSteps.length}`
                    : currentPhase === 'color'
                    ? `Coloring ${currentColorStep?.stepNumber || 1} of ${coloringSteps.length}`
                    : currentPhase === 'spelling'
                    ? "Let's spell!"
                    : 'All Done! 🎉'}
                </span>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                  {currentPhase === 'draw'
                    ? lang === 'fr'
                      ? currentStep?.instructionFr
                      : currentStep?.instructionEn
                    : currentPhase === 'color'
                    ? lang === 'fr'
                      ? currentColorStep?.instructionFr
                      : currentColorStep?.instructionEn
                    : currentPhase === 'spelling'
                    ? lang === 'fr'
                      ? 'Répétons chaque lettre qui s’illumine !'
                      : 'Repeat each letter as it glows!'
                    : lang === 'fr'
                    ? 'Bravo champion artistique !'
                    : 'You are an awesome artist!'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const text =
                  currentPhase === 'draw'
                    ? lang === 'fr'
                      ? currentStep?.instructionFr
                      : currentStep?.instructionEn
                    : lang === 'fr'
                    ? currentColorStep?.instructionFr
                    : currentColorStep?.instructionEn;
                if (text) speakCheer(text);
              }}
              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
              title="Repeat joyful voice"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* CUTE STAGE: pastel scene (pencils, clouds, stars...) around the paper = exactly what the video shows */}
          <div
            ref={stageBoxRef}
            className={`relative w-full ${stageMax} rounded-3xl overflow-hidden shadow-xl`}
            style={{ aspectRatio: `${stageNominal.w} / ${stageNominal.h}` }}
          >
            <canvas ref={stageCanvasRef} className="absolute inset-0 w-full h-full" />

          {/* Interactive Canvas Container (the paper) */}
          <div
            ref={containerRef}
            className="absolute overflow-hidden flex items-center justify-center touch-none select-none"
            style={{
              left: `${(paperRect.x / stageNominal.w) * 100}%`,
              top: `${(paperRect.y / stageNominal.h) * 100}%`,
              width: `${(paperRect.w / stageNominal.w) * 100}%`,
              height: `${(paperRect.h / stageNominal.h) * 100}%`,
              borderRadius: '2.4%',
            }}
          >
            {/* 1. Underlying Dotted Guide Image */}
            <img
              src={assets.dottedGuideUrl}
              alt="Dotted Guide"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300"
              style={{ opacity: dottedOpacity }}
            />

            {/* 2. Pigment / Marker Color Fill Layer (Strictly behind lines) */}
            <canvas
              ref={pigmentCanvasRef}
              width={800}
              height={800}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* 2b. Pulsing dotted highlight of the shape about to be drawn / colored */}
            <canvas
              ref={highlightCanvasRef}
              width={800}
              height={800}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* 3. Progressive Line Drawing Canvas (Stays above colors) */}
            <canvas
              ref={canvasRef}
              width={800}
              height={800}
              className="absolute inset-0 w-full h-full z-10 pointer-events-none"
            />

            {/* 4. DREAMY PINK GLITTER CONTOUR OVERLAY */}
            {activeGlitterContour && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <svg
                  viewBox="0 0 800 800"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <filter id="pinkGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#FF1493" />
                      <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#FF69B4" />
                    </filter>
                  </defs>

                  <path
                    d={activeGlitterContour.path}
                    fill="none"
                    stroke="#FF69B4"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="16 10"
                    filter="url(#pinkGlow)"
                    className="animate-pulse"
                  />

                  <path
                    d={activeGlitterContour.path}
                    fill="none"
                    stroke="#FDE047"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="8 8"
                  />
                </svg>

                <div
                  className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full flex items-center justify-center"
                  style={{
                    left: `${(activeGlitterContour.center.x / 800) * 100}%`,
                    top: `${(Math.max(30, activeGlitterContour.top - 6) / 800) * 100}%`,
                  }}
                >
                  <div className="relative">
                    <span className="text-2xl animate-bounce drop-shadow-[0_0_12px_#ff69b4]">
                      ✨💖✨
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. VIRTUAL KAWAII STYLUS / PEN CURSOR */}
            <KawaiiArtistStylus
              x={cursorState.x}
              y={cursorState.y}
              canvasWidth={800}
              canvasHeight={800}
              color={cursorState.color}
              brushType={cursorState.brushType || 'pencil'}
              isDrawing={cursorState.isDrawing}
              visible={cursorState.visible}
              toolStyle={cursorState.toolStyle}
              toolName={cursorState.toolName}
            />

            {/* 6. SPELLING REPEAT GLOW OVERLAY */}
            {(currentPhase === 'spelling' || currentPhase === 'finished') && (
              <div className="absolute bottom-4 inset-x-4 z-30 flex flex-col items-center justify-center pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-3 px-6 shadow-2xl border-4 border-amber-400 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-700">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                    <span>
                      {lang === 'fr'
                        ? 'Épelons et répétons ensemble !'
                        : "Let's spell and repeat together!"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {spellingLetters.map((letter, idx) => {
                      const isGlowing =
                        activeSpellingIndex === idx || isWordSpellingGlow;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveSpellingIndex(idx);
                            speakCheer(lang === 'fr' ? letter.soundFr : letter.soundEn);
                            soundEngine.playFillSound(true, 'bubble_sparkle');
                          }}
                          className={`w-12 h-14 rounded-2xl flex flex-col items-center justify-center text-2xl font-black transition-all transform ${
                            isGlowing
                              ? 'scale-125 bg-amber-400 text-amber-950 shadow-[0_0_20px_#f59e0b] ring-4 ring-amber-300 ring-offset-2 z-10 animate-bounce'
                              : 'bg-amber-100/80 text-amber-800 hover:bg-amber-200 shadow-sm'
                          }`}
                        >
                          <span>{letter.char}</span>
                          <span className="text-[9px] font-bold opacity-70">
                            {lang === 'fr' ? letter.soundFr : letter.soundEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

            {isPreparingVoice && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
                <span className="text-5xl animate-bounce">🎙️</span>
                <p className="font-black text-pink-600 text-lg">
                  {lang === 'fr' ? 'Préparation de la voix…' : 'Warming up the narrator…'}
                </p>
                {voiceProgress && (
                  <p className="text-xs font-bold text-slate-500">
                    {voiceProgress.done} / {voiceProgress.total}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick canvas controls */}
          <div className={`w-full ${stageMax} mt-3 flex items-center justify-between text-xs text-slate-500`}>
            <span className="flex items-center gap-1 font-bold">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              Gentle step-by-step drawing & magic filling
            </span>
            <button
              onClick={resetAllCanvases}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              Clear Canvas
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: VIDEO EXPORT & PALETTE */}
        <div className="w-full lg:w-[275px] shrink-0 flex flex-col gap-4">
          {/* VIDEO EXPORT CARD */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Educational Video</h3>
                  <p className="text-[11px] text-slate-500">Ready for YouTube & TikTok</p>
                </div>
              </div>

              {isRecording && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[11px] font-black animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  REC
                </div>
              )}
            </div>

            {recordedResult ? (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-300 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Video generated successfully! 🎉
                </div>
                <a
                  href={recordedResult.url}
                  download="kawaii-character-tutorial.webm"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Video (.webm)
                </a>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600">
                Click <strong>🎥 Record tuto</strong> above to automatically draw, color, and export with voice and background music!
              </div>
            )}
          </div>

          {/* COLORING PALETTE DETAIL */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col gap-3">
            <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-rose-500" />
              Area-by-Area Coloring Steps ({coloringSteps.length}):
            </h4>

            <div className="space-y-2">
              {coloringSteps.map((c, idx) => {
                const isCompleted = completedColorSteps.has(idx);
                const isCurrent = currentPhase === 'color' && currentColorStepIndex === idx;
                return (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between border transition-all ${
                      isCurrent
                        ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-black/20"
                        style={{ backgroundColor: c.colorHex }}
                      />
                      <span>{lang === 'fr' ? c.partName : c.partNameEn}</span>
                    </div>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Step {c.stepNumber}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* VALIDATION & PREVIEW MODAL (Requirement: Show preview before animating, allow corrections) */}
      {isValidatingWorkflow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-4 border-emerald-300 flex flex-col gap-4 max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl text-xl">
                  🔍
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Character Analysis & Validation Preview
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review extracted outlines, dotted guide, and proposed drawing order before animating.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsValidatingWorkflow(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Alert / Status */}
            {validationReport && (
              <div
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
                  validationReport.isValid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {validationReport.isValid ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-extrabold">
                    {validationReport.isValid
                      ? 'Outlines & Contours 100% Verified! Proportions and alignment preserved.'
                      : 'Validation Notice'}
                  </p>
                  {validationReport.warnings.length > 0 && (
                    <p className="text-[11px] font-medium mt-0.5 opacity-90">
                      {validationReport.warnings.join(' • ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 3 Previews Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Extracted B&W Outlines */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center gap-2">
                <span className="text-xs font-black text-slate-700">1. Clean B&W Outlines</span>
                <div className="w-28 h-28 bg-white rounded-xl border border-slate-200 overflow-hidden p-1 shadow-inner flex items-center justify-center">
                  <img
                    src={assets.bwReferenceUrl}
                    alt="B&W Outlines"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">Exact contours preserved</span>
              </div>

              {/* Card 2: Generated Dotted Guide */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center gap-2">
                <span className="text-xs font-black text-slate-700">2. Dotted Guide</span>
                <div className="w-28 h-28 bg-white rounded-xl border border-slate-200 overflow-hidden p-1 shadow-inner flex items-center justify-center">
                  <img
                    src={assets.dottedGuideUrl}
                    alt="Dotted Guide"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">Evenly spaced dots</span>
              </div>

              {/* Card 3: Original Colored Reference */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center gap-2">
                <span className="text-xs font-black text-slate-700">3. Colored Reference</span>
                <div className="w-28 h-28 bg-white rounded-xl border border-slate-200 overflow-hidden p-1 shadow-inner flex items-center justify-center">
                  <img
                    src={assets.coloredReferenceUrl}
                    alt="Colored Reference"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">Colors matched to regions</span>
              </div>
            </div>

            {/* Proposed Drawing Steps List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-indigo-600" />
                Proposed Drawing Order ({drawingSteps.length} Steps - Reorderable):
              </span>

              {drawingSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200 flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xl">{step.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">
                        {lang === 'fr' ? step.partName : step.partNameEn}
                      </p>
                      <p className="text-[11px] text-slate-500 italic truncate">
                        "{lang === 'fr' ? step.instructionFr : step.instructionEn}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveStep(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-20 text-slate-700"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveStep(idx, 'down')}
                      disabled={idx === drawingSteps.length - 1}
                      className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-20 text-slate-700"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => previewStep(step)}
                      className="p-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600"
                      title="Preview on canvas"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => speakCheer(lang === 'fr' ? step.instructionFr : step.instructionEn)}
                      className="p-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700"
                      title="Test joyful voice"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-3 border-slate-100">
              <button
                onClick={() => setIsValidatingWorkflow(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors"
              >
                Close Preview
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsValidatingWorkflow(false);
                    startRecordingVideo();
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-extrabold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Record Video</span>
                </button>
                <button
                  onClick={() => {
                    setIsValidatingWorkflow(false);
                    runAutoStepSequence();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Tutorial Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REORDER STEPS MODAL */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-indigo-200 flex flex-col gap-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-2xl text-xl">
                  🧩
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Reorder & Customize Drawing Steps
                  </h3>
                  <p className="text-xs text-slate-500">
                    You are the artist! Reorder the parts to decide what is drawn first.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {drawingSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-2xl">{step.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">
                        {lang === 'fr' ? step.partName : step.partNameEn}
                      </p>
                      <input
                        type="text"
                        value={lang === 'fr' ? step.instructionFr : step.instructionEn}
                        onChange={e => updateStepInstruction(idx, e.target.value)}
                        className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 w-full mt-1 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                        title="Edit short voice prompt for this step"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveStep(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-25 text-slate-700"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveStep(idx, 'down')}
                      disabled={idx === drawingSteps.length - 1}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-25 text-slate-700"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => previewStep(step)}
                      className="p-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600"
                      title="Preview on canvas"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => speakCheer(lang === 'fr' ? step.instructionFr : step.instructionEn)}
                      className="p-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700"
                      title="Play short joyful voice"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-3 border-slate-100">
              <button
                onClick={resetStepsToDefault}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Reset to Default Sequence
              </button>
              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
              >
                Apply Sequence & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

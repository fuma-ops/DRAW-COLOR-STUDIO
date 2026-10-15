import React, { useRef, useState, useEffect } from 'react';
import { useColoring, DEFAULT_ENGLISH_LEARNING_CONFIG } from '../context/ColoringContext';
import { MusicPreset, FillSoundPreset } from '../types';
import { CanvasRenderer, CanvasRendererHandle } from './CanvasRenderer';
import {
  segmentAndBuildCompletePlan,
  AutomatedArtistPlayer,
  RegionColorPlan,
  CompleteColoringPlan,
  PlannerDebugInfo,
  VirtualCursorState,
  generateNaturalStrokes,
  isWhiteColor,
} from '../utils/autoColorBot';
import { StudioVideoRecorder, RecordingResult } from '../utils/studioRecorder';
import { soundEngine, FILL_SOUND_PRESETS } from '../utils/audioSynth';
import { englishVoiceEngine } from '../utils/englishVoiceEngine';
import { EnglishLearningModal } from './EnglishLearningModal';
import { EnglishFlashcardOverlay } from './EnglishFlashcardOverlay';
import { KawaiiArtistStylus } from './KawaiiArtistStylus';
import { COLORING_PAGES } from '../data/coloringPages';
import {
  Play,
  Pause,
  RotateCcw,
  StopCircle,
  Download,
  Upload,
  ArrowLeft,
  Sparkles,
  Music,
  Volume2,
  Check,
  Copy,
  Layers,
  Eye,
  X,
  Sliders,
  Image as ImageIcon,
  Palette,
  Film,
  ListOrdered,
  Bug,
  Paintbrush,
  Eraser,
  PaintBucket,
  Flower2,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Tv,
  EyeOff,
  MousePointerClick,
  Mic,
} from 'lucide-react';

const PRESET_COLOR_GUIDES = [
  {
    name: 'Cozy Bedroom Pastel',
    swatches: ['#FFF0D4', '#FFD1DC', '#FFE4E8', '#D7CCC8', '#E8F5E9', '#E1F5FE', '#FFF9C4'],
  },
  {
    name: 'Sakura & Matcha',
    swatches: ['#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFFFFF'],
  },
  {
    name: 'Warm Sunset Glow',
    swatches: ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#FFF3B0', '#E09F3E'],
  },
  {
    name: 'Dreamy Lavender Fairy',
    swatches: ['#E8D7F1', '#D3BCC0', '#A5668B', '#F3E5F5', '#FFF0F5', '#D1C4E9'],
  },
];

export const StudioView: React.FC = () => {
  const {
    activePage,
    setActivePage,
    setScreen,
    coloredReferenceImage,
    setColoredReferenceImage,
    studioConfig,
    updateStudioConfig,
    selectedColor,
    setSelectedColor,
    updateBrushType,
    setColoringMode,
    coloringMode,
    brushConfig,
  } = useColoring();

  const canvasRef = useRef<CanvasRendererHandle>(null);
  const bwFileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Playback & Bot State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [completePlan, setCompletePlan] = useState<CompleteColoringPlan | null>(null);
  const [plans, setPlans] = useState<RegionColorPlan[]>([]);
  const [currentRegionIndex, setCurrentRegionIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Prêt pour le coloriage automatique ✨');
  const [selectedPresetGuideIndex, setSelectedPresetGuideIndex] = useState<number>(0);

  // Debug & Coloring Plan preview state
  const [debugInfo, setDebugInfo] = useState<PlannerDebugInfo | null>(null);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [showLiveDebugHud, setShowLiveDebugHud] = useState<boolean>(false);

  // Stylus state in Canvas coordinate space
  const [cursorState, setCursorState] = useState<VirtualCursorState>({
    x: 400,
    y: 400,
    isDrawing: false,
    color: '#FFD1DC',
    brushType: 'crayon',
    tiltAngle: 28,
    pressure: 0.5,
    visible: false,
  });

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordWithVideo, setRecordWithVideo] = useState<boolean>(true);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedVideo, setRecordedVideo] = useState<RecordingResult | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [finishedHdImage, setFinishedHdImage] = useState<string | null>(null);
  const [selectedImageQuality, setSelectedImageQuality] = useState<'4k' | '2k' | 'original'>('4k');
  const [copiedTitle, setCopiedTitle] = useState<boolean>(false);
  const [copiedDesc, setCopiedDesc] = useState<boolean>(false);

  // UI Modals, PIP & YouTube Screen Record Viewport
  const [showDualImageModal, setShowDualImageModal] = useState<boolean>(false);
  const [showFillSoundModal, setShowFillSoundModal] = useState<boolean>(false);
  const [showEnglishModal, setShowEnglishModal] = useState<boolean>(false);
  const [currentSpokenLetter, setCurrentSpokenLetter] = useState<string | null>(null);
  const [currentSpokenLetterIndex, setCurrentSpokenLetterIndex] = useState<number | null>(null);
  const [isAllCelebrationGlow, setIsAllCelebrationGlow] = useState<boolean>(false);
  const currentSpokenLetterRef = useRef<string | null>(null);
  const currentSpokenLetterIndexRef = useRef<number | null>(null);
  const [currentElementPhrase, setCurrentElementPhrase] = useState<string | null>(null);
  const [isDrawingElement, setIsDrawingElement] = useState<boolean>(false);
  const [testingPresetId, setTestingPresetId] = useState<FillSoundPreset | null>(null);
  const [miniGuidePosition, setMiniGuidePosition] = useState<'top-right' | 'top-left' | 'bottom-right'>('top-right');
  const [isCleanScreenMode, setIsCleanScreenMode] = useState<boolean>(false);
  const [hideTextOverlay, setHideTextOverlay] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Helper to synchronously update letter state and refs for recorder & glow
  const updateSpokenLetter = (letter: string | null, index: number | null) => {
    if (letter === 'ALL') {
      setIsAllCelebrationGlow(true);
      setCurrentSpokenLetter('ALL');
      setCurrentSpokenLetterIndex(-999);
      currentSpokenLetterRef.current = 'ALL';
      currentSpokenLetterIndexRef.current = -999;
    } else if (!letter) {
      setIsAllCelebrationGlow(false);
      setCurrentSpokenLetter(null);
      setCurrentSpokenLetterIndex(null);
      currentSpokenLetterRef.current = null;
      currentSpokenLetterIndexRef.current = null;
    } else {
      setIsAllCelebrationGlow(false);
      setCurrentSpokenLetter(letter);
      setCurrentSpokenLetterIndex(index);
      currentSpokenLetterRef.current = letter;
      currentSpokenLetterIndexRef.current = index;
    }
  };

  // Interactive Click Mode & User-Organized Coloring
  const [controlMode, setControlMode] = useState<'click' | 'auto'>('click');
  const [coloredPlanIndices, setColoredPlanIndices] = useState<Set<number>>(new Set());
  const [completedLetterIndices, setCompletedLetterIndices] = useState<Set<number>>(new Set());
  const [isElementCompleted, setIsElementCompleted] = useState<boolean>(false);
  const hasSpokenElementPhraseRef = useRef<boolean>(false);
  const isStepColoringRef = useRef<boolean>(false);

  // Sync soundEngine fill sound preset and active bot player settings
  useEffect(() => {
    soundEngine.setFillSoundPreset(studioConfig.fillSoundPreset);
    if (botPlayerRef.current) {
      botPlayerRef.current.setFillSoundPreset(studioConfig.fillSoundPreset);
      botPlayerRef.current.setSpeed(studioConfig.speed);
      botPlayerRef.current.setCursorStyle(studioConfig.cursorStyle);
      botPlayerRef.current.setStyle(studioConfig.coloringStyle);
      botPlayerRef.current.setEnglishLearningConfig(studioConfig.englishLearning);
    }
  }, [
    studioConfig.fillSoundPreset,
    studioConfig.speed,
    studioConfig.cursorStyle,
    studioConfig.coloringStyle,
    studioConfig.englishLearning,
  ]);

  const handleTestFillSound = (presetId: FillSoundPreset) => {
    setTestingPresetId(presetId);
    soundEngine.playFillSound(true, presetId);
    setTimeout(() => {
      setTestingPresetId(null);
    }, 480);
  };

  const botPlayerRef = useRef<AutomatedArtistPlayer | null>(null);
  const recorderRef = useRef<StudioVideoRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const cursorStateRef = useRef<VirtualCursorState>({
    x: 400,
    y: 400,
    isDrawing: false,
    color: '#FFD1DC',
    brushType: 'crayon',
    tiltAngle: 28,
    pressure: 0.5,
    visible: false,
  });

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pre-calculate region color plans from line art + reference guide
  const prepareColoringPlans = (callback?: (loadedPlan: CompleteColoringPlan) => void) => {
    if (!canvasRef.current) return;
    const lineData = canvasRef.current.getLineArtData();
    if (!lineData) {
      setTimeout(() => {
        if (canvasRef.current?.getLineArtData()) {
          prepareColoringPlans(callback);
        }
      }, 150);
      return;
    }

    const currentPalette =
      activePage.referencePalette && activePage.referencePalette.length > 0
        ? activePage.referencePalette
        : PRESET_COLOR_GUIDES[selectedPresetGuideIndex].swatches;

    const effectiveBrush = studioConfig.brushType || 'marker';

    if (coloredReferenceImage) {
      const refCanvas = document.createElement('canvas');
      refCanvas.width = activePage.width;
      refCanvas.height = activePage.height;
      const refCtx = refCanvas.getContext('2d');
      if (refCtx) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          refCtx.drawImage(img, 0, 0, activePage.width, activePage.height);
          const computedPlan = segmentAndBuildCompletePlan(
            lineData,
            refCanvas,
            currentPalette,
            studioConfig.coloringStyle,
            effectiveBrush,
            studioConfig.englishLearning
          );
          setCompletePlan(computedPlan);
          setPlans(computedPlan.plans);
          setStatusMessage(`${computedPlan.totalObjects} objets & ${computedPlan.totalSubRegions} zones séquencés ✨`);
          if (callback) callback(computedPlan);
        };
        img.src = coloredReferenceImage;
        return;
      }
    }

    const computedPlan = segmentAndBuildCompletePlan(
      lineData,
      null,
      currentPalette,
      studioConfig.coloringStyle,
      effectiveBrush,
      studioConfig.englishLearning
    );
    setCompletePlan(computedPlan);
    setPlans(computedPlan.plans);
    setStatusMessage(`${computedPlan.totalObjects} objets & ${computedPlan.totalSubRegions} zones prêtes à colorier ✨`);
    if (callback) callback(computedPlan);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      prepareColoringPlans();
    }, 250);
    return () => clearTimeout(timer);
  }, [
    activePage.id,
    coloredReferenceImage,
    selectedPresetGuideIndex,
    studioConfig.coloringStyle,
    studioConfig.brushType,
    studioConfig.englishLearning?.enabled,
    studioConfig.englishLearning?.targetWord,
  ]);

  // Pre-cache English speech audio into Web Audio memory for zero-latency video recording
  useEffect(() => {
    if (studioConfig.englishLearning?.enabled) {
      englishVoiceEngine.precacheForConfig(studioConfig.englishLearning);
    }
  }, [
    studioConfig.englishLearning?.enabled,
    studioConfig.englishLearning?.targetWord,
    studioConfig.englishLearning?.objectPhrase,
    studioConfig.englishLearning?.celebrationPhrase,
  ]);

  // Handle Lofi Ambience Sound
  useEffect(() => {
    if (studioConfig.lofiAmbience) {
      soundEngine.startLofiAmbience(0.12);
    } else {
      soundEngine.stopLofiAmbience();
    }
    return () => {
      soundEngine.stopLofiAmbience();
    };
  }, [studioConfig.lofiAmbience]);

  // Recording counter
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start Automated Coloring Process
  const handleStartColoring = async (shouldRecord: boolean = recordWithVideo) => {
    if (!canvasRef.current) return;

    const runWithFullPlan = async (targetPlan: CompleteColoringPlan) => {
      if (targetPlan.plans.length === 0) {
        setStatusMessage('Recherche des zones en cours...');
        return;
      }

      // Reset canvas cleanly to start fresh
      canvasRef.current?.resetCanvas();

      // Start Ultra HD video recorder if enabled
      if (shouldRecord) {
        const displayCanvas = canvasRef.current?.getDisplayCanvas();
        if (displayCanvas) {
          const recorder = new StudioVideoRecorder({
            sourceCanvas: displayCanvas,
            aspectRatio: studioConfig.aspectRatio,
            resolution: studioConfig.resolution,
            includeAudio: true, // Always capture voice and audio into video!
            watermarkText: studioConfig.showWatermark ? studioConfig.watermarkText : undefined,
            showWatermark: studioConfig.showWatermark,
            getCursorState: () => cursorStateRef.current,
            includeCursor: studioConfig.cursorStyle !== 'hidden',
            cursorStyle: studioConfig.cursorStyle,
            englishLearningConfig: studioConfig.englishLearning,
            getActiveLetter: () => currentSpokenLetterRef.current,
            getActiveLetterIndex: () => currentSpokenLetterIndexRef.current,
          });
          recorderRef.current = recorder;
          await recorder.start();
          setIsRecording(true);
        }
      }

      // Start relaxing ambient music if enabled
      if (studioConfig.lofiAmbience) {
        soundEngine.startRelaxingMusic(studioConfig.musicPreset, studioConfig.musicVolume);
      }

      // Initialize Virtual Stylus State at first plan position
      const firstPlan = targetPlan.plans[0];
      const initialToolStyle =
        studioConfig.cursorStyle === 'auto' || !studioConfig.cursorStyle
          ? (firstPlan.toolStyle || (firstPlan.brushType === 'colored_pencil' || firstPlan.brushType === 'pencil' ? 'pencil' : firstPlan.brushType === 'marker' ? 'marker' : 'stylus'))
          : (studioConfig.cursorStyle === 'circle' || studioConfig.cursorStyle === 'hidden' ? 'stylus' : studioConfig.cursorStyle);

      const initialCursor: VirtualCursorState = {
        x: firstPlan.centroidX,
        y: firstPlan.centroidY,
        isDrawing: false,
        color: firstPlan.color,
        brushType: firstPlan.brushType,
        toolStyle: initialToolStyle,
        toolName: firstPlan.toolName || (initialToolStyle === 'marker' ? 'Feutre Copic 💖' : initialToolStyle === 'pencil' ? 'Crayon Bois ✏️' : 'Apple Pencil ✨'),
        tiltAngle: 28,
        pressure: 0.5,
        visible: true,
      };
      cursorStateRef.current = initialCursor;
      setCursorState(initialCursor);

      // Launch automated coloring player with precomputed plan
      const player = new AutomatedArtistPlayer({
        canvasHandle: canvasRef.current!,
        completePlan: targetPlan,
        speedMultiplier: studioConfig.speed,
        coloringStyle: studioConfig.coloringStyle,
        cursorStyle: studioConfig.cursorStyle,
        fillSoundPreset: studioConfig.fillSoundPreset,
        englishLearningConfig: studioConfig.englishLearning,
        onEnglishElementSpoken: phrase => {
          setIsDrawingElement(true);
          setCurrentElementPhrase(phrase);
          updateSpokenLetter(null, null);
        },
        onEnglishLetterSpoken: (letter, index) => {
          setIsDrawingElement(false);
          updateSpokenLetter(letter, index);
        },
        onCursorChange: nextCursor => {
          const updatedCursor = { ...nextCursor, visible: true };
          cursorStateRef.current = updatedCursor;
          setCursorState(updatedCursor);
        },
        onDebugUpdate: info => {
          setDebugInfo(info);
        },
        onProgress: (current, total, pct, planInfo) => {
          setCurrentRegionIndex(current);
          setProgressPercent(pct);
          if (planInfo && planInfo.elementName && planInfo.totalInElement && planInfo.totalInElement > 1) {
            setStatusMessage(
              `Coloriage : ${planInfo.elementName} (${planInfo.elementIndex}/${planInfo.totalInElement}) • Total: ${current}/${total} (${pct}%)`
            );
          } else if (planInfo && planInfo.elementName) {
            setStatusMessage(
              `Coloriage : ${planInfo.elementName} • Total: ${current}/${total} (${pct}%)`
            );
          } else {
            setStatusMessage(`Coloriage zone ${current}/${total} (${pct}%)`);
          }
        },
        onComplete: async () => {
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentSpokenLetter(null);
          setCurrentSpokenLetterIndex(null);
          setIsDrawingElement(false);
          soundEngine.stopRelaxingMusic();
          setCursorState(prev => ({ ...prev, visible: false }));
          setStatusMessage('Coloriage terminé ! Image HD prête 🎨✨');

          // Capture the finished Ultra-HD colored artwork
          if (canvasRef.current) {
            try {
              const hdUrl = canvasRef.current.exportImageHD(4);
              setFinishedHdImage(hdUrl);
            } catch (err) {
              console.error('Error generating HD image:', err);
            }
          }

          if (recorderRef.current && recorderRef.current.getIsRecording()) {
            try {
              // Ensure voice is completely finished speaking before stopping video recorder
              await englishVoiceEngine.waitUntilFinished();
              await new Promise(r => setTimeout(r, 800));
              const result = await recorderRef.current.stop();
              setIsRecording(false);
              setRecordedVideo(result);
            } catch (err) {
              console.error('Stop recorder error:', err);
            }
          }
          setShowExportModal(true);
        },
      });

      botPlayerRef.current = player;
      setIsPlaying(true);
      setIsPaused(false);
      player.start();
    };

    if (completePlan && completePlan.plans.length > 0) {
      runWithFullPlan(completePlan);
    } else {
      prepareColoringPlans(runWithFullPlan);
    }
  };

  const handlePauseResume = () => {
    if (!botPlayerRef.current) return;
    if (isPaused) {
      botPlayerRef.current.resume();
      if (studioConfig.lofiAmbience) {
        soundEngine.startRelaxingMusic(studioConfig.musicPreset, studioConfig.musicVolume);
      }
      setIsPaused(false);
    } else {
      botPlayerRef.current.pause();
      soundEngine.stopRelaxingMusic();
      englishVoiceEngine.stop();
      setIsPaused(true);
    }
  };

  const handleStopAndFinish = async () => {
    soundEngine.stopRelaxingMusic();
    englishVoiceEngine.stop();
    setCurrentSpokenLetter(null);
    setIsDrawingElement(false);
    if (botPlayerRef.current) {
      botPlayerRef.current.stop();
      setIsPlaying(false);
      setIsPaused(false);
      cursorStateRef.current = { ...cursorStateRef.current, visible: false };
      setCursorState(prev => ({ ...prev, visible: false }));
    }
    if (recorderRef.current && recorderRef.current.getIsRecording()) {
      try {
        const result = await recorderRef.current.stop();
        setIsRecording(false);
        setRecordedVideo(result);
        setShowExportModal(true);
      } catch (err) {
        console.error('Failed to export video:', err);
      }
    }
  };

  const handleResetCanvas = () => {
    soundEngine.stopRelaxingMusic();
    englishVoiceEngine.stop();
    setCurrentSpokenLetter(null);
    setCurrentSpokenLetterIndex(null);
    setCurrentElementPhrase(null);
    setIsDrawingElement(false);
    setColoredPlanIndices(new Set());
    setCompletedLetterIndices(new Set());
    setIsElementCompleted(false);
    hasSpokenElementPhraseRef.current = false;
    isStepColoringRef.current = false;
    if (botPlayerRef.current) {
      botPlayerRef.current.stop();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setProgressPercent(0);
    setCurrentRegionIndex(0);
    cursorStateRef.current = { ...cursorStateRef.current, visible: false };
    setCursorState(prev => ({ ...prev, visible: false }));
    canvasRef.current?.resetCanvas();
    setStatusMessage('Toile réinitialisée. Cliquez pour colorier au clic ou lancez le mode auto ✨');
  };

  // Test the active Studio voice directly
  const handleTestActiveVoice = () => {
    const voiceName = studioConfig.englishLearning?.selectedVoiceName || 'Puck';
    const sampleText = studioConfig.englishLearning?.objectPhrase
      ? studioConfig.englishLearning.objectPhrase
      : `Let's color and spell ${studioConfig.englishLearning?.targetWord || 'Apple'}!`;
    englishVoiceEngine.speak(sampleText, {
      preferredVoiceName: voiceName,
      lang: studioConfig.englishLearning?.voiceAccent || 'en-US',
      rate: studioConfig.englishLearning?.speechRate || 0.85,
      pitch: studioConfig.englishLearning?.speechPitch || 1.15,
    });
  };

  // User-Organized Click Coloring: 1. Main Element
  const handleColorMainElement = async () => {
    if (!completePlan || completePlan.plans.length === 0) return;
    if (isPlaying || englishVoiceEngine.isVoiceSpeaking() || isStepColoringRef.current) return;
    isStepColoringRef.current = true;

    // Start video recorder if recordWithVideo is checked and not yet rolling
    if (recordWithVideo && (!recorderRef.current || !recorderRef.current.getIsRecording())) {
      const displayCanvas = canvasRef.current?.getDisplayCanvas();
      if (displayCanvas) {
        const recorder = new StudioVideoRecorder({
          sourceCanvas: displayCanvas,
          aspectRatio: studioConfig.aspectRatio,
          resolution: studioConfig.resolution,
          includeAudio: true, // Always capture voice and audio into video!
          watermarkText: studioConfig.showWatermark ? studioConfig.watermarkText : undefined,
          showWatermark: studioConfig.showWatermark,
          getCursorState: () => cursorStateRef.current,
          includeCursor: studioConfig.cursorStyle !== 'hidden',
          cursorStyle: studioConfig.cursorStyle,
          englishLearningConfig: studioConfig.englishLearning,
          getActiveLetter: () => currentSpokenLetterRef.current,
          getActiveLetterIndex: () => currentSpokenLetterIndexRef.current,
        });
        recorderRef.current = recorder;
        await recorder.start();
        setIsRecording(true);
      }
    }

    const engCfg = studioConfig.englishLearning;
    const voiceName = engCfg?.selectedVoiceName || 'Puck';
    const phrase = engCfg?.objectPhrase || `Look at the delicious ${engCfg?.targetWord || 'picture'}!`;

    // Audio narration immediately begins (routes into soundEngine -> recorded in video!)
    // Voice plays continuously without stopping while element regions are colored!
    setIsDrawingElement(true);
    setCurrentElementPhrase(phrase);
    updateSpokenLetter(null, null);
    englishVoiceEngine.speakObjectPhrase(phrase, {
      preferredVoiceName: voiceName,
      lang: engCfg?.voiceAccent || 'en-US',
      rate: engCfg?.speechRate || 0.85,
      pitch: engCfg?.speechPitch || 1.15,
    });

    // Find all plans belonging to the main element (non-letter plans, strictly ignoring white areas)
    const elementPlans = completePlan.plans.filter(p => !p.isLetterPlan && !isWhiteColor(p.color));
    const plansToColor =
      elementPlans.length > 0
        ? [...elementPlans]
        : completePlan.plans
            .filter(p => !isWhiteColor(p.color))
            .slice(0, Math.max(1, completePlan.plans.length - (engCfg?.spellingLetters.length || 0)));

    // MANDATORY RULE: Always start by the BIGGEST AREA in the element, then smaller ones!
    plansToColor.sort((a, b) => (b.pixelCount || 0) - (a.pixelCount || 0));

    const nextColored = new Set(coloredPlanIndices);

    for (const plan of plansToColor) {
      if (isWhiteColor(plan.color)) continue;
      const planIdx = completePlan.plans.indexOf(plan);
      if (nextColored.has(planIdx)) continue;

      const toolStyle =
        studioConfig.cursorStyle === 'auto' || !studioConfig.cursorStyle
          ? plan.toolStyle || (plan.brushType === 'colored_pencil' || plan.brushType === 'pencil' ? 'pencil' : plan.brushType === 'marker' ? 'marker' : 'stylus')
          : studioConfig.cursorStyle === 'circle' || studioConfig.cursorStyle === 'hidden'
          ? 'stylus'
          : studioConfig.cursorStyle;

      const activeCursor: VirtualCursorState = {
        x: plan.centroidX,
        y: plan.centroidY,
        isDrawing: true,
        color: plan.color,
        brushType: plan.brushType,
        toolStyle,
        toolName: plan.toolName || (toolStyle === 'marker' ? 'Feutre Copic 💖' : 'Crayon Bois ✏️'),
        tiltAngle: 28,
        pressure: 0.85,
        visible: true,
      };
      cursorStateRef.current = activeCursor;
      setCursorState(activeCursor);

      // Color region: bucket fill for fast clean coloring
      const isLargeArea = plan.pixelCount >= 1000;
      const useBucket = plan.method === 'bucket' || isLargeArea;

      if (useBucket) {
        soundEngine.playFillSound(true, studioConfig.fillSoundPreset || 'bubble_sparkle');
        await canvasRef.current?.animateBucketFill(
          plan.seedX,
          plan.seedY,
          plan.color,
          160,
          plan.brushType
        );
      } else {
        soundEngine.startStroke(plan.brushType, true);
        const lineData = canvasRef.current?.getLineArtData();
        const strokes = lineData ? generateNaturalStrokes(lineData, plan, 0.75) : [];
        const pts = strokes.length > 0 && strokes[0].points.length > 0
          ? strokes[0].points
          : [
              { x: plan.centroidX - 6, y: plan.centroidY - 6 },
              { x: plan.centroidX + 6, y: plan.centroidY + 6 },
            ];
        canvasRef.current?.paintStrokeAtRegion(plan.seedX, plan.seedY, pts, plan.color, plan.brushType);
        soundEngine.stopStroke();
      }

      canvasRef.current?.triggerObjectSpringBump({ x: plan.centroidX, y: plan.centroidY }, 1.04, 200);
      nextColored.add(planIdx);
      setColoredPlanIndices(new Set(nextColored));
    }

    setIsElementCompleted(true);
    hasSpokenElementPhraseRef.current = true;
    cursorStateRef.current = { ...cursorStateRef.current, isDrawing: false };
    setCursorState(prev => ({ ...prev, isDrawing: false }));

    const activePlans = completePlan.plans.filter(p => !isWhiteColor(p.color));
    const total = activePlans.length || completePlan.plans.length;
    const count = Array.from(nextColored).filter(idx => !isWhiteColor(completePlan.plans[idx]?.color || '')).length;
    setProgressPercent(Math.min(100, Math.round((count / total) * 100)));

    // STRICT: Principal element voice must NEVER be stopped or cut off!
    // Wait for the object phrase voice to finish completely before unlocking the next step
    if (englishVoiceEngine.isVoiceSpeaking()) {
      await englishVoiceEngine.waitUntilFinished();
      await new Promise(r => setTimeout(r, 450));
    }

    const firstLetter = engCfg?.spellingLetters[0] || 'A';
    setStatusMessage(`Élément principal colorié ! Cliquez maintenant sur la première lettre « ${firstLetter} » pour l'épeler 👆`);
    isStepColoringRef.current = false;
  };

  // User-Organized Click Coloring: 2. Specific Spelling Letter
  const handleColorLetter = async (letter: string, letterIndex: number) => {
    if (!completePlan || completePlan.plans.length === 0) return;
    if (isPlaying || englishVoiceEngine.isVoiceSpeaking() || isStepColoringRef.current) return;
    isStepColoringRef.current = true;

    // Start video recorder if recordWithVideo is checked and not yet rolling
    if (recordWithVideo && (!recorderRef.current || !recorderRef.current.getIsRecording())) {
      const displayCanvas = canvasRef.current?.getDisplayCanvas();
      if (displayCanvas) {
        const recorder = new StudioVideoRecorder({
          sourceCanvas: displayCanvas,
          aspectRatio: studioConfig.aspectRatio,
          resolution: studioConfig.resolution,
          includeAudio: true, // Always capture voice and audio into video!
          watermarkText: studioConfig.showWatermark ? studioConfig.watermarkText : undefined,
          showWatermark: studioConfig.showWatermark,
          getCursorState: () => cursorStateRef.current,
          includeCursor: studioConfig.cursorStyle !== 'hidden',
          cursorStyle: studioConfig.cursorStyle,
          englishLearningConfig: studioConfig.englishLearning,
          getActiveLetter: () => currentSpokenLetterRef.current,
          getActiveLetterIndex: () => currentSpokenLetterIndexRef.current,
        });
        recorderRef.current = recorder;
        await recorder.start();
        setIsRecording(true);
      }
    }

    const engCfg = studioConfig.englishLearning;
    const voiceName = engCfg?.selectedVoiceName || 'Aoede';

    // STRICT: Never proceed to letter if voice is still talking!
    if (englishVoiceEngine.isVoiceSpeaking()) {
      await englishVoiceEngine.waitUntilFinished();
      await new Promise(r => setTimeout(r, 400));
    }

    // Voice articulates this letter loud and clear!
    setIsDrawingElement(false);
    updateSpokenLetter(letter, letterIndex);
    englishVoiceEngine.speakLetter(letter, {
      preferredVoiceName: voiceName,
      lang: engCfg?.voiceAccent || 'en-US',
      rate: engCfg?.speechRate || 0.85,
      pitch: engCfg?.speechPitch || 1.18,
    });

    // Find all plans belonging to this letter (strictly ignoring white areas)
    const letterPlans = completePlan.plans.filter(
      p =>
        p.isLetterPlan &&
        !isWhiteColor(p.color) &&
        (p.spelledLetterIndex === letterIndex || p.spelledLetter?.toUpperCase() === letter.toUpperCase())
    );

    // If no explicit letter plans were tagged, find remaining uncolored non-white plans
    const targetPlans =
      letterPlans.length > 0
        ? letterPlans
        : completePlan.plans.filter((p, i) => !coloredPlanIndices.has(i) && !isWhiteColor(p.color)).slice(0, 1);

    const nextColored = new Set(coloredPlanIndices);

    for (const plan of targetPlans) {
      if (isWhiteColor(plan.color)) continue;
      const planIdx = completePlan.plans.indexOf(plan);
      if (nextColored.has(planIdx)) continue;

      const toolStyle =
        studioConfig.cursorStyle === 'auto' || !studioConfig.cursorStyle
          ? plan.toolStyle || 'marker'
          : studioConfig.cursorStyle === 'circle' || studioConfig.cursorStyle === 'hidden'
          ? 'stylus'
          : studioConfig.cursorStyle;

      const activeCursor: VirtualCursorState = {
        x: plan.centroidX,
        y: plan.centroidY,
        isDrawing: true,
        color: plan.color,
        brushType: plan.brushType,
        toolStyle,
        toolName: 'Feutre Copic 💖',
        tiltAngle: 28,
        pressure: 0.85,
        visible: true,
      };
      cursorStateRef.current = activeCursor;
      setCursorState(activeCursor);

      soundEngine.playFillSound(true, studioConfig.fillSoundPreset || 'bubble_sparkle');
      await canvasRef.current?.animateBucketFill(
        plan.seedX,
        plan.seedY,
        plan.color,
        180,
        plan.brushType
      );

      canvasRef.current?.triggerObjectSpringBump({ x: plan.centroidX, y: plan.centroidY }, 1.05, 220);
      nextColored.add(planIdx);
      setColoredPlanIndices(new Set(nextColored));
    }

    // Mark letter as completed
    const nextCompletedLetters = new Set(completedLetterIndices);
    nextCompletedLetters.add(letterIndex);
    setCompletedLetterIndices(nextCompletedLetters);

    cursorStateRef.current = { ...cursorStateRef.current, isDrawing: false };
    setCursorState(prev => ({ ...prev, isDrawing: false }));

    const total = completePlan.plans.length;
    const count = nextColored.size;
    setProgressPercent(Math.round((count / total) * 100));

    const totalLetters = engCfg?.spellingLetters.length || 0;
    const isAllLettersDone = totalLetters > 0 && nextCompletedLetters.size >= totalLetters;

    // Wait for the letter voice to completely finish speaking
    await englishVoiceEngine.waitUntilFinished();
    await new Promise(r => setTimeout(r, 400));

    if (isAllLettersDone) {
      // Re-read complete word and celebrate!
      setStatusMessage(`Mot « ${engCfg?.targetWord} » terminé ! Relecture complète du mot ✨`);
      const targetWord = engCfg?.targetWord || 'AWESOME';
      const spellingLetters = engCfg?.spellingLetters || [];
      const celebrationPhrase = engCfg?.celebrationPhrase || 'Great job!';

      await englishVoiceEngine.celebrateWord(targetWord, spellingLetters, celebrationPhrase, {
        preferredVoiceName: voiceName,
        lang: engCfg?.voiceAccent || 'en-US',
        rate: engCfg?.speechRate || 0.88,
        pitch: engCfg?.speechPitch || 1.18,
        onLetterGlow: (letter, index) => {
          updateSpokenLetter(letter, index);
          if (letter && letter !== 'ALL') {
            setStatusMessage(`✨ Relecture magique : la lettre « ${letter} » brille pendant l'épellation ! ✨`);
          }
        },
        onAllGlow: () => {
          updateSpokenLetter('ALL', -999);
          setStatusMessage(`🎉 Bravo ! Toutes les lettres de « ${targetWord} » brillent de mille feux ! 🌟`);
        },
      });

      // STRICT: Never close the video before voice finishes talking!
      await englishVoiceEngine.waitUntilFinished();
      await new Promise(r => setTimeout(r, 2000));
      updateSpokenLetter(null, null);

      // Video finishes automatically ("et apre la finir la voix reli le mot complet et ce fini la video")
      if (recorderRef.current && recorderRef.current.getIsRecording()) {
        try {
          const result = await recorderRef.current?.stop();
          setIsRecording(false);
          if (result) setRecordedVideo(result);
          if (canvasRef.current) {
            const hdUrl = canvasRef.current.exportImageHD(4);
            setFinishedHdImage(hdUrl);
          }
          setShowExportModal(true);
          setStatusMessage('Vidéo filmée avec succès avec la voix d\'apprentissage 🎬✨');
        } catch (err) {
          console.error('Stop click recorder error:', err);
        }
      }
    } else {
      const nextLetter = engCfg?.spellingLetters[letterIndex + 1];
      setStatusMessage(`Lettre « ${letter} » coloriée ! Cliquez sur la lettre suivante « ${nextLetter} » 👆`);
    }

    isStepColoringRef.current = false;
  };

  // Canvas click handler: user organizes which area gets colored
  const handleCanvasClick = (pt: { x: number; y: number }) => {
    if (!completePlan || completePlan.plans.length === 0) return;
    if (isPlaying || englishVoiceEngine.isVoiceSpeaking() || isStepColoringRef.current) return;

    // Check if clicked near a plan
    let candidateIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < completePlan.plans.length; i++) {
      if (coloredPlanIndices.has(i) || isWhiteColor(completePlan.plans[i].color)) continue;
      const p = completePlan.plans[i];
      const insideBounds =
        pt.x >= p.bounds.minX - 14 &&
        pt.x <= p.bounds.maxX + 14 &&
        pt.y >= p.bounds.minY - 14 &&
        pt.y <= p.bounds.maxY + 14;

      const dist = Math.hypot(p.centroidX - pt.x, p.centroidY - pt.y);
      if (insideBounds && dist < minDistance) {
        minDistance = dist;
        candidateIndex = i;
      }
    }

    if (candidateIndex === -1) {
      for (let i = 0; i < completePlan.plans.length; i++) {
        if (coloredPlanIndices.has(i) || isWhiteColor(completePlan.plans[i].color)) continue;
        const p = completePlan.plans[i];
        const dist = Math.hypot(p.centroidX - pt.x, p.centroidY - pt.y);
        if (dist < minDistance) {
          minDistance = dist;
          candidateIndex = i;
        }
      }
    }

    if (candidateIndex !== -1) {
      const plan = completePlan.plans[candidateIndex];
      if (plan.isLetterPlan) {
        const letter = plan.spelledLetter || studioConfig.englishLearning?.spellingLetters[plan.spelledLetterIndex ?? 0] || 'A';
        handleColorLetter(letter, plan.spelledLetterIndex ?? 0);
      } else {
        handleColorMainElement();
      }
    }
  };

  // Letter tile click handler in banner: user organizes letter coloring
  const handleLetterTileClick = (letter: string, index: number) => {
    if (isPlaying || englishVoiceEngine.isVoiceSpeaking() || isStepColoringRef.current) return;
    handleColorLetter(letter, index);
  };

  // Color next uncolored step in sequence
  const handleColorNextPlan = () => {
    if (!completePlan || completePlan.plans.length === 0) return;
    if (isPlaying || englishVoiceEngine.isVoiceSpeaking() || isStepColoringRef.current) return;
    const engCfg = studioConfig.englishLearning;

    // Step 1: If element is not yet completed, color main element first!
    if (!isElementCompleted) {
      handleColorMainElement();
      return;
    }

    // Step 2+: Color next uncolored letter in sequence
    const spellingLetters = engCfg?.spellingLetters || [];
    for (let i = 0; i < spellingLetters.length; i++) {
      if (!completedLetterIndices.has(i)) {
        handleColorLetter(spellingLetters[i], i);
        return;
      }
    }
  };

  // Toggle Video Recording in Click Mode
  const handleToggleClickModeRecording = async () => {
    if (isRecording && recorderRef.current) {
      try {
        const result = await recorderRef.current.stop();
        setIsRecording(false);
        setRecordedVideo(result);
        if (canvasRef.current) {
          const hdUrl = canvasRef.current.exportImageHD(4);
          setFinishedHdImage(hdUrl);
        }
        setShowExportModal(true);
      } catch (err) {
        console.error('Stop click recording error:', err);
      }
    } else {
      const displayCanvas = canvasRef.current?.getDisplayCanvas();
      if (displayCanvas) {
        const recorder = new StudioVideoRecorder({
          sourceCanvas: displayCanvas,
          aspectRatio: studioConfig.aspectRatio,
          resolution: studioConfig.resolution,
          includeAudio: true,
          watermarkText: studioConfig.showWatermark ? studioConfig.watermarkText : undefined,
          showWatermark: studioConfig.showWatermark,
          getCursorState: () => cursorStateRef.current,
          includeCursor: studioConfig.cursorStyle !== 'hidden',
          cursorStyle: studioConfig.cursorStyle,
          englishLearningConfig: studioConfig.englishLearning,
          getActiveLetter: () => currentSpokenLetterRef.current,
          getActiveLetterIndex: () => currentSpokenLetterIndexRef.current,
        });
        recorderRef.current = recorder;
        await recorder.start();
        setIsRecording(true);
        setStatusMessage('Enregistrement vidéo démarré 🎥 Cliquez sur les zones pour colorier et épelez !');
      }
    }
  };

  // Download high-resolution colored artwork
  const handleDownloadHdImage = (quality: '4k' | '2k' | 'original' = selectedImageQuality) => {
    if (!canvasRef.current) return;
    const mult = quality === '4k' ? 4 : quality === '2k' ? 2 : 1;
    const dataUrl = canvasRef.current.exportImageHD(mult);
    if (!dataUrl) return;

    const link = document.createElement('a');
    const qualityLabel = quality === '4k' ? '4K_UltraHD' : quality === '2k' ? '2K_QuadHD' : 'OriginalHD';
    const finalW = Math.round(activePage.width * mult);
    const finalH = Math.round(activePage.height * mult);
    link.download = `KawaiiColor_${activePage.title.replace(/\s+/g, '_')}_${qualityLabel}_${finalW}x${finalH}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setStatusMessage(`Image coloriée téléchargée en ${qualityLabel} (${finalW}×${finalH}px) 🌸✨`);
  };

  const handleOpenExportModal = () => {
    if (canvasRef.current) {
      try {
        const hdUrl = canvasRef.current.exportImageHD(4);
        setFinishedHdImage(hdUrl);
      } catch (err) {
        console.error('Error exporting image:', err);
      }
    }
    setShowExportModal(true);
  };

  // Upload Black & White Line Art Image (Image 1)
  const handleBwUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        const img = new Image();
        img.onload = () => {
          setActivePage({
            id: `custom_bw_${Date.now()}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            category: 'Cozy Life',
            subtitle: 'Exact uploaded line art (0% AI alteration)',
            imageUrl: dataUrl,
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 800,
            difficulty: 'Detailed',
            tags: ['uploaded', 'original', 'custom'],
          });
          setStatusMessage('Nouvelle image Noir & Blanc chargée avec succès 🎨');
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload Colored Reference Image (Image 2)
  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setColoredReferenceImage(dataUrl);
        setStatusMessage('Image de référence couleur chargée avec succès 🌸');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const youtubeTitle = `Relaxing Kawaii Coloring ASMR • ${activePage.title} | Satisfying Speedpaint Video`;
  const youtubeDescription = `Enjoy this calming and satisfying ASMR kawaii coloring video of "${activePage.title}"! 🌸\n\n🎨 Colors: Exact sampled palette from colored reference\n✏️ Audio: Authentic soothing pencil & marker acoustic ASMR\n✨ Vibe: Relaxing & cozy chill aesthetic\n\nDon't forget to like, subscribe and turn on bell notifications for daily relaxing coloring ASMR! 💖\n\n#asmr #coloring #kawaii #relaxing #satisfying #speedpaint #arttherapy #relaxingvideo`;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#FAF4F6] text-[#4A3B43] select-none overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. MASTER HEADER */}
      {!isCleanScreenMode && (
      <header className="sticky top-0 z-40 px-3 sm:px-6 py-2.5 bg-white/95 backdrop-blur-md border-b border-pink-100 flex items-center justify-between shadow-2xs">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              if (isPlaying) handleStopAndFinish();
              setScreen('coloring');
            }}
            className="px-3 py-1.5 rounded-full bg-white hover:bg-pink-50 border border-pink-200 text-[#4A3B43] transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Quitter le studio et revenir à l'application de coloriage interactive"
          >
            <ArrowLeft className="w-4 h-4 text-pink-500" />
            <span className="text-xs font-extrabold hidden sm:inline">Mode App Client</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-[#4A3B43] tracking-tight">
                STUDIO COLORIAGE AUTOMATIQUE
              </span>
              <span className="px-2 py-0.5 bg-gradient-to-r from-pink-500 to-rose-400 text-white text-[10px] font-bold rounded-full shadow-2xs flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>ASMR Ultra HD</span>
              </span>
            </div>
            <p className="text-[10px] text-[#8E7C85] truncate max-w-[200px] sm:max-w-md">
              {activePage.title} • {statusMessage}
            </p>
          </div>
        </div>

        {/* Right: REC Status & Quick Dual-Image Modal Toggle */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full animate-pulse shadow-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-bold text-red-700 tracking-wide font-mono">
                REC {formatTimer(recordingSeconds)}
              </span>
              <span className="text-[10px] text-red-500 font-semibold hidden sm:inline">
                • {studioConfig.resolution.toUpperCase()} 60FPS
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-pink-50 border border-pink-200 rounded-full text-[11px] text-[#7A6872] font-semibold">
              <Film className="w-3.5 h-3.5 text-pink-500" />
              <span>{studioConfig.resolution.toUpperCase()} • 60FPS</span>
            </div>
          )}

          {/* Button to switch to User Stroke Recording & Replay Engine */}
          <button
            onClick={() => setScreen('kid_video_generator')}
            className="px-3 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 border border-amber-300 bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500 hover:opacity-95 text-white shadow-2xs cursor-pointer animate-pulse"
            title="Ouvrir le Mode Enfant : Dessine l'Abeille Pas à Pas avec Félicitations & Vidéo 🎬"
          >
            <span>🐝</span>
            <span className="hidden sm:inline">Abeille Pas-à-Pas Enfant 🎬</span>
          </button>

          <button
            onClick={() => setScreen('recording_studio')}
            className="px-3 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 border border-purple-300 bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-95 text-white shadow-2xs cursor-pointer"
            title="Ouvrir le Studio d'Enregistrement de Tracé Manuel & Rejeu Fidèle (Phases 1-6)"
          >
            <span>✍️</span>
            <span className="hidden sm:inline">Tracé Artiste (Phases 1-6)</span>
          </button>

          <button
            onClick={() => setShowDualImageModal(true)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border bg-white hover:bg-pink-50 border-pink-200 shadow-2xs text-[#4A3B43] cursor-pointer"
            title="Gérer les 2 images (Noir & Blanc + Référence Couleur)"
          >
            <Layers className="w-3.5 h-3.5 text-pink-500" />
            <span className="hidden sm:inline">Les 2 Images</span>
            {coloredReferenceImage ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Direct HD Image Download Button */}
          <button
            onClick={handleOpenExportModal}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-white shadow-2xs cursor-pointer"
            title="Télécharger l'image coloriée en Haute Qualité Ultra HD (PNG 4K / 2K)"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Télécharger Image HD</span>
          </button>

          {/* Mode Anglais Kids / Vocabulaire & Épellation */}
          <button
            onClick={() => setShowEnglishModal(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border shadow-2xs cursor-pointer ${
              studioConfig.englishLearning?.enabled
                ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 text-white border-purple-400 ring-2 ring-purple-300 animate-pulse'
                : 'bg-white hover:bg-purple-50 border-purple-200 text-purple-950'
            }`}
            title="Mode Anglais : Apprendre le vocabulaire et l'épellation lettre par lettre avec voix authentique"
          >
            <span className="text-sm">🎓</span>
            <span className="hidden sm:inline">Mode Anglais</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                studioConfig.englishLearning?.enabled
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {studioConfig.englishLearning?.enabled ? 'ACTIF 🔊' : 'OFF'}
            </span>
          </button>

          {/* Show Coloring Plan */}
          <button
            onClick={() => setShowPlanModal(true)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border bg-white hover:bg-pink-50 border-pink-200 shadow-2xs text-[#4A3B43] cursor-pointer"
            title="Afficher le plan complet de coloriage déterministe (Debug)"
          >
            <ListOrdered className="w-3.5 h-3.5 text-pink-500" />
            <span className="hidden md:inline">Plan de Coloriage</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded-full font-mono font-bold">
              {completePlan ? `${completePlan.totalObjects} obj` : 'Plan'}
            </span>
          </button>

          {/* Live Debug HUD toggle */}
          <button
            onClick={() => setShowLiveDebugHud(prev => !prev)}
            className={`p-1.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
              showLiveDebugHud
                ? 'bg-pink-500 border-pink-500 text-white shadow-xs'
                : 'bg-white border-pink-200 text-[#7A6872] hover:bg-pink-50'
            }`}
            title="Activer/désactiver l'affichage des informations de débogage en direct"
          >
            <Bug className="w-3.5 h-3.5" />
          </button>

          {/* Fill Sounds Comparison Modal Toggle */}
          <button
            onClick={() => setShowFillSoundModal(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border bg-white hover:bg-pink-50 border-pink-200 shadow-2xs text-[#4A3B43] cursor-pointer"
            title="Tester et choisir parmi les sons de remplissage pour enfants & ASMR"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span className="hidden xl:inline">Sons Remplissage</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-full font-bold">
              {FILL_SOUND_PRESETS.find(p => p.id === (studioConfig.fillSoundPreset || 'bubble_sparkle'))?.emoji}
            </span>
          </button>

          {/* Toggle Hide Text (Mode Pro / Sans Texte) */}
          <button
            onClick={() => setHideTextOverlay(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border shadow-2xs cursor-pointer ${
              hideTextOverlay
                ? 'bg-pink-500 border-pink-500 text-white'
                : 'bg-white hover:bg-pink-50 border-pink-200 text-[#4A3B43]'
            }`}
            title={hideTextOverlay ? 'Texte masqué sur la toile (cliquez pour afficher)' : 'Masquer le texte sur la toile (Mode Pro / YouTube)'}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sans Texte</span>
          </button>

          {/* YouTube Clean Screen Mode Toggle */}
          <button
            onClick={() => {
              setIsCleanScreenMode(true);
              setHideTextOverlay(true);
            }}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white shadow-xs cursor-pointer"
            title="Passer en plein écran d'enregistrement YouTube (Sans Texte, Toile Maximisée)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Plein Écran YouTube</span>
          </button>

          {/* Collapse/Expand Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className={`p-1.5 rounded-full border transition-all active:scale-95 cursor-pointer hidden md:flex ${
              isSidebarCollapsed
                ? 'bg-pink-100 border-pink-300 text-pink-700'
                : 'bg-white border-pink-200 text-[#7A6872] hover:bg-pink-50'
            }`}
            title={isSidebarCollapsed ? 'Afficher la barre latérale' : 'Agrandir la zone de coloriage (masquer barre)'}
          >
            {isSidebarCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>
      )}

      {/* Mode Anglais Kids Educational Status Ribbon */}
      {studioConfig.englishLearning?.enabled && !isCleanScreenMode && (
        <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-amber-100 border-b border-purple-200 px-3 sm:px-6 py-2 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <span className="text-base sm:text-lg">🍎</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-extrabold text-purple-950">Mode Anglais Kids :</span>
              <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md font-black tracking-widest text-[11px] shadow-xs">
                {studioConfig.englishLearning.targetWord}
              </span>
              <span className="text-purple-800 font-semibold hidden sm:inline">
                • Élément : « {studioConfig.englishLearning.objectPhrase} »
              </span>
              <span className="text-pink-700 font-bold hidden md:inline">
                • Épellation : {studioConfig.englishLearning.spellingLetters.join(' - ')}
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-white/70 rounded-full text-purple-700 font-bold border border-purple-200">
                {studioConfig.englishLearning.voiceAccent === 'en-GB' ? '🇬🇧 UK' : '🇺🇸 US'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEnglishModal(true)}
              className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-purple-800 text-[11px] font-extrabold border border-purple-300 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>✏️</span>
              <span>Changer mot / voix</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Controls for YouTube Clean Screen Mode */}
      {isCleanScreenMode && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          {!isPlaying ? (
            <button
              onClick={() => handleStartColoring(true)}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold rounded-full shadow-xl flex items-center gap-2 text-xs hover:from-pink-600 hover:to-rose-600 active:scale-95 cursor-pointer transition-all border border-pink-300"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Démarrer Coloriage & REC</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-pink-200">
              <button
                onClick={handlePauseResume}
                className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#4A3B43] font-bold rounded-full text-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                {isPaused ? <Play className="w-3 h-3 fill-current text-pink-600" /> : <Pause className="w-3 h-3 text-pink-600" />}
                <span>{isPaused ? 'Reprendre' : 'Pause'}</span>
              </button>
              <button
                onClick={handleStopAndFinish}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-full text-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <StopCircle className="w-3 h-3" />
                <span>Terminer</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsCleanScreenMode(false)}
            className="px-3 py-2 bg-white/95 hover:bg-white text-[#4A3B43] rounded-full shadow-xl border border-pink-200 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-all active:scale-95"
            title="Quitter le plein écran YouTube"
          >
            <Minimize2 className="w-3.5 h-3.5 text-pink-500" />
            <span className="hidden sm:inline">Quitter Plein Écran</span>
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE / CANVAS STAGE */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Visual Stage with Canvas and Embedded Kawaii Stylus */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-b from-[#FFF8F5] via-[#FFF3F6] to-[#FCEEF2] overflow-y-auto select-none">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#F5D8E2 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Top English Learning Voice Bar (Unified Voice, Visible Controls & Video Audio Sync) */}
          {studioConfig.englishLearning?.enabled && !isCleanScreenMode && (
            <div className="w-full max-w-2xl mb-2 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 rounded-2xl p-2 sm:p-2.5 border-2 border-purple-200/90 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs z-30">
              <div className="flex items-center gap-2">
                <span className="text-xl p-1 bg-white rounded-xl shadow-xs">🎓</span>
                <div>
                  <div className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                    <span>Apprentissage Anglais :</span>
                    <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full font-black tracking-wider text-[11px]">
                      {studioConfig.englishLearning.targetWord}
                    </span>
                    <span className="text-[10px] bg-white border border-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
                      {studioConfig.englishLearning.voiceAccent === 'en-GB' ? '🇬🇧 UK' : '🇺🇸 US'}
                    </span>
                  </div>
                  <div className="text-[10px] text-purple-800 font-medium truncate max-w-xs sm:max-w-md">
                    {studioConfig.englishLearning.objectPhrase || `Apprenez à épeler ${studioConfig.englishLearning.targetWord}`}
                  </div>
                </div>
              </div>

              {/* Voice Selector & Test Button directly accessible */}
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-purple-200 shadow-2xs">
                  <Mic className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[10px] font-bold text-gray-500">Voix :</span>
                  <select
                    value={studioConfig.englishLearning.selectedVoiceName || 'Puck'}
                    onChange={e => {
                      const nextVoice = e.target.value;
                      const updated = { ...studioConfig.englishLearning!, selectedVoiceName: nextVoice };
                      updateStudioConfig({ englishLearning: updated });
                      englishVoiceEngine.precacheForConfig(updated);
                    }}
                    className="text-xs font-black text-purple-950 bg-transparent focus:outline-none cursor-pointer"
                    title="Sélectionner la voix studio unique pour l'objet et chaque lettre"
                  >
                    <option value="Puck">🌟 Puck (Joyeux)</option>
                    <option value="Zephyr">🍃 Zephyr (Doux)</option>
                    <option value="Kore">✨ Kore (Lumineux)</option>
                    <option value="Fenrir">🐾 Fenrir (Profond)</option>
                    <option value="Charon">🌙 Charon (Calme)</option>
                  </select>
                </div>

                <button
                  onClick={handleTestActiveVoice}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="Écouter un aperçu de la voix active"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Tester 🔊</span>
                </button>

                <button
                  onClick={() => setShowEnglishModal(true)}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="Personnaliser le mot, les phrases et les réglages"
                >
                  <span>Gérer ⚙️</span>
                </button>

                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200" title="Cette voix est automatiquement enregistrée et audible dans votre vidéo">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Voix dans vidéo ✅</span>
                </span>
              </div>
            </div>
          )}

          {/* Interactive Mode & Click Coloring Action Bar */}
          {!isCleanScreenMode && (
            <div className="w-full max-w-2xl mb-2 bg-white/95 backdrop-blur-md rounded-2xl px-3 py-1.5 border border-pink-200/90 shadow-sm flex flex-wrap items-center justify-between gap-2 z-30">
              {/* Mode Toggle: Au Clic vs Auto */}
              <div className="flex items-center bg-gray-100/80 p-0.5 rounded-xl border border-gray-200">
                <button
                  onClick={() => setControlMode('click')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    controlMode === 'click'
                      ? 'bg-pink-500 text-white shadow-2xs font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Vous organisez ce qui se colorie : cliquez sur la toile ou sur une lettre pour colorier et entendre la voix !"
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>Mode au Clic 👆</span>
                </button>
                <button
                  onClick={() => setControlMode('auto')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    controlMode === 'auto'
                      ? 'bg-pink-500 text-white shadow-2xs font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Le robot colorie automatiquement toutes les zones du dessin"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Mode Auto ⚡</span>
                </button>
              </div>

              {/* Action Buttons in Click Mode */}
              {controlMode === 'click' ? (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {/* Step 1: Main Element Button */}
                  {studioConfig.englishLearning?.enabled && (
                    <button
                      onClick={handleColorMainElement}
                      disabled={isPlaying}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs ${
                        isElementCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white ring-2 ring-pink-300 ring-offset-1 animate-pulse'
                      }`}
                      title="1. Cliquer sur l'élément principal pour colorier le dessin et dire la phrase éducative"
                    >
                      <span>🍎 1. Élément</span>
                      {isElementCompleted ? <span className="text-emerald-700 font-black">✓</span> : <span className="text-[10px]">👆</span>}
                    </button>
                  )}

                  {/* Steps 2+: Letter Quick Buttons */}
                  {studioConfig.englishLearning?.enabled &&
                    studioConfig.englishLearning.spellingLetters.map((l, lIdx) => {
                      const isDone = completedLetterIndices.has(lIdx);
                      const isNext = isElementCompleted && !isDone && (lIdx === 0 || completedLetterIndices.has(lIdx - 1));
                      const isGlowing =
                        isAllCelebrationGlow ||
                        (currentSpokenLetterIndex !== null && currentSpokenLetterIndex !== undefined && currentSpokenLetterIndex >= 0
                          ? currentSpokenLetterIndex === lIdx
                          : currentSpokenLetter === l);

                      return (
                        <button
                          key={`btn-letter-${l}-${lIdx}`}
                          onClick={() => handleColorLetter(l, lIdx)}
                          disabled={isPlaying}
                          className={`px-2 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs ${
                            isGlowing
                              ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white ring-4 ring-amber-300 ring-offset-1 scale-120 z-20 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.9)]'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isNext
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white ring-2 ring-purple-300 ring-offset-1 animate-bounce'
                              : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                          }`}
                          title={`Colorier et épeler la lettre ${l}`}
                        >
                          <span>{l}</span>
                          {isGlowing ? (
                            <span className="text-[10px] animate-spin">✨</span>
                          ) : isDone ? (
                            <span className="text-emerald-700 text-[10px]">✓</span>
                          ) : null}
                        </button>
                      );
                    })}

                  {/* Next Step Button */}
                  <button
                    onClick={handleColorNextPlan}
                    disabled={isPlaying || (completePlan !== null && coloredPlanIndices.size >= completePlan.plans.length)}
                    className="px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Colorier l'étape suivante automatiquement"
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span>Suivant ➡️</span>
                  </button>

                  {/* Filmer au Clic Toggle */}
                  <button
                    onClick={handleToggleClickModeRecording}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
                    }`}
                    title={isRecording ? 'Arrêter et enregistrer la vidéo' : 'Démarrer l\'enregistrement vidéo pour filmer votre coloriage au clic'}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>{isRecording ? `REC ${formatTimer(recordingSeconds)} ⏹️` : 'Filmer au Clic 🎬'}</span>
                  </button>

                  {/* Recommencer button */}
                  <button
                    onClick={handleResetCanvas}
                    className="p-1 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer"
                    title="Réinitialiser pour recommencer depuis le début"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 italic">Le robot gère la séquence automatiquement.</span>
                </div>
              )}

              <div className="text-xs font-mono font-bold text-[#4A3B43] flex items-center gap-1.5">
                <span>Progression :</span>
                <span className="text-pink-600 font-black">{progressPercent}%</span>
                <span className="text-gray-400 text-[10px]">({coloredPlanIndices.size}/{completePlan?.plans.length || 0})</span>
              </div>
            </div>
          )}

          {/* Canvas Container with Cute Washi Tape Corners */}
          <div className="relative shadow-2xl rounded-2xl overflow-visible border-2 border-pink-200/90 bg-white z-20">
            {/* Washi Tape Corner Strip: Top Left */}
            <div className="absolute -top-3 -left-4 w-12 h-5 bg-pink-200/90 border border-pink-300/80 -rotate-45 shadow-2xs z-30 pointer-events-none rounded-2xs flex items-center justify-center overflow-hidden">
              <div className="w-full h-0.5 bg-white/70 rotate-45 scale-150" />
            </div>
            {/* Washi Tape Corner Strip: Top Right */}
            <div className="absolute -top-3 -right-4 w-12 h-5 bg-teal-200/90 border border-teal-300/80 rotate-45 shadow-2xs z-30 pointer-events-none rounded-2xs flex items-center justify-center overflow-hidden">
              <div className="w-full h-0.5 bg-white/70 -rotate-45 scale-150" />
            </div>

            <CanvasRenderer
              ref={canvasRef}
              interactive={!isPlaying}
              onCanvasClick={controlMode === 'click' ? handleCanvasClick : undefined}
              onReady={() => prepareColoringPlans()}
              overlay={
                <>
                  {cursorState.visible && (
                    <>
                      <KawaiiArtistStylus
                        x={cursorState.x}
                        y={cursorState.y}
                        canvasWidth={activePage.width}
                        canvasHeight={activePage.height}
                        color={cursorState.color}
                        brushType={cursorState.brushType}
                        isDrawing={cursorState.isDrawing}
                        pressure={cursorState.pressure}
                        tiltAngle={cursorState.tiltAngle}
                        visible={cursorState.visible}
                        stylusStyle={studioConfig.cursorStyle}
                        toolStyle={cursorState.toolStyle}
                        toolName={cursorState.toolName}
                      />
                      {/* Live Tool Indicator Pill */}
                      {!hideTextOverlay && !isCleanScreenMode && (
                        <div className="absolute top-3 right-3 z-30 pointer-events-none select-none flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full border border-pink-200/90 shadow-md animate-in fade-in zoom-in duration-200">
                          <div
                            className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs shrink-0"
                            style={{ backgroundColor: cursorState.color }}
                          />
                          <span className="text-[11px] font-extrabold text-[#4A3B43]">
                            {cursorState.toolName ||
                              (cursorState.toolStyle === 'marker'
                                ? 'Feutre Copic 💖'
                                : cursorState.toolStyle === 'pencil'
                                ? 'Crayon Bois ✏️'
                                : 'Apple Pencil ✨')}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* On-Canvas Magical Glow on the active spelling letter */}
                  {completePlan &&
                    (isAllCelebrationGlow ||
                      (currentSpokenLetterIndex !== null &&
                        currentSpokenLetterIndex !== undefined &&
                        currentSpokenLetterIndex >= 0)) &&
                    completePlan.objects
                      .filter(o => o.isTextLetter)
                      .filter(
                        (o, oIdx) =>
                          isAllCelebrationGlow ||
                          oIdx === currentSpokenLetterIndex ||
                          o.subRegions.some(r => r.spelledLetterIndex === currentSpokenLetterIndex)
                      )
                      .map(letterObj => {
                        const minX = letterObj.bounds.minX;
                        const minY = letterObj.bounds.minY;
                        const w = Math.max(30, letterObj.bounds.maxX - minX);
                        const h = Math.max(30, letterObj.bounds.maxY - minY);
                        const letter = letterObj.spelledLetter || currentSpokenLetter || '';

                        return (
                          <div
                            key={`canvas-glow-letter-${letterObj.id}`}
                            className="absolute pointer-events-none z-25 transition-all duration-300"
                            style={{
                              left: `${(minX / activePage.width) * 100}%`,
                              top: `${(minY / activePage.height) * 100}%`,
                              width: `${(w / activePage.width) * 100}%`,
                              height: `${(h / activePage.height) * 100}%`,
                            }}
                          >
                            {/* Golden pulsating aura directly around the letter */}
                            <div className="w-full h-full rounded-2xl ring-4 ring-amber-400 bg-amber-300/25 shadow-[0_0_35px_rgba(251,191,36,0.95)] animate-pulse" />
                            {/* Floating cute sparkle star tag */}
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-xl border-2 border-white animate-bounce whitespace-nowrap">
                              <span>✨</span>
                              <span>{letter}</span>
                              <span>✨</span>
                            </div>
                          </div>
                        );
                      })}
                </>
              }
            />

            {/* English Phonics & Vocabulary Floating Interactive Flashcard Overlay */}
            {studioConfig.englishLearning?.enabled && (
              <EnglishFlashcardOverlay
                config={studioConfig.englishLearning}
                currentLetter={currentSpokenLetter}
                currentLetterIndex={currentSpokenLetterIndex}
                currentElementPhrase={currentElementPhrase}
                isDrawingElement={isDrawingElement}
                isCompleted={!isPlaying && progressPercent === 100}
                isAllCelebrationGlow={isAllCelebrationGlow}
                onOpenSettings={() => setShowEnglishModal(true)}
                onLetterClick={controlMode === 'click' ? handleLetterTileClick : undefined}
                completedLetters={completedLetterIndices}
              />
            )}
          </div>

          {/* Floating Target Reference Guide */}
          {studioConfig.showMiniGuide && !isCleanScreenMode && (coloredReferenceImage || activePage.imageUrl) && (
            <div
              className={`absolute ${
                miniGuidePosition === 'top-right'
                  ? 'top-4 right-4'
                  : miniGuidePosition === 'top-left'
                  ? 'top-4 left-4'
                  : 'bottom-20 right-4'
              } z-30 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-pink-200 w-32 sm:w-44 flex flex-col animate-in fade-in transition-all`}
            >
              <div className="flex items-center justify-between pb-1 px-1 border-b border-pink-100 mb-1">
                <span className="text-[10px] font-bold text-[#4A3B43] flex items-center gap-1">
                  <Eye className="w-3 h-3 text-pink-500" />
                  <span>Modèle Couleur</span>
                </span>
                <button
                  onClick={() =>
                    setMiniGuidePosition(pos =>
                      pos === 'top-right' ? 'bottom-right' : pos === 'bottom-right' ? 'top-left' : 'top-right'
                    )
                  }
                  className="text-[9px] text-[#A2929B] hover:text-[#4A3B43] cursor-pointer"
                  title="Déplacer"
                >
                  Déplacer
                </button>
              </div>
              <img
                src={coloredReferenceImage || activePage.imageUrl}
                alt="Modèle de référence"
                className="w-full h-28 sm:h-36 object-contain rounded-xl bg-[#FAF8F8]"
              />
            </div>
          )}

          {/* Live Debug HUD Panel */}
          {showLiveDebugHud && debugInfo && (
            <div className="absolute top-4 left-4 z-30 bg-[#2C1B24]/95 text-white backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-pink-400/40 text-xs font-mono w-76 sm:w-80 space-y-1.5 animate-in fade-in select-text pointer-events-auto">
              <div className="flex items-center justify-between border-b border-white/20 pb-1.5 mb-1 font-bold text-pink-300">
                <span className="flex items-center gap-1.5">
                  <Bug className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                  <span>PLANNER DEBUG CONSOLE</span>
                </span>
                <span className="text-[10px] bg-pink-500/50 px-2 py-0.5 rounded-full text-white font-bold">
                  OBJ {debugInfo.currentObjectIndex}/{debugInfo.totalObjects}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-tight">
                <span className="text-gray-400">CURRENT OBJECT:</span>
                <span className="font-bold text-amber-300 truncate">{debugInfo.currentObjectName}</span>
                <span className="text-gray-400">CURRENT REGION:</span>
                <span className="font-semibold text-pink-200 truncate">{debugInfo.currentRegionName}</span>
                <span className="text-gray-400">NEXT REGION:</span>
                <span className="text-gray-200 truncate">{debugInfo.nextRegionName}</span>
                <span className="text-gray-400">NEXT OBJECT:</span>
                <span className="text-teal-300 truncate">{debugInfo.nextObjectName}</span>
                <span className="text-gray-400">DISTANCE TO NEXT:</span>
                <span className="text-white font-mono">{debugInfo.distanceToNext} px</span>
                <span className="text-gray-400">COLOR LOCK:</span>
                <span className="flex items-center gap-1.5 font-bold">
                  <span
                    className="w-3 h-3 rounded-full inline-block border border-white/40 shrink-0"
                    style={{ backgroundColor: debugInfo.colorLock }}
                  />
                  <span>{debugInfo.colorLock}</span>
                </span>
                <span className="text-gray-400">STROKE COLOR LOCK:</span>
                <span className={`font-bold ${debugInfo.strokeColorLock === 'ACTIVE' ? 'text-emerald-400' : 'text-gray-300'}`}>
                  {debugInfo.strokeColorLock}
                </span>
                <span className="text-gray-400">OBJECT COMPLETION:</span>
                <span className="font-bold text-pink-300">{debugInfo.objectCompletion}%</span>
              </div>
            </div>
          )}

          {/* Live Progress Bar HUD at bottom of stage during playback */}
          {isPlaying && !hideTextOverlay && !isCleanScreenMode && (
            <div className="absolute bottom-3 left-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-pink-100 shadow-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs"
                  style={{ backgroundColor: cursorState.color }}
                />
                <span className="text-xs font-bold text-[#4A3B43]">
                  Zone {currentRegionIndex} / {plans.length}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-100/90 text-[10px] font-extrabold text-[#4A3B43] flex items-center gap-1 border border-pink-200">
                  {cursorState.toolName ||
                    (cursorState.toolStyle === 'marker'
                      ? 'Feutre Copic 💖'
                      : cursorState.toolStyle === 'pencil'
                      ? 'Crayon Bois ✏️'
                      : 'Apple Pencil ✨')}
                </span>
                {studioConfig.lofiAmbience && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                    <Music className="w-2.5 h-2.5 animate-pulse" />
                    <span>
                      {studioConfig.musicPreset === 'lofi_chill'
                        ? 'Lofi Chill'
                        : studioConfig.musicPreset === 'music_box'
                        ? 'Boîte Musique'
                        : 'Jardin Zen'}
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 sm:w-56 h-2 bg-pink-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-400 to-[#E5738E] transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold font-mono text-[#4A3B43]">{progressPercent}%</span>
              </div>
            </div>
          )}

          {/* Desktop Sidebar Toggle Handle (gives full width to canvas) */}
          {!isCleanScreenMode && (
            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 z-30 w-5 h-12 bg-white/95 hover:bg-white border-y border-l border-pink-200 rounded-l-lg items-center justify-center text-pink-500 hover:text-pink-600 shadow-md cursor-pointer transition-all"
              title={isSidebarCollapsed ? 'Afficher la barre latérale' : 'Agrandir la toile (masquer la barre)'}
            >
              {isSidebarCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Director Sidebar Console */}
        <div
          className={`w-full ${
            isSidebarCollapsed || isCleanScreenMode ? 'hidden' : 'md:w-84 lg:w-96'
          } bg-white border-t md:border-t-0 md:border-l border-pink-100 flex flex-col p-3 sm:p-4 gap-3.5 overflow-y-auto max-h-[48vh] md:max-h-full transition-all duration-300`}
        >
          {/* DUAL IMAGE QUICK CARDS SECTION */}
          <div className="bg-[#FAF8F8] border border-pink-100/90 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#4A3B43] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-pink-500" />
                <span>Les 2 Images</span>
              </span>
              <button
                onClick={() => setShowDualImageModal(true)}
                className="text-[11px] font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
              >
                Gérer
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {/* Image 1: B&W Line Art */}
              <div className="bg-white p-2 rounded-xl border border-pink-100 flex flex-col items-center gap-1 shadow-2xs">
                <span className="text-[10px] font-bold text-[#4A3B43]">1. Tracé N&B</span>
                <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {activePage.imageUrl ? (
                    <img src={activePage.imageUrl} alt="N&B" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <label className="text-[10px] font-bold text-pink-600 hover:text-pink-700 cursor-pointer pt-0.5">
                  Changer N&B
                  <input
                    ref={bwFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBwUpload}
                  />
                </label>
              </div>

              {/* Image 2: Colored Reference */}
              <div className="bg-white p-2 rounded-xl border border-pink-100 flex flex-col items-center gap-1 shadow-2xs">
                <span className="text-[10px] font-bold text-[#4A3B43]">2. Modèle Couleur</span>
                <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {coloredReferenceImage ? (
                    <img src={coloredReferenceImage} alt="Couleur" className="w-full h-full object-contain" />
                  ) : (
                    <Palette className="w-6 h-6 text-pink-400" />
                  )}
                </div>
                <label className="text-[10px] font-bold text-pink-600 hover:text-pink-700 cursor-pointer pt-0.5">
                  {coloredReferenceImage ? 'Changer' : 'Importer'}
                  <input
                    ref={refFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleRefUpload}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* MAIN PLAY ACTION CONTROLS */}
          <div className="space-y-2">
            {!isPlaying ? (
              <>
                {controlMode === 'click' ? (
                  <div className="space-y-2">
                    <button
                      onClick={handleColorNextPlan}
                      disabled={completePlan !== null && coloredPlanIndices.size >= completePlan.plans.length}
                      className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                      title="Colorier la zone suivante au clic"
                    >
                      <MousePointerClick className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wide">Colorier la Zone Suivante 👆</span>
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleToggleClickModeRecording}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                            : 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>{isRecording ? `REC ${formatTimer(recordingSeconds)} ⏹️` : 'Filmer au Clic 🎬'}</span>
                      </button>

                      <button
                        onClick={() => handleStartColoring(recordWithVideo)}
                        className="py-2.5 px-3 rounded-xl text-xs font-black bg-pink-100 hover:bg-pink-200 text-pink-800 border border-pink-200 shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        title="Laisser le robot terminer automatiquement"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Mode Auto ⚡</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between px-1 text-[11px] text-[#4A3B43] font-semibold">
                      <span>💡 Cliquez sur la toile ou sur une lettre pour colorier.</span>
                      <button
                        onClick={handleResetCanvas}
                        className="text-gray-500 hover:text-red-500 underline text-[10px] cursor-pointer"
                      >
                        Effacer
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartColoring(true)}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E5738E] via-[#E86785] to-[#D65F7B] hover:opacity-95 text-white font-extrabold rounded-2xl shadow-lg shadow-pink-300/50 flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span className="text-sm">COMMENCER LE COLORIAGE AUTO ⚡</span>
                    </button>
                    <div className="flex items-center justify-between px-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#4A3B43]">
                        <input
                          type="checkbox"
                          checked={recordWithVideo}
                          onChange={e => setRecordWithVideo(e.target.checked)}
                          className="rounded accent-pink-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Enregistrer la vidéo Ultra HD</span>
                      </label>
                      <span className="text-[10px] text-[#8E7C85]">{studioConfig.resolution.toUpperCase()}</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseResume}
                  className="flex-1 py-3 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer"
                >
                  {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? 'Reprendre' : 'Pause'}</span>
                </button>
                <button
                  onClick={handleStopAndFinish}
                  className="flex-1 py-3 px-3 bg-[#4A3B43] hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer"
                >
                  <StopCircle className="w-4 h-4 text-red-400" />
                  <span>Arrêter & Exporter</span>
                </button>
              </div>
            )}
          </div>

          {/* Reset Canvas Button */}
          <button
            onClick={handleResetCanvas}
            className="w-full py-1.5 text-xs text-[#7A6872] hover:text-[#4A3B43] hover:bg-pink-50 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Effacer et réinitialiser à blanc</span>
          </button>

          {/* DIRECTOR CONFIGURATION SETTINGS */}
          <div className="bg-[#FAF8F8] border border-pink-100 rounded-2xl p-3 space-y-3">
            <h4 className="text-xs font-bold text-[#4A3B43] flex items-center gap-1.5 border-b border-pink-100/70 pb-1.5">
              <Sliders className="w-3.5 h-3.5 text-pink-500" />
              <span>Réglages Vidéo & ASMR</span>
            </h4>

            {/* Speed Multiplier */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1 font-semibold text-[#4A3B43]">
                <span>Vitesse de coloriage :</span>
                <span className="font-bold text-pink-600">{studioConfig.speed}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.5, 1, 2, 4].map(spd => (
                  <button
                    key={spd}
                    onClick={() => {
                      updateStudioConfig({ speed: spd });
                      if (botPlayerRef.current) botPlayerRef.current.setSpeed(spd);
                    }}
                    className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      studioConfig.speed === spd
                        ? 'bg-pink-500 text-white shadow-2xs'
                        : 'bg-white border border-pink-100 text-[#7A6872] hover:bg-pink-50'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Coloring Style */}
            <div>
              <div className="text-[11px] mb-1 font-semibold text-[#4A3B43]">Technique d'application :</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    updateStudioConfig({ coloringStyle: 'strokes' });
                    if (botPlayerRef.current) botPlayerRef.current.setStyle('strokes');
                    setTimeout(() => prepareColoringPlans(), 30);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    studioConfig.coloringStyle === 'strokes'
                      ? 'bg-white border-pink-400 text-pink-600 shadow-2xs font-extrabold'
                      : 'bg-white/60 border-pink-100 text-[#7A6872] hover:bg-white'
                  }`}
                  title="Toutes les zones sont coloriées par des hachures d'artiste continues au trait"
                >
                  ✏️ Hachures d'Artiste (100% Traits)
                </button>
                <button
                  onClick={() => {
                    updateStudioConfig({ coloringStyle: 'bloom' });
                    if (botPlayerRef.current) botPlayerRef.current.setStyle('bloom');
                    setTimeout(() => prepareColoringPlans(), 30);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    studioConfig.coloringStyle === 'bloom'
                      ? 'bg-white border-pink-400 text-pink-600 shadow-2xs font-extrabold'
                      : 'bg-white/60 border-pink-100 text-[#7A6872] hover:bg-white'
                  }`}
                  title="Toutes les zones sont remplies par balayage d'encre doux (Bloom)"
                >
                  🌸 Remplissage Bloom (100% Sweep)
                </button>
              </div>
            </div>

            {/* Outil & Médium Constant (Never Changes!) */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1 font-semibold text-[#4A3B43]">
                <span>Médium & Outil constant :</span>
                <span className="text-[10px] text-pink-600 font-bold">
                  {studioConfig.brushType === 'marker'
                    ? '💖 Feutre Copic'
                    : studioConfig.brushType === 'colored_pencil'
                    ? '✏️ Crayon Bois'
                    : studioConfig.brushType === 'pencil'
                    ? '✨ Apple Pencil'
                    : studioConfig.brushType === 'crayon'
                    ? '🖍️ Crayon Doux'
                    : '🎨 Aquarelle'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'marker' as const, label: '💖 Feutre Copic' },
                  { id: 'colored_pencil' as const, label: '✏️ Crayon Bois' },
                  { id: 'pencil' as const, label: '✨ Apple Pencil' },
                  { id: 'crayon' as const, label: '🖍️ Crayon Doux' },
                  { id: 'watercolor' as const, label: '🎨 Aquarelle' },
                ].map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      updateStudioConfig({ brushType: tool.id });
                      setTimeout(() => prepareColoringPlans(), 30);
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer truncate ${
                      (studioConfig.brushType || 'marker') === tool.id
                        ? 'bg-pink-500 border-pink-500 text-white shadow-xs'
                        : 'bg-white border-pink-100 text-[#7A6872] hover:bg-pink-50'
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
              <p className="text-[9.5px] text-[#8E7C85] mt-1 font-medium">
                🔒 Style 100% constant : l'outil sélectionné est conservé pour l'ensemble du coloriage.
              </p>
            </div>

            {/* Stylus Cursor & Tool Switching */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1 font-semibold text-[#4A3B43]">
                <span>Outil & Stylet actif :</span>
                <span className="text-[10px] text-pink-600 font-bold">
                  {studioConfig.cursorStyle === 'auto'
                    ? '✨ Auto Dynamique'
                    : studioConfig.cursorStyle === 'marker'
                    ? '🖍️ Feutre'
                    : studioConfig.cursorStyle === 'pencil'
                    ? '✏️ Crayon'
                    : '🖊️ Stylus'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'auto', label: '✨ Auto', hint: 'Alterne Feutre + Crayon + Apple Pencil' },
                    { id: 'marker', label: '🖍️ Feutre', hint: 'Feutre Copic à alcool' },
                    { id: 'pencil', label: '✏️ Crayon', hint: 'Crayon de bois Faber' },
                    { id: 'stylus', label: '🖊️ Stylus', hint: 'Apple Pencil digital' },
                  ] as const
                ).map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      updateStudioConfig({ cursorStyle: item.id });
                      if (botPlayerRef.current) {
                        botPlayerRef.current.setCursorStyle(item.id);
                      }
                      soundEngine.playToolSwitchSound(
                        item.id === 'auto' ? 'marker' : (item.id as 'marker' | 'pencil' | 'stylus')
                      );
                    }}
                    title={item.hint}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      studioConfig.cursorStyle === item.id
                        ? 'bg-pink-500 text-white shadow-2xs'
                        : 'bg-white border border-pink-100 text-[#7A6872] hover:bg-pink-50'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Resolution & Aspect Ratio */}
            <div className="pt-1 border-t border-pink-100/60 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="block text-[10px] font-semibold text-[#7A6872] mb-0.5">Format Vidéo :</label>
                <select
                  value={studioConfig.aspectRatio}
                  onChange={e => updateStudioConfig({ aspectRatio: e.target.value as any })}
                  className="w-full bg-white border border-pink-100 rounded-lg py-1 px-1.5 text-xs text-[#4A3B43] font-semibold cursor-pointer"
                >
                  <option value="16:9">16:9 (YouTube Standard)</option>
                  <option value="9:16">9:16 (Shorts / TikTok)</option>
                  <option value="1:1">1:1 (Carré Instagram)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#7A6872] mb-0.5">Résolution :</label>
                <select
                  value={studioConfig.resolution}
                  onChange={e => updateStudioConfig({ resolution: e.target.value as any })}
                  className="w-full bg-white border border-pink-100 rounded-lg py-1 px-1.5 text-xs text-[#4A3B43] font-semibold cursor-pointer"
                >
                  <option value="1080p">1080p Full HD</option>
                  <option value="4k">4K Ultra HD</option>
                  <option value="720p">720p HD</option>
                </select>
              </div>
            </div>

            {/* Audio & Relaxing Music Controls */}
            <div className="pt-2 border-t border-pink-100/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#4A3B43] font-semibold">
                  <Volume2 className="w-3.5 h-3.5 text-pink-500" />
                  <span>Bruitages ASMR</span>
                  <input
                    type="checkbox"
                    checked={studioConfig.asmrSound}
                    onChange={e => updateStudioConfig({ asmrSound: e.target.checked })}
                    className="accent-pink-500 ml-1 cursor-pointer"
                  />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#4A3B43] font-semibold">
                  <Music className="w-3.5 h-3.5 text-pink-500" />
                  <span>Musique Relaxante</span>
                  <input
                    type="checkbox"
                    checked={studioConfig.lofiAmbience}
                    onChange={e => {
                      const enabled = e.target.checked;
                      updateStudioConfig({ lofiAmbience: enabled });
                      if (isPlaying) {
                        if (enabled) {
                          soundEngine.startRelaxingMusic(studioConfig.musicPreset, studioConfig.musicVolume);
                        } else {
                          soundEngine.stopRelaxingMusic();
                        }
                      }
                    }}
                    className="accent-pink-500 ml-1 cursor-pointer"
                  />
                </label>
              </div>

              {studioConfig.lofiAmbience && (
                <div className="p-2.5 bg-pink-50/70 rounded-xl border border-pink-100 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] text-[#503E48] font-bold">
                    <span>Thème relaxant :</span>
                    <select
                      value={studioConfig.musicPreset}
                      onChange={e => {
                        const preset = e.target.value as MusicPreset;
                        updateStudioConfig({ musicPreset: preset });
                        soundEngine.setMusicPreset(preset);
                      }}
                      className="bg-white border border-pink-200 rounded-md px-1.5 py-0.5 text-[11px] text-[#4A3B43] font-semibold shadow-2xs cursor-pointer"
                    >
                      <option value="lofi_chill">☕ Lofi Bedroom Chill</option>
                      <option value="music_box">⭐ Boîte à Musique</option>
                      <option value="zen_pad">🍃 Jardin Zen & Spa</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#503E48]">
                    <span>Volume musique : {Math.round(studioConfig.musicVolume * 100 * 2.5)}%</span>
                    <input
                      type="range"
                      min="0.04"
                      max="0.36"
                      step="0.02"
                      value={studioConfig.musicVolume}
                      onChange={e => {
                        const vol = parseFloat(e.target.value);
                        updateStudioConfig({ musicVolume: vol });
                        soundEngine.setMusicVolume(vol);
                      }}
                      className="w-24 accent-pink-500 h-1 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Fill Sound Selector */}
              <div className="p-2.5 bg-gradient-to-r from-pink-50/90 to-rose-50/70 rounded-xl border border-pink-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A3B43]">
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    <span>Son de Remplissage :</span>
                  </div>
                  <button
                    onClick={() => setShowFillSoundModal(true)}
                    className="text-[10px] font-bold text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 px-2.5 py-1 rounded-full shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Ouvrir le comparateur interactif des 8 sons doux pour enfants"
                  >
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span>8 Sons Mignons ✨</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {FILL_SOUND_PRESETS.map(p => {
                    const isSelected = (studioConfig.fillSoundPreset || 'bubble_sparkle') === p.id;
                    const isPlayingThis = testingPresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          updateStudioConfig({ fillSoundPreset: p.id });
                          soundEngine.setFillSoundPreset(p.id);
                          handleTestFillSound(p.id);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left flex items-center justify-between gap-1 shadow-2xs cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-pink-500 text-white ring-1 ring-pink-400'
                            : 'bg-white border border-pink-100 text-[#4A3B43] hover:bg-pink-50/80'
                        }`}
                        title={p.description}
                      >
                        <span className="truncate flex items-center gap-1">
                          <span>{p.emoji}</span>
                          <span className="truncate">{p.name.split(' ')[0]}</span>
                        </span>
                        <Play className={`w-2.5 h-2.5 shrink-0 ${isPlayingThis ? 'fill-current animate-ping' : isSelected ? 'fill-white' : 'fill-pink-400'}`} />
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={studioConfig.fillSoundPreset || 'bubble_sparkle'}
                    onChange={e => {
                      const preset = e.target.value as FillSoundPreset;
                      updateStudioConfig({ fillSoundPreset: preset });
                      soundEngine.setFillSoundPreset(preset);
                      handleTestFillSound(preset);
                    }}
                    className="flex-1 bg-white border border-pink-200 rounded-lg px-2 py-1 text-[11px] text-[#4A3B43] font-bold shadow-2xs cursor-pointer truncate"
                  >
                    {FILL_SOUND_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.name} ({p.tag})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleTestFillSound(studioConfig.fillSoundPreset || 'bubble_sparkle')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                      testingPresetId === (studioConfig.fillSoundPreset || 'bubble_sparkle')
                        ? 'bg-pink-600 scale-105'
                        : 'bg-pink-500 hover:bg-pink-600'
                    }`}
                    title="Écouter le son actif"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Tester</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#8E7C85] italic truncate">
                  {FILL_SOUND_PRESETS.find(p => p.id === (studioConfig.fillSoundPreset || 'bubble_sparkle'))?.description}
                </p>
              </div>

              {/* English Learning Mode Shortcut */}
              <div className="p-3 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 rounded-xl border border-purple-200 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎓</span>
                  <div>
                    <div className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                      <span>Mode Anglais Kids Phonics</span>
                      {studioConfig.englishLearning?.enabled && (
                        <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                          {studioConfig.englishLearning.targetWord}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-purple-700">
                      Coloriez l'élément et épelez le texte lettre par lettre avec voix anglaise.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowEnglishModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  {studioConfig.englishLearning?.enabled ? 'Configurer ✏️' : 'Activer 🔊'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DUAL IMAGE MODAL */}
      {showDualImageModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-pink-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-2xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#4A3B43]">
                    Configuration des 2 Images du Studio
                  </h3>
                  <p className="text-xs text-[#8E7C85]">
                    1 Image Noir & Blanc à colorier + 1 Référence Couleur modèle
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDualImageModal(false)}
                className="p-1.5 text-[#7A6872] hover:bg-pink-50 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DUAL CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* CARD 1: IMAGE NOIR ET BLANC */}
              <div className="bg-[#FAF8F8] border-2 border-dashed border-gray-200 rounded-2xl p-3 flex flex-col items-center text-center space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-[10px] font-extrabold text-[#4A3B43]">
                  IMAGE 1 • NOIR & BLANC
                </span>
                <div className="w-full h-36 bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden p-2">
                  {activePage.imageUrl ? (
                    <img src={activePage.imageUrl} alt="Line art" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="text-xs text-[#8E7C85]">Tracé vectoriel actif</div>
                  )}
                </div>
                <div className="text-[11px] text-[#7A6872]">
                  <p className="font-bold text-[#4A3B43] truncate max-w-[200px]">{activePage.title}</p>
                  <p className="text-[10px]">
                    {activePage.width} × {activePage.height}px • 100% Intact
                  </p>
                </div>
                <label className="w-full py-2 px-3 bg-white hover:bg-pink-50 border border-pink-200 text-xs font-bold text-[#4A3B43] rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-pink-500" />
                  <span>Importer votre image N&B</span>
                  <input
                    ref={bwFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBwUpload}
                  />
                </label>
                {/* Built-in Coloring Pages list selector */}
                <div className="w-full pt-1 border-t border-gray-200/60">
                  <label className="block text-[10px] text-[#8E7C85] text-left mb-1 font-semibold">
                    Ou choisir un dessin :
                  </label>
                  <select
                    value={activePage.id}
                    onChange={e => {
                      const p = COLORING_PAGES.find(cp => cp.id === e.target.value);
                      if (p) setActivePage(p);
                    }}
                    className="w-full text-xs bg-white border border-gray-200 rounded-lg p-1.5 text-[#4A3B43] cursor-pointer"
                  >
                    {COLORING_PAGES.map(cp => (
                      <option key={cp.id} value={cp.id}>
                        {cp.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CARD 2: IMAGE REFERENCE COULEUR */}
              <div className="bg-[#FAF8F8] border-2 border-dashed border-pink-200 rounded-2xl p-3 flex flex-col items-center text-center space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-[10px] font-extrabold text-pink-700">
                  IMAGE 2 • RÉFÉRENCE COULEUR
                </span>
                <div className="w-full h-36 bg-white rounded-xl border border-pink-100 flex items-center justify-center overflow-hidden p-2">
                  {coloredReferenceImage ? (
                    <img
                      src={coloredReferenceImage}
                      alt="Référence"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-3 text-[#A2929B] text-xs">
                      <Palette className="w-8 h-8 text-pink-300 mx-auto mb-1" />
                      <span>Aucune image modèle importée</span>
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-[#7A6872]">
                  <p className="font-bold text-[#4A3B43]">
                    {coloredReferenceImage ? 'Guide couleurs personnalisé' : 'Palette Kawaii par défaut'}
                  </p>
                  <p className="text-[10px]">Les couleurs seront échantillonnées zone par zone</p>
                </div>
                <label className="w-full py-2 px-3 bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-95 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span>Importer la référence coloriée</span>
                  <input
                    ref={refFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleRefUpload}
                  />
                </label>
                {/* Preset kawaii palettes if no reference file yet */}
                <div className="w-full pt-1 border-t border-pink-200/60">
                  <label className="block text-[10px] text-[#8E7C85] text-left mb-1 font-semibold">
                    Ou choisir une harmonie couleur :
                  </label>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {PRESET_COLOR_GUIDES.map((guide, idx) => (
                      <button
                        key={guide.name}
                        onClick={() => setSelectedPresetGuideIndex(idx)}
                        className={`p-1 rounded-lg border text-left transition-all cursor-pointer ${
                          selectedPresetGuideIndex === idx
                            ? 'bg-pink-50 border-pink-300 font-bold text-pink-700'
                            : 'bg-white border-gray-200 text-[#7A6872]'
                        }`}
                      >
                        <div className="truncate">{guide.name}</div>
                        <div className="flex gap-0.5 mt-0.5">
                          {guide.swatches.slice(0, 4).map((c, i) => (
                            <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Validation footer */}
            <div className="pt-2 border-t border-pink-100 flex items-center justify-between">
              <span className="text-xs text-[#8E7C85]">
                {plans.length} zones détectées pour le coloriage
              </span>
              <button
                onClick={() => setShowDualImageModal(false)}
                className="py-2 px-5 bg-[#4A3B43] hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Valider & Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. EXPORT & HD IMAGE / VIDEO DOWNLOAD MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-pink-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-2xl shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#4A3B43]">
                    Coloriage Finalisé • Export Haute Définition ✨
                  </h3>
                  <p className="text-xs text-[#8E7C85]">
                    {activePage.title} • Image HD prête à être téléchargée
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1.5 text-[#7A6872] hover:bg-pink-50 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1: HIGH HD QUALITY COLORED IMAGE DOWNLOAD */}
            <div className="bg-[#FAF5F7] border border-pink-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-pink-600" />
                  <span className="text-xs sm:text-sm font-extrabold text-[#4A3B43]">
                    Image Coloriée Haute Qualité (PNG)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  Sans Perte • 100% Net
                </span>
              </div>

              {/* Finished Image Preview */}
              <div className="w-full h-52 bg-white rounded-xl border border-pink-100 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                {finishedHdImage ? (
                  <img
                    src={finishedHdImage}
                    alt="Illustration coloriée HD"
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-xs text-[#8E7C85] flex flex-col items-center gap-1">
                    <Sparkles className="w-6 h-6 text-pink-400" />
                    <span>Génération du rendu Haute Définition...</span>
                  </div>
                )}
              </div>

              {/* Quality Selection Tabs */}
              <div>
                <label className="block text-[11px] font-bold text-[#4A3B43] mb-1.5">
                  Choisir la résolution de téléchargement :
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setSelectedImageQuality('4k')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedImageQuality === '4k'
                        ? 'bg-white border-pink-500 shadow-xs ring-2 ring-pink-400/30'
                        : 'bg-white/70 border-gray-200 hover:bg-white text-[#7A6872]'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-[#4A3B43]">🌟 4K Ultra HD</div>
                    <div className="text-[10px] text-pink-600 font-bold">
                      {activePage.width * 4} × {activePage.height * 4}px
                    </div>
                    <div className="text-[9px] text-[#8E7C85]">Qualité Maximale</div>
                  </button>

                  <button
                    onClick={() => setSelectedImageQuality('2k')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedImageQuality === '2k'
                        ? 'bg-white border-pink-500 shadow-xs ring-2 ring-pink-400/30'
                        : 'bg-white/70 border-gray-200 hover:bg-white text-[#7A6872]'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-[#4A3B43]">✨ 2K Quad HD</div>
                    <div className="text-[10px] text-pink-600 font-bold">
                      {activePage.width * 2} × {activePage.height * 2}px
                    </div>
                    <div className="text-[9px] text-[#8E7C85]">Réseaux Sociaux</div>
                  </button>

                  <button
                    onClick={() => setSelectedImageQuality('original')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedImageQuality === 'original'
                        ? 'bg-white border-pink-500 shadow-xs ring-2 ring-pink-400/30'
                        : 'bg-white/70 border-gray-200 hover:bg-white text-[#7A6872]'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-[#4A3B43]">🌸 HD Natif</div>
                    <div className="text-[10px] text-pink-600 font-bold">
                      {activePage.width} × {activePage.height}px
                    </div>
                    <div className="text-[9px] text-[#8E7C85]">Format Original</div>
                  </button>
                </div>
              </div>

              {/* Primary Image Download Action Button */}
              <button
                onClick={() => handleDownloadHdImage(selectedImageQuality)}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>
                  Télécharger l'Image Coloriée en{' '}
                  {selectedImageQuality === '4k'
                    ? '4K Ultra HD (PNG)'
                    : selectedImageQuality === '2k'
                    ? '2K Quad HD (PNG)'
                    : 'HD Natif (PNG)'}
                </span>
              </button>
            </div>

            {/* SECTION 2: VIDEO DOWNLOAD (IF RECORDED) */}
            {recordedVideo && (
              <div className="bg-[#FAF8F8] border border-pink-200/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-pink-600" />
                    <span className="text-xs sm:text-sm font-extrabold text-[#4A3B43]">
                      Vidéo Coloriage ASMR Ultra HD
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8E7C85] font-semibold">
                    {recordedVideo.resolutionText} • {Math.round(recordedVideo.durationMs / 1000)}s
                  </span>
                </div>

                {/* Video Player Preview */}
                <div className="rounded-xl overflow-hidden border border-pink-200 bg-black shadow-inner">
                  <video
                    ref={videoPlayerRef}
                    src={recordedVideo.url}
                    controls
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="w-full max-h-56 object-contain mx-auto"
                  />
                </div>

                {/* Direct Video Download Button */}
                <a
                  href={recordedVideo.url}
                  download={`kawaii-coloring-asmr-${activePage.id}-${Date.now()}.webm`}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-95 text-white font-extrabold rounded-xl shadow-md shadow-pink-300/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer text-xs sm:text-sm"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Télécharger la Vidéo (YouTube / TikTok)</span>
                </a>

                {/* YouTube Metadata Helper */}
                <div className="bg-white border border-pink-100 rounded-xl p-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#4A3B43]">
                    <span>Titre YouTube suggéré :</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(youtubeTitle);
                        setCopiedTitle(true);
                        setTimeout(() => setCopiedTitle(false), 2000);
                      }}
                      className="text-[11px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedTitle ? 'Copié !' : 'Copier Titre'}</span>
                    </button>
                  </div>
                  <p className="p-1.5 bg-[#FAF8F8] rounded-lg border border-pink-100 text-[#4A3B43] font-medium text-[11px]">
                    {youtubeTitle}
                  </p>

                  <div className="flex items-center justify-between font-bold text-[#4A3B43] pt-1">
                    <span>Description & Tags ASMR :</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(youtubeDescription);
                        setCopiedDesc(true);
                        setTimeout(() => setCopiedDesc(false), 2000);
                      }}
                      className="text-[11px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedDesc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDesc ? 'Copié !' : 'Copier Description'}</span>
                    </button>
                  </div>
                  <div className="p-1.5 bg-[#FAF8F8] rounded-lg border border-pink-100 text-[#7A6872] max-h-20 overflow-y-auto text-[10px] whitespace-pre-line">
                    {youtubeDescription}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowExportModal(false)}
                className="py-2 px-5 bg-gray-100 hover:bg-gray-200 text-[#4A3B43] text-xs font-bold rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SHOW COLORING PLAN MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-pink-100 space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-pink-100 text-pink-600 rounded-2xl">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#4A3B43]">
                    Plan Complet de Coloriage Pré-calculé (Debug)
                  </h3>
                  <p className="text-xs text-[#8E7C85]">
                    Séquence 100% déterministe • Objet par objet • Zéro saut aléatoire
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1.5 text-[#7A6872] hover:bg-pink-50 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plan Statistics & Quick Toggles */}
            <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-rose-50 p-3 rounded-2xl border border-pink-100/90 text-xs text-[#4A3B43]">
              <div className="flex items-center gap-3">
                <span className="font-bold">
                  {completePlan ? completePlan.totalObjects : 0} Objets
                </span>
                <span className="text-gray-300">•</span>
                <span className="font-bold">
                  {completePlan ? completePlan.totalSubRegions : 0} Sous-régions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLiveDebugHud(prev => !prev)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                    showLiveDebugHud
                      ? 'bg-pink-500 text-white border-pink-500 shadow-2xs'
                      : 'bg-white text-[#7A6872] border-pink-200 hover:bg-pink-50'
                  }`}
                >
                  <Bug className="w-3 h-3" />
                  <span>HUD Direct : {showLiveDebugHud ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Objects & Regions Sequential Hierarchy */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {completePlan && completePlan.objects.length > 0 ? (
                completePlan.objects.map((obj, oIdx) => (
                  <div
                    key={obj.id}
                    className="bg-[#FAF8F8] border border-pink-100 rounded-2xl p-3.5 hover:border-pink-300 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#4A3B43] text-white text-[10px] font-extrabold rounded-md font-mono">
                          OBJECT {String(oIdx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-extrabold text-[#4A3B43]">{obj.name}</span>
                        <span className="text-[10px] text-[#8E7C85] bg-white px-2 py-0.5 rounded-full border border-pink-100 capitalize">
                          {obj.category}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-pink-600 bg-pink-100/70 px-2 py-0.5 rounded-full">
                        {obj.subRegions.length} zones
                      </span>
                    </div>

                    {/* Target Colors for this object */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[#7A6872] font-semibold">Couleurs verrouillées :</span>
                      {obj.targetColors.map(c => (
                        <span
                          key={c}
                          className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-pink-100 text-[10px] font-mono shadow-2xs"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block"
                            style={{ backgroundColor: c }}
                          />
                          <span>{c}</span>
                        </span>
                      ))}
                    </div>

                    {/* Sequential Subregions within this object */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                      {obj.subRegions.map(sub => (
                        <div
                          key={sub.id}
                          className="bg-white p-1.5 rounded-xl border border-pink-100/70 flex items-center justify-between shadow-2xs"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: sub.color }}
                            />
                            <span className="font-semibold text-[#4A3B43] truncate">
                              Zone #{sub.id}
                            </span>
                          </span>
                          <span className="text-[9px] text-[#A2929B] font-mono shrink-0 ml-1">
                            {sub.method === 'bucket'
                              ? 'Remplissage'
                              : sub.method === 'detail_small'
                              ? 'Détail'
                              : 'Feutre'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-sm text-[#8E7C85]">
                  Calcul du plan complet en cours...
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-pink-100">
              <span className="text-[11px] text-[#8E7C85]">
                Ce plan complet est calculé avant la lecture et suivi à la lettre.
              </span>
              <button
                onClick={() => setShowPlanModal(false)}
                className="py-2 px-5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL COMPARATEUR DES 8 SONS DE REMPLISSAGE */}
      {showFillSoundModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-pink-100 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-gradient-to-tr from-pink-500 to-rose-400 text-white rounded-2xl shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#4A3B43] flex items-center gap-2">
                    <span>Sons de Remplissage Automatique</span>
                    <span className="text-xs font-bold text-pink-600 bg-pink-100 px-2.5 py-0.5 rounded-full">
                      Kids & ASMR
                    </span>
                  </h3>
                  <p className="text-xs text-[#8E7C85]">
                    Écoutez, comparez et choisissez l'effet sonore idéal pour le remplissage des formes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFillSoundModal(false)}
                className="p-1.5 text-[#7A6872] hover:bg-pink-50 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FILL_SOUND_PRESETS.map(preset => {
                  const isSelected = (studioConfig.fillSoundPreset || 'bubble_sparkle') === preset.id;
                  const isPlayingThis = testingPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`relative p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-pink-500 bg-pink-50/60 shadow-sm'
                          : 'border-pink-100 bg-white hover:border-pink-200 hover:bg-[#FFFDFE]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{preset.emoji}</span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-pink-500 text-white shadow-2xs'
                                : 'bg-pink-100/70 text-pink-700'
                            }`}
                          >
                            {preset.tag}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#4A3B43]">
                            {preset.name}
                          </h4>
                          <p className="text-xs text-[#7A6872] leading-relaxed mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-pink-100/70">
                        <button
                          onClick={() => handleTestFillSound(preset.id)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs ${
                            isPlayingThis
                              ? 'bg-rose-500 text-white scale-102 ring-2 ring-pink-300'
                              : 'bg-white border border-pink-200 text-[#4A3B43] hover:bg-pink-50'
                          }`}
                        >
                          <Play className={`w-3 h-3 ${isPlayingThis ? 'fill-white animate-pulse' : 'fill-[#4A3B43]'}`} />
                          <span>{isPlayingThis ? 'En écoute... 🎶' : 'Écouter'}</span>
                        </button>
                        <button
                          onClick={() => {
                            updateStudioConfig({ fillSoundPreset: preset.id });
                            soundEngine.setFillSoundPreset(preset.id);
                            handleTestFillSound(preset.id);
                          }}
                          className={`py-1.5 px-3.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-pink-500 text-white shadow-xs'
                              : 'bg-pink-100 hover:bg-pink-200 text-pink-700'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Actif</span>
                            </>
                          ) : (
                            <span>Choisir</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-pink-100 shrink-0">
              <span className="text-[11px] text-[#8E7C85]">
                Le son choisi s'activera automatiquement à chaque remplissage d'une zone.
              </span>
              <button
                onClick={() => setShowFillSoundModal(false)}
                className="py-2 px-6 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Valider & Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Anglais Kids Configuration Modal */}
      <EnglishLearningModal
        isOpen={showEnglishModal}
        onClose={() => setShowEnglishModal(false)}
        config={studioConfig.englishLearning || DEFAULT_ENGLISH_LEARNING_CONFIG}
        onSave={cfg => {
          updateStudioConfig({ englishLearning: cfg });
          if (botPlayerRef.current) {
            botPlayerRef.current.setEnglishLearningConfig(cfg);
          }
          prepareColoringPlans();
        }}
        onStartColoring={() => handleStartColoring()}
      />
    </div>
  );
};

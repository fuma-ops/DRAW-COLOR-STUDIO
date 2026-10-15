export type BrushType =
  | 'pencil'
  | 'colored_pencil'
  | 'crayon'
  | 'marker'
  | 'watercolor'
  | 'glitter'
  | 'pastel'
  | 'eraser';

export type PaperTextureType = 'coldpress' | 'rough' | 'linen' | 'smooth';

export type ColoringMode = 'brush' | 'fill' | 'eraser';

export type CategoryType =
  | 'All'
  | 'Kids English'
  | 'Cute'
  | 'Cozy Life'
  | 'Food'
  | 'Flowers'
  | 'Fashion'
  | 'Nature'
  | 'Seasonal';

export interface BrushConfig {
  type: BrushType;
  name: string;
  size: number;
  opacity: number;
  textureIntensity: number;
  paperTexture: PaperTextureType;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  color: string;
}

export interface ColoringPage {
  id: string;
  title: string;
  category: CategoryType;
  subtitle: string;
  thumbnailSvg?: string;
  lineArtSvg?: string;
  imageUrl?: string;
  coloredReferenceUrl?: string;
  referencePalette?: string[];
  width: number;
  height: number;
  difficulty: 'Easy' | 'Relaxing' | 'Detailed';
  tags: string[];
  englishLearningPreset?: Partial<EnglishLearningConfig>;
}

export interface SavedArtwork {
  id: string;
  pageId: string;
  title: string;
  category: CategoryType;
  previewDataUrl: string;
  canvasDataUrl: string;
  progressPercent: number;
  isCompleted: boolean;
  isFavorite: boolean;
  lastEditedAt: number;
  createdAt: number;
}

export interface Palette {
  id: string;
  name: string;
  colors: string[];
}

export type ScreenType = 'splash' | 'home' | 'coloring' | 'gallery' | 'finished' | 'studio' | 'recording_studio' | 'kid_video_generator';

export type StudioCursorStyle = 'auto' | 'stylus' | 'pencil' | 'marker' | 'circle' | 'hidden';

export type StudioColoringStyle = 'strokes' | 'bloom';

export type StudioAspectRatio = '16:9' | '9:16' | '1:1';

export type StudioResolution = '4k' | '1080p' | '720p';

export type MusicPreset = 'lofi_chill' | 'music_box' | 'zen_pad';

export type FillSoundPreset =
  | 'bubble_sparkle'
  | 'fairy_harp'
  | 'kawaii_marimba'
  | 'magic_droplet'
  | 'music_box_celeste'
  | 'pastel_bloom'
  | 'fairy_dust'
  | 'soft_whisper';

export interface EnglishLearningConfig {
  enabled: boolean;
  targetWord: string; // e.g. "APPLE"
  objectPhrase: string; // e.g. "Red Apple" or "Look at the delicious red apple!"
  spellingLetters: string[]; // e.g. ["A", "P", "P", "L", "E"]
  voiceAccent: 'en-US' | 'en-GB';
  selectedVoiceName?: string;
  speechRate: number; // 0.7 - 1.0 (default 0.85)
  speechPitch: number; // 1.0 - 1.3 (default 1.15)
  celebrationPhrase: string; // e.g. "Awesome job! Apple!"
  showFlashcardOverlay: boolean;
  letterPronunciationMode?: 'letter_name' | 'phonics';
}

export interface StudioConfig {
  speed: number;
  brushType?: BrushType;
  cursorStyle: StudioCursorStyle;
  coloringStyle: StudioColoringStyle;
  aspectRatio: StudioAspectRatio;
  resolution: StudioResolution;
  showWatermark: boolean;
  watermarkText: string;
  showMiniGuide: boolean;
  lofiAmbience: boolean;
  musicPreset: MusicPreset;
  musicVolume: number;
  asmrSound: boolean;
  asmrVolume: number;
  showToolSwitchBadge: boolean;
  fillSoundPreset: FillSoundPreset;
  largeAreaStyle?: 'balanced_hachure' | 'all_hachures' | 'all_bucket';
  englishLearning?: EnglishLearningConfig;
}

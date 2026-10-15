import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  BrushConfig,
  BrushType,
  ColoringMode,
  ColoringPage,
  Palette,
  SavedArtwork,
  ScreenType,
  StudioConfig,
  EnglishLearningConfig,
} from '../types';
import { COLORING_PAGES } from '../data/coloringPages';
import { COLOR_PALETTES, DEFAULT_QUICK_COLORS } from '../data/palettes';
import {
  DEFAULT_BRUSH_CONFIG,
  loadBrushConfig,
  loadFavorites,
  loadSavedArtworks,
  saveArtworkToStorage,
  saveBrushConfig,
  saveFavorites,
  deleteArtworkFromStorage,
} from '../utils/storage';

export const DEFAULT_ENGLISH_LEARNING_CONFIG: EnglishLearningConfig = {
  enabled: false,
  targetWord: 'APPLE',
  objectPhrase: 'Red Apple! Look at the delicious red apple.',
  spellingLetters: ['A', 'P', 'P', 'L', 'E'],
  voiceAccent: 'en-US',
  selectedVoiceName: 'Aoede',
  speechRate: 0.85,
  speechPitch: 1.15,
  celebrationPhrase: 'Hooray! Wonderful job! Look at our beautiful Apple! Bravo little artist!',
  showFlashcardOverlay: true,
};

interface ColoringContextType {
  screen: ScreenType;
  setScreen: (s: ScreenType) => void;
  activePage: ColoringPage;
  setActivePage: (p: ColoringPage) => void;
  brushConfig: BrushConfig;
  setBrushConfig: React.Dispatch<React.SetStateAction<BrushConfig>>;
  updateBrushType: (type: BrushType) => void;
  coloringMode: ColoringMode;
  setColoringMode: (m: ColoringMode) => void;
  activePalette: Palette;
  setActivePalette: (p: Palette) => void;
  selectedColor: string;
  setSelectedColor: (c: string) => void;
  recentColors: string[];
  addRecentColor: (c: string) => void;
  favorites: string[];
  toggleFavorite: (pageId: string) => void;
  savedArtworks: SavedArtwork[];
  saveArtwork: (artwork: SavedArtwork) => void;
  deleteArtwork: (id: string) => void;
  activeFinishedArtwork: SavedArtwork | null;
  setActiveFinishedArtwork: (a: SavedArtwork | null) => void;
  isDarkMode: boolean;
  setIsDarkMode: (d: boolean) => void;
  openColoringPage: (page: ColoringPage) => void;
  importCustomImagePage: (dataUrl: string, name?: string) => void;
  coloredReferenceImage: string | null;
  setColoredReferenceImage: (url: string | null) => void;
  studioConfig: StudioConfig;
  updateStudioConfig: (partial: Partial<StudioConfig>) => void;
  openStudioMode: (page?: ColoringPage) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const ColoringContext = createContext<ColoringContextType | null>(null);

export const ColoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<ScreenType>('home');
  const [activePage, setActivePage] = useState<ColoringPage>(COLORING_PAGES[0]);
  const [brushConfig, setBrushConfig] = useState<BrushConfig>(loadBrushConfig);
  const [coloringMode, setColoringMode] = useState<ColoringMode>('brush');
  const [activePalette, setActivePalette] = useState<Palette>(COLOR_PALETTES[0]);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_BRUSH_CONFIG.color);
  const [recentColors, setRecentColors] = useState<string[]>(DEFAULT_QUICK_COLORS);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [savedArtworks, setSavedArtworks] = useState<SavedArtwork[]>(loadSavedArtworks);
  const [activeFinishedArtwork, setActiveFinishedArtwork] = useState<SavedArtwork | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [coloredReferenceImage, setColoredReferenceImage] = useState<string | null>(null);
  const [studioConfig, setStudioConfig] = useState<StudioConfig>({
    speed: 1,
    brushType: 'marker',
    cursorStyle: 'auto',
    coloringStyle: 'strokes',
    aspectRatio: '16:9',
    resolution: '1080p',
    showWatermark: false,
    watermarkText: '',
    showMiniGuide: true,
    lofiAmbience: true,
    musicPreset: 'lofi_chill',
    musicVolume: 0.18,
    asmrSound: true,
    asmrVolume: 0.8,
    showToolSwitchBadge: true,
    fillSoundPreset: 'bubble_sparkle',
    englishLearning: DEFAULT_ENGLISH_LEARNING_CONFIG,
  });

  const updateStudioConfig = (partial: Partial<StudioConfig>) => {
    setStudioConfig(prev => ({ ...prev, ...partial }));
  };

  const openStudioMode = (page?: ColoringPage) => {
    if (page) {
      setActivePage(page);
      if (page.englishLearningPreset) {
        setStudioConfig(prev => ({
          ...prev,
          englishLearning: {
            ...DEFAULT_ENGLISH_LEARNING_CONFIG,
            ...page.englishLearningPreset,
            enabled: true,
          },
        }));
      }
    }
    setScreen('studio');
  };

  useEffect(() => {
    if (activePage?.englishLearningPreset) {
      setStudioConfig(prev => ({
        ...prev,
        englishLearning: {
          ...DEFAULT_ENGLISH_LEARNING_CONFIG,
          ...activePage.englishLearningPreset,
          enabled: true,
        },
      }));
    }
  }, [activePage]);

  useEffect(() => {
    saveBrushConfig(brushConfig);
  }, [brushConfig]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const updateBrushType = (type: BrushType) => {
    let name = 'Crayon';
    let defaultSize = 24;
    let defaultOpacity = 0.9;
    let defaultTexture = 0.85;

    switch (type) {
      case 'pencil':
        name = 'Pencil';
        defaultSize = 6;
        defaultOpacity = 0.85;
        defaultTexture = 0.7;
        break;
      case 'colored_pencil':
        name = 'Colored Pencil';
        defaultSize = 12;
        defaultOpacity = 0.9;
        defaultTexture = 0.8;
        break;
      case 'crayon':
        name = 'Crayon';
        defaultSize = 26;
        defaultOpacity = 0.95;
        defaultTexture = 0.9;
        break;
      case 'marker':
        name = 'Marker';
        defaultSize = 20;
        defaultOpacity = 0.85;
        defaultTexture = 0.5;
        break;
      case 'watercolor':
        name = 'Watercolor';
        defaultSize = 34;
        defaultOpacity = 0.55;
        defaultTexture = 0.75;
        break;
      case 'glitter':
        name = 'Glitter';
        defaultSize = 22;
        defaultOpacity = 0.9;
        defaultTexture = 0.95;
        break;
      case 'pastel':
        name = 'Pastel';
        defaultSize = 26;
        defaultOpacity = 0.9;
        defaultTexture = 0.88;
        break;
      case 'eraser':
        name = 'Eraser';
        defaultSize = 30;
        defaultOpacity = 1.0;
        defaultTexture = 0;
        break;
    }

    setBrushConfig(prev => ({
      ...prev,
      type,
      name,
      size: defaultSize,
      opacity: defaultOpacity,
      textureIntensity: defaultTexture,
    }));
  };

  const addRecentColor = (newColor: string) => {
    setSelectedColor(newColor);
    setBrushConfig(prev => ({ ...prev, color: newColor }));
    setRecentColors(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== newColor.toLowerCase());
      return [newColor, ...filtered].slice(0, 16);
    });
  };

  const toggleFavorite = (pageId: string) => {
    setFavorites(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const saveArtwork = (artwork: SavedArtwork) => {
    saveArtworkToStorage(artwork);
    setSavedArtworks(loadSavedArtworks());
  };

  const deleteArtwork = (id: string) => {
    deleteArtworkFromStorage(id);
    setSavedArtworks(loadSavedArtworks());
  };

  const openColoringPage = (page: ColoringPage) => {
    setActivePage(page);
    setScreen('coloring');
  };

  const importCustomImagePage = (dataUrl: string, name: string = 'Imported Original Artwork') => {
    const img = new Image();
    img.onload = () => {
      const page: ColoringPage = {
        id: `custom_${Date.now()}`,
        title: name,
        category: 'Cozy Life',
        subtitle: 'Exact uploaded image line art (0% modified)',
        imageUrl: dataUrl,
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 800,
        difficulty: 'Detailed',
        tags: ['uploaded', 'original', 'custom'],
      };
      setActivePage(page);
      setScreen('coloring');
    };
    img.src = dataUrl;
  };

  return (
    <ColoringContext.Provider
      value={{
        screen,
        setScreen,
        activePage,
        setActivePage,
        brushConfig,
        setBrushConfig,
        updateBrushType,
        coloringMode,
        setColoringMode,
        activePalette,
        setActivePalette,
        selectedColor,
        setSelectedColor,
        recentColors,
        addRecentColor,
        favorites,
        toggleFavorite,
        savedArtworks,
        saveArtwork,
        deleteArtwork,
        activeFinishedArtwork,
        setActiveFinishedArtwork,
        isDarkMode,
        setIsDarkMode,
        openColoringPage,
        importCustomImagePage,
        coloredReferenceImage,
        setColoredReferenceImage,
        studioConfig,
        updateStudioConfig,
        openStudioMode,
        isSettingsOpen,
        setIsSettingsOpen,
      }}
    >
      {children}
    </ColoringContext.Provider>
  );
};

export const useColoring = () => {
  const context = useContext(ColoringContext);
  if (!context) {
    throw new Error('useColoring must be used within a ColoringProvider');
  }
  return context;
};

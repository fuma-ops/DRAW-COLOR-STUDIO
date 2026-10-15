import { BrushConfig, SavedArtwork } from '../types';

const ARTWORKS_KEY = 'kawaii_color_artworks_v1';
const FAVORITES_KEY = 'kawaii_color_favorites_v1';
const BRUSH_SETTINGS_KEY = 'kawaii_color_brush_settings_v1';

export const DEFAULT_BRUSH_CONFIG: BrushConfig = {
  type: 'crayon',
  name: 'Crayon',
  size: 24,
  opacity: 0.9,
  textureIntensity: 0.85,
  paperTexture: 'rough',
  soundEnabled: true,
  hapticEnabled: true,
  color: '#FF8DA1',
};

export function loadSavedArtworks(): SavedArtwork[] {
  try {
    const data = localStorage.getItem(ARTWORKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveArtworkToStorage(artwork: SavedArtwork): void {
  try {
    const artworks = loadSavedArtworks();
    const existingIdx = artworks.findIndex(a => a.id === artwork.id || a.pageId === artwork.pageId);
    if (existingIdx >= 0) {
      artworks[existingIdx] = artwork;
    } else {
      artworks.unshift(artwork);
    }
    localStorage.setItem(ARTWORKS_KEY, JSON.stringify(artworks));
  } catch (err) {
    console.error('Storage full or error saving artwork', err);
  }
}

export function deleteArtworkFromStorage(id: string): void {
  try {
    const artworks = loadSavedArtworks().filter(a => a.id !== id && a.pageId !== id);
    localStorage.setItem(ARTWORKS_KEY, JSON.stringify(artworks));
  } catch {
    // ignore
  }
}

export function loadFavorites(): string[] {
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : ['cozy-coffee-girl', 'sweet-strawberry-cake'];
  } catch {
    return ['cozy-coffee-girl'];
  }
}

export function saveFavorites(favs: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {
    // ignore
  }
}

export function loadBrushConfig(): BrushConfig {
  try {
    const data = localStorage.getItem(BRUSH_SETTINGS_KEY);
    return data ? { ...DEFAULT_BRUSH_CONFIG, ...JSON.parse(data) } : DEFAULT_BRUSH_CONFIG;
  } catch {
    return DEFAULT_BRUSH_CONFIG;
  }
}

export function saveBrushConfig(config: BrushConfig): void {
  try {
    localStorage.setItem(BRUSH_SETTINGS_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

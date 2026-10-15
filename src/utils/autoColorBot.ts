import { BrushType, FillSoundPreset, StudioCursorStyle, EnglishLearningConfig } from '../types';
import { getRegionMask, isBlackLinePixel } from './regionFill';
import { soundEngine } from './audioSynth';
import { englishVoiceEngine } from './englishVoiceEngine';
import { CanvasRendererHandle } from '../components/CanvasRenderer';

export type ColoringMethod = 'bucket' | 'marker_medium' | 'detail_small' | 'hachure_large';

/**
 * Detects white or near-white canvas/background colors that must be ignored during coloring.
 * On coloring pages, white areas represent uncolored paper or background space.
 */
export function isWhiteColor(hexOrRgb: string): boolean {
  if (!hexOrRgb) return false;
  const str = hexOrRgb.trim().toLowerCase();
  if (
    str === '#ffffff' ||
    str === '#fff' ||
    str === 'white' ||
    str === '#fafafa' ||
    str === '#f8f8f8' ||
    str === '#f5f5f5' ||
    str === '#f0f0f0' ||
    str === '#eeeeee' ||
    str === '#ffffff00'
  ) {
    return true;
  }
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return r >= 236 && g >= 236 && b >= 236 && Math.abs(r - g) <= 18 && Math.abs(r - b) <= 18;
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return r >= 236 && g >= 236 && b >= 236 && Math.abs(r - g) <= 18 && Math.abs(r - b) <= 18;
    }
  }
  const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return r >= 236 && g >= 236 && b >= 236 && Math.abs(r - g) <= 18 && Math.abs(r - b) <= 18;
  }
  return false;
}

export interface VirtualCursorState {
  x: number;
  y: number;
  isDrawing: boolean;
  color: string;
  brushType: BrushType;
  tiltAngle: number;
  pressure: number;
  visible: boolean;
  toolStyle?: 'marker' | 'pencil' | 'stylus';
  toolName?: string;
}

export interface RegionStroke {
  points: { x: number; y: number }[];
  brushSize: number;
  opacity: number;
}

export interface RegionColorPlan {
  id: number;
  seedX: number;
  seedY: number;
  centroidX: number;
  centroidY: number;
  color: string; // LOCKED dominant reference color
  brushType: BrushType;
  toolStyle?: 'marker' | 'pencil' | 'stylus';
  toolName?: string;
  pixelCount: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  method: ColoringMethod;
  elementId?: number;
  elementName?: string;
  elementIndex?: number;
  totalInElement?: number;
  neighborIds?: number[];
  colorGroupIndex?: number;
  subRegionName?: string;
  isLetterPlan?: boolean;
  spelledLetter?: string;
  spelledLetterIndex?: number;
}

export interface ArtObject {
  id: number;
  orderIndex: number;
  name: string;
  category: 'furniture' | 'character' | 'decor' | 'nature' | 'surface' | 'background';
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  center: { x: number; y: number };
  subRegions: RegionColorPlan[];
  targetColors: string[]; // Unique locked colors in this object
  isBackground: boolean;
  priority: number;
  isTextLetter?: boolean;
  spelledLetter?: string;
}

export type ArtElement = ArtObject;

export interface CompleteColoringPlan {
  objects: ArtObject[];
  plans: RegionColorPlan[];
  totalObjects: number;
  totalSubRegions: number;
  createdAt: number;
  locked: boolean;
}

export interface PlannerDebugInfo {
  currentObjectName: string;
  currentRegionName: string;
  nextRegionName: string;
  nextObjectName: string;
  distanceToNext: number;
  colorLock: string;
  strokeColorLock: 'ACTIVE' | 'IDLE';
  objectCompletion: number; // percentage 0-100
  totalObjects: number;
  currentObjectIndex: number;
  totalRegions: number;
  currentRegionIndex: number;
}

// Aesthetic soft Kawaii fallback palette if reference pixel has no color
const KAWAII_COLOR_BANK = [
  '#FFE6EB', // Soft strawberry milk
  '#FFD1DC', // Pastel pink
  '#FFF0D4', // Butter cream
  '#E8F5E9', // Pale matcha mint
  '#E1F5FE', // Cloud sky blue
  '#F3E5F5', // Lavender mist
  '#FFF9C4', // Soft fairy light yellow
  '#FFCCBC', // Warm peach
  '#D7CCC8', // Cozy wood taupe
  '#FFE0B2', // Warm biscuit
  '#C8E6C9', // Fresh mint
  '#D1C4E9', // Dreamy violet
  '#FF8DA1', // Coral pink
  '#B2EBF2', // Pastel aqua
  '#F8BBD0', // Sweet bubblegum
];

/**
 * Connected-component segmentation of line art into exact, non-overlapping enclosed regions.
 */
export function segmentAndBuildCompletePlan(
  lineArtData: ImageData,
  coloredRefCanvas?: HTMLCanvasElement | null,
  paletteOverride?: string[],
  coloringStyle: 'strokes' | 'bloom' = 'strokes',
  selectedBrushType: BrushType = 'marker',
  englishLearningConfig?: EnglishLearningConfig
): CompleteColoringPlan {
  const width = lineArtData.width;
  const height = lineArtData.height;
  const totalPixels = width * height;
  const lineData = lineArtData.data;

  // 1. Prepare reference image pixels for color sampling
  let refData: ImageData | null = null;
  if (coloredRefCanvas) {
    try {
      const refCtx = coloredRefCanvas.getContext('2d');
      if (refCtx) {
        refData = refCtx.getImageData(0, 0, width, height);
      }
    } catch {
      // Fallback if canvas tainted
    }
  }

  const palette = paletteOverride && paletteOverride.length > 0 ? paletteOverride : KAWAII_COLOR_BANK;

  // 2. Region map: 0 = line art border, -1 = unvisited, > 0 = regionId
  const regionMap = new Int32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const p4 = i * 4;
    if (isBlackLinePixel(lineData[p4], lineData[p4 + 1], lineData[p4 + 2], lineData[p4 + 3])) {
      regionMap[i] = 0;
    } else {
      regionMap[i] = -1;
    }
  }

  interface DetectedRawRegion {
    id: number;
    pixelCount: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    sumX: number;
    sumY: number;
    seedX: number;
    seedY: number;
    neighborSet: Set<number>;
    pixelIndices: number[];
  }

  const rawRegions: DetectedRawRegion[] = [];
  let nextRegionId = 1;

  // Reusable BFS queue for flood filling
  const queue = new Int32Array(totalPixels);

  // Scan every pixel to discover all enclosed regions deterministically
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      if (regionMap[idx] !== -1) continue;

      let qHead = 0;
      let qTail = 0;
      queue[qTail++] = idx;
      regionMap[idx] = nextRegionId;

      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;
      const pixelIndices: number[] = [];

      while (qHead < qTail) {
        const curIdx = queue[qHead++];
        const cx = curIdx % width;
        const cy = Math.floor(curIdx / width);
        count++;
        sumX += cx;
        sumY += cy;
        pixelIndices.push(curIdx);

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // 4-connected neighbors
        // Up
        if (cy > 0) {
          const upIdx = curIdx - width;
          if (regionMap[upIdx] === -1) {
            regionMap[upIdx] = nextRegionId;
            queue[qTail++] = upIdx;
          }
        }
        // Down
        if (cy < height - 1) {
          const downIdx = curIdx + width;
          if (regionMap[downIdx] === -1) {
            regionMap[downIdx] = nextRegionId;
            queue[qTail++] = downIdx;
          }
        }
        // Left
        if (cx > 0) {
          const leftIdx = curIdx - 1;
          if (regionMap[leftIdx] === -1) {
            regionMap[leftIdx] = nextRegionId;
            queue[qTail++] = leftIdx;
          }
        }
        // Right
        if (cx < width - 1) {
          const rightIdx = curIdx + 1;
          if (regionMap[rightIdx] === -1) {
            regionMap[rightIdx] = nextRegionId;
            queue[qTail++] = rightIdx;
          }
        }
      }

      // Filter out micro anti-aliasing artifacts (< 16 pixels)
      if (count < 16) {
        for (let i = 0; i < pixelIndices.length; i++) {
          regionMap[pixelIndices[i]] = 0;
        }
        continue;
      }

      const centroidX = Math.round(sumX / count);
      const centroidY = Math.round(sumY / count);

      // Seed point: choose interior pixel closest to centroid
      let bestSeedX = x;
      let bestSeedY = y;
      let bestSeedDist = Infinity;
      const centerIdx = centroidY * width + centroidX;
      if (regionMap[centerIdx] === nextRegionId) {
        bestSeedX = centroidX;
        bestSeedY = centroidY;
      } else {
        const step = Math.max(1, Math.floor(pixelIndices.length / 100));
        for (let i = 0; i < pixelIndices.length; i += step) {
          const pIdx = pixelIndices[i];
          const px = pIdx % width;
          const py = Math.floor(pIdx / width);
          const d = Math.hypot(px - centroidX, py - centroidY);
          if (d < bestSeedDist) {
            bestSeedDist = d;
            bestSeedX = px;
            bestSeedY = py;
          }
        }
      }

      rawRegions.push({
        id: nextRegionId,
        pixelCount: count,
        minX,
        minY,
        maxX,
        maxY,
        sumX,
        sumY,
        seedX: bestSeedX,
        seedY: bestSeedY,
        neighborSet: new Set<number>(),
        pixelIndices,
      });

      nextRegionId++;
    }
  }

  // 3. Compute Region Adjacency Graph (RAG) by ray-marching across black line contours
  const regionLookup = new Map<number, DetectedRawRegion>();
  rawRegions.forEach(r => regionLookup.set(r.id, r));

  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1]
  ];

  for (let y = 0; y < height; y += 2) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 2) {
      const idx = rowOffset + x;
      const rId = regionMap[idx];
      if (rId <= 0) continue;
      const regA = regionLookup.get(rId);
      if (!regA) continue;

      for (let d = 0; d < 8; d++) {
        const [dx, dy] = directions[d];
        for (let step = 1; step <= 18; step++) {
          const nx = x + dx * step;
          const ny = y + dy * step;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
          const nIdx = ny * width + nx;
          const neighborId = regionMap[nIdx];
          if (neighborId === rId) {
            continue;
          }
          if (neighborId === 0) {
            continue;
          }
          if (neighborId > 0 && neighborId !== rId) {
            const regB = regionLookup.get(neighborId);
            regA.neighborSet.add(neighborId);
            if (regB) regB.neighborSet.add(rId);
            break;
          }
          break;
        }
      }
    }
  }

  // Geometric proximity adjacency fallback
  for (let i = 0; i < rawRegions.length; i++) {
    const rA = rawRegions[i];
    for (let j = i + 1; j < rawRegions.length; j++) {
      const rB = rawRegions[j];
      const gapX = Math.max(0, Math.max(rA.minX - rB.maxX, rB.minX - rA.maxX));
      const gapY = Math.max(0, Math.max(rA.minY - rB.maxY, rB.minY - rA.maxY));
      const boxGap = Math.hypot(gapX, gapY);
      if (boxGap <= 12) {
        rA.neighborSet.add(rB.id);
        rB.neighborSet.add(rA.id);
      }
    }
  }

  // 4. Sample and lock target colors from reference image
  const intermediatePlans: RegionColorPlan[] = [];

  for (let rIdx = 0; rIdx < rawRegions.length; rIdx++) {
    const raw = rawRegions[rIdx];
    const centroidX = Math.round(raw.sumX / raw.pixelCount);
    const centroidY = Math.round(raw.sumY / raw.pixelCount);

    let lockedColor = palette[rIdx % palette.length];
    if (refData) {
      // Step A: Separate interior pixels (pixels whose 4 neighbors are inside the same region)
      // to completely avoid outline anti-aliasing artifacts from the reference image.
      const interiorIndices: number[] = [];
      const pixelCount = raw.pixelIndices.length;
      const checkStep = Math.max(1, Math.floor(pixelCount / 400));
      for (let i = 0; i < pixelCount; i += checkStep) {
        const pIdx = raw.pixelIndices[i];
        const px = pIdx % width;
        const py = Math.floor(pIdx / width);
        if (
          px > 0 &&
          px < width - 1 &&
          py > 0 &&
          py < height - 1 &&
          regionMap[pIdx - 1] === raw.id &&
          regionMap[pIdx + 1] === raw.id &&
          regionMap[pIdx - width] === raw.id &&
          regionMap[pIdx + width] === raw.id
        ) {
          interiorIndices.push(pIdx);
        }
      }

      // Use interior indices if available (or all indices for thin slivers)
      const targetIndices =
        interiorIndices.length >= Math.min(8, Math.floor(pixelCount * 0.15))
          ? interiorIndices
          : raw.pixelIndices;

      // Step B: Build high-precision color frequency histogram (dominant mode extraction)
      // Group RGB values with 4-step quantization to merge minor compression noise
      const colorHistogram = new Map<
        string,
        { r: number; g: number; b: number; count: number; rawHex: string }
      >();
      const sampleStep = Math.max(1, Math.floor(targetIndices.length / 150));

      for (let i = 0; i < targetIndices.length; i += sampleStep) {
        const pIdx = targetIndices[i];
        const r4 = pIdx * 4;
        const a = refData.data[r4 + 3];
        if (a < 30) continue; // transparent pixel

        const r = refData.data[r4];
        const g = refData.data[r4 + 1];
        const b = refData.data[r4 + 2];

        // 4-step quantization bucket
        const bucketR = Math.round(r / 4) * 4;
        const bucketG = Math.round(g / 4) * 4;
        const bucketB = Math.round(b / 4) * 4;
        const key = `${bucketR},${bucketG},${bucketB}`;

        const entry = colorHistogram.get(key);
        if (entry) {
          entry.count++;
        } else {
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
          colorHistogram.set(key, { r, g, b, count: 1, rawHex: hex });
        }
      }

      if (colorHistogram.size > 0) {
        // Find dominant color cluster
        let bestCluster: { r: number; g: number; b: number; count: number; rawHex: string } | null = null;
        let secondBestCluster: { r: number; g: number; b: number; count: number; rawHex: string } | null = null;

        for (const cluster of colorHistogram.values()) {
          if (!bestCluster || cluster.count > bestCluster.count) {
            secondBestCluster = bestCluster;
            bestCluster = cluster;
          } else if (!secondBestCluster || cluster.count > secondBestCluster.count) {
            secondBestCluster = cluster;
          }
        }

        if (bestCluster) {
          // If the dominant cluster happens to be near-black outline bleed,
          // check if there's a distinct colored fill with significant presence (>= 20% of best)
          const isNearBlack = bestCluster.r < 32 && bestCluster.g < 32 && bestCluster.b < 32;
          if (
            isNearBlack &&
            secondBestCluster &&
            (secondBestCluster.r >= 32 || secondBestCluster.g >= 32 || secondBestCluster.b >= 32) &&
            secondBestCluster.count >= bestCluster.count * 0.2
          ) {
            lockedColor = secondBestCluster.rawHex;
          } else {
            lockedColor = bestCluster.rawHex;
          }
        }
      } else {
        // Fallback to exact seed interior pixel
        const s4 = (raw.seedY * width + raw.seedX) * 4;
        const r = refData.data[s4];
        const g = refData.data[s4 + 1];
        const b = refData.data[s4 + 2];
        lockedColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
      }
    }

    // Strictly preserve and respect the selected style & medium chosen by the user (NEVER randomly switch!)
    const getToolDetails = (
      b: BrushType
    ): { toolStyle: 'marker' | 'pencil' | 'stylus'; toolName: string } => {
      switch (b) {
        case 'pencil':
          return { toolStyle: 'stylus', toolName: 'Apple Pencil ✨' };
        case 'colored_pencil':
          return { toolStyle: 'pencil', toolName: 'Crayon Bois ✏️' };
        case 'crayon':
          return { toolStyle: 'pencil', toolName: 'Crayon Doux 🖍️' };
        case 'watercolor':
          return { toolStyle: 'marker', toolName: 'Pinceau Aquarelle 🎨' };
        case 'marker':
        default:
          return { toolStyle: 'marker', toolName: 'Feutre Copic 💖' };
      }
    };

    const { toolStyle, toolName } = getToolDetails(selectedBrushType);
    const brushType: BrushType = selectedBrushType;
    let method: ColoringMethod = coloringStyle === 'bloom' ? 'bucket' : 'hachure_large';

    // In Learn English Mode: user explicitly requested:
    // "WHENE WE ARE IN LEARNING MODE BIGE AREA USE REMPLISSAGE THENE COLOR SMAL AREAS RAPIDLY"
    if (englishLearningConfig?.enabled) {
      if (raw.pixelCount >= 900) {
        method = 'bucket'; // Remplissage! Instant satisfying fluid flood-fill for large element areas
      } else if (raw.pixelCount < 400) {
        method = 'detail_small'; // Quick brisk strokes for small cute details
      } else {
        method = 'bucket'; // Hollow spelling letters & medium shapes fill in 1 clean rapid splash
      }
    }

    // MANDATORY RULE: Ignore white areas coloring (pure white, blank paper, background)
    if (isWhiteColor(lockedColor)) {
      continue;
    }

    intermediatePlans.push({
      id: raw.id,
      seedX: raw.seedX,
      seedY: raw.seedY,
      centroidX,
      centroidY,
      color: lockedColor,
      brushType,
      toolStyle,
      toolName,
      pixelCount: raw.pixelCount,
      bounds: { minX: raw.minX, minY: raw.minY, maxX: raw.maxX, maxY: raw.maxY },
      method,
      neighborIds: Array.from(raw.neighborSet),
    });
  }

  return buildObjectGroupsAndPlan(intermediatePlans, width, height, englishLearningConfig);
}

export function buildObjectGroupsAndPlan(
  plans: RegionColorPlan[],
  canvasWidth: number,
  canvasHeight: number,
  englishLearningConfig?: EnglishLearningConfig
): CompleteColoringPlan {
  // Ignore white areas coloring completely (pure white paper, background, unpainted white)
  const nonWhitePlans = plans.filter(p => !isWhiteColor(p.color));

  if (nonWhitePlans.length === 0) {
    return {
      objects: [],
      plans: [],
      totalObjects: 0,
      totalSubRegions: 0,
      createdAt: Date.now(),
      locked: true,
    };
  }

  const totalCanvasPixels = canvasWidth * canvasHeight;

  // 1. Separate true global background regions
  const isTrueBackgroundRegion = (p: RegionColorPlan): boolean => {
    const spanW = p.bounds.maxX - p.bounds.minX;
    const spanH = p.bounds.maxY - p.bounds.minY;
    const touchesLeft = p.bounds.minX <= 14;
    const touchesRight = p.bounds.maxX >= canvasWidth - 14;
    const touchesTop = p.bounds.minY <= 14;
    const touchesBottom = p.bounds.maxY >= canvasHeight - 14;
    const borderTouchCount =
      (touchesLeft ? 1 : 0) +
      (touchesRight ? 1 : 0) +
      (touchesTop ? 1 : 0) +
      (touchesBottom ? 1 : 0);

    const coversWidePerimeter =
      spanW > canvasWidth * 0.82 &&
      spanH > canvasHeight * 0.82 &&
      borderTouchCount >= 3 &&
      p.pixelCount > totalCanvasPixels * 0.18;

    const isEnormousBackground =
      p.pixelCount > totalCanvasPixels * 0.38 && borderTouchCount >= 3;

    return coversWidePerimeter || isEnormousBackground;
  };

  const foregroundPlans: RegionColorPlan[] = [];
  const backgroundPlans: RegionColorPlan[] = [];

  for (const p of nonWhitePlans) {
    if (isTrueBackgroundRegion(p)) {
      backgroundPlans.push(p);
    } else {
      foregroundPlans.push(p);
    }
  }

  const getRegionTransitionCost = (
    from: { centroidX: number; centroidY: number; bounds?: RegionColorPlan['bounds']; neighborIds?: number[] },
    to: RegionColorPlan,
    bonusSameColor: boolean = false
  ): number => {
    const isDirectNeighbor = from.neighborIds && from.neighborIds.includes(to.id);
    const centerDist = Math.hypot(to.centroidX - from.centroidX, to.centroidY - from.centroidY);
    let boxGap = 0;
    if (from.bounds) {
      const gapX = Math.max(0, Math.max(to.bounds.minX - from.bounds.maxX, from.bounds.minX - to.bounds.maxX));
      const gapY = Math.max(0, Math.max(to.bounds.minY - from.bounds.maxY, from.bounds.minY - to.bounds.maxY));
      boxGap = Math.hypot(gapX, gapY);
    } else {
      const gapX = Math.max(0, Math.max(to.bounds.minX - from.centroidX, from.centroidX - to.bounds.maxX));
      const gapY = Math.max(0, Math.max(to.bounds.minY - from.centroidY, from.centroidY - to.bounds.maxY));
      boxGap = Math.hypot(gapX, gapY);
    }

    // Direct touching neighbor across black contour line: ABSOLUTE top priority (Zero-Jump rule)
    if (isDirectNeighbor) {
      return centerDist * 0.08 + (bonusSameColor ? -35 : 0);
    }
    // Very close boundary contour (< 16px)
    if (boxGap <= 16) {
      return boxGap * 1.0 + centerDist * 0.25 + (bonusSameColor ? -15 : 0);
    }
    // Normal Euclidean space with strict penalty on distant leaps
    return boxGap * 3.5 + centerDist * 1.5 + (bonusSameColor ? -10 : 0);
  };

  // LEVEL 1: GROUP REGIONS INTO COHESIVE VISUAL OBJECTS
  const MAX_OBJ_SPAN_X = Math.min(520, canvasWidth * 0.65);
  const MAX_OBJ_SPAN_Y = Math.min(520, canvasHeight * 0.65);

  interface RawCluster {
    id: number;
    regions: RegionColorPlan[];
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    centroidX: number;
    centroidY: number;
    totalPixels: number;
  }

  let clusters: RawCluster[] = foregroundPlans.map((p, idx) => ({
    id: idx + 1,
    regions: [p],
    minX: p.bounds.minX,
    minY: p.bounds.minY,
    maxX: p.bounds.maxX,
    maxY: p.bounds.maxY,
    centroidX: p.centroidX,
    centroidY: p.centroidY,
    totalPixels: p.pixelCount,
  }));

  const updateClusterGeometry = (c: RawCluster) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0, totalP = 0;
    for (const r of c.regions) {
      if (r.bounds.minX < minX) minX = r.bounds.minX;
      if (r.bounds.minY < minY) minY = r.bounds.minY;
      if (r.bounds.maxX > maxX) maxX = r.bounds.maxX;
      if (r.bounds.maxY > maxY) maxY = r.bounds.maxY;
      sumX += r.centroidX * r.pixelCount;
      sumY += r.centroidY * r.pixelCount;
      totalP += r.pixelCount;
    }
    c.minX = minX;
    c.minY = minY;
    c.maxX = maxX;
    c.maxY = maxY;
    c.totalPixels = totalP;
    c.centroidX = totalP > 0 ? Math.round(sumX / totalP) : Math.round((minX + maxX) / 2);
    c.centroidY = totalP > 0 ? Math.round(sumY / totalP) : Math.round((minY + maxY) / 2);
  };

  let clusterMerged = true;
  while (clusterMerged) {
    clusterMerged = false;
    let bestPair: [number, number] | null = null;
    let bestScore = Infinity;

    for (let i = 0; i < clusters.length; i++) {
      const cA = clusters[i];
      for (let j = i + 1; j < clusters.length; j++) {
        const cB = clusters[j];
        const mergedMinX = Math.min(cA.minX, cB.minX);
        const mergedMaxX = Math.max(cA.maxX, cB.maxX);
        const mergedMinY = Math.min(cA.minY, cB.minY);
        const mergedMaxY = Math.max(cA.maxY, cB.maxY);
        const mergedW = mergedMaxX - mergedMinX;
        const mergedH = mergedMaxY - mergedMinY;

        if (mergedW > MAX_OBJ_SPAN_X || mergedH > MAX_OBJ_SPAN_Y) continue;

        let areTouching = false;
        for (const rA of cA.regions) {
          if (!rA.neighborIds) continue;
          for (const rB of cB.regions) {
            if (rA.neighborIds.includes(rB.id)) {
              areTouching = true;
              break;
            }
          }
          if (areTouching) break;
        }

        const gapX = Math.max(0, Math.max(cA.minX - cB.maxX, cB.minX - cA.maxX));
        const gapY = Math.max(0, Math.max(cA.minY - cB.maxY, cB.minY - cA.maxY));
        const boxGap = Math.hypot(gapX, gapY);
        const centerDist = Math.hypot(cA.centroidX - cB.centroidX, cA.centroidY - cB.centroidY);

        if (areTouching || boxGap <= 14 || (centerDist < 90 && boxGap <= 22)) {
          const score = (areTouching ? 0 : 20) + boxGap * 2.0 + centerDist * 0.4;
          if (score < bestScore) {
            bestScore = score;
            bestPair = [i, j];
          }
        }
      }
    }

    if (bestPair) {
      const [idxA, idxB] = bestPair;
      clusters[idxA].regions.push(...clusters[idxB].regions);
      updateClusterGeometry(clusters[idxA]);
      clusters.splice(idxB, 1);
      clusterMerged = true;
    }
  }

  // LEVEL 2: DYNAMIC CONTEXTUAL OBJECT CREATION
  const rawObjects: ArtObject[] = [];
  let objIdCounter = 1;

  for (const c of clusters) {
    const spanW = c.maxX - c.minX;
    const cx = c.centroidX;
    const cy = c.centroidY;

    let category: 'furniture' | 'character' | 'decor' | 'nature' | 'surface' | 'background' = 'decor';
    let name = `Élément ${objIdCounter}`;

    const isBottomSurface = cy > canvasHeight * 0.68 && spanW > canvasWidth * 0.38;
    const isCentralSubject =
      Math.abs(cx - canvasWidth * 0.5) < canvasWidth * 0.28 &&
      Math.abs(cy - canvasHeight * 0.5) < canvasHeight * 0.28 &&
      (c.totalPixels > totalCanvasPixels * 0.08 || c.regions.length >= 4);
    const isTopAccent = cy < canvasHeight * 0.32;
    const isLeftProp = cx < canvasWidth * 0.36;
    const isRightProp = cx > canvasWidth * 0.64;

    if (isBottomSurface) {
      category = 'surface';
      name = 'Base & Premier Plan';
    } else if (isCentralSubject) {
      category = c.regions.length > 5 ? 'character' : 'decor';
      name = 'Sujet Principal';
    } else if (isTopAccent) {
      category = 'decor';
      name = cx < canvasWidth * 0.5 ? 'Éléments Supérieurs Gauche' : 'Éléments Supérieurs Droit';
    } else if (isLeftProp) {
      category = 'nature';
      name = 'Détails & Motifs Gauche';
    } else if (isRightProp) {
      category = 'furniture';
      name = 'Détails & Motifs Droit';
    } else {
      category = c.regions.length >= 3 ? 'nature' : 'decor';
      name = `Détail & Nuances #${objIdCounter}`;
    }

    const targetColors = Array.from(new Set(c.regions.map(r => r.color)));

    rawObjects.push({
      id: objIdCounter++,
      orderIndex: 0,
      name,
      category,
      bounds: { minX: c.minX, minY: c.minY, maxX: c.maxX, maxY: c.maxY },
      center: { x: cx, y: cy },
      subRegions: c.regions,
      targetColors,
      isBackground: false,
      priority: 0,
    });
  }

  // Background object
  const bgObjects: ArtObject[] = [];
  if (backgroundPlans.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of backgroundPlans) {
      if (p.bounds.minX < minX) minX = p.bounds.minX;
      if (p.bounds.minY < minY) minY = p.bounds.minY;
      if (p.bounds.maxX > maxX) maxX = p.bounds.maxX;
      if (p.bounds.maxY > maxY) maxY = p.bounds.maxY;
    }
    bgObjects.push({
      id: objIdCounter++,
      orderIndex: 0,
      name: 'Fond & Espace de Dessin',
      category: 'background',
      bounds: { minX, minY, maxX, maxY },
      center: { x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2) },
      subRegions: backgroundPlans,
      targetColors: Array.from(new Set(backgroundPlans.map(p => p.color))),
      isBackground: true,
      priority: 99,
    });
  }

  // LEVEL 3: THE ZERO-JUMP TRAVERSAL ENGINE
  const sequenceObjectFromEntryPoint = (
    obj: ArtObject,
    entryPos: { centroidX: number; centroidY: number; bounds?: RegionColorPlan['bounds']; neighborIds?: number[] }
  ): RegionColorPlan[] => {
    const unvisited = [...obj.subRegions];
    if (unvisited.length === 0) return [];

    let bestEntryIdx = 0;
    let minEntryCost = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const cost = getRegionTransitionCost(entryPos, unvisited[i]);
      if (cost < minEntryCost) {
        minEntryCost = cost;
        bestEntryIdx = i;
      }
    }

    const sequenced: RegionColorPlan[] = [];
    let currentReg = unvisited.splice(bestEntryIdx, 1)[0];
    sequenced.push(currentReg);

    while (unvisited.length > 0) {
      let bestNextIdx = 0;
      let minCost = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        const sameColor = candidate.color === currentReg.color;
        const cost = getRegionTransitionCost(currentReg, candidate, sameColor);
        if (cost < minCost) {
          minCost = cost;
          bestNextIdx = i;
        }
      }
      currentReg = unvisited.splice(bestNextIdx, 1)[0];
      sequenced.push(currentReg);
    }

    return sequenced;
  };

  const orderedObjects: ArtObject[] = [];

  // If Learn English Mode is active, strictly color the Element / Illustration FIRST,
  // then the Text / Letters SECOND (in Left-to-Right reading order), as requested!
  if (englishLearningConfig?.enabled && englishLearningConfig.spellingLetters.length > 0) {
    const numTargetLetters = englishLearningConfig.spellingLetters.length;
    const maxSubjectPixels = totalCanvasPixels * 0.16;

    // Helper: Find a cohesive horizontal row of candidate letter glyphs
    const findHorizontalTextRow = (cands: ArtObject[]): ArtObject[] => {
      if (cands.length === 0) return [];
      // Filter out giant objects (e.g. main body of apple/cat/sun)
      const validCands = cands.filter(o => {
        const spanH = o.bounds.maxY - o.bounds.minY;
        const spanW = o.bounds.maxX - o.bounds.minX;
        const totalP = o.subRegions.reduce((sum, r) => sum + r.pixelCount, 0);
        return (
          totalP < maxSubjectPixels &&
          spanH < canvasHeight * 0.40 &&
          spanW < canvasWidth * 0.45 &&
          spanH > 15 &&
          spanW > 10
        );
      });
      if (validCands.length === 0) return [];

      // Cluster candidates that share similar vertical center (within 55px)
      const rows: ArtObject[][] = [];
      for (const obj of validCands) {
        let placed = false;
        for (const row of rows) {
          const rowAvgY = row.reduce((sum, r) => sum + r.center.y, 0) / row.length;
          if (Math.abs(obj.center.y - rowAvgY) <= 55) {
            row.push(obj);
            placed = true;
            break;
          }
        }
        if (!placed) {
          rows.push([obj]);
        }
      }

      // Score rows: preference for row count close to numTargetLetters and wide horizontal spread
      let bestRow: ArtObject[] = [];
      let bestScore = -Infinity;
      for (const row of rows) {
        if (row.length === 0) continue;
        const minX = Math.min(...row.map(r => r.bounds.minX));
        const maxX = Math.max(...row.map(r => r.bounds.maxX));
        const hSpan = maxX - minX;
        const countDiff = Math.abs(row.length - numTargetLetters);
        const score = hSpan * 1.5 - countDiff * 180 + row.length * 50;
        if (score > bestScore) {
          bestScore = score;
          bestRow = row;
        }
      }
      return bestRow;
    };

    // The user explicitly noted: "TEXT WICH IS ALWYSE PLACED IN THE TOP"
    // Search TOP zone first (cy <= canvasHeight * 0.45)
    const topCandidates = rawObjects.filter(o => o.center.y <= canvasHeight * 0.45);
    let letterCandidates = findHorizontalTextRow(topCandidates);

    // If no distinct row in top zone, check bottom zone (cy >= canvasHeight * 0.55)
    if (letterCandidates.length === 0 || letterCandidates.length < Math.min(2, numTargetLetters)) {
      const bottomCandidates = rawObjects.filter(o => o.center.y >= canvasHeight * 0.55);
      const bottomRow = findHorizontalTextRow(bottomCandidates);
      if (bottomRow.length > letterCandidates.length) {
        letterCandidates = bottomRow;
      }
    }

    // Sort letter candidates strictly from Left to Right (minX ascending)
    letterCandidates.sort((a, b) => a.bounds.minX - b.bounds.minX);

    // Any objects NOT in letterCandidates belong to the Element illustration!
    const letterIdSet = new Set(letterCandidates.map(l => l.id));
    const elementCandidates = rawObjects.filter(o => !letterIdSet.has(o.id));

    if (letterCandidates.length > 0 && elementCandidates.length > 0) {
      // 1. Assign spelling letters strictly from Left to Right
      letterCandidates.forEach((lObj, lIdx) => {
        const letter = englishLearningConfig.spellingLetters[lIdx % englishLearningConfig.spellingLetters.length];
        lObj.isTextLetter = true;
        lObj.spelledLetter = letter;
        lObj.name = `Lettre « ${letter} »`;
        lObj.subRegions.forEach(r => {
          r.isLetterPlan = true;
          r.spelledLetter = letter;
          r.spelledLetterIndex = lIdx;
          r.elementName = lObj.name;
        });
      });

      // 2. Mark element candidates as pure Element (zero spelling on element!)
      elementCandidates.forEach(eObj => {
        eObj.isTextLetter = false;
        eObj.subRegions.forEach(r => {
          r.isLetterPlan = false;
          r.spelledLetter = undefined;
          r.elementName = englishLearningConfig.objectPhrase || eObj.name;
        });
      });

      // 3. Sequence Element Candidates FIRST:
      // MANDATORY RULE: Always start by the BIGGEST AREA in the element, then smaller ones!
      const getObjTotalPixels = (o: ArtObject) =>
        o.subRegions.reduce((sum, r) => sum + (r.pixelCount || 0), 0);
      const getObjMaxRegionPixels = (o: ArtObject) =>
        Math.max(0, ...o.subRegions.map(r => r.pixelCount || 0));

      // Sort element objects so that the main body with the largest area comes FIRST
      elementCandidates.sort((a, b) => {
        const maxA = getObjMaxRegionPixels(a);
        const maxB = getObjMaxRegionPixels(b);
        if (Math.abs(maxA - maxB) > 250) {
          return maxB - maxA;
        }
        return getObjTotalPixels(b) - getObjTotalPixels(a);
      });

      // And within EVERY element object, sort its sub-regions strictly from BIGGEST to SMALLEST
      elementCandidates.forEach(eObj => {
        eObj.subRegions.sort((a, b) => (b.pixelCount || 0) - (a.pixelCount || 0));
      });

      const remainingElem = [...elementCandidates];
      if (remainingElem.length > 0) {
        // Start with the object that has the largest area (the main body of the element!)
        let curObj = remainingElem.shift()!;
        orderedObjects.push(curObj);

        let lastReg = curObj.subRegions[curObj.subRegions.length - 1];
        let stylusPos = {
          centroidX: lastReg ? lastReg.centroidX : 0,
          centroidY: lastReg ? lastReg.centroidY : 0,
          bounds: lastReg ? lastReg.bounds : undefined,
          neighborIds: lastReg ? lastReg.neighborIds : undefined,
        };

        // For remaining element parts (leaves, stems, accessories), progress from largest to smallest
        while (remainingElem.length > 0) {
          // Prefer larger parts first, with spatial proximity as tie-breaker
          let bestIdx = 0;
          let bestScore = -Infinity;
          for (let i = 0; i < remainingElem.length; i++) {
            const cand = remainingElem[i];
            const candPixels = getObjTotalPixels(cand);
            const dist = Math.hypot(cand.center.x - stylusPos.centroidX, cand.center.y - stylusPos.centroidY);
            // High weight on pixel size (largest first) while maintaining smooth motion
            const score = candPixels * 2.0 - dist * 0.5;
            if (score > bestScore) {
              bestScore = score;
              bestIdx = i;
            }
          }
          const nextObj = remainingElem.splice(bestIdx, 1)[0];
          orderedObjects.push(nextObj);
          lastReg = nextObj.subRegions[nextObj.subRegions.length - 1];
          if (lastReg) {
            stylusPos = {
              centroidX: lastReg.centroidX,
              centroidY: lastReg.centroidY,
              bounds: lastReg.bounds,
              neighborIds: lastReg.neighborIds,
            };
          }
        }
      }

      // 4. Sequence Letter Candidates SECOND (strictly Left to Right)
      let stylusPos =
        orderedObjects.length > 0 && orderedObjects[orderedObjects.length - 1].subRegions.length > 0
          ? {
              centroidX: orderedObjects[orderedObjects.length - 1].subRegions[orderedObjects[orderedObjects.length - 1].subRegions.length - 1].centroidX,
              centroidY: orderedObjects[orderedObjects.length - 1].subRegions[orderedObjects[orderedObjects.length - 1].subRegions.length - 1].centroidY,
              bounds: orderedObjects[orderedObjects.length - 1].subRegions[orderedObjects[orderedObjects.length - 1].subRegions.length - 1].bounds,
              neighborIds: orderedObjects[orderedObjects.length - 1].subRegions[orderedObjects[orderedObjects.length - 1].subRegions.length - 1].neighborIds,
            }
          : { centroidX: 0, centroidY: 0 };

      for (const letterObj of letterCandidates) {
        letterObj.subRegions = sequenceObjectFromEntryPoint(letterObj, stylusPos);
        orderedObjects.push(letterObj);
        if (letterObj.subRegions.length > 0) {
          const lReg = letterObj.subRegions[letterObj.subRegions.length - 1];
          stylusPos = {
            centroidX: lReg.centroidX,
            centroidY: lReg.centroidY,
            bounds: lReg.bounds,
            neighborIds: lReg.neighborIds,
          };
        }
      }
    } else {
      // All objects belong to the element
      rawObjects.forEach(obj => {
        obj.isTextLetter = false;
        obj.subRegions.forEach(r => {
          r.isLetterPlan = false;
          r.elementName = englishLearningConfig.objectPhrase || obj.name;
        });
      });
      // Fallback standard sequence
      const remainingFore = [...rawObjects];
      if (remainingFore.length > 0) {
        let currentObj = remainingFore.shift()!;
        currentObj.subRegions = sequenceObjectFromEntryPoint(currentObj, { centroidX: currentObj.bounds.minX, centroidY: currentObj.bounds.minY });
        orderedObjects.push(currentObj);
        let lastReg = currentObj.subRegions[currentObj.subRegions.length - 1];
        let stylusPos = { centroidX: lastReg.centroidX, centroidY: lastReg.centroidY, bounds: lastReg.bounds, neighborIds: lastReg.neighborIds };
        while (remainingFore.length > 0) {
          let bestIdx = 0;
          let minCost = Infinity;
          for (let i = 0; i < remainingFore.length; i++) {
            for (const r of remainingFore[i].subRegions) {
              const cost = getRegionTransitionCost(stylusPos, r);
              if (cost < minCost) { minCost = cost; bestIdx = i; }
            }
          }
          const nextObj = remainingFore.splice(bestIdx, 1)[0];
          nextObj.subRegions = sequenceObjectFromEntryPoint(nextObj, stylusPos);
          orderedObjects.push(nextObj);
          lastReg = nextObj.subRegions[nextObj.subRegions.length - 1];
          stylusPos = { centroidX: lastReg.centroidX, centroidY: lastReg.centroidY, bounds: lastReg.bounds, neighborIds: lastReg.neighborIds };
        }
      }
    }
  } else {
    // Normal non-English learning sequence
    const remainingForeObjects = [...rawObjects];
    if (remainingForeObjects.length > 0) {
      let bestStartIdx = 0;
      let bestStartScore = -Infinity;
      for (let i = 0; i < remainingForeObjects.length; i++) {
        const obj = remainingForeObjects[i];
        const score = obj.center.y * 1.5 - Math.abs(obj.center.x - canvasWidth * 0.35) * 0.6;
        if (score > bestStartScore) {
          bestStartScore = score;
          bestStartIdx = i;
        }
      }

      let currentObj = remainingForeObjects.splice(bestStartIdx, 1)[0];
      currentObj.subRegions = sequenceObjectFromEntryPoint(currentObj, {
        centroidX: currentObj.bounds.minX,
        centroidY: currentObj.bounds.maxY,
      });
      orderedObjects.push(currentObj);

      let lastReg = currentObj.subRegions[currentObj.subRegions.length - 1];
      let stylusPos = {
        centroidX: lastReg.centroidX,
        centroidY: lastReg.centroidY,
        bounds: lastReg.bounds,
        neighborIds: lastReg.neighborIds,
      };

      while (remainingForeObjects.length > 0) {
        let bestObjIdx = 0;
        let minTransitionCost = Infinity;

        for (let i = 0; i < remainingForeObjects.length; i++) {
          const candidateObj = remainingForeObjects[i];
          for (const r of candidateObj.subRegions) {
            const cost = getRegionTransitionCost(stylusPos, r);
            if (cost < minTransitionCost) {
              minTransitionCost = cost;
              bestObjIdx = i;
            }
          }
        }

        const nextObj = remainingForeObjects.splice(bestObjIdx, 1)[0];
        nextObj.subRegions = sequenceObjectFromEntryPoint(nextObj, stylusPos);
        orderedObjects.push(nextObj);

        lastReg = nextObj.subRegions[nextObj.subRegions.length - 1];
        stylusPos = {
          centroidX: lastReg.centroidX,
          centroidY: lastReg.centroidY,
          bounds: lastReg.bounds,
          neighborIds: lastReg.neighborIds,
        };
      }
    }
  }

  if (bgObjects.length > 0) {
    const lastForeReg =
      orderedObjects.length > 0 && orderedObjects[orderedObjects.length - 1].subRegions.length > 0
        ? orderedObjects[orderedObjects.length - 1].subRegions[
            orderedObjects[orderedObjects.length - 1].subRegions.length - 1
          ]
        : null;

    const bgEntryPos = lastForeReg
      ? {
          centroidX: lastForeReg.centroidX,
          centroidY: lastForeReg.centroidY,
          bounds: lastForeReg.bounds,
          neighborIds: lastForeReg.neighborIds,
        }
      : { centroidX: Math.round(canvasWidth / 2), centroidY: Math.round(canvasHeight / 2) };

    for (const bgObj of bgObjects) {
      bgObj.subRegions = sequenceObjectFromEntryPoint(bgObj, bgEntryPos);
      orderedObjects.push(bgObj);
    }
  }

  // LEVEL 4: FLATTEN INTO MASTER COLORING PLAN
  const finalSequencedPlans: RegionColorPlan[] = [];
  let globalRegionId = 1;

  orderedObjects.forEach((obj, objIdx) => {
    obj.orderIndex = objIdx + 1;
    const numPrefix = String(objIdx + 1).padStart(2, '0');
    if (!obj.name.startsWith(numPrefix)) {
      obj.name = `${numPrefix} ${obj.name}`;
    }

    const totalInObj = obj.subRegions.length;
    obj.subRegions.forEach((plan, subIdx) => {
      plan.id = globalRegionId++;
      plan.elementId = obj.id;
      plan.elementName = obj.name;
      plan.elementIndex = subIdx + 1;
      plan.totalInElement = totalInObj;
      plan.subRegionName = `Zone ${subIdx + 1}/${totalInObj}`;
      finalSequencedPlans.push(plan);
    });
  });

  return {
    objects: orderedObjects,
    plans: finalSequencedPlans,
    totalObjects: orderedObjects.length,
    totalSubRegions: finalSequencedPlans.length,
    createdAt: Date.now(),
    locked: true,
  };
}

export function analyzeArtRegions(
  lineArtData: ImageData,
  coloredRefCanvas?: HTMLCanvasElement | null,
  paletteOverride?: string[]
): RegionColorPlan[] {
  const completePlan = segmentAndBuildCompletePlan(lineArtData, coloredRefCanvas, paletteOverride);
  return completePlan.plans;
}

export function groupAndSequenceByElements(
  plans: RegionColorPlan[],
  canvasWidth: number,
  canvasHeight: number
): RegionColorPlan[] {
  const completePlan = buildObjectGroupsAndPlan(plans, canvasWidth, canvasHeight);
  return completePlan.plans;
}

/**
 * Generates natural strokes strictly inside the target region.
 * Supports zero-jump spatial traversal from the previous stroke's ending point.
 */
export function generateNaturalStrokes(
  lineArtData: ImageData,
  plan: RegionColorPlan,
  humanization: number = 0.75,
  entryPoint?: { x: number; y: number }
): RegionStroke[] {
  const mask = getRegionMask(lineArtData, plan.seedX, plan.seedY);
  if (!mask || mask.pixelCount === 0) {
    return [
      {
        points: [
          { x: plan.centroidX - 4, y: plan.centroidY - 3 },
          { x: plan.centroidX + 4, y: plan.centroidY + 3 },
        ],
        brushSize: 12,
        opacity: 0.9,
      },
    ];
  }

  const { minX, minY, maxX, maxY, pixelCount, width, mask: maskArray } = mask;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const strokes: RegionStroke[] = [];

  // CASE 1: SMALL DETAILS
  if (plan.method === 'detail_small' || pixelCount < 550) {
    const numStrokes = pixelCount < 160 ? 1 : 2;
    const brushSize = Math.max(9, Math.min(18, Math.round(Math.sqrt(pixelCount) * 0.45)));
    for (let s = 0; s < numStrokes; s++) {
      const angle = 0.65 + s * 0.35 + (s * 0.1) * humanization;
      const strokeLen = Math.max(6, Math.min(w, h) * 0.75);
      const cx = plan.centroidX + (s - (numStrokes - 1) / 2) * 4;
      const cy = plan.centroidY + (s - (numStrokes - 1) / 2) * 3;
      const p0 = {
        x: Math.round(cx - Math.cos(angle) * strokeLen * 0.5),
        y: Math.round(cy - Math.sin(angle) * strokeLen * 0.5),
      };
      const p1 = {
        x: Math.round(cx + Math.cos(angle) * strokeLen * 0.5),
        y: Math.round(cy + Math.sin(angle) * strokeLen * 0.5),
      };
      strokes.push({
        points: [p0, p1],
        brushSize,
        opacity: 0.92,
      });
    }

    if (entryPoint && strokes.length > 0) {
      const first = strokes[0];
      const d0 = Math.hypot(first.points[0].x - entryPoint.x, first.points[0].y - entryPoint.y);
      const d1 = Math.hypot(first.points[1].x - entryPoint.x, first.points[1].y - entryPoint.y);
      if (d1 < d0) {
        first.points.reverse();
      }
    }
    return strokes;
  }

  // CASE 2: LARGE & MEDIUM AREAS
  const isLargeHachure = plan.method === 'hachure_large' || pixelCount >= 3500;
  const diagonalSpan = Math.hypot(w, h);
  const strokeCount = isLargeHachure
    ? Math.max(6, Math.min(14, Math.round(diagonalSpan / 36)))
    : Math.max(3, Math.min(6, Math.round(Math.sqrt(pixelCount) / 12)));

  const strokeSpacing = isLargeHachure
    ? Math.max(22, Math.min(46, Math.round(diagonalSpan / (strokeCount + 1))))
    : Math.max(12, Math.min(24, Math.round(diagonalSpan / (strokeCount + 1))));

  const brushSize = isLargeHachure
    ? Math.max(28, Math.min(54, Math.round(strokeSpacing * 1.4)))
    : Math.max(16, Math.min(32, Math.round(strokeSpacing * 1.35)));

  const theta = 0.65;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: minX, y: maxY },
    { x: maxX, y: maxY },
  ];
  const vVals = corners.map(c => -c.x * sinT + c.y * cosT);
  const minV = Math.min(...vVals);
  const maxV = Math.max(...vVals);

  let strokeIndex = 0;
  for (let v = minV + strokeSpacing * 0.45; v <= maxV - strokeSpacing * 0.25; v += strokeSpacing) {
    let startU: number | null = null;
    let endU: number | null = null;
    const uSpan = Math.hypot(w, h);
    const centerU = plan.centroidX * cosT + plan.centroidY * sinT;
    const uStep = 2;

    for (let u = centerU - uSpan; u <= centerU + uSpan; u += uStep) {
      const px = Math.round(u * cosT - v * sinT);
      const py = Math.round(u * sinT + v * cosT);
      if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
        const idx = py * width + px;
        if (maskArray[idx]) {
          if (startU === null) startU = u;
          endU = u;
        }
      }
    }

    if (startU !== null && endU !== null && endU - startU > 6) {
      const pStart = {
        x: Math.round(startU * cosT - v * sinT),
        y: Math.round(startU * sinT + v * cosT),
      };
      const pEnd = {
        x: Math.round(endU * cosT - v * sinT),
        y: Math.round(endU * sinT + v * cosT),
      };

      const isForward = strokeIndex % 2 === 0;
      const fromPt = isForward ? pStart : pEnd;
      const toPt = isForward ? pEnd : pStart;
      const midX = (fromPt.x + toPt.x) / 2;
      const midY = (fromPt.y + toPt.y) / 2;
      const bowAmp = (strokeIndex % 2 === 0 ? 2 : -2) * humanization;
      const ctrlX = Math.round(midX - sinT * bowAmp);
      const ctrlY = Math.round(midY + cosT * bowAmp);

      strokes.push({
        points: [fromPt, { x: ctrlX, y: ctrlY }, toPt],
        brushSize,
        opacity: 0.9,
      });
      strokeIndex++;
    }
  }

  if (strokes.length === 0) {
    strokes.push({
      points: [
        { x: plan.centroidX - 8, y: plan.centroidY - 6 },
        { x: plan.centroidX + 8, y: plan.centroidY + 6 },
      ],
      brushSize,
      opacity: 0.88,
    });
  }

  // Zero-Jump optimization: start from stroke and endpoint closest to entryPoint
  if (entryPoint && strokes.length > 0) {
    const firstStroke = strokes[0];
    const lastStroke = strokes[strokes.length - 1];

    const dFirstStart = Math.hypot(firstStroke.points[0].x - entryPoint.x, firstStroke.points[0].y - entryPoint.y);
    const dLastStart = Math.hypot(lastStroke.points[0].x - entryPoint.x, lastStroke.points[0].y - entryPoint.y);
    const dLastEnd = Math.hypot(
      lastStroke.points[lastStroke.points.length - 1].x - entryPoint.x,
      lastStroke.points[lastStroke.points.length - 1].y - entryPoint.y
    );

    if (Math.min(dLastStart, dLastEnd) < dFirstStart) {
      // Reversing whole stroke order lets us start at the nearest boundary
      strokes.reverse();
      strokes.forEach(s => s.points.reverse());
    } else {
      const dFirstEnd = Math.hypot(
        firstStroke.points[firstStroke.points.length - 1].x - entryPoint.x,
        firstStroke.points[firstStroke.points.length - 1].y - entryPoint.y
      );
      if (dFirstEnd < dFirstStart) {
        firstStroke.points.reverse();
      }
    }
  }

  return strokes;
}

/**
 * Automated Artist Player
 */
export class AutomatedArtistPlayer {
  private canvasHandle: CanvasRendererHandle;
  private completePlan: CompleteColoringPlan;
  private plans: RegionColorPlan[];
  private onCursorChange: (cursor: VirtualCursorState) => void;
  private onProgress: (current: number, total: number, pct: number, planInfo?: RegionColorPlan) => void;
  private onComplete: () => void;
  private onDebugUpdate?: (debugInfo: PlannerDebugInfo) => void;
  private isRunning = false;
  private isPaused = false;
  private currentRegionIndex = 0;
  private speedMultiplier = 1;
  private humanization = 0.75;
  private animationTimer: number | null = null;
  private travelInterval: number | null = null;

  // Virtual stylus state
  private cursorStyle: StudioCursorStyle = 'auto';
  private fillSoundPreset: FillSoundPreset = 'bubble_sparkle';
  private onObjectComplete?: (obj: ArtObject) => void;
  private lastToolStyle: 'marker' | 'pencil' | 'stylus' | null = null;
  private lastStrokeEndPoint: { x: number; y: number } | null = null;
  private cursorState: VirtualCursorState = {
    x: 400,
    y: 400,
    isDrawing: false,
    color: '#FFD1DC',
    brushType: 'marker',
    toolStyle: 'marker',
    toolName: 'Feutre Copic 💖',
    tiltAngle: 28,
    pressure: 0.5,
    visible: true,
  };

  constructor(options: {
    canvasHandle: CanvasRendererHandle;
    completePlan: CompleteColoringPlan;
    speedMultiplier?: number;
    humanization?: number;
    coloringStyle?: 'strokes' | 'bloom';
    cursorStyle?: StudioCursorStyle;
    fillSoundPreset?: FillSoundPreset;
    englishLearningConfig?: EnglishLearningConfig;
    onEnglishElementSpoken?: (phrase: string) => void;
    onEnglishLetterSpoken?: (letter: string, index: number) => void;
    onCursorChange: (cursor: VirtualCursorState) => void;
    onProgress: (current: number, total: number, pct: number, planInfo?: RegionColorPlan) => void;
    onComplete: () => void;
    onDebugUpdate?: (debugInfo: PlannerDebugInfo) => void;
    onObjectComplete?: (obj: ArtObject) => void;
  }) {
    this.canvasHandle = options.canvasHandle;
    this.completePlan = options.completePlan;
    this.plans = options.completePlan.plans;
    this.speedMultiplier = options.speedMultiplier || 1;
    this.humanization = options.humanization !== undefined ? options.humanization : 0.75;
    this.cursorStyle = options.cursorStyle || 'auto';
    this.fillSoundPreset = options.fillSoundPreset || 'bubble_sparkle';
    this.englishLearningConfig = options.englishLearningConfig;
    this.onEnglishElementSpoken = options.onEnglishElementSpoken;
    this.onEnglishLetterSpoken = options.onEnglishLetterSpoken;
    this.onCursorChange = options.onCursorChange;
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onDebugUpdate = options.onDebugUpdate;
    this.onObjectComplete = options.onObjectComplete;
  }

  private englishLearningConfig?: EnglishLearningConfig;
  private onEnglishElementSpoken?: (phrase: string) => void;
  private onEnglishLetterSpoken?: (letter: string, index: number) => void;
  private hasSpokenElementPhrase = false;
  private lastSpokenLetter: string | null = null;
  private lastSpokenElementId: number | null | undefined = null;

  public setEnglishLearningConfig(cfg?: EnglishLearningConfig) {
    this.englishLearningConfig = cfg;
  }

  public setFillSoundPreset(preset: FillSoundPreset) {
    this.fillSoundPreset = preset;
  }

  public setSpeed(multiplier: number) {
    this.speedMultiplier = Math.max(0.2, multiplier);
  }

  public setCursorStyle(style: StudioCursorStyle) {
    this.cursorStyle = style;
  }

  public setHumanization(val: number) {
    this.humanization = Math.max(0, Math.min(1, val));
  }

  private coloringStyle: 'strokes' | 'bloom' = 'strokes';
  public setStyle(style: 'strokes' | 'bloom') {
    this.coloringStyle = style;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.currentRegionIndex = 0;
    this.hasSpokenElementPhrase = false;
    this.lastSpokenLetter = null;
    this.lastSpokenElementId = null;
    this.processNextRegion();
  }

  public pause() {
    this.isPaused = true;
    soundEngine.stopStroke();
    englishVoiceEngine.stop();
    if (this.travelInterval !== null) {
      clearInterval(this.travelInterval);
      this.travelInterval = null;
    }
  }

  public resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.processNextRegion();
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    englishVoiceEngine.stop();
    if (this.animationTimer !== null) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    if (this.travelInterval !== null) {
      clearInterval(this.travelInterval);
      this.travelInterval = null;
    }
    soundEngine.stopStroke();
    this.canvasHandle.endArtistStroke();
    this.cursorState.isDrawing = false;
    this.onCursorChange({ ...this.cursorState });
  }

  private updateCursor(partial: Partial<VirtualCursorState>) {
    this.cursorState = { ...this.cursorState, ...partial };
    this.onCursorChange(this.cursorState);
  }

  private emitDebugState(plan: RegionColorPlan, isStrokeActive: boolean) {
    if (!this.onDebugUpdate) return;
    const nextPlan = this.currentRegionIndex + 1 < this.plans.length
      ? this.plans[this.currentRegionIndex + 1]
      : null;
    const currentObj = this.completePlan.objects.find(o => o.id === plan.elementId);
    const nextObj = nextPlan ? this.completePlan.objects.find(o => o.id === nextPlan.elementId) : null;
    const distanceToNext = nextPlan
      ? Math.round(Math.hypot(nextPlan.centroidX - plan.centroidX, nextPlan.centroidY - plan.centroidY))
      : 0;
    const totalInElement = plan.totalInElement || 1;
    const elementIndex = plan.elementIndex || 1;
    const objectCompletion = Math.round((elementIndex / totalInElement) * 100);
    const currentObjIdx = currentObj ? currentObj.orderIndex : 1;

    this.onDebugUpdate({
      currentObjectName: plan.elementName || 'Objet en cours',
      currentRegionName: `Zone #${plan.id} (${plan.color})`,
      nextRegionName: nextPlan ? `Zone #${nextPlan.id} (${nextPlan.color})` : 'Fin du coloriage',
      nextObjectName: nextObj ? nextObj.name : 'Terminé',
      distanceToNext,
      colorLock: plan.color,
      strokeColorLock: isStrokeActive ? 'ACTIVE' : 'IDLE',
      objectCompletion,
      totalObjects: this.completePlan.totalObjects,
      currentObjectIndex: currentObjIdx,
      totalRegions: this.plans.length,
      currentRegionIndex: this.currentRegionIndex + 1,
    });
  }

  private async processNextRegion() {
    if (!this.isRunning || this.isPaused) return;

    if (this.currentRegionIndex >= this.plans.length) {
      this.isRunning = false;
      this.cursorState.isDrawing = false;
      this.cursorState.visible = false;
      this.onCursorChange({ ...this.cursorState });
      soundEngine.stopStroke();
      soundEngine.playCelebrationChime(true);
      if (this.englishLearningConfig?.enabled) {
        // 1. Wait for any active letter voice to finish talking first
        await englishVoiceEngine.waitUntilFinished();
        await new Promise(r => setTimeout(r, 400));

        // 2. Speak celebratory re-reading of the complete word with beautiful cute felicitations
        // and magical glowing letter synchronization!
        await englishVoiceEngine.celebrateWord(
          this.englishLearningConfig.targetWord,
          this.englishLearningConfig.spellingLetters,
          this.englishLearningConfig.celebrationPhrase,
          {
            lang: this.englishLearningConfig.voiceAccent,
            preferredVoiceName: this.englishLearningConfig.selectedVoiceName,
            rate: this.englishLearningConfig.speechRate,
            pitch: this.englishLearningConfig.speechPitch,
            onLetterGlow: (letter, index) => {
              if (this.onEnglishLetterSpoken) {
                this.onEnglishLetterSpoken(letter || '', index ?? -1);
              }
            },
            onAllGlow: () => {
              if (this.onEnglishLetterSpoken) {
                this.onEnglishLetterSpoken('ALL', -999);
              }
            },
          }
        );

        // 3. CRITICAL: Never finish or close video before the celebration voice finishes talking!
        await englishVoiceEngine.waitUntilFinished();
        // Hold 2.0s to admire the completed colored artwork in video
        await new Promise(r => setTimeout(r, 2000));
        if (this.onEnglishLetterSpoken) {
          this.onEnglishLetterSpoken('', -1);
        }
      }
      this.onComplete();
      return;
    }

    const plan = this.plans[this.currentRegionIndex];
    if (isWhiteColor(plan.color)) {
      this.currentRegionIndex++;
      this.processNextRegion();
      return;
    }

    const total = this.plans.length;
    const pct = Math.round((this.currentRegionIndex / total) * 100);

    this.onProgress(this.currentRegionIndex + 1, total, pct, plan);
    this.emitDebugState(plan, false);

    const lineData = this.canvasHandle.getLineArtData();
    if (!lineData) {
      this.currentRegionIndex++;
      this.processNextRegion();
      return;
    }

    // Synchronized English Learning Audio Narration & Letter Spelling
    if (this.englishLearningConfig?.enabled) {
      if (plan.isLetterPlan && plan.spelledLetter) {
        // Active letter region: pronounce this letter loud and clear!
        // We track by elementId so consecutive repeated letters (like 'P' & 'P' in 'APPLE') both speak!
        if (this.lastSpokenElementId !== plan.elementId) {
          // STRICT RULE: Never start letter while previous voice (element phrase or prior letter) is still talking!
          if (englishVoiceEngine.isVoiceSpeaking()) {
            await englishVoiceEngine.waitUntilFinished();
            await new Promise(r => setTimeout(r, 400));
          }
          if (!this.isRunning || this.isPaused) return;

          this.lastSpokenElementId = plan.elementId;
          this.lastSpokenLetter = plan.spelledLetter;

          // Find the 0-based index of this letter object among all letter objects
          const letterObjects = this.completePlan.objects.filter(o => o.isTextLetter);
          const letterObjIdx = letterObjects.findIndex(o => o.id === plan.elementId);
          const activeIndex =
            letterObjIdx >= 0
              ? letterObjIdx
              : Math.max(0, this.englishLearningConfig.spellingLetters.indexOf(plan.spelledLetter));

          soundEngine.playFillSound(true, 'kawaii_marimba');
          englishVoiceEngine.speakLetter(plan.spelledLetter, {
            lang: this.englishLearningConfig.voiceAccent,
            preferredVoiceName: this.englishLearningConfig.selectedVoiceName,
            rate: this.englishLearningConfig.speechRate,
            pitch: this.englishLearningConfig.speechPitch,
            mode: this.englishLearningConfig.letterPronunciationMode,
          });

          if (this.onEnglishLetterSpoken) {
            this.onEnglishLetterSpoken(plan.spelledLetter, activeIndex);
          }
        }
      } else {
        // Element region: speak object phrase when element coloring starts
        // STRICT: Never speak any letters while coloring the element!
        if (!this.hasSpokenElementPhrase && this.englishLearningConfig.objectPhrase) {
          this.hasSpokenElementPhrase = true;
          englishVoiceEngine.speakObjectPhrase(this.englishLearningConfig.objectPhrase, {
            lang: this.englishLearningConfig.voiceAccent,
            preferredVoiceName: this.englishLearningConfig.selectedVoiceName,
            rate: this.englishLearningConfig.speechRate,
            pitch: this.englishLearningConfig.speechPitch,
          });
          if (this.onEnglishElementSpoken) {
            this.onEnglishElementSpoken(this.englishLearningConfig.objectPhrase);
          }
        }
      }
    }

    const isLastInElement =
      this.currentRegionIndex === this.plans.length - 1 ||
      this.plans[this.currentRegionIndex + 1].elementId !== plan.elementId;

    const effectiveToolStyle: 'marker' | 'pencil' | 'stylus' =
      this.cursorStyle === 'auto' || !this.cursorStyle
        ? (plan.toolStyle || (plan.brushType === 'colored_pencil' || plan.brushType === 'pencil' ? 'pencil' : plan.brushType === 'marker' ? 'marker' : 'stylus'))
        : (this.cursorStyle === 'circle' || this.cursorStyle === 'hidden' ? 'stylus' : (this.cursorStyle as 'marker' | 'pencil' | 'stylus'));

    const effectiveToolName =
      effectiveToolStyle === 'marker'
        ? 'Feutre Copic 💖'
        : effectiveToolStyle === 'pencil'
        ? 'Crayon Bois ✏️'
        : 'Apple Pencil ✨';

    if (this.lastToolStyle !== null && this.lastToolStyle !== effectiveToolStyle) {
      this.updateCursor({
        toolStyle: effectiveToolStyle,
        toolName: effectiveToolName,
      });
      await new Promise(r => setTimeout(r, Math.round(160 / this.speedMultiplier)));
      if (!this.isRunning || this.isPaused) return;
    }
    this.lastToolStyle = effectiveToolStyle;

    // METHOD 1: BUCKET FILL
    if (plan.method === 'bucket') {
      soundEngine.stopStroke();
      await this.animateTravel(
        plan.seedX,
        plan.seedY,
        plan.color,
        plan.brushType,
        effectiveToolStyle,
        effectiveToolName
      );
      if (!this.isRunning || this.isPaused) return;

      this.updateCursor({
        x: plan.seedX,
        y: plan.seedY,
        isDrawing: true,
        pressure: 0.75,
        tiltAngle: 24,
        toolStyle: effectiveToolStyle,
        toolName: effectiveToolName,
      });
      this.emitDebugState(plan, true);

      // Synchronized ASMR Acoustic Engine: Tightly couple audio trigger on exact start frame of the ink sweep
      soundEngine.playFillSound(true, this.fillSoundPreset);

      const isEnglishMode = !!this.englishLearningConfig?.enabled;
      const fillDuration = isEnglishMode
        ? Math.max(180, Math.min(260, Math.round(220 / this.speedMultiplier)))
        : Math.max(300, Math.min(450, Math.round(380 / this.speedMultiplier)));

      await this.canvasHandle.animateBucketFill(
        plan.seedX,
        plan.seedY,
        plan.color,
        fillDuration,
        'marker'
      );

      this.lastStrokeEndPoint = { x: plan.seedX, y: plan.seedY };

      if (!this.isRunning || this.isPaused) return;

      this.updateCursor({
        isDrawing: false,
        pressure: 0.2,
      });
      this.emitDebugState(plan, false);

      // Focal-Point Micro-Zoom & Spring Bump when atomic object completes
      if (isLastInElement) {
        const completedObj = this.completePlan.objects.find(o => o.id === plan.elementId);
        if (completedObj) {
          this.canvasHandle.triggerObjectSpringBump(completedObj.center, 1.06, 420);
          if (this.onObjectComplete) {
            this.onObjectComplete(completedObj);
          }
        }
      }

      // Cadence & Breathing Engine Timing:
      const nextPlan = this.currentRegionIndex + 1 < this.plans.length
        ? this.plans[this.currentRegionIndex + 1]
        : null;
      const isNextLarge = nextPlan && (nextPlan.method === 'bucket' || nextPlan.pixelCount > 3500);
      const isCurrentSmall = plan.pixelCount < 600;
      const isNextSmall = nextPlan && (nextPlan.method === 'detail_small' || nextPlan.pixelCount < 600);
      const isSameElement = nextPlan && nextPlan.elementId === plan.elementId;

      let pauseDuration: number;
      if (isEnglishMode) {
        if (plan.isLetterPlan || isLastInElement) {
          // STRICT: Never proceed to the next letter or element while voice is talking!
          await englishVoiceEngine.waitUntilFinished();
          await new Promise(r => setTimeout(r, 450));
        }
        pauseDuration = isLastInElement ? 250 : (isSameElement ? 40 : 80);
      } else if (isLastInElement || isNextLarge) {
        // Deliberate 350ms–450ms micro-pause or dramatic dwell time before large fills or new objects
        const basePause = 350 + (plan.id % 5) * 25; // 350ms to 450ms
        pauseDuration = Math.max(180, Math.round(basePause / this.speedMultiplier));
      } else if (isSameElement && (isCurrentSmall || isNextSmall)) {
        // Rapid succession for small intricate adjacent elements (50ms–80ms intervals)
        const rapidPause = 50 + (plan.id % 4) * 10; // 50ms to 80ms
        pauseDuration = Math.max(30, Math.round(rapidPause / this.speedMultiplier));
      } else {
        const normalPause = 100 + (plan.id % 3) * 15;
        pauseDuration = Math.max(40, Math.round(normalPause / this.speedMultiplier));
      }

      this.animationTimer = window.setTimeout(() => {
        this.currentRegionIndex++;
        this.processNextRegion();
      }, pauseDuration);
      return;
    }

    // METHOD 2 & 3: FELT-TIP / MARKER OR SMALL DETAIL STROKES
    const strokes = generateNaturalStrokes(
      lineData,
      plan,
      this.humanization,
      this.lastStrokeEndPoint || undefined
    );
    if (strokes.length === 0) {
      this.canvasHandle.fillRegionAt(plan.seedX, plan.seedY, plan.color, plan.brushType);
      this.lastStrokeEndPoint = { x: plan.seedX, y: plan.seedY };
      if (isLastInElement) {
        const completedObj = this.completePlan.objects.find(o => o.id === plan.elementId);
        if (completedObj) {
          this.canvasHandle.triggerObjectSpringBump(completedObj.center, 1.06, 420);
          if (this.onObjectComplete) {
            this.onObjectComplete(completedObj);
          }
        }
      }
      this.currentRegionIndex++;
      this.processNextRegion();
      return;
    }

    const firstPt = strokes[0].points[0];

    await this.animateTravel(
      firstPt.x,
      firstPt.y,
      plan.color,
      plan.brushType,
      effectiveToolStyle,
      effectiveToolName
    );
    if (!this.isRunning || this.isPaused) return;

    const hesitation = Math.max(
      15,
      Math.round((55 + (plan.id % 4) * 10 * this.humanization) / this.speedMultiplier)
    );
    await new Promise(r => setTimeout(r, hesitation));
    if (!this.isRunning || this.isPaused) return;

    for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
      if (!this.isRunning || this.isPaused) break;
      const stroke = strokes[sIdx];

      if (sIdx > 0) {
        const strokeStart = stroke.points[0];
        const prevEnd = strokes[sIdx - 1].points[strokes[sIdx - 1].points.length - 1];
        const repositionDist = Math.hypot(strokeStart.x - prevEnd.x, strokeStart.y - prevEnd.y);
        if (repositionDist > 14) {
          await this.animateTravel(
            strokeStart.x,
            strokeStart.y,
            plan.color,
            plan.brushType,
            effectiveToolStyle,
            effectiveToolName
          );
          if (!this.isRunning || this.isPaused) break;
        }
      }

      await this.executeNaturalStroke(
        stroke,
        plan,
        effectiveToolStyle,
        effectiveToolName
      );

      this.lastStrokeEndPoint = stroke.points[stroke.points.length - 1];

      if (sIdx < strokes.length - 1) {
        soundEngine.dipStroke();
        const strokePause = Math.max(
          10,
          Math.round((25 + (sIdx % 3) * 12 * this.humanization) / this.speedMultiplier)
        );
        await new Promise(r => setTimeout(r, strokePause));
      }
    }

    if (!this.isRunning || this.isPaused) return;

    this.canvasHandle.fillRegionAt(plan.seedX, plan.seedY, plan.color, plan.brushType);

    if (isLastInElement) {
      soundEngine.stopStroke();
    } else {
      soundEngine.dipStroke();
    }
    this.emitDebugState(plan, false);

    // Focal-Point Micro-Zoom & Spring Bump when atomic object completes
    if (isLastInElement) {
      const completedObj = this.completePlan.objects.find(o => o.id === plan.elementId);
      if (completedObj) {
        this.canvasHandle.triggerObjectSpringBump(completedObj.center, 1.06, 420);
        if (this.onObjectComplete) {
          this.onObjectComplete(completedObj);
        }
      }
    }

    // Cadence & Breathing Engine Timing:
    const nextPlan = this.currentRegionIndex + 1 < this.plans.length
      ? this.plans[this.currentRegionIndex + 1]
      : null;
    const isNextLarge = nextPlan && (nextPlan.method === 'bucket' || nextPlan.pixelCount > 3500);
    const isCurrentSmall = plan.method === 'detail_small' || plan.pixelCount < 600;
    const isNextSmall = nextPlan && (nextPlan.method === 'detail_small' || nextPlan.pixelCount < 600);
    const isSameElement = nextPlan && nextPlan.elementId === plan.elementId;

    let transitionPause: number;
    const isEnglishMode = !!this.englishLearningConfig?.enabled;
    if (isEnglishMode) {
      if (plan.isLetterPlan || isLastInElement) {
        // STRICT: Never proceed to the next letter or element while voice is talking!
        await englishVoiceEngine.waitUntilFinished();
        await new Promise(r => setTimeout(r, 450));
      }
      transitionPause = isLastInElement ? 250 : (isSameElement ? 40 : 80);
    } else if (isLastInElement || isNextLarge) {
      // Deliberate 350ms–450ms micro-pause or dramatic dwell time before large fills or new objects
      const basePause = 350 + (plan.id % 5) * 25; // 350ms to 450ms
      transitionPause = Math.max(180, Math.round(basePause / this.speedMultiplier));
    } else if (isSameElement && (isCurrentSmall || isNextSmall)) {
      // Rapid succession for small intricate adjacent elements (50ms–80ms intervals)
      const rapidPause = 50 + (plan.id % 4) * 10; // 50ms to 80ms
      transitionPause = Math.max(30, Math.round(rapidPause / this.speedMultiplier));
    } else {
      const normalPause = 100 + (plan.id % 3) * 15;
      transitionPause = Math.max(40, Math.round(normalPause / this.speedMultiplier));
    }

    this.animationTimer = window.setTimeout(() => {
      this.currentRegionIndex++;
      this.processNextRegion();
    }, transitionPause);
  }

  private async executeNaturalStroke(
    stroke: RegionStroke,
    plan: RegionColorPlan,
    toolStyle?: 'marker' | 'pencil' | 'stylus',
    toolName?: string
  ): Promise<void> {
    const pts = stroke.points;
    if (pts.length === 0) return;

    const startPt = pts[0];
    const effectiveStyle = toolStyle || plan.toolStyle || this.cursorState.toolStyle;
    const effectiveName = toolName || plan.toolName || this.cursorState.toolName;

    if (Math.hypot(this.cursorState.x - startPt.x, this.cursorState.y - startPt.y) > 3) {
      this.updateCursor({
        x: startPt.x,
        y: startPt.y,
        isDrawing: false,
        pressure: 0.25,
        toolStyle: effectiveStyle,
        toolName: effectiveName,
      });
    }

    this.canvasHandle.startArtistStroke(
      startPt,
      plan.color,
      plan.brushType,
      stroke.brushSize,
      stroke.opacity,
      plan.seedX,
      plan.seedY
    );

    this.updateCursor({
      x: startPt.x,
      y: startPt.y,
      isDrawing: true,
      color: plan.color,
      brushType: plan.brushType,
      toolStyle: effectiveStyle,
      toolName: effectiveName,
      pressure: 0.75,
      tiltAngle: 30,
    });
    this.emitDebugState(plan, true);

    soundEngine.startStroke(plan.brushType, true);

    const detailedSteps: { x: number; y: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const numSteps = Math.max(1, Math.ceil(dist / 4));
      for (let s = 1; s <= numSteps; s++) {
        const t = s / numSteps;
        detailedSteps.push({
          x: Math.round(p0.x + (p1.x - p0.x) * t),
          y: Math.round(p0.y + (p1.y - p0.y) * t),
        });
      }
    }

    const totalSteps = detailedSteps.length;
    const baseDuration = Math.max(20, Math.min(130, totalSteps * 5.5));
    const duration = Math.max(14, Math.round(baseDuration / this.speedMultiplier));
    const stepDelay = Math.max(6, Math.round(duration / Math.max(1, totalSteps)));

    for (let step = 0; step < totalSteps; step++) {
      if (!this.isRunning || this.isPaused) break;
      const pt = detailedSteps[step];
      const progress = (step + 1) / totalSteps;
      const easePressure = 0.5 + 0.4 * Math.sin(Math.PI * progress);

      this.canvasHandle.continueArtistStroke(pt);
      this.updateCursor({
        x: pt.x,
        y: pt.y,
        isDrawing: true,
        pressure: easePressure,
      });
      soundEngine.onBrushMove(1.0 * easePressure, plan.brushType, true);
      await new Promise(r => setTimeout(r, stepDelay));
    }

    this.canvasHandle.endArtistStroke();
    soundEngine.dipStroke();
    this.updateCursor({
      isDrawing: false,
      pressure: 0.2,
      tiltAngle: 26,
    });
  }

  private animateTravel(
    targetX: number,
    targetY: number,
    nextColor: string,
    brushType: BrushType,
    toolStyle?: 'marker' | 'pencil' | 'stylus',
    toolName?: string
  ): Promise<void> {
    soundEngine.stopStroke();
    return new Promise(resolve => {
      const startX = this.cursorState.x;
      const startY = this.cursorState.y;
      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.hypot(dx, dy);

      const effectiveStyle = toolStyle || this.cursorState.toolStyle;
      const effectiveName = toolName || this.cursorState.toolName;

      if (dist < 4) {
        this.updateCursor({
          x: targetX,
          y: targetY,
          isDrawing: false,
          color: nextColor,
          brushType,
          toolStyle: effectiveStyle,
          toolName: effectiveName,
        });
        resolve();
        return;
      }

      const isEnglishMode = !!this.englishLearningConfig?.enabled;
      // Smooth humanized travel duration: quick for micro-shifts, graceful glide for larger transitions
      const baseDuration = isEnglishMode
        ? Math.min(130, Math.max(35, Math.pow(dist, 0.6) * 4.2))
        : Math.min(320, Math.max(85, Math.pow(dist, 0.72) * 8.5));
      const duration = Math.max(16, Math.round(baseDuration / this.speedMultiplier));
      const steps = Math.max(5, Math.round(duration / 16));
      let step = 0;
      const arcHeight = Math.min(32, Math.max(6, dist * 0.15));
      const midX = (startX + targetX) / 2;
      const midY = (startY + targetY) / 2 - arcHeight;

      this.updateCursor({
        isDrawing: false,
        color: nextColor,
        brushType,
        toolStyle: effectiveStyle,
        toolName: effectiveName,
        tiltAngle: 26,
        pressure: 0.2,
      });

      if (this.travelInterval !== null) {
        clearInterval(this.travelInterval);
      }

      this.travelInterval = window.setInterval(() => {
        if (!this.isRunning || this.isPaused) {
          if (this.travelInterval !== null) {
            clearInterval(this.travelInterval);
            this.travelInterval = null;
          }
          resolve();
          return;
        }

        step++;
        const t = Math.min(1, step / steps);
        // Humanized cubic ease-in-out curve for soft start and gentle settling
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const cx = (1 - ease) * (1 - ease) * startX + 2 * (1 - ease) * ease * midX + ease * ease * targetX;
        const cy = (1 - ease) * (1 - ease) * startY + 2 * (1 - ease) * ease * midY + ease * ease * targetY;

        this.updateCursor({
          x: Math.round(cx),
          y: Math.round(cy),
        });

        if (step >= steps) {
          if (this.travelInterval !== null) {
            clearInterval(this.travelInterval);
            this.travelInterval = null;
          }
          resolve();
        }
      }, 16);
    });
  }
}

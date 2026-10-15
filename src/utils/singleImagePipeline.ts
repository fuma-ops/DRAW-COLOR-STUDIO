import {
  KidDrawingStep,
  KidColoringStep,
} from './kidDrawingSteps';

export interface ValidationReport {
  isValid: boolean;
  outlineScore: number; // 0 - 100
  totalContourPaths: number;
  detectedParts: string[];
  colorRegionsCount: number;
  warnings: string[];
  autoFixedGaps: number;
}

export interface ProcessedCharacterData {
  originalColoredUrl: string;
  bwOutlineUrl: string;
  dottedGuideUrl: string;
  drawingSteps: KidDrawingStep[];
  coloringSteps: KidColoringStep[];
  validation: ValidationReport;
}

// Convert canvas to clean data URL
function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

// SVG to Data URL helper
function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

// Convert RGB to HEX
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b))
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

// Check if pixel is white, near-white, or transparent background
function isWhiteOrTransparent(r: number, g: number, b: number, a: number): boolean {
  if (a < 40) return true;
  return r >= 232 && g >= 232 && b >= 232 && Math.abs(r - g) <= 18 && Math.abs(r - b) <= 18;
}

// Check if pixel is part of a dark drawing outline
function isDarkOutline(r: number, g: number, b: number, a: number): boolean {
  if (a < 50) return false;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 145;
}

/**
 * Morphological Thinning: Zhang-Suen Algorithm
 * Reduces thick raster outlines down to a 1-pixel-wide skeleton medial axis,
 * preserving all loops, junctions, connectivity, and exact shapes.
 */
function zhangSuenThinning(
  grid: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const skel = new Uint8Array(grid);
  let changed = true;
  let iter = 0;

  // Directions around P1:
  // P9 P2 P3
  // P8 P1 P4
  // P7 P6 P5
  const getNeighbors = (x: number, y: number) => {
    const p2 = y > 0 ? skel[(y - 1) * width + x] : 0;
    const p3 = y > 0 && x < width - 1 ? skel[(y - 1) * width + (x + 1)] : 0;
    const p4 = x < width - 1 ? skel[y * width + (x + 1)] : 0;
    const p5 = y < height - 1 && x < width - 1 ? skel[(y + 1) * width + (x + 1)] : 0;
    const p6 = y < height - 1 ? skel[(y + 1) * width + x] : 0;
    const p7 = y < height - 1 && x > 0 ? skel[(y + 1) * width + (x - 1)] : 0;
    const p8 = x > 0 ? skel[y * width + (x - 1)] : 0;
    const p9 = y > 0 && x > 0 ? skel[(y - 1) * width + (x - 1)] : 0;
    return [p2, p3, p4, p5, p6, p7, p8, p9];
  };

  while (changed && iter < 18) {
    changed = false;
    iter++;

    // Step 1
    const toDelete1: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (skel[idx] === 0) continue;

        const [p2, p3, p4, p5, p6, p7, p8, p9] = getNeighbors(x, y);
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;

        let A = 0;
        const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        for (let i = 0; i < 8; i++) {
          if (seq[i] === 0 && seq[i + 1] === 1) A++;
        }
        if (A !== 1) continue;

        if (p2 * p4 * p6 !== 0) continue;
        if (p4 * p6 * p8 !== 0) continue;

        toDelete1.push(idx);
      }
    }

    if (toDelete1.length > 0) {
      for (const idx of toDelete1) skel[idx] = 0;
      changed = true;
    }

    // Step 2
    const toDelete2: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (skel[idx] === 0) continue;

        const [p2, p3, p4, p5, p6, p7, p8, p9] = getNeighbors(x, y);
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;

        let A = 0;
        const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        for (let i = 0; i < 8; i++) {
          if (seq[i] === 0 && seq[i + 1] === 1) A++;
        }
        if (A !== 1) continue;

        if (p2 * p4 * p8 !== 0) continue;
        if (p2 * p6 * p8 !== 0) continue;

        toDelete2.push(idx);
      }
    }

    if (toDelete2.length > 0) {
      for (const idx of toDelete2) skel[idx] = 0;
      changed = true;
    }
  }

  return skel;
}

/**
 * Traces 8-connected continuous strokes along the 1-pixel skeleton.
 * Ensures:
 * - Neighbor-to-neighbor step (distance <= sqrt(2) px), NEVER jumping across air.
 * - Endpoints traced first, closed loops second.
 * - Separate strokes stay strictly separate.
 */
function traceTopologicalPaths(
  skeleton: Uint8Array,
  width: number,
  height: number
): { x: number; y: number }[][] {
  const visited = new Uint8Array(skeleton.length);
  const strokes: { x: number; y: number }[][] = [];

  const getNeighbors = (x: number, y: number) => {
    const list: { x: number; y: number; idx: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (skeleton[nIdx] === 1) {
            list.push({ x: nx, y: ny, idx: nIdx });
          }
        }
      }
    }
    return list;
  };

  // Find degree (number of 8-neighbors) for each skeleton pixel
  const degrees = new Uint8Array(skeleton.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (skeleton[idx] === 1) {
        degrees[idx] = getNeighbors(x, y).length;
      }
    }
  }

  // Priority 1: Trace strokes starting from endpoints (degree 1)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (skeleton[idx] === 1 && degrees[idx] === 1 && visited[idx] === 0) {
        const stroke: { x: number; y: number }[] = [{ x, y }];
        visited[idx] = 1;

        let curX = x;
        let curY = y;
        let walking = true;

        while (walking) {
          walking = false;
          const nbrs = getNeighbors(curX, curY).filter(n => visited[n.idx] === 0);
          if (nbrs.length > 0) {
            // Pick neighbor that continues the trajectory
            const next = nbrs[0];
            visited[next.idx] = 1;
            stroke.push({ x: next.x, y: next.y });
            curX = next.x;
            curY = next.y;
            walking = true;
          }
        }

        if (stroke.length >= 4) {
          strokes.push(stroke);
        }
      }
    }
  }

  // Priority 2: Trace remaining unvisited skeleton pixels (closed loops)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (skeleton[idx] === 1 && visited[idx] === 0) {
        const stroke: { x: number; y: number }[] = [{ x, y }];
        visited[idx] = 1;

        let curX = x;
        let curY = y;
        let walking = true;

        while (walking) {
          walking = false;
          const nbrs = getNeighbors(curX, curY).filter(n => visited[n.idx] === 0);
          if (nbrs.length > 0) {
            const next = nbrs[0];
            visited[next.idx] = 1;
            stroke.push({ x: next.x, y: next.y });
            curX = next.x;
            curY = next.y;
            walking = true;
          }
        }

        if (stroke.length >= 4) {
          strokes.push(stroke);
        }
      }
    }
  }

  return strokes;
}

/**
 * Ramer-Douglas-Peucker simplification
 */
function simplifyPathRDP(
  points: { x: number; y: number }[],
  epsilon = 1.6
): { x: number; y: number }[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    let dist = 0;
    if (lenSq === 0) {
      dist = Math.hypot(pt.x - start.x, pt.y - start.y);
    } else {
      const t = Math.max(0, Math.min(1, ((pt.x - start.x) * dx + (pt.y - start.y) * dy) / lenSq));
      const projX = start.x + t * dx;
      const projY = start.y + t * dy;
      dist = Math.hypot(pt.x - projX, pt.y - projY);
    }

    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const rec1 = simplifyPathRDP(points.slice(0, index + 1), epsilon);
    const rec2 = simplifyPathRDP(points.slice(index), epsilon);
    return rec1.slice(0, -1).concat(rec2);
  } else {
    return [start, end];
  }
}

/**
 * Interpolates points so consecutive vertices are smoothly spaced at <= 5px.
 * Ensures the virtual pen glides smoothly with zero jumps or air skipping.
 */
function interpolateDensePoints(
  points: { x: number; y: number }[],
  maxDist = 5
): { x: number; y: number }[] {
  if (points.length < 2) return points;
  const res: { x: number; y: number }[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const steps = Math.max(1, Math.ceil(dist / maxDist));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      res.push({
        x: Math.round(p0.x + (p1.x - p0.x) * t),
        y: Math.round(p0.y + (p1.y - p0.y) * t),
      });
    }
  }

  return res;
}

/**
 * Converts ordered points into an SVG path string
 */
function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  const start = points[0];
  const end = points[points.length - 1];
  if (points.length >= 6 && Math.hypot(end.x - start.x, end.y - start.y) <= 8) {
    d += ' Z';
  }
  return d;
}

/**
 * Computes bounding box and center of a point set
 */
function computeBounds(points: { x: number; y: number }[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: Math.round((minX + maxX) / 2),
    centerY: Math.round((minY + maxY) / 2),
  };
}

/**
 * Traces the exact perimeter boundary of an enclosed region using Moore-Neighbor contour tracing,
 * producing a clean closed SVG polygon path that strictly encloses the region without leaking.
 */
function traceRegionBoundary(
  regionPixels: number[],
  width: number,
  height: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): string {
  const mask = new Uint8Array(width * height);
  for (const idx of regionPixels) {
    mask[idx] = 1;
  }

  // Find first pixel (top-leftmost)
  let startX = -1;
  let startY = -1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (mask[y * width + x] === 1) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) return '';

  // 8-neighbor directions clockwise:
  // 0: N, 1: NE, 2: E, 3: SE, 4: S, 5: SW, 6: W, 7: NW
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

  const boundaryPts: { x: number; y: number }[] = [{ x: startX, y: startY }];
  let curX = startX;
  let curY = startY;
  let dir = 7;

  let maxSteps = 3000;
  while (maxSteps-- > 0) {
    let found = false;
    const startSearch = (dir + 5) % 8;
    for (let i = 0; i < 8; i++) {
      const checkDir = (startSearch + i) % 8;
      const nx = curX + dx[checkDir];
      const ny = curY + dy[checkDir];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (mask[ny * width + nx] === 1) {
          curX = nx;
          curY = ny;
          dir = checkDir;
          boundaryPts.push({ x: curX, y: curY });
          found = true;
          break;
        }
      }
    }

    if (!found || (curX === startX && curY === startY && boundaryPts.length > 2)) {
      break;
    }
  }

  if (boundaryPts.length < 3) {
    return `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
  }

  // Simplify boundary with RDP
  const simplified = simplifyPathRDP(boundaryPts, 2.0);
  let d = `M ${simplified[0].x} ${simplified[0].y}`;
  for (let i = 1; i < simplified.length; i++) {
    d += ` L ${simplified[i].x} ${simplified[i].y}`;
  }
  d += ' Z';
  return d;
}

interface AnalyzedRegion {
  id: number;
  pixels: number[];
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  seedX: number;
  seedY: number;
  hasColor: boolean;
  colorHex: string;
  colorNameEn: string;
  instructionEn: string;
  /** Smallest larger region whose bounding box contains this one (eye inside head...) */
  parentId: number | null;
  /** Big shape of the character (head, body, wing...) as opposed to a small detail */
  isMajor: boolean;
}

/**
 * Extracts enclosed regions from the line art grid using connected-component flood fill,
 * traces their actual boundary polygons, and samples matching dominant colors from the original colored image.
 */
function analyzeRegions(
  outlineGrid: Uint8Array,
  colorData: Uint8ClampedArray,
  width: number,
  height: number
): { regions: AnalyzedRegion[]; regionGrid: Int32Array } {
  // regionGrid: -1 = outline barrier, 0 = unvisited, -2 = outer canvas background, >0 = region ID
  const regionGrid = new Int32Array(width * height);

  for (let i = 0; i < outlineGrid.length; i++) {
    if (outlineGrid[i] === 1) {
      regionGrid[i] = -1;
    }
  }

  // 1. Flood fill from outer borders (canvas paper background)
  const bgQueue: number[] = [];
  const markBg = (x: number, y: number) => {
    const idx = y * width + x;
    if (regionGrid[idx] === 0) {
      regionGrid[idx] = -2;
      bgQueue.push(idx);
    }
  };

  for (let x = 0; x < width; x++) {
    markBg(x, 0);
    markBg(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    markBg(0, y);
    markBg(width - 1, y);
  }

  let head = 0;
  while (head < bgQueue.length) {
    const curr = bgQueue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1,
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
    ];

    for (const n of neighbors) {
      if (n !== -1 && regionGrid[n] === 0) {
        regionGrid[n] = -2;
        bgQueue.push(n);
      }
    }
  }

  // 2. Scan for enclosed interior regions
  let nextRegionId = 1;
  const regions: AnalyzedRegion[] = [];

  for (let y = 5; y < height - 5; y++) {
    for (let x = 5; x < width - 5; x++) {
      const startIdx = y * width + x;
      if (regionGrid[startIdx] !== 0) continue;

      const currentRegionId = nextRegionId++;
      const regionPixels: number[] = [];
      const queue: number[] = [startIdx];
      regionGrid[startIdx] = currentRegionId;

      let rHead = 0;
      let minX = x, maxX = x, minY = y, maxY = y;

      while (rHead < queue.length) {
        const curr = queue[rHead++];
        regionPixels.push(curr);
        const px = curr % width;
        const py = Math.floor(curr / width);

        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        const neighbors = [
          py > 0 ? curr - width : -1,
          py < height - 1 ? curr + width : -1,
          px > 0 ? curr - 1 : -1,
          px < width - 1 ? curr + 1 : -1,
        ];

        for (const n of neighbors) {
          if (n !== -1 && regionGrid[n] === 0) {
            regionGrid[n] = currentRegionId;
            queue.push(n);
          }
        }
      }

      // Ignore microscopic noise
      if (regionPixels.length < 80) continue;

      // Find interior seed point (deepest inside region)
      const avgX = Math.round((minX + maxX) / 2);
      const avgY = Math.round((minY + maxY) / 2);
      let bestSeed = regionPixels[Math.floor(regionPixels.length / 2)];
      let bestDist = Infinity;

      for (const pIdx of regionPixels) {
        const px = pIdx % width;
        const py = Math.floor(pIdx / width);
        const d = Math.hypot(px - avgX, py - avgY);
        if (d < bestDist) {
          bestDist = d;
          bestSeed = pIdx;
        }
      }

      const seedX = bestSeed % width;
      const seedY = Math.floor(bestSeed / width);

      // Sample dominant color from colorData
      let sumR = 0, sumG = 0, sumB = 0, sampledCount = 0;
      for (let i = 0; i < regionPixels.length; i += 2) {
        const pIdx = regionPixels[i];
        const r = colorData[pIdx * 4];
        const g = colorData[pIdx * 4 + 1];
        const b = colorData[pIdx * 4 + 2];
        const a = colorData[pIdx * 4 + 3];

        if (isWhiteOrTransparent(r, g, b, a) || isDarkOutline(r, g, b, a)) continue;

        sumR += r;
        sumG += g;
        sumB += b;
        sampledCount++;
      }

      const hasColor = sampledCount > 0;
      let hex = '#FDE047';
      let nameEn = 'Honey Yellow';
      let promptEn = 'Sunny yellow! Paint paint!';

      if (sampledCount > 0) {
        const avgR = Math.round(sumR / sampledCount);
        const avgG = Math.round(sumG / sampledCount);
        const avgB = Math.round(sumB / sampledCount);
        hex = rgbToHex(avgR, avgG, avgB);

        // Classify color name & joyful English prompt
        if (avgR > 195 && avgG > 175 && avgB < 125) {
          nameEn = 'Honey Yellow';
          promptEn = 'Sunny yellow! Paint paint!';
        } else if (avgR > 195 && avgG < 155 && avgB > 140) {
          nameEn = 'Rosy Pink';
          promptEn = 'Pretty pink! Rosy cheeks!';
        } else if (avgB > 175 && avgR < 185) {
          nameEn = 'Pastel Sky Blue';
          promptEn = 'Sky blue! Soft wings!';
        } else if (avgR < 100 && avgG < 80 && avgB < 80) {
          nameEn = 'Dark Chocolate';
          promptEn = 'Chocolate brown! Sweet stripes!';
        } else if (avgR > 200 && avgG > 110 && avgB < 95) {
          nameEn = 'Bright Orange';
          promptEn = 'Bright orange! Warm colors!';
        } else if (avgG > 165 && avgR < 140) {
          nameEn = 'Mint Green';
          promptEn = 'Mint green! Fresh colors!';
        } else if (avgR > 130 && avgB > 160) {
          nameEn = 'Dreamy Purple';
          promptEn = 'Dreamy purple! Magic colors!';
        } else {
          nameEn = 'Vibrant Color';
          promptEn = 'Magical color! Paint paint!';
        }
      }

      regions.push({
        id: currentRegionId,
        pixels: regionPixels,
        area: regionPixels.length,
        minX,
        minY,
        maxX,
        maxY,
        centerX: Math.round((minX + maxX) / 2),
        centerY: Math.round((minY + maxY) / 2),
        seedX,
        seedY,
        hasColor,
        colorHex: hex,
        colorNameEn: nameEn,
        instructionEn: promptEn,
        parentId: null,
        isMajor: false,
      });
    }
  }

  return { regions, regionGrid };
}

/**
 * Marks which regions are MAJOR shapes (head, body, wings...) and which are small details
 * (eyes, cheeks...), and links every region to the larger region that contains it.
 * Returns the major regions in kid tutorial order: big shapes first, parents before children,
 * upper-left (head) before lower-right (body, tail).
 */
function classifyAndOrderMajors(regions: AnalyzedRegion[]): AnalyzedRegion[] {
  if (regions.length === 0) return [];
  const maxArea = Math.max(...regions.map(r => r.area));
  const margin = 3;

  for (const r of regions) {
    let parent: AnalyzedRegion | null = null;
    for (const p of regions) {
      if (p === r || p.area <= r.area) continue;
      if (
        r.minX >= p.minX - margin && r.maxX <= p.maxX + margin &&
        r.minY >= p.minY - margin && r.maxY <= p.maxY + margin
      ) {
        if (!parent || p.area < parent.area) parent = p;
      }
    }
    r.parentId = parent ? parent.id : null;
    r.isMajor = r.area >= Math.max(1200, maxArea * 0.1);
  }

  const key = (r: AnalyzedRegion) => r.centerY * 0.7 + r.centerX * 0.3;
  const majors = regions.filter(r => r.isMajor).sort((a, b) => key(a) - key(b));

  // Parent shapes must always be drawn before the shapes they contain
  const ordered: AnalyzedRegion[] = [];
  const emitted = new Set<number>();
  const byId = new Map(regions.map(r => [r.id, r]));
  const emit = (r: AnalyzedRegion) => {
    if (emitted.has(r.id)) return;
    const parent = r.parentId !== null ? byId.get(r.parentId) : undefined;
    if (parent && parent.isMajor) emit(parent);
    emitted.add(r.id);
    ordered.push(r);
  };
  majors.forEach(emit);
  return ordered;
}

/**
 * Coloring steps follow the same tutorial order as the drawing steps:
 * big shapes first, then the small colored details.
 */
function buildColoringSteps(
  regions: AnalyzedRegion[],
  orderedMajors: AnalyzedRegion[],
  width: number,
  height: number
): KidColoringStep[] {
  const minors = regions
    .filter(r => !r.isMajor && r.hasColor)
    .sort((a, b) => b.area - a.area);
  const chosen = [...orderedMajors, ...minors].slice(0, 8);

  return chosen.map((r, idx) => {
    const pad = 12;
    const fx1 = Math.max(0, r.minX - pad);
    const fy1 = Math.max(0, r.minY - pad);
    const fx2 = Math.min(width, r.maxX + pad);
    const fy2 = Math.min(height, r.maxY + pad);
    const fillPath = traceRegionBoundary(r.pixels, width, height, r.minX, r.minY, r.maxX, r.maxY);

    return {
      id: `color_region_${idx + 1}`,
      stepNumber: idx + 1,
      totalSteps: chosen.length,
      partName: r.colorNameEn,
      partNameEn: r.colorNameEn,
      emoji: idx === 0 ? '🍯' : idx === 1 ? '🍫' : idx === 2 ? '🪽' : idx === 3 ? '🌸' : '✨',
      colorHex: r.colorHex,
      colorNameFr: r.colorNameEn,
      colorNameEn: r.colorNameEn,
      instructionFr: r.instructionEn,
      instructionEn: r.instructionEn,
      felicitationFr: 'Superbe couleur !',
      felicitationEn: r.instructionEn,
      fillPath,
      regionSeed: { x: r.seedX, y: r.seedY },
      glitterContourPath: `M ${fx1} ${fy1} L ${fx2} ${fy1} L ${fx2} ${fy2} L ${fx1} ${fy2} Z`,
      glitterCenter: { x: Math.round((fx1 + fx2) / 2), y: Math.round((fy1 + fy2) / 2) },
    };
  });
}

type Pt = { x: number; y: number };
type TracedStroke = { d: string; points: Pt[]; bounds: ReturnType<typeof computeBounds> };

const MAX_DRAWING_STEPS = 8;
const MAX_MAJOR_STEPS = 5;
/** Skeleton pieces up to this many pixels (and visually small) are "details": eyes, mouth, cheeks, feet... */
const DETAIL_MAX_PIXELS = 300;

/**
 * Builds the drawing steps so the child draws ONE WHOLE SHAPE AT A TIME:
 *   1. big shapes in tutorial order (head -> body -> wings...), each one fully finished,
 *   2. then small details grouped by kind (both eyes together, then mouth, then feet...).
 *
 * Every skeleton pixel is owned by exactly one step, so nothing is drawn twice and
 * nothing is skipped (the old logic grouped strokes by distance and dropped everything after 6 groups).
 */
function buildTutorialDrawingSteps(
  skeleton: Uint8Array,
  regionGrid: Int32Array,
  regions: AnalyzedRegion[],
  orderedMajors: AnalyzedRegion[],
  width: number,
  height: number
): KidDrawingStep[] {
  const byId = new Map(regions.map(r => [r.id, r]));

  // ---- Step groups: majors first ------------------------------------------------
  const majorGroupOf = new Map<number, number>(); // regionId -> group index
  orderedMajors.forEach((r, i) => majorGroupOf.set(r.id, Math.min(i, MAX_MAJOR_STEPS - 1)));
  const majorGroupCount = Math.min(orderedMajors.length, MAX_MAJOR_STEPS);

  /** Group index of the major shape that owns (or contains) a region, or -1 */
  const groupOfRegion = (regionId: number): number => {
    let cur: AnalyzedRegion | undefined = byId.get(regionId);
    let guard = 0;
    while (cur && guard++ < 20) {
      const g = majorGroupOf.get(cur.id);
      if (g !== undefined) return g;
      cur = cur.parentId !== null ? byId.get(cur.parentId) : undefined;
    }
    return -1;
  };

  // ---- Skeleton connected components (8-neighbour) -------------------------------
  const cc = new Int32Array(skeleton.length).fill(-1);
  const comps: { pixels: number[]; minX: number; minY: number; maxX: number; maxY: number }[] = [];
  for (let i = 0; i < skeleton.length; i++) {
    if (skeleton[i] !== 1 || cc[i] !== -1) continue;
    const id = comps.length;
    const comp = { pixels: [] as number[], minX: width, minY: height, maxX: 0, maxY: 0 };
    const stack = [i];
    cc[i] = id;
    while (stack.length) {
      const cur = stack.pop()!;
      comp.pixels.push(cur);
      const x = cur % width;
      const y = (cur - x) / width;
      if (x < comp.minX) comp.minX = x;
      if (x > comp.maxX) comp.maxX = x;
      if (y < comp.minY) comp.minY = y;
      if (y > comp.maxY) comp.maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (skeleton[n] === 1 && cc[n] === -1) {
            cc[n] = id;
            stack.push(n);
          }
        }
      }
    }
    comps.push(comp);
  }

  /** Nearest enclosed region around a point (ignores ink and outer paper) */
  const nearestRegionId = (px: number, py: number, maxR: number): number => {
    for (let r = 1; r <= maxR; r += 2) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const v = regionGrid[ny * width + nx];
          if (v > 0) return v;
        }
      }
    }
    return -1;
  };

  // ---- Small detached pieces become detail items --------------------------------
  interface DetailItem { comp: number; size: number; cx: number; cy: number; parent: number }
  const details: DetailItem[] = [];
  const bigComps: number[] = [];
  comps.forEach((c, id) => {
    const w = c.maxX - c.minX;
    const h = c.maxY - c.minY;
    const small = c.pixels.length <= DETAIL_MAX_PIXELS && Math.max(w, h) <= width * 0.25;
    if (!small) {
      bigComps.push(id);
      return;
    }
    const cx = Math.round((c.minX + c.maxX) / 2);
    const cy = Math.round((c.minY + c.maxY) / 2);
    const rid = nearestRegionId(cx, cy, 24);
    details.push({ comp: id, size: c.pixels.length, cx, cy, parent: rid === -1 ? -1 : groupOfRegion(rid) });
  });

  // Cluster details: same parent shape + similar size => one step (both eyes together)
  interface DetailCluster { items: DetailItem[]; parent: number; cx: number; cy: number }
  const clusters: DetailCluster[] = [];
  const parents = Array.from(new Set(details.map(d => d.parent)));
  for (const parent of parents) {
    const items = details.filter(d => d.parent === parent).sort((a, b) => b.size - a.size);
    let current: DetailItem[] = [];
    const flush = () => {
      if (!current.length) return;
      clusters.push({
        items: current,
        parent,
        cx: Math.round(current.reduce((s, i) => s + i.cx, 0) / current.length),
        cy: Math.round(current.reduce((s, i) => s + i.cy, 0) / current.length),
      });
      current = [];
    };
    for (const it of items) {
      if (current.length && current[0].size / Math.max(1, it.size) > 2.5) flush();
      current.push(it);
    }
    flush();
  }
  // Details inside a shape follow that shape's order; loose pieces (feet, antennae) come last
  clusters.sort((a, b) => {
    const pa = a.parent === -1 ? 99 : a.parent;
    const pb = b.parent === -1 ? 99 : b.parent;
    return pa !== pb ? pa - pb : a.cy - b.cy;
  });
  // Never exceed the step budget: fold the smallest trailing clusters into the last allowed one
  const maxClusters = Math.max(0, MAX_DRAWING_STEPS - majorGroupCount);
  while (clusters.length > maxClusters && clusters.length > 1) {
    const extra = clusters.pop()!;
    clusters[clusters.length - 1].items.push(...extra.items);
  }

  const totalGroups = majorGroupCount + clusters.length;
  if (totalGroups === 0) return [];

  // ---- Assign every skeleton pixel to exactly one group --------------------------
  const groupOfPixel = new Int16Array(skeleton.length).fill(-1);
  clusters.forEach((cl, ci) => {
    for (const it of cl.items) {
      for (const p of comps[it.comp].pixels) groupOfPixel[p] = majorGroupCount + ci;
    }
  });

  const R = 6;
  for (const id of bigComps) {
    for (const p of comps[id].pixels) {
      const x = p % width;
      const y = (p - x) / width;
      // The earliest shape touching this line owns it => shared edges are drawn once, with the first shape
      let best = Infinity;
      for (let dy = -R; dy <= R; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const v = regionGrid[ny * width + nx];
          if (v > 0) {
            const g = groupOfRegion(v);
            if (g !== -1 && g < best) best = g;
          }
        }
      }
      if (best === Infinity) {
        const rid = nearestRegionId(x, y, 30);
        const g = rid === -1 ? -1 : groupOfRegion(rid);
        best = g === -1 ? Math.max(0, majorGroupCount - 1) : g;
      }
      groupOfPixel[p] = Math.min(best, totalGroups - 1);
    }
  }

  // ---- Trace each group's pixels into pen strokes --------------------------------
  const tracedGroups: TracedStroke[][] = [];
  for (let g = 0; g < totalGroups; g++) {
    const mask = new Uint8Array(skeleton.length);
    let count = 0;
    for (let i = 0; i < mask.length; i++) {
      if (groupOfPixel[i] === g) {
        mask[i] = 1;
        count++;
      }
    }
    if (count === 0) { tracedGroups.push([]); continue; }

    const strokes = traceTopologicalPaths(mask, width, height).map(st => {
      const simplified = simplifyPathRDP(st, 1.6);
      let dense = interpolateDensePoints(simplified, 5);
      const first = dense[0];
      const last = dense[dense.length - 1];
      // Close loops so the pen finishes the circle exactly where it started
      if (dense.length >= 6 && Math.hypot(last.x - first.x, last.y - first.y) <= 8) {
        dense = [...dense, { x: first.x, y: first.y }];
      }
      return { d: pointsToSvgPath(simplified), points: dense, bounds: computeBounds(dense) };
    });
    // Drop tiny leftover spurs so the pen never lifts for a 1-2px fragment of a shape that is already drawn
    const longest = Math.max(...strokes.map(st => st.points.length));
    const clean = longest >= 30 ? strokes.filter(st => st.points.length >= 6) : strokes;
    tracedGroups.push(orderStrokesForPen(clean));
  }

  // ---- Describe the steps ----------------------------------------------------------
  const MAJOR_LABELS = [
    { name: 'Round Head', voice: 'Round round head! Big circle!', emoji: '🟡' },
    { name: 'Chubby Body', voice: 'Now the chubby body!', emoji: '🐝' },
    { name: 'Soft Wings & Big Parts', voice: 'Big soft shapes! Flap flap!', emoji: '🪽' },
    { name: 'Next Big Shape', voice: 'Another big shape! You can do it!', emoji: '🌟' },
    { name: 'More Big Shapes', voice: 'Almost there! One more big shape!', emoji: '🌟' },
  ];
  const labelFor = (g: number): { name: string; voice: string; emoji: string } => {
    if (g < majorGroupCount) return MAJOR_LABELS[Math.min(g, MAJOR_LABELS.length - 1)];
    const cl = clusters[g - majorGroupCount];
    const insideShape = cl.parent !== -1;
    const firstInside = clusters.findIndex(c => c.parent !== -1) === g - majorGroupCount;
    if (insideShape && firstInside && cl.items.length >= 2) {
      return { name: 'Cute Eyes', voice: 'Two cute eyes! Dot dot!', emoji: '👀' };
    }
    if (insideShape) {
      return { name: 'Smile & Face Details', voice: 'Cute eyes and happy smile!', emoji: '😊' };
    }
    if (cl.items.length >= 2) {
      return { name: 'Tiny Feet & Details', voice: 'Tiny details! Tap tap tap!', emoji: '✨' };
    }
    return { name: 'Final Detail', voice: 'One last little detail!', emoji: '✨' };
  };

  const nonEmpty = tracedGroups
    .map((strokes, g) => ({ strokes, g }))
    .filter(x => x.strokes.length > 0);

  return nonEmpty.map(({ strokes, g }, idx) => {
    const allPts = strokes.flatMap(s => s.points);
    const b = computeBounds(allPts);
    const lbl = labelFor(g);
    const pad = 16;
    const gx1 = Math.max(10, b.minX - pad);
    const gy1 = Math.max(10, b.minY - pad);
    const gx2 = Math.min(width - 10, b.maxX + pad);
    const gy2 = Math.min(height - 10, b.maxY + pad);

    return {
      id: `step_${idx + 1}`,
      stepNumber: idx + 1,
      totalSteps: nonEmpty.length,
      partName: lbl.name,
      partNameEn: lbl.name,
      emoji: lbl.emoji,
      instructionFr: lbl.voice,
      instructionEn: lbl.voice,
      felicitationFr: 'Superbe !',
      felicitationEn: lbl.voice,
      praiseTitleFr: `🌟 ${lbl.name.toUpperCase()} !`,
      praiseTitleEn: `🌟 ${lbl.name.toUpperCase()}!`,
      badgeColor: '#F59E0B',
      tool: 'pen' as const,
      strokeColor: '#18181B',
      strokeWidth: 5,
      glitterContourPath: `M ${gx1} ${gy1} L ${gx2} ${gy1} L ${gx2} ${gy2} L ${gx1} ${gy2} Z`,
      glitterCenter: { x: b.centerX, y: b.centerY },
      paths: strokes.map(s => ({ d: s.d, points: s.points })),
    };
  });
}

/** Longest stroke first (the main outline), then always the nearest next stroke so the pen barely travels. */
function orderStrokesForPen(strokes: TracedStroke[]): TracedStroke[] {
  if (strokes.length <= 1) return strokes;
  const remaining = [...strokes].sort((a, b) => b.points.length - a.points.length);
  const out: TracedStroke[] = [remaining.shift()!];
  while (remaining.length) {
    const tail = out[out.length - 1].points;
    const end = tail[tail.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = Math.min(
        Math.hypot(s.points[0].x - end.x, s.points[0].y - end.y),
        Math.hypot(s.points[s.points.length - 1].x - end.x, s.points[s.points.length - 1].y - end.y)
      );
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    out.push(remaining.splice(bestIdx, 1)[0]);
  }
  return out;
}

/**
 * Master Single-Image Pipeline:
 * Analyzes one fully colored character image:
 * 1. Analyzes the drawing contours on the colored image.
 * 2. REMOVES all colors completely to create a pure white background with black outlines.
 * 3. Converts the outlines into a clean DOTTED GUIDE to draw on it.
 * 4. Generates ordered smooth vector paths for the virtual pen to trace without jumps.
 * 5. Extracts enclosed regions and samples matching reference colors for progressive coloring.
 */
export async function processColoredCharacterImage(
  imageSrc: string
): Promise<ProcessedCharacterData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const size = 800;

        // 1. Offscreen Canvas for Colored Reference
        const colorCanvas = document.createElement('canvas');
        colorCanvas.width = size;
        colorCanvas.height = size;
        const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
        if (!colorCtx) throw new Error('Cannot get 2d context for color analysis');

        colorCtx.fillStyle = '#FFFFFF';
        colorCtx.fillRect(0, 0, size, size);

        // Fit image into 800x800 preserving aspect ratio with clean 45px padding
        const targetInnerSize = 710;
        const aspect = img.width / img.height;
        let dw = targetInnerSize;
        let dh = targetInnerSize;
        let dx = 45;
        let dy = 45;

        if (aspect > 1) {
          dh = targetInnerSize / aspect;
          dy = 45 + (targetInnerSize - dh) / 2;
        } else {
          dw = targetInnerSize * aspect;
          dx = 45 + (targetInnerSize - dw) / 2;
        }
        colorCtx.drawImage(img, dx, dy, dw, dh);

        const colorImgData = colorCtx.getImageData(0, 0, size, size);
        const data = colorImgData.data;

        // 2. Extract Line Art & REMOVE ALL COLORS!
        // We create a binary outlineGrid: 1 = outline stroke, 0 = background / color fill
        const outlineGrid = new Uint8Array(size * size);
        let darkPixelCount = 0;

        for (let y = 1; y < size - 1; y++) {
          for (let x = 1; x < size - 1; x++) {
            const idx = (y * size + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (isDarkOutline(r, g, b, a)) {
              outlineGrid[y * size + x] = 1;
              darkPixelCount++;
              continue;
            }

            // High contrast color edge / boundary (Sobel gradient)
            const rightIdx = (y * size + (x + 1)) * 4;
            const downIdx = ((y + 1) * size + x) * 4;

            const d1 = Math.abs(r - data[rightIdx]) + Math.abs(g - data[rightIdx + 1]) + Math.abs(b - data[rightIdx + 2]);
            const d2 = Math.abs(r - data[downIdx]) + Math.abs(g - data[downIdx + 1]) + Math.abs(b - data[downIdx + 2]);

            if (d1 > 115 || d2 > 115) {
              outlineGrid[y * size + x] = 1;
              darkPixelCount++;
            }
          }
        }

        // 3. Skeletonize via Zhang-Suen Thinning to find the exact medial contours
        const skeleton = zhangSuenThinning(outlineGrid, size, size);

        // 4. Trace topological 8-connected continuous strokes (never jumping across air)
        const rawStrokes = traceTopologicalPaths(skeleton, size, size);

        // 5. Simplify and densely interpolate points (smooth pen tracking <= 5px per step)
        const processedStrokes = rawStrokes.map(st => {
          const simplified = simplifyPathRDP(st, 1.6);
          const dense = interpolateDensePoints(simplified, 5);
          const d = pointsToSvgPath(simplified);
          const bounds = computeBounds(dense);
          return { d, points: dense, bounds };
        });

        // 6. RENDER CLEAN B&W OUTLINES (All colors removed completely!)
        const bwCanvas = document.createElement('canvas');
        bwCanvas.width = size;
        bwCanvas.height = size;
        const bwCtx = bwCanvas.getContext('2d', { willReadFrequently: true })!;

        bwCtx.fillStyle = '#FFFFFF';
        bwCtx.fillRect(0, 0, size, size);

        bwCtx.strokeStyle = '#18181B';
        bwCtx.lineWidth = 6;
        bwCtx.lineCap = 'round';
        bwCtx.lineJoin = 'round';

        for (const st of processedStrokes) {
          bwCtx.beginPath();
          bwCtx.moveTo(st.points[0].x, st.points[0].y);
          for (let i = 1; i < st.points.length; i++) {
            bwCtx.lineTo(st.points[i].x, st.points[i].y);
          }
          bwCtx.stroke();
        }

        // 7. BUILD DOTTED GUIDE (Clean white canvas with ONLY dotted lines to draw on!)
        // Render both an SVG and high-resolution raster dotted canvas
        const dottedCanvas = document.createElement('canvas');
        dottedCanvas.width = size;
        dottedCanvas.height = size;
        const dotCtx = dottedCanvas.getContext('2d')!;

        dotCtx.fillStyle = '#FFFFFF';
        dotCtx.fillRect(0, 0, size, size);

        dotCtx.strokeStyle = '#64748B';
        dotCtx.lineWidth = 5;
        dotCtx.lineCap = 'round';
        dotCtx.lineJoin = 'round';
        dotCtx.setLineDash([6, 9]);

        let dottedSvgPaths = '';
        for (const st of processedStrokes) {
          dotCtx.beginPath();
          dotCtx.moveTo(st.points[0].x, st.points[0].y);
          for (let i = 1; i < st.points.length; i++) {
            dotCtx.lineTo(st.points[i].x, st.points[i].y);
          }
          dotCtx.stroke();

          dottedSvgPaths += `<path d="${st.d}" />\n`;
        }

        const dottedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#FFFFFF" />
  <g fill="none" stroke="#64748B" stroke-width="5" stroke-dasharray="6,9" stroke-linecap="round" stroke-linejoin="round">
    ${dottedSvgPaths}
  </g>
</svg>
`;

        // 8. Find the character's closed shapes (head, body, eyes...) and order them like a kid tutorial
        const { regions, regionGrid } = analyzeRegions(outlineGrid, data, size, size);
        const orderedMajors = classifyAndOrderMajors(regions);

        // 9. Drawing steps: one WHOLE shape at a time (head -> body -> big parts -> eyes -> details),
        //    then coloring steps in the very same order
        const drawingSteps = buildTutorialDrawingSteps(skeleton, regionGrid, regions, orderedMajors, size, size);
        const coloringSteps = buildColoringSteps(regions, orderedMajors, size, size);

        // 10. Validation Report
        const warnings: string[] = [];
        if (darkPixelCount < 60) {
          warnings.push('Image contrast is faint. Contours may need manual touch-up.');
        }
        if (drawingSteps.length < 2) {
          warnings.push('Fewer than 2 drawing steps detected. Character lines may be incomplete.');
        }
        if (coloringSteps.length === 0) {
          warnings.push('No enclosed coloring regions detected. Outlines may have open gaps.');
        }

        const validation: ValidationReport = {
          isValid: warnings.length === 0,
          outlineScore: Math.min(100, Math.round((darkPixelCount / 220) * 100)),
          totalContourPaths: processedStrokes.length,
          detectedParts: drawingSteps.map(s => s.partNameEn),
          colorRegionsCount: coloringSteps.length,
          warnings,
          autoFixedGaps: 0,
        };

        resolve({
          originalColoredUrl: canvasToDataUrl(colorCanvas),
          bwOutlineUrl: canvasToDataUrl(bwCanvas),
          dottedGuideUrl: svgToDataUrl(dottedSvg),
          drawingSteps,
          coloringSteps,
          validation,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load colored image for processing'));
    };

    img.src = imageSrc;
  });
}

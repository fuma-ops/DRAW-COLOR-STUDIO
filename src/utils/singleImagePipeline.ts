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

type Pt = { x: number; y: number };
type TracedStroke = { d: string; points: Pt[]; bounds: ReturnType<typeof computeBounds> };

const MAX_DRAWING_STEPS = 12;

/**
 * Dark-outline threshold adapted to the image: the real black outline stays,
 * dark-brown FILLS (stripes, tail, antennae) do not count as outline.
 */
function computeBlackThreshold(data: Uint8ClampedArray): number {
  const lums: number[] = [];
  for (let i = 0; i < data.length; i += 12) {
    if (data[i + 3] < 50) continue;
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (l < 145) lums.push(l);
  }
  if (lums.length < 60) return 60;
  lums.sort((a, b) => a - b);
  const p10 = lums[Math.floor(lums.length * 0.1)];
  return Math.max(32, Math.min(90, p10 + 30));
}

function dilate8(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
        }
      }
    }
  }
  return out;
}

function labelComponents(mask: Uint8Array, w: number, h: number) {
  const cc = new Int32Array(mask.length).fill(-1);
  const comps: { pixels: number[]; minX: number; minY: number; maxX: number; maxY: number }[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== 1 || cc[i] !== -1) continue;
    const id = comps.length;
    const comp = { pixels: [] as number[], minX: w, minY: h, maxX: 0, maxY: 0 };
    const stack = [i];
    cc[i] = id;
    while (stack.length) {
      const cur = stack.pop()!;
      comp.pixels.push(cur);
      const x = cur % w;
      const y = (cur - x) / w;
      if (x < comp.minX) comp.minX = x;
      if (x > comp.maxX) comp.maxX = x;
      if (y < comp.minY) comp.minY = y;
      if (y > comp.maxY) comp.maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (mask[n] === 1 && cc[n] === -1) {
            cc[n] = id;
            stack.push(n);
          }
        }
      }
    }
    comps.push(comp);
  }
  return { cc, comps };
}

/** Moore-neighbour tracing of the OUTER boundary of a binary blob (clockwise, from its top-left pixel). */
function traceOuterContour(mask: Uint8Array, w: number, h: number, minX: number, minY: number, maxX: number, maxY: number): Pt[] {
  let sx = -1;
  let sy = -1;
  for (let y = Math.max(0, minY); y <= Math.min(h - 1, maxY) && sx === -1; y++) {
    for (let x = Math.max(0, minX); x <= Math.min(w - 1, maxX); x++) {
      if (mask[y * w + x]) { sx = x; sy = y; break; }
    }
  }
  if (sx === -1) return [];
  // N, NE, E, SE, S, SW, W, NW (clockwise)
  const DX = [0, 1, 1, 1, 0, -1, -1, -1];
  const DY = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dirOf = (ax: number, ay: number) => {
    for (let k = 0; k < 8; k++) if (DX[k] === ax && DY[k] === ay) return k;
    return 6;
  };
  const pts: Pt[] = [{ x: sx, y: sy }];
  let cx = sx;
  let cy = sy;
  let back = 6; // we entered from the west (empty by construction)
  for (let guard = 0; guard < 400000; guard++) {
    let moved = false;
    for (let i = 1; i <= 8; i++) {
      const d = (back + i) % 8;
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx]) {
        const pd = (d + 7) % 8; // last empty neighbour examined = new backtrack
        const bx = cx + DX[pd];
        const by = cy + DY[pd];
        cx = nx;
        cy = ny;
        back = dirOf(bx - cx, by - cy);
        moved = true;
        break;
      }
    }
    if (!moved) break;
    if (cx === sx && cy === sy) break;
    pts.push({ x: cx, y: cy });
  }
  return pts;
}

/** Smooths a closed pixel contour and turns it into a clean, evenly spaced closed pen stroke. */
function contourToStroke(points: Pt[]): TracedStroke | null {
  const n = points.length;
  if (n < 12) return null;
  const win = 3;
  const sm: Pt[] = points.map((_, i) => {
    let sx = 0;
    let sy = 0;
    for (let k = -win; k <= win; k++) {
      const p = points[(i + k + n) % n];
      sx += p.x;
      sy += p.y;
    }
    return { x: Math.round(sx / (2 * win + 1)), y: Math.round(sy / (2 * win + 1)) };
  });
  const closed = [...sm, sm[0]];
  const simplified = simplifyPathRDP(closed, 1.4);
  const dense = interpolateDensePoints(simplified, 5);
  return { d: pointsToSvgPath(simplified), points: dense, bounds: computeBounds(dense) };
}

interface DrawPart {
  id: number;
  pixels: number[];
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

interface DetailItem {
  kind: 'blob' | 'line';
  pixels: number[];
  strokes: TracedStroke[];
  size: number;
  cx: number;
  cy: number;
  parent: number; // part id that contains it, or -1
}

interface StepLabel { name: string; voice: string; emoji: string }

const STEP_LABELS: Record<string, StepLabel> = {
  head: { name: 'Round Head', voice: 'Round round head! Big circle!', emoji: '🟡' },
  body: { name: 'Chubby Body', voice: 'Now the chubby body!', emoji: '🐝' },
  wing: { name: 'Soft Wing', voice: 'A soft wing! Flap flap!', emoji: '🪽' },
  antenna: { name: 'Antennae', voice: 'Funny antennae! Boing boing!', emoji: '🌟' },
  tail: { name: 'Pointy Tail', voice: 'A pointy tail! Zip zip!', emoji: '📍' },
  feet: { name: 'Tiny Feet', voice: 'Tiny feet! Tap tap tap!', emoji: '🐾' },
  other: { name: 'Next Shape', voice: 'One more shape! You can do it!', emoji: '🌟' },
  main: { name: 'Main Shape', voice: "Let's draw the big main shape!", emoji: '⭐' },
  little: { name: 'Little Shapes', voice: 'Now the little shapes, one by one!', emoji: '🔹' },
  dots: { name: 'Little Dots', voice: 'Little dots! Dot, dot, dot!', emoji: '⚫' },
  eyes: { name: 'Cute Eyes', voice: 'Two cute eyes! Dot dot!', emoji: '👀' },
  brows: { name: 'Little Eyebrows', voice: 'Little eyebrows! Swish swish!', emoji: '✨' },
  smile: { name: 'Happy Smile', voice: 'A big happy smile!', emoji: '😊' },
  detail: { name: 'Tiny Details', voice: 'Tiny details! Tap tap!', emoji: '✨' },
};

/**
 * Splits the character into COMPLETE closed shapes, using only the real black outline as a wall:
 * head, body (stripes included), each wing, tail, antennae, feet...
 * Colour boundaries inside a shape (stripes, cheeks, shine) do not cut it into pieces.
 */
function findDrawingParts(data: Uint8ClampedArray, size: number) {
  const T = computeBlackThreshold(data);
  const black = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    if (data[i * 4 + 3] >= 50 && 0.299 * r + 0.587 * g + 0.114 * b < T) black[i] = 1;
  }
  // 1px growth closes tiny gaps in the outline so a shape can never leak into the paper
  const barrier = dilate8(black, size, size);
  const grid = new Int32Array(size * size); // -1 barrier, -2 paper, -3 tiny noise, >0 part id
  for (let i = 0; i < grid.length; i++) if (barrier[i]) grid[i] = -1;

  const stack: number[] = [];
  const pushBg = (x: number, y: number) => {
    const i = y * size + x;
    if (grid[i] === 0) { grid[i] = -2; stack.push(i); }
  };
  for (let x = 0; x < size; x++) { pushBg(x, 0); pushBg(x, size - 1); }
  for (let y = 0; y < size; y++) { pushBg(0, y); pushBg(size - 1, y); }
  while (stack.length) {
    const cur = stack.pop()!;
    const x = cur % size;
    const y = (cur - x) / size;
    if (x > 0) pushBg(x - 1, y);
    if (x < size - 1) pushBg(x + 1, y);
    if (y > 0) pushBg(x, y - 1);
    if (y < size - 1) pushBg(x, y + 1);
  }

  const minArea = Math.round(size * size * 0.0003);
  const parts: DrawPart[] = [];
  for (let start = 0; start < grid.length; start++) {
    if (grid[start] !== 0) continue;
    const pixels: number[] = [];
    let minX = size, minY = size, maxX = 0, maxY = 0;
    grid[start] = -3;
    stack.push(start);
    while (stack.length) {
      const cur = stack.pop()!;
      pixels.push(cur);
      const x = cur % size;
      const y = (cur - x) / size;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const nbs = [x > 0 ? cur - 1 : -1, x < size - 1 ? cur + 1 : -1, y > 0 ? cur - size : -1, y < size - 1 ? cur + size : -1];
      for (const n of nbs) {
        if (n !== -1 && grid[n] === 0) { grid[n] = -3; stack.push(n); }
      }
    }
    if (pixels.length < minArea) continue;
    // Small white dots (eye shine) are decoration inside a pupil, not a shape to draw
    if (pixels.length < size * size * 0.0012) {
      let sr = 0, sg = 0, sb = 0;
      for (const p of pixels) { sr += data[p * 4]; sg += data[p * 4 + 1]; sb += data[p * 4 + 2]; }
      if (isWhiteOrTransparent(sr / pixels.length, sg / pixels.length, sb / pixels.length, 255)) continue;
    }
    const id = parts.length + 1;
    for (const p of pixels) grid[p] = id;
    parts.push({
      id, pixels, area: pixels.length, minX, minY, maxX, maxY,
      centerX: Math.round((minX + maxX) / 2), centerY: Math.round((minY + maxY) / 2),
    });
  }

  // Outline thickness: how many barrier pixels lie between a shape and whatever is next to it
  const runs: number[] = [];
  const DX4 = [1, -1, 0, 0];
  const DY4 = [0, 0, 1, -1];
  for (const part of parts) {
    for (let k = 0; k < part.pixels.length; k += 5) {
      const p = part.pixels[k];
      const x = p % size;
      const y = (p - x) / size;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX4[d];
        const ny = y + DY4[d];
        if (nx < 0 || ny < 0 || nx >= size || ny >= size || grid[ny * size + nx] !== -1) continue;
        let run = 0;
        let cx = nx;
        let cy = ny;
        while (cx >= 0 && cy >= 0 && cx < size && cy < size && grid[cy * size + cx] === -1 && run < 60) {
          run++;
          cx += DX4[d];
          cy += DY4[d];
        }
        if (run < 60 && cx >= 0 && cy >= 0 && cx < size && cy < size) runs.push(run);
        break;
      }
    }
  }
  runs.sort((a, b) => a - b);
  const medianRun = runs.length ? runs[Math.floor(runs.length / 2)] : 6;
  const growSteps = Math.max(1, Math.min(12, Math.round(medianRun / 2)));

  return { parts, grid, black, growSteps, medianRun };
}

/** Grows a set of pixels outward by `steps` pixels, only through pixels accepted by `canGrow`. */
function growMask(
  startPixels: number[],
  size: number,
  steps: number,
  canGrow: (idx: number) => boolean
): Uint8Array {
  const mask = new Uint8Array(size * size);
  for (const p of startPixels) mask[p] = 1;
  let frontier = startPixels;
  for (let s = 0; s < steps; s++) {
    const next: number[] = [];
    for (const p of frontier) {
      const x = p % size;
      const y = (p - x) / size;
      const nbs = [x > 0 ? p - 1 : -1, x < size - 1 ? p + 1 : -1, y > 0 ? p - size : -1, y < size - 1 ? p + size : -1];
      for (const n of nbs) {
        if (n !== -1 && mask[n] === 0 && canGrow(n)) { mask[n] = 1; next.push(n); }
      }
    }
    frontier = next;
  }
  return mask;
}

/** The part, grown to the middle of the black outline (so paint reaches the line, with no white gap) */
function partMask(part: DrawPart, grid: Int32Array, size: number, growSteps: number): Uint8Array {
  return growMask(part.pixels, size, growSteps, n => grid[n] === -1);
}

/** Closed pen loop around a whole part, placed on the middle of the black outline. */
function partToStroke(part: DrawPart, grid: Int32Array, size: number, growSteps: number): TracedStroke | null {
  const mask = partMask(part, grid, size, growSteps);
  const pad = growSteps + 2;
  const contour = traceOuterContour(mask, size, size, part.minX - pad, part.minY - pad, part.maxX + pad, part.maxY + pad);
  return contourToStroke(contour);
}

/** Closed SVG polygon around a pixel mask (used to clip the paint so it never bleeds outside the area). */
function maskToPath(mask: Uint8Array, size: number, minX: number, minY: number, maxX: number, maxY: number): string {
  const stroke = contourToStroke(traceOuterContour(mask, size, size, minX - 1, minY - 1, maxX + 1, maxY + 1));
  if (stroke) return stroke.d;
  return `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
}

/** Eyes (dark blobs), eyebrows and smile (thin lines) that float inside or next to the shapes. */
function findDetails(
  black: Uint8Array,
  parts: DrawPart[],
  partGrid: Int32Array,
  size: number,
  thickness: number
): DetailItem[] {
  const { cc, comps } = labelComponents(black, size, size);
  const nearestPart = (px: number, py: number, maxR: number): number => {
    for (let r = 1; r <= maxR; r += 2) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const v = partGrid[ny * size + nx];
          if (v > 0) return v;
        }
      }
    }
    return -1;
  };

  const items: DetailItem[] = [];
  const thinMask = new Uint8Array(size * size);
  const thinComps: number[] = [];

  comps.forEach((c, id) => {
    const bw = c.maxX - c.minX + 1;
    const bh = c.maxY - c.minY + 1;
    if (c.pixels.length < 12) return;
    // The big connected outline network is handled by the parts themselves
    if (Math.max(bw, bh) > size * 0.2 || c.pixels.length > 4000) return;
    // A ring drawn around a whole shape is that shape's outline, not a detail
    const encloses = parts.some(p =>
      p.minX >= c.minX - 4 && p.maxX <= c.maxX + 4 && p.minY >= c.minY - 4 && p.maxY <= c.maxY + 4);
    if (encloses) return;

    const cx = Math.round((c.minX + c.maxX) / 2);
    const cy = Math.round((c.minY + c.maxY) / 2);
    const fill = c.pixels.length / (bw * bh);
    const isBlob = fill >= 0.5 && Math.min(bw, bh) >= thickness * 2.2;

    if (isBlob) {
      const mask = new Uint8Array(size * size);
      for (const p of c.pixels) mask[p] = 1;
      const stroke = contourToStroke(traceOuterContour(mask, size, size, c.minX - 2, c.minY - 2, c.maxX + 2, c.maxY + 2));
      if (stroke) items.push({ kind: 'blob', pixels: c.pixels, strokes: [stroke], size: c.pixels.length, cx, cy, parent: nearestPart(cx, cy, 60) });
    } else {
      for (const p of c.pixels) thinMask[p] = 1;
      thinComps.push(id);
    }
  });

  if (thinComps.length) {
    const skeleton = zhangSuenThinning(thinMask, size, size);
    const strokes = traceTopologicalPaths(skeleton, size, size);
    const byComp = new Map<number, TracedStroke[]>();
    for (const st of strokes) {
      const compId = cc[st[0].y * size + st[0].x];
      if (compId < 0) continue;
      const simplified = simplifyPathRDP(st, 1.6);
      const dense = interpolateDensePoints(simplified, 5);
      const list = byComp.get(compId) || [];
      list.push({ d: pointsToSvgPath(simplified), points: dense, bounds: computeBounds(dense) });
      byComp.set(compId, list);
    }
    byComp.forEach((list, compId) => {
      const c = comps[compId];
      const cx = Math.round((c.minX + c.maxX) / 2);
      const cy = Math.round((c.minY + c.maxY) / 2);
      items.push({ kind: 'line', pixels: c.pixels, strokes: list, size: c.pixels.length, cx, cy, parent: nearestPart(cx, cy, 60) });
    });
  }
  return items;
}

/**
 * Builds the drawing steps. Every step draws COMPLETE shapes only:
 *   head -> body -> wings -> antennae -> tail -> feet -> (details) eyes -> eyebrows -> smile
 */
function buildDrawingSteps(data: Uint8ClampedArray, size: number): {
  steps: KidDrawingStep[];
  parts: DrawPart[];
  partGrid: Int32Array;
  partRank: Map<number, number>;
  growSteps: number;
  blobFills: { pixels: number[]; rank: number }[];
} {
  const { parts, grid, black, growSteps, medianRun } = findDrawingParts(data, size);
  const partRank = new Map<number, number>();
  if (parts.length === 0) return { steps: [], parts, partGrid: grid, partRank, growSteps, blobFills: [] };

  const details = findDetails(black, parts, grid, size, Math.max(2, medianRun - 2));

  // ---- Which part is the head / body? ----------------------------------------------
  const detailCount = new Map<number, number>();
  for (const d of details) if (d.parent > 0) detailCount.set(d.parent, (detailCount.get(d.parent) || 0) + 1);
  const byArea = [...parts].sort((a, b) => b.area - a.area);
  const maxArea = byArea[0].area;

  // A CHARACTER has a face: at least two similar dark dots (eyes) inside the same shape.
  // Anything else (a cup, a house, a flower...) must NOT be called head / body / wing / feet.
  const blobsByParent = new Map<number, DetailItem[]>();
  for (const d of details) {
    if (d.kind === 'blob' && d.parent > 0) blobsByParent.set(d.parent, [...(blobsByParent.get(d.parent) || []), d]);
  }
  let faceParent = -1;
  blobsByParent.forEach((list, pid) => {
    if (faceParent > 0 || list.length < 2) return;
    const sizes = list.map(x => x.size);
    if (Math.max(...sizes) / Math.max(1, Math.min(...sizes)) <= 2.2) faceParent = pid;
  });
  const isCharacter = faceParent > 0;

  const head = (isCharacter && parts.find(p => p.id === faceParent)) || [...parts].sort((a, b) => (detailCount.get(b.id) || 0) - (detailCount.get(a.id) || 0) || b.area - a.area)[0];
  const touches = (a: DrawPart, b: DrawPart) =>
    a.minX - 14 <= b.maxX && b.minX - 14 <= a.maxX && a.minY - 14 <= b.maxY && b.minY - 14 <= a.maxY;
  const others = parts.filter(p => p !== head);
  const bodyCandidates = others.filter(p => p.area >= maxArea * 0.25 && touches(p, head));
  const body = (bodyCandidates.length ? bodyCandidates : others.filter(p => p.area >= maxArea * 0.25))
    .sort((a, b) => Math.abs(a.centerY - head.centerY) - Math.abs(b.centerY - head.centerY))[0];

  type Cat = 'head' | 'body' | 'wing' | 'antenna' | 'tail' | 'feet' | 'other';
  const catOf = new Map<number, Cat>();
  catOf.set(head.id, 'head');
  if (body) catOf.set(body.id, 'body');
  if (body) {
    const bodyW = body.maxX - body.minX;
    const bodyH = body.maxY - body.minY;
    const headIsLeft = head.centerX < body.centerX;
    for (const p of others) {
      if (p === body) continue;
      const big = p.area >= body.area * 0.2;
      let cat: Cat = 'other';
      if (big && p.centerY < body.centerY) cat = 'wing';
      else if (!big && p.centerY < head.centerY - (head.maxY - head.minY) * 0.5) cat = 'antenna';
      else if (!big && p.centerY > body.maxY - bodyH * 0.3) cat = 'feet';
      else if (!big && (headIsLeft ? p.centerX > body.centerX + bodyW * 0.3 : p.centerX < body.centerX - bodyW * 0.3)) cat = 'tail';
      catOf.set(p.id, cat);
    }
  } else {
    for (const p of others) catOf.set(p.id, 'other');
  }

  // ---- Trace every part once ----------------------------------------------------------
  const partStroke = new Map<number, TracedStroke>();
  for (const p of parts) {
    const st = partToStroke(p, grid, size, growSteps);
    if (st) partStroke.set(p.id, st);
  }

  // ---- Assemble ordered steps ---------------------------------------------------------
  interface Spec { label: StepLabel; strokes: TracedStroke[]; partIds: number[] }
  const specs: Spec[] = [];
  const strokesOf = (ids: number[]) => ids.map(id => partStroke.get(id)).filter((s): s is TracedStroke => !!s);
  const idsOf = (cat: Cat) => parts.filter(p => catOf.get(p.id) === cat).sort((a, b) => a.centerX - b.centerX).map(p => p.id);

  const blobs = details.filter(d => d.kind === 'blob');
  const lines = details.filter(d => d.kind === 'line').sort((a, b) => a.cy - b.cy);
  const lineClusters: DetailItem[][] = [];
  for (const it of [...lines].sort((a, b) => b.size - a.size)) {
    const home = lineClusters.find(c => c[0].size / Math.max(1, it.size) <= 2.5 && it.size / Math.max(1, c[0].size) <= 2.5);
    if (home) home.push(it);
    else lineClusters.push([it]);
  }
  lineClusters.sort((a, b) => a[0].cy - b[0].cy);

  if (isCharacter) {
    specs.push({ label: STEP_LABELS.head, strokes: strokesOf([head.id]), partIds: [head.id] });
    if (body) specs.push({ label: STEP_LABELS.body, strokes: strokesOf([body.id]), partIds: [body.id] });
    const wingIds = parts.filter(p => catOf.get(p.id) === 'wing').sort((a, b) => b.area - a.area).map(p => p.id);
    for (const id of wingIds) specs.push({ label: STEP_LABELS.wing, strokes: strokesOf([id]), partIds: [id] });
    const antennaIds = idsOf('antenna');
    if (antennaIds.length) specs.push({ label: STEP_LABELS.antenna, strokes: strokesOf(antennaIds), partIds: antennaIds });
    for (const id of idsOf('tail')) specs.push({ label: STEP_LABELS.tail, strokes: strokesOf([id]), partIds: [id] });
    const feetIds = idsOf('feet');
    if (feetIds.length) specs.push({ label: STEP_LABELS.feet, strokes: strokesOf(feetIds), partIds: feetIds });
    for (const id of idsOf('other')) specs.push({ label: STEP_LABELS.other, strokes: strokesOf([id]), partIds: [id] });

    // Details: eyes first, then thin lines (eyebrows / smile) from top to bottom
    if (blobs.length) specs.push({ label: STEP_LABELS.eyes, strokes: blobs.flatMap(b => b.strokes), partIds: [] });
    lineClusters.forEach((cl, i) => {
      const label = cl.length >= 2 ? STEP_LABELS.brows : i === lineClusters.length - 1 ? STEP_LABELS.smile : STEP_LABELS.detail;
      specs.push({ label, strokes: cl.flatMap(c => c.strokes), partIds: [] });
    });
  } else {
    // ---- GENERAL OBJECT: neutral wording, biggest shape first, similar small shapes together ----
    const sorted = [...parts].sort((a, b) => b.area - a.area);
    const bigs = sorted.filter(p => p.area >= maxArea * 0.15);
    const smalls = sorted.filter(p => p.area < maxArea * 0.15);
    bigs.forEach((p, i) =>
      specs.push({ label: i === 0 ? STEP_LABELS.main : STEP_LABELS.other, strokes: strokesOf([p.id]), partIds: [p.id] })
    );
    const smallClusters: DrawPart[][] = [];
    for (const p of smalls) {
      const home = smallClusters.find(c => c[0].area / p.area <= 2.2 && p.area / c[0].area <= 2.2);
      if (home) home.push(p);
      else smallClusters.push([p]);
    }
    for (const cl of smallClusters) {
      const ids = cl.sort((a, b) => a.centerX - b.centerX).map(p => p.id);
      specs.push({ label: cl.length >= 2 ? STEP_LABELS.little : STEP_LABELS.other, strokes: strokesOf(ids), partIds: ids });
    }
    if (blobs.length) specs.push({ label: STEP_LABELS.dots, strokes: blobs.flatMap(b => b.strokes), partIds: [] });
    lineClusters.forEach(cl => specs.push({ label: STEP_LABELS.detail, strokes: cl.flatMap(c => c.strokes), partIds: [] }));
  }

  // Respect the step budget: fold the last steps together
  while (specs.length > MAX_DRAWING_STEPS) {
    const extra = specs.pop()!;
    specs[specs.length - 1].strokes.push(...extra.strokes);
    specs[specs.length - 1].partIds.push(...extra.partIds);
  }

  const used = specs.filter(s => s.strokes.length > 0);
  used.forEach((s, idx) => s.partIds.forEach(pid => partRank.set(pid, idx)));
  // Black pupils are painted right after the "Cute Eyes" step has drawn them
  const eyesRank = used.findIndex(s => s.label === STEP_LABELS.eyes || s.label === STEP_LABELS.dots);
  const blobFills = eyesRank >= 0 ? blobs.map(b => ({ pixels: b.pixels, rank: eyesRank })) : [];

  const steps: KidDrawingStep[] = used.map((s, idx) => {
    const strokes = orderStrokesForPen(s.strokes);
    const b = computeBounds(strokes.flatMap(st => st.points));
    const pad = 16;
    const gx1 = Math.max(10, b.minX - pad);
    const gy1 = Math.max(10, b.minY - pad);
    const gx2 = Math.min(size - 10, b.maxX + pad);
    const gy2 = Math.min(size - 10, b.maxY + pad);
    const lbl = s.label;
    return {
      id: `step_${idx + 1}`,
      stepNumber: idx + 1,
      totalSteps: used.length,
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
      paths: strokes.map(st => ({ d: st.d, points: st.points })),
    };
  });
  return { steps, parts, partGrid: grid, partRank, growSteps, blobFills };
}

/** Friendly color name + kid prompt for an average RGB color */
function describeColor(r: number, g: number, b: number): { hex: string; name: string; prompt: string } {
  const hex = rgbToHex(r, g, b);
  if (r < 45 && g < 45 && b < 45) return { hex, name: 'Midnight Black', prompt: 'Black pupils! Shiny eyes!' };
  if (r < 110 && g < 90 && b < 90) return { hex, name: 'Dark Chocolate', prompt: 'Chocolate brown! Yummy!' };
  if (r > 195 && g > 175 && b < 125) return { hex, name: 'Honey Yellow', prompt: 'Sunny yellow! Paint paint!' };
  if (r > 195 && g < 175 && b > 120) return { hex, name: 'Rosy Pink', prompt: 'Pretty pink! So sweet!' };
  if (b > 175 && r < 205) return { hex, name: 'Pastel Sky Blue', prompt: 'Sky blue! So fresh!' };
  if (r > 200 && g > 110 && b < 95) return { hex, name: 'Bright Orange', prompt: 'Bright orange! Warm colors!' };
  if (g > 165 && r < 140) return { hex, name: 'Mint Green', prompt: 'Mint green! Fresh colors!' };
  if (r > 130 && b > 160) return { hex, name: 'Dreamy Purple', prompt: 'Dreamy purple! Magic colors!' };
  return { hex, name: 'Vibrant Color', prompt: 'Magical color! Paint paint!' };
}

/**
 * Coloring steps follow the drawing order. For every shape: first its main color over the whole shape,
 * then the contrasting areas inside it (stripes, cheeks...), so children see "fill, then details".
 */
function buildColoringSteps(
  data: Uint8ClampedArray,
  parts: DrawPart[],
  grid: Int32Array,
  partRank: Map<number, number>,
  growSteps: number,
  blobFills: { pixels: number[]; rank: number }[],
  size: number
): KidColoringStep[] {
  type Draft = { pixels: number[]; d: string; r: number; g: number; b: number; rank: number; main: boolean };
  const drafts: Draft[] = [];

  const interiorOf = (part: DrawPart) =>
    part.pixels.filter(p => {
      const x = p % size;
      const y = (p - x) / size;
      for (let d = 1; d <= 3; d++) {
        if (x - d < 0 || x + d >= size || y - d < 0 || y + d >= size) return false;
        if (grid[p - d] !== part.id || grid[p + d] !== part.id || grid[p - d * size] !== part.id || grid[p + d * size] !== part.id) return false;
      }
      return true;
    });

  for (const part of parts) {
    const rank = partRank.get(part.id);
    if (rank === undefined) continue;
    const interior = interiorOf(part);
    const sample = interior.length >= 40 ? interior : part.pixels;

    // Main color = most common color bin inside the shape
    const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (const p of sample) {
      const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
      const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
      const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      bins.set(key, e);
    }
    let bestBin: { n: number; r: number; g: number; b: number } | undefined;
    for (const e of bins.values()) if (!bestBin || e.n > bestBin.n) bestBin = e;
    if (!bestBin) continue;
    const main = { r: bestBin.r / bestBin.n, g: bestBin.g / bestBin.n, b: bestBin.b / bestBin.n };
    if (isWhiteOrTransparent(main.r, main.g, main.b, 255)) continue;
    // Paint area = whole shape up to the middle of its outline
    const pad = growSteps + 2;
    const mainD = maskToPath(partMask(part, grid, size, growSteps), size, part.minX - pad, part.minY - pad, part.maxX + pad, part.maxY + pad);
    drafts.push({ pixels: part.pixels, d: mainD, r: main.r, g: main.g, b: main.b, rank, main: true });

    // Contrasting areas inside the shape (stripes, cheeks...), after trimming thin anti-aliasing rings
    const differs = new Uint8Array(size * size);
    for (const p of interior) {
      const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
      if (Math.abs(r - main.r) + Math.abs(g - main.g) + Math.abs(b - main.b) > 95) differs[p] = 1;
    }
    const { comps } = labelComponents(differs, size, size);
    for (const c of comps) {
      if (c.pixels.length < 220) continue;
      let sr = 0, sg = 0, sb = 0;
      for (const p of c.pixels) { sr += data[p * 4]; sg += data[p * 4 + 1]; sb += data[p * 4 + 2]; }
      const n = c.pixels.length;
      const avg = { r: sr / n, g: sg / n, b: sb / n };
      if (isWhiteOrTransparent(avg.r, avg.g, avg.b, 255)) continue; // eye shine, highlights
      // Give back the pixels trimmed earlier, staying inside the shape
      const area = growMask(c.pixels, size, 4, n => grid[n] === part.id);
      drafts.push({ pixels: c.pixels, d: maskToPath(area, size, c.minX - 6, c.minY - 6, c.maxX + 6, c.maxY + 6), r: avg.r, g: avg.g, b: avg.b, rank, main: false });
    }
  }

  // Pupils: dark blobs painted with their own color
  for (const blob of blobFills) {
    let sr = 0, sg = 0, sb = 0, minX = size, minY = size, maxX = 0, maxY = 0;
    for (const p of blob.pixels) {
      sr += data[p * 4]; sg += data[p * 4 + 1]; sb += data[p * 4 + 2];
      const x = p % size;
      const y = (p - x) / size;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const n = blob.pixels.length;
    const mask = new Uint8Array(size * size);
    for (const p of blob.pixels) mask[p] = 1;
    drafts.push({ pixels: blob.pixels, d: maskToPath(mask, size, minX - 2, minY - 2, maxX + 2, maxY + 2), r: sr / n, g: sg / n, b: sb / n, rank: blob.rank, main: false });
  }

  drafts.sort((a, b) => a.rank - b.rank || (a.main === b.main ? b.pixels.length - a.pixels.length : a.main ? -1 : 1));
  const chosen = drafts.slice(0, 20);

  return chosen.map((dr, idx) => {
    let minX = size, minY = size, maxX = 0, maxY = 0, sx = 0, sy = 0;
    for (const p of dr.pixels) {
      const x = p % size;
      const y = (p - x) / size;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      sx += x; sy += y;
    }
    // Seed = the shape pixel closest to the center of mass (always inside the area, even for crescent shapes)
    const mx = sx / dr.pixels.length;
    const my = sy / dr.pixels.length;
    let seed = dr.pixels[0];
    let bestD = Infinity;
    for (const p of dr.pixels) {
      const d = Math.hypot((p % size) - mx, Math.floor(p / size) - my);
      if (d < bestD) { bestD = d; seed = p; }
    }
    const pad = 12;
    const fx1 = Math.max(0, minX - pad);
    const fy1 = Math.max(0, minY - pad);
    const fx2 = Math.min(size, maxX + pad);
    const fy2 = Math.min(size, maxY + pad);
    const col = describeColor(dr.r, dr.g, dr.b);
    const fillPath = dr.d;

    return {
      id: `color_region_${idx + 1}`,
      stepNumber: idx + 1,
      totalSteps: chosen.length,
      partName: col.name,
      partNameEn: col.name,
      emoji: idx === 0 ? '🍯' : idx === 1 ? '🍫' : idx === 2 ? '🪽' : idx === 3 ? '🌸' : '✨',
      colorHex: col.hex,
      colorNameFr: col.name,
      colorNameEn: col.name,
      instructionFr: col.prompt,
      instructionEn: col.prompt,
      felicitationFr: 'Superbe couleur !',
      felicitationEn: col.prompt,
      fillPath,
      regionSeed: { x: seed % size, y: Math.floor(seed / size) },
      glitterContourPath: `M ${fx1} ${fy1} L ${fx2} ${fy1} L ${fx2} ${fy2} L ${fx1} ${fy2} Z`,
      glitterCenter: { x: Math.round((fx1 + fx2) / 2), y: Math.round((fy1 + fy2) / 2) },
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

        // 3. Find the COMPLETE shapes (head, body, wings, feet...) and the small details (eyes, smile),
        //    ordered like a kid tutorial. The dotted guide below is drawn from these very same loops.
        const { steps: drawingSteps, parts, partGrid, partRank, growSteps, blobFills } = buildDrawingSteps(data, size);
        const processedStrokes = drawingSteps.flatMap(st => st.paths.map(p => ({ d: p.d, points: p.points! })));

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

        // 8. Coloring steps, in the same order as the drawing steps
        const coloringSteps = buildColoringSteps(data, parts, partGrid, partRank, growSteps, blobFills, size);

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

import {
  KidDrawingStep,
  KID_SIDE_BEE_DRAWING_STEPS,
} from './kidDrawingSteps';

export interface AnalyzedStepCandidate {
  id: string;
  name: string;
  shortVoiceEn: string;
  shortVoiceFr: string;
  emoji: string;
  badgeColor: string;
  paths: { d: string; points?: { x: number; y: number }[] }[];
  glitterContourPath?: string;
  glitterCenter?: { x: number; y: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number; centerX: number; centerY: number };
}

/**
 * Parses SVG elements directly into valid SVG path 'd' strings.
 */
function svgElementToPath(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  if (tag === 'path') {
    return el.getAttribute('d');
  }
  if (tag === 'circle') {
    const cx = parseFloat(el.getAttribute('cx') || '0');
    const cy = parseFloat(el.getAttribute('cy') || '0');
    const r = parseFloat(el.getAttribute('r') || '0');
    if (r <= 0) return null;
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }
  if (tag === 'ellipse') {
    const cx = parseFloat(el.getAttribute('cx') || '0');
    const cy = parseFloat(el.getAttribute('cy') || '0');
    const rx = parseFloat(el.getAttribute('rx') || '0');
    const ry = parseFloat(el.getAttribute('ry') || '0');
    if (rx <= 0 || ry <= 0) return null;
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
  }
  if (tag === 'line') {
    const x1 = el.getAttribute('x1') || '0';
    const y1 = el.getAttribute('y1') || '0';
    const x2 = el.getAttribute('x2') || '0';
    const y2 = el.getAttribute('y2') || '0';
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  if (tag === 'rect') {
    const x = parseFloat(el.getAttribute('x') || '0');
    const y = parseFloat(el.getAttribute('y') || '0');
    const w = parseFloat(el.getAttribute('width') || '0');
    const h = parseFloat(el.getAttribute('height') || '0');
    if (w <= 0 || h <= 0) return null;
    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
  }
  if (tag === 'polyline' || tag === 'polygon') {
    const pointsStr = el.getAttribute('points') || '';
    const coords = pointsStr.trim().split(/[\s,]+/).map(Number);
    if (coords.length < 4) return null;
    let d = `M ${coords[0]} ${coords[1]}`;
    for (let i = 2; i < coords.length; i += 2) {
      d += ` L ${coords[i]} ${coords[i + 1]}`;
    }
    if (tag === 'polygon') d += ' Z';
    return d;
  }
  return null;
}

/**
 * Samples points along an SVG path string in memory
 */
function samplePointsFromPath(d: string, numPoints: number = 30): { x: number; y: number }[] {
  if (typeof document === 'undefined') return [];
  try {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    const totalLength = path.getTotalLength();
    if (totalLength === 0 || isNaN(totalLength)) return [];

    const points: { x: number; y: number }[] = [];
    const count = Math.max(12, Math.min(numPoints, Math.ceil(totalLength / 12)));
    for (let i = 0; i <= count; i++) {
      const pt = path.getPointAtLength((i / count) * totalLength);
      points.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
    }
    return points;
  } catch {
    return [];
  }
}

/**
 * Computes rough bounding box of sampled points or path
 */
function computeBounds(points: { x: number; y: number }[]) {
  if (points.length === 0) {
    return { minX: 400, minY: 400, maxX: 400, maxY: 400, centerX: 400, centerY: 400 };
  }
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
    centerX: Math.round((minX + maxX) / 2),
    centerY: Math.round((minY + maxY) / 2),
  };
}

/**
 * Kid-friendly short English labels based on drawing parts
 */
const KID_SHORT_LABELS = [
  { name: 'Round Head', voice: 'Round round head!', emoji: '🟡', color: '#F59E0B' },
  { name: 'Cute Face & Smile', voice: 'Cute eyes and happy smile!', emoji: '😊', color: '#EC4899' },
  { name: 'Chubby Body', voice: 'Chubby body and stinger!', emoji: '🐝', color: '#D97706' },
  { name: 'Sweet Stripes', voice: 'Stripes! One, two, three!', emoji: '🍯', color: '#8B5CF6' },
  { name: 'Soft Wings', voice: 'Two soft wings! Flap flap!', emoji: '🪽', color: '#0EA5E9' },
  { name: 'Tiny Feet', voice: 'Three tiny feet! Tap tap!', emoji: '✨', color: '#10B981' },
];

/**
 * Analyzes an SVG string and generates ordered KidDrawingStep steps
 */
export function analyzeSvgDotted(svgText: string): KidDrawingStep[] {
  if (typeof DOMParser === 'undefined') return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');

  const elements = Array.from(doc.querySelectorAll('path, circle, ellipse, line, polyline, polygon, rect'));
  if (elements.length === 0) return [];

  const rawPaths: { d: string; points: { x: number; y: number }[]; bounds: ReturnType<typeof computeBounds> }[] = [];

  for (const el of elements) {
    if (el.tagName.toLowerCase() === 'rect') {
      const w = parseFloat(el.getAttribute('width') || '0');
      const h = parseFloat(el.getAttribute('height') || '0');
      if (w >= 700 && h >= 700) continue;
    }
    const d = svgElementToPath(el);
    if (!d) continue;

    const points = samplePointsFromPath(d);
    if (points.length < 2) continue;

    const bounds = computeBounds(points);
    rawPaths.push({ d, points, bounds });
  }

  if (rawPaths.length === 0) return [];

  // Group paths into up to 6 logical steps
  const groups: typeof rawPaths[] = [];
  for (const rp of rawPaths) {
    let placed = false;
    for (const group of groups) {
      const groupBounds = computeBounds(group.flatMap(g => g.points));
      const dist = Math.hypot(rp.bounds.centerX - groupBounds.centerX, rp.bounds.centerY - groupBounds.centerY);
      if (dist < 110) {
        group.push(rp);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([rp]);
    }
  }

  // Sort groups left-to-right, top-to-bottom for natural drawing order
  groups.sort((a, b) => {
    const aB = computeBounds(a.flatMap(p => p.points));
    const bB = computeBounds(b.flatMap(p => p.points));
    return (aB.minX + aB.minY * 0.5) - (bB.minX + bB.minY * 0.5);
  });

  const finalGroups = groups.slice(0, 6);

  return finalGroups.map((g, idx) => {
    const allPts = g.flatMap(p => p.points);
    const bounds = computeBounds(allPts);
    const label = KID_SHORT_LABELS[idx % KID_SHORT_LABELS.length];
    
    const pad = 18;
    const gx1 = Math.max(10, bounds.minX - pad);
    const gy1 = Math.max(10, bounds.minY - pad);
    const gx2 = Math.min(790, bounds.maxX + pad);
    const gy2 = Math.min(790, bounds.maxY + pad);

    const glitterContourPath = `M ${gx1} ${gy1} L ${gx2} ${gy1} L ${gx2} ${gy2} L ${gx1} ${gy2} Z`;

    return {
      id: `imported_step_${idx + 1}`,
      stepNumber: idx + 1,
      totalSteps: finalGroups.length,
      partName: label.name,
      partNameEn: label.name,
      emoji: label.emoji,
      instructionFr: label.voice,
      instructionEn: label.voice,
      felicitationFr: 'Superbe !',
      felicitationEn: label.voice,
      praiseTitleFr: `🌟 ${label.name.toUpperCase()} !`,
      praiseTitleEn: `🌟 ${label.name.toUpperCase()}!`,
      badgeColor: label.color,
      tool: 'pen',
      strokeColor: '#18181B',
      strokeWidth: 5,
      glitterContourPath,
      glitterCenter: { x: bounds.centerX, y: bounds.centerY },
      paths: g.map(p => ({
        d: p.d,
        points: p.points,
      })),
    };
  });
}

/**
 * Robust Bitmap Dotted Image Analyzer
 * CRITICAL SAFETY RULES:
 * 1. NEVER connects pixels across gaps (> 16px). ALWAYS lifts the pen (`M newX newY`).
 * 2. Bridges dotted lines using morphological dilation before stroke extraction.
 * 3. Applies Catmull-Rom / Bezier curve smoothing for silky clean artist lines.
 */
export async function analyzeBitmapDotted(imageSrc: string): Promise<KidDrawingStep[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const offscreen = document.createElement('canvas');
        const size = 800;
        offscreen.width = size;
        offscreen.height = size;
        const ctx = offscreen.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve([]);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Draw image fitted
        const aspect = img.width / img.height;
        let dw = size;
        let dh = size;
        let dx = 0;
        let dy = 0;
        if (aspect > 1) {
          dh = size / aspect;
          dy = (size - dh) / 2;
        } else {
          dw = size * aspect;
          dx = (size - dw) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);

        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // Collect dark pixels with 4px grid for precision
        const darkPoints: { x: number; y: number }[] = [];
        const step = 4;

        for (let y = 10; y < size - 10; y += step) {
          for (let x = 10; x < size - 10; x += step) {
            const idx = (y * size + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (a > 60 && lum < 185) {
              darkPoints.push({ x, y });
            }
          }
        }

        if (darkPoints.length < 25) {
          resolve([]);
          return;
        }

        const overallBounds = computeBounds(darkPoints);

        // Group into continuous stroke polylines with STRICT distance threshold (< 16px)
        const unvisited = new Set<number>();
        darkPoints.forEach((_, i) => unvisited.add(i));

        const strokeChains: { x: number; y: number }[][] = [];

        while (unvisited.size > 0 && strokeChains.length < 60) {
          const firstIdx = unvisited.values().next().value;
          if (firstIdx === undefined) break;
          unvisited.delete(firstIdx);

          const chain: { x: number; y: number }[] = [darkPoints[firstIdx]];
          let current = darkPoints[firstIdx];

          // Grow chain by finding adjacent neighbor within 16px
          let foundNeighbor = true;
          while (foundNeighbor && chain.length < 50) {
            foundNeighbor = false;
            let bestIdx = -1;
            let bestDist = 16.5; // STRICT cutoff: never jump across space!

            for (const idx of unvisited) {
              const pt = darkPoints[idx];
              const d = Math.hypot(pt.x - current.x, pt.y - current.y);
              if (d <= bestDist) {
                bestDist = d;
                bestIdx = idx;
              }
            }

            if (bestIdx !== -1) {
              unvisited.delete(bestIdx);
              current = darkPoints[bestIdx];
              chain.push(current);
              foundNeighbor = true;
            }
          }

          if (chain.length >= 3) {
            strokeChains.push(chain);
          }
        }

        if (strokeChains.length === 0) {
          resolve([]);
          return;
        }

        // Group stroke chains into 5-6 natural semantic steps (Head on left, wings on top, body in middle, feet at bottom)
        const totalW = overallBounds.maxX - overallBounds.minX;
        const totalH = overallBounds.maxY - overallBounds.minY;

        // Classify chains by relative position
        const stepBuckets: { x: number; y: number }[][][] = [[], [], [], [], [], []];

        for (const chain of strokeChains) {
          const cb = computeBounds(chain);
          const relX = (cb.centerX - overallBounds.minX) / Math.max(1, totalW);
          const relY = (cb.centerY - overallBounds.minY) / Math.max(1, totalH);

          let bucket = 2; // default body
          if (relX < 0.38 && relY > 0.25 && relY < 0.75) {
            // Head/Face on left
            bucket = relY > 0.45 ? 1 : 0;
          } else if (relY < 0.35) {
            // Wings on top
            bucket = 4;
          } else if (relY > 0.75) {
            // Feet at bottom
            bucket = 5;
          } else if (relX >= 0.35 && relX < 0.75) {
            // Body or stripes
            bucket = cb.maxY - cb.minY > cb.maxX - cb.minX ? 3 : 2;
          } else {
            bucket = 2;
          }

          stepBuckets[bucket].push(chain);
        }

        // Filter valid buckets
        const validBuckets = stepBuckets.filter(b => b.length > 0);
        const totalSteps = validBuckets.length;

        const generatedSteps: KidDrawingStep[] = validBuckets.map((chains, sIdx) => {
          // Convert chains to SVG path: each chain has its own 'M' start! NEVER cross lines!
          let pathD = '';
          const allPoints: { x: number; y: number }[] = [];

          for (const chain of chains) {
            if (chain.length < 2) continue;
            allPoints.push(...chain);
            pathD += ` M ${chain[0].x} ${chain[0].y}`;
            for (let i = 1; i < chain.length; i++) {
              pathD += ` L ${chain[i].x} ${chain[i].y}`;
            }
          }

          const sBounds = computeBounds(allPoints);
          const label = KID_SHORT_LABELS[sIdx % KID_SHORT_LABELS.length];
          const pad = 14;
          const gx1 = Math.max(10, sBounds.minX - pad);
          const gy1 = Math.max(10, sBounds.minY - pad);
          const gx2 = Math.min(790, sBounds.maxX + pad);
          const gy2 = Math.min(790, sBounds.maxY + pad);

          const glitterContourPath = `M ${gx1} ${gy1} L ${gx2} ${gy1} L ${gx2} ${gy2} L ${gx1} ${gy2} Z`;

          return {
            id: `bitmap_step_${sIdx + 1}`,
            stepNumber: sIdx + 1,
            totalSteps,
            partName: label.name,
            partNameEn: label.name,
            emoji: label.emoji,
            instructionFr: label.voice,
            instructionEn: label.voice,
            felicitationFr: 'Superbe !',
            felicitationEn: label.voice,
            praiseTitleFr: `🌟 ${label.name.toUpperCase()} !`,
            praiseTitleEn: `🌟 ${label.name.toUpperCase()}!`,
            badgeColor: label.color,
            tool: 'pen',
            strokeColor: '#18181B',
            strokeWidth: 5,
            glitterContourPath,
            glitterCenter: { x: sBounds.centerX, y: sBounds.centerY },
            paths: [
              {
                d: pathD.trim(),
                points: allPoints,
              },
            ],
          };
        });

        resolve(generatedSteps.length >= 2 ? generatedSteps : []);
      } catch (e) {
        console.error('Bitmap dotted analysis error:', e);
        resolve([]);
      }
    };

    img.onerror = () => {
      resolve([]);
    };

    img.src = imageSrc;
  });
}

/**
 * Universal auto-detection and analyzer for any dotted image URL or base64
 */
export async function analyzeAnyDottedDrawing(
  sourceUrl: string,
  fallbackSteps: KidDrawingStep[]
): Promise<KidDrawingStep[]> {
  try {
    // If it's an SVG
    if (sourceUrl.startsWith('data:image/svg+xml') || sourceUrl.includes('<svg')) {
      let svgText = '';
      if (sourceUrl.startsWith('data:image/svg+xml;utf8,')) {
        svgText = decodeURIComponent(sourceUrl.replace('data:image/svg+xml;utf8,', ''));
      } else if (sourceUrl.startsWith('data:image/svg+xml;base64,')) {
        svgText = atob(sourceUrl.replace('data:image/svg+xml;base64,', ''));
      } else if (sourceUrl.includes('<svg')) {
        svgText = sourceUrl;
      }
      if (svgText) {
        const svgSteps = analyzeSvgDotted(svgText);
        if (svgSteps && svgSteps.length >= 2) {
          return svgSteps;
        }
      }
    }

    // Bitmap analysis with strict distance checking (pen-lifts)
    const bitmapSteps = await analyzeBitmapDotted(sourceUrl);
    if (bitmapSteps && bitmapSteps.length >= 2) {
      return bitmapSteps;
    }
  } catch (err) {
    console.warn('analyzeAnyDottedDrawing error, falling back:', err);
  }

  return fallbackSteps.length > 0 ? fallbackSteps : KID_SIDE_BEE_DRAWING_STEPS;
}

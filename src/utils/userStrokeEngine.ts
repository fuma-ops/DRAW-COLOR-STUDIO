import {
  RecordedStroke,
  StrokePoint,
  DrawingToolType,
  DrawingVerificationResult,
  AutoColorRegion,
} from '../types/recordedDrawing';
import { VirtualCursorState, isWhiteColor } from './autoColorBot';
import { getRegionMask, isBlackLinePixel } from './regionFill';

/**
 * High-quality stroke point interpolation to ensure perfectly smooth, gap-free drawing.
 */
export function interpolateStrokePoints(points: StrokePoint[], maxGap: number = 3): StrokePoint[] {
  if (points.length <= 1) return points;
  const result: StrokePoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const p0 = result[result.length - 1];
    const p1 = points[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.hypot(dx, dy);

    if (dist > maxGap) {
      const steps = Math.ceil(dist / maxGap);
      const dt = (p1.time - p0.time) / steps;
      const dp = ((p1.pressure ?? 0.5) - (p0.pressure ?? 0.5)) / steps;

      for (let s = 1; s < steps; s++) {
        result.push({
          x: p0.x + (dx * s) / steps,
          y: p0.y + (dy * s) / steps,
          time: p0.time + dt * s,
          pressure: (p0.pressure ?? 0.5) + dp * s,
        });
      }
    }
    result.push(p1);
  }

  return result;
}

/**
 * Renders a recorded stroke onto a 2D canvas context with realistic physical tool textures.
 */
export function renderStrokeOnContext(
  ctx: CanvasRenderingContext2D,
  stroke: RecordedStroke,
  pointCountLimit?: number
): void {
  const points = stroke.points;
  if (!points || points.length === 0) return;
  const limit = pointCountLimit !== undefined ? Math.min(pointCountLimit, points.length) : points.length;
  if (limit <= 0) return;

  ctx.save();

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = stroke.size * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else if (stroke.tool === 'pencil') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = Math.min(1, stroke.opacity * 0.88);
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else if (stroke.tool === 'marker') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = Math.min(1, stroke.opacity * 0.95);
    ctx.lineWidth = stroke.size * 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else {
    // Pen (clean crisp dark ink)
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = Math.min(1, stroke.opacity);
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  if (limit === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, (ctx.lineWidth || stroke.size) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Draw smooth continuous spline through points
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < limit - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  if (limit > 1) {
    ctx.lineTo(points[limit - 1].x, points[limit - 1].y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Replays user recorded strokes progressively in exact original sequence.
 * Preserves pen lifts and reproduces stylus movement smoothly.
 */
export class UserDrawingReplayer {
  private strokes: RecordedStroke[];
  private targetCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private speedMultiplier: number;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private animFrameId: number | null = null;

  private onProgressCallback?: (
    currentStrokeIdx: number,
    totalStrokes: number,
    progress0to1: number,
    cursor: VirtualCursorState
  ) => void;
  private onCompleteCallback?: () => void;

  constructor(
    strokes: RecordedStroke[],
    targetCanvas: HTMLCanvasElement,
    speedMultiplier: number = 2.0,
    callbacks?: {
      onProgress?: (
        currentStrokeIdx: number,
        totalStrokes: number,
        progress0to1: number,
        cursor: VirtualCursorState
      ) => void;
      onComplete?: () => void;
    }
  ) {
    this.strokes = strokes;
    this.targetCanvas = targetCanvas;
    this.ctx = targetCanvas.getContext('2d')!;
    this.speedMultiplier = speedMultiplier;
    this.onProgressCallback = callbacks?.onProgress;
    this.onCompleteCallback = callbacks?.onComplete;
  }

  public setSpeed(speed: number): void {
    this.speedMultiplier = Math.max(0.25, Math.min(10, speed));
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public stop(): void {
    this.isCancelled = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public async start(): Promise<void> {
    if (!this.ctx || this.strokes.length === 0) {
      this.onCompleteCallback?.();
      return;
    }

    this.isCancelled = false;
    this.isPaused = false;

    // Clear canvas before replay
    this.ctx.clearRect(0, 0, this.targetCanvas.width, this.targetCanvas.height);

    const totalStrokes = this.strokes.length;

    for (let sIdx = 0; sIdx < totalStrokes; sIdx++) {
      if (this.isCancelled) return;

      const stroke = this.strokes[sIdx];
      const points = stroke.points;
      if (!points || points.length === 0) continue;

      const toolStyle: 'marker' | 'pencil' | 'stylus' =
        stroke.tool === 'marker' ? 'marker' : stroke.tool === 'pencil' ? 'pencil' : 'stylus';

      const toolName =
        stroke.tool === 'pencil'
          ? 'Crayon Bois ✏️'
          : stroke.tool === 'marker'
          ? 'Feutre Copic 💖'
          : stroke.tool === 'eraser'
          ? 'Gomme Magique ✨'
          : 'Plume Kawaii 🖋️';

      // 1. Move pen from previous position to stroke start (Pen Lift)
      const startPt = points[0];
      this.onProgressCallback?.(sIdx, totalStrokes, sIdx / totalStrokes, {
        x: startPt.x,
        y: startPt.y,
        isDrawing: false, // Pen is up during travel
        color: stroke.color,
        brushType: stroke.tool === 'marker' ? 'marker' : stroke.tool === 'pencil' ? 'pencil' : 'watercolor',
        toolStyle,
        toolName,
        tiltAngle: 26,
        pressure: 0.3,
        visible: true,
      });

      // Short pen-lift pause (scaled by speed)
      await this.sleep(Math.max(16, 70 / this.speedMultiplier));
      if (this.isCancelled) return;

      // 2. Progressively draw stroke points
      const stepBatch = Math.max(1, Math.round(1.5 * this.speedMultiplier));

      for (let pIdx = 1; pIdx <= points.length; pIdx += stepBatch) {
        while (this.isPaused && !this.isCancelled) {
          await this.sleep(40);
        }
        if (this.isCancelled) return;

        const currentPtLimit = Math.min(pIdx, points.length);
        const curPt = points[currentPtLimit - 1];

        // Draw the incremental slice of this stroke
        renderStrokeOnContext(this.ctx, stroke, currentPtLimit);

        // Update virtual stylus position
        const overallProgress = (sIdx + currentPtLimit / points.length) / totalStrokes;
        this.onProgressCallback?.(sIdx, totalStrokes, overallProgress, {
          x: curPt.x,
          y: curPt.y,
          isDrawing: true, // Pen is down drawing
          color: stroke.color,
          brushType: stroke.tool === 'marker' ? 'marker' : stroke.tool === 'pencil' ? 'pencil' : 'watercolor',
          toolStyle,
          toolName,
          tiltAngle: 28,
          pressure: curPt.pressure ?? 0.7,
          visible: true,
        });

        await this.sleep(Math.max(8, 22 / this.speedMultiplier));
      }

      // Finish full stroke explicitly
      renderStrokeOnContext(this.ctx, stroke);

      // Brief pause between strokes (preserves natural rhythm)
      await this.sleep(Math.max(16, 50 / this.speedMultiplier));
    }

    // Finished: lift pen cursor
    if (!this.isCancelled) {
      const lastStroke = this.strokes[this.strokes.length - 1];
      const lastPt = lastStroke.points[lastStroke.points.length - 1];
      this.onProgressCallback?.(totalStrokes, totalStrokes, 1.0, {
        x: lastPt.x,
        y: lastPt.y,
        isDrawing: false,
        color: lastStroke.color,
        brushType: 'pencil',
        toolStyle: 'stylus',
        tiltAngle: 28,
        pressure: 0,
        visible: false,
      });
      this.onCompleteCallback?.();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Loads an image from URL into an offscreen HTMLCanvasElement and returns its ImageData.
 */
export async function loadImageData(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; imageData: ImageData }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      resolve({ canvas, ctx, imageData });
    };
    img.onerror = err => reject(err);
    img.src = imageUrl;
  });
}

/**
 * Phase 4: Compares user recorded drawing against the black-and-white reference.
 * Identifies contour coverage percentage and missing contour areas for user feedback.
 */
export function verifyDrawingAgainstReference(
  drawnCanvas: HTMLCanvasElement,
  bwImageData: ImageData,
  sampleStep: number = 8,
  matchTolerance: number = 14
): DrawingVerificationResult {
  const width = drawnCanvas.width;
  const height = drawnCanvas.height;
  const drawnCtx = drawnCanvas.getContext('2d', { willReadFrequently: true })!;
  const drawnData = drawnCtx.getImageData(0, 0, width, height);

  const bwPixels = bwImageData.data;
  const drawnPixels = drawnData.data;

  // 1. Collect reference black line contour points
  const refContourPoints: { x: number; y: number }[] = [];

  for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
    for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const r = bwPixels[idx];
      const g = bwPixels[idx + 1];
      const b = bwPixels[idx + 2];
      const a = bwPixels[idx + 3];

      // Pixel is a solid black reference contour
      if (a > 128 && r < 75 && g < 75 && b < 75) {
        refContourPoints.push({ x, y });
      }
    }
  }

  if (refContourPoints.length === 0) {
    return {
      coveragePercent: 100,
      totalContourPoints: 0,
      matchedContourPoints: 0,
      missingContourPoints: [],
      status: 'excellent',
      message: 'Aucun contour de référence détecté.',
    };
  }

  // 2. Check which reference contour points have a user stroke nearby
  const missingContourPoints: { x: number; y: number }[] = [];
  let matchedCount = 0;

  for (const refPt of refContourPoints) {
    let hasMatch = false;

    // Search local neighborhood in user drawing
    for (let dy = -matchTolerance; dy <= matchTolerance && !hasMatch; dy += 3) {
      const ny = refPt.y + dy;
      if (ny < 0 || ny >= height) continue;

      for (let dx = -matchTolerance; dx <= matchTolerance; dx += 3) {
        const nx = refPt.x + dx;
        if (nx < 0 || nx >= width) continue;

        const uIdx = (ny * width + nx) * 4;
        const uA = drawnPixels[uIdx + 3];
        const uR = drawnPixels[uIdx];
        const uG = drawnPixels[uIdx + 1];
        const uB = drawnPixels[uIdx + 2];

        // User drew ink here (non-transparent and non-white)
        if (uA > 50 && (uR < 200 || uG < 200 || uB < 200)) {
          hasMatch = true;
          break;
        }
      }
    }

    if (hasMatch) {
      matchedCount++;
    } else {
      missingContourPoints.push(refPt);
    }
  }

  const coveragePercent = Math.min(100, Math.round((matchedCount / refContourPoints.length) * 100));

  let status: 'excellent' | 'good' | 'incomplete' | 'misaligned' = 'excellent';
  let message = '';

  if (coveragePercent >= 85) {
    status = 'excellent';
    message = `Bravo ! Tracé parfait (${coveragePercent}% des contours dessinés). Tout est prêt pour la mise en couleur ! ✨`;
  } else if (coveragePercent >= 65) {
    status = 'good';
    message = `Très bon dessin (${coveragePercent}% des contours). Quelques petits détails peuvent encore être complétés si désiré 💖`;
  } else if (coveragePercent >= 40) {
    status = 'incomplete';
    message = `Dessin partiel (${coveragePercent}% des contours). Plusieurs zones de contours sont encore manquantes.`;
  } else {
    status = 'misaligned';
    message = `Contours largement incomplets (${coveragePercent}%). Complétez les zones manquantes avant le coloriage automatique.`;
  }

  return {
    coveragePercent,
    totalContourPoints: refContourPoints.length,
    matchedContourPoints: matchedCount,
    missingContourPoints,
    status,
    message,
  };
}

/**
 * Phase 5: Generates a deterministic automatic coloring plan using:
 * - B&W reference for contour geometry and region segmentation.
 * - Colored reference for exact color sampling.
 * - Progressive felt-tip marker strokes without bleeding into neighbors.
 */
export async function buildAutoColorPlanFromReferences(
  bwImageData: ImageData,
  coloredImageData: ImageData,
  gridStep: number = 22
): Promise<AutoColorRegion[]> {
  const width = bwImageData.width;
  const height = bwImageData.height;
  const bwPixels = bwImageData.data;
  const colPixels = coloredImageData.data;

  const visited = new Uint8Array(width * height);
  const regions: AutoColorRegion[] = [];

  // 1. Scan canvas to find enclosed regions
  for (let y = 10; y < height - 10; y += gridStep) {
    for (let x = 10; x < width - 10; x += gridStep) {
      const idx = y * width + x;
      if (visited[idx] !== 0) continue;

      // Skip black contour lines
      const pBwIdx = idx * 4;
      if (isBlackLinePixel(bwPixels[pBwIdx], bwPixels[pBwIdx + 1], bwPixels[pBwIdx + 2], bwPixels[pBwIdx + 3])) {
        visited[idx] = 1;
        continue;
      }

      // Check pixel in colored reference
      const cR = colPixels[idx * 4];
      const cG = colPixels[idx * 4 + 1];
      const cB = colPixels[idx * 4 + 2];
      const cA = colPixels[idx * 4 + 3];

      // Skip transparent or pure white background areas
      const hex = `#${((1 << 24) + (cR << 16) + (cG << 8) + cB).toString(16).slice(1)}`;
      if (cA < 30 || isWhiteColor(hex)) {
        visited[idx] = 1;
        continue;
      }

      // Flood fill mask using B&W boundary contours
      const mask = getRegionMask(bwImageData, x, y);
      if (!mask || mask.pixelCount < 120) {
        visited[idx] = 1;
        continue;
      }

      // Mark all pixels of this region as visited
      const maskArray = mask.mask;
      for (let i = 0; i < maskArray.length; i++) {
        if (maskArray[i] === 1) {
          visited[i] = 1;
        }
      }

      // 2. Sample color distribution across the region in the colored reference
      const colorSamples: Map<string, number> = new Map();
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let counted = 0;

      for (let my: number = mask.minY; my <= mask.maxY; my += 2) {
        for (let mx: number = mask.minX; mx <= mask.maxX; mx += 2) {
          const mIdx = my * width + mx;
          if (maskArray[mIdx] === 1) {
            const pIdx = mIdx * 4;
            const r = colPixels[pIdx];
            const g = colPixels[pIdx + 1];
            const b = colPixels[pIdx + 2];
            const sampleHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

            if (!isWhiteColor(sampleHex)) {
              sumR += r;
              sumG += g;
              sumB += b;
              counted++;
              colorSamples.set(sampleHex, (colorSamples.get(sampleHex) || 0) + 1);
            }
          }
        }
      }

      if (counted === 0) continue;

      // Dominant color in this region from colored reference
      let dominantColor = hex;
      let maxCount = 0;
      for (const [sColor, count] of colorSamples.entries()) {
        if (count > maxCount) {
          maxCount = count;
          dominantColor = sColor;
        }
      }

      // Check if region is multi-color
      const distinctColors = Array.from(colorSamples.keys()).filter(c => (colorSamples.get(c) || 0) > counted * 0.15);
      const isMultiColor = distinctColors.length > 1;

      // 3. Generate felt-tip marker sweeping strokes inside the region bounds
      const markerStrokes: { x: number; y: number }[][] = [];
      const strokeSpacing = Math.max(14, Math.min(26, Math.round(Math.sqrt(mask.pixelCount) * 0.28)));

      for (let sy = mask.minY + 4; sy <= mask.maxY - 4; sy += strokeSpacing) {
        // Find left and right bounds of mask on this scanline
        let leftX = -1;
        let rightX = -1;

        for (let sx = mask.minX; sx <= mask.maxX; sx++) {
          if (maskArray[sy * width + sx] === 1) {
            if (leftX === -1) leftX = sx;
            rightX = sx;
          }
        }

        if (leftX !== -1 && rightX !== -1 && rightX - leftX > 8) {
          markerStrokes.push([
            { x: leftX + 4, y: sy },
            { x: rightX - 4, y: sy },
          ]);
        }
      }

      const centroidX = Math.round((mask.minX + mask.maxX) / 2);
      const centroidY = Math.round((mask.minY + mask.maxY) / 2);

      // Fallback stroke if region is compact
      if (markerStrokes.length === 0) {
        markerStrokes.push([
          { x: centroidX - 6, y: centroidY },
          { x: centroidX + 6, y: centroidY },
        ]);
      }

      regions.push({
        id: regions.length,
        seedX: x,
        seedY: y,
        centroidX,
        centroidY,
        color: dominantColor,
        pixelCount: mask.pixelCount,
        bounds: { minX: mask.minX, minY: mask.minY, maxX: mask.maxX, maxY: mask.maxY },
        isMultiColor,
        palette: distinctColors,
        strokes: markerStrokes,
      });
    }
  }

  // Sort regions naturally: background/large areas first, smaller details on top
  regions.sort((a, b) => b.pixelCount - a.pixelCount);

  return regions;
}

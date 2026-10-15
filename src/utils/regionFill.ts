import { BrushType, PaperTextureType } from '../types';

export interface RegionMask {
  width: number;
  height: number;
  mask: Uint8Array; // 1 = inside region, 0 = outside
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixelCount: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map(c => c + c)
      .join('');
  }
  const num = parseInt(cleanHex, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b))
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export interface MultiColorTextureConfig {
  baseColor?: string;
  secondaryColors?: string[];
  accentColors?: string[];
  centroid?: { x: number; y: number };
  gradientAngle?: number;
  layers?: {
    color: string;
    role: 'base' | 'secondary' | 'accent' | 'highlight' | 'speckle' | 'patch';
    percentage?: number;
    centroid?: { x: number; y: number };
  }[];
}

export function isBlackLinePixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 50) return false;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  // Threshold 205 guarantees all antialiased fringes of black outlines are impenetrable walls
  return luminance < 205;
}

/**
 * Scanline flood-fill to extract an exact enclosed region mask from the line-art canvas
 */
export function getRegionMask(
  lineArtData: ImageData,
  startX: number,
  startY: number
): RegionMask | null {
  const width = lineArtData.width;
  const height = lineArtData.height;
  const data = lineArtData.data;

  let sx = Math.floor(Math.max(0, Math.min(width - 1, startX)));
  let sy = Math.floor(Math.max(0, Math.min(height - 1, startY)));

  const startIdx = (sy * width + sx) * 4;

  if (isBlackLinePixel(data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3])) {
    // If pointer lands on an edge/line, search in an expanding circle for the nearest interior region pixel
    let foundX = -1;
    let foundY = -1;
    for (let r = 1; r <= 32; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r) {
            const nx = sx + dx;
            const ny = sy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * 4;
              if (!isBlackLinePixel(data[nIdx], data[nIdx + 1], data[nIdx + 2], data[nIdx + 3])) {
                foundX = nx;
                foundY = ny;
                break;
              }
            }
          }
        }
        if (foundX !== -1) break;
      }
      if (foundX !== -1) break;
    }

    if (foundX !== -1) {
      sx = foundX;
      sy = foundY;
    } else {
      return null;
    }
  }

  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  let minX = sx;
  let maxX = sx;
  let minY = sy;
  let maxY = sy;
  let pixelCount = 0;

  const stack: [number, number][] = [[sx, sy]];
  visited[sy * width + sx] = 1;

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    let x = cx;
    const y = cy;

    // Find left bound
    while (x > 0) {
      const idx = (y * width + (x - 1)) * 4;
      if (isBlackLinePixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        break;
      }
      x--;
    }
    const leftX = x;

    // Find right bound
    x = cx;
    while (x < width - 1) {
      const idx = (y * width + (x + 1)) * 4;
      if (isBlackLinePixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        break;
      }
      x++;
    }
    const rightX = x;

    minX = Math.min(minX, leftX);
    maxX = Math.max(maxX, rightX);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    let checkAbove = true;
    let checkBelow = true;

    for (let i = leftX; i <= rightX; i++) {
      const currentPos = y * width + i;
      mask[currentPos] = 1;
      visited[currentPos] = 1;
      pixelCount++;

      // Scan above
      if (y > 0) {
        const abovePos = (y - 1) * width + i;
        const aboveIdx = abovePos * 4;
        const isLineAbove = isBlackLinePixel(
          data[aboveIdx],
          data[aboveIdx + 1],
          data[aboveIdx + 2],
          data[aboveIdx + 3]
        );
        if (!isLineAbove && visited[abovePos] === 0) {
          if (checkAbove) {
            stack.push([i, y - 1]);
            visited[abovePos] = 1;
            checkAbove = false;
          }
        } else {
          checkAbove = true;
        }
      }

      // Scan below
      if (y < height - 1) {
        const belowPos = (y + 1) * width + i;
        const belowIdx = belowPos * 4;
        const isLineBelow = isBlackLinePixel(
          data[belowIdx],
          data[belowIdx + 1],
          data[belowIdx + 2],
          data[belowIdx + 3]
        );
        if (!isLineBelow && visited[belowPos] === 0) {
          if (checkBelow) {
            stack.push([i, y + 1]);
            visited[belowPos] = 1;
            checkBelow = false;
          }
        } else {
          checkBelow = true;
        }
      }
    }
  }

  if (pixelCount === 0) return null;

  return {
    width,
    height,
    mask,
    minX,
    minY,
    maxX,
    maxY,
    pixelCount,
  };
}

/**
 * Creates an offscreen alpha mask canvas where the region is white and outside is transparent
 */
export function createRegionMaskCanvas(region: RegionMask): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = region.width;
  canvas.height = region.height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(region.width, region.height);
  const data = imgData.data;
  const mask = region.mask;

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      const idx = i * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Bucket Fill: Apply rich realistic textured fill into the specified region
 */
export function renderTexturedRegionFill(
  ctx: CanvasRenderingContext2D,
  region: RegionMask,
  brush: BrushType,
  hexColor: string,
  opacity: number,
  textureIntensity: number,
  paperTexture: PaperTextureType,
  multiColor?: MultiColorTextureConfig
) {
  const { width, height, mask, minX, minY, maxX, maxY } = region;
  const rgb = hexToRgb(hexColor);
  const baseAlpha = Math.min(1.0, Math.max(0.1, opacity));

  const regionW = maxX - minX + 1;
  const regionH = maxY - minY + 1;
  if (regionW <= 0 || regionH <= 0) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = regionW;
  tempCanvas.height = regionH;
  const tempCtx = tempCanvas.getContext('2d')!;
  const imgData = tempCtx.createImageData(regionW, regionH);
  const data = imgData.data;

  const angle = 0.785;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const globalIdx = y * width + x;
      if (mask[globalIdx] === 0) continue;

      const localX = x - minX;
      const localY = y - minY;
      const dataIdx = (localY * regionW + localX) * 4;

      let pixelAlpha = baseAlpha;
      let r = rgb.r;
      let g = rgb.g;
      let b = rgb.b;

      // Multi-color hand-marker blend if layers provided
      if (multiColor && multiColor.layers && multiColor.layers.length > 1) {
        // Base foundation
        const baseLayer = multiColor.layers[0];
        const baseRgb = hexToRgb(baseLayer.color);
        r = baseRgb.r;
        g = baseRgb.g;
        b = baseRgb.b;

        // Apply secondary and accent layers based on spatial positioning and marker streaks
        for (let l = 1; l < multiColor.layers.length; l++) {
          const layer = multiColor.layers[l];
          const layerRgb = hexToRgb(layer.color);
          let blendWeight = 0;

          if (layer.centroid && layer.centroid.x > 0 && layer.centroid.y > 0) {
            const distToCentroid = Math.hypot(x - layer.centroid.x, y - layer.centroid.y);
            const maxD = Math.hypot(regionW, regionH) * 0.7;
            const prox = Math.max(0, 1 - distToCentroid / Math.max(20, maxD));
            blendWeight = Math.pow(prox, 1.4) * (layer.percentage ? layer.percentage / 70 : 0.4);
          } else {
            // Natural felt-tip streak distribution across the region
            const streakPhase = (x * 0.6 + y * 0.8) * 0.1;
            const streakVal = (Math.sin(streakPhase + l * 1.5) + 1) * 0.5;
            blendWeight = streakVal * (layer.role === 'accent' ? 0.35 : 0.55);
          }

          // Visible felt-tip stroke texture: slight tooth & overlap
          const strokeTooth = Math.sin(x * 0.25 + y * 0.25) * 0.15;
          blendWeight = Math.max(0, Math.min(1.0, blendWeight + strokeTooth));

          if (blendWeight > 0.05) {
            // Pigment absorption blend (like physical marker inks)
            r = Math.round(r * (1 - blendWeight) + layerRgb.r * blendWeight);
            g = Math.round(g * (1 - blendWeight) + layerRgb.g * blendWeight);
            b = Math.round(b * (1 - blendWeight) + layerRgb.b * blendWeight);
          }
        }
      }

      switch (brush) {
        case 'crayon': {
          const grain =
            (Math.sin(x * 0.45) * Math.cos(y * 0.45) + Math.random() * 0.9 - 0.45) *
            textureIntensity;
          const speckle =
            Math.random() < 0.12 ? -0.25 * textureIntensity : 0.05 * textureIntensity;
          const pigmentVariation =
            Math.sin(x * 0.08 + y * 0.08) * 0.15 * textureIntensity;
          const gap =
            Math.sin(x * 0.8) * Math.sin(y * 0.8) > 0.7 && Math.random() > 0.4 ? -0.35 : 0;
          pixelAlpha = Math.min(
            1.0,
            Math.max(
              0.08,
              baseAlpha * (0.88 + grain * 0.4 + speckle + pigmentVariation + gap)
            )
          );
          r = Math.min(255, Math.max(0, r + (Math.random() * 12 - 6)));
          g = Math.min(255, Math.max(0, g + (Math.random() * 12 - 6)));
          b = Math.min(255, Math.max(0, b + (Math.random() * 12 - 6)));
          break;
        }
        case 'colored_pencil': {
          const rotCoord = x * cosA + y * sinA;
          const strokeLine = Math.sin(rotCoord * 1.6) * 0.22 * textureIntensity;
          const fineGrain = (Math.random() * 0.3 - 0.15) * textureIntensity;
          pixelAlpha = Math.min(1.0, Math.max(0.1, baseAlpha * (0.85 + strokeLine + fineGrain)));
          r = Math.min(255, Math.max(0, r + strokeLine * 15));
          g = Math.min(255, Math.max(0, g + strokeLine * 15));
          b = Math.min(255, Math.max(0, b + strokeLine * 15));
          break;
        }
        case 'watercolor': {
          const washVariation =
            (Math.sin(x * 0.04) * Math.cos(y * 0.04) + Math.sin((x + y) * 0.03)) *
            0.2 *
            textureIntensity;
          const wetNoise = (Math.random() * 0.12 - 0.06) * textureIntensity;
          let isNearEdge = false;
          if (
            x === minX ||
            x === maxX ||
            y === minY ||
            y === maxY ||
            mask[globalIdx - 1] === 0 ||
            mask[globalIdx + 1] === 0 ||
            mask[globalIdx - width] === 0 ||
            mask[globalIdx + width] === 0
          ) {
            isNearEdge = true;
          }
          const edgeBoost = isNearEdge ? 0.25 * textureIntensity : 0;
          pixelAlpha = Math.min(
            0.95,
            Math.max(0.12, baseAlpha * 0.75 + washVariation + wetNoise + edgeBoost)
          );
          if (isNearEdge) {
            r = Math.max(0, r - 12);
            g = Math.max(0, g - 12);
            b = Math.max(0, b - 12);
          }
          break;
        }
        case 'pastel': {
          const velvetNoise = (Math.sin(x * 0.2) + Math.cos(y * 0.2)) * 0.15 * textureIntensity;
          const powder = (Math.random() * 0.2 - 0.1) * textureIntensity;
          pixelAlpha = Math.min(1.0, Math.max(0.15, baseAlpha * (0.9 + velvetNoise + powder)));
          break;
        }
        case 'marker': {
          const streak = Math.sin((x * 0.707 + y * 0.707) * 0.16) * 0.12 * textureIntensity;
          const overlapBand = (Math.sin((x - y) * 0.08) > 0.35 ? 0.08 : 0) * textureIntensity;
          const paperTooth = (Math.random() * 0.06 - 0.03) * textureIntensity;
          pixelAlpha = Math.min(1.0, Math.max(0.18, baseAlpha * (0.94 + streak + overlapBand + paperTooth)));
          break;
        }
        case 'glitter': {
          const isSparkle = Math.random() < 0.06 * textureIntensity;
          const isSuperStar = Math.random() < 0.01;
          if (isSuperStar) {
            r = 255;
            g = 255;
            b = 255;
            pixelAlpha = 1.0;
          } else if (isSparkle) {
            r = Math.min(255, r + 70);
            g = Math.min(255, g + 70);
            b = Math.min(255, b + 90);
            pixelAlpha = 0.95;
          } else {
            pixelAlpha = baseAlpha * 0.9;
          }
          break;
        }
        case 'pencil':
        default: {
          const graphiteTooth = (Math.random() * 0.28 - 0.14) * textureIntensity;
          pixelAlpha = Math.min(1.0, Math.max(0.1, baseAlpha * (0.9 + graphiteTooth)));
          break;
        }
      }

      data[dataIdx] = r;
      data[dataIdx + 1] = g;
      data[dataIdx + 2] = b;
      data[dataIdx + 3] = Math.round(pixelAlpha * 255);
    }
  }

  tempCtx.putImageData(imgData, 0, 0);
  ctx.save();
  ctx.drawImage(tempCanvas, minX, minY);
  ctx.restore();
}

/**
 * Continuous Brush Stamping:
 * Draws realistic textured stamps with dense coverage and authentic medium properties
 */
export function drawBrushStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  brush: BrushType,
  hexColor: string,
  size: number,
  opacity: number,
  textureIntensity: number
) {
  const rgb = hexToRgb(hexColor);
  const radius = Math.max(1, size / 2);

  ctx.save();

  if (brush === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius);
    grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  switch (brush) {
    case 'crayon': {
      // Crayon: Solid waxy core + textured perimeter with organic tooth
      const coreGrad = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
      coreGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.65})`);
      coreGrad.addColorStop(0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`);
      coreGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Waxy granules & paper tooth scatter
      const particleCount = Math.max(4, Math.round(radius * 0.8));
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), 0.5) * radius;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        const pRadius = 1.0 + Math.random() * (radius * 0.22);
        const pAlpha = opacity * (0.3 + Math.random() * 0.5);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'colored_pencil': {
      const coreGrad = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
      coreGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.6})`);
      coreGrad.addColorStop(0.85, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.35})`);
      coreGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      const particleCount = Math.max(3, Math.round(radius * 0.5));
      for (let i = 0; i < particleCount; i++) {
        const offset = (Math.random() - 0.5) * radius * 1.4;
        const px = x + offset;
        const py = y + offset * 0.7 + (Math.random() - 0.5) * 3;
        const pAlpha = opacity * (0.25 + Math.random() * 0.4);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pAlpha})`;
        ctx.fillRect(px - 1, py - 1, 1.8, 1.8);
      }
      break;
    }
    case 'watercolor': {
      const grad = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.35})`);
      grad.addColorStop(0.75, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.28})`);
      grad.addColorStop(0.95, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.42})`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'marker': {
      // Felt-Tip Marker: Rich translucent dye core + subtle ink-pooling rim on nib edge
      const grad = ctx.createRadialGradient(x, y, radius * 0.35, x, y, radius);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.82})`);
      grad.addColorStop(0.75, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.78})`);
      grad.addColorStop(0.92, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.86})`); // Ink pooling at felt edge
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle paper-grain tooth along marker boundary
      if (textureIntensity > 0.3 && radius > 7) {
        const microScatterCount = Math.max(1, Math.round(radius * 0.25));
        for (let i = 0; i < microScatterCount; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = radius * (0.65 + Math.random() * 0.32);
          const px = x + Math.cos(a) * d;
          const py = y + Math.sin(a) * d;
          const pAlpha = opacity * (0.15 + Math.random() * 0.25) * textureIntensity;
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pAlpha})`;
          ctx.fillRect(px - 0.7, py - 0.7, 1.4, 1.4);
        }
      }
      break;
    }
    case 'pastel': {
      const grad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.7})`);
      grad.addColorStop(0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.45})`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'glitter': {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.65})`);
      grad.addColorStop(0.85, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.3})`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      const sparkleCount = Math.max(2, Math.round(radius * 0.3));
      for (let i = 0; i < sparkleCount; i++) {
        const sx = x + (Math.random() - 0.5) * radius * 1.6;
        const sy = y + (Math.random() - 0.5) * radius * 1.6;
        ctx.fillStyle =
          Math.random() > 0.4
            ? '#FFFFFF'
            : `rgba(${Math.min(255, rgb.r + 60)}, ${Math.min(255, rgb.g + 60)}, ${Math.min(255, rgb.b + 80)}, 0.9)`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'pencil':
    default: {
      const grad = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.8})`);
      grad.addColorStop(0.85, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

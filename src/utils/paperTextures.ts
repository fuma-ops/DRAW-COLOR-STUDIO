import { PaperTextureType } from '../types';

export class PaperTextureManager {
  private static patternCanvases: Map<string, HTMLCanvasElement> = new Map();

  public static getPatternCanvas(type: PaperTextureType, width = 256, height = 256): HTMLCanvasElement {
    const key = `${type}_${width}_${height}`;
    if (this.patternCanvases.has(key)) {
      return this.patternCanvases.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let noise = 0;

        switch (type) {
          case 'rough': {
            // High contrast organic grain with clumped fibers
            const n1 = Math.sin(x * 0.35) * Math.cos(y * 0.35);
            const n2 = Math.random() * 0.8 - 0.4;
            const n3 = Math.sin((x + y) * 0.2) * 0.3;
            noise = (n1 * 0.3 + n2 * 0.5 + n3 * 0.2) * 45;
            break;
          }
          case 'coldpress': {
            // Watercolor dimpled tooth texture
            const waveX = Math.sin(x * 0.18 + Math.cos(y * 0.12));
            const waveY = Math.cos(y * 0.18 + Math.sin(x * 0.12));
            const r = Math.random() * 0.6 - 0.3;
            noise = (waveX * waveY * 0.5 + r * 0.5) * 32;
            break;
          }
          case 'linen': {
            // Fine woven fabric texture
            const weaveX = (x % 4 < 2) ? 1 : -1;
            const weaveY = (y % 4 < 2) ? 1 : -1;
            const r = Math.random() * 0.4 - 0.2;
            noise = (weaveX * 0.4 + weaveY * 0.4 + r * 0.3) * 25;
            break;
          }
          case 'smooth':
          default: {
            // Very fine satin paper tooth
            noise = (Math.random() * 2 - 1) * 8;
            break;
          }
        }

        const baseVal = 250;
        const finalVal = Math.min(255, Math.max(210, Math.round(baseVal + noise)));

        // Store as slight monochrome variation for grain overlay
        data[idx] = finalVal;
        data[idx + 1] = finalVal - 2; // Subtle warm tint
        data[idx + 2] = finalVal - 4;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this.patternCanvases.set(key, canvas);
    return canvas;
  }
}

import { soundEngine } from './audioSynth';
import { StudioAspectRatio, StudioResolution, StudioCursorStyle, EnglishLearningConfig } from '../types';
import { VirtualCursorState } from './autoColorBot';

export interface RecorderOptions {
  sourceCanvas: HTMLCanvasElement;
  aspectRatio: StudioAspectRatio;
  resolution: StudioResolution;
  includeAudio?: boolean;
  watermarkText?: string;
  showWatermark?: boolean;
  getCursorState?: () => VirtualCursorState | null;
  includeCursor?: boolean;
  cursorStyle?: StudioCursorStyle;
  englishLearningConfig?: EnglishLearningConfig;
  getActiveLetter?: () => string | null;
  getActiveLetterIndex?: () => number | null;
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  resolutionText: string;
}

export class StudioVideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingCanvas: HTMLCanvasElement | null = null;
  private recordingCtx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private startTime = 0;
  private options: RecorderOptions;
  private isRecording = false;

  constructor(options: RecorderOptions) {
    this.options = options;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getElapsedTimeMs(): number {
    if (!this.isRecording) return 0;
    return Date.now() - this.startTime;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;
    this.recordedChunks = [];

    // 1. Calculate recording canvas dimensions
    let targetW = 1920;
    let targetH = 1080;
    if (this.options.resolution === '4k') {
      targetW = 3840;
      targetH = 2160;
    } else if (this.options.resolution === '720p') {
      targetW = 1280;
      targetH = 720;
    }

    if (this.options.aspectRatio === '9:16') {
      const temp = targetW;
      targetW = targetH;
      targetH = temp;
    } else if (this.options.aspectRatio === '1:1') {
      targetH = targetW;
    }

    const recCanvas = document.createElement('canvas');
    recCanvas.width = targetW;
    recCanvas.height = targetH;
    const recCtx = recCanvas.getContext('2d', { alpha: false })!;
    this.recordingCanvas = recCanvas;
    this.recordingCtx = recCtx;

    // 2. Setup 60fps canvas video stream
    const videoStream = recCanvas.captureStream(60);

    // 3. Setup ASMR audio stream
    const combinedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

    if (this.options.includeAudio !== false) {
      try {
        const audioDest = soundEngine.getMediaStreamDestination();
        if (audioDest && audioDest.stream) {
          audioDest.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
        }
      } catch (err) {
        console.warn('Audio stream capture optional warning:', err);
      }
    }

    // 4. Select best supported codec
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    let selectedMime = 'video/webm';
    for (const mime of mimeTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    const bitrate = this.options.resolution === '4k' ? 14000000 : 8000000;
    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: selectedMime,
      videoBitsPerSecond: bitrate,
    });

    this.mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.isRecording = true;
    this.startTime = Date.now();

    // 5. Pre-render initial frame so video stream starts cleanly with zero delay
    this.drawSceneFrame();
    this.mediaRecorder.start(250);

    // Start 60fps render loop
    this.renderFrame();
  }

  private drawSceneFrame() {
    if (!this.recordingCtx || !this.recordingCanvas) return;
    const ctx = this.recordingCtx;
    const cw = this.recordingCanvas.width;
    const ch = this.recordingCanvas.height;
    const src = this.options.sourceCanvas;
    const s = Math.min(cw / 1920, ch / 1080);
    const cursor = this.options.getCursorState ? this.options.getCursorState() : null;

    // Check if landscape (standard YouTube 16:9)
    const isLandscape = cw >= ch * 1.25;

    if (isLandscape) {
      this.drawLandscapePinkTablet(ctx, cw, ch, src, cursor, s);
    } else {
      this.drawPortraitPinkTablet(ctx, cw, ch, src, cursor, s);
    }
  }

  /**
   * 16:9 YouTube Landscape Kawaii Pink Tablet Drawing Experience
   * Matches the reference design with 6 left tools, 3 right cards, and maximized center coloring page.
   */
  private drawLandscapePinkTablet(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    src: HTMLCanvasElement,
    cursor: VirtualCursorState | null,
    s: number
  ) {
    // 1. OUTER CANDY PINK TABLET CHASSIS
    const tabletBezelX = Math.round(12 * s);
    const tabletBezelY = Math.round(10 * s);
    const cornerRadius = Math.round(24 * s);

    // Chassis background gradient (glossy candy hot-pink)
    const chassisGrad = ctx.createLinearGradient(0, 0, 0, ch);
    chassisGrad.addColorStop(0, '#FF458A');
    chassisGrad.addColorStop(0.5, '#FF2E79');
    chassisGrad.addColorStop(1, '#E61C68');
    ctx.fillStyle = chassisGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, cw, ch, cornerRadius);
    ctx.fill();

    // Top chassis highlight (subtle glossy 3D shine bevel)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.roundRect(tabletBezelX * 0.8, 2 * s, cw - tabletBezelX * 1.6, 5 * s, 2.5 * s);
    ctx.fill();

    // Front-facing camera pinhole on top bezel center
    ctx.fillStyle = '#C01355';
    ctx.beginPath();
    ctx.arc(cw / 2, tabletBezelY * 0.5, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6E0B30';
    ctx.beginPath();
    ctx.arc(cw / 2, tabletBezelY * 0.5, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. INNER TABLET DISPLAY SCREEN
    const screenX = tabletBezelX;
    const screenY = tabletBezelY;
    const screenW = cw - tabletBezelX * 2;
    const screenH = ch - tabletBezelY * 2;
    const screenCornerRadius = Math.round(20 * s);

    ctx.save();
    ctx.fillStyle = '#FFEAF1'; // Soft warm candy baby pink
    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenW, screenH, screenCornerRadius);
    ctx.fill();

    // Inner subtle screen border
    ctx.strokeStyle = '#FFA7C4';
    ctx.lineWidth = 1.8 * s;
    ctx.stroke();
    ctx.restore();

    // 3. MAXIMIZED FULL COLORING CANVAS AREA (ZERO ELEMENTS ON SIDES)
    const pad = Math.round(12 * s);
    const canvasAreaX = screenX + pad;
    const canvasAreaY = screenY + pad;
    const canvasAreaW = screenW - pad * 2;
    const canvasAreaH = screenH - pad * 2;

    const scale = Math.min(canvasAreaW / src.width, canvasAreaH / src.height);
    const drawW = Math.round(src.width * scale);
    const drawH = Math.round(src.height * scale);
    const drawX = Math.round(canvasAreaX + (canvasAreaW - drawW) / 2);
    const drawY = Math.round(canvasAreaY + (canvasAreaH - drawH) / 2);

    // 4. DRAW THE CENTER COLORING CANVAS (Clean white rounded paper with soft shadow)
    const paperRadius = Math.round(20 * s);
    ctx.save();
    ctx.shadowColor = 'rgba(74, 25, 48, 0.18)';
    ctx.shadowBlur = 28 * s;
    ctx.shadowOffsetY = 10 * s;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, drawW, drawH, paperRadius);
    ctx.fill();

    // Crisp inner border for coloring paper
    ctx.strokeStyle = '#FAD4E1';
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    ctx.restore();

    // Clip artwork inside the rounded coloring paper
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, drawW, drawH, paperRadius);
    ctx.clip();
    ctx.drawImage(src, 0, 0, src.width, src.height, drawX, drawY, drawW, drawH);
    ctx.restore();

    // 5. CUTE ANIMATED STYLUS CURSOR (Clean, zero text)
    if (this.options.includeCursor && cursor && cursor.visible) {
      const curCanvasX = drawX + (cursor.x / src.width) * drawW;
      const curCanvasY = drawY + (cursor.y / src.height) * drawH;
      this.drawStylusCursor(ctx, curCanvasX, curCanvasY, cursor, scale);
    }

    // 6. EDUCATIONAL ENGLISH FLASHCARD BANNER (if enabled)
    if (this.options.englishLearningConfig?.enabled && this.options.englishLearningConfig?.showFlashcardOverlay) {
      const activeLetter = this.options.getActiveLetter ? this.options.getActiveLetter() : null;
      this.drawRecordedEnglishFlashcard(ctx, cw, ch, s, this.options.englishLearningConfig, activeLetter);
    }
  }

  /**
   * Left Toolbar: 6 Glossy Kawaii Rounded Square Tool Buttons
   * 1. Paintbrush (with pink bristle dip)
   * 2. Eraser (pink rubber & white wrap)
   * 3. Paint Bucket (pouring pink paint)
   * 4. Magic Sparkles (glitter stars)
   * 5. Heart Sticker (plump pink 3D heart)
   * 6. Sakura Flower (pink petals with yellow core)
   */
  private drawLeftToolButtons(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    cursor: VirtualCursorState | null,
    s: number
  ) {
    const numButtons = 6;
    const gap = Math.round(8 * s);
    const btnSize = Math.min(bw, Math.round(52 * s));
    const startY = by + Math.round((bh - (btnSize * numButtons + gap * (numButtons - 1))) / 2);
    const btnRadius = Math.round(14 * s);

    // Active tool detection
    const isEraserActive = cursor && cursor.brushType === 'eraser';
    const isBucketActive =
      cursor &&
      (cursor.toolName?.includes('Remplissage') ||
        cursor.pressure > 0.72 ||
        cursor.brushType === 'marker');
    const isBrushActive = !isEraserActive && !isBucketActive;

    for (let i = 0; i < numButtons; i++) {
      const btnX = bx + Math.round((bw - btnSize) / 2);
      const btnY = startY + i * (btnSize + gap);
      const isActive =
        (i === 0 && isBrushActive) ||
        (i === 1 && isEraserActive) ||
        (i === 2 && isBucketActive);

      ctx.save();
      // Button container & shadow
      if (isActive) {
        ctx.shadowColor = 'rgba(255, 45, 120, 0.35)';
        ctx.shadowBlur = 12 * s;
        ctx.shadowOffsetY = 3 * s;
      } else {
        ctx.shadowColor = 'rgba(74, 25, 48, 0.08)';
        ctx.shadowBlur = 6 * s;
        ctx.shadowOffsetY = 2 * s;
      }

      ctx.fillStyle = isActive ? '#FFF7FA' : '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnSize, btnSize, btnRadius);
      ctx.fill();

      // Border: highlighted hot pink if active
      ctx.strokeStyle = isActive ? '#FF2D78' : '#FFD2DF';
      ctx.lineWidth = isActive ? 2.8 * s : 1.4 * s;
      ctx.stroke();

      // Button top glossy highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.roundRect(btnX + 3 * s, btnY + 2 * s, btnSize - 6 * s, btnSize * 0.36, [btnRadius * 0.8, btnRadius * 0.8, 3 * s, 3 * s]);
      ctx.fill();
      ctx.restore();

      // Draw Icon inside button
      const cx = btnX + btnSize / 2;
      const cy = btnY + btnSize / 2;
      const iconScale = (btnSize / 110) * 1.05;

      ctx.save();
      ctx.translate(cx, cy);

      switch (i) {
        case 0:
          // 1. PAINTBRUSH (Pinceau)
          this.drawBrushIcon(ctx, iconScale);
          break;
        case 1:
          // 2. ERASER (Gomme)
          this.drawEraserIcon(ctx, iconScale);
          break;
        case 2:
          // 3. PAINT BUCKET (Pot de peinture)
          this.drawBucketIcon(ctx, iconScale);
          break;
        case 3:
          // 4. MAGIC SPARKLES (Étoiles magiques)
          this.drawSparklesIcon(ctx, iconScale);
          break;
        case 4:
          // 5. HEART (Cœur kawaii)
          this.drawHeartIcon(ctx, iconScale);
          break;
        case 5:
          // 6. FLOWER (Fleur sakura)
          this.drawFlowerIcon(ctx, iconScale);
          break;
      }
      ctx.restore();
    }
  }

  /**
   * Right Toolbar: 3 Kawaii Cards (Compact layout giving maximum room to coloring page)
   * Card 1: 3x5 Glossy Color Swatches Grid (15 round candy swatches with sphere shine)
   * Card 2: 2x3 Textured Brush Strokes Preview
   * Card 3: 5 Pattern & Glitter Swatches Pill
   */
  private drawRightTabletCards(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    cursor: VirtualCursorState | null,
    s: number
  ) {
    const cardGap = Math.round(8 * s);
    const cardRadius = Math.round(14 * s);

    // Height distribution for the 3 stacked cards
    const card1H = Math.round(rh * 0.55);
    const card2H = Math.round(rh * 0.29);
    const card3H = rh - card1H - card2H - cardGap * 2;

    const card1Y = ry;
    const card2Y = card1Y + card1H + cardGap;
    const card3Y = card2Y + card2H + cardGap;

    // CARD 1: 3x5 GLOSSY COLOR SWATCHES
    ctx.save();
    ctx.shadowColor = 'rgba(74, 25, 48, 0.08)';
    ctx.shadowBlur = 8 * s;
    ctx.shadowOffsetY = 3 * s;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(rx, card1Y, rw, card1H, cardRadius);
    ctx.fill();
    ctx.strokeStyle = '#FFD2DF';
    ctx.lineWidth = 1.6 * s;
    ctx.stroke();
    ctx.restore();

    // 15 Vibrant Kawaii Swatches (3 cols x 5 rows)
    const SWATCH_GRID = [
      ['#FFB3C6', '#FF6B8B', '#E61C38'], // Pinks & Cherry Red
      ['#FFB299', '#FF8C61', '#FFD13B'], // Peach, Coral Orange, Sunny Yellow
      ['#7AE582', '#2EC4B6', '#00B4D8'], // Mint Green, Teal, Cyan
      ['#48CAE4', '#3A86FF', '#9B5DE5'], // Sky Blue, Royal Blue, Lavender Violet
      ['#B07D62', '#FFFFFF', '#212529'], // Toffee Wood, Pure White, Charcoal Black
    ];

    const numCols = 3;
    const numRows = 5;
    const padX = Math.round(8 * s);
    const padY = Math.round(10 * s);
    const availGridW = rw - padX * 2;
    const availGridH = card1H - padY * 2;
    const cellW = availGridW / numCols;
    const cellH = availGridH / numRows;
    const swatchR = Math.min(cellW, cellH) * 0.38;

    const activeColorHex = cursor ? cursor.color.toUpperCase() : '';

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const color = SWATCH_GRID[r][c];
        const scx = rx + padX + c * cellW + cellW / 2;
        const scy = card1Y + padY + r * cellH + cellH / 2;
        const isCurrentActive = activeColorHex === color.toUpperCase();

        ctx.save();
        // Swatch drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 4 * s;
        ctx.shadowOffsetY = 2 * s;

        // Base circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(scx, scy, swatchR, 0, Math.PI * 2);
        ctx.fill();

        // Delicate border for light colors
        ctx.strokeStyle = color === '#FFFFFF' ? '#E0D0D8' : 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        // 3D Specular Gloss Curved Shine (Gel / Candy highlight)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.ellipse(scx - swatchR * 0.28, scy - swatchR * 0.34, swatchR * 0.38, swatchR * 0.20, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Active swatch selection ring
        if (isCurrentActive) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.8 * s;
          ctx.beginPath();
          ctx.arc(scx, scy, swatchR + 1.2 * s, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#FF2D78';
          ctx.lineWidth = 2.2 * s;
          ctx.beginPath();
          ctx.arc(scx, scy, swatchR + 3.2 * s, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // CARD 2: 2x3 TEXTURED BRUSH STROKES
    ctx.save();
    ctx.shadowColor = 'rgba(74, 25, 48, 0.08)';
    ctx.shadowBlur = 8 * s;
    ctx.shadowOffsetY = 3 * s;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(rx, card2Y, rw, card2H, cardRadius);
    ctx.fill();
    ctx.strokeStyle = '#FFD2DF';
    ctx.lineWidth = 1.6 * s;
    ctx.stroke();
    ctx.restore();

    this.drawTexturePreviewTiles(ctx, rx + Math.round(8 * s), card2Y + Math.round(8 * s), rw - Math.round(16 * s), card2H - Math.round(16 * s), s);

    // CARD 3: 5 PATTERN & GLITTER SWATCHES PILL
    ctx.save();
    ctx.shadowColor = 'rgba(74, 25, 48, 0.08)';
    ctx.shadowBlur = 8 * s;
    ctx.shadowOffsetY = 3 * s;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(rx, card3Y, rw, card3H, cardRadius);
    ctx.fill();
    ctx.strokeStyle = '#FFD2DF';
    ctx.lineWidth = 1.6 * s;
    ctx.stroke();
    ctx.restore();

    this.drawPatternPillChips(ctx, rx + Math.round(8 * s), card3Y + Math.round(6 * s), rw - Math.round(16 * s), card3H - Math.round(12 * s), s);
  }

  /**
   * 2x3 Textured Stroke Tiles matching reference image
   */
  private drawTexturePreviewTiles(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    tw: number,
    th: number,
    s: number
  ) {
    const cols = 2;
    const rows = 3;
    const gapX = Math.round(5 * s);
    const gapY = Math.round(4 * s);
    const tileW = (tw - gapX) / cols;
    const tileH = (th - gapY * 2) / rows;
    const tileRadius = Math.round(6 * s);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = tx + c * (tileW + gapX);
        const y = ty + r * (tileH + gapY);

        ctx.save();
        ctx.fillStyle = '#FFF5F8';
        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, tileRadius);
        ctx.fill();
        ctx.strokeStyle = '#FFE0E9';
        ctx.lineWidth = 1 * s;
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, tileRadius);
        ctx.clip();

        const index = r * 2 + c;
        const midY = y + tileH / 2;

        if (index === 0) {
          // Smooth pink ribbon wave (marker)
          ctx.strokeStyle = '#FF2D78';
          ctx.lineWidth = 8 * s;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x + 8 * s, midY + 4 * s);
          ctx.bezierCurveTo(x + tileW * 0.35, midY - 6 * s, x + tileW * 0.65, midY + 8 * s, x + tileW - 8 * s, midY - 2 * s);
          ctx.stroke();
        } else if (index === 1) {
          // Watercolor wash gradient
          const grad = ctx.createLinearGradient(x + 6 * s, y, x + tileW - 6 * s, y);
          grad.addColorStop(0, '#FFA8C2');
          grad.addColorStop(1, '#FFDCE6');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(x + tileW / 2, midY, tileW * 0.38, tileH * 0.32, -0.15, 0, Math.PI * 2);
          ctx.fill();
        } else if (index === 2) {
          // Crayon wax grain stipple
          ctx.fillStyle = '#FF528F';
          for (let st = 0; st < 28; st++) {
            const sx = x + 10 * s + (st % 7) * (tileW * 0.11) + (Math.sin(st) * 2 * s);
            const sy = midY + ((st % 4) - 1.5) * (tileH * 0.16) + (Math.cos(st) * 2 * s);
            ctx.beginPath();
            ctx.arc(sx, sy, 2 * s, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (index === 3) {
          // Glitter sparkle spray
          ctx.fillStyle = '#FF3E82';
          ctx.beginPath();
          ctx.ellipse(x + tileW / 2, midY, tileW * 0.35, tileH * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(x + tileW / 2 - 6 * s, midY - 3 * s, 1.5 * s, 0, Math.PI * 2);
          ctx.arc(x + tileW / 2 + 5 * s, midY + 2 * s, 1.2 * s, 0, Math.PI * 2);
          ctx.fill();
        } else if (index === 4) {
          // Sketch hatch lines
          ctx.strokeStyle = '#FF85A2';
          ctx.lineWidth = 2 * s;
          for (let l = 0; l < 5; l++) {
            const lx = x + 10 * s + l * (tileW * 0.15);
            ctx.beginPath();
            ctx.moveTo(lx, midY + 6 * s);
            ctx.lineTo(lx + 8 * s, midY - 6 * s);
            ctx.stroke();
          }
        } else {
          // Dry brush grain
          ctx.strokeStyle = '#FF6B8B';
          ctx.lineWidth = 3.5 * s;
          ctx.beginPath();
          ctx.moveTo(x + 8 * s, midY);
          ctx.lineTo(x + tileW - 8 * s, midY);
          ctx.stroke();
          ctx.strokeStyle = '#FFA8BD';
          ctx.lineWidth = 1.5 * s;
          ctx.beginPath();
          ctx.moveTo(x + 12 * s, midY + 4 * s);
          ctx.lineTo(x + tileW - 12 * s, midY + 4 * s);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  /**
   * 5 Cute Pattern & Glitter Chips at bottom right
   */
  private drawPatternPillChips(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pw: number,
    ph: number,
    s: number
  ) {
    const numChips = 5;
    const gap = Math.round(3.5 * s);
    const chipW = (pw - gap * (numChips - 1)) / numChips;
    const chipH = ph;
    const chipRadius = Math.round(5 * s);

    for (let i = 0; i < numChips; i++) {
      const cx = px + i * (chipW + gap);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx, py, chipW, chipH, chipRadius);
      ctx.clip();

      if (i === 0) {
        // 1. Pink Glitter Sparkle
        ctx.fillStyle = '#FF2D78';
        ctx.fillRect(cx, py, chipW, chipH);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx + chipW * 0.5, py + chipH * 0.45, 2.5 * s, 0, Math.PI * 2);
        ctx.arc(cx + chipW * 0.25, py + chipH * 0.75, 1.5 * s, 0, Math.PI * 2);
        ctx.arc(cx + chipW * 0.78, py + chipH * 0.25, 1.2 * s, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === 1) {
        // 2. Sweet Hearts
        ctx.fillStyle = '#FFB3C6';
        ctx.fillRect(cx, py, chipW, chipH);
        ctx.fillStyle = '#FF2D78';
        ctx.beginPath();
        const hx = cx + chipW / 2;
        const hy = py + chipH / 2;
        ctx.arc(hx - 2 * s, hy - 2 * s, 2 * s, 0, Math.PI * 2);
        ctx.arc(hx + 2 * s, hy - 2 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === 2) {
        // 3. Kawaii Checkerboard
        ctx.fillStyle = '#FFE0E9';
        ctx.fillRect(cx, py, chipW, chipH);
        ctx.fillStyle = '#FF85A2';
        const sq = chipW / 3;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 3; c++) {
            if ((r + c) % 2 === 0) {
              ctx.fillRect(cx + c * sq, py + r * sq, sq, sq);
            }
          }
        }
      } else if (i === 3) {
        // 4. Polka Dots
        ctx.fillStyle = '#FFA8BD';
        ctx.fillRect(cx, py, chipW, chipH);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx + chipW * 0.35, py + chipH * 0.35, 2 * s, 0, Math.PI * 2);
        ctx.arc(cx + chipW * 0.7, py + chipH * 0.68, 2 * s, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 5. Pastel Rainbow Stripes
        const rainbow = ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA'];
        const stripeW = chipW / rainbow.length;
        rainbow.forEach((col, idx) => {
          ctx.fillStyle = col;
          ctx.fillRect(cx + idx * stripeW, py, stripeW, chipH);
        });
      }

      ctx.restore();

      // Chip border
      ctx.strokeStyle = '#FFC0D2';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.roundRect(cx, py, chipW, chipH, chipRadius);
      ctx.stroke();
    }
  }

  // ICON DRAWING HELPERS FOR 6 LEFT BUTTONS
  private drawBrushIcon(ctx: CanvasRenderingContext2D, s: number) {
    ctx.rotate(0.72);
    // Handle
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(-4 * s, -24 * s, 8 * s, 26 * s, 3 * s);
    ctx.fill();
    ctx.strokeStyle = '#FF4586';
    ctx.lineWidth = 1.6 * s;
    ctx.stroke();

    // Ferrule (silver band)
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(-4 * s, 2 * s, 8 * s, 5 * s);
    ctx.strokeStyle = '#FF4586';
    ctx.lineWidth = 1.4 * s;
    ctx.strokeRect(-4 * s, 2 * s, 8 * s, 5 * s);

    // Dipped candy pink bristles
    ctx.fillStyle = '#FF2D78';
    ctx.beginPath();
    ctx.moveTo(-4 * s, 7 * s);
    ctx.lineTo(4 * s, 7 * s);
    ctx.bezierCurveTo(4 * s, 16 * s, 0, 22 * s, 0, 24 * s);
    ctx.bezierCurveTo(0, 22 * s, -4 * s, 16 * s, -4 * s, 7 * s);
    ctx.fill();
    ctx.strokeStyle = '#C71556';
    ctx.lineWidth = 1.4 * s;
    ctx.stroke();
  }

  private drawEraserIcon(ctx: CanvasRenderingContext2D, s: number) {
    ctx.rotate(-0.5);
    // Rubber pink top
    ctx.fillStyle = '#FF528F';
    ctx.beginPath();
    ctx.roundRect(-10 * s, -18 * s, 20 * s, 16 * s, [4 * s, 4 * s, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = '#D92364';
    ctx.lineWidth = 1.6 * s;
    ctx.stroke();

    // White paper sleeve bottom
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(-10 * s, -2 * s, 20 * s, 20 * s, [0, 0, 4 * s, 4 * s]);
    ctx.fill();
    ctx.strokeStyle = '#D92364';
    ctx.lineWidth = 1.6 * s;
    ctx.stroke();

    // Sleeve pink accent stripe
    ctx.fillStyle = '#FF9EBE';
    ctx.fillRect(-10 * s, 4 * s, 20 * s, 4 * s);
  }

  private drawBucketIcon(ctx: CanvasRenderingContext2D, s: number) {
    ctx.rotate(-0.25);
    // Bucket body
    ctx.fillStyle = '#FFE0E9';
    ctx.beginPath();
    ctx.moveTo(-14 * s, -10 * s);
    ctx.lineTo(14 * s, -10 * s);
    ctx.lineTo(10 * s, 16 * s);
    ctx.lineTo(-10 * s, 16 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FF3E82';
    ctx.lineWidth = 1.8 * s;
    ctx.stroke();

    // Spilling paint wave
    ctx.fillStyle = '#FF2D78';
    ctx.beginPath();
    ctx.ellipse(0, -10 * s, 14 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Overflow drip
    ctx.beginPath();
    ctx.moveTo(8 * s, -10 * s);
    ctx.bezierCurveTo(16 * s, -4 * s, 16 * s, 8 * s, 14 * s, 14 * s);
    ctx.bezierCurveTo(12 * s, 18 * s, 6 * s, 18 * s, 6 * s, 10 * s);
    ctx.fill();

    // Bucket handle arch
    ctx.strokeStyle = '#C92B65';
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.arc(0, -10 * s, 16 * s, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }

  private drawSparklesIcon(ctx: CanvasRenderingContext2D, s: number) {
    // 4-point magic star in center
    ctx.fillStyle = '#FF2D78';
    this.drawStar(ctx, 0, 0, 16 * s, 5 * s);

    // Secondary cute starlets
    ctx.fillStyle = '#FF85A2';
    this.drawStar(ctx, -14 * s, -12 * s, 8 * s, 2.5 * s);
    this.drawStar(ctx, 12 * s, 12 * s, 9 * s, 3 * s);
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const outerAng = (i * Math.PI) / 2;
      const innerAng = outerAng + Math.PI / 4;
      if (i === 0) {
        ctx.moveTo(cx + Math.cos(outerAng) * outerR, cy + Math.sin(outerAng) * outerR);
      } else {
        ctx.lineTo(cx + Math.cos(outerAng) * outerR, cy + Math.sin(outerAng) * outerR);
      }
      ctx.lineTo(cx + Math.cos(innerAng) * innerR, cy + Math.sin(innerAng) * innerR);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawHeartIcon(ctx: CanvasRenderingContext2D, s: number) {
    const hSize = 15 * s;
    ctx.fillStyle = '#FF3E82';
    ctx.beginPath();
    ctx.moveTo(0, hSize * 0.9);
    ctx.bezierCurveTo(-hSize * 1.3, hSize * 0.2, -hSize * 1.2, -hSize * 0.8, 0, -hSize * 0.35);
    ctx.bezierCurveTo(hSize * 1.2, -hSize * 0.8, hSize * 1.3, hSize * 0.2, 0, hSize * 0.9);
    ctx.fill();
    ctx.strokeStyle = '#D92364';
    ctx.lineWidth = 1.6 * s;
    ctx.stroke();

    // Gloss gleam
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.ellipse(-hSize * 0.45, -hSize * 0.35, 4 * s, 2 * s, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlowerIcon(ctx: CanvasRenderingContext2D, s: number) {
    const r = 7 * s;
    // 5 rounded pink petals
    ctx.fillStyle = '#FF85A2';
    for (let i = 0; i < 5; i++) {
      const ang = (i * Math.PI * 2) / 5;
      const px = Math.cos(ang) * (r * 1.3);
      const py = Math.sin(ang) * (r * 1.3);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FF4586';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
    }

    // Sunny yellow flower center
    ctx.fillStyle = '#FFD13B';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E6A700';
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();
  }

  /**
   * Portrait (9:16) / Square (1:1) Pink Tablet adaptation
   */
  private drawPortraitPinkTablet(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    src: HTMLCanvasElement,
    cursor: VirtualCursorState | null,
    s: number
  ) {
    const bezel = Math.round(10 * s);
    // Candy pink chassis
    ctx.fillStyle = '#FF3880';
    ctx.beginPath();
    ctx.roundRect(0, 0, cw, ch, Math.round(20 * s));
    ctx.fill();

    // Inner baby pink screen
    ctx.fillStyle = '#FFEAF1';
    ctx.beginPath();
    ctx.roundRect(bezel, bezel, cw - bezel * 2, ch - bezel * 2, Math.round(16 * s));
    ctx.fill();

    const pad = Math.round(10 * s);
    const availW = cw - bezel * 2 - pad * 2;
    const availH = ch - bezel * 2 - pad * 2;

    const scale = Math.min(availW / src.width, availH / src.height);
    const drawW = Math.round(src.width * scale);
    const drawH = Math.round(src.height * scale);
    const drawX = Math.round(bezel + pad + (availW - drawW) / 2);
    const drawY = Math.round(bezel + pad + (availH - drawH) / 2);

    // Draw white canvas with shadow
    const paperRadius = Math.round(18 * s);
    ctx.save();
    ctx.shadowColor = 'rgba(74, 25, 48, 0.18)';
    ctx.shadowBlur = 24 * s;
    ctx.shadowOffsetY = 8 * s;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, drawW, drawH, paperRadius);
    ctx.fill();

    // Crisp inner border for coloring paper
    ctx.strokeStyle = '#FAD4E1';
    ctx.lineWidth = 1.8 * s;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, drawW, drawH, paperRadius);
    ctx.clip();
    ctx.drawImage(src, 0, 0, src.width, src.height, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Cursor
    if (this.options.includeCursor && cursor && cursor.visible) {
      const curCanvasX = drawX + (cursor.x / src.width) * drawW;
      const curCanvasY = drawY + (cursor.y / src.height) * drawH;
      this.drawStylusCursor(ctx, curCanvasX, curCanvasY, cursor, scale);
    }

    // English Learning Overlay
    if (this.options.englishLearningConfig?.enabled && this.options.englishLearningConfig?.showFlashcardOverlay) {
      const activeLetter = this.options.getActiveLetter ? this.options.getActiveLetter() : null;
      this.drawRecordedEnglishFlashcard(ctx, cw, ch, s, this.options.englishLearningConfig, activeLetter);
    }
  }

  private renderFrame = () => {
    if (!this.isRecording || !this.recordingCtx || !this.recordingCanvas) return;
    this.drawSceneFrame();
    this.animFrameId = requestAnimationFrame(this.renderFrame);
  };

  private drawStylusCursor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cursor: VirtualCursorState,
    scale: number
  ) {
    ctx.save();
    ctx.translate(x, y);

    const glowRadius = cursor.isDrawing ? Math.max(7, 10 * scale) : Math.max(3, 4 * scale);
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = cursor.isDrawing ? `${cursor.color}88` : `${cursor.color}33`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2.5, 3.5 * scale), 0, Math.PI * 2);
    ctx.fillStyle = cursor.color;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.rotate(-0.62);
    const isDrawing = cursor.isDrawing;
    const penScale = isDrawing ? 0.98 : 1.0;
    ctx.scale(penScale, penScale);

    ctx.save();
    ctx.shadowColor = 'rgba(44, 27, 36, 0.32)';
    ctx.shadowBlur = isDrawing ? 6 : 16;
    ctx.shadowOffsetX = isDrawing ? 3 : 8;
    ctx.shadowOffsetY = isDrawing ? 3 : 8;

    const style: 'marker' | 'pencil' | 'stylus' =
      cursor.toolStyle ||
      (this.options.cursorStyle === 'auto' || !this.options.cursorStyle
        ? (cursor.brushType === 'colored_pencil' || cursor.brushType === 'pencil' ? 'pencil' : cursor.brushType === 'marker' ? 'marker' : 'stylus')
        : (this.options.cursorStyle === 'circle' || this.options.cursorStyle === 'hidden' ? 'stylus' : (this.options.cursorStyle as 'marker' | 'pencil' | 'stylus')));

    if (style === 'marker') {
      const mLen = Math.max(100, 140 * scale);
      const mWidth = Math.max(15, 20 * scale);
      const tipLen = Math.max(14, 18 * scale);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tipLen, -mWidth * 0.4);
      ctx.lineTo(tipLen, mWidth * 0.4);
      ctx.closePath();
      ctx.fillStyle = cursor.color;
      ctx.fill();
      ctx.strokeStyle = '#2C1B24';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(tipLen, -mWidth / 2, mLen - tipLen, mWidth, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#2C1B24';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = cursor.color;
      ctx.fillRect(mLen - 18 * scale, -mWidth / 2 + 1, 16 * scale, mWidth - 2);

      // Cute graphic heart accent instead of text
      ctx.fillStyle = '#FF4586';
      ctx.beginPath();
      const hx = tipLen + 18 * scale;
      ctx.arc(hx - 2.5 * scale, 0, 2.5 * scale, 0, Math.PI * 2);
      ctx.arc(hx + 2.5 * scale, 0, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'stylus') {
      const stylusLen = Math.max(110, 150 * scale);
      const stylusWidth = Math.max(10, 14 * scale);
      const coneLen = Math.max(16, 22 * scale);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(coneLen, -stylusWidth / 2);
      ctx.lineTo(coneLen, stylusWidth / 2);
      ctx.closePath();
      ctx.fillStyle = '#E8E8E8';
      ctx.fill();
      ctx.strokeStyle = '#2C1B24';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(coneLen * 0.4, -stylusWidth * 0.2);
      ctx.lineTo(coneLen * 0.4, stylusWidth * 0.2);
      ctx.closePath();
      ctx.fillStyle = cursor.color;
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(coneLen, -stylusWidth / 2, stylusLen - coneLen, stylusWidth, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#2C1B24';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = cursor.color;
      ctx.fillRect(coneLen + 6 * scale, -stylusWidth / 2 + 1, 14 * scale, stylusWidth - 2);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(coneLen + 24 * scale, -stylusWidth / 2 + 2, stylusLen - coneLen - 36 * scale, 2);
    } else {
      const pencilLen = Math.max(110, 155 * scale);
      const pencilWidth = Math.max(11, 15 * scale);
      const woodConeLen = Math.max(18, 24 * scale);
      const ferruleLen = Math.max(12, 16 * scale);
      const eraserLen = Math.max(14, 18 * scale);
      const shaftLen = pencilLen - woodConeLen - ferruleLen - eraserLen;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(woodConeLen, -pencilWidth / 2);
      ctx.lineTo(woodConeLen, pencilWidth / 2);
      ctx.closePath();
      ctx.fillStyle = '#EAC696';
      ctx.fill();
      ctx.strokeStyle = '#2C1B24';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(woodConeLen * 0.42, -pencilWidth * 0.22);
      ctx.lineTo(woodConeLen * 0.42, pencilWidth * 0.22);
      ctx.closePath();
      ctx.fillStyle = cursor.color;
      ctx.fill();

      const shaftX = woodConeLen;
      ctx.fillStyle = cursor.color;
      ctx.fillRect(shaftX, -pencilWidth / 2, shaftLen, pencilWidth);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(shaftX, pencilWidth * 0.16, shaftLen, pencilWidth * 0.34);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(shaftX, -pencilWidth / 2 + 1, shaftLen, pencilWidth * 0.32);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(shaftX + 4 * scale, -pencilWidth * 0.28, shaftLen - 8 * scale, 1.8);

      ctx.strokeStyle = '#2C1B24';
      ctx.lineWidth = 2;
      ctx.strokeRect(shaftX, -pencilWidth / 2, shaftLen, pencilWidth);

      const ferruleX = shaftX + shaftLen;
      ctx.fillStyle = '#F4C430';
      ctx.fillRect(ferruleX, -pencilWidth / 2, ferruleLen, pencilWidth);
      ctx.strokeStyle = '#2C1B24';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(ferruleX, -pencilWidth / 2, ferruleLen, pencilWidth);

      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ferruleX + ferruleLen * 0.35, -pencilWidth / 2);
      ctx.lineTo(ferruleX + ferruleLen * 0.35, pencilWidth / 2);
      ctx.moveTo(ferruleX + ferruleLen * 0.7, -pencilWidth / 2);
      ctx.lineTo(ferruleX + ferruleLen * 0.7, pencilWidth / 2);
      ctx.stroke();

      const eraserX = ferruleX + ferruleLen;
      ctx.beginPath();
      ctx.roundRect(eraserX, -pencilWidth / 2 + 0.5, eraserLen, pencilWidth - 1, [0, 4, 4, 0]);
      ctx.fillStyle = '#FFB2C3';
      ctx.fill();
      ctx.strokeStyle = '#2C1B24';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  public async stop(): Promise<RecordingResult> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('Recorder is not active');
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const durationMs = Date.now() - this.startTime;
    this.isRecording = false;

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder lost'));
        return;
      }
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const resolutionText = `${this.recordingCanvas?.width}x${this.recordingCanvas?.height} 60FPS`;
        resolve({
          blob,
          url,
          durationMs,
          sizeBytes: blob.size,
          mimeType,
          resolutionText,
        });
      };
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  }

  private drawRecordedEnglishFlashcard(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    s: number,
    cfg: EnglishLearningConfig,
    activeLetter: string | null
  ) {
    ctx.save();
    const letters = cfg.spellingLetters || [];
    const numLetters = letters.length;
    const tileW = Math.round(38 * s);
    const tileH = Math.round(44 * s);
    const tileGap = Math.round(8 * s);
    const totalTilesW = numLetters * tileW + (numLetters - 1) * tileGap;
    const barPadX = Math.round(20 * s);
    const barW = Math.max(Math.round(280 * s), totalTilesW + barPadX * 2);
    const barH = Math.round(66 * s);
    const barX = (cw - barW) / 2;
    const barY = ch - barH - Math.round(18 * s);

    // Soft floating glass background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = Math.round(16 * s);
    ctx.shadowOffsetY = Math.round(4 * s);
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, Math.round(18 * s));
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Border
    ctx.strokeStyle = '#D8B4FE';
    ctx.lineWidth = Math.round(2.5 * s);
    ctx.stroke();

    // Top mini label
    ctx.font = `bold ${Math.round(10 * s)}px "Nunito", sans-serif`;
    ctx.fillStyle = '#7E22CE';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tag = `🎓 LEARN ENGLISH • ${cfg.targetWord}`;
    ctx.fillText(tag, cw / 2, barY + Math.round(5 * s));

    // Render letter tiles
    const tilesStartX = (cw - totalTilesW) / 2;
    const tilesY = barY + Math.round(18 * s);
    const activeIdx = this.options.getActiveLetterIndex ? this.options.getActiveLetterIndex() : null;

    letters.forEach((ltr, i) => {
      const tx = tilesStartX + i * (tileW + tileGap);
      const isCurrent =
        activeLetter === 'ALL' ||
        activeIdx === -999 ||
        (activeIdx !== null && activeIdx !== undefined ? activeIdx === i : activeLetter === ltr);

      if (isCurrent) {
        // Magical golden-pink radiant 3D glow
        ctx.save();
        ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
        ctx.shadowBlur = Math.round(20 * s);
        ctx.shadowOffsetY = Math.round(-2 * s);

        const grad = ctx.createLinearGradient(
          tx,
          tilesY - Math.round(4 * s),
          tx,
          tilesY + tileH + Math.round(6 * s)
        );
        grad.addColorStop(0, '#F59E0B'); // Bright glowing gold
        grad.addColorStop(0.45, '#EC4899'); // Hot pink
        grad.addColorStop(1, '#9333EA'); // Deep purple
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(
          tx - Math.round(3 * s),
          tilesY - Math.round(4 * s),
          tileW + Math.round(6 * s),
          tileH + Math.round(8 * s),
          Math.round(11 * s)
        );
        ctx.fill();

        // Shiny golden border
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = Math.round(2.5 * s);
        ctx.stroke();

        // Little sparkle star on top-right
        ctx.font = `bold ${Math.round(11 * s)}px "Nunito", sans-serif`;
        ctx.fillStyle = '#FEF08A';
        ctx.textAlign = 'center';
        ctx.fillText('✨', tx + tileW + Math.round(2 * s), tilesY - Math.round(2 * s));
        ctx.restore();

        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#FAF5FF';
        ctx.beginPath();
        ctx.roundRect(tx, tilesY, tileW, tileH, Math.round(8 * s));
        ctx.fill();
        ctx.strokeStyle = '#E9D5FF';
        ctx.lineWidth = Math.round(1.5 * s);
        ctx.stroke();
        ctx.fillStyle = '#581C87';
      }

      ctx.font = `900 ${Math.round((isCurrent ? 21 : 17) * s)}px "Nunito", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ltr, tx + tileW / 2, tilesY + tileH / 2 + (isCurrent ? -Math.round(1.5 * s) : 0));
    });

    ctx.restore();
  }
}

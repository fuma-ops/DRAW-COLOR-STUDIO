/**
 * Cute, catchy "kids desk" scene drawn around the drawing paper.
 * The SAME function paints the live preview background and every frame of the exported video,
 * so what the child sees is exactly what gets published.
 */

export interface SceneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneState {
  /** seconds, drives gentle animation (clouds, twinkling stars, bobbing bee) */
  t: number;
  phase: 'idle' | 'draw' | 'color' | 'spelling' | 'finished';
  title: string;
  emoji: string;
  /** e.g. "Step 3 of 10 · Soft Wing" */
  stepText: string;
  /** subtitle shown at the bottom */
  caption: string;
  progressTotal: number;
  progressDone: number;
  /** colors shown as pencils (unique) */
  palette: string[];
  /** color currently being used (its pencil lifts up and glows) */
  activeColor: string | null;
}

const DEFAULT_PALETTE = ['#FDD72C', '#FB908C', '#7CCBF5', '#443323', '#8BD450', '#B58CF0'];
const FONT = '"Baloo 2", "Fredoka", "Comic Sans MS", "Trebuchet MS", system-ui, sans-serif';

type Layout = 'landscape' | 'portrait' | 'square';

function layoutOf(w: number, h: number): Layout {
  if (w >= h * 1.25) return 'landscape';
  if (h >= w * 1.25) return 'portrait';
  return 'square';
}

/** Where the (square) drawing paper sits inside the scene */
export function getPaperRect(w: number, h: number): SceneRect {
  const layout = layoutOf(w, h);
  if (layout === 'landscape') {
    const size = Math.min(h * 0.66, w * 0.44);
    return { x: (w - size) / 2, y: h * 0.2, w: size, h: size };
  }
  if (layout === 'portrait') {
    const size = w * 0.88;
    return { x: (w - size) / 2, y: h * 0.17, w: size, h: size };
  }
  const size = Math.min(w, h) * 0.52;
  return { x: (w - size) / 2, y: h * 0.21, w: size, h: size };
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
  ctx.arc(x + 30 * s, y - 14 * s, 32 * s, 0, Math.PI * 2);
  ctx.arc(x + 66 * s, y, 26 * s, 0, Math.PI * 2);
  ctx.rect(x, y, 66 * s, 26 * s);
  ctx.fill();
  ctx.restore();
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = petal;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.ellipse(r * 0.62, 0, r * 0.5, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFD84D';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Pencil with its tip at (x, y), pointing along `angle`; body extends behind the tip. */
function pencil(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, thick: number, color: string, angle: number, glow = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = thick * 1.6;
  }
  // body is drawn along +x (tip at the origin, so we flip it)
  ctx.scale(-1, 1);
  const t = thick / 2;
  // wood cone
  ctx.fillStyle = '#F6D7A7';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.17, -t);
  ctx.lineTo(len * 0.17, t);
  ctx.closePath();
  ctx.fill();
  // lead
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.06, -t * 0.36);
  ctx.lineTo(len * 0.06, t * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // painted body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(len * 0.17, -t, len * 0.7, thick, t * 0.35);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(len * 0.17, -t * 0.65, len * 0.7, thick * 0.18);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(len * 0.17, t * 0.45, len * 0.7, thick * 0.2);
  // metal band + eraser
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(len * 0.87, -t, len * 0.05, thick);
  ctx.fillStyle = '#FF8FB1';
  ctx.beginPath();
  ctx.roundRect(len * 0.92, -t, len * 0.08, thick, t * 0.5);
  ctx.fill();
  ctx.restore();
}

function roundedText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, size: number, color: string, weight = 800) {
  let fs = size;
  ctx.font = `${weight} ${fs}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && fs > size * 0.55) {
    fs -= 1;
    ctx.font = `${weight} ${fs}px ${FONT}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

export function drawKidScene(ctx: CanvasRenderingContext2D, w: number, h: number, st: SceneState): SceneRect {
  const layout = layoutOf(w, h);
  const paper = getPaperRect(w, h);
  const u = Math.min(w, h) / 1080; // unit scale
  const t = st.t;

  // ---- sky gradient + soft dots --------------------------------------------------
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#FFE3F0');
  sky.addColorStop(0.55, '#FFF3D9');
  sky.addColorStop(1, '#DDF3FF');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let gy = 0; gy < h; gy += 70 * u) {
    for (let gx = ((gy / (70 * u)) % 2) * 35 * u; gx < w; gx += 70 * u) {
      ctx.beginPath();
      ctx.arc(gx, gy, 6 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // ---- drifting clouds ---------------------------------------------------------------
  const drift = (t * 9 * u) % (w + 260 * u);
  cloud(ctx, ((drift + w * 0.05) % (w + 260 * u)) - 130 * u, h * 0.1, 1.1 * u, 0.9);
  cloud(ctx, ((drift * 0.7 + w * 0.55) % (w + 260 * u)) - 130 * u, h * 0.2, 0.9 * u, 0.8);

  // ---- grass hills at the bottom --------------------------------------------------------
  ctx.fillStyle = '#C9F0A5';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.93);
  ctx.quadraticCurveTo(w * 0.25, h * 0.86, w * 0.5, h * 0.93);
  ctx.quadraticCurveTo(w * 0.75, h * 1.0, w, h * 0.92);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#B2E586';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.97);
  ctx.quadraticCurveTo(w * 0.3, h * 0.92, w * 0.6, h * 0.98);
  ctx.quadraticCurveTo(w * 0.85, h * 1.01, w, h * 0.97);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // ---- twinkling stars + emoji confetti ---------------------------------------------------
  const sparkle = (px: number, py: number, r: number, phase: number, color: string) => {
    const k = 0.75 + 0.25 * Math.sin(t * 2.2 + phase);
    ctx.fillStyle = color;
    star(ctx, px, py, r * k, r * k * 0.45, -Math.PI / 2 + Math.sin(t + phase) * 0.15);
    ctx.fill();
  };

  // ---- paper (shadow, white sheet, washi tape) ------------------------------------------------
  ctx.save();
  ctx.shadowColor = 'rgba(120, 60, 90, 0.28)';
  ctx.shadowBlur = 34 * u;
  ctx.shadowOffsetY = 12 * u;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(paper.x, paper.y, paper.w, paper.h, 26 * u);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#FFC4DC';
  ctx.lineWidth = 5 * u;
  ctx.beginPath();
  ctx.roundRect(paper.x, paper.y, paper.w, paper.h, 26 * u);
  ctx.stroke();
  const tape = (tx: number, ty: number, rot: number, color: string) => {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-48 * u, -14 * u, 96 * u, 28 * u);
    ctx.restore();
  };
  tape(paper.x + 20 * u, paper.y + 6 * u, -0.6, '#FFB3D1');
  tape(paper.x + paper.w - 20 * u, paper.y + 6 * u, 0.6, '#FFE08A');

  // ---- color pencils tray ---------------------------------------------------------------------
  const palette = (st.palette.length ? st.palette : DEFAULT_PALETTE).slice(0, 8);
  if (layout === 'landscape') {
    const zoneX = paper.x + paper.w + 40 * u;
    const zoneW = w - zoneX - 30 * u;
    const rowH = Math.min(70 * u, (paper.h * 0.9) / Math.max(1, palette.length));
    const top = paper.y + (paper.h - rowH * palette.length) / 2;
    // tray
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.roundRect(zoneX - 18 * u, top - 22 * u, zoneW + 8 * u, rowH * palette.length + 44 * u, 28 * u);
    ctx.fill();
    palette.forEach((color, i) => {
      const active = st.activeColor !== null && color.toLowerCase() === st.activeColor.toLowerCase();
      const bob = active ? -26 * u - Math.sin(t * 6) * 4 * u : 0;
      // pencil points LEFT toward the paper; tip at left end
      pencil(ctx, zoneX + bob, top + rowH * i + rowH / 2, Math.min(zoneW * 0.95, 360 * u), rowH * 0.56, color, Math.PI, active);
    });
    // left side: pencil cup + decorations
    const lx = paper.x;
    const cupW = Math.min(150 * u, lx * 0.5);
    const cx = lx * 0.5;
    const cupTop = h * 0.66;
    const sticks = ['#FF6FA5', '#58C4F5', '#FFD23F', '#7ED957', '#B58CF0'];
    sticks.forEach((c, i) => {
      const tilt = (i - 2) * 0.17 + Math.sin(t * 1.2 + i) * 0.015;
      ctx.save();
      ctx.translate(cx, cupTop + 24 * u);
      ctx.rotate(tilt);
      // tip up, body down into the cup (the cup is painted over the lower part)
      pencil(ctx, 0, -170 * u, 230 * u, 30 * u, c, -Math.PI / 2);
      ctx.restore();
    });
    ctx.fillStyle = '#FF8FB1';
    ctx.beginPath();
    ctx.roundRect(cx - cupW / 2, cupTop + 10 * u, cupW, 150 * u, 22 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx - cupW * 0.3 + i * cupW * 0.2, cupTop + 60 * u + (i % 2) * 40 * u, 9 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    // bobbing bee + flowers + stars
    ctx.font = `${88 * u}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('🐝', lx * 0.5, h * 0.3 + Math.sin(t * 2) * 12 * u);
    ctx.font = `${60 * u}px ${FONT}`;
    ctx.fillText('🌈', lx * 0.5, h * 0.46);
    flower(ctx, lx * 0.25, h * 0.9, 34 * u, '#FF8FB1');
    flower(ctx, lx * 0.75, h * 0.92, 28 * u, '#FFB347');
    sparkle(lx * 0.2, h * 0.2, 28 * u, 0, '#FFD23F');
    sparkle(lx * 0.8, h * 0.42, 20 * u, 1.3, '#FF8FB1');
    sparkle(zoneX + zoneW * 0.5, paper.y - 40 * u, 24 * u, 2.1, '#FFD23F');
    ctx.font = `${70 * u}px ${FONT}`;
    ctx.fillText('🦋', zoneX + zoneW * 0.55, h * 0.88 + Math.sin(t * 1.6) * 10 * u);
  } else {
    // portrait / square: pencils in a horizontal row below the paper
    const capHeight = (layout === 'portrait' ? 120 : 84) * u;
    const rowY = paper.y + paper.h + 26 * u + capHeight + 26 * u;
    const startX = w * 0.08;
    const gap = (w * 0.84) / Math.max(1, palette.length);
    const penLen = (layout === 'portrait' ? 180 : 110) * u;
    palette.forEach((color, i) => {
      const active = st.activeColor !== null && color.toLowerCase() === st.activeColor.toLowerCase();
      pencil(ctx, startX + gap * i + gap / 2, rowY + (active ? -22 * u : 0), penLen, Math.min(gap * 0.6, 40 * u), color, -Math.PI / 2, active);
    });
    ctx.font = `${70 * u}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('🐝', w * 0.12, h * 0.1 + Math.sin(t * 2) * 10 * u);
    ctx.fillText('🌈', w * 0.88, h * 0.11);
    sparkle(w * 0.2, paper.y - 30 * u, 24 * u, 0.5, '#FFD23F');
    sparkle(w * 0.82, paper.y - 20 * u, 20 * u, 1.9, '#FF8FB1');
    flower(ctx, w * 0.1, h * 0.95, 30 * u, '#FF8FB1');
    flower(ctx, w * 0.9, h * 0.96, 26 * u, '#FFB347');
  }

  // ---- title banner -----------------------------------------------------------------------------
  const bannerW = Math.min(w * 0.72, 900 * u);
  const bannerH = (layout === 'portrait' ? 84 : 78) * u;
  const bannerY = layout === 'portrait' ? h * 0.03 : h * 0.025;
  ctx.save();
  ctx.shadowColor = 'rgba(255, 70, 130, 0.35)';
  ctx.shadowBlur = 16 * u;
  ctx.fillStyle = '#FF5FA2';
  ctx.beginPath();
  ctx.roundRect((w - bannerW) / 2, bannerY, bannerW, bannerH, bannerH / 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.roundRect((w - bannerW) / 2 + 10 * u, bannerY + 8 * u, bannerW - 20 * u, bannerH * 0.32, bannerH / 4);
  ctx.fill();
  roundedText(ctx, `${st.emoji} ${st.title}`, w / 2, bannerY + bannerH / 2 + 2 * u, bannerW * 0.9, 44 * u, '#FFFFFF');

  // ---- progress stars + step text -------------------------------------------------------------------
  const total = Math.max(1, st.progressTotal);
  const starR = Math.min(20 * u, (bannerW * 0.8) / total / 2.4);
  const starsW = total * starR * 2.6;
  const starsY = bannerY + bannerH + 30 * u;
  for (let i = 0; i < total; i++) {
    const sx = (w - starsW) / 2 + starR * 1.3 + i * starR * 2.6;
    const done = i < st.progressDone;
    const current = i === st.progressDone && st.phase !== 'idle' && st.phase !== 'finished';
    ctx.fillStyle = done ? '#FFC21A' : current ? '#FFE08A' : 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = done || current ? '#F59E0B' : '#FFC4DC';
    ctx.lineWidth = 3 * u;
    star(ctx, sx, starsY + (current ? Math.sin(t * 5) * 3 * u : 0), starR, starR * 0.48);
    ctx.fill();
    ctx.stroke();
  }
  if (layout !== 'landscape' && st.stepText) {
    roundedText(ctx, st.stepText, w / 2, starsY + starR + 34 * u, w * 0.9, 34 * u, '#9B3A66');
  } else if (st.stepText) {
    roundedText(ctx, st.stepText, w / 2, paper.y - 18 * u, w * 0.6, 32 * u, '#9B3A66');
  }

  // ---- caption bar -------------------------------------------------------------------------------------
  if (st.caption) {
    const capW = Math.min(w * 0.9, layout === 'landscape' ? paper.w * 2.0 : w * 0.9);
    const capH = (layout === 'portrait' ? 120 : 84) * u;
    const capY = layout === 'landscape' ? h - capH - 22 * u : paper.y + paper.h + 26 * u;
    ctx.save();
    ctx.shadowColor = 'rgba(120, 60, 90, 0.25)';
    ctx.shadowBlur = 18 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.roundRect((w - capW) / 2, capY, capW, capH, capH * 0.36);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#FFC4DC';
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.roundRect((w - capW) / 2, capY, capW, capH, capH * 0.36);
    ctx.stroke();
    roundedText(ctx, st.caption, w / 2, capY + capH / 2 + 2 * u, capW * 0.92, 40 * u, '#5B2A45');
  }

  return paper;
}

/** A real colored pencil as the "hand": its tip sits exactly where the line is being drawn. */
export function drawPencilCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number,
  drawing: boolean
) {
  ctx.save();
  // soft glow under the tip so viewers can follow it
  ctx.fillStyle = drawing ? 'rgba(255, 95, 162, 0.35)' : 'rgba(255, 95, 162, 0.18)';
  ctx.beginPath();
  ctx.arc(x, y, size * (drawing ? 0.2 : 0.14), 0, Math.PI * 2);
  ctx.fill();
  // pencil leans up-right, tip at (x, y)
  pencil(ctx, x, y, size * 3.2, size * 0.38, color, -Math.PI / 4 - 0.25, false);
  ctx.restore();
}

import { DrawingAssets } from '../types/recordedDrawing';

// Helper to encode SVG into clean data URL
function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

// ==========================================
// PRESET 1: KAWAII SIDE-VIEW HONEY BEE (User-Uploaded Reference Model)
// Features side-profile head, smiling face, chubby striped tummy, wings on top, feet at bottom
// ==========================================
export const SIDE_BEE_WIDTH = 800;
export const SIDE_BEE_HEIGHT = 800;

export const SIDE_BEE_PATHS = {
  head: 'M 260 480 A 85 85 0 1 1 430 480 A 85 85 0 1 1 260 480 Z',
  leftEye: 'M 304 475 A 16 16 0 1 1 336 475 A 16 16 0 1 1 304 475 Z',
  rightEye: 'M 359 475 A 16 16 0 1 1 391 475 A 16 16 0 1 1 359 475 Z',
  mouth: 'M 338 502 C 344 514 352 514 358 502',
  leftCheek: 'M 285 504 A 12 7 0 1 1 309 504 A 12 7 0 1 1 285 504 Z',
  rightCheek: 'M 385 504 A 12 7 0 1 1 409 504 A 12 7 0 1 1 385 504 Z',
  bodyContour: 'M 400 425 C 490 415 570 435 625 470 L 670 500 L 625 525 C 570 560 485 568 385 545',
  stripe1: 'M 465 423 C 485 475 485 515 455 558',
  stripe2: 'M 525 432 C 545 475 545 515 515 561',
  stripe3: 'M 585 452 C 600 485 600 515 575 553',
  backWing: 'M 480 425 C 450 330 490 290 535 305 C 570 320 560 380 520 425 Z',
  frontWing: 'M 525 425 C 505 320 565 280 615 305 C 660 335 640 400 565 430 Z',
  foot1: 'M 450 558 C 445 585 475 585 468 558',
  foot2: 'M 510 561 C 505 588 535 588 528 561',
  foot3: 'M 570 553 C 565 580 595 580 588 553',
  stinger: 'M 625 470 L 670 500 L 625 525 Z',
};

// 1. Dotted Guide for Side-View Bee
export const SIDE_BEE_DOTTED_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIDE_BEE_WIDTH} ${SIDE_BEE_HEIGHT}" width="${SIDE_BEE_WIDTH}" height="${SIDE_BEE_HEIGHT}">
  <rect width="${SIDE_BEE_WIDTH}" height="${SIDE_BEE_HEIGHT}" fill="#FFFFFF" fill-opacity="0" />
  <g fill="none" stroke="#64748B" stroke-width="5" stroke-dasharray="8,10" stroke-linecap="round" stroke-linejoin="round">
    <!-- Head -->
    <path d="${SIDE_BEE_PATHS.head}" />
    <!-- Wings on top -->
    <path d="${SIDE_BEE_PATHS.backWing}" />
    <path d="${SIDE_BEE_PATHS.frontWing}" />
    <!-- Chubby Body -->
    <path d="${SIDE_BEE_PATHS.bodyContour}" />
    <!-- Stripes -->
    <path d="${SIDE_BEE_PATHS.stripe1}" />
    <path d="${SIDE_BEE_PATHS.stripe2}" />
    <path d="${SIDE_BEE_PATHS.stripe3}" />
    <!-- 3 Little Feet -->
    <path d="${SIDE_BEE_PATHS.foot1}" />
    <path d="${SIDE_BEE_PATHS.foot2}" />
    <path d="${SIDE_BEE_PATHS.foot3}" />
    <!-- Mouth -->
    <path d="${SIDE_BEE_PATHS.mouth}" stroke-width="4" stroke-dasharray="5,6" />
  </g>
  <!-- Eyes and Cheeks -->
  <g fill="#94A3B8" fill-opacity="0.4" stroke="#64748B" stroke-width="3" stroke-dasharray="4,6">
    <path d="${SIDE_BEE_PATHS.leftEye}" />
    <path d="${SIDE_BEE_PATHS.rightEye}" />
    <path d="${SIDE_BEE_PATHS.leftCheek}" />
    <path d="${SIDE_BEE_PATHS.rightCheek}" />
  </g>
</svg>
`;

// 2. Black and White Solid Line-Art Reference
export const SIDE_BEE_BW_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIDE_BEE_WIDTH} ${SIDE_BEE_HEIGHT}" width="${SIDE_BEE_WIDTH}" height="${SIDE_BEE_HEIGHT}">
  <rect width="${SIDE_BEE_WIDTH}" height="${SIDE_BEE_HEIGHT}" fill="#FFFFFF" />
  <g fill="none" stroke="#18181B" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <!-- Wings behind body -->
    <path d="${SIDE_BEE_PATHS.backWing}" fill="#FFFFFF" />
    <path d="${SIDE_BEE_PATHS.frontWing}" fill="#FFFFFF" />
    <!-- Feet -->
    <path d="${SIDE_BEE_PATHS.foot1}" />
    <path d="${SIDE_BEE_PATHS.foot2}" />
    <path d="${SIDE_BEE_PATHS.foot3}" />
    <!-- Body -->
    <path d="${SIDE_BEE_PATHS.bodyContour}" fill="#FFFFFF" />
    <!-- Stripes -->
    <path d="${SIDE_BEE_PATHS.stripe1}" stroke-width="6" />
    <path d="${SIDE_BEE_PATHS.stripe2}" stroke-width="6" />
    <path d="${SIDE_BEE_PATHS.stripe3}" stroke-width="6" />
    <!-- Head -->
    <path d="${SIDE_BEE_PATHS.head}" fill="#FFFFFF" stroke-width="7" />
    <!-- Eyes -->
    <path d="${SIDE_BEE_PATHS.leftEye}" fill="#18181B" />
    <path d="${SIDE_BEE_PATHS.rightEye}" fill="#18181B" />
    <!-- Cheeks -->
    <path d="${SIDE_BEE_PATHS.leftCheek}" stroke-width="3" />
    <path d="${SIDE_BEE_PATHS.rightCheek}" stroke-width="3" />
    <!-- Mouth -->
    <path d="${SIDE_BEE_PATHS.mouth}" stroke-width="5" />
  </g>
  <!-- Eye Sparkles -->
  <circle cx="316" cy="470" r="5" fill="#FFFFFF" />
  <circle cx="324" cy="478" r="2.5" fill="#FFFFFF" />
  <circle cx="371" cy="470" r="5" fill="#FFFFFF" />
  <circle cx="379" cy="478" r="2.5" fill="#FFFFFF" />
</svg>
`;

// 3. Fully Colored Reference for Side-View Bee
export const SIDE_BEE_COLORED_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIDE_BEE_WIDTH} ${SIDE_BEE_HEIGHT}" width="${SIDE_BEE_WIDTH}" height="${SIDE_BEE_HEIGHT}">
  <rect width="${SIDE_BEE_WIDTH}" height="${SIDE_BEE_HEIGHT}" fill="#FFFFFF" />
  
  <!-- Wings (Sky Blue Pastel) -->
  <path d="${SIDE_BEE_PATHS.backWing}" fill="#BAE6FD" stroke="#18181B" stroke-width="7" stroke-linejoin="round" />
  <path d="${SIDE_BEE_PATHS.frontWing}" fill="#BAE6FD" stroke="#18181B" stroke-width="7" stroke-linejoin="round" />
  <path d="M 500 350 C 520 320 545 330 540 370" fill="none" stroke="#7DD3FC" stroke-width="4" stroke-linecap="round" />

  <!-- 3 Feet -->
  <path d="${SIDE_BEE_PATHS.foot1}" fill="#3E2723" stroke="#18181B" stroke-width="6" stroke-linejoin="round" />
  <path d="${SIDE_BEE_PATHS.foot2}" fill="#3E2723" stroke="#18181B" stroke-width="6" stroke-linejoin="round" />
  <path d="${SIDE_BEE_PATHS.foot3}" fill="#3E2723" stroke="#18181B" stroke-width="6" stroke-linejoin="round" />

  <!-- Chubby Body (Honey Yellow) -->
  <path d="${SIDE_BEE_PATHS.bodyContour}" fill="#FDE047" stroke="#18181B" stroke-width="7" stroke-linejoin="round" />

  <!-- Chocolate Stripes & Stinger -->
  <path d="M 465 423 C 485 475 485 515 455 558 L 475 560 C 505 515 505 475 485 424 Z" fill="#3E2723" stroke="#18181B" stroke-width="5" />
  <path d="M 525 432 C 545 475 545 515 515 561 L 535 562 C 565 515 565 475 545 433 Z" fill="#3E2723" stroke="#18181B" stroke-width="5" />
  <path d="M 585 452 C 600 485 600 515 575 553 L 595 554 C 620 515 620 485 605 453 Z" fill="#3E2723" stroke="#18181B" stroke-width="5" />
  <path d="${SIDE_BEE_PATHS.stinger}" fill="#3E2723" stroke="#18181B" stroke-width="6" />

  <!-- Head (Honey Yellow) -->
  <path d="${SIDE_BEE_PATHS.head}" fill="#FDE047" stroke="#18181B" stroke-width="7" />

  <!-- Rosy Pink Cheeks -->
  <path d="${SIDE_BEE_PATHS.leftCheek}" fill="#F472B6" fill-opacity="0.85" stroke="#18181B" stroke-width="2.5" />
  <path d="${SIDE_BEE_PATHS.rightCheek}" fill="#F472B6" fill-opacity="0.85" stroke="#18181B" stroke-width="2.5" />

  <!-- Shining Anime Eyes -->
  <path d="${SIDE_BEE_PATHS.leftEye}" fill="#18181B" stroke="#18181B" stroke-width="2" />
  <path d="${SIDE_BEE_PATHS.rightEye}" fill="#18181B" stroke="#18181B" stroke-width="2" />
  <circle cx="316" cy="470" r="5" fill="#FFFFFF" />
  <circle cx="324" cy="478" r="2.5" fill="#FFFFFF" />
  <circle cx="371" cy="470" r="5" fill="#FFFFFF" />
  <circle cx="379" cy="478" r="2.5" fill="#FFFFFF" />

  <!-- Happy Mouth -->
  <path d="${SIDE_BEE_PATHS.mouth}" fill="none" stroke="#18181B" stroke-width="5" stroke-linecap="round" />
</svg>
`;

// ==========================================
// PRESET 2: KAWAII FRONT-VIEW BEE
// ==========================================
const BEE_WIDTH = 800;
const BEE_HEIGHT = 800;

export const BEE_PATHS = {
  leftAntenna: 'M 350 250 C 330 180 290 160 270 170 C 260 175 255 190 265 195 C 280 200 300 215 320 270',
  rightAntenna: 'M 450 250 C 470 180 510 160 530 170 C 540 175 545 190 535 195 C 520 200 500 215 480 270',
  leftWing: 'M 340 370 C 240 280 140 320 160 420 C 180 500 280 480 340 430 Z',
  rightWing: 'M 460 370 C 560 280 660 320 640 420 C 620 500 520 480 460 430 Z',
  stinger: 'M 400 660 L 385 610 L 415 610 Z',
  bodyOutline: 'M 400 240 C 530 240 570 360 570 450 C 570 560 510 630 400 630 C 290 630 230 560 230 450 C 230 360 270 240 400 240 Z',
  stripe1: 'M 245 390 C 320 420 480 420 555 390 C 562 425 565 440 565 450 C 490 480 310 480 235 450 C 235 435 240 415 245 390 Z',
  stripe2: 'M 255 510 C 330 540 470 540 545 510 C 535 550 515 580 485 600 C 430 615 370 615 315 600 C 285 580 265 550 255 510 Z',
  leftEye: 'M 340 345 A 14 16 0 1 1 339 345',
  rightEye: 'M 460 345 A 14 16 0 1 1 459 345',
  mouth: 'M 385 365 C 395 385 405 385 415 365',
  leftCheek: 'M 305 370 A 18 12 0 1 1 304 370',
  rightCheek: 'M 495 370 A 18 12 0 1 1 494 370',
};

const BEE_DOTTED_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BEE_WIDTH} ${BEE_HEIGHT}" width="${BEE_WIDTH}" height="${BEE_HEIGHT}">
  <rect width="${BEE_WIDTH}" height="${BEE_HEIGHT}" fill="#FFFFFF" fill-opacity="0" />
  <g fill="none" stroke="#64748B" stroke-width="5" stroke-dasharray="10,12" stroke-linecap="round" stroke-linejoin="round">
    <path d="${BEE_PATHS.leftWing}" />
    <path d="${BEE_PATHS.rightWing}" />
    <path d="${BEE_PATHS.leftAntenna}" />
    <path d="${BEE_PATHS.rightAntenna}" />
    <path d="${BEE_PATHS.stinger}" />
    <path d="${BEE_PATHS.bodyOutline}" />
    <path d="${BEE_PATHS.stripe1}" />
    <path d="${BEE_PATHS.stripe2}" />
    <path d="${BEE_PATHS.mouth}" stroke-width="4" stroke-dasharray="6,8" />
  </g>
  <g fill="#94A3B8" fill-opacity="0.4" stroke="#64748B" stroke-width="3" stroke-dasharray="4,6">
    <path d="${BEE_PATHS.leftEye}" />
    <path d="${BEE_PATHS.rightEye}" />
    <path d="${BEE_PATHS.leftCheek}" />
    <path d="${BEE_PATHS.rightCheek}" />
  </g>
</svg>
`;

const BEE_BW_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BEE_WIDTH} ${BEE_HEIGHT}" width="${BEE_WIDTH}" height="${BEE_HEIGHT}">
  <rect width="${BEE_WIDTH}" height="${BEE_HEIGHT}" fill="#FFFFFF" />
  <g fill="none" stroke="#18181B" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <path d="${BEE_PATHS.leftWing}" fill="#FFFFFF" />
    <path d="${BEE_PATHS.rightWing}" fill="#FFFFFF" />
    <path d="${BEE_PATHS.stinger}" fill="#18181B" />
    <path d="${BEE_PATHS.bodyOutline}" fill="#FFFFFF" />
    <path d="${BEE_PATHS.stripe1}" fill="#FFFFFF" />
    <path d="${BEE_PATHS.stripe2}" fill="#FFFFFF" />
    <path d="${BEE_PATHS.leftAntenna}" stroke-width="7" />
    <path d="${BEE_PATHS.rightAntenna}" stroke-width="7" />
    <path d="${BEE_PATHS.leftEye}" fill="#18181B" />
    <path d="${BEE_PATHS.rightEye}" fill="#18181B" />
    <path d="${BEE_PATHS.leftCheek}" stroke-width="4" />
    <path d="${BEE_PATHS.rightCheek}" stroke-width="4" />
    <path d="${BEE_PATHS.mouth}" stroke-width="6" />
  </g>
  <circle cx="334" cy="338" r="4.5" fill="#FFFFFF" />
  <circle cx="454" cy="338" r="4.5" fill="#FFFFFF" />
</svg>
`;

const BEE_COLORED_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BEE_WIDTH} ${BEE_HEIGHT}" width="${BEE_WIDTH}" height="${BEE_HEIGHT}">
  <rect width="${BEE_WIDTH}" height="${BEE_HEIGHT}" fill="#FFFFFF" />
  <path d="${BEE_PATHS.leftWing}" fill="#BAE6FD" fill-opacity="0.9" stroke="#18181B" stroke-width="8" stroke-linejoin="round" />
  <path d="${BEE_PATHS.rightWing}" fill="#BAE6FD" fill-opacity="0.9" stroke="#18181B" stroke-width="8" stroke-linejoin="round" />
  <path d="${BEE_PATHS.stinger}" fill="#3E2723" stroke="#18181B" stroke-width="8" stroke-linejoin="round" />
  <path d="${BEE_PATHS.bodyOutline}" fill="#FDE047" stroke="#18181B" stroke-width="8" stroke-linejoin="round" />
  <path d="${BEE_PATHS.stripe1}" fill="#3E2723" stroke="#18181B" stroke-width="8" stroke-linejoin="round" />
  <path d="${BEE_PATHS.stripe2}" fill="#3E2723" stroke="#18181B" stroke-width="8" stroke-linejoin="round" />
  <path d="${BEE_PATHS.leftCheek}" fill="#F472B6" fill-opacity="0.9" stroke="#18181B" stroke-width="3" />
  <path d="${BEE_PATHS.rightCheek}" fill="#F472B6" fill-opacity="0.9" stroke="#18181B" stroke-width="3" />
  <path d="${BEE_PATHS.leftEye}" fill="#18181B" stroke="#18181B" stroke-width="3" />
  <circle cx="334" cy="338" r="4.5" fill="#FFFFFF" />
  <path d="${BEE_PATHS.rightEye}" fill="#18181B" stroke="#18181B" stroke-width="3" />
  <circle cx="454" cy="338" r="4.5" fill="#FFFFFF" />
  <path d="${BEE_PATHS.mouth}" fill="none" stroke="#18181B" stroke-width="6" stroke-linecap="round" />
  <path d="${BEE_PATHS.leftAntenna}" fill="none" stroke="#18181B" stroke-width="8" stroke-linecap="round" />
  <circle cx="265" cy="185" r="10" fill="#3E2723" stroke="#18181B" stroke-width="5" />
  <path d="${BEE_PATHS.rightAntenna}" fill="none" stroke="#18181B" stroke-width="8" stroke-linecap="round" />
  <circle cx="535" cy="185" r="10" fill="#3E2723" stroke="#18181B" stroke-width="5" />
</svg>
`;

export const PRESET_DRAWING_ASSETS: DrawingAssets[] = [
  {
    id: 'kawaii-side-bee',
    name: 'Kawaii Side-View Honey Bee 🐝 (Head → Face → Body → Stripes → Wings → Feet)',
    dottedGuideUrl: svgToDataUrl(SIDE_BEE_DOTTED_SVG),
    bwReferenceUrl: svgToDataUrl(SIDE_BEE_BW_SVG),
    coloredReferenceUrl: svgToDataUrl(SIDE_BEE_COLORED_SVG),
    width: SIDE_BEE_WIDTH,
    height: SIDE_BEE_HEIGHT,
    aspectRatio: 1.0,
  },
  {
    id: 'kawaii-front-bee',
    name: 'Kawaii Front-View Bee 🐝',
    dottedGuideUrl: svgToDataUrl(BEE_DOTTED_SVG),
    bwReferenceUrl: svgToDataUrl(BEE_BW_SVG),
    coloredReferenceUrl: svgToDataUrl(BEE_COLORED_SVG),
    width: BEE_WIDTH,
    height: BEE_HEIGHT,
    aspectRatio: 1.0,
  },
];

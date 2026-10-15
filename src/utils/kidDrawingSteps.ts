import { DrawingToolType } from '../types/recordedDrawing';
import { SIDE_BEE_PATHS, BEE_PATHS } from '../data/presetDrawingAssets';

export interface KidDrawingStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  partName: string;
  partNameEn: string;
  emoji: string;
  instructionFr: string;
  instructionEn: string;
  felicitationFr: string;
  felicitationEn: string;
  praiseTitleFr: string;
  praiseTitleEn: string;
  badgeColor: string;
  tool: DrawingToolType;
  strokeColor: string;
  strokeWidth: number;
  paths: {
    d: string;
    points?: { x: number; y: number }[];
  }[];
  glitterContourPath?: string;
  glitterCenter?: { x: number; y: number };
}

export interface KidColoringStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  partName: string;
  partNameEn: string;
  emoji: string;
  colorHex: string;
  colorNameFr: string;
  colorNameEn: string;
  instructionFr: string;
  instructionEn: string;
  felicitationFr: string;
  felicitationEn: string;
  fillPath: string;
  regionSeed: { x: number; y: number };
  glitterContourPath?: string;
  glitterCenter?: { x: number; y: number };
}

export interface SpellingLetter {
  char: string;
  soundFr: string;
  soundEn: string;
}

export const BEE_SPELLING_EN: SpellingLetter[] = [
  { char: 'B', soundFr: 'Bé', soundEn: 'B' },
  { char: 'E', soundFr: 'E', soundEn: 'E' },
  { char: 'E', soundFr: 'E', soundEn: 'E' },
];

export const BEE_SPELLING_FR: SpellingLetter[] = [
  { char: 'A', soundFr: 'A', soundEn: 'A' },
  { char: 'B', soundFr: 'B', soundEn: 'B' },
  { char: 'E', soundFr: 'E', soundEn: 'E' },
  { char: 'I', soundFr: 'I', soundEn: 'I' },
  { char: 'L', soundFr: 'L', soundEn: 'L' },
  { char: 'L', soundFr: 'L', soundEn: 'L' },
  { char: 'E', soundFr: 'E', soundEn: 'E' },
];

// Split an SVG path string containing multiple M commands into individual continuous sub-paths
export function splitSvgSubpaths(d: string): string[] {
  const raw = d.trim();
  if (!raw) return [];
  const parts = raw.split(/(?=[Mm])/g).map(p => p.trim()).filter(p => p.length > 2);
  return parts.length > 0 ? parts : [raw];
}

// Convert an SVG path string into densely sampled points for a single continuous sub-path
export function sampleSvgPath(pathString: string, sampleCount = 60): { x: number; y: number }[] {
  if (typeof document === 'undefined') return [];
  try {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    const totalLength = path.getTotalLength();
    if (!totalLength || totalLength <= 0 || isNaN(totalLength)) return [];

    const points: { x: number; y: number }[] = [];
    const count = Math.max(14, Math.min(180, Math.round(totalLength / 6)));
    for (let i = 0; i <= count; i++) {
      const pt = path.getPointAtLength((i / count) * totalLength);
      points.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
    }
    return points;
  } catch (err) {
    console.warn('Failed to sample SVG path', err);
    return [];
  }
}

// =========================================================================
// 🐝 PRESET 1: KAWAII SIDE-VIEW HONEY BEE (User Reference Character)
// Order: Round Head 🟡 → Face & Smile 😊 → Chubby Body & Stinger 🐝 → Stripes 🍯 → Soft Wings 🪽 → Little Feet ✨
// =========================================================================
export const KID_SIDE_BEE_DRAWING_STEPS: KidDrawingStep[] = [
  {
    id: 'step_head',
    stepNumber: 1,
    totalSteps: 6,
    partName: 'Tête Ronde',
    partNameEn: 'Round Head',
    emoji: '🟡',
    instructionFr: 'Faisons la tête toute ronde !',
    instructionEn: 'Round round head! Big circle!',
    felicitationFr: 'Superbe tête toute ronde !',
    felicitationEn: 'Round round head!',
    praiseTitleFr: '🌟 TÊTE TOUTE RONDE !',
    praiseTitleEn: '🌟 ROUND HEAD!',
    badgeColor: '#F59E0B',
    tool: 'pen',
    strokeColor: '#18181B',
    strokeWidth: 5,
    glitterContourPath: 'M 245 480 A 100 100 0 1 1 445 480 A 100 100 0 1 1 245 480 Z',
    glitterCenter: { x: 345, y: 480 },
    paths: [{ d: SIDE_BEE_PATHS.head }],
  },
  {
    id: 'step_eyes_mouth',
    stepNumber: 2,
    totalSteps: 6,
    partName: 'Yeux Mignons & Sourire',
    partNameEn: 'Cute Eyes & Smile',
    emoji: '😊',
    instructionFr: 'Deux yeux mignons et un grand sourire !',
    instructionEn: 'Cute eyes and happy smile!',
    felicitationFr: 'Regarde ce joli sourire !',
    felicitationEn: 'Cute eyes and smile!',
    praiseTitleFr: '💖 MAGNIFIQUE SOURIRE !',
    praiseTitleEn: '💖 CUTE EYES & SMILE!',
    badgeColor: '#EC4899',
    tool: 'pen',
    strokeColor: '#18181B',
    strokeWidth: 4,
    glitterContourPath: 'M 270 455 L 420 455 L 420 525 L 270 525 Z',
    glitterCenter: { x: 345, y: 490 },
    paths: [
      { d: SIDE_BEE_PATHS.leftEye },
      { d: SIDE_BEE_PATHS.rightEye },
      { d: SIDE_BEE_PATHS.mouth },
      { d: SIDE_BEE_PATHS.leftCheek },
      { d: SIDE_BEE_PATHS.rightCheek },
    ],
  },
  {
    id: 'step_body',
    stepNumber: 3,
    totalSteps: 6,
    partName: 'Corps Moelleux & Dard',
    partNameEn: 'Chubby Body & Stinger',
    emoji: '🐝',
    instructionFr: 'Dessinons le corps moelleux et le petit dard !',
    instructionEn: 'Chubby body and stinger!',
    felicitationFr: 'Superbe corps dodu !',
    felicitationEn: 'Chubby soft body!',
    praiseTitleFr: '✨ CORPS MOELLEUX !',
    praiseTitleEn: '✨ CHUBBY BODY!',
    badgeColor: '#D97706',
    tool: 'pen',
    strokeColor: '#18181B',
    strokeWidth: 5,
    glitterContourPath: 'M 380 405 C 500 395 590 415 645 455 L 690 500 L 645 540 C 585 575 495 585 370 560 Z',
    glitterCenter: { x: 530, y: 490 },
    paths: [{ d: SIDE_BEE_PATHS.bodyContour }],
  },
  {
    id: 'step_stripes',
    stepNumber: 4,
    totalSteps: 6,
    partName: 'Belles Rayures',
    partNameEn: 'Sweet Stripes',
    emoji: '🍯',
    instructionFr: 'Trois belles rayures : une, deux, trois !',
    instructionEn: 'Stripes! One, two, three!',
    felicitationFr: 'De jolies rayures régulières !',
    felicitationEn: 'Sweet striped tummy!',
    praiseTitleFr: '🎉 BELLES RAYURES !',
    praiseTitleEn: '🎉 SWEET STRIPES!',
    badgeColor: '#8B5CF6',
    tool: 'pen',
    strokeColor: '#18181B',
    strokeWidth: 5,
    glitterContourPath: 'M 440 415 L 610 440 L 590 570 L 435 570 Z',
    glitterCenter: { x: 520, y: 490 },
    paths: [
      { d: SIDE_BEE_PATHS.stripe1 },
      { d: SIDE_BEE_PATHS.stripe2 },
      { d: SIDE_BEE_PATHS.stripe3 },
    ],
  },
  {
    id: 'step_wings',
    stepNumber: 5,
    totalSteps: 6,
    partName: 'Ailes Volantes',
    partNameEn: 'Soft Wings',
    emoji: '🪽',
    instructionFr: 'Deux petites ailes pour voler tout haut !',
    instructionEn: 'Two soft wings! Flap flap!',
    felicitationFr: 'Des ailes toutes légères !',
    felicitationEn: 'Soft fluttering wings!',
    praiseTitleFr: '🧚‍♀️ SUPERBES AILES !',
    praiseTitleEn: '🧚‍♀️ SOFT WINGS!',
    badgeColor: '#0EA5E9',
    tool: 'pen',
    strokeColor: '#18181B',
    strokeWidth: 5,
    glitterContourPath: 'M 440 435 C 420 310 490 270 550 290 C 660 320 660 410 560 445 Z',
    glitterCenter: { x: 540, y: 360 },
    paths: [
      { d: SIDE_BEE_PATHS.backWing },
      { d: SIDE_BEE_PATHS.frontWing },
    ],
  },
  {
    id: 'step_feet',
    stepNumber: 6,
    totalSteps: 6,
    partName: 'Petites Pattes',
    partNameEn: 'Tiny Feet',
    emoji: '✨',
    instructionFr: 'Trois petites pattes en bas !',
    instructionEn: 'Three tiny feet! Tap tap!',
    felicitationFr: 'Notre abeille est complète !',
    felicitationEn: 'Our kawaii bee is complete!',
    praiseTitleFr: '🏆 DESSIN TERMINÉ AVEC SUCCÈS !',
    praiseTitleEn: '🏆 DRAWING COMPLETE!',
    badgeColor: '#10B981',
    tool: 'pen',
    strokeColor: '#18181B',
    strokeWidth: 5,
    glitterContourPath: 'M 430 550 L 610 545 L 610 595 L 430 595 Z',
    glitterCenter: { x: 520, y: 570 },
    paths: [
      { d: SIDE_BEE_PATHS.foot1 },
      { d: SIDE_BEE_PATHS.foot2 },
      { d: SIDE_BEE_PATHS.foot3 },
    ],
  },
];

export const KID_SIDE_BEE_COLORING_STEPS: KidColoringStep[] = [
  {
    id: 'color_body_yellow',
    stepNumber: 1,
    totalSteps: 4,
    partName: 'Corps Jaune Miel',
    partNameEn: 'Honey Yellow Body',
    emoji: '🍯',
    colorHex: '#FDE047',
    colorNameFr: 'Jaune Miel',
    colorNameEn: 'Honey Yellow',
    instructionFr: 'Colorions en jaune miel comme un soleil !',
    instructionEn: 'Sunny yellow! Paint paint!',
    felicitationFr: 'Superbe jaune éclatant !',
    felicitationEn: 'Bright sunny yellow!',
    fillPath: `${SIDE_BEE_PATHS.head} ${SIDE_BEE_PATHS.bodyContour}`,
    regionSeed: { x: 440, y: 480 },
    glitterContourPath: 'M 245 420 L 675 420 L 675 580 L 245 580 Z',
    glitterCenter: { x: 460, y: 490 },
  },
  {
    id: 'color_stripes_chocolate',
    stepNumber: 2,
    totalSteps: 4,
    partName: 'Rayures Chocolat',
    partNameEn: 'Chocolate Stripes',
    emoji: '🍫',
    colorHex: '#3E2723',
    colorNameFr: 'Marron Chocolat',
    colorNameEn: 'Dark Chocolate',
    instructionFr: 'Colorions les rayures en marron chocolat !',
    instructionEn: 'Chocolate brown! Sweet stripes!',
    felicitationFr: 'De belles rayures chocolat !',
    felicitationEn: 'Sweet chocolate stripes!',
    fillPath: 'M 465 423 C 485 475 485 515 455 558 L 475 560 C 505 515 505 475 485 424 Z M 525 432 C 545 475 545 515 515 561 L 535 562 C 565 515 565 475 545 433 Z M 585 452 C 600 485 600 515 575 553 L 595 554 C 620 515 620 485 605 453 Z',
    regionSeed: { x: 500, y: 490 },
    glitterContourPath: 'M 440 415 L 610 440 L 590 570 L 435 570 Z',
    glitterCenter: { x: 520, y: 490 },
  },
  {
    id: 'color_wings_blue',
    stepNumber: 3,
    totalSteps: 4,
    partName: 'Ailes Bleu Ciel',
    partNameEn: 'Sky Blue Wings',
    emoji: '🪽',
    colorHex: '#BAE6FD',
    colorNameFr: 'Bleu Ciel Pastel',
    colorNameEn: 'Pastel Sky Blue',
    instructionFr: 'Colorions les ailes en bleu ciel tout doux !',
    instructionEn: 'Sky blue! Soft wings!',
    felicitationFr: 'Des ailes toutes douces !',
    felicitationEn: 'Soft dreamy wings!',
    fillPath: `${SIDE_BEE_PATHS.backWing} ${SIDE_BEE_PATHS.frontWing}`,
    regionSeed: { x: 540, y: 360 },
    glitterContourPath: 'M 440 435 C 420 310 490 270 550 290 C 660 320 660 410 560 445 Z',
    glitterCenter: { x: 540, y: 360 },
  },
  {
    id: 'color_cheeks_pink',
    stepNumber: 4,
    totalSteps: 4,
    partName: 'Joues Roses Bonbon',
    partNameEn: 'Rosy Pink Cheeks',
    emoji: '🌸',
    colorHex: '#F472B6',
    colorNameFr: 'Rose Bonbon',
    colorNameEn: 'Candy Pink',
    instructionFr: 'Et des petites joues toutes roses !',
    instructionEn: 'Pretty pink! Rosy cheeks!',
    felicitationFr: 'Notre abeille est magnifique !',
    felicitationEn: 'Our kawaii bee is complete!',
    fillPath: `${SIDE_BEE_PATHS.leftCheek} ${SIDE_BEE_PATHS.rightCheek}`,
    regionSeed: { x: 345, y: 504 },
    glitterContourPath: 'M 275 490 L 415 490 L 415 520 L 275 520 Z',
    glitterCenter: { x: 345, y: 504 },
  },
];

// Default Export points to the Side-View Bee (the user's model!)
export const KID_BEE_DRAWING_STEPS = KID_SIDE_BEE_DRAWING_STEPS;
export const KID_BEE_COLORING_STEPS = KID_SIDE_BEE_COLORING_STEPS;

export type DrawingToolType = 'pencil' | 'pen' | 'marker' | 'eraser';

export interface StrokePoint {
  x: number;
  y: number;
  time: number; // millisecond timestamp relative to stroke start
  pressure?: number;
}

export interface RecordedStroke {
  id: string;
  sequenceNumber: number; // 0, 1, 2...
  tool: DrawingToolType;
  color: string;
  size: number;
  opacity: number;
  points: StrokePoint[];
  startTime: number;
  endTime: number;
  durationMs: number;
}

export interface DrawingAssets {
  id: string;
  name: string;
  dottedGuideUrl: string;
  bwReferenceUrl: string;
  coloredReferenceUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface DrawingVerificationResult {
  coveragePercent: number; // 0 to 100%
  totalContourPoints: number;
  matchedContourPoints: number;
  missingContourPoints: { x: number; y: number }[];
  status: 'excellent' | 'good' | 'incomplete' | 'misaligned';
  message: string;
}

export interface AutoColorRegion {
  id: number;
  seedX: number;
  seedY: number;
  centroidX: number;
  centroidY: number;
  color: string;
  pixelCount: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  isMultiColor?: boolean;
  palette?: string[];
  strokes: { x: number; y: number }[][];
}

export type StudioEnginePhase =
  | 'import' // Phase 1: Import references
  | 'draw'   // Phase 2: Manual drawing & recording
  | 'replay' // Phase 3: Replay user's drawing
  | 'verify' // Phase 4: Verify drawing against reference
  | 'color'  // Phase 5: Automatic coloring from colored reference
  | 'export'; // Phase 6: Video output

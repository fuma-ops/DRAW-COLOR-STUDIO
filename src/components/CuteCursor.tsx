import React from 'react';
import { BrushType, ColoringMode } from '../types';

interface CuteCursorProps {
  brushType: BrushType;
  coloringMode: ColoringMode;
  color: string;
  brushSize: number;
  isDrawing: boolean;
  visible: boolean;
  x: number;
  y: number;
}

/**
 * Clean & cute digital coloring cursor: "un point avec cercle"
 * Displays an outer sizing circle representing the brush boundary/radius
 * and a crisp center dot marking the exact drawing contact point.
 */
export const CuteCursor: React.FC<CuteCursorProps> = ({
  brushType,
  coloringMode,
  color,
  brushSize,
  isDrawing,
  visible,
  x,
  y,
}) => {
  if (!visible) return null;

  const isEraser = brushType === 'eraser' || coloringMode === 'eraser';
  const effectiveColor = isEraser ? '#FF6B8B' : color;
  const isBucket = coloringMode === 'fill';

  // If bucket fill, show a compact precision targeting circle with center dot
  const displaySize = isBucket ? 22 : Math.max(10, brushSize);

  return (
    <div
      className="pointer-events-none fixed z-50 transition-opacity duration-100 select-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        opacity: visible ? 1 : 0,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 1. Le Cercle (Brush radius / sizing circle) */}
      <div
        className="rounded-full transition-transform duration-75 flex items-center justify-center pointer-events-none relative"
        style={{
          width: `${displaySize}px`,
          height: `${displaySize}px`,
          border: isBucket
            ? '2px dashed rgba(74, 59, 67, 0.75)'
            : '1.5px solid rgba(74, 59, 67, 0.6)',
          boxShadow: isDrawing
            ? `0 0 0 1.5px rgba(255, 255, 255, 0.95), 0 0 10px ${effectiveColor}99`
            : '0 0 0 1px rgba(255, 255, 255, 0.9), 0 1px 3px rgba(0, 0, 0, 0.15)',
          backgroundColor: isDrawing
            ? `${effectiveColor}2b`
            : `${effectiveColor}14`,
          transform: isDrawing ? 'scale(0.96)' : 'scale(1)',
        }}
      >
        {/* 2. Le Point (Center contact dot) */}
        <div
          className="rounded-full border border-white transition-transform duration-75 pointer-events-none"
          style={{
            width: isDrawing ? '6px' : '4px',
            height: isDrawing ? '6px' : '4px',
            backgroundColor: effectiveColor,
            boxShadow: '0 0 0 1px rgba(74, 59, 67, 0.65)',
            transform: isDrawing ? 'scale(1.25)' : 'scale(1)',
          }}
        />
      </div>
    </div>
  );
};

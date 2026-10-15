import React from 'react';
import { EnglishLearningConfig } from '../types';
import { englishVoiceEngine } from '../utils/englishVoiceEngine';

interface EnglishFlashcardOverlayProps {
  config: EnglishLearningConfig;
  currentLetter: string | null;
  currentLetterIndex?: number | null;
  currentElementPhrase?: string | null;
  isDrawingElement?: boolean;
  isCompleted?: boolean;
  isAllCelebrationGlow?: boolean;
  onOpenSettings?: () => void;
  onLetterClick?: (letter: string, index: number) => void;
  completedLetters?: Set<number>;
}

export const EnglishFlashcardOverlay: React.FC<EnglishFlashcardOverlayProps> = ({
  config,
  currentLetter,
  currentLetterIndex,
  currentElementPhrase,
  isDrawingElement,
  isCompleted,
  isAllCelebrationGlow,
  onOpenSettings,
  onLetterClick,
  completedLetters,
}) => {
  if (!config.enabled || !config.showFlashcardOverlay) return null;

  const handleLetterClick = (letter: string, idx: number) => {
    if (onLetterClick) {
      onLetterClick(letter, idx);
      return;
    }
    englishVoiceEngine.speakLetter(letter, {
      lang: config.voiceAccent,
      preferredVoiceName: config.selectedVoiceName || 'Puck',
      rate: config.speechRate,
      pitch: config.speechPitch,
    });
  };

  const isAllGlow = isAllCelebrationGlow || currentLetter === 'ALL';

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none max-w-[94%] transition-all">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 shadow-xl border-2 border-purple-300 flex flex-col items-center gap-1.5 animate-fade-in ring-4 ring-purple-100/60">
        {/* Top Status Badge */}
        <div className="flex items-center justify-between w-full px-1 gap-2 text-[11px] font-black tracking-wide text-purple-900">
          <div className="flex items-center gap-1.5">
            <span className="text-base animate-pulse">🎓</span>
            <span className="uppercase text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
              {config.voiceAccent === 'en-GB' ? '🇬🇧 UK English' : '🇺🇸 US English'}
            </span>
            {isDrawingElement && (
              <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200 animate-pulse font-bold text-[10px]">
                🎨 Coloriage Élément : « {config.objectPhrase || config.targetWord} »
              </span>
            )}
            {isAllGlow ? (
              <span className="text-amber-900 bg-gradient-to-r from-amber-100 via-pink-100 to-purple-100 px-2.5 py-0.5 rounded-full border-2 border-amber-300 font-black text-[10px] flex items-center gap-1.5 shadow-xs animate-bounce">
                <span className="text-sm">🌟</span>
                <span>Toutes les lettres brillent ! Mot magique : <strong>{config.targetWord}</strong> ✨</span>
              </span>
            ) : currentLetter && currentLetter !== 'ALL' ? (
              <span className="text-amber-900 bg-gradient-to-r from-amber-100 via-yellow-50 to-pink-100 px-2.5 py-0.5 rounded-full border-2 border-amber-300 font-black text-[10px] flex items-center gap-1.5 shadow-sm animate-pulse">
                <span className="text-xs">✨</span>
                <span>Lettre qui brille :</span>
                <span className="text-xs font-black text-white bg-gradient-to-r from-amber-500 to-pink-500 px-2 py-0.5 rounded-md shadow-2xs">
                  {currentLetter}
                </span>
                <span>🔊</span>
              </span>
            ) : null}
            {isCompleted && !isAllGlow && !currentLetter && (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-black text-[10px] animate-bounce">
                🎉 Félicitations ! Mot Appris ✨
              </span>
            )}
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-gray-400 hover:text-purple-700 transition-colors text-[10px] font-bold underline"
              title="Modifier le mot et la voix"
            >
              Modifier ✏️
            </button>
          )}
        </div>

        {/* Spelling Letter Tiles with Cute Magical Glowing State */}
        <div className="flex items-center gap-2 sm:gap-2.5 px-1 py-1">
          {config.spellingLetters.map((letter, idx) => {
            const isDone = completedLetters?.has(idx);
            const isCurrent =
              !isAllGlow &&
              (currentLetterIndex !== undefined && currentLetterIndex !== null && currentLetterIndex >= 0
                ? currentLetterIndex === idx
                : currentLetter === letter);
            const isGlowing = isAllGlow || isCurrent;

            return (
              <button
                key={`${letter}-${idx}`}
                onClick={() => handleLetterClick(letter, idx)}
                className={`relative min-w-8 sm:min-w-11 h-9 sm:h-12 px-2 rounded-xl font-black text-base sm:text-xl flex items-center justify-center transition-all cursor-pointer ${
                  isGlowing
                    ? 'bg-gradient-to-t from-amber-400 via-pink-500 to-purple-600 text-white scale-135 -translate-y-1.5 shadow-[0_0_28px_rgba(251,191,36,0.95)] ring-4 ring-amber-300 ring-offset-2 ring-offset-purple-900 z-30 animate-pulse'
                    : isDone || isCompleted
                    ? 'bg-gradient-to-t from-emerald-400 to-teal-500 text-white shadow-xs'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 hover:scale-105'
                }`}
                style={
                  isGlowing
                    ? {
                        textShadow: '0 0 10px rgba(255, 255, 255, 1), 0 0 20px rgba(251, 191, 36, 0.9)',
                      }
                    : undefined
                }
                title={`Lettre ${letter} (cliquez pour colorier & écouter)`}
              >
                {letter}

                {/* Cute Floating Sparkle Badges on Glowing Letter */}
                {isGlowing && (
                  <>
                    <span className="absolute -top-3 -left-1.5 text-xs animate-spin select-none" style={{ animationDuration: '3s' }}>
                      ✨
                    </span>
                    <span className="absolute -top-2.5 -right-1.5 text-xs animate-bounce select-none">
                      🌟
                    </span>
                    <span className="absolute -bottom-2.5 px-1.5 py-0.2 bg-amber-300 text-purple-950 font-black text-[7px] sm:text-[8px] rounded-full shadow-md uppercase tracking-wider whitespace-nowrap">
                      GLOW ✨
                    </span>
                  </>
                )}

                {/* Done badge when not glowing */}
                {isDone && !isGlowing && (
                  <span className="absolute -top-1.5 -right-1 text-[9px] bg-white text-emerald-600 rounded-full w-4 h-4 flex items-center justify-center shadow-xs font-bold border border-emerald-300">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Word Subtitle or Spoken Phrase */}
        <div className="text-[11px] font-bold text-gray-500 text-center truncate max-w-sm">
          {isAllGlow
            ? `🎉 Relecture magique : ${config.targetWord} brille de mille feux ! 🌟`
            : currentLetter && currentLetter !== 'ALL'
            ? `✨ Relecture magique : la lettre « ${currentLetter} » brille pendant l'épellation ! ✨`
            : isDrawingElement
            ? currentElementPhrase || config.objectPhrase
            : config.objectPhrase || `Apprenez : ${config.targetWord}`}
        </div>
      </div>
    </div>
  );
};

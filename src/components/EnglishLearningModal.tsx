import React, { useState, useEffect } from 'react';
import { EnglishLearningConfig } from '../types';
import { englishVoiceEngine } from '../utils/englishVoiceEngine';

interface EnglishLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EnglishLearningConfig;
  onSave: (config: EnglishLearningConfig) => void;
  onStartColoring?: () => void;
}

interface WordPreset {
  emoji: string;
  word: string;
  phrase: string;
  letters: string[];
  celebration: string;
}

const PRESETS: WordPreset[] = [
  {
    emoji: '🍎',
    word: 'APPLE',
    phrase: 'Red Apple! Look at the delicious sweet red apple.',
    letters: ['A', 'P', 'P', 'L', 'E'],
    celebration: 'Hooray! Wonderful job! Look at our beautiful Apple! Bravo little artist!',
  },
  {
    emoji: '🐱',
    word: 'CAT',
    phrase: 'Cute Cat! Look at the playful fluffy cat.',
    letters: ['C', 'A', 'T'],
    celebration: 'Yay! So cute! You colored the sweetest fluffy Cat! You are fantastic!',
  },
  {
    emoji: '☀️',
    word: 'SUN',
    phrase: 'Bright Yellow Sun! The sun shines warmly in the sky.',
    letters: ['S', 'U', 'N'],
    celebration: 'Brilliant superstar! Look at our gorgeous warm Sun shining brightly!',
  },
  {
    emoji: '🍌',
    word: 'BANANA',
    phrase: 'Yellow Banana! A delicious sweet ripe banana.',
    letters: ['B', 'A', 'N', 'A', 'N', 'A'],
    celebration: 'Yummy and amazing! What a lovely sweet Banana! Super proud of you!',
  },
  {
    emoji: '🐶',
    word: 'DOG',
    phrase: 'Friendly Puppy Dog! What a happy loyal dog.',
    letters: ['D', 'O', 'G'],
    celebration: 'Hooray! Adorable puppy! You did such a wonderful job on this cute Dog!',
  },
  {
    emoji: '🚗',
    word: 'CAR',
    phrase: 'Red Car! Vroom vroom, look at the speedy car.',
    letters: ['C', 'A', 'R'],
    celebration: 'Vroom vroom! Bravo! What a splendid shiny red Car! Beautiful masterpiece!',
  },
  {
    emoji: '🌸',
    word: 'FLOWER',
    phrase: 'Pretty Pink Flower! Blooming beautifully in the garden.',
    letters: ['F', 'L', 'O', 'W', 'E', 'R'],
    celebration: 'Magical! You created the most beautiful blooming Flower! Bravo little superstar!',
  },
  {
    emoji: '🦁',
    word: 'LION',
    phrase: 'Brave Golden Lion! The king of the jungle.',
    letters: ['L', 'I', 'O', 'N'],
    celebration: 'Roar! Spectacular! Look at our magnificent brave Lion! You are an amazing artist!',
  },
];

export const EnglishLearningModal: React.FC<EnglishLearningModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onStartColoring,
}) => {
  const [localConfig, setLocalConfig] = useState<EnglishLearningConfig>(config);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [testingLetter, setTestingLetter] = useState<string | null>(null);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    const voices = englishVoiceEngine.getAllVoices();
    setAvailableVoices(voices);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleWordChange = (word: string) => {
    const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, '');
    const letters = cleanWord.split('').filter(l => l.length > 0);
    setLocalConfig(prev => ({
      ...prev,
      targetWord: cleanWord,
      spellingLetters: letters,
    }));
  };

  const handleApplyPreset = (p: WordPreset) => {
    setLocalConfig(prev => ({
      ...prev,
      enabled: true,
      targetWord: p.word,
      objectPhrase: p.phrase,
      spellingLetters: p.letters,
      celebrationPhrase: p.celebration,
    }));
  };

  const handleTestLetter = async (letter: string) => {
    setTestingLetter(letter);
    try {
      await englishVoiceEngine.speakLetter(letter, {
        lang: localConfig.voiceAccent,
        preferredVoiceName: localConfig.selectedVoiceName,
        rate: localConfig.speechRate,
        pitch: localConfig.speechPitch,
      });
    } finally {
      setTestingLetter(null);
    }
  };

  const handleTestFullVoice = async () => {
    setIsTestingVoice(true);
    try {
      await englishVoiceEngine.testVoice(localConfig);
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleSaveAndClose = () => {
    onSave(localConfig);
    onClose();
  };

  const handleSaveAndStart = () => {
    onSave(localConfig);
    onClose();
    if (onStartColoring) {
      onStartColoring();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-purple-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-white/20 rounded-2xl shadow-inner backdrop-blur-sm">🎓</span>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                Mode Anglais : Vocabulaire & Épellation
                <span className="text-[10px] uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-full font-bold">
                  Phonics Kids
                </span>
              </h2>
              <p className="text-xs text-purple-100 font-medium">
                Coloriez l'élément puis épelez le mot lettre par lettre avec prononciation naturelle !
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-gray-800">
          {/* Main Activation Toggle */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-md">
                🔊
              </div>
              <div>
                <div className="font-extrabold text-sm text-purple-950">
                  Activer la Narration & l'Épellation Audio
                </div>
                <div className="text-xs text-purple-700">
                  La voix annonce l'objet (« Red Apple ») puis épelle chaque lettre (« A - P - P - L - E »).
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.enabled}
                onChange={e => setLocalConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
            </label>
          </div>

          {/* Quick Presets Carousel */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>🌟 Modèles Rapides (1-Click Presets)</span>
              <span className="text-[11px] text-purple-600 font-semibold">Cliquez pour appliquer</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.word}
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all border ${
                    localConfig.targetWord === p.word
                      ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-300 shadow-sm scale-105'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                  title={`${p.word}: ${p.phrase}`}
                >
                  <span className="text-2xl mb-1">{p.emoji}</span>
                  <span className="text-[10px] font-black text-gray-800 tracking-tight">{p.word}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Word & Spelling Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Word Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                1. Mot à Apprendre (Target Word)
              </label>
              <input
                type="text"
                value={localConfig.targetWord}
                onChange={e => handleWordChange(e.target.value)}
                placeholder="ex. APPLE, CAT, SUN..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-base font-black tracking-widest uppercase bg-purple-50/30"
              />
              <span className="text-[11px] text-gray-500">
                Génère automatiquement les lettres à épeler.
              </span>
            </div>

            {/* Accent Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                2. Accent de Prononciation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLocalConfig(prev => ({ ...prev, voiceAccent: 'en-US' }))}
                  className={`px-3 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    localConfig.voiceAccent === 'en-US'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>🇺🇸</span>
                  <span>Américain (US)</span>
                </button>
                <button
                  onClick={() => setLocalConfig(prev => ({ ...prev, voiceAccent: 'en-GB' }))}
                  className={`px-3 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    localConfig.voiceAccent === 'en-GB'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>Britannique (UK)</span>
                </button>
              </div>
              <span className="text-[11px] text-gray-500">
                Voix chaleureuse adaptée aux jeunes apprenants.
              </span>
            </div>
          </div>

          {/* Interactive Letter Spelling Chips */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-pink-50 rounded-2xl border border-amber-200">
            <div className="text-xs font-bold text-amber-950 mb-2 flex items-center justify-between">
              <span>🔤 Épellation Lettre par Lettre (Cliquez pour écouter) :</span>
              <span className="text-[11px] text-amber-700 font-semibold">
                {localConfig.spellingLetters.length} lettres
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {localConfig.spellingLetters.map((letter, idx) => (
                <button
                  key={`${letter}-${idx}`}
                  onClick={() => handleTestLetter(letter)}
                  className={`w-10 h-10 rounded-xl font-black text-base flex items-center justify-center transition-all shadow-sm ${
                    testingLetter === letter
                      ? 'bg-pink-500 text-white scale-110 ring-2 ring-pink-300 animate-bounce'
                      : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100 hover:scale-105'
                  }`}
                  title={`Écouter la lettre ${letter}`}
                >
                  {letter}
                </button>
              ))}
              {localConfig.spellingLetters.length === 0 && (
                <span className="text-xs text-gray-400 italic">Entrez un mot ci-dessus pour générer les lettres</span>
              )}
            </div>
          </div>

          {/* What to say while coloring the element */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              3. Phrase à dire pendant le coloriage de l'élément (Object Phrase)
            </label>
            <input
              type="text"
              value={localConfig.objectPhrase}
              onChange={e => setLocalConfig(prev => ({ ...prev, objectPhrase: e.target.value }))}
              placeholder="ex. Red Apple! Look at the delicious red apple."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none text-sm font-medium"
            />
            <span className="text-[11px] text-gray-500">
              Cette phrase sera prononcée au début du coloriage de l'illustration principale.
            </span>
          </div>

          {/* Voice Tuning & Available Voices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-700">
                <span>Vitesse d'élocution (Speech Rate)</span>
                <span className="text-purple-600">{localConfig.speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.65"
                max="1.15"
                step="0.05"
                value={localConfig.speechRate}
                onChange={e => setLocalConfig(prev => ({ ...prev, speechRate: parseFloat(e.target.value) }))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Lente (0.65x)</span>
                <span className="text-purple-600 font-bold">Enfants (0.82x)</span>
                <span>Normale (1.0x)</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>Sélection de la Voix Unique</span>
                <span className="text-[10px] text-purple-600 font-semibold">🎙️ Inclus dans la Vidéo</span>
              </label>
              <select
                value={localConfig.selectedVoiceName || 'Aoede'}
                onChange={e => setLocalConfig(prev => ({ ...prev, selectedVoiceName: e.target.value || 'Aoede' }))}
                className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-xs bg-white font-medium focus:outline-none focus:border-purple-500 text-gray-800"
              >
                <optgroup label="🌸 Voix Féminines & Naturelles (Enregistrées dans la vidéo)">
                  <option value="Aoede">🌸 Aoede (Féminine, Joyeuse, Douce & Naturelle - Recommandé)</option>
                  <option value="Kore">✨ Kore (Lumineuse, Chaleureuse & Féminine)</option>
                  <option value="Zephyr">🍃 Zephyr (Douce, Posée & Pédagogique)</option>
                  <option value="Puck">🌟 Puck (Joyeux & Dynamique)</option>
                  <option value="Fenrir">🐾 Fenrir (Calme & Posé)</option>
                  <option value="Charon">🌙 Charon (Doux & Réconfortant)</option>
                </optgroup>
                {availableVoices.filter(v => v.lang.toLowerCase().startsWith('en')).length > 0 && (
                  <optgroup label="🔊 Voix Système Locale">
                    {availableVoices
                      .filter(v => v.lang.toLowerCase().startsWith('en'))
                      .map(v => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              <span className="text-[10px] text-gray-500">
                Une seule et même voix prononce l'objet, chaque lettre et les félicitations. Elle est 100% enregistrée dans la vidéo !
              </span>
            </div>
          </div>

          {/* Flashcard Overlay Toggle */}
          <div className="flex items-center justify-between p-3 bg-pink-50/60 rounded-xl border border-pink-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎴</span>
              <div>
                <div className="text-xs font-bold text-pink-950">Bannière Flashcard Éducative sur la Toile</div>
                <div className="text-[11px] text-pink-800">
                  Affiche le mot et fait briller chaque lettre en direct pendant le coloriage et dans la vidéo.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={localConfig.showFlashcardOverlay}
              onChange={e => setLocalConfig(prev => ({ ...prev, showFlashcardOverlay: e.target.checked }))}
              className="w-5 h-5 accent-pink-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleTestFullVoice}
            disabled={isTestingVoice}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              isTestingVoice
                ? 'bg-amber-400 text-white animate-pulse'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
            }`}
          >
            <span>{isTestingVoice ? '🔊 Écoute en cours...' : '🔊 Tester la Voix Complète'}</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleSaveAndClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
            >
              Enregistrer
            </button>
            <button
              onClick={handleSaveAndStart}
              className="px-5 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <span>Colorier & Épeler 🎨✨</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

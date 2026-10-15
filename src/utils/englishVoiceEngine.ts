import { EnglishLearningConfig } from '../types';
import { soundEngine } from './audioSynth';

export type VoiceLang = 'en-US' | 'en-GB' | 'fr-FR';

export interface VoiceStateListener {
  (state: { isSpeaking: boolean; currentText: string; activeLetter?: string }): void;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Permanent voice memory (IndexedDB): every narrator line is requested from Gemini ONCE, ever.
 * Re-recording the same tutorial, or another drawing that shares lines (welcome, reactions,
 * finale), costs 0 voice requests. This is what makes the free daily quota go a long way.
 */
const IDB_NAME = 'kid-voice-cache';
const IDB_STORE = 'lines';
function idbOpen(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function idbGet(key: string): Promise<{ audioBase64: string; mimeType: string } | null> {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const r = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function idbPut(key: string, value: { audioBase64: string; mimeType: string }): Promise<void> {
  const db = await idbOpen();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export class EnglishVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<VoiceStateListener> = new Set();
  private currentText = '';
  private activeLetter = '';

  // In-memory Web Audio Buffer cache for zero-latency playback & video recording stream
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private pendingFetches: Map<string, Promise<AudioBuffer | null>> = new Map();
  private activePlaybackStopper: (() => void) | null = null;
  private currentSpeakId = 0;

  /** What kind of voice the server really delivered (so a robotic voice is never a mystery) */
  public voiceReport = { gemini: 0, cached: 0, fallback: 0, failed: 0, lastReason: '', lastModel: '' };
  /** plain-voice audio kept only for this session (never stored as if it were the good voice) */
  private fallbackBuffers: Map<string, AudioBuffer> = new Map();
  public resetVoiceReport() {
    this.voiceReport = { gemini: 0, cached: 0, fallback: 0, failed: 0, lastReason: '', lastModel: '' };
  }

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener({ isSpeaking: this.isSpeaking, currentText: this.currentText, activeLetter: this.activeLetter });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = { isSpeaking: this.isSpeaking, currentText: this.currentText, activeLetter: this.activeLetter };
    this.listeners.forEach(fn => {
      try {
        fn(state);
      } catch {}
    });
  }

  private loadVoices() {
    if (!this.synth) return;
    try {
      this.voices = this.synth.getVoices();
    } catch {}
  }

  public getVoices(lang: VoiceLang = 'en-US'): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    const prefix = lang === 'en-GB' ? 'en-gb' : lang === 'fr-FR' ? 'fr' : 'en-us';
    const matches = this.voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
    if (matches.length > 0) return matches;
    return this.voices.filter(v => v.lang.toLowerCase().startsWith(lang === 'fr-FR' ? 'fr' : 'en'));
  }

  public getAllVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  public findBestVoice(lang: VoiceLang = 'en-US', preferredName?: string): SpeechSynthesisVoice | null {
    const list = this.getVoices(lang);
    if (preferredName) {
      const explicit = this.voices.find(v => v.name.toLowerCase() === preferredName.toLowerCase());
      if (explicit) return explicit;
    }
    if (list.length === 0) {
      return this.voices.find(v => v.lang.toLowerCase().startsWith('en')) || this.voices[0] || null;
    }
    const preferred = list.find(v =>
      /google us english|samantha|victoria|karen|natural|female|teacher/i.test(v.name)
    );
    return preferred || list[0];
  }

  public stop() {
    if (this.activePlaybackStopper) {
      try {
        this.activePlaybackStopper();
      } catch {}
      this.activePlaybackStopper = null;
    }
    soundEngine.stopAllVoiceAudio();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.isSpeaking = false;
    this.currentText = '';
    this.activeLetter = '';
    this.currentUtterance = null;
    this.notify();
  }

  /**
   * Fetches high-fidelity studio voice from /api/tts and decodes into Web Audio AudioBuffer.
   * Caches results so future calls have 0ms latency.
   */
  public async getOrFetchAudioBuffer(
    text: string,
    voiceName: string = 'Puck',
    lang: VoiceLang = 'en-US',
    style?: string,
    retryFallback = false
  ): Promise<AudioBuffer | null> {
    const key = `${voiceName}:${lang}:${style || ''}:${text.trim().toLowerCase()}`;
    if (this.audioBufferCache.has(key)) {
      return this.audioBufferCache.get(key)!;
    }
    // A plain-voice line is reused for playback, but preparing the voice tries Gemini again
    if (!retryFallback && this.fallbackBuffers.has(key)) {
      return this.fallbackBuffers.get(key)!;
    }

    if (this.pendingFetches.has(key)) {
      return this.pendingFetches.get(key)!;
    }

    const decode = async (audioBase64: string, mimeType: string): Promise<AudioBuffer | null> => {
      const arrayBuf = base64ToArrayBuffer(audioBase64);
      const ctx = soundEngine.getAudioContext();
      if (!ctx) return null;
      if (/L16|pcm/i.test(mimeType)) {
        // Gemini TTS can return raw 16-bit mono PCM (no file header): build the buffer by hand
        const rate = Number((/rate=(\d+)/i.exec(mimeType) || [])[1]) || 24000;
        const samples = new Int16Array(arrayBuf, 0, Math.floor(arrayBuf.byteLength / 2));
        const decoded = ctx.createBuffer(1, samples.length, rate);
        const channel = decoded.getChannelData(0);
        for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
        return decoded;
      }
      return ctx.decodeAudioData(arrayBuf);
    };

    const fetchPromise = (async () => {
      try {
        // 1. permanent voice memory: no request at all
        const saved = await idbGet(key);
        if (saved) {
          const buf = await decode(saved.audioBase64, saved.mimeType);
          if (buf) {
            this.audioBufferCache.set(key, buf);
            this.voiceReport.cached++;
            return buf;
          }
        }

        // 2. ask the server
        const resp = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            voiceName,
            lang,
            style,
          }),
        });

        if (!resp.ok) {
          let detail = '';
          try {
            const body = await resp.json();
            detail = String(body.reason || body.error || '');
          } catch {}
          throw new Error(
            resp.status === 404
              ? 'TTS HTTP 404: the /api/tts function is not deployed'
              : `TTS HTTP ${resp.status}${detail ? ': ' + detail : ''}`
          );
        }

        const data = await resp.json();
        const isFallback = data.source === 'fallback';
        if (isFallback) {
          this.voiceReport.fallback++;
          this.voiceReport.lastReason = String(data.reason || 'Gemini voice unavailable');
        } else if (data.audioBase64) {
          this.voiceReport.gemini++;
          this.voiceReport.lastModel = String(data.model || '');
        }
        if (data.audioBase64) {
          const decoded = await decode(data.audioBase64, String(data.mimeType || ''));
          if (decoded) {
            if (isFallback) {
              this.fallbackBuffers.set(key, decoded); // this session only
            } else {
              this.audioBufferCache.set(key, decoded);
              void idbPut(key, { audioBase64: data.audioBase64, mimeType: String(data.mimeType || '') });
            }
            return decoded;
          }
        }
      } catch (err: any) {
        this.voiceReport.failed++;
        this.voiceReport.lastReason = String(err?.message || err);
        console.warn('TTS fetch audio warning (will use audio fallback):', err);
      } finally {
        this.pendingFetches.delete(key);
      }
      return null;
    })();

    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Pre-caches all target words, spelling letters and celebration phrases for a configuration.
   * Ensures instant zero-latency playback when coloring begins.
   */
  public async precacheForConfig(config: EnglishLearningConfig): Promise<void> {
    if (!config.enabled) return;
    const voiceName = config.selectedVoiceName || 'Puck';
    const lang = config.voiceAccent || 'en-US';

    const tasks: Promise<any>[] = [];

    // Pre-cache individual spelling letters A-Z
    for (const letter of config.spellingLetters) {
      const clean = letter.toUpperCase().trim();
      const text = clean.length === 1 ? `${clean}!` : clean;
      tasks.push(this.getOrFetchAudioBuffer(text, voiceName, lang));
    }

    // Pre-cache object phrase
    if (config.objectPhrase) {
      tasks.push(this.getOrFetchAudioBuffer(config.objectPhrase, voiceName, lang));
    }

    // Pre-cache target word
    if (config.targetWord) {
      tasks.push(this.getOrFetchAudioBuffer(`${config.targetWord}!`, voiceName, lang));
      tasks.push(this.getOrFetchAudioBuffer(config.targetWord, voiceName, lang));
    }

    // Pre-cache celebration praise phrase
    const praise =
      config.celebrationPhrase && config.celebrationPhrase.trim()
        ? config.celebrationPhrase.trim()
        : `Hooray! Wonderful job! Look at our beautiful ${config.targetWord}! Bravo little artist!`;
    tasks.push(this.getOrFetchAudioBuffer(praise, voiceName, lang));

    try {
      await Promise.allSettled(tasks);
    } catch {}
  }

  /**
   * Downloads the narrator audio for many lines ahead of time (a few at a time),
   * so the tutorial / video never pauses to wait for a voice and every line is in the recording.
   */
  public async prefetchLines(
    lines: Array<string | { text: string; style?: string }>,
    voiceName: string,
    lang: VoiceLang,
    onProgress?: (done: number, total: number) => void
  ): Promise<void> {
    const seen = new Set<string>();
    const unique: { text: string; style?: string }[] = [];
    for (const l of lines) {
      const item = typeof l === 'string' ? { text: l } : l;
      const text = item.text.trim();
      if (!text) continue;
      const k = `${item.style || ''}|${text}`;
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push({ text, style: item.style });
    }
    let done = 0;
    const queue = [...unique];
    const worker = async () => {
      while (queue.length) {
        const line = queue.shift()!;
        try {
          await this.getOrFetchAudioBuffer(line.text, voiceName, lang, line.style, true);
        } catch {}
        done++;
        if (onProgress) onProgress(done, unique.length);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }

  public isVoiceSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Awaits until active voice completely finishes speaking.
   * Crucial: Prevents advancing to the next letter or stopping the video while speaking.
   */
  public async waitUntilFinished(timeoutMs: number = 15000): Promise<void> {
    if (!this.isSpeaking) return;
    return new Promise(resolve => {
      let timer: any = null;
      const unsub = this.subscribe(state => {
        if (!state.isSpeaking) {
          if (timer) clearTimeout(timer);
          unsub();
          resolve();
        }
      });
      timer = setTimeout(() => {
        unsub();
        resolve();
      }, timeoutMs);
    });
  }

  /**
   * High-level speech articulation method with strict single-voice mutex.
   * Only ONE voice can ever speak at any moment.
   * CRITICAL FOR VIDEO RECORDING:
   * Plays through Web Audio AudioContext (soundEngine) so the voice stream is captured
   * by MediaStreamAudioDestinationNode and embedded directly into the filmed video!
   */
  public async speak(
    text: string,
    options: {
      lang?: VoiceLang;
      preferredVoiceName?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      /** emotion/delivery of the line (storyteller, excited, delighted, dreamy, amazed, celebrate) */
      style?: string;
      activeLetter?: string;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): Promise<void> {
    const clean = text.trim();
    if (!clean) return;

    // Increment speak ID to invalidate any prior pending async fetches
    const mySpeakId = ++this.currentSpeakId;
    this.stop();

    this.isSpeaking = true;
    this.currentText = clean;
    this.activeLetter = options.activeLetter || '';
    this.notify();
    if (options.onStart) options.onStart();

    const voiceName = options.preferredVoiceName || 'Puck';
    const lang = options.lang || 'en-US';

    // 1. Try to fetch/retrieve Web Audio buffer (routes into soundEngine -> recorded in video!)
    let audioBuffer: AudioBuffer | null = null;
    try {
      audioBuffer = await this.getOrFetchAudioBuffer(clean, voiceName, lang, options.style);
    } catch {}

    // Check if superseded while awaiting fetch
    if (mySpeakId !== this.currentSpeakId) {
      return;
    }

    if (audioBuffer) {
      return new Promise(resolve => {
        const playback = soundEngine.playAudioBuffer(
          audioBuffer!,
          options.volume ?? 1.3,
          options.rate ?? 1.0
        );
        this.activePlaybackStopper = playback.stop;

        playback.onended(() => {
          if (mySpeakId === this.currentSpeakId) {
            this.isSpeaking = false;
            this.currentText = '';
            this.activeLetter = '';
            this.activePlaybackStopper = null;
            this.notify();
            if (options.onEnd) options.onEnd();
          }
          resolve();
        });
      });
    }

    // 2. High-quality browser SpeechSynthesis Fallback with Natural Teacher/Child Intonation
    return new Promise(resolve => {
      if (!this.synth) {
        if (mySpeakId === this.currentSpeakId) {
          this.isSpeaking = false;
          this.notify();
          if (options.onEnd) options.onEnd();
        }
        resolve();
        return;
      }

      try {
        const voice = this.findBestVoice(lang, options.preferredVoiceName);
        const utterance = new SpeechSynthesisUtterance(clean);
        if (voice) utterance.voice = voice;
        utterance.lang = lang;
        utterance.rate = Math.max(0.65, Math.min(1.3, options.rate ?? 0.84));
        utterance.pitch = Math.max(0.8, Math.min(1.4, options.pitch ?? 1.15));
        utterance.volume = Math.max(0.1, Math.min(1.0, options.volume ?? 1.0));

        const handleFinish = () => {
          if (mySpeakId === this.currentSpeakId) {
            this.isSpeaking = false;
            this.currentText = '';
            this.activeLetter = '';
            this.currentUtterance = null;
            this.notify();
            if (options.onEnd) options.onEnd();
          }
          resolve();
        };

        utterance.onend = handleFinish;
        utterance.onerror = () => handleFinish();

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
      } catch (err) {
        console.error('Speech synthesis fallback error:', err);
        if (mySpeakId === this.currentSpeakId) {
          this.isSpeaking = false;
          this.notify();
          if (options.onEnd) options.onEnd();
        }
        resolve();
      }
    });
  }

  /**
   * Clearly enunciates an individual letter for spelling practice with natural intonation.
   */
  public async speakLetter(
    letter: string,
    options: {
      lang?: 'en-US' | 'en-GB';
      preferredVoiceName?: string;
      rate?: number;
      pitch?: number;
      mode?: 'letter_name' | 'phonics';
      onEnd?: () => void;
    } = {}
  ): Promise<void> {
    const clean = letter.toUpperCase().trim();
    if (!clean) return;

    // Clearly pronounce the letter (e.g. "A!", "P!") with child-learning upbeat inflection
    const utteranceText = clean.length === 1 ? `${clean}!` : clean;

    await this.speak(utteranceText, {
      ...options,
      activeLetter: clean,
      rate: Math.min(0.88, options.rate || 0.82),
      pitch: options.pitch || 1.16,
    });
  }

  /**
   * Speaks the educational description when coloring the element (e.g. "Red Apple")
   */
  public async speakObjectPhrase(
    phrase: string,
    options: {
      lang?: 'en-US' | 'en-GB';
      preferredVoiceName?: string;
      rate?: number;
      pitch?: number;
      onEnd?: () => void;
    } = {}
  ): Promise<void> {
    await this.speak(phrase, {
      ...options,
      rate: options.rate || 0.84,
      pitch: options.pitch || 1.14,
    });
  }

  /**
   * Final celebration when word is complete:
   * 1. Speaks warm and cute congratulation praise.
   * 2. Repeats the spelling letter-by-letter with cute musical chimes and triggers glowing state on each letter!
   * 3. Pronounces the final complete target word with rainbow celebration chimes!
   */
  public async celebrateWord(
    word: string,
    spelling: string[],
    celebrationText?: string,
    options: {
      lang?: 'en-US' | 'en-GB';
      preferredVoiceName?: string;
      rate?: number;
      pitch?: number;
      onLetterGlow?: (letter: string | null, index: number | null) => void;
      onAllGlow?: () => void;
      onEnd?: () => void;
    } = {}
  ): Promise<void> {
    const praise =
      celebrationText && celebrationText.trim()
        ? celebrationText.trim()
        : `Hooray! Wonderful job! Look at our beautiful ${word}! Bravo little artist!`;

    // Step 1: Speak the warm cute praise first
    if (options.onLetterGlow) {
      options.onLetterGlow(null, null);
    }
    await this.speak(praise, {
      ...options,
      rate: options.rate || 0.88,
      pitch: options.pitch || 1.15,
    });
    await this.waitUntilFinished();
    await new Promise(r => setTimeout(r, 400));

    // Step 2: Repeat the spelling letter by letter — each letter glows while she speaks it!
    for (let i = 0; i < spelling.length; i++) {
      const ltr = spelling[i];
      // Trigger glowing state on this letter!
      if (options.onLetterGlow) {
        options.onLetterGlow(ltr, i);
      }
      soundEngine.playFillSound(true, 'kawaii_marimba');

      // Speak this individual letter clearly
      await this.speakLetter(ltr, {
        lang: options.lang,
        preferredVoiceName: options.preferredVoiceName,
        rate: Math.min(0.85, options.rate || 0.82),
        pitch: (options.pitch || 1.15) * 1.02,
        mode: 'letter_name',
      });
      await this.waitUntilFinished();

      // Hold the cute glow so children and viewers can clearly see it shine!
      await new Promise(r => setTimeout(r, 350));
    }

    // Step 3: Finale — ALL letters glow together with rainbow star chimes, pronounce full word!
    if (options.onAllGlow) {
      options.onAllGlow();
    } else if (options.onLetterGlow) {
      options.onLetterGlow('ALL', -999);
    }
    soundEngine.playCelebrationChime(true);

    await this.speak(`${word}!`, {
      ...options,
      rate: options.rate || 0.88,
      pitch: options.pitch || 1.15,
    });
    await this.waitUntilFinished();
    await new Promise(r => setTimeout(r, 600));

    if (options.onLetterGlow) {
      options.onLetterGlow(null, null);
    }
    if (options.onEnd) {
      options.onEnd();
    }
  }

  /**
   * Test the current voice configuration
   */
  public async testVoice(config: EnglishLearningConfig): Promise<void> {
    const lettersStr = config.spellingLetters.join(', ');
    const testText =
      config.objectPhrase && config.objectPhrase.trim()
        ? `${config.objectPhrase}! Let's spell: ${lettersStr}! ... ${config.targetWord}!`
        : `Let's spell: ${lettersStr}! ... ${config.targetWord}!`;

    await this.speak(testText, {
      lang: config.voiceAccent,
      preferredVoiceName: config.selectedVoiceName,
      rate: config.speechRate,
      pitch: config.speechPitch,
    });
  }
}

export const englishVoiceEngine = new EnglishVoiceEngine();

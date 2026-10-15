import { BrushType, FillSoundPreset } from '../types';

export interface FillSoundOption {
  id: FillSoundPreset;
  name: string;
  emoji: string;
  description: string;
  tag: string;
}

export const FILL_SOUND_PRESETS: FillSoundOption[] = [
  {
    id: 'bubble_sparkle',
    name: 'Bulle & Étoiles',
    emoji: '🫧✨',
    description: "Bulle kawaii moelleuse suivie d'un doux scintillement d'étoiles.",
    tag: 'Préféré des enfants ✨',
  },
  {
    id: 'fairy_harp',
    name: 'Harpe Féérique',
    emoji: '🧚‍♀️✨',
    description: 'Glissando magique de harpe céleste en 5 notes douces et féériques.',
    tag: 'Magique & Enchanteur',
  },
  {
    id: 'kawaii_marimba',
    name: 'Marimba Kawaii',
    emoji: '🐱🎶',
    description: 'Double note boisée toute ronde et moelleuse façon dessin animé.',
    tag: 'Mignon & Moelleux',
  },
  {
    id: 'music_box_celeste',
    name: 'Boîte à Musique Étoilée',
    emoji: '⭐🎀',
    description: 'Arpège cristallin en 3 notes féériques comme une berceuse japonaise.',
    tag: 'Féérique & Rêveur',
  },
  {
    id: 'fairy_dust',
    name: 'Poussière de Fée',
    emoji: '🪄🌟',
    description: "Cascade carillonnée scintillante en clochettes douces digne d'un conte.",
    tag: 'Magique & Joyeux',
  },
  {
    id: 'pastel_bloom',
    name: 'Éclosion Pastel (528 Hz)',
    emoji: '🌸💖',
    description: 'Éclosion marshmallow toute douce avec carillon apaisant Solfeggio 528 Hz.',
    tag: 'Moelleux & Réconfortant',
  },
  {
    id: 'magic_droplet',
    name: 'Goutte de Rosée & Kalimba',
    emoji: '💧🍃',
    description: "Goutte d'eau pure et ronde avec résonance chaleureuse de kalimba.",
    tag: 'Organique & Zen',
  },
  {
    id: 'soft_whisper',
    name: 'Murmure Aquarelle ASMR',
    emoji: '🎨☁️',
    description: "Absorption d'aquarelle ultra-douce sur papier velouté (sans note aiguë).",
    tag: '100% ASMR discret',
  },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private grainBuffer: AudioBuffer | null = null;
  private frictionBuffer: AudioBuffer | null = null;
  private isDrawing = false;

  // Active audio nodes
  private sourceGrain: AudioBufferSourceNode | null = null;
  private sourceFriction: AudioBufferSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private filterHigh: BiquadFilterNode | null = null;
  private filterLow: BiquadFilterNode | null = null;
  private filterResonance: BiquadFilterNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private masterBus: GainNode | null = null;

  // Relaxing Generative Ambient Music Engine
  private isMusicPlaying = false;
  private musicIntervalId: number | null = null;
  private musicMasterGain: GainNode | null = null;
  private musicPreset: 'lofi_chill' | 'music_box' | 'zen_pad' = 'lofi_chill';
  private musicVolume = 0.18;
  private musicBeatIndex = 0;
  private vinylNode: AudioBufferSourceNode | null = null;
  private vinylGain: GainNode | null = null;
  private currentFillPreset: FillSoundPreset = 'bubble_sparkle';

  // Dynamics & Smoothing
  private smoothedSpeed = 0;
  private idleTimeoutId: number | null = null;
  private currentBrush: BrushType = 'marker';
  private soundEnabled = true;
  private activeVoiceNodes: Set<AudioBufferSourceNode> = new Set();

  public getAudioContext(): AudioContext | null {
    this.initContext();
    return this.ctx;
  }

  public playAudioBuffer(
    buffer: AudioBuffer,
    volume: number = 1.0,
    playbackRate: number = 1.0
  ): { stop: () => void; onended: (cb: () => void) => void } {
    this.initContext();
    if (!this.ctx) {
      return { stop: () => {}, onended: () => {} };
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    if (playbackRate && playbackRate >= 0.5 && playbackRate <= 2.0) {
      source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(Math.max(0.1, Math.min(2.0, volume)), this.ctx.currentTime);

    source.connect(gainNode);
    this.connectOutput(gainNode);

    this.activeVoiceNodes.add(source);

    source.start(0);

    const cleanup = () => {
      this.activeVoiceNodes.delete(source);
    };

    let userEndCb: (() => void) | null = null;
    source.onended = () => {
      cleanup();
      if (userEndCb) userEndCb();
    };

    return {
      stop: () => {
        try {
          source.stop();
        } catch {}
        cleanup();
      },
      onended: (cb: () => void) => {
        userEndCb = cb;
      },
    };
  }

  public stopAllVoiceAudio() {
    for (const node of this.activeVoiceNodes) {
      try {
        node.stop();
      } catch {}
    }
    this.activeVoiceNodes.clear();
  }

  public getMediaStreamDestination(): MediaStreamAudioDestinationNode {
    this.initContext();
    if (!this.streamDestination && this.ctx) {
      this.streamDestination = this.ctx.createMediaStreamDestination();
      if (this.masterBus) {
        try {
          this.masterBus.connect(this.streamDestination);
        } catch {}
      }
    }
    return this.streamDestination!;
  }

  private connectOutput(node: AudioNode) {
    this.initContext();
    if (!this.ctx) return;
    try {
      if (this.masterBus) {
        node.connect(this.masterBus);
      } else {
        node.connect(this.ctx.destination);
        if (this.streamDestination) {
          node.connect(this.streamDestination);
        }
      }
    } catch {}
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.generateAuthenticBuffers();
      }
    }
    if (this.ctx) {
      if (!this.masterBus) {
        this.masterBus = this.ctx.createGain();
        this.masterBus.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterBus.connect(this.ctx.destination);
      }
      if (this.streamDestination) {
        try {
          this.masterBus.connect(this.streamDestination);
        } catch {}
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  /**
   * Generates authentic, pure, velvety ASMR paper friction buffers.
   * Completely free of random clicks, spikes, or "tak tak" artifacts.
   */
  private generateAuthenticBuffers() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const duration = 3.5; // 3.5 seconds seamless loop
    const bufferSize = Math.floor(sampleRate * duration);

    // 1. Soft Paper Grain Buffer (warm pink noise)
    const grainBuf = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const grainData = grainBuf.getChannelData(0);

    // 2. Continuous Silky Surface Friction (velvety felt-tip glide)
    const frictionBuf = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const frictionData = frictionBuf.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let brownian = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pure Paul Kellet pink noise algorithm (gentle -3dB/octave slope)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
      b6 = white * 0.115926;

      // Smooth brownian drift for soft fibrous texture (no spikes!)
      brownian = brownian * 0.96 + white * 0.04;

      // Absolutely zero impulses or spikes: pure warm velvety flow
      grainData[i] = pink * 0.65 + brownian * 0.35;
      frictionData[i] = pink * 0.45 + brownian * 0.55;
    }

    // Seamless sinusoidal loop cross-fade at ends (80ms) to ensure ZERO loop seams/clicks
    const fadeSamples = Math.floor(sampleRate * 0.08);
    for (let i = 0; i < fadeSamples; i++) {
      const alpha = Math.sin((i / fadeSamples) * (Math.PI / 2));
      const endIdx = bufferSize - fadeSamples + i;
      grainData[i] = grainData[i] * alpha + grainData[endIdx] * (1 - alpha);
      frictionData[i] = frictionData[i] * alpha + frictionData[endIdx] * (1 - alpha);
    }

    // Zero-edge fade-in at buffer onset (512 samples) to ensure ZERO initial DC transient
    const initialFade = 512;
    for (let i = 0; i < initialFade; i++) {
      const windowMul = 0.5 * (1 - Math.cos((Math.PI * i) / initialFade));
      grainData[i] *= windowMul;
      frictionData[i] *= windowMul;
    }

    this.grainBuffer = grainBuf;
    this.frictionBuffer = frictionBuf;
  }

  /**
   * Initializes acoustic multi-resonance filtering tuned to specific medium.
   */
  private startAudioNodes(brush: BrushType) {
    if (!this.soundEnabled || !this.ctx || !this.grainBuffer || !this.frictionBuffer) return;
    this.cleanupNodes();

    try {
      const now = this.ctx.currentTime;
      const srcGrain = this.ctx.createBufferSource();
      srcGrain.buffer = this.grainBuffer;
      srcGrain.loop = true;

      const srcFriction = this.ctx.createBufferSource();
      srcFriction.buffer = this.frictionBuffer;
      srcFriction.loop = true;

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);

      const filterHigh = this.ctx.createBiquadFilter();
      const filterLow = this.ctx.createBiquadFilter();
      const filterRes = this.ctx.createBiquadFilter();

      // Configure authentic medium characteristics (Ultra-gentle relaxing ASMR)
      switch (brush) {
        case 'marker': {
          filterHigh.type = 'bandpass';
          filterHigh.frequency.setValueAtTime(1100, now);
          filterHigh.Q.setValueAtTime(0.8, now);
          filterRes.type = 'peaking';
          filterRes.frequency.setValueAtTime(850, now);
          filterRes.gain.setValueAtTime(1.2, now);
          filterRes.Q.setValueAtTime(0.7, now);
          filterLow.type = 'lowpass';
          filterLow.frequency.setValueAtTime(1800, now);
          filterLow.Q.setValueAtTime(0.5, now);
          break;
        }
        case 'pencil':
        case 'colored_pencil': {
          filterHigh.type = 'bandpass';
          filterHigh.frequency.setValueAtTime(1600, now);
          filterHigh.Q.setValueAtTime(0.9, now);
          filterRes.type = 'peaking';
          filterRes.frequency.setValueAtTime(2100, now);
          filterRes.gain.setValueAtTime(1.2, now);
          filterRes.Q.setValueAtTime(0.8, now);
          filterLow.type = 'lowpass';
          filterLow.frequency.setValueAtTime(2600, now);
          filterLow.Q.setValueAtTime(0.5, now);
          break;
        }
        case 'crayon': {
          filterHigh.type = 'lowpass';
          filterHigh.frequency.setValueAtTime(850, now);
          filterHigh.Q.setValueAtTime(0.7, now);
          filterRes.type = 'peaking';
          filterRes.frequency.setValueAtTime(500, now);
          filterRes.gain.setValueAtTime(1.5, now);
          filterRes.Q.setValueAtTime(0.8, now);
          filterLow.type = 'lowshelf';
          filterLow.frequency.setValueAtTime(220, now);
          filterLow.gain.setValueAtTime(1.5, now);
          break;
        }
        case 'watercolor': {
          filterHigh.type = 'lowpass';
          filterHigh.frequency.setValueAtTime(500, now);
          filterHigh.Q.setValueAtTime(0.6, now);
          filterRes.type = 'peaking';
          filterRes.frequency.setValueAtTime(340, now);
          filterRes.gain.setValueAtTime(1.2, now);
          filterRes.Q.setValueAtTime(0.7, now);
          filterLow.type = 'lowpass';
          filterLow.frequency.setValueAtTime(750, now);
          filterLow.Q.setValueAtTime(0.5, now);
          break;
        }
        default: {
          filterHigh.type = 'bandpass';
          filterHigh.frequency.setValueAtTime(1150, now);
          filterHigh.Q.setValueAtTime(0.85, now);
          filterRes.type = 'peaking';
          filterRes.frequency.setValueAtTime(900, now);
          filterRes.gain.setValueAtTime(1.2, now);
          filterRes.Q.setValueAtTime(0.7, now);
          filterLow.type = 'lowpass';
          filterLow.frequency.setValueAtTime(1900, now);
          filterLow.Q.setValueAtTime(0.5, now);
          break;
        }
      }

      // Connect Audio Graph
      srcGrain.connect(filterHigh);
      srcFriction.connect(filterRes);
      filterHigh.connect(filterLow);
      filterRes.connect(filterLow);
      filterLow.connect(master);
      this.connectOutput(master);

      srcGrain.start();
      srcFriction.start();

      this.sourceGrain = srcGrain;
      this.sourceFriction = srcFriction;
      this.masterGain = master;
      this.filterHigh = filterHigh;
      this.filterLow = filterLow;
      this.filterResonance = filterRes;
    } catch {
      // AudioContext policy handled
    }
  }

  public startStroke(brush: BrushType, enabled: boolean) {
    this.soundEnabled = enabled;
    this.currentBrush = brush;
    this.isDrawing = true;
    this.smoothedSpeed = 0.35;
    if (!enabled) return;

    this.initContext();
    if (!this.ctx) return;

    if (this.idleTimeoutId !== null) {
      window.clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }

    let baseGain = 0.075;
    if (brush === 'marker') baseGain = 0.085;
    if (brush === 'pencil' || brush === 'colored_pencil') baseGain = 0.080;
    if (brush === 'crayon') baseGain = 0.090;
    if (brush === 'watercolor') baseGain = 0.070;

    const now = this.ctx.currentTime;
    // Reuse existing nodes if already running
    if (!this.sourceGrain || !this.masterGain) {
      this.startAudioNodes(brush);
      if (this.masterGain) {
        this.masterGain.gain.setValueAtTime(0.0001, now);
        this.masterGain.gain.linearRampToValueAtTime(baseGain, now + 0.014);
      }
      return;
    }

    // Nodes already active: smoothly transition gain with zero transient or click
    if (this.masterGain) {
      const currentVal = Math.max(0, this.masterGain.gain.value);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(currentVal, now);
      this.masterGain.gain.linearRampToValueAtTime(baseGain, now + 0.014);
    }
  }

  /**
   * Synchronize sound velocity with natural movement speed
   * Modulates gain, pitch and friction cutoff in real-time (<15ms response)
   */
  public onBrushMove(velocity: number, brush: BrushType, enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled || !this.isDrawing) return;

    this.initContext();
    if (!this.ctx) return;

    if (!this.sourceGrain || !this.masterGain) {
      this.startAudioNodes(brush);
    }

    if (!this.masterGain || !this.ctx) return;

    const now = this.ctx.currentTime;
    const clampedVelocity = Math.min(Math.max(velocity, 0.05), 1.6);
    this.smoothedSpeed = this.smoothedSpeed * 0.75 + clampedVelocity * 0.25;
    const speedRatio = Math.min(1.0, this.smoothedSpeed);

    let baseGain = 0.075;
    let baseFreq = 1100;
    if (brush === 'marker') {
      baseGain = 0.085;
      baseFreq = 1100;
    } else if (brush === 'pencil' || brush === 'colored_pencil') {
      baseGain = 0.080;
      baseFreq = 1600;
    } else if (brush === 'crayon') {
      baseGain = 0.090;
      baseFreq = 850;
    } else if (brush === 'watercolor') {
      baseGain = 0.070;
      baseFreq = 520;
    }

    const targetGain = baseGain * (0.35 + 0.65 * speedRatio);
    this.masterGain.gain.setTargetAtTime(targetGain, now, 0.018);

    // Modulate filter frequency with speed for realistic paper friction sensation
    if (this.filterHigh) {
      const targetFreq = baseFreq + baseFreq * 0.35 * speedRatio;
      this.filterHigh.frequency.setTargetAtTime(targetFreq, now, 0.022);
    }
  }

  /**
   * Gentle volume dip between continuous strokes of the same element
   */
  public dipStroke() {
    if (!this.masterGain || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const currentVal = Math.max(0, this.masterGain.gain.value);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(currentVal, now);
      this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.015);
    } catch {}
  }

  public stopStroke() {
    this.isDrawing = false;
    if (!this.masterGain || !this.ctx) {
      return;
    }
    try {
      const now = this.ctx.currentTime;
      const currentVal = Math.max(0, this.masterGain.gain.value);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(currentVal, now);
      this.masterGain.gain.linearRampToValueAtTime(0.00001, now + 0.018);
      if (this.idleTimeoutId !== null) {
        window.clearTimeout(this.idleTimeoutId);
      }
      this.idleTimeoutId = window.setTimeout(() => {
        if (!this.isDrawing) {
          this.cleanupNodes();
        }
      }, 2500);
    } catch {
      this.cleanupNodes();
    }
  }

  private cleanupNodes() {
    if (this.idleTimeoutId !== null) {
      window.clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
    if (this.sourceGrain) {
      try {
        this.sourceGrain.stop();
        this.sourceGrain.disconnect();
      } catch {}
      this.sourceGrain = null;
    }
    if (this.sourceFriction) {
      try {
        this.sourceFriction.stop();
        this.sourceFriction.disconnect();
      } catch {}
      this.sourceFriction = null;
    }
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }
    if (this.filterHigh) {
      try {
        this.filterHigh.disconnect();
      } catch {}
      this.filterHigh = null;
    }
    if (this.filterLow) {
      try {
        this.filterLow.disconnect();
      } catch {}
      this.filterLow = null;
    }
    if (this.filterResonance) {
      try {
        this.filterResonance.disconnect();
      } catch {}
      this.filterResonance = null;
    }
  }

  public setFillSoundPreset(preset: FillSoundPreset) {
    this.currentFillPreset = preset;
  }

  public getFillSoundPreset(): FillSoundPreset {
    return this.currentFillPreset;
  }

  /**
   * Delightful, cute, gentle and relaxing sound effects for auto-fill (remplissage) loved by kids!
   */
  public playFillSound(enabled = true, presetOverride?: FillSoundPreset) {
    if (!enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const preset = presetOverride || this.currentFillPreset;
      switch (preset) {
        case 'bubble_sparkle':
          this.playBubbleSparkle(now);
          break;
        case 'fairy_harp':
          this.playFairyHarp(now);
          break;
        case 'kawaii_marimba':
          this.playKawaiiMarimba(now);
          break;
        case 'magic_droplet':
          this.playMagicDroplet(now);
          break;
        case 'music_box_celeste':
          this.playMusicBoxCeleste(now);
          break;
        case 'pastel_bloom':
          this.playPastelBloom(now);
          break;
        case 'fairy_dust':
          this.playFairyDust(now);
          break;
        case 'soft_whisper':
          this.playSoftWhisper(now);
          break;
        default:
          this.playBubbleSparkle(now);
      }
    } catch {}
  }

  /**
   * 1. PRESET: Bulle & Étoiles (Bubble Bloop & Music Box Sparkle)
   */
  private playBubbleSparkle(now: number) {
    if (!this.ctx) return;
    const bubbleOsc = this.ctx.createOscillator();
    const bubbleGain = this.ctx.createGain();
    const bubbleFilter = this.ctx.createBiquadFilter();
    bubbleFilter.type = 'lowpass';
    bubbleFilter.frequency.setValueAtTime(1100, now);

    bubbleOsc.type = 'sine';
    bubbleOsc.frequency.setValueAtTime(360, now);
    bubbleOsc.frequency.exponentialRampToValueAtTime(520, now + 0.07);

    bubbleGain.gain.setValueAtTime(0.0001, now);
    bubbleGain.gain.linearRampToValueAtTime(0.022, now + 0.02);
    bubbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    bubbleOsc.connect(bubbleFilter);
    bubbleFilter.connect(bubbleGain);
    this.connectOutput(bubbleGain);

    bubbleOsc.start(now);
    bubbleOsc.stop(now + 0.12);

    // Star sparkle notes
    const sparkleNotes = [1046.5, 1318.5, 1568.0];
    sparkleNotes.forEach((freq, idx) => {
      const noteTime = now + 0.045 + idx * 0.042;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.015, noteTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.28);

      osc.connect(gain);
      this.connectOutput(gain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.30);
    });
  }

  /**
   * 2. PRESET: Harpe Féérique (Magical Ascending Harp Glissando)
   */
  private playFairyHarp(now: number) {
    if (!this.ctx) return;
    const harpNotes = [523.25, 659.25, 783.99, 987.77, 1046.50];
    harpNotes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.038;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = idx === 4 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.018, noteTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      this.connectOutput(gain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.40);
    });
  }

  /**
   * 3. PRESET: Marimba Kawaii (Warm Wooden Double Chime)
   */
  private playKawaiiMarimba(now: number) {
    if (!this.ctx) return;
    const marimbaNotes = [
      { freq: 698.46, delay: 0.0, amp: 0.024 }, // F5
      { freq: 1046.50, delay: 0.045, amp: 0.020 }, // C6
      { freq: 349.23, delay: 0.0, amp: 0.008 },
    ];
    marimbaNotes.forEach(item => {
      const noteTime = now + item.delay;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(item.freq, noteTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(item.amp, noteTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      this.connectOutput(gain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.34);
    });
  }

  /**
   * 4. PRESET: Goutte de Rosée & Kalimba
   */
  private playMagicDroplet(now: number) {
    if (!this.ctx) return;
    const dropOsc = this.ctx.createOscillator();
    const dropGain = this.ctx.createGain();
    const dropFilter = this.ctx.createBiquadFilter();
    dropFilter.type = 'lowpass';
    dropFilter.frequency.setValueAtTime(950, now);

    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(460, now);
    dropOsc.frequency.exponentialRampToValueAtTime(540, now + 0.06);

    dropGain.gain.setValueAtTime(0.0001, now);
    dropGain.gain.linearRampToValueAtTime(0.022, now + 0.018);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

    dropOsc.connect(dropFilter);
    dropFilter.connect(dropGain);
    this.connectOutput(dropGain);

    dropOsc.start(now);
    dropOsc.stop(now + 0.10);

    const kalimbaFreqs = [880.0, 1318.5];
    kalimbaFreqs.forEach((freq, idx) => {
      const noteTime = now + 0.035;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, noteTime);

      const amp = idx === 0 ? 0.020 : 0.009;
      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(amp, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.42);

      osc.connect(filter);
      filter.connect(gain);
      this.connectOutput(gain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });
  }

  /**
   * 5. PRESET: Boîte à Musique Étoilée
   */
  private playMusicBoxCeleste(now: number) {
    if (!this.ctx) return;
    const notes = [1318.5, 1760.0, 2093.0];
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.052;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.018, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      this.connectOutput(gain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.40);
    });
  }

  /**
   * 6. PRESET: Éclosion Pastel (528 Hz Solfeggio & Warm Bloom)
   */
  private playPastelBloom(now: number) {
    if (!this.ctx) return;
    const bloomOsc = this.ctx.createOscillator();
    const bloomGain = this.ctx.createGain();
    const bloomFilter = this.ctx.createBiquadFilter();
    bloomFilter.type = 'lowpass';
    bloomFilter.frequency.setValueAtTime(650, now);

    bloomOsc.type = 'sine';
    bloomOsc.frequency.setValueAtTime(320, now);
    bloomOsc.frequency.exponentialRampToValueAtTime(420, now + 0.06);

    bloomGain.gain.setValueAtTime(0.0001, now);
    bloomGain.gain.linearRampToValueAtTime(0.020, now + 0.018);
    bloomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    bloomOsc.connect(bloomFilter);
    bloomFilter.connect(bloomGain);
    this.connectOutput(bloomGain);

    bloomOsc.start(now);
    bloomOsc.stop(now + 0.10);

    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(528.0, now + 0.025);
    bellGain.gain.setValueAtTime(0.0001, now + 0.025);
    bellGain.gain.linearRampToValueAtTime(0.020, now + 0.025 + 0.022);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025 + 0.52);

    bellOsc.connect(bellGain);
    this.connectOutput(bellGain);
    bellOsc.start(now + 0.025);
    bellOsc.stop(now + 0.55);
  }

  /**
   * 7. PRESET: Poussière de Fée (Fairy Dust Glockenspiel)
   */
  private playFairyDust(now: number) {
    if (!this.ctx) return;
    const cascade = [783.99, 1046.5, 1318.5, 1568.0];
    cascade.forEach((freq, idx) => {
      const noteTime = now + idx * 0.032;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.016, noteTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.26);

      osc.connect(gain);
      this.connectOutput(gain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.28);
    });
  }

  /**
   * 8. PRESET: Murmure Aquarelle ASMR (Pure Velvety Absorption)
   */
  private playSoftWhisper(now: number) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.sin(t * Math.PI);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.022;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.Q.setValueAtTime(0.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.004, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);

    noise.connect(filter);
    filter.connect(gain);
    this.connectOutput(gain);
    noise.start(now);
    noise.stop(now + 0.18);
  }

  public playCelebrationChime(enabled: boolean) {
    if (!enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.035, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.7);
        osc.connect(gain);
        this.connectOutput(gain);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.75);
      });
    } catch {}
  }

  public playToolSwitchSound(_tool?: 'marker' | 'pencil' | 'stylus') {
    // Intentionally silent: zero clicks or pops
  }

  public startRelaxingMusic(
    preset: 'lofi_chill' | 'music_box' | 'zen_pad' = 'lofi_chill',
    volume = 0.18
  ) {
    this.initContext();
    if (!this.ctx) return;
    this.musicPreset = preset;
    this.musicVolume = Math.max(0.02, Math.min(0.4, volume));

    if (this.isMusicPlaying) {
      if (this.musicMasterGain) {
        const now = this.ctx.currentTime;
        this.musicMasterGain.gain.setTargetAtTime(this.musicVolume, now, 0.5);
      }
      return;
    }

    this.isMusicPlaying = true;
    this.musicBeatIndex = 0;
    const now = this.ctx.currentTime;

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(this.musicVolume, now + 2.0);
    this.connectOutput(masterGain);
    this.musicMasterGain = masterGain;

    this.startVinylBed(masterGain);

    const beatDurationMs = 938;
    this.playRelaxingBar();

    this.musicIntervalId = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx) return;
      this.musicBeatIndex++;
      if (this.musicBeatIndex % 4 === 0) {
        this.playRelaxingBar();
      } else if (this.musicBeatIndex % 2 === 0) {
        this.playMelodyAccent();
      }
    }, beatDurationMs);
  }

  public setMusicPreset(preset: 'lofi_chill' | 'music_box' | 'zen_pad') {
    this.musicPreset = preset;
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(0.5, volume));
    if (this.musicMasterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicMasterGain.gain.setTargetAtTime(this.musicVolume, now, 0.2);
    }
  }

  public stopRelaxingMusic() {
    if (!this.isMusicPlaying) return;
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.ctx && this.musicMasterGain) {
      const now = this.ctx.currentTime;
      this.musicMasterGain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
    }
    setTimeout(() => {
      try {
        if (this.vinylNode) {
          this.vinylNode.stop();
          this.vinylNode.disconnect();
          this.vinylNode = null;
        }
        if (this.musicMasterGain) {
          this.musicMasterGain.disconnect();
          this.musicMasterGain = null;
        }
      } catch {}
    }, 1300);
  }

  public startLofiAmbience(volume = 0.16) {
    this.startRelaxingMusic('lofi_chill', volume);
  }

  public stopLofiAmbience() {
    this.stopRelaxingMusic();
  }

  private startVinylBed(destination: GainNode) {
    if (!this.ctx) return;
    try {
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = sampleRate * 3;
      const buf = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.94 + white * 0.06;
        const pop = Math.random() < 0.0008 ? (Math.random() - 0.5) * 0.4 : 0;
        data[i] = (last * 0.6 + pop) * 0.04;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      src.start();

      this.vinylNode = src;
      this.vinylGain = gain;
    } catch {}
  }

  private playRelaxingBar() {
    if (!this.ctx || !this.musicMasterGain) return;
    const barNumber = Math.floor(this.musicBeatIndex / 4);

    const chordsLofi = [
      [130.81, 196.0, 246.94, 293.66, 329.63],
      [110.0, 164.81, 196.0, 261.63, 329.63],
      [87.31, 130.81, 220.0, 261.63, 329.63],
      [98.0, 174.61, 246.94, 329.63, 392.0],
    ];

    const chordsMusicBox = [
      [261.63, 329.63, 392.0, 523.25],
      [220.0, 261.63, 329.63, 440.0],
      [174.61, 220.0, 261.63, 349.23],
      [196.0, 246.94, 293.66, 392.0],
    ];

    const chordsZen = [
      [110.0, 164.81, 220.0, 329.63],
      [130.81, 196.0, 261.63, 392.0],
      [87.31, 130.81, 174.61, 261.63],
      [98.0, 146.83, 196.0, 293.66],
    ];

    let chordList = chordsLofi;
    if (this.musicPreset === 'music_box') chordList = chordsMusicBox;
    if (this.musicPreset === 'zen_pad') chordList = chordsZen;

    const currentChord = chordList[barNumber % chordList.length];
    const now = this.ctx.currentTime;

    currentChord.forEach((freq, noteIdx) => {
      const noteTime = now + noteIdx * 0.032;
      this.synthesizeNote(freq, noteTime, this.musicPreset);
    });

    this.synthesizePadVoice(currentChord[0], currentChord[2] || currentChord[1], now);
  }

  private synthesizeNote(
    freq: number,
    startTime: number,
    preset: 'lofi_chill' | 'music_box' | 'zen_pad'
  ) {
    if (!this.ctx || !this.musicMasterGain) return;
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      if (preset === 'music_box') {
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, startTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, startTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(0.05, startTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicMasterGain);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + 1.7);
        osc2.stop(startTime + 1.7);
      } else {
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, startTime);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq, startTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(880, startTime);
        filter.Q.setValueAtTime(0.6, startTime);

        const duration = 3.2;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(0.042, startTime + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.008, startTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicMasterGain);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration + 0.1);
        osc2.stop(startTime + duration + 0.1);
      }
    } catch {}
  }

  private synthesizePadVoice(rootFreq: number, _fifthFreq: number, startTime: number) {
    if (!this.ctx || !this.musicMasterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(rootFreq * 0.5, startTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, startTime);

      const padDuration = 3.6;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.024, startTime + 1.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + padDuration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicMasterGain);

      osc.start(startTime);
      osc.stop(startTime + padDuration + 0.1);
    } catch {}
  }

  private playMelodyAccent() {
    if (!this.ctx || !this.musicMasterGain) return;
    try {
      const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const randomFreq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(randomFreq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.022, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicMasterGain);

      osc.start(now);
      osc.stop(now + 1.5);
    } catch {}
  }
}

export const soundEngine = new SoundEngine();

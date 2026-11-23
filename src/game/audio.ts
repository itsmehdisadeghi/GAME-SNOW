/**
 * Procedural Web Audio synthesizer for Hearthplow.
 * Zero external audio files — generates cozy pentatonic/Lydian synth chimes,
 * modulated snow-scrape noise, steam surge blasts, ice shatters, and hearth chords.
 */

// Warm D-major pentatonic + Lydian extensions (Hz)
const PENTATONIC_SCALE = [
  293.66, // D4
  329.63, // E4
  369.99, // F#4
  440.0,  // A4
  493.88, // B4
  587.33, // D5
  659.25, // E5
  739.99, // F#5
  880.0,  // A5
  987.77, // B5
  1174.66,// D6
];

export class SynthAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scrapeGain: GainNode | null = null;
  private scrapeFilter: BiquadFilterNode | null = null;
  private muted = false;
  private lastSnowNoteAt = 0;
  private noteStep = 0;

  public unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.42;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Continuous soft filtered-noise snow scrape loop (starts silent)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink-ish soft snow hiss
        output[i] = (lastOut + 0.14 * white) / 1.14;
        lastOut = output[i];
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 620;
      filter.Q.value = 1.3;

      const scrapeGain = ctx.createGain();
      scrapeGain.gain.value = 0;

      noiseSrc.connect(filter);
      filter.connect(scrapeGain);
      scrapeGain.connect(master);
      noiseSrc.start();

      this.scrapeFilter = filter;
      this.scrapeGain = scrapeGain;
    } catch {
      // Headless or blocked audio context — fail silently
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.03);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setScrapeIntensity(speedRatio: number, plowingActive: boolean): void {
    if (!this.ctx || !this.scrapeGain || !this.scrapeFilter) return;
    const now = this.ctx.currentTime;
    const targetGain = this.muted
      ? 0
      : plowingActive
        ? Math.min(0.22, 0.04 + speedRatio * 0.18)
        : Math.min(0.04, speedRatio * 0.03);
    const targetFreq = plowingActive ? 540 + speedRatio * 560 : 320 + speedRatio * 200;
    this.scrapeGain.gain.setTargetAtTime(targetGain, now, 0.05);
    this.scrapeFilter.frequency.setTargetAtTime(targetFreq, now, 0.06);
  }

  public silenceLoops(): void {
    if (!this.ctx || !this.scrapeGain) return;
    this.scrapeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
  }

  /** Cozy pentatonic kalimba-like pluck scaled by live combo multiplier */
  public playSnowPluck(comboMultiplier: number, isGolden = false): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSnowNoteAt < 0.075 && !isGolden) return;
    this.lastSnowNoteAt = now;

    const baseIdx = Math.min(PENTATONIC_SCALE.length - 1, Math.floor(comboMultiplier * 0.75) + (this.noteStep % 4));
    this.noteStep++;
    const jitter = 0.985 + Math.random() * 0.03;
    const freq = PENTATONIC_SCALE[baseIdx] * jitter * (isGolden ? 1.5 : 1);

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGolden ? 'triangle' : 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    const peak = isGolden ? 0.18 : 0.11;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGolden ? 0.34 : 0.2));

    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.value = isGolden ? 0.32 : 0.16;

    osc.connect(gain);
    osc2.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.36);
    osc2.stop(now + 0.36);
  }

  /** Punchy steam whoosh + warm sub thump for Spacebar Steam Boost */
  public playSteamBoost(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Sub thump
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(145, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.24);
    subGain.gain.setValueAtTime(0.32, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.28);

    // Filtered steam hiss burst
    const len = Math.floor(this.ctx.sampleRate * 0.45);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.4));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(520, now + 0.42);
    filter.Q.value = 0.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    src.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    src.start(now);
  }

  /** Crystalline ice shatter chime */
  public playIceShatter(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [1174.66, 1479.98, 1760.0];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.025;
      osc.frequency.setValueAtTime(freq * (0.97 + Math.random() * 0.06), t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  /** Subtle dull thud when bumping unbroken ice */
  public playIceBump(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Radiant warm chord when banking snow into a Thermal Grate or rescuing a Cottage */
  public playWarmChord(kind: 'melt' | 'cottage' | 'victory'): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const chords: Record<'melt' | 'cottage' | 'victory', number[]> = {
      melt: [293.66, 440.0, 587.33, 739.99], // Dmaj7 warmth
      cottage: [293.66, 369.99, 440.0, 587.33, 659.25], // Dadd9 hearth bloom
      victory: [293.66, 369.99, 440.0, 587.33, 739.99, 880.0], // Radiant victory fanfare
    };
    const notes = chords[kind];
    const spacing = kind === 'victory' ? 0.075 : 0.055;
    const sustain = kind === 'victory' ? 0.85 : 0.55;

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const t = now + i * spacing;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.13, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + sustain);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + sustain + 0.04);
    });
  }

  /** Cozy chime when purchasing a garage upgrade */
  public playUpgradeChime(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  public playDuskChime(): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [440.0, 369.99, 329.63, 293.66].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.54);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.scrapeGain = null;
      this.scrapeFilter = null;
    }
  }
}

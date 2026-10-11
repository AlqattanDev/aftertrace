export type AudioCue =
  | 'tap'
  | 'perfect'
  | 'good'
  | 'miss'
  | 'clue'
  | 'empty'
  | 'switch'
  | 'win'
  | 'step';

type Voice = { oscillator: OscillatorNode; envelope: GainNode };
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Small, original sound effects. No audio context exists before unlock(). */
export class AudioDirector {
  unlocked = false;
  muted: boolean;

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly voices = new Set<Voice>();
  private readonly lastPlay = new Map<AudioCue, number>();
  private paused = false;
  private disposed = false;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  /** Call only from a click, tap or key gesture. Unsupported audio stays silent. */
  unlock(): void {
    if (this.disposed || typeof window === 'undefined') return;

    if (!this.context) {
      const Constructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!Constructor) return;
      try {
        const context = new Constructor({ latencyHint: 'interactive' });
        const master = context.createGain();
        master.gain.value = this.muted ? 0 : 0.26;
        master.connect(context.destination);
        this.context = context;
        this.master = master;
        this.unlocked = true;
      } catch {
        // Sound is optional; blocked or unavailable audio must not block play.
        return;
      }
    }

    if (!this.paused) this.resumeContext();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.context || !this.master) return;
    try {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setValueAtTime(muted ? 0 : 0.26, this.context.currentTime);
    } catch {
      // A context may have been closed by the browser.
    }
    if (muted) this.stopVoices();
    else if (!this.paused) this.resumeContext();
  }

  play(name: AudioCue): void {
    const context = this.context;
    if (this.disposed || this.paused || this.muted || !this.unlocked || !context || context.state !== 'running') return;

    const last = this.lastPlay.get(name) ?? -Infinity;
    const gap = name === 'step' ? 0.12 : name === 'win' ? 0.3 : 0.035;
    if (context.currentTime - last < gap) return;
    this.lastPlay.set(name, context.currentTime);

    try {
      switch (name) {
        case 'tap':
          this.wood(740, 0, 0.055, 0.3);
          break;
        case 'step':
          this.wood(215, 0, 0.055, 0.13);
          break;
        case 'perfect':
          this.bell(659.25, 0, 0.2, 0.36);
          this.bell(987.77, 0.07, 0.3, 0.3);
          break;
        case 'good':
          this.wood(523.25, 0, 0.12, 0.34);
          this.bell(659.25, 0.065, 0.21, 0.23);
          break;
        case 'miss':
          this.tone(220, 0, 0.14, 0.25, 'triangle', 164.81);
          break;
        case 'clue':
          this.bell(523.25, 0, 0.2, 0.27);
          this.bell(659.25, 0.075, 0.23, 0.28);
          this.bell(783.99, 0.15, 0.37, 0.3);
          break;
        case 'empty':
          this.wood(349.23, 0, 0.075, 0.2);
          this.wood(293.66, 0.07, 0.085, 0.16);
          break;
        case 'switch':
          this.bell(392, 0, 0.22, 0.22);
          this.bell(523.25, 0.085, 0.25, 0.25);
          this.bell(659.25, 0.17, 0.32, 0.23);
          break;
        case 'win':
          [523.25, 659.25, 783.99, 1046.5].forEach((pitch, index) => {
            this.bell(pitch, index * 0.095, index === 3 ? 0.6 : 0.33, 0.3);
          });
          this.tone(261.63, 0.285, 0.5, 0.18, 'sine');
          this.tone(392, 0.285, 0.5, 0.12, 'sine');
          break;
      }
    } catch {
      // Device interruption and exhausted audio resources fail silently.
    }
  }

  suspend(): void {
    this.paused = true;
    this.stopVoices();
    if (!this.context || this.context.state === 'closed') return;
    try {
      void this.context.suspend().catch(() => undefined);
    } catch {
      // Browser lifecycle transitions are best effort.
    }
  }

  resume(): void {
    this.paused = false;
    if (!this.muted) this.resumeContext();
  }

  dispose(): void {
    this.disposed = true;
    this.unlocked = false;
    this.stopVoices();
    this.master?.disconnect();
    if (this.context && this.context.state !== 'closed') {
      try {
        void this.context.close().catch(() => undefined);
      } catch {
        // Context cleanup must remain safe after a browser interruption.
      }
    }
    this.context = null;
    this.master = null;
    this.lastPlay.clear();
  }

  private resumeContext(): void {
    if (!this.context || this.disposed || this.context.state === 'closed') return;
    try {
      void this.context.resume().catch(() => undefined);
    } catch {
      // A later user gesture can retry a browser-blocked resume.
    }
  }

  private wood(frequency: number, delay: number, duration: number, volume: number): void {
    this.tone(frequency, delay, duration, volume, 'sine', frequency * 0.76);
    this.tone(frequency * 2.7, delay, duration * 0.5, volume * 0.18, 'sine');
  }

  private bell(frequency: number, delay: number, duration: number, volume: number): void {
    this.tone(frequency, delay, duration, volume, 'sine');
    this.tone(frequency * 2, delay, duration * 0.5, volume * 0.15, 'sine');
  }

  private tone(frequency: number, delay: number, duration: number, volume: number, wave: OscillatorType, endFrequency?: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.voices.size >= 32) return;

    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const voice = { oscillator, envelope };
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this.voices.delete(voice);
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
  }

  private stopVoices(): void {
    for (const { oscillator, envelope } of this.voices) {
      try {
        oscillator.stop();
      } catch {
        // A note may already have ended.
      }
      oscillator.disconnect();
      envelope.disconnect();
    }
    this.voices.clear();
  }
}

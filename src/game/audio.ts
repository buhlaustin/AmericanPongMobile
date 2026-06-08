type SoundId = 'hit' | 'score' | 'win' | 'lose' | 'powerup' | 'serve' | 'combo' | 'shield' | 'menu';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.35;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(id: SoundId): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = this.volume;

    switch (id) {
      case 'hit':
        this.tone(ctx, gain, 320, 0.06, 'square', now, 0.08);
        break;
      case 'score':
        this.tone(ctx, gain, 520, 0.12, 'sine', now, 0.15);
        this.tone(ctx, gain, 680, 0.1, 'sine', now + 0.08, 0.12);
        break;
      case 'win':
        [440, 554, 659, 880].forEach((f, i) => this.tone(ctx, gain, f, 0.15, 'sine', now + i * 0.12, 0.2));
        break;
      case 'lose':
        [330, 262, 196].forEach((f, i) => this.tone(ctx, gain, f, 0.18, 'triangle', now + i * 0.15, 0.22));
        break;
      case 'powerup':
        this.tone(ctx, gain, 600, 0.08, 'sine', now, 0.1);
        this.tone(ctx, gain, 900, 0.1, 'sine', now + 0.06, 0.12);
        break;
      case 'serve':
        this.tone(ctx, gain, 240, 0.05, 'triangle', now, 0.06);
        break;
      case 'combo':
        this.tone(ctx, gain, 500 + Math.random() * 200, 0.05, 'sine', now, 0.07);
        break;
      case 'shield':
        this.tone(ctx, gain, 180, 0.1, 'sawtooth', now, 0.12);
        break;
      case 'menu':
        this.tone(ctx, gain, 400, 0.04, 'sine', now, 0.05);
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    gain: GainNode,
    freq: number,
    attack: number,
    type: OscillatorType,
    start: number,
    duration: number,
  ): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(gain);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(this.volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}

export const audio = new AudioManager();

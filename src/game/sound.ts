// Sound effects using Web Audio API - Enhanced Version
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterGain: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getDestination(): AudioNode {
    this.getContext();
    return this.masterGain!;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  playStoneDrop() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      // Wood knock sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 + Math.random() * 200, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.06);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.08);

      // Click noise
      const bufferSize = ctx.sampleRate * 0.02;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.05, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 3000;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(now);
    } catch (e) { /* ignore */ }
  }

  playCapture() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      // Sparkle sound
      const notes = [880, 1100, 1320, 1760];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.08, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.15);
      });
    } catch (e) { /* ignore */ }
  }

  playExtraTurn() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      // Rising chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.setValueAtTime(0.1, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) { /* ignore */ }
  }

  playGameOver(win: boolean) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      if (win) {
        // Victory fanfare
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0.1, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.4);
        });
      } else {
        // Defeat sound
        const notes = [400, 350, 300, 250];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.04, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 800;
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(dest);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.25);
        });
      }
    } catch (e) { /* ignore */ }
  }

  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) { /* ignore */ }
  }
}

export const soundEngine = new SoundEngine();

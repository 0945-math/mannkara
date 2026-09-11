// Enhanced Sound Engine with multiple variations
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterGain: GainNode | null = null;
  private stoneDropCount = 0;

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

      // Vary the sound slightly for each drop
      this.stoneDropCount++;
      const variation = (this.stoneDropCount % 5) * 0.1;

      // Wood knock sound with variation
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(500 + variation * 200 + Math.random() * 100, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.07);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800 + variation * 400, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.07);

      gain.gain.setValueAtTime(0.18 + variation * 0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.09);

      // Click noise
      const bufferSize = ctx.sampleRate * 0.025;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.08));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.04, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 2800 + variation * 300;
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

      // Sparkle sound with multiple harmonics
      const notes = [880, 1100, 1320, 1760, 2200];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.07, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.12);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.12);
      });

      // Add a shimmer effect
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(3000, now);
      shimmer.frequency.exponentialRampToValueAtTime(4000, now + 0.3);
      shimmerGain.gain.setValueAtTime(0.03, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(dest);
      shimmer.start(now);
      shimmer.stop(now + 0.3);
    } catch (e) { /* ignore */ }
  }

  playExtraTurn() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      // Rising chime with harmonics
      const baseFreq = 440;
      [1, 1.5, 2, 2.5].forEach((mult, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * mult * 2, now + 0.15);
        gain.gain.setValueAtTime(0.08 / (i + 1), now);
        gain.gain.setValueAtTime(0.08 / (i + 1), now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.25);
      });
    } catch (e) { /* ignore */ }
  }

  playGameOver(win: boolean) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      if (win) {
        // Victory fanfare with rich harmonics
        const notes = [523, 659, 784, 1047, 1319, 1568];
        notes.forEach((freq, i) => {
          // Main tone
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.1, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.5);

          // Harmonic
          const harm = ctx.createOscillator();
          const harmGain = ctx.createGain();
          harm.type = 'triangle';
          harm.frequency.setValueAtTime(freq * 2, now + i * 0.08);
          harmGain.gain.setValueAtTime(0.03, now + i * 0.08);
          harmGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
          harm.connect(harmGain);
          harmGain.connect(dest);
          harm.start(now + i * 0.08);
          harm.stop(now + i * 0.08 + 0.4);
        });
      } else {
        // Defeat sound with descending tones
        const notes = [400, 350, 300, 250, 200];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0.04, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 600;
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(dest);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.3);
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
      osc.frequency.setValueAtTime(450, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) { /* ignore */ }
  }

  playHint() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      // Gentle hint sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) { /* ignore */ }
  }
}

export const soundEngine = new SoundEngine();

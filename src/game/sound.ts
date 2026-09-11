// Ultra-enhanced Sound Engine with rich harmonics and variations
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterGain: GainNode | null = null;
  private stoneDropCount = 0;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
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

      this.stoneDropCount++;
      const variation = (this.stoneDropCount % 7) * 0.08;
      const baseFreq = 450 + variation * 150 + Math.random() * 80;

      // Primary tone - wood knock
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter1 = ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + 0.08);

      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(2000 + variation * 300, now);
      filter1.frequency.exponentialRampToValueAtTime(500, now + 0.08);
      filter1.Q.value = 2;

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(dest);
      osc1.start(now);
      osc1.stop(now + 0.1);

      // Secondary harmonic
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2, now);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.06);
      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc2.connect(gain2);
      gain2.connect(dest);
      osc2.start(now);
      osc2.stop(now + 0.06);

      // Noise burst for impact
      const bufferSize = ctx.sampleRate * 0.03;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.05, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 3000 + variation * 200;
      noiseFilter.Q.value = 3;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(now);

      // Resonance
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(baseFreq * 0.5, now + 0.02);
      gain3.gain.setValueAtTime(0, now);
      gain3.gain.linearRampToValueAtTime(0.04, now + 0.02);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc3.connect(gain3);
      gain3.connect(dest);
      osc3.start(now);
      osc3.stop(now + 0.12);
    } catch (e) { /* ignore */ }
  }

  playCapture() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      // Rich sparkle with multiple harmonics
      const fundamentals = [880, 1100, 1320, 1760, 2200, 2640];
      fundamentals.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.06 / (i + 1), now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.15);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.15);
      });

      // Shimmer effect
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(3500, now);
      shimmer.frequency.exponentialRampToValueAtTime(5000, now + 0.4);
      shimmerGain.gain.setValueAtTime(0.03, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(dest);
      shimmer.start(now);
      shimmer.stop(now + 0.4);

      // Impact
      const impact = ctx.createOscillator();
      const impactGain = ctx.createGain();
      impact.type = 'sine';
      impact.frequency.setValueAtTime(200, now);
      impact.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      impactGain.gain.setValueAtTime(0.1, now);
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      impact.connect(impactGain);
      impactGain.connect(dest);
      impact.start(now);
      impact.stop(now + 0.1);
    } catch (e) { /* ignore */ }
  }

  playExtraTurn() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      // Rising chime with rich harmonics
      const baseFreq = 440;
      const multipliers = [1, 1.25, 1.5, 2, 2.5, 3];
      multipliers.forEach((mult, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * mult * 2.5, now + 0.2);
        gain.gain.setValueAtTime(0.07 / (i + 1), now);
        gain.gain.setValueAtTime(0.07 / (i + 1), now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.3);
      });

      // Sparkle tail
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000 + i * 500, now + 0.1 + i * 0.03);
        gain.gain.setValueAtTime(0.02, now + 0.1 + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + i * 0.03 + 0.08);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + 0.1 + i * 0.03);
        osc.stop(now + 0.1 + i * 0.03 + 0.08);
      }
    } catch (e) { /* ignore */ }
  }

  playGameOver(win: boolean) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      if (win) {
        // Majestic victory fanfare
        const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
        notes.forEach((freq, i) => {
          // Main tone
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.07);
          gain.gain.setValueAtTime(0.12, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.6);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.6);

          // Harmonic
          const harm = ctx.createOscillator();
          const harmGain = ctx.createGain();
          harm.type = 'triangle';
          harm.frequency.setValueAtTime(freq * 2, now + i * 0.07);
          harmGain.gain.setValueAtTime(0.04, now + i * 0.07);
          harmGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.5);
          harm.connect(harmGain);
          harmGain.connect(dest);
          harm.start(now + i * 0.07);
          harm.stop(now + i * 0.07 + 0.5);

          // Sub harmonic
          if (i % 2 === 0) {
            const sub = ctx.createOscillator();
            const subGain = ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(freq * 0.5, now + i * 0.07);
            subGain.gain.setValueAtTime(0.03, now + i * 0.07);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.4);
            sub.connect(subGain);
            subGain.connect(dest);
            sub.start(now + i * 0.07);
            sub.stop(now + i * 0.07 + 0.4);
          }
        });

        // Final chord
        const chordFreqs = [1047, 1319, 1568];
        chordFreqs.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + notes.length * 0.07);
          gain.gain.setValueAtTime(0.08, now + notes.length * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + notes.length * 0.07 + 1);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(now + notes.length * 0.07);
          osc.stop(now + notes.length * 0.07 + 1);
        });
      } else {
        // Somber defeat
        const notes = [400, 350, 300, 250, 200, 150];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.05, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 500;
          filter.Q.value = 1;
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(dest);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.4);
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
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) { /* ignore */ }
  }

  playHint() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const dest = this.getDestination();
      const now = ctx.currentTime;

      // Gentle ascending hint
      const notes = [660, 880, 1100];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.07, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.15);
      });
    } catch (e) { /* ignore */ }
  }
}

export const soundEngine = new SoundEngine();

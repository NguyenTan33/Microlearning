// Web Audio API ambient wind and subtle interaction sounds
class SoundService {
  private ctx: AudioContext | null = null;
  private windGain: GainNode | null = null;
  private isPlayingWind = false;
  private windSource: AudioBufferSourceNode | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Generate realistic soothing wind breeze
  public toggleWind(on?: boolean): boolean {
    this.initCtx();
    if (!this.ctx) return false;

    const targetState = on !== undefined ? on : !this.isPlayingWind;

    if (targetState) {
      if (this.isPlayingWind) return true;

      // 5 seconds noise buffer
      const bufferSize = this.ctx.sampleRate * 5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;

      // Pink-ish noise generation for smooth air breeze
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Dual Low-pass filter for wind muffled body
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      // Low frequency oscillator for wind swell/gust
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // 5 sec per gust
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
      lfo.connect(filter.frequency);
      lfo.start();

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 2); // gentle fade in

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
      this.windSource = noise;
      this.windGain = gain;
      this.isPlayingWind = true;
      return true;
    } else {
      if (!this.isPlayingWind) return false;
      if (this.windGain && this.ctx) {
        this.windGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1);
        setTimeout(() => {
          try {
            this.windSource?.stop();
          } catch {
            // ignore
          }
          this.windSource = null;
          this.windGain = null;
        }, 1000);
      }
      this.isPlayingWind = false;
      return false;
    }
  }

  // Play a gentle military medal/chime click on button tap
  public playClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // ignore
    }
  }

  public getIsPlayingWind(): boolean {
    return this.isPlayingWind;
  }
}

export const soundService = new SoundService();

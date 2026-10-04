// Stereo soundtrack, separate persistent buses and short contextual feedback.
import { haptics } from "./haptics";
import { APP_BUILD_ID } from "./build";
import { audioLevel, loadAudioPreferences, storeAudioPreferences } from "./audioPreferences";
interface MusicTrack { title: string; file: string; seconds: number; }

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private currentTrack: string | null = null;
  private source: AudioBufferSourceNode | null = null;
  private sourceGain: GainNode | null = null;
  private catalog: Promise<Record<string, MusicTrack>> | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private decodeQueue: Promise<void> = Promise.resolve();
  private request = 0;
  private loading = false;
  private unlocked = false;
  private lifecycleMuted = false;
  private preferences = loadAudioPreferences();
  private lastTextTick = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private effects = new Set<AudioScheduledSourceNode>();
  trackTitle = "NESSUNA TRACCIA";
  get enabled(): boolean { return this.preferences.enabled; }
  set enabled(value: boolean) { this.preferences.enabled = value; if (!value) this.stopEffects(); this.applyMix(); }
  get mix() { return { ...this.preferences }; }
  get musicState(): "off" | "loading" | "playing" | "idle" {
    return !this.enabled || !this.preferences.music ? "off" : this.loading ? "loading" : this.source ? "playing" : "idle";
  }
  setVolume(channel: "music" | "effects", value: number): void {
    this.preferences[channel] = audioLevel(value, this.preferences[channel]);
    storeAudioPreferences(this.preferences); if (channel === "effects" && !this.preferences.effects) this.stopEffects(); this.applyMix();
    if (channel === "music") this.restartIfNeeded();
  }
  private applyMix(): void {
    if (!this.ctx || !this.master || !this.musicGain || !this.effectsGain) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.enabled ? .55 : 0, now, .01);
    this.musicGain.gain.setTargetAtTime(this.preferences.music / 100 * .36, now, .02);
    this.effectsGain.gain.setTargetAtTime(this.preferences.effects / 100, now, .01);
    if (!this.enabled || !this.preferences.music) this.fadeMusic();
  }
  private ensure(): AudioContext | null {
    if (!this.unlocked || this.lifecycleMuted || !this.enabled || (!this.preferences.music && !this.preferences.effects)) return null;
    if (!this.ctx || this.ctx.state === "closed") {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 8;
        limiter.attack.value = .003; limiter.release.value = .15;
        this.master.connect(limiter); limiter.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
        this.effectsGain = this.ctx.createGain(); this.effectsGain.connect(this.master);
        this.applyMix();
      } catch { return null; }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }
  footstep(surface:'dirt'|'sand'|'wet'|'grass'|'wood'|'stone'):void {
    if(surface==='wet'){this.noise(.045,.025,1800);this.tone(180,.035,{vol:.014,sweepTo:90});}
    else if(surface==='wood')this.tone(135,.035,{vol:.023,type:'triangle',sweepTo:80});
    else if(surface==='stone')this.tone(300,.025,{vol:.02,type:'triangle',sweepTo:140});
    else this.noise(.035,surface==='grass'?.012:.02,surface==='sand'?700:1100);
  }
  unlock(): void { this.unlocked = true; this.ensure(); this.restartIfNeeded(); }
  toggle(): boolean {
    this.enabled = !this.enabled; storeAudioPreferences(this.preferences);
    this.restartIfNeeded(); return this.enabled;
  }

  private tone(
    freq: number,
    durSec: number,
    opts?: { type?: OscillatorType; vol?: number; sweepTo?: number; delaySec?: number; dest?: AudioNode }
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled || !this.preferences.effects || this.lifecycleMuted || freq <= 0) {
      return;
    }
    const start = ctx.currentTime + (opts?.delaySec ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts?.type ?? "sine";
    osc.frequency.setValueAtTime(freq, start);
    if (opts?.sweepTo) {
      osc.frequency.linearRampToValueAtTime(opts.sweepTo, start + durSec);
    }
    const vol = opts?.vol ?? 0.1;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + Math.min(.004, durSec / 4));
    gain.gain.exponentialRampToValueAtTime(0.001, start + durSec);
    osc.connect(gain);
    gain.connect(opts?.dest ?? this.effectsGain!);
    this.effects.add(osc); osc.start(start);
    osc.stop(start + durSec + 0.02);
    osc.onended = () => { this.effects.delete(osc); osc.disconnect(); gain.disconnect(); };
  }

  // ---- Effetti ----
  cursor(): void {
    this.tone(720, 0.035, { vol: 0.075, type: "triangle" });
    haptics.tap();
  }
  confirm(): void {
    this.tone(880, 0.075, { vol: 0.09, type: "triangle" });
    this.tone(1320, 0.09, { vol: 0.065, delaySec: .045 });
    haptics.confirm();
  }
  cancel(): void {
    this.tone(440, 0.09, { vol: 0.085, sweepTo: 330, type: "triangle" });
    haptics.cancel();
  }
  hit(): void {
    this.noise(.09, .12, 1300);
    this.tone(150, .12, { sweepTo: 65, vol: .13 });
    haptics.hit();
  }
  hitSuper(): void {
    this.noise(.16, .18, 2200);
    this.tone(190, .22, { sweepTo: 45, vol: .17 });
    haptics.hitSuper();
  }
  hitWeak(): void {
    this.tone(620, .055, { vol: .065, type: "triangle" });
  }
  faint(): void {
    this.tone(294, 0.35, { sweepTo: 80, vol: 0.14 });
    haptics.faint();
  }
  ballThrow(): void {
    this.tone(320, 0.18, { sweepTo: 980, vol: 0.1 });
  }
  ballShake(): void {
    this.tone(190, 0.07, { vol: 0.12 });
  }
  run(): void {
    this.tone(500, 0.2, { sweepTo: 1400, vol: 0.09 });
  }
  heal(): void {
    [587, 740, 880, 1175].forEach((f, i) => this.tone(f, 0.12, { delaySec: i * 0.09, vol: 0.09 }));
  }
  catchJingle(): void {
    [659, 880, 1109, 1319].forEach((f, i) => this.tone(f, 0.16, { delaySec: i * 0.13, vol: 0.1 }));
    haptics.catch();
  }
  levelUp(): void {
    [587, 740, 880, 1175, 880, 1480].forEach((f, i) => this.tone(f, 0.1, { delaySec: i * 0.08, vol: 0.09 }));
    haptics.levelUp();
  }
  victory(): void {
    const seq = [392, 587, 740, 880, 784, 1175];
    seq.forEach((f, i) => this.tone(f, i === seq.length - 1 ? 0.4 : 0.11, { delaySec: i * 0.12, vol: 0.1 }));
  }
  encounterSting(): void {
    [440, 466, 660, 698, 880].forEach((f, i) => this.tone(f, 0.07, { delaySec: i * 0.07, vol: 0.1 }));
    haptics.alert();
  }

  // ---- Jingle distinti (prima usavano tutti catchJingle/victory) ----
  // Evoluzione: arpeggio ascendente "magico" con code luccicanti (triangle).
  evolveJingle(): void {
    [440, 659, 880, 1109, 1319].forEach((f, i) =>
      this.tone(f, 0.22, { delaySec: i * 0.12, vol: 0.09, type: "triangle" })
    );
    this.tone(1760, 0.4, { delaySec: 0.62, vol: 0.08, type: "triangle" });
    haptics.levelUp();
  }
  // Medaglia: fanfara trionfale a tre squilli, "da premiazione".
  badgeFanfare(): void {
    const seq = [440, 587, 740, 880, 740, 1175, 1480];
    seq.forEach((f, i) =>
      this.tone(f, i === seq.length - 1 ? 0.55 : 0.13, { delaySec: i * 0.13, vol: 0.11 })
    );
    // Basso solenne sotto la fanfara.
    [147, 185, 220].forEach((f, i) => this.tone(f, 0.4, { delaySec: i * 0.18, vol: 0.09, type: "triangle" }));
    haptics.levelUp();
  }
  // Vincita alle slot: campanella "jackpot" veloce e brillante.
  slotWin(): void {
    [1175, 1480, 1760, 1480, 2349].forEach((f, i) =>
      this.tone(f, 0.1, { delaySec: i * 0.08, vol: 0.1 })
    );
    haptics.catch();
  }

  // ---- SFX meccaniche (cue brevi per feedback di sistema) ----
  // Abilità che "respinge" (TEFLON/LODO/POLTRONA/GARANZIA): sweep verso l'alto,
  // sensazione di scudo/scivolamento.
  abilityBlock(): void {
    this.tone(520, 0.16, { sweepTo: 1040, vol: 0.09, type: "triangle" });
  }
  // Hold item difensivo (GILET PARA): tonfo secco protettivo.
  holdGuard(): void {
    this.noise(.065, .085, 700); this.tone(130, .08, { sweepTo: 90, vol: .09 });
  }
  // Hold item di cura a fine turno (CAFFETTIERA): gorgoglio caldo salente.
  holdBrew(): void {
    [330, 440, 554].forEach((f, i) => this.tone(f, 0.1, { delaySec: i * 0.06, vol: 0.07, type: "triangle" }));
  }
  // Crisi di governo: sirena breve e cupa, "allarme istituzionale".
  crisis(): void {
    this.tone(300, 0.28, { sweepTo: 150, vol: 0.12 });
    this.tone(220, 0.28, { sweepTo: 110, vol: 0.1, delaySec: 0.14 });
    haptics.cancel();
  }
  // Stop di un rullo del casinò: clunk meccanico.
  reelStop(): void {
    this.tone(320, 0.05, { sweepTo: 180, vol: 0.1, type: "square" });
  }
  // Tick del typewriter dei dialoghi: cursore lievissimo, senza haptics
  // (chiamato spesso, non deve vibrare a raffica).
  textTick(): void {
    const now = this.ctx?.currentTime ?? 0;
    if (now - this.lastTextTick < .035) return;
    this.lastTextTick = now; this.tone(1100, .012, { vol: .018 });
  }

  // Cue elettorali volutamente brevi e a volume basso: restano sotto i dialoghi.
  districtGain(): void {
    [659, 784, 988].forEach((f, i) => this.tone(f, 0.08, { delaySec: i * 0.055, vol: 0.035, type: "triangle" }));
  }

  districtLoss(): void {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.09, { delaySec: i * 0.06, vol: 0.035, type: "triangle" }));
  }

  private noise(duration: number, volume: number, cutoff: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.effectsGain || !this.enabled || !this.preferences.effects) return;
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .25), ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0); let seed = 731;
      for (let i = 0; i < data.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = seed / 2147483648 - 1; }
    }
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noiseBuffer; filter.type = "lowpass"; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.effectsGain);
    this.effects.add(source); source.start(); source.stop(ctx.currentTime + duration);
    source.onended = () => { this.effects.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  // New playback is requested only after a gesture. Decode one loop at a time;
  // the two-entry LRU bounds memory, while stale requests cannot start a track.
  playMusic(name: string | null): void {
    if (this.currentTrack !== name) {
      this.request++; this.loading = false; this.fadeMusic(); this.currentTrack = name;
      this.trackTitle = name ? "REGIA IN CARICAMENTO" : "NESSUNA TRACCIA";
    }
    this.restartIfNeeded();
  }
  private restartIfNeeded(): void {
    if (this.unlocked && !this.lifecycleMuted && this.enabled && this.preferences.music && this.currentTrack && !this.source && !this.loading) void this.startTrack();
  }
  private async startTrack(): Promise<void> {
    const name = this.currentTrack, ctx = this.ensure(); if (!name || !ctx || !this.musicGain) return;
    const token = ++this.request; this.loading = true;
    const url = (path: string) => `${import.meta.env.BASE_URL}${path}?v=${APP_BUILD_ID}`;
    try {
      this.catalog ??= fetch(url("audio/catalog.json")).then(r => { if (!r.ok) throw Error("Music catalog unavailable"); return r.json(); }).catch(e => { this.catalog = null; throw e; });
      const track = (await this.catalog)[name]; if (token !== this.request) return; if (!track) throw Error("Unknown music track");
      let buffer = this.buffers.get(name);
      if (!buffer) {
        const response = await fetch(url(track.file)); if (!response.ok) throw Error("Music unavailable");
        const bytes = await response.arrayBuffer();
        const decoding = this.decodeQueue.then(() => token === this.request && ctx === this.ctx ? ctx.decodeAudioData(bytes) : null);
        this.decodeQueue = decoding.then(() => undefined, () => undefined);
        buffer = (await decoding) ?? undefined; if (!buffer) return;
      }
      if (token !== this.request || ctx !== this.ctx || this.lifecycleMuted || !this.enabled || !this.preferences.music) return;
      this.buffers.delete(name); this.buffers.set(name, buffer);
      while (this.buffers.size > 2) this.buffers.delete(this.buffers.keys().next().value!);
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = buffer; source.loop = true; source.loopEnd = Math.min(buffer.duration, track.seconds);
      gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(1, ctx.currentTime + .18);
      source.connect(gain); gain.connect(this.musicGain); source.start();
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      this.source = source; this.sourceGain = gain; this.trackTitle = track.title;
    } catch { if (token === this.request) this.trackTitle = "TRACCIA NON DISPONIBILE"; }
    finally { if (token === this.request) this.loading = false; }
  }
  private fadeMusic(): void {
    const source = this.source, gain = this.sourceGain, ctx = this.ctx;
    this.source = null; this.sourceGain = null;
    if (!source || !gain || !ctx) return;
    gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.setTargetAtTime(0, ctx.currentTime, .04);
    try { source.stop(ctx.currentTime + .18); } catch { /* Source already ended during teardown. */ }
  }
  private stopEffects(): void {
    for (const source of this.effects) { try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); }
    this.effects.clear();
  }
  stopMusic(): void { this.request++; this.loading = false; this.fadeMusic(); this.currentTrack = null; this.trackTitle = "NESSUNA TRACCIA"; }
  pauseForLifecycle(): void {
    this.lifecycleMuted = true; this.stopEffects(); this.request++; this.loading = false; this.fadeMusic();
    void this.ctx?.suspend().catch(() => undefined);
  }
  resumeForLifecycle(): void { this.lifecycleMuted = false; this.restartIfNeeded(); }
  destroy(): void {
    this.pauseForLifecycle();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null; this.master = null; this.musicGain = null; this.effectsGain = null; this.noiseBuffer = null;
    this.buffers.clear();
  }
}
export const audio = new AudioEngine();

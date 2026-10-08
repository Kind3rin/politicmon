// Stereo soundtrack, separate persistent buses and short contextual feedback.
import { haptics } from "./haptics";
import { APP_BUILD_ID } from "./build";
import { audioLevel, loadAudioPreferences, storeAudioPreferences } from "./audioPreferences";
interface MusicTrack { title: string; file: string; seconds: number; }

/** One tone voice: an oscillator (optionally doubled a few cents apart), a percussive envelope and an optional low-pass sweep. */
interface ToneOpts {
  type?: OscillatorType; vol?: number; sweepTo?: number; delaySec?: number; dest?: AudioNode;
  /** Seconds to reach full level; short for clicks, longer for soft pads. */
  attack?: number;
  /** Cents of a second oscillator that beats against the first: the width of a chime or a bell. */
  detune?: number;
  /** Low-pass cutoff that starts at filterFrom and closes to filterTo while the note plays. */
  filterFrom?: number; filterTo?: number; q?: number;
  /** -1 left, 1 right. */
  pan?: number;
  /** Share of the voice sent to the room reverb. */
  reverb?: number;
}
/** One noise burst: a shared white-noise loop through a filter that can sweep. */
interface NoiseOpts {
  delaySec?: number; type?: BiquadFilterType; q?: number; sweepTo?: number;
  pan?: number; reverb?: number; dest?: AudioNode;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private reverbIn: GainNode | null = null;
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
  private noiseCursor = 0;
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
        // Effects share one small room: a convolver fed by the voices that ask for reverb, returned to the effects bus.
        this.reverbIn = this.ctx.createGain();
        const convolver = this.ctx.createConvolver(); convolver.buffer = this.roomImpulse(this.ctx);
        const reverbOut = this.ctx.createGain(); reverbOut.gain.value = .8;
        this.reverbIn.connect(convolver); convolver.connect(reverbOut); reverbOut.connect(this.effectsGain);
        this.applyMix();
      } catch { return null; }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }
  /** A short stereo room: noise that loses its highs as it decays, after a 12 ms pre-delay. Built once per context. */
  private roomImpulse(ctx: BaseAudioContext): AudioBuffer {
    const seconds = 1.1, length = Math.round(ctx.sampleRate * seconds), pre = Math.round(ctx.sampleRate * .012);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    let seed = 9176;
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel); let smooth = 0;
      for (let i = pre; i < length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const x = seed / 2147483648 - 1, t = (i - pre) / (length - pre);
        smooth += (.62 - .5 * t) * (x - smooth);
        data[i] = smooth * Math.pow(1 - t, 2.4);
      }
    }
    return buffer;
  }
  footstep(surface:'dirt'|'sand'|'wet'|'grass'|'wood'|'stone'):void {
    if(surface==='wet'){this.noise(.045,.025,1800);this.tone(180,.035,{vol:.014,sweepTo:90,filterTo:700});}
    else if(surface==='wood')this.tone(135,.035,{vol:.023,type:'triangle',sweepTo:80});
    else if(surface==='stone')this.tone(300,.025,{vol:.02,type:'triangle',sweepTo:140});
    else this.noise(.035,surface==='grass'?.012:.02,surface==='sand'?700:1100);
  }
  unlock(): void { this.unlocked = true; this.ensure(); this.restartIfNeeded(); }
  toggle(): boolean {
    this.enabled = !this.enabled; storeAudioPreferences(this.preferences);
    this.restartIfNeeded(); return this.enabled;
  }

  /** Sends a voice to the effects bus: optional pan, then an optional send to the room. Returns the extra nodes to release when it ends. */
  private route(ctx: BaseAudioContext, from: AudioNode, opts: { pan?: number; reverb?: number; dest?: AudioNode }): AudioNode[] {
    const used: AudioNode[] = []; let out: AudioNode = from;
    if (opts.pan) {
      const panner = ctx.createStereoPanner(); panner.pan.value = opts.pan;
      out.connect(panner); out = panner; used.push(panner);
    }
    out.connect(opts.dest ?? this.effectsGain!);
    if (opts.reverb && this.reverbIn) {
      const send = ctx.createGain(); send.gain.value = opts.reverb;
      out.connect(send); send.connect(this.reverbIn); used.push(send);
    }
    return used;
  }

  private tone(freq: number, durSec: number, opts?: ToneOpts): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled || !this.preferences.effects || this.lifecycleMuted || freq <= 0) {
      return;
    }
    const start = ctx.currentTime + (opts?.delaySec ?? 0);
    // A doubled voice is quieter per oscillator, so the pair does not sum into a harsh peak.
    const vol = (opts?.vol ?? .1) * (opts?.detune ? .72 : 1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + Math.min(opts?.attack ?? .004, durSec / 4));
    gain.gain.exponentialRampToValueAtTime(0.001, start + durSec);
    let filter: BiquadFilterNode | null = null;
    if (opts?.filterFrom || opts?.filterTo) {
      filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.Q.value = opts.q ?? .7;
      filter.frequency.setValueAtTime(opts.filterFrom ?? opts.filterTo!, start);
      if (opts.filterTo) filter.frequency.exponentialRampToValueAtTime(opts.filterTo, start + durSec);
      filter.connect(gain);
    }
    const input: AudioNode = filter ?? gain;
    const oscillators: OscillatorNode[] = [];
    for (const cents of opts?.detune ? [0, opts.detune] : [0]) {
      const osc = ctx.createOscillator();
      osc.type = opts?.type ?? "sine";
      osc.frequency.setValueAtTime(freq, start);
      osc.detune.value = cents;
      if (opts?.sweepTo) osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, start + durSec);
      osc.connect(input);
      this.effects.add(osc); osc.start(start); osc.stop(start + durSec + 0.02);
      oscillators.push(osc);
    }
    const used = this.route(ctx, gain, opts ?? {});
    oscillators[0].onended = () => {
      for (const osc of oscillators) { this.effects.delete(osc); osc.disconnect(); }
      filter?.disconnect(); gain.disconnect(); used.forEach(node => node.disconnect());
    };
  }

  // ---- Effetti ----
  cursor(): void {
    this.tone(1000, 0.045, { vol: 0.07, type: "triangle", sweepTo: 860, filterTo: 2600, reverb: .05 });
    this.noise(.012, .05, 6000, { type: "highpass" });
    haptics.tap();
  }
  confirm(): void {
    this.tone(880, 0.08, { vol: 0.09, type: "triangle", detune: 4, reverb: .18 });
    this.tone(1320, 0.11, { vol: 0.068, delaySec: .045, reverb: .24, pan: .25 });
    this.tone(1760, 0.16, { vol: 0.03, delaySec: .05, type: "sine", reverb: .3, pan: .25 });
    haptics.confirm();
  }
  cancel(): void {
    this.tone(440, 0.13, { vol: 0.085, sweepTo: 300, type: "triangle", filterFrom: 2000, filterTo: 500, reverb: .12 });
    this.tone(220, 0.13, { vol: 0.05, sweepTo: 150, type: "sine", delaySec: .01 });
    this.noise(.06, .03, 1400, { type: "bandpass", q: .8 });
    haptics.cancel();
  }
  hit(): void {
    this.tone(165, .14, { vol: .16, sweepTo: 55, attack: .002 });
    this.tone(330, .06, { vol: .04, type: "square", sweepTo: 140, filterFrom: 1600, filterTo: 500 });
    this.noise(.07, .15, 2400, { type: "bandpass", q: 1.1, sweepTo: 900 });
    haptics.hit();
  }
  hitSuper(): void {
    this.tone(110, .34, { vol: .2, sweepTo: 36, attack: .002 });
    this.tone(220, .2, { vol: .05, type: "triangle", sweepTo: 80 });
    this.noise(.22, .2, 3200, { type: "bandpass", q: .9, sweepTo: 700 });
    this.tone(740, .5, { vol: .04, type: "triangle", detune: 6, delaySec: .02, reverb: .4 });
    haptics.hitSuper();
  }
  /** A short, quiet accent that tells the political types apart by ear; it sits under the generic hit, never replaces it.
   * `power` is 1 for a heavy hit, .6 otherwise. Each cue stays under ~0.25 s and a volume of .09. */
  typeAccent(type: string, power = .6): void {
    const v = (x: number) => x * (.7 + .3 * power);
    switch (type) {
      case "POPULISMO": // a loudspeaker horn
        this.tone(220, .13, { type: "square", vol: v(.035), sweepTo: 262, filterTo: 1800 });
        this.tone(330, .11, { type: "square", vol: v(.03), delaySec: .06, filterTo: 1800 });
        break;
      case "MEDIA": // two camera shutters
        this.noise(.03, v(.07), 7000, { type: "highpass" }); this.tone(2600, .02, { type: "square", vol: v(.03) });
        this.noise(.03, v(.06), 5000, { type: "highpass", delaySec: .055 });
        break;
      case "TECNO": // a glitch: four torn blips
        [880, 330, 1320, 440].forEach((f, i) => this.tone(f, .035, { type: "square", vol: v(.035), delaySec: i * .035, pan: i % 2 ? .3 : -.3 }));
        break;
      case "DESTRA": // a flame whoosh
        this.noise(.22, v(.07), 2600, { type: "bandpass", sweepTo: 900 });
        this.tone(110, .2, { type: "sawtooth", vol: v(.03), sweepTo: 240, filterTo: 900 });
        break;
      case "SINISTRA": // a protest drum, twice
        this.tone(96, .15, { vol: v(.09), sweepTo: 54, attack: .002 }); this.tone(96, .15, { vol: v(.08), sweepTo: 54, delaySec: .13, attack: .002 });
        this.noise(.02, v(.05), 2000, { type: "highpass", delaySec: .13 });
        break;
      case "VERDE": // leaves rustling
        this.noise(.2, v(.05), 3500, { type: "bandpass", q: .7 }); this.tone(660, .06, { type: "triangle", vol: v(.025), sweepTo: 900 });
        break;
      case "CENTRO": // a two-note bell
        this.tone(660, .2, { type: "triangle", vol: v(.05), reverb: .3 });
        this.tone(990, .22, { type: "triangle", vol: v(.04), delaySec: .07, detune: 4, reverb: .3 });
        break;
      case "ISTITUZIONE": // a gavel: knock, knock
        this.tone(140, .07, { type: "triangle", vol: v(.09), sweepTo: 90, attack: .002 }); this.noise(.03, v(.08), 1600, { type: "bandpass", q: 1 });
        this.tone(130, .07, { type: "triangle", vol: v(.08), sweepTo: 85, delaySec: .095, attack: .002 });
        this.noise(.03, v(.07), 1500, { type: "bandpass", q: 1, delaySec: .095 });
        break;
    }
  }
  hitWeak(): void {
    this.tone(620, .06, { vol: .065, type: "triangle", sweepTo: 520 });
    this.noise(.03, .04, 2400, { type: "highpass" });
  }
  faint(): void {
    this.tone(294, .42, { vol: .14, sweepTo: 80, filterFrom: 1400, filterTo: 180, reverb: .3 });
    this.tone(147, .5, { vol: .08, sweepTo: 70, type: "sine", delaySec: .02, detune: -6, reverb: .3 });
    haptics.faint();
  }
  ballThrow(): void {
    this.tone(320, .18, { vol: .1, sweepTo: 980, type: "triangle", reverb: .08 });
    this.noise(.18, .05, 2400, { type: "bandpass", q: .7, sweepTo: 4800 });
  }
  ballShake(): void {
    this.tone(190, .07, { vol: .12, sweepTo: 150, attack: .002 });
    this.noise(.02, .05, 3000, { type: "highpass" });
  }
  run(): void {
    this.tone(500, .2, { vol: .09, sweepTo: 1400, type: "triangle", reverb: .1 });
    this.noise(.2, .05, 900, { type: "bandpass", q: .8, sweepTo: 2600 });
  }
  heal(): void {
    [587, 740, 880, 1175].forEach((f, i) => this.tone(f, .16, { delaySec: i * .09, vol: .085, type: "triangle", detune: 5, pan: i % 2 ? .3 : -.3, reverb: .3 }));
  }
  catchJingle(): void {
    [659, 880, 1109, 1319].forEach((f, i) => this.tone(f, .2, { delaySec: i * .13, vol: .095, type: "triangle", detune: 4, pan: i % 2 ? .25 : -.25, reverb: .25 }));
    [659, 988].forEach(f => this.tone(f, .5, { delaySec: .52, vol: .04, type: "sine", reverb: .35 }));
    haptics.catch();
  }
  levelUp(): void {
    [587, 740, 880, 1175, 880, 1480].forEach((f, i) => this.tone(f, .12, { delaySec: i * .08, vol: .09, type: "triangle", detune: 4, pan: i % 2 ? .3 : -.3, reverb: .2 }));
    haptics.levelUp();
  }
  victory(): void {
    const seq = [392, 587, 740, 880, 784, 1175];
    seq.forEach((f, i) => this.tone(f, i === seq.length - 1 ? .45 : .12, { delaySec: i * .12, vol: .1, type: "triangle", detune: 5, pan: i % 2 ? .2 : -.2, reverb: .25 }));
    [196, 262, 392].forEach((f, i) => this.tone(f, .5, { delaySec: i * .36, vol: .05, type: "sine", reverb: .15 }));
  }
  encounterSting(): void {
    this.noise(.35, .05, 400, { type: "bandpass", q: .7, sweepTo: 3200 });
    [440, 466, 660, 698, 880].forEach((f, i) => this.tone(f, .08, { delaySec: i * .07, vol: .095, type: "triangle", pan: i % 2 ? .2 : -.2, reverb: .15 }));
    haptics.alert();
  }

  // ---- Jingle distinti (prima usavano tutti catchJingle/victory) ----
  // Evoluzione: arpeggio ascendente "magico" con code luccicanti (triangle).
  evolveJingle(): void {
    [440, 659, 880, 1109, 1319].forEach((f, i) =>
      this.tone(f, .24, { delaySec: i * .12, vol: .09, type: "triangle", detune: 5, pan: i % 2 ? .3 : -.3, reverb: .3 })
    );
    this.tone(1760, .45, { delaySec: .62, vol: .08, type: "triangle", reverb: .4 });
    this.noise(.25, .03, 7000, { type: "highpass", delaySec: .55 });
    haptics.levelUp();
  }
  // Medaglia: fanfara trionfale a tre squilli, "da premiazione".
  badgeFanfare(): void {
    const seq = [440, 587, 740, 880, 740, 1175, 1480];
    seq.forEach((f, i) =>
      this.tone(f, i === seq.length - 1 ? .6 : .14, { delaySec: i * .13, vol: .105, type: "triangle", detune: 5, pan: i % 2 ? .2 : -.2, reverb: .22 })
    );
    // Basso solenne sotto la fanfara.
    [147, 185, 220].forEach((f, i) => this.tone(f, .42, { delaySec: i * .18, vol: .09, type: "triangle", reverb: .1 }));
    haptics.levelUp();
  }
  // Vincita alle slot: campanella "jackpot" veloce e brillante, con la moneta che cade.
  slotWin(): void {
    [1175, 1480, 1760, 1480, 2349].forEach((f, i) => {
      this.tone(f, .1, { delaySec: i * .08, vol: .1, type: "triangle", pan: i % 2 ? .25 : -.25, reverb: .2 });
      this.noise(.012, .03, 6000, { type: "highpass", delaySec: i * .08 });
    });
    haptics.catch();
  }

  // ---- SFX meccaniche (cue brevi per feedback di sistema) ----
  // Abilità che "respinge" (TEFLON/LODO/POLTRONA/GARANZIA): sweep verso l'alto,
  // sensazione di scudo/scivolamento.
  abilityBlock(): void {
    this.tone(520, .16, { vol: .09, sweepTo: 1040, type: "triangle", reverb: .12 });
    this.noise(.08, .04, 3000, { type: "highpass", sweepTo: 6000 });
  }
  // Hold item difensivo (GILET PARA): tonfo secco protettivo.
  holdGuard(): void {
    this.noise(.065, .085, 700); this.tone(130, .08, { sweepTo: 90, vol: .09 }); this.tone(65, .12, { type: "sine", vol: .05 });
  }
  // Hold item di cura a fine turno (CAFFETTIERA): gorgoglio caldo salente.
  holdBrew(): void {
    [330, 440, 554].forEach((f, i) => this.tone(f, .1, { delaySec: i * .06, vol: .07, type: "triangle", pan: i % 2 ? .2 : -.2, reverb: .15 }));
  }
  // Crisi di governo: sirena breve e cupa, "allarme istituzionale".
  crisis(): void {
    this.tone(300, .28, { vol: .11, sweepTo: 150, type: "sawtooth", filterTo: 1400 });
    this.tone(220, .28, { vol: .1, sweepTo: 110, type: "sawtooth", filterTo: 1400, delaySec: .14 });
    haptics.cancel();
  }
  // Stop di un rullo del casinò: clunk meccanico.
  reelStop(): void {
    this.tone(320, .05, { vol: .1, sweepTo: 180, type: "square", filterTo: 1500 });
    this.noise(.02, .05, 2800, { type: "highpass" });
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
    [659, 784, 988].forEach((f, i) => this.tone(f, .08, { delaySec: i * .055, vol: .035, type: "triangle", pan: i % 2 ? .25 : -.25, reverb: .15 }));
  }

  districtLoss(): void {
    [392, 330, 262].forEach((f, i) => this.tone(f, .09, { delaySec: i * .06, vol: .035, type: "triangle", pan: i % 2 ? -.25 : .25, reverb: .15 }));
  }

  // Stacco di fase del capo: il "PARTITO NUOVO!" del Futuro Anteriore. Un crescendo di rumore, un ottone
  // corto che sale e un accordo che si chiude sul colpo.
  /** The boss changes its party line: a riser, a brass stab and a chord closed by a crack. */
  bossPhase(): void {
    this.noise(.5, .07, 500, { type: "bandpass", q: .7, sweepTo: 4200 });
    [262, 330, 392, 523].forEach((f, i) => this.tone(f, .16, { type: "square", vol: .05, delaySec: .42 + i * .07, filterFrom: 900, filterTo: 2400, pan: i % 2 ? .25 : -.25 }));
    [523, 659, 784].forEach(f => this.tone(f, .9, { type: "triangle", vol: .06, delaySec: .72, detune: 5, reverb: .35 }));
    this.noise(.12, .14, 3000, { type: "highpass", delaySec: .72 });
    haptics.alert();
  }
  // Mossa finale (FUORIONDA): il microfono si apre con uno schiocco, poi un motivo breve che cade sul colpo.
  /** The signature move: the mic opens with a pop, then a short motif lands on the hit. */
  finisher(): void {
    this.noise(.03, .09, 6000, { type: "highpass" });
    [330, 440, 330, 554, 659].forEach((f, i) => this.tone(f, i === 4 ? .32 : .09, { type: "square", vol: .06, delaySec: .05 + i * .08, filterTo: 2000, pan: i % 2 ? .2 : -.2 }));
    this.tone(165, .34, { vol: .17, sweepTo: 60, delaySec: .45 });
    this.noise(.16, .14, 2800, { type: "bandpass", q: .9, sweepTo: 800, delaySec: .45 });
    this.tone(659, .6, { type: "triangle", vol: .05, delaySec: .45, reverb: .4 });
    haptics.hitSuper();
  }

  // ---- Poteri sul campo: ogni potere ha il suo suono, tutti brevi e sotto .14 di volume ----
  /** The cut-in: a rising swell and a bright stab as the name slams in. */
  powerEntrance(): void {
    this.tone(180, .32, { type: "sawtooth", vol: .05, sweepTo: 640, filterFrom: 600, filterTo: 2600 });
    this.tone(523, .12, { type: "square", vol: .05, delaySec: .22, filterTo: 2200 }); this.tone(784, .2, { type: "square", vol: .05, delaySec: .28, filterTo: 2200 });
    this.tone(1046, .34, { type: "triangle", vol: .06, delaySec: .3, reverb: .35 });
    haptics.confirm();
  }
  /** Scissors through ribbon: a high zip and a tick. */
  powerSlash(): void {
    this.noise(.14, .12, 6000, { type: "highpass", sweepTo: 2000 });
    this.tone(1800, .16, { type: "sawtooth", vol: .05, sweepTo: 300, filterTo: 2400 });
    this.tone(220, .05, { type: "square", vol: .06, delaySec: .13 }); haptics.hitSuper();
  }
  /** Shoulder into stone. */
  powerThud(): void {
    this.noise(.2, .2, 900, { type: "bandpass", q: .8 }); this.tone(96, .24, { sweepTo: 38, vol: .18 }); this.tone(48, .4, { type: "sine", vol: .12, delaySec: .02 }); haptics.hitSuper();
  }
  /** A plank put down: a wooden knock with a little pitch each time. */
  powerPlank(step: number): void {
    this.noise(.05, .1, 1600, { type: "bandpass", q: 1.1 }); this.tone(260 + step * 36, .07, { type: "square", vol: .06, filterTo: 1500 });
  }
  /** The flash bulbs of a press room, then a warm swell. */
  powerFlash(): void {
    [0, .07, .15, .21].forEach((delaySec, i) => {
      this.noise(.05, .09, 7000, { type: "highpass", delaySec });
      this.tone(2400 + i * 200, .03, { type: "square", vol: .03, delaySec });
    });
    this.tone(330, .5, { type: "triangle", vol: .06, sweepTo: 660, delaySec: .1, reverb: .35 });
  }
  /** Climbing: short rising ticks. */
  powerClimb(): void {
    [392, 440, 494, 587].forEach((f, i) => this.tone(f, .07, { type: "square", vol: .05, delaySec: i * .07, filterTo: 2500 }));
  }
  /** A puff of smoke and a slide whistle down. */
  powerPuff(): void {
    this.noise(.22, .14, 1800, { type: "bandpass", q: .7 }); this.tone(900, .3, { type: "triangle", vol: .06, sweepTo: 120, reverb: .2 });
  }
  /** The engines: a long whoosh that climbs and drops. */
  powerFlight(): void {
    this.noise(.25, .12, 2400, { type: "bandpass", q: .6, sweepTo: 700 });
    this.tone(140, .9, { type: "sawtooth", vol: .045, sweepTo: 420, filterFrom: 500, filterTo: 1200, reverb: .15 });
    this.tone(420, .6, { type: "sawtooth", vol: .04, sweepTo: 90, delaySec: .9, filterFrom: 1200, filterTo: 200 });
  }
  /** The loudspeaker squeal and its answer. */
  powerHorn(): void {
    this.tone(220, .18, { type: "square", vol: .05, sweepTo: 262, filterTo: 2000 }); this.tone(330, .16, { type: "square", vol: .045, delaySec: .1, filterTo: 2000 });
    this.tone(2200, .08, { type: "sine", vol: .03, delaySec: .3, reverb: .3 }); haptics.event();
  }
  /** A radar pulse: a soft ping that rises and fades. */
  powerRadar(): void {
    [0, .18, .36].forEach((delaySec, i) => this.tone(660 + i * 110, .25 - i * .05, { type: "sine", vol: .06 - i * .012, sweepTo: 880 + i * 140, delaySec, reverb: .3 }));
  }
  /** Something stirs: low rustle. */
  powerRustle(): void {
    this.noise(.2, .1, 3200, { type: "bandpass", q: .6 }); this.noise(.18, .08, 2600, { type: "bandpass", q: .6, delaySec: .14 });
  }

  /** A burst of the shared noise loop. Each burst starts at a different point of the loop, so repeated hits do not sound identical. */
  private noise(duration: number, volume: number, cutoff: number, opts?: NoiseOpts): void {
    const ctx = this.ensure();
    if (!ctx || !this.effectsGain || !this.enabled || !this.preferences.effects || this.lifecycleMuted) return;
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate), ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0); let seed = 731;
      for (let i = 0; i < data.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = seed / 2147483648 - 1; }
    }
    const start = ctx.currentTime + (opts?.delaySec ?? 0);
    const room = Math.max(0, this.noiseBuffer.duration - duration);
    const offset = room > 0 ? (this.noiseCursor++ % 5) / 4 * room : 0;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noiseBuffer; filter.type = opts?.type ?? "lowpass"; filter.frequency.setValueAtTime(cutoff, start);
    if (opts?.q) filter.Q.value = opts.q;
    if (opts?.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain);
    const used = this.route(ctx, gain, opts ?? {});
    this.effects.add(source); source.start(start, offset); source.stop(start + duration);
    source.onended = () => { this.effects.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); used.forEach(node => node.disconnect()); };
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
    this.ctx = null; this.master = null; this.musicGain = null; this.effectsGain = null; this.reverbIn = null; this.noiseBuffer = null;
    this.buffers.clear();
  }
}
export const audio = new AudioEngine();

// Audio chiptune via WebAudio: effetti + loop musicali leggeri.
// Si attiva al primo input utente (policy autoplay dei browser).
import { haptics } from "./haptics";

const NOTE_BASE: Record<string, number> = {
  C: -9, "C#": -8, D: -7, "D#": -6, E: -5, F: -4,
  "F#": -3, G: -2, "G#": -1, A: 0, "A#": 1, B: 2
};

function noteFreq(note: string): number {
  // es. "C5", "F#4". A4 = 440.
  const m = /^([A-G]#?)(\d)$/.exec(note);
  if (!m) {
    return 0;
  }
  const semitones = NOTE_BASE[m[1]] + (Number(m[2]) - 4) * 12;
  return 440 * Math.pow(2, semitones / 12);
}

interface Track {
  melody: string[]; // note o "-" (pausa), uno step ciascuna
  bass: string[];
  stepSec: number;
  melodyType?: OscillatorType;
  bassType?: OscillatorType;
}

// Ogni zona e ogni tipo di scontro ha il suo tema. Tutte le tracce sono
// pattern testuali: nota+ottava o "-" (pausa), uno step ciascuna.
const TRACKS: Record<string, Track> = {
  // Sigla del titolo: fanfara da comizio.
  title: {
    stepSec: 0.14,
    melody: (
      "G4 - C5 - E5 - G5 - E5 - C5 - E5 - - - " +
      "F4 - B4 - D5 - F5 - D5 - B4 - D5 - - - " +
      "A4 - C5 - E5 - A5 - G5 - E5 - C5 - D5 - " +
      "E5 - D5 - C5 - - - C5 - - - - - - -"
    ).split(" "),
    bass: (
      "C3 - - - C3 - - - G2 - - - G2 - - - " +
      "G2 - - - G2 - - - C3 - - - C3 - - - " +
      "A2 - - - A2 - - - F2 - - - F2 - - - " +
      "G2 - - - G2 - - - C3 - - - C3 - - -"
    ).split(" ")
  },

  // Borgo Urne: marcetta allegra di provincia.
  borgo: {
    stepSec: 0.16,
    melody: (
      "C5 - E5 - G5 - E5 - F5 - A5 - G5 - - - " +
      "E5 - G5 - C6 - G5 - A5 - F5 - E5 - D5 - " +
      "C5 - E5 - G5 - E5 - F5 - A5 - G5 - - - " +
      "A5 - G5 - F5 - D5 - C5 - - - - - - -"
    ).split(" "),
    bass: (
      "C3 - - - G3 - - - F3 - - - G3 - - - " +
      "C3 - - - E3 - - - F3 - - - G3 - - - " +
      "C3 - - - G3 - - - F3 - - - G3 - - - " +
      "F3 - - - G3 - - - C3 - - - C3 - - -"
    ).split(" ")
  },

  // Mediopoli: jingle televisivo brioso, da sigla del TG.
  mediopoli: {
    stepSec: 0.13,
    melody: (
      "E5 - G5 - E5 - C5 - D5 - F5 - D5 - B4 - " +
      "C5 - E5 - G5 - A5 - G5 - E5 - C5 - - - " +
      "E5 - G5 - E5 - C5 - D5 - F5 - D5 - B4 - " +
      "C5 - D5 - E5 - F5 - G5 - - - - - - -"
    ).split(" "),
    bass: (
      "C3 - G2 - C3 - G2 - G2 - D3 - G2 - D3 - " +
      "A2 - E3 - A2 - E3 - F2 - C3 - G2 - - - " +
      "C3 - G2 - C3 - G2 - G2 - D3 - G2 - D3 - " +
      "F2 - C3 - G2 - G2 - C3 - - - - - - -"
    ).split(" ")
  },

  // Eurotown: citazione dell'Inno alla Gioia, debitamente normata.
  eurotown: {
    stepSec: 0.17,
    melody: (
      "E5 - E5 - F5 - G5 - G5 - F5 - E5 - D5 - " +
      "C5 - C5 - D5 - E5 - E5 - - D5 D5 - - - " +
      "E5 - E5 - F5 - G5 - G5 - F5 - E5 - D5 - " +
      "C5 - C5 - D5 - E5 - D5 - - C5 C5 - - -"
    ).split(" "),
    bass: (
      "C3 - - - G2 - - - C3 - - - G2 - - - " +
      "F2 - - - C3 - - - G2 - - - G2 - - - " +
      "C3 - - - G2 - - - C3 - - - G2 - - - " +
      "F2 - - - G2 - - - C3 - - - C3 - - -"
    ).split(" ")
  },

  // Caput Mundi: marcia solenne tra i palazzi del potere.
  capitale: {
    stepSec: 0.15,
    melody: (
      "A4 - - - C5 - E5 - D5 - C5 - B4 - - - " +
      "G4 - - - B4 - D5 - C5 - B4 - A4 - - - " +
      "A4 - C5 - E5 - A5 - G5 - F5 - E5 - D5 - " +
      "C5 - B4 - A4 - - - A4 - - - - - - -"
    ).split(" "),
    bass: (
      "A2 - - - E3 - - - A2 - - - E3 - - - " +
      "G2 - - - D3 - - - G2 - - - D3 - - - " +
      "F2 - - - C3 - - - G2 - - - E3 - - - " +
      "A2 - - - E2 - - - A2 - - - A2 - - -"
    ).split(" ")
  },

  // Atto 3: piazza elettorale aperta, vivace ma non trionfale.
  campo_largo: {
    stepSec: 0.15,
    melody: "C5 - E5 G5 - A5 - G5 E5 - D5 - F5 A5 - G5 - E5 D5 - C5 - - -".split(" "),
    bass: "C3 - - G2 - A2 - - E3 - F2 - - G2 - C3 - G2 - C3 - - -".split(" ")
  },

  // Atto 3: feed social, notifiche e pressione crescente.
  social_tension: {
    stepSec: 0.11,
    melodyType: "square",
    bassType: "sawtooth",
    melody: "E5 - F5 - B4 E5 - G5 - F#5 - D5 - E5 B4 - C5 - B4 -".split(" "),
    bass: "E2 - - E2 - C3 - - D3 - B2 - - B2 - E2 - - E2 -".split(" ")
  },

  // Atto 3: scrutinio finale, solenne e sospeso fino all'ultimo seggio.
  election_night: {
    stepSec: 0.18,
    melodyType: "triangle",
    melody: "A4 - C5 - E5 - D5 - B4 - C5 - A4 - - E5 - F5 E5 D5 - C5 B4 A4 -".split(" "),
    bass: "A2 - - E3 - F2 - - C3 - D2 - - E2 - A2 - - E2 -".split(" ")
  },

  // Interni (laboratorio, palestre, discount): carillon discreto.
  interior: {
    stepSec: 0.2,
    melodyType: "triangle",
    melody: (
      "C5 - E5 - G5 - E5 - A4 - C5 - E5 - C5 - " +
      "F4 - A4 - C5 - A4 - G4 - B4 - D5 - B4 -"
    ).split(" "),
    bass: (
      "C3 - - - - - - - A2 - - - - - - - " +
      "F2 - - - - - - - G2 - - - - - - -"
    ).split(" ")
  },

  // Palazzo e Colle: tema cupo istituzionale.
  palazzo: {
    stepSec: 0.17,
    melody: (
      "A4 - - - A4 - B4 - C5 - - - B4 - A4 - " +
      "G#4 - - - E4 - G#4 - A4 - - - - - - - " +
      "C5 - - - C5 - D5 - E5 - - - D5 - C5 - " +
      "B4 - - - G#4 - B4 - A4 - - - - - - -"
    ).split(" "),
    bass: (
      "A2 - - - E2 - - - A2 - - - E2 - - - " +
      "E2 - - - E2 - - - A2 - - - A2 - - - " +
      "F2 - - - C3 - - - G2 - - - D3 - - - " +
      "E2 - - - E2 - - - A2 - - - A2 - - -"
    ).split(" ")
  },

  // Stretto di Messina: tarantella da cantiere balneare.
  stretto: {
    stepSec: 0.105,
    melody: (
      "E5 - E5 E5 - E5 G5 F5 E5 D5 - D5 C5 - C5 E5 D5 C5 B4 - - B4 C5 D5 " +
      "E5 - E5 E5 - E5 G5 F5 E5 D5 - D5 C5 - C5 E5 D5 C5 A4 - - A4 - -"
    ).split(" "),
    bass: (
      "A2 - - E3 - - A2 - - E3 - - G2 - - D3 - - E2 - - E3 - - " +
      "A2 - - E3 - - F2 - - C3 - - G2 - - E2 - - A2 - - A2 - -"
    ).split(" ")
  },

  // Battaglia selvatica: incalzante in minore.
  "battle-wild": {
    stepSec: 0.12,
    melody: (
      "A4 A4 C5 A4 E5 - D5 C5 B4 - B4 - E5 - D5 C5 " +
      "A4 A4 C5 A4 F5 - E5 D5 E5 - - - - - - - " +
      "A4 A4 C5 A4 E5 - D5 C5 B4 - B4 - E5 - G5 F5 " +
      "E5 - C5 - D5 - B4 - A4 - - - - - - -"
    ).split(" "),
    bass: (
      "A2 - A2 - A2 - A2 - G2 - G2 - G2 - G2 - " +
      "F2 - F2 - F2 - F2 - E2 - E2 - E2 - E2 - " +
      "A2 - A2 - A2 - A2 - G2 - G2 - G2 - G2 - " +
      "F2 - F2 - E2 - E2 - A2 - A2 - A2 - A2 -"
    ).split(" ")
  },

  // Battaglia allenatore: duello serrato in Re minore.
  "battle-trainer": {
    stepSec: 0.115,
    melody: (
      "D5 D5 F5 D5 A5 - G5 F5 E5 - E5 - G5 - F5 E5 " +
      "D5 D5 F5 D5 C5 - C5 D5 E5 - F5 - E5 - D5 - " +
      "D5 D5 F5 D5 A5 - G5 F5 E5 - E5 - A5 - G5 F5 " +
      "G5 - F5 - E5 - C5 - D5 - - - - - - -"
    ).split(" "),
    bass: (
      "D3 - D3 - C3 - C3 - A#2 - A#2 - A2 - A2 - " +
      "D3 - D3 - C3 - C3 - A#2 - A2 - D3 - D3 - " +
      "D3 - D3 - C3 - C3 - A#2 - A#2 - A2 - A2 - " +
      "G2 - G2 - A2 - A2 - D3 - D3 - D3 - D3 -"
    ).split(" ")
  },

  // Palestra: ritmo urgente, posta in palio alta.
  "battle-gym": {
    stepSec: 0.11,
    melody: (
      "E5 E5 G5 E5 B5 - A5 G5 F#5 - F#5 - B5 - A5 G5 " +
      "E5 E5 G5 E5 C6 - B5 A5 G5 - F#5 - E5 - - - " +
      "E5 E5 G5 E5 B5 - A5 G5 F#5 - F#5 - D6 - B5 A5 " +
      "B5 - G5 - A5 - F#5 - E5 - - - - - - -"
    ).split(" "),
    bass: (
      "E3 - E2 - E3 - E2 - D3 - D2 - D3 - D2 - " +
      "C3 - C2 - C3 - C2 - B2 - B2 - E2 - E2 - " +
      "E3 - E2 - E3 - E2 - D3 - D2 - D3 - D2 - " +
      "C3 - C3 - B2 - B2 - E2 - E2 - E2 - E2 -"
    ).split(" ")
  },

  // Boss di fine atto: minaccia che incombe.
  "battle-boss": {
    stepSec: 0.13,
    melody: (
      "A4 - A4 - A#4 - A4 - E5 - - - D5 - C5 - " +
      "A#4 - A#4 - C5 - A#4 - A4 - - - G#4 - - - " +
      "A4 - A4 - C5 - D5 - E5 - - - F5 - E5 - " +
      "D5 - C5 - B4 - D5 - C#5 - - - - - - -"
    ).split(" "),
    bass: (
      "A2 - E2 - A2 - E2 - F2 - C3 - F2 - C3 - " +
      "G2 - D3 - G2 - D3 - E2 - E2 - E2 - E2 - " +
      "A2 - E2 - A2 - E2 - F2 - C3 - F2 - C3 - " +
      "G2 - G2 - E2 - E2 - A2 - A2 - A2 - A2 -"
    ).split(" ")
  },

  // Leggendari: apparizione sospesa, quasi liturgica.
  "battle-legend": {
    stepSec: 0.15,
    melodyType: "triangle",
    melody: (
      "C5 - D#5 - G5 - D#5 - C5 - - - G#4 - A#4 - " +
      "C5 - D#5 - F5 - G5 - - - A#4 - C5 - - - " +
      "G5 - F5 - D#5 - C5 - D5 - - - D#5 - D5 - " +
      "C5 - - - B4 - - - C5 - - - - - - -"
    ).split(" "),
    bass: (
      "C3 - - - G#2 - - - A#2 - - - G2 - - - " +
      "C3 - - - G#2 - - - A#2 - - - G2 - - - " +
      "G#2 - - - A#2 - - - G2 - - - G2 - - - " +
      "C3 - - - G2 - - - C3 - - - C3 - - -"
    ).split(" ")
  },

  // Paradiso Offshore: bossa nova da spiaggia coi soldi al sole (isola post-game).
  offshore: {
    stepSec: 0.16,
    melodyType: "triangle",
    melody: (
      "C5 - E5 - G5 - A5 - G5 - E5 - D5 - - - " +
      "A4 - C5 - E5 - G5 - F5 - E5 - D5 - - - " +
      "C5 - E5 - G5 - A5 - C6 - A5 - G5 - E5 - " +
      "D5 - E5 - D5 - C5 - - - - - - - - -"
    ).split(" "),
    bass: (
      "A2 - - - E3 - - - F2 - - - C3 - - - " +
      "F2 - - - C3 - - - G2 - - - D3 - - - " +
      "A2 - - - E3 - - - F2 - - - G2 - - - " +
      "G2 - - - G2 - - - A2 - - - A2 - - -"
    ).split(" ")
  },

  // Bruxelles: marcia europea solenne e ottimista, "da inno delle istituzioni"
  // (parente lontano dell'eurotown ma più ampio e cerimoniale, in maggiore).
  bruxelles: {
    stepSec: 0.16,
    melodyType: "triangle",
    melody: (
      "G4 - C5 - E5 - G5 - E5 - C5 - D5 - - - " +
      "F4 - A4 - C5 - F5 - E5 - D5 - C5 - - - " +
      "E5 - G5 - C6 - B5 - A5 - G5 - E5 - D5 - " +
      "C5 - D5 - E5 - G5 - C5 - - - - - - -"
    ).split(" "),
    bass: (
      "C3 - - - E3 - - - G2 - - - G2 - - - " +
      "F2 - - - C3 - - - G2 - - - G2 - - - " +
      "C3 - - - E3 - - - F2 - - - C3 - - - " +
      "F2 - - - G2 - - - C3 - - - C3 - - -"
    ).split(" ")
  },

  // Duello PvP in diretta: sfida serrata, adrenalinica, "da confronto televisivo".
  "battle-duel": {
    stepSec: 0.1,
    melody: (
      "E5 E5 B5 E5 A5 - G5 F#5 E5 - G5 - B5 - A5 G5 " +
      "F#5 F#5 A5 F#5 D6 - C6 B5 A5 - B5 - A5 - G5 - " +
      "E5 E5 B5 E5 A5 - G5 F#5 E5 - G5 - C6 - B5 A5 " +
      "B5 - A5 - G5 - F#5 - E5 - - - - - - -"
    ).split(" "),
    bass: (
      "E3 - E2 - E3 - E2 - A2 - A2 - A3 - A2 - " +
      "D3 - D2 - D3 - D2 - B2 - B2 - B3 - B2 - " +
      "E3 - E2 - E3 - E2 - A2 - A2 - C3 - C2 - " +
      "B2 - B2 - A2 - A2 - E3 - E2 - E3 - E2 -"
    ).split(" ")
  }
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer = 0;
  private musicStep = 0;
  private currentTrack: Track | null = null;
  private nextNoteTime = 0;
  private lifecycleMuted = false;
  enabled = true;

  private ensure(): AudioContext | null {
    if (this.lifecycleMuted) {
      return this.ctx;
    }
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.16;
        this.musicGain.connect(this.master);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended" && !this.lifecycleMuted) {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  unlock(): void {
    this.ensure();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    }
    return this.enabled;
  }

  private tone(
    freq: number,
    durSec: number,
    opts?: { type?: OscillatorType; vol?: number; sweepTo?: number; delaySec?: number; dest?: AudioNode }
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled || this.lifecycleMuted || freq <= 0) {
      return;
    }
    const start = ctx.currentTime + (opts?.delaySec ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts?.type ?? "square";
    osc.frequency.setValueAtTime(freq, start);
    if (opts?.sweepTo) {
      osc.frequency.linearRampToValueAtTime(opts.sweepTo, start + durSec);
    }
    const vol = opts?.vol ?? 0.1;
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + durSec);
    osc.connect(gain);
    gain.connect(opts?.dest ?? this.master);
    osc.start(start);
    osc.stop(start + durSec + 0.02);
  }

  // ---- Effetti ----
  cursor(): void {
    this.tone(860, 0.045, { vol: 0.07 });
    haptics.tap();
  }
  confirm(): void {
    this.tone(1180, 0.07, { vol: 0.08 });
    haptics.confirm();
  }
  cancel(): void {
    this.tone(420, 0.08, { vol: 0.08 });
    haptics.cancel();
  }
  hit(): void {
    this.tone(220, 0.12, { sweepTo: 110, vol: 0.14 });
    haptics.hit();
  }
  hitSuper(): void {
    this.tone(330, 0.2, { sweepTo: 70, vol: 0.16 });
    haptics.hitSuper();
  }
  hitWeak(): void {
    this.tone(480, 0.06, { vol: 0.09 });
  }
  faint(): void {
    this.tone(380, 0.5, { sweepTo: 45, vol: 0.14 });
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
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, { delaySec: i * 0.09, vol: 0.09 }));
  }
  catchJingle(): void {
    [659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, { delaySec: i * 0.13, vol: 0.1 }));
    haptics.catch();
  }
  levelUp(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, { delaySec: i * 0.08, vol: 0.09 }));
    haptics.levelUp();
  }
  victory(): void {
    const seq = [523, 523, 523, 659, 784, 1047];
    seq.forEach((f, i) => this.tone(f, i === seq.length - 1 ? 0.4 : 0.11, { delaySec: i * 0.12, vol: 0.1 }));
  }
  encounterSting(): void {
    [880, 830, 880, 830, 880].forEach((f, i) => this.tone(f, 0.07, { delaySec: i * 0.07, vol: 0.1 }));
    haptics.alert();
  }

  // ---- Jingle distinti (prima usavano tutti catchJingle/victory) ----
  // Evoluzione: arpeggio ascendente "magico" con code luccicanti (triangle).
  evolveJingle(): void {
    [523, 659, 784, 988, 1319].forEach((f, i) =>
      this.tone(f, 0.22, { delaySec: i * 0.12, vol: 0.09, type: "triangle" })
    );
    this.tone(1047, 0.5, { delaySec: 0.62, vol: 0.08, type: "triangle" });
    haptics.levelUp();
  }
  // Medaglia: fanfara trionfale a tre squilli, "da premiazione".
  badgeFanfare(): void {
    const seq = [392, 523, 659, 784, 659, 784, 1047];
    seq.forEach((f, i) =>
      this.tone(f, i === seq.length - 1 ? 0.55 : 0.13, { delaySec: i * 0.13, vol: 0.11 })
    );
    // Basso solenne sotto la fanfara.
    [131, 165, 196].forEach((f, i) => this.tone(f, 0.4, { delaySec: i * 0.18, vol: 0.09, type: "triangle" }));
    haptics.levelUp();
  }
  // Vincita alle slot: campanella "jackpot" veloce e brillante.
  slotWin(): void {
    [1047, 1319, 1047, 1319, 1568].forEach((f, i) =>
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
    this.tone(180, 0.14, { sweepTo: 120, vol: 0.11, type: "square" });
  }
  // Hold item di cura a fine turno (CAFFETTIERA): gorgoglio caldo salente.
  holdBrew(): void {
    [440, 554, 659].forEach((f, i) => this.tone(f, 0.1, { delaySec: i * 0.06, vol: 0.07, type: "triangle" }));
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
    this.tone(1500, 0.018, { vol: 0.025 });
  }

  // Cue elettorali volutamente brevi e a volume basso: restano sotto i dialoghi.
  districtGain(): void {
    [659, 784, 988].forEach((f, i) => this.tone(f, 0.08, { delaySec: i * 0.055, vol: 0.035, type: "triangle" }));
  }

  districtLoss(): void {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.09, { delaySec: i * 0.06, vol: 0.035, type: "triangle" }));
  }

  // ---- Musica ----
  playMusic(name: string | null): void {
    const track = name ? TRACKS[name] ?? null : null;
    if (this.currentTrack === track) {
      return;
    }
    this.stopMusic();
    this.currentTrack = track;
    if (!track) {
      return;
    }
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.startMusicTimer();
  }

  stopMusic(): void {
    this.clearMusicTimer();
    this.currentTrack = null;
  }

  pauseForLifecycle(): void {
    this.lifecycleMuted = true;
    this.clearMusicTimer();
    void this.ctx?.suspend();
  }

  resumeForLifecycle(): void {
    this.lifecycleMuted = false;
    if (this.currentTrack && this.enabled) {
      this.nextNoteTime = 0;
      this.startMusicTimer();
    }
  }

  destroy(): void {
    this.lifecycleMuted = true;
    this.clearMusicTimer();
    this.currentTrack = null;
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close().catch(() => undefined);
    }
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
  }

  private startMusicTimer(): void {
    this.clearMusicTimer();
    if (!this.lifecycleMuted) {
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 60);
    }
  }

  private clearMusicTimer(): void {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = 0;
    }
  }

  private scheduleMusic(): void {
    const ctx = this.ensure();
    const track = this.currentTrack;
    if (!ctx || !track || !this.enabled || !this.musicGain || this.lifecycleMuted) {
      return;
    }
    if (this.nextNoteTime < ctx.currentTime) {
      this.nextNoteTime = ctx.currentTime + 0.05;
    }
    while (this.nextNoteTime < ctx.currentTime + 0.18) {
      const melody = track.melody[this.musicStep % track.melody.length];
      const bass = track.bass[this.musicStep % track.bass.length];
      const delay = this.nextNoteTime - ctx.currentTime;
      if (melody && melody !== "-") {
        this.tone(noteFreq(melody), track.stepSec * 0.92, {
          delaySec: delay, vol: 0.5, type: track.melodyType ?? "square", dest: this.musicGain
        });
      }
      if (bass && bass !== "-") {
        this.tone(noteFreq(bass), track.stepSec * 1.6, {
          delaySec: delay, vol: 0.7, type: track.bassType ?? "triangle", dest: this.musicGain
        });
      }
      this.nextNoteTime += track.stepSec;
      this.musicStep += 1;
    }
  }
}

export const audio = new AudioEngine();

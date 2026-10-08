// Renderizza offline ogni effetto di src/engine/audio.ts in WAV stereo e ne misura picco, RMS, coda e larghezza.
// Uso: BASE_URL=http://127.0.0.1:5199 node scripts/render-sfx.mjs [cartella] — senza cartella usa artifacts/sfx.
// Il controllo fallisce se un effetto è muto (sotto -80 dBFS), supera 0 dBFS o dura più di 2,5 secondi.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5199';
const OUT = process.argv[2] ?? 'artifacts/sfx';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
try {
 const page = await browser.newPage();
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto(`${BASE}/scripts/perf-harness.html`, { waitUntil: 'networkidle' });
 const renders = await page.evaluate(async (MODULE) => {
  const { audio } = await import(MODULE);
  const SR = 44100, LEN = SR * 3;
  // Each cue is rendered by a fresh offline context; the engine builds its own bus on it.
  window.AudioContext = function () { return new OfflineAudioContext(2, LEN, SR); };
  const cues = {
   cursor: () => audio.cursor(), confirm: () => audio.confirm(), cancel: () => audio.cancel(),
   hit: () => audio.hit(), hitSuper: () => audio.hitSuper(), hitWeak: () => audio.hitWeak(),
   faint: () => audio.faint(), ballThrow: () => audio.ballThrow(), ballShake: () => audio.ballShake(),
   run: () => audio.run(), heal: () => audio.heal(), catchJingle: () => audio.catchJingle(),
   levelUp: () => audio.levelUp(), victory: () => audio.victory(), encounterSting: () => audio.encounterSting(),
   evolveJingle: () => audio.evolveJingle(), badgeFanfare: () => audio.badgeFanfare(), slotWin: () => audio.slotWin(),
   abilityBlock: () => audio.abilityBlock(), holdGuard: () => audio.holdGuard(), holdBrew: () => audio.holdBrew(),
   crisis: () => audio.crisis(), reelStop: () => audio.reelStop(), districtGain: () => audio.districtGain(),
   districtLoss: () => audio.districtLoss(), powerEntrance: () => audio.powerEntrance(), powerSlash: () => audio.powerSlash(),
   powerThud: () => audio.powerThud(), powerPlank: () => audio.powerPlank(2), powerFlash: () => audio.powerFlash(),
   powerClimb: () => audio.powerClimb(), powerPuff: () => audio.powerPuff(), powerFlight: () => audio.powerFlight(),
   powerHorn: () => audio.powerHorn(), powerRadar: () => audio.powerRadar(), powerRustle: () => audio.powerRustle(),
   footstepGrass: () => audio.footstep('grass'), footstepWet: () => audio.footstep('wet'), footstepStone: () => audio.footstep('stone'),
   bossPhase: () => audio.bossPhase(), finisher: () => audio.finisher(),
  };
  for (const type of ['POPULISMO', 'MEDIA', 'TECNO', 'DESTRA', 'SINISTRA', 'VERDE', 'CENTRO', 'ISTITUZIONE'])
   cues[`type${type[0]}${type.slice(1).toLowerCase()}`] = () => audio.typeAccent(type, 1);
  const out = [];
  for (const [name, play] of Object.entries(cues)) {
   audio.ctx = null; audio.unlock();
   // The real context has been running for seconds: its master and effects levels are settled before any cue.
   audio.master.gain.cancelScheduledValues(0); audio.master.gain.setValueAtTime(.55, 0);
   audio.effectsGain.gain.cancelScheduledValues(0); audio.effectsGain.gain.setValueAtTime(audio.preferences.effects / 100, 0);
   try { play(); } catch { continue; } // A cue the engine does not have (older builds) is skipped.
   const buffer = await audio.ctx.startRendering();
   const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
   let peak = 0, sumL = 0, sumR = 0, sumSide = 0, lastLoud = 0, nan = false;
   const floor = 10 ** (-50 / 20);
   for (let i = 0; i < LEN; i++) {
    const l = left[i], r = right[i];
    if (!Number.isFinite(l) || !Number.isFinite(r)) nan = true;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    sumL += l * l; sumR += r * r; sumSide += (l - r) * (l - r);
    if (Math.abs(l) > floor || Math.abs(r) > floor) lastLoud = i;
   }
   const end = Math.min(LEN, lastLoud + Math.round(SR * .05));
   const pcm = new Int16Array(end * 2);
   for (let i = 0; i < end; i++) {
    pcm[2 * i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767)));
    pcm[2 * i + 1] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767)));
   }
   const bytes = new Uint8Array(pcm.buffer); let binary = '';
   for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
   const rms = Math.sqrt((sumL + sumR) / (2 * LEN));
   out.push({
    name, nan, peakDb: 20 * Math.log10(peak || 1e-9), rmsDb: 20 * Math.log10(rms || 1e-9),
    tailS: lastLoud / SR, width: Math.sqrt(sumSide / (2 * LEN)) / (rms || 1), pcm: btoa(binary),
   });
  }
  return out;
 }, process.env.AUDIO_MODULE ?? '/src/engine/audio.ts');
 assert.deepEqual(errors, []);

 const header = (bytes) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + bytes.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(44100, 24); h.writeUInt32LE(44100 * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(bytes.length, 40);
  return Buffer.concat([h, bytes]);
 };
 const pcmOf = (entry) => Buffer.from(entry.pcm, 'base64');
 const report = [];
 for (const entry of renders) {
  assert.equal(entry.nan, false, `${entry.name}: valori non finiti`);
  assert.ok(entry.peakDb > -80, `${entry.name}: muto (picco ${entry.peakDb.toFixed(1)} dBFS)`);
  assert.ok(entry.peakDb < 0, `${entry.name}: supera 0 dBFS (${entry.peakDb.toFixed(1)})`);
  assert.ok(entry.tailS <= 2.5, `${entry.name}: coda di ${entry.tailS.toFixed(2)} s`);
  writeFileSync(join(OUT, `${entry.name}.wav`), header(pcmOf(entry)));
  report.push(`${entry.name.padEnd(20)} picco ${entry.peakDb.toFixed(1).padStart(6)} dBFS  RMS ${entry.rmsDb.toFixed(1).padStart(6)}  coda ${entry.tailS.toFixed(2)} s  larghezza ${entry.width.toFixed(2)}`);
 }
 // Prova d'ascolto: una sequenza dei cue principali con quattro decimi di silenzio tra l'uno e l'altro.
 const pick = ['cursor', 'confirm', 'cancel', 'hit', 'hitSuper', 'hitWeak', 'typeDestra', 'typeIstituzione', 'faint', 'heal', 'catchJingle', 'levelUp', 'victory', 'powerEntrance', 'powerFlight', 'bossPhase', 'finisher'];
 const gap = Buffer.alloc(Math.round(44100 * .4) * 4);
 const parts = [];
 for (const name of pick) { const entry = renders.find(e => e.name === name); if (entry) parts.push(pcmOf(entry), gap); }
 writeFileSync(join(OUT, 'prova-sfx.wav'), header(Buffer.concat(parts)));
 console.log(report.join('\n'));
 console.log(`PASS: ${renders.length} effetti renderizzati offline in ${OUT}, prova in prova-sfx.wav.`);
} finally { await browser.close(); }

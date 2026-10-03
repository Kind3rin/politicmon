import type { TrainerDef } from "../data/trainers";
import { ITEMS } from "../data/items";
import { MOVES } from "../data/moves";
import { TYPE_ORDER } from "../data/poltypes";
import { sceneImage } from "../engine/assets";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { abilityOf, speciesOf, statsOf, type Monster } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { trainerStyle, type TrainerStyle } from "../game/battle/trainerStyle";
import { preparationNotes } from "../game/battle/preparation";
import type { UiPanel } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";
import { moveDescription } from "../ui/kit/moveContent";

// Reading never changes combatants. Only an explicit leader choice reorders the party.
export class BossBriefingScene implements Scene {
  private page: "plan" | "party" | "foes" = "plan";
  private foe?: Monster;
  private started = false;
  private style: TrainerStyle;
  constructor(private stack: SceneStack, private input: Input, private state: GameState,
    private trainer: TrainerDef, private team: Monster[], private begin: () => void,
    private cancel: () => void = () => {}) {
    this.style = trainerStyle(trainer.id);
    if (this.style.art) sceneImage(`boss:${this.style.art}`, `ui/boss/${this.style.art}.png`);
  }
  private leave(): void {
    if (this.started || this.stack.top !== this) return;
    this.input.reset(); audio.cancel();
    if (this.foe) { this.foe = undefined; return; }
    if (this.page !== "plan") { this.page = "plan"; return; }
    this.started = true; this.stack.pop(); this.cancel();
  }
  private start(): void {
    if (this.started || this.stack.top !== this || !this.state.party.some(mon => mon.hp > 0) || !this.team.length) return;
    this.started = true; this.input.reset(); audio.confirm(); this.stack.pop(); this.begin();
  }
  private leader(mon: Monster): void {
    if (this.started || this.stack.top !== this || this.page !== "party" || mon.hp <= 0) return;
    const index = this.state.party.indexOf(mon);
    if (index < 0) return;
    if (index > 0) { this.state.party.splice(index, 1); this.state.party.unshift(mon); saveGame(this.state); }
    this.page = "plan"; this.input.reset(); audio.confirm();
  }
  private hint(text: string): string {
    return readableCopy(text).replace(/START sceglie il leader/gi, "Scegli il compagno iniziale in Squadra")
      .replace(/A (?:inizia|sfida)/g, "Inizia la sfida")
      .replace(/B torna([^.;]*)/g, "puoi tornare$1 con Indietro")
      .replace(/B annulla/g, "Indietro annulla").replace(/B rinvia/g, "Indietro rinvia");
  }
  get uiPanel(): UiPanel {
    const back = { label: "Indietro", run: () => this.leave() };
    if (this.foe) {
      const foe = this.foe, index = this.team.indexOf(foe);
      const notes = preparationNotes(this.state, foe);
      const ability = abilityOf(foe), item = ITEMS[foe.heldItem ?? ""];
      const estimateStart = notes.indexOf("LA TUA SQUADRA: STIMA AL RIMPASTO, SENZA CRITICO.");
      const estimates = notes.slice(estimateStart + 1, -2);
      let estimateCursor = 0;
      const partyEstimates = this.state.party.map(mon => {
        const name = speciesOf(mon).name;
        const start = estimates.findIndex((line, index) => index >= estimateCursor && line.startsWith(`${name}:`));
        if (start < 0) return { title: name, body: "Stima non disponibile." };
        let end = start + 1;
        while (end < estimates.length && !this.state.party.some(other => estimates[end].startsWith(`${speciesOf(other).name}:`))) end++;
        estimateCursor = end;
        const forecasts = estimates.slice(start, end).filter(line => !line.startsWith("PREPARAZIONE:")).map(readableCopy);
        const preparation = mon.moves.filter(slot => slot.pp > 0 && MOVES[slot.id].effect?.stat?.target === "self")
          .map(slot => `${readableCopy(MOVES[slot.id].name)}. ${moveDescription(MOVES[slot.id])}`);
        return { title: `Stima · ${name}`, body: [...forecasts, ...preparation].join("\n\n") };
      });
      return { title: speciesOf(foe).name, subtitle: `Avversario ${index + 1} di ${this.team.length}. Stime prima della sfida, senza consumare turni o PP.`,
        portrait: { src: `/sprites/monsters/${foe.speciesId}.png`, label: speciesOf(foe).name },
        blocks: [{ title: "Identikit", facts: [{ label: "Livello", value: String(foe.level) },
          { label: "Tipo", value: speciesOf(foe).types.join(" · ") }, { label: "PV", value: `${foe.hp} di ${statsOf(foe).hp}` }] },
          { title: "Abilità", body: ability ? `${ability.name}: ${ability.desc}` : "Nessuna abilità." },
          { title: "Oggetto tenuto", body: item ? `${item.name}: ${item.desc}` : "Nessun oggetto." },
          ...foe.moves.map(slot => { const move = MOVES[slot.id]; return { title: move.name, body: moveDescription(move),
            facts: [{ label: "Tipo", value: move.type }, { label: "Categoria", value: move.category },
              { label: "Potenza", value: String(move.power) }, { label: "PP", value: `${slot.pp} di ${move.pp}` },
              { label: "Precisione", value: `${move.accuracy}%` }] }; }),
          { title: "Le stime della tua squadra", body: "Danno al cambio, senza colpi critici. Non è un risultato garantito: la mossa deve colpire e status o potenziamenti possono cambiarlo." },
          ...partyEstimates,
          { title: "Riprendi una mossa", body: "Squadra → compagno → Archivio mosse. Il confronto è gratuito; sono disponibili solo le mosse già imparate." }], actions: [], back };
    }
    const living = this.state.party.find(mon => mon.hp > 0);
    const ready = Boolean(living && this.team.length);
    const tabs = (["plan", "party", "foes"] as const).map((page, index) => ({ label: ["Piano", "Squadra", "Avversari"][index], run: () => {
      if (this.started || this.stack.top !== this || this.foe) return;
      this.page = page; this.input.reset(); audio.cursor();
    } }));
    const start = { label: "Inizia la sfida", disabled: !ready,
      hint: !living ? "Prima cura un compagno al bar." : undefined, run: () => this.start() };
    const common = { title: readableCopy(this.trainer.name), tabs,
      selectedTab: ["plan", "party", "foes"].indexOf(this.page), back };
    if (this.page === "party") return { ...common, subtitle: "Scegli chi apre il dibattito. Gli altri restano nello stesso ordine; PV, PP e oggetti non cambiano.",
      actions: this.state.party.map(mon => ({ label: speciesOf(mon).name, icon: `/sprites/monsters/${mon.speciesId}.png`,
        disabled: mon.hp <= 0, hint: mon.hp <= 0 ? "KO: prima torna al bar." : mon === living ? "Compagno iniziale attuale." : "Metti al primo posto e torna al piano.",
        facts: [{ label: "Livello", value: String(mon.level) }, { label: "PV", value: `${mon.hp} di ${statsOf(mon).hp}` },
          { label: "Tipo", value: speciesOf(mon).types.join(" · ") }, { label: "Stato", value: mon.status ?? "In forma" },
          { label: "Oggetto", value: mon.heldItem ? ITEMS[mon.heldItem]?.name ?? "Non noto" : "Nessuno" }], run: () => this.leader(mon) })) };
    if (this.page === "foes") return { ...common, subtitle: "Leggi mosse, abilità e stime prima di iniziare. La lettura non modifica la sfida.",
      actions: [...this.team.map((mon, index) => ({ label: speciesOf(mon).name, icon: `/sprites/monsters/${mon.speciesId}.png`,
        hint: `${index + 1} di ${this.team.length} · Apri il dossier`, facts: [{ label: "Livello", value: String(mon.level) },
          { label: "Tipo", value: speciesOf(mon).types.join(" · ") }], run: () => {
          if (this.started || this.stack.top !== this || this.page !== "foes" || !this.team.includes(mon)) return;
          this.foe = mon; this.input.reset(); audio.confirm();
        } })), start], primary: this.team.length };
    const types = TYPE_ORDER.filter(type => this.team.some(mon => speciesOf(mon).types.includes(type)));
    return { ...common, subtitle: readableCopy(this.style.label), image: this.style.art ? `/sprites/ui/boss/${this.style.art}.png` : undefined, imageHeight: 112,
      blocks: [{ title: "La sfida", facts: [{ label: "Difficoltà", value: this.state.hardMode ? "Difficile" : "Normale" },
        { label: "Avversari", value: String(this.team.length) },
        { label: "Livelli", value: this.team.length ? `${Math.min(...this.team.map(mon => mon.level))}–${Math.max(...this.team.map(mon => mon.level))}` : "Nessuno" },
        { label: "Tipi annunciati", value: types.join(" · ") || "Nessuno" }, { label: "Compagno iniziale", value: living ? speciesOf(living).name : "Nessuno pronto" },
        { label: "Prima apertura", value: this.team[0] ? speciesOf(this.team[0]).name : "Nessuna" }] },
        ...this.style.hints.map((hint, index) => ({ title: `Da sapere ${index + 1}`, body: this.hint(hint) }))], actions: [start], primary: 0 };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}

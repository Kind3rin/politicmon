import { companionHint, companionPosition } from "../ui/kit/companionContent";
import type { TouchAction } from "../engine/touchActions";
import { healingQuote, useHealingSupply, type HealingQuote } from "../game/supplyGuide";
import { BAG_ORDER, ITEMS } from "../data/items";
import { MOVES, STATUS_LABELS } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import { canLearnMove, learnMoveIntoSlot, evolve, heldItemOf, itemEvolution, speciesOf, statsOf, type Monster } from "../game/monster";
import { markCaught, markSeen, saveGame, type GameState } from "../game/state";
import { BAR_RESPAWN } from "../data/maps";
import { MessageBox } from "../ui/widgets";
import {itemIconPath} from "../art/items";
import type {UiPanel} from "../ui/kit";
import { SupplyView } from "../ui/SupplyView";
import { evolutionPreview } from "../game/evolutionGuide";
import { ABILITIES } from "../data/abilities";
import { moveDescription } from "../ui/kit/moveContent";
import { EvolutionScene } from "./EvolutionScene";

export interface BagOptions {
  inBattle: boolean;
  fromWorld?: boolean;
  quickHeal?: boolean;
  battleItem?: (itemId: string) => { hint: string; disabled: boolean };
  onUse?: (itemId: string) => void;
  onCampaign?: () => void;
}

export class BagScene implements Scene {
  private view: SupplyView;
  private quickPage = 0;
  private quickIndex = 0;
  private quickDone = false;
  private msg = new MessageBox();

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: BagOptions
  ) {
    this.view = new SupplyView(state, false, opts.inBattle);
    this.refresh();
  }

  private get quick(): boolean { return !!this.opts.quickHeal && !this.opts.inBattle; }
  private targets(): Monster[] { return this.state.party.slice(this.quickPage * 4, this.quickPage * 4 + 4); }
  private quickHint(mon: Monster, quote: HealingQuote | null): string {
    if (quote) return `${ITEMS[quote.id].name} x${quote.quantity} · PV ${quote.before} → ${quote.after}/${quote.max}`;
    return mon.hp <= 0 ? "KO: cura al bar" : mon.hp >= statsOf(mon).hp ? "PV pieni" : "Nessuna cura in borsa";
  }
  get touchActions(): readonly TouchAction[] | undefined {
    if (this.opts.inBattle && this.opts.battleItem) {
      this.refresh();
      const ids = this.view.ids.slice(Math.floor(this.view.menu.index / 3) * 3, Math.floor(this.view.menu.index / 3) * 3 + 3);
      const page = Math.floor(this.view.menu.index / 3);
      const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled, run: () => {
        if (disabled || this.stack.top !== this || this.msg.isOpen || Math.floor(this.view.menu.index / 3) !== page) return;
        this.input.reset(); run();
      } });
      return [...ids.map(id => { const info = this.opts.battleItem!(id); return action(ITEMS[id].name, `x${this.state.bag[id]} · ${info.hint}`, () => this.useBattleItem(id), info.disabled); }),
        ...Array.from({ length: 3 - ids.length }, () => action("—", "Nessun oggetto", () => {}, true)),
        action("ALTRI", "Altre riserve", () => { this.view.menu.index = (page + 1) * 3 < this.view.ids.length ? (page + 1) * 3 : 0; audio.cursor(); }, this.view.ids.length <= 3),
        action("CAMPAGNA", "Azioni che spendono sondaggi", () => { this.stack.pop(); this.opts.onCampaign?.(); }, !this.opts.onCampaign),
        action("INDIETRO", "Nessun oggetto o turno consumato", () => this.stack.pop())];
    }
    if (!this.quick) return undefined;
    const page = this.quickPage;
    const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled, run: () => {
      if (disabled || this.stack.top !== this || !this.quick || this.msg.isOpen || this.quickPage !== page) return;
      this.input.reset(); run();
    } });
    const targets = this.targets();
    return [...targets.map((mon) => {
      const quote = healingQuote(this.state, mon);
      return action(speciesOf(mon).name, this.quickHint(mon, quote), () => { if (quote) this.healQuick(mon, quote); }, !quote || this.msg.isOpen);
    }), ...Array.from({ length: 4 - targets.length }, () => action("—", "Nessun candidato", () => {}, true)),
      action(this.state.party.length > 4 ? "ALTRI" : "BORSA", this.state.party.length > 4 ? "Altra pagina della squadra" : "Status, schede e altri oggetti", () => {
        if (this.state.party.length > 4) { this.quickPage = (page + 1) % Math.ceil(this.state.party.length / 4); this.quickIndex = 0; }
        else this.opts.quickHeal = false;
        audio.cursor();
      }, this.msg.isOpen), action("INDIETRO", "Torna alla pausa", () => this.stack.pop(), this.msg.isOpen)];
  }
  private useBattleItem(itemId: string): void {
    if (this.stack.top !== this || !this.view.ids.includes(itemId) || (this.state.bag[itemId] ?? 0) < 1 || this.opts.battleItem?.(itemId).disabled) { audio.cancel(); return; }
    this.stack.pop(); this.opts.onUse?.(itemId);
  }
  private healQuick(mon: Monster, quote: HealingQuote): void {
    if (!useHealingSupply(this.state, mon, quote)) return;
    audio.heal(); saveGame(this.state); this.quickDone = true;
    this.msg.show([`${speciesOf(mon).name}: PV ${mon.hp}/${quote.max}.`], undefined, true, companionPosition(mon,this.state.party) || "Politicmon");
  }
  private updateQuick(): void {
    if (this.input.wasPressed("b")) { this.stack.pop(); return; }
    const targets = this.targets(), tap = this.input.consumeTap();
    if (this.input.wasPressed("up") || this.input.wasPressed("down")) {
      this.quickIndex = (this.quickIndex + (this.input.wasPressed("up") ? targets.length - 1 : 1)) % Math.max(1, targets.length); audio.cursor();
    }
    if (this.input.wasPressed("start")) { this.opts.quickHeal = false; return; }
    if (this.input.wasPressed("right") || this.input.wasPressed("left")) {
      this.quickPage = (this.quickPage + 1) % Math.max(1, Math.ceil(this.state.party.length / 4)); this.quickIndex = 0; return;
    }
    if (tap && tap.x >= 8 && tap.x < 232 && tap.y >= 38 && tap.y < 150) {
      this.quickIndex = Math.floor((tap.y - 38) / 28);
      const mon = targets[this.quickIndex], quote = mon && healingQuote(this.state, mon);
      if (mon && quote) this.healQuick(mon, quote);
    } else if (this.input.wasPressed("a")) {
      const mon = targets[this.quickIndex], quote = mon && healingQuote(this.state, mon);
      if (mon && quote) this.healQuick(mon, quote);
    }
  }

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      if (!this.msg.isOpen && this.quickDone) this.stack.pop();
      return;
    }
    if (this.quick) { this.updateQuick(); return; }
    this.refresh();
    const action = this.view.update(this.input);
    this.refresh();
    if (action === "cancel") {
      this.stack.pop();
      return;
    }
    if (action !== "select") {
      return;
    }
    const itemId = this.view.selected;
    if (!itemId) {
      return;
    }
    this.activate(itemId);
  }

  private activate(itemId: string, mon?: Monster, expectedHeld?: string): void {
    if (this.stack.top !== this || this.msg.isOpen || (this.state.bag[itemId] ?? 0) < 1) return;
    const item = ITEMS[itemId];
    if (this.opts.inBattle) { this.useBattleItem(itemId); return; }
    if (item.kind === "ball") {
      this.msg.show(["Qui non c’è nessuno da reclutare.", "Usa la scheda in una lotta contro un candidato selvatico."]); return;
    }
    if (item.kind === "key") { this.msg.show(["È sempre attivo, basta possederlo.", item.desc]); return; }
    if (item.kind === "field") { this.useFieldItem(itemId); return; }
    if (item.kind === "boost") { this.useBoostItem(itemId); return; }
    if (!mon || !this.state.party.includes(mon)) return;
    if (item.kind === "hold") {
      const current = heldItemOf(mon);
      if (current?.id !== expectedHeld || current?.id === itemId) return;
      if (current) this.state.bag[current.id] = (this.state.bag[current.id] ?? 0) + 1;
      mon.heldItem = itemId; this.consume(itemId); audio.confirm(); saveGame(this.state);
      this.msg.show([`${speciesOf(mon).name} ora tiene ${item.name}.`,
        ...(current ? [`${current.name} torna nella borsa.`] : [])], undefined, true); return;
    }
    if (item.kind === "evo") {
      const targetId = itemEvolution(mon, itemId);
      if (!targetId) return;
      const fromId = mon.speciesId;
      audio.confirm();
      this.stack.push(new EvolutionScene(this.stack, this.input, fromId, targetId, () => {
        if (!this.state.party.includes(mon) || mon.speciesId !== fromId || (this.state.bag[itemId] ?? 0) < 1
          || itemEvolution(mon, itemId) !== targetId) return;
        this.consume(itemId); evolve(mon, targetId); markSeen(this.state, targetId); markCaught(this.state, targetId); saveGame(this.state);
      }, {mon,reviewed:true,reduceEffects:this.state.reduceEffects,battleSpeed:this.state.battleSpeed}));
    }
  }

  // SPRAY ANTI-COMIZIO e TESSERA RIMBORSO SPESE (kind "field").
  // Vietati solo in battaglia (gestito da BattleScene.useItem): qui siamo
  // sempre fuori battaglia, quindi si usano e basta.
  private useFieldItem(itemId: string): void {
    if (itemId === "spray") {
      if (this.state.repellentSteps > 0) {
        this.msg.show(["Lo SPRAY è ancora attivo.", `Passi rimanenti: ${this.state.repellentSteps}.`]);
        return;
      }
      this.consume(itemId);
      this.state.repellentSteps = 150;
      audio.confirm();
      saveGame(this.state);
      this.msg.show([
        "PSSST! Una nube di par condicio ti avvolge.",
        "Niente candidati selvatici per 150 passi."
      ]);
      return;
    }
    if (itemId === "rimborso") {
      const city = this.state.lastBar && BAR_RESPAWN[this.state.lastBar] ? this.state.lastBar : "borgo";
      const spot = BAR_RESPAWN[city];
      this.consume(itemId);
      this.state.pos = { mapId: city, x: spot.x, y: spot.y, facing: "down" };
      audio.confirm();
      saveGame(this.state);
      // Chiude BORSA e MENU PAUSA: la WorldScene sottostante rileva il cambio
      // di mappa (riconciliazione in update) e ricarica la destinazione.
      this.stack.pop(); // BagScene
      if (!this.opts.fromWorld) this.stack.pop(); // Optional pause beneath the bag
      return;
    }
    this.msg.show(["Non succede niente. Sospetto."]);
  }

  // CAMPAGNA ELETTORALE (kind "boost"): attiva il buff a tempo. Se è già attivo,
  // RICARICA il contatore (non stacka indefinitamente: si somma ma è comunque un
  // sink). Consuma l'item e salva.
  private useBoostItem(itemId: string): void {
    const item = ITEMS[itemId];
    const boost = item.boost;
    if (!boost) {
      this.msg.show(["Non succede niente. Sospetto."]);
      return;
    }
    this.state[boost.field] += boost.battles;
    this.consume(itemId);
    audio.confirm();
    saveGame(this.state);
    this.msg.show([
      `${item.name} lanciato sul territorio!`,
      `Effetto attivo per le prossime ${this.state[boost.field]} battaglie.`
    ]);
  }

  private refresh(): void {
    this.view.sync(BAG_ORDER.filter((id) => (this.state.bag[id] ?? 0) > 0 && (!this.opts.inBattle || ["ball", "heal", "cure"].includes(ITEMS[id].kind))), (id) => `x${this.state.bag[id]}`);
  }

  private consume(itemId: string): void {
    this.state.bag[itemId] = Math.max(0, (this.state.bag[itemId] ?? 0) - 1);
    this.refresh();
  }

  /** Show the recipient and the dose together: selecting a cure is the use,
   * rather than opening another roster. The quote is checked again at commit. */
  private fieldActions(ids: readonly string[]): TouchAction[] {
    const ordered = [...ids.filter(id => ["heal", "cure"].includes(ITEMS[id].kind)),
      ...ids.filter(id => !["heal", "cure"].includes(ITEMS[id].kind))];
    return ordered.flatMap(id => {
      const item = ITEMS[id];
      const name = item.name.charAt(0) + item.name.slice(1).toLocaleLowerCase("it");
      const description = item.desc.replace(/^Da tenere: /,'');
      const icon = itemIconPath(id) ? `/sprites/${itemIconPath(id)}` : undefined;
      if (["heal", "cure"].includes(item.kind) && this.state.party.length) {
        return this.state.party.map(mon => {
          const quote = item.kind === "heal" ? healingQuote(this.state, mon, id) : null;
          const status = mon.status;
          const disabled = item.kind === "heal" ? !quote : !status;
          return {
            group: name, groupHint:item.desc, label: `Cura ${speciesOf(mon).name}`, icon,
            hint: companionHint(mon, this.state.party, item.kind === "heal" ? quote ? "Non cambia PP o stato." : this.quickHint(mon, null)
              : status ? "Rimuove lo stato. Non recupera PV o PP." : "In forma. Nessun consumo."),
            facts: [
              {label: "In borsa", value: String(this.state.bag[id])},
              {label: item.kind === "heal" ? "PV" : "Stato", value: item.kind === "heal"
                ? quote ? `${quote.before} → ${quote.after} di ${quote.max}` : `${mon.hp} di ${statsOf(mon).hp}`
                : status ? `${STATUS_LABELS[status]} → In forma` : "In forma"},
              {label: "Consumo", value: disabled ? "Nessuno" : "1 dose"}
            ], disabled,
            run: () => {
              if (this.stack.top !== this || this.msg.isOpen || disabled
                || !this.state.party.includes(mon) || (this.state.bag[id] ?? 0) < 1) return;
              if (item.kind === "heal") {
                if (!quote || !useHealingSupply(this.state, mon, quote)) return;
              } else {
                if (!status || mon.status !== status) return;
                mon.status = null; this.consume(id);
              }
              this.input.reset(); audio.heal(); this.refresh(); saveGame(this.state);
              this.msg.show([item.kind === "heal" ? `${speciesOf(mon).name}: PV ${mon.hp}/${statsOf(mon).hp}.`
                : `${speciesOf(mon).name}: stato rimosso.`], undefined, true, companionPosition(mon, this.state.party) || "Politicmon");
            }
          };
        });
      }
      if (item.kind === "tm" && item.moveId && this.state.party.length) {
        const moveId=item.moveId,move=MOVES[moveId];
        return this.state.party.flatMap<TouchAction>(mon => {
          const ready=canLearnMove(mon,moveId),slots=mon.moves.length>=4?mon.moves:[undefined];
          const group=`${name} · ${speciesOf(mon).name} · ${companionPosition(mon,this.state.party)}`;
          const common={group,groupHint:`Nuova mossa: ${move.name}.\n\n${moveDescription(move)}\n\nIl tocco applica la sostituzione. Le altre mosse e i loro PP restano.`,icon,
            groupFacts:[{label:"Tipo nuovo",value:move.type},{label:"Potenza nuova",value:String(move.power)},
              {label:"PP nuovi",value:String(move.pp)},{label:"Precisione",value:`${move.accuracy}%`}]};
          if(!ready)return [{...common,label:`${speciesOf(mon).name}: non disponibile`,
            hint:mon.moves.some(slot=>slot.id===moveId)?"Conosce già questa mossa.":"Il tipo non è compatibile.",disabled:true,run:()=>{}}];
          return slots.map(slot => ({...common,
            label:slot?`${speciesOf(mon).name}: ${MOVES[slot.id].name} → ${move.name}`:`Insegna ${move.name} a ${speciesOf(mon).name}`,
            hint:slot?moveDescription(MOVES[slot.id]):"Un posto libero. Le mosse attuali e i loro PP restano.",
            facts:[...(slot?[{label:"Tipo prima",value:MOVES[slot.id].type},{label:"Tipo dopo",value:move.type},
              {label:"Potenza",value:`${MOVES[slot.id].power} → ${move.power}`},
              {label:"PP",value:`${slot.pp} → ${move.pp}`}]:[]),{label:"Consumo",value:"Direttiva riutilizzabile"}],
            run:()=>{
              if(this.stack.top!==this||this.msg.isOpen||!this.state.party.includes(mon)||(this.state.bag[id]??0)<1
                ||!canLearnMove(mon,moveId)||!learnMoveIntoSlot(mon,moveId,slot))return;
              this.input.reset();this.state.flags["used-directive"]=true;markSeen(this.state,mon.speciesId);saveGame(this.state);audio.levelUp();
              this.msg.show([`${speciesOf(mon).name} adotta ${move.name}.`],undefined,true);
            }
          }));
        });
      }
      if (["hold", "evo"].includes(item.kind) && this.state.party.length) {
        return this.state.party.map(mon => {
          const held = heldItemOf(mon);
          const target = item.kind === "evo" ? itemEvolution(mon, id) : undefined;
          const preview = target ? evolutionPreview(mon,target) : undefined;
          const before=statsOf(mon),after=preview?statsOf(preview):undefined,previewHp=mon.hp;
          const from=speciesOf(mon),to=preview?speciesOf(preview):undefined;
          const ability=to?.ability?ABILITIES[to.ability]:undefined;
          const disabled = item.kind === "hold" ? held?.id === id
            : !target;
          return {
            group:name, groupHint:description.charAt(0).toLocaleUpperCase('it')+description.slice(1), icon, label:`${item.kind === "hold" ? "Affida a" : "Evolvi"} ${speciesOf(mon).name}`,
            hint:companionHint(mon, this.state.party, item.kind === "hold" ? disabled ? "Tiene già questo oggetto. Nessuno scambio."
              : held ? "Il vecchio oggetto torna nella borsa." : "Un solo oggetto per compagno."
              : target ? `Il tocco avvia l’evoluzione.\n\nMosse, PP, stato e oggetto restano. La forma meme si azzera.\n\n${ability?.name ?? "Nessuna abilità"}: ${ability?.desc ?? "nessuna passiva."}` : "Non evolve con questa tessera."),
            facts:[{label:"In borsa",value:String(this.state.bag[id])},
              ...(item.kind === "hold" ? [{label:"Oggetto tenuto",value:`${held?.name ?? "Nessuno"} → ${name}`}]
                : target&&after&&to ? [
                  {label:"Nuova forma",value:to.name},
                  ...(["hp","atk","def","spc","spd"] as const).map((key,i)=>({label:["PV massimi","Grinta","Faccia tosta","Retorica","Opportunismo"][i],value:`${before[key]} → ${after[key]}`})),
                  {label:"PV attuali",value:`${mon.hp} → ${preview!.hp}`},{label:"Tipo prima",value:from.types.join(" · ")},
                  {label:"Tipo dopo",value:to.types.join(" · ")}]:[{label:"Nuova forma",value:"Nessuna"}]),
              {label:"Consumo",value:disabled ? "Nessuno" : item.kind === "evo" ? "1 tessera" : "Spostato dalla borsa"}],
            disabled, run:() => {
              if (this.stack.top !== this || this.msg.isOpen || disabled || !this.state.party.includes(mon)
                || (item.kind === "hold" && heldItemOf(mon)?.id !== held?.id)
                || (item.kind === "evo" && (itemEvolution(mon,id) !== target || JSON.stringify(statsOf(mon)) !== JSON.stringify(before) || mon.hp !== previewHp))) return;
              this.input.reset(); this.activate(id,mon,held?.id);
            }
          };
        });
      }
      return [{group: "Oggetti e preparazione", label: name, icon, hint: item.desc,
        facts: [{label: "Quantità", value: String(this.state.bag[id])}], run: () => {
          if (this.stack.top !== this || this.msg.isOpen) return;
          this.input.reset(); this.view.menu.index = this.view.ids.indexOf(id); this.activate(id);
        }}];
    });
  }

  private tab = 0;
  private picked?: string;
  private pickedMon?: Monster;
  private nice(id: string): string { const name = ITEMS[id].name; return name.charAt(0) + name.slice(1).toLocaleLowerCase("it"); }
  private gist(id: string): string {
    return ITEMS[id].desc.replace(/^Da tenere: /, "").split(/(?<=[.!?])\s/)[0];
  }
  private categoryOf(id: string): number {
    const kind = ITEMS[id].kind;
    return kind === "heal" || kind === "cure" ? 0 : kind === "ball" ? 1 : kind === "key" ? 3 : 2;
  }
  private companionRow(mon: Monster, run: () => void, disabled: boolean, right?: string, meta?: string): TouchAction {
    const stats = statsOf(mon);
    return { label: speciesOf(mon).name, disabled, run, row: { kind: "companion", icon: `/sprites/monsters/${mon.speciesId}.png`, level: `Lv${mon.level}`,
      types: speciesOf(mon).types, bar: { now: Math.max(0, mon.hp), max: stats.hp, text: `${Math.max(0, mon.hp)}/${stats.hp}` },
      right, meta, stamp: mon.hp <= 0 ? "KO" : undefined } };
  }
  /** One row per companion for the picked item; the effect is previewed in the row itself. */
  private recipientRows(id: string): TouchAction[] {
    const item = ITEMS[id], party = this.state.party;
    const actions = this.fieldActions([id]);
    if (item.kind === "tm" && item.moveId) {
      const moveId = item.moveId;
      return party.map(mon => {
        const ready = canLearnMove(mon, moveId);
        const meta = ready ? undefined : mon.moves.some(slot => slot.id === moveId) ? "La conosce già" : "Tipo non compatibile";
        return this.companionRow(mon, () => { if (ready && this.stack.top === this && !this.msg.isOpen) { this.input.reset(); audio.cursor(); this.pickedMon = mon; } }, !ready, undefined, meta);
      });
    }
    return party.map((mon, i) => {
      const action = actions[i];
      let right: string | undefined, meta: string | undefined;
      if (item.kind === "heal") { const quote = healingQuote(this.state, mon, id); right = quote ? `${quote.before} → ${quote.after}` : undefined; meta = quote ? undefined : this.quickHint(mon, null); }
      else if (item.kind === "cure") { right = mon.status ? `${STATUS_LABELS[mon.status]} → ok` : undefined; meta = mon.status ? undefined : "In forma"; }
      else if (item.kind === "hold") { const held = heldItemOf(mon); meta = held?.id === id ? "Lo tiene già" : held ? `Sostituisce ${held.name}` : "Nessun oggetto"; }
      else if (item.kind === "evo") { const target = itemEvolution(mon, id); meta = target ? undefined : "Non evolve con questa"; right = target ? `→ ${speciesOf(evolutionPreview(mon, target)).name}` : undefined; }
      return this.companionRow(mon, action?.run ?? (() => {}), Boolean(action?.disabled), right, meta);
    });
  }
  private slotRows(id: string, mon: Monster): TouchAction[] {
    const slots = mon.moves.length >= 4 ? mon.moves : [undefined];
    const actions = this.fieldActions([id]).filter(action => action.group?.includes(`· ${speciesOf(mon).name} · `));
    return slots.map((slot, i) => {
      const old = slot && MOVES[slot.id];
      return { label: old ? old.name : "Posto libero", run: actions[i]?.run ?? (() => {}), disabled: !actions[i] || Boolean(actions[i].disabled),
        row: { kind: "move", tone: old?.type, types: old ? [old.type] : undefined, right: old && slot ? `${slot.pp}/${old.pp}` : "nuova", meta: old ? "Sostituisci" : "Impara qui" } };
    });
  }
  get uiPanel():UiPanel|undefined {
    if(this.msg.isOpen)return undefined;
    const party=this.state.party;
    const back:TouchAction={label:'Indietro',run:()=>{
      if(this.stack.top!==this)return;this.input.reset();audio.cancel();
      if(this.pickedMon)this.pickedMon=undefined;else if(this.picked)this.picked=undefined;else this.stack.pop();
    }};
    if(this.quick){
      return {title:'Cura rapida',fit:true,back:{label:'Indietro',run:()=>{if(this.stack.top===this){this.input.reset();audio.cancel();this.stack.pop();}}},
        actions:[...party.map(mon=>{const quote=healingQuote(this.state,mon);
          return this.companionRow(mon,()=>{if(quote&&this.stack.top===this&&!this.msg.isOpen){this.input.reset();this.healQuick(mon,quote);}},!quote,
            quote?`${quote.before} → ${quote.after}`:undefined,quote?`${ITEMS[quote.id].name} ×${quote.quantity}`:this.quickHint(mon,null));}),
          {label:'Altri oggetti',run:()=>{if(this.stack.top===this){this.input.reset();this.opts.quickHeal=false;audio.cursor();}}}]};
    }
    this.refresh();
    const ids=this.view.ids;
    if(this.opts.inBattle){
      const rows=ids.map((id):TouchAction=>{const info=this.opts.battleItem?.(id);
        return {label:this.nice(id),disabled:Boolean(info?.disabled),run:()=>{if(this.stack.top===this&&!info?.disabled){this.input.reset();this.useBattleItem(id);}},
          row:{kind:'item',icon:itemIconPath(id)?`/sprites/${itemIconPath(id)}`:undefined,right:`×${this.state.bag[id]}`,meta:info?.hint??this.gist(id)}};});
      if(this.opts.onCampaign)rows.push({label:'Campagna',hint:'Azioni che spendono sondaggi',run:()=>{if(this.stack.top===this){this.stack.pop();this.opts.onCampaign?.();}}});
      return {title:'Borsa',blocks:ids.length?undefined:[{title:'Borsa vuota',body:'Niente da usare in lotta.'}],actions:rows,back};
    }
    if(this.picked&&(this.state.bag[this.picked]??0)<1){this.picked=undefined;this.pickedMon=undefined;}
    if(this.picked){
      const id=this.picked,item=ITEMS[id];
      if(this.pickedMon&&item.kind==='tm'){
        const move=MOVES[item.moveId!];
        return {title:move.name,subtitle:'Quale mossa sostituire?',actions:this.slotRows(id,this.pickedMon),back};
      }
      return {title:this.nice(id),subtitle:this.gist(id),fit:true,actions:this.recipientRows(id),selected:0,back};
    }
    const tabs:TouchAction[]=['Cure','Schede','Kit','Chiave'].map((label,i)=>({label,run:()=>{if(this.stack.top===this){this.tab=i;audio.cursor();}}}));
    const visible=ids.filter(id=>this.categoryOf(id)===this.tab);
    const rows=visible.map((id):TouchAction=>({label:this.nice(id),run:()=>{
      if(this.stack.top!==this||this.msg.isOpen)return;this.input.reset();audio.cursor();
      const kind=ITEMS[id].kind;
      if(["heal","cure","hold","evo","tm"].includes(kind)&&party.length)this.picked=id;
      else{this.view.menu.index=ids.indexOf(id);this.activate(id);}
    },row:{kind:'item',icon:itemIconPath(id)?`/sprites/${itemIconPath(id)}`:undefined,right:`×${this.state.bag[id]}`,meta:this.gist(id)}}));
    return {title:'Borsa',tabs,selectedTab:this.tab,blocks:visible.length?undefined:[{title:'Vuoto',body:'Nessun oggetto in questa sezione.'}],actions:rows,selected:0,back};
  }
  draw(screen:Screen):void {screen.clear('#101b32');if(this.msg.isOpen)this.msg.draw(screen);}
}

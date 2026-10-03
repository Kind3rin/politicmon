import { companionHint, companionPosition } from "../ui/kit/companionContent";
import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { TouchAction } from "../engine/touchActions";
import type { Screen } from "../engine/screen";
import { learnMoveIntoSlot, speciesOf, type Monster } from "../game/monster";
import { moveNotes } from "../game/supplyGuide";
import { Menu, MessageBox, wrapText } from "../ui/widgets";
import type {UiPanel,UiBlock} from "../ui/kit";
import {moveDescription} from "../ui/kit/moveContent";

export class TeachScene implements Scene {
  readonly expandedViewport = true;
  readonly touchLayout = "growth" as const;
  private menu: Menu;
  private msg = new MessageBox();
  private done = false;
  private confirm = false;
  private inspect = false;
  private page = 0;
  private scroll = 0;
  private viewHeight = 180;
  private replacement?: Monster["moves"][number];
  constructor(private stack: SceneStack, private input: Input, private mon: Monster, private moveId: string,
    private onLearned: () => void, private options: { party?: readonly Monster[]; source?: "level" | "directive" | "archive" } = {}) {
    this.menu = new Menu(mon.moves.map(slot => ({ label: MOVES[slot.id].name, rightLabel: `PP ${slot.pp}` })));
  }
  private get old() { return this.mon.moves.length >= 4 ? this.mon.moves[this.menu.index] : undefined; }
  private get phase() { return Number(this.confirm) + Number(this.inspect) * 2 + this.page * 4; }
  private lines(): string[] {
    const slot = this.page === 1 ? this.old : undefined;
    return moveNotes(this.mon, slot?.id ?? this.moveId, slot?.pp).flatMap(line => wrapText(line, 35));
  }
  private scrollText(delta: number): void { this.scroll = Math.max(0, Math.min(Math.max(0, this.lines().length - 9), this.scroll + delta)); }
  private close(): void { this.done = true; audio.cancel(); this.stack.pop(); }
  private learn(): void {
    if (this.done || this.stack.top !== this) return;
    if (this.confirm && this.old !== this.replacement) { this.confirm = false; return; }
    if (this.mon.moves.some(slot => slot.id === this.moveId)) { this.close(); return; }
    if (!learnMoveIntoSlot(this.mon, this.moveId, this.old)) return;
    this.done = true; this.onLearned(); audio.levelUp();
    this.msg.show([`${speciesOf(this.mon).name} adotta ${MOVES[this.moveId].name}.`], () => { if (this.stack.top === this) this.stack.pop(); }, true, companionPosition(this.mon, this.options.party) || "Politicmon");
  }
  private choose(): void {
    if (this.old) { this.replacement = this.old; this.confirm = true; this.inspect = false; }
    else this.learn();
    audio.confirm();
  }
  get touchActions(): readonly TouchAction[] {
    const phase = this.phase, old = this.old;
    const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled: disabled || this.done, run: () => {
      if (disabled || this.done || this.stack.top !== this || phase !== this.phase || old !== this.old) return;
      this.input.reset(); run();
    } });
    const info = (page: number) => { this.inspect = true; this.page = page; this.scroll = 0; audio.cursor(); };
    if (this.inspect) return [action("NUOVA", "Tutti gli effetti", () => info(0)), action("ATTUALE", "Tutti gli effetti", () => info(1), !old),
      action("SU", "Testo precedente", () => this.scrollText(-1), this.scroll === 0), action("GIÙ", "Altri dettagli", () => this.scrollText(1), this.scroll >= this.lines().length - 9),
      action("INDIETRO", "Torna alla scelta", () => { this.inspect = false; }), action("RINUNCIA", "Nessuna perdita", () => this.close())];
    if (this.confirm) return [action("APPRENDI", "Gli altri PP restano", () => this.learn()), action("RIPENSA", "Altra mossa", () => { this.confirm = false; }),
      action("DETTAGLI", "Tutti gli effetti", () => info(0)),
      action("RINUNCIA", "Nessuna perdita", () => this.close())];
    if (this.mon.moves.length < 4) return [action("APPRENDI", "Nessuna perdita", () => this.choose()),
      action("DETTAGLI", "Tutti gli effetti", () => info(0)), action("RINUNCIA", "Nessuna perdita", () => this.close())];
    return [...this.mon.moves.map((slot, i) => action(MOVES[slot.id].name, `${MOVES[slot.id].type} · ${slot.pp} PP · sostituisci`, () => {
      if (this.mon.moves[i] !== slot) return;
      this.menu.index = i; this.choose();
    })), action("DETTAGLI", "Tutti gli effetti", () => info(0)), action("RINUNCIA", "Nessuna perdita", () => this.close())];
  }
  update(dt: number): void {
    if (this.msg.isOpen) { this.msg.update(dt, this.input, this.viewHeight); return; }
    if (this.done) return;
    if (this.inspect) {
      if (this.input.wasPressed("b") || this.input.wasPressed("start")) { this.inspect = false; return; }
      if (this.old && (this.input.wasPressed("left") || this.input.wasPressed("right"))) { this.page = 1 - this.page; this.scroll = 0; }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      this.scrollText(delta); return;
    }
    if (this.input.wasPressed("start")) { this.inspect = true; this.scroll = 0; return; }
    if (this.confirm) {
      if (this.input.wasPressed("b")) { this.confirm = false; return; }
      if (this.input.wasPressed("a")) this.learn(); return;
    }
    const action = this.mon.moves.length >= 4 ? this.menu.update(this.input) : this.input.wasPressed("a") ? "select" : this.input.wasPressed("b") ? "cancel" : null;
    if (action === "cancel") this.close(); if (action === "select") this.choose();
  }
  private moveCard(id:string,pp:number,title:string):UiBlock {
    const move=MOVES[id];
    return {title:`${title}: ${move.name}`,body:moveDescription(move),facts:[{label:'Tipo',value:move.type},{label:'Potenza',value:move.power?String(move.power):'—'},{label:'PP',value:`${pp} di ${move.pp}`},{label:'Precisione',value:`${move.accuracy}%`}]};
  }
  get uiPanel():UiPanel|undefined {
    if(this.msg.isOpen)return undefined;
    const phase=this.phase,old=this.old;
    const blocks=[this.moveCard(this.moveId,MOVES[this.moveId].pp,'Nuova mossa')];
    if(this.confirm&&old)blocks.push(this.moveCard(old.id,old.pp,'Mossa sostituita'));
    if(this.inspect&&this.page===1&&old)blocks.splice(0,1,this.moveCard(old.id,old.pp,'Mossa attuale'));
    let actions=this.touchActions.filter(action=>!['RINUNCIA','RIPENSA','INDIETRO','SU','GIÙ'].includes(action.label)).map(action=>({...action,label:action.label==='APPRENDI'?'Impara la mossa':action.label.charAt(0)+action.label.slice(1).toLocaleLowerCase('it'),hint:action.hint?.replace('Gli altri PP restano','Le altre mosse mantengono i loro PP.').replace('Nessuna perdita','Le mosse attuali restano.')}));
    // The native list is itself the comparison: the outgoing move and its
    // remaining PP are shown before the decision, so no second approval page.
    if(!this.inspect&&!this.confirm&&this.mon.moves.length>=4){
      actions=this.mon.moves.map((slot,index)=>({
        label:`Sostituisci ${MOVES[slot.id].name}`,hint:moveDescription(MOVES[slot.id]),
        facts:[{label:'Tipo',value:MOVES[slot.id].type},{label:'Potenza',value:MOVES[slot.id].power ? String(MOVES[slot.id].power) : "—"},
          {label:'PP persi',value:`${slot.pp} di ${MOVES[slot.id].pp}`}],disabled:this.done,
        run:()=>{
          if(this.done||this.stack.top!==this||phase!==this.phase||this.mon.moves[index]!==slot)return;
          this.input.reset();this.menu.index=index;this.replacement=slot;this.confirm=true;this.learn();
        }
      }));
    }
    return {title:`${speciesOf(this.mon).name}: ${MOVES[this.moveId].name}`,
      subtitle:companionHint(this.mon, this.options.party ?? [], this.inspect?`Leggi gli effetti prima di scegliere. ${this.options.source==='archive'?'Archivio gratuito.':this.options.source==='level'?'Appresa salendo di livello.':'Direttiva riutilizzabile.'}`:this.confirm?'Perderai solo la mossa indicata sotto.':this.mon.moves.length>=4?'Scegli quale mossa sostituire. Il tocco applica la scelta; le altre mosse e i loro PP restano.':'C’è un posto libero. Non perdi nessuna mossa.'),
      blocks,actions:actions,selected:this.confirm||this.inspect?0:this.menu.index,primary:this.confirm||this.mon.moves.length<4?0:undefined,
      back:{label:'Indietro',hint:this.confirm?'Scegli un’altra mossa.':this.inspect?'Torna alla scelta.':'Rinuncia: nessuna mossa cambia.',run:()=>{if(this.done||this.stack.top!==this||phase!==this.phase||old!==this.old)return;this.input.reset();audio.cancel();if(this.inspect)this.inspect=false;else if(this.confirm)this.confirm=false;else this.close();}}};
  }
  draw(screen:Screen):void {screen.clear('#101b32');if(this.msg.isOpen)this.msg.draw(screen);}
}

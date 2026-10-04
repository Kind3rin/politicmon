import { companionPosition } from "../ui/kit/companionContent";
import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { TouchAction } from "../engine/touchActions";
import type { Screen } from "../engine/screen";
import { learnMoveIntoSlot, speciesOf, type Monster } from "../game/monster";
import { moveNotes } from "../game/supplyGuide";
import { Menu, MessageBox, wrapText } from "../ui/widgets";
import type {UiPanel} from "../ui/kit";
import {moveDescription} from "../ui/kit/moveContent";
import {openUiSheet} from "../ui/kit/sheet";

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
  private sheet(id:string,pp:number,heading:string):()=>void {
    const move=MOVES[id];
    return ()=>openUiSheet(`${heading}: ${move.name}`,`${moveDescription(move)}\n\nTipo ${move.type} · Potenza ${move.power||'—'} · Precisione ${move.accuracy}% · PP ${pp}/${move.pp}`);
  }
  get uiPanel():UiPanel|undefined {
    if(this.msg.isOpen)return undefined;
    const phase=this.phase,old=this.old,fresh=MOVES[this.moveId],species=speciesOf(this.mon);
    const guard=(run:()=>void)=>()=>{if(this.done||this.stack.top!==this||phase!==this.phase||old!==this.old)return;this.input.reset();run();};
    const source=this.options.source==='archive'?'Archivio gratuito':this.options.source==='level'?'Appresa salendo di livello':'Direttiva riutilizzabile';
    const showNew=this.sheet(this.moveId,fresh.pp,'Nuova');
    const rows:TouchAction[]=[{label:fresh.name,run:showNew,onInspect:showNew,
      row:{kind:'move',tone:fresh.type,types:[fresh.type],right:`${fresh.pp}/${fresh.pp}`,stamp:'Nuova'}}];
    const replacing=this.mon.moves.length>=4;
    if(replacing){
      this.mon.moves.forEach((slot,index)=>{
        const current=MOVES[slot.id],show=this.sheet(slot.id,slot.pp,'Attuale');
        rows.push({label:current.name,group:index===0?'Quale mossa lasci?':undefined,disabled:this.done,onInspect:show,
          row:{kind:'move',tone:current.type,types:[current.type],right:`${slot.pp}/${current.pp}`,meta:'Tocca per sostituire'},
          run:guard(()=>{if(this.mon.moves[index]!==slot)return;this.menu.index=index;this.replacement=slot;this.confirm=true;this.learn();})});
      });
    }else rows.push({label:'Impara la mossa',run:guard(()=>this.choose())});
    return {title:'Nuova mossa',subtitle:`${species.name} Lv${this.mon.level} · ${source}`,portrait:{src:`/sprites/monsters/${this.mon.speciesId}.png`,label:species.name},
      actions:rows,selected:replacing?this.menu.index+1:rows.length-1,primary:replacing?undefined:rows.length-1,
      back:{label:'Non imparare',run:guard(()=>this.close())}};
  }
  draw(screen:Screen):void {screen.clear('#101b32');if(this.msg.isOpen)this.msg.draw(screen);}
}

import { companionHint } from "../ui/kit/companionContent";
import { MOVES, STATUS_LABELS, moveSummary } from "../data/moves";
import { ITEMS } from "../data/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type {Screen} from "../engine/screen";
import { abilityOf, canLearnMove, heldItemOf, evolve, levelEvolution, speciesOf, statsOf, type Monster } from "../game/monster";
import { markCaught, markSeen, saveGame } from "../game/state";
import { moveCompanion, placeLabel } from "../game/partyOrder";
import type { TouchAction } from "../engine/touchActions";
import { careerNotes } from "../game/evolutionGuide";
import { evolutionCondition, defensiveMatchups } from "../game/dexGuide";
import { EvolutionScene } from "./EvolutionScene";
import { RecallScene } from "./RecallScene";
import { archivedMoves } from "../game/moveArchive";
import type { GameState } from "../game/state";
import {wrapText} from "../ui/widgets";
import type {UiPanel,UiBlock} from "../ui/kit";
import {moveDescription} from "../ui/kit/moveContent";
import {openUiSheet} from "../ui/kit/sheet";

export interface PartyOptions {
  mode: "view" | "battle-switch" | "forced-switch" | "use-item";
  currentUid?: string;
  title?: string; // intestazione personalizzata (es. nomina di un ministro)
  // Quando si sta usando una DIRETTIVA: marca chi può impararla (✓/✗ in lista).
  directiveMoveId?: string;
  // Squadra alternativa (es. i MIRROR del DUELLO PvP): la scena opera su
  // questa lista invece di state.party, che resta intoccato.
  partyOverride?: Monster[];
  onInspect?: (mon: Monster) => void;
  switchHint?: (mon: Monster) => string;
  itemPreview?: (mon: Monster) => { hint: string; facts?: TouchAction["facts"]; disabled?: boolean };
  freeSwitch?: boolean;
  onChoose?: (mon: Monster) => void;
}

export class PartyScene implements Scene {
  get expandedViewport(): boolean { return this.opts.mode === "view"; }
  get touchLayout(): "growth" | undefined { return this.opts.mode === "view" ? "growth" : undefined; }
  private index = 0;
  private summary: Monster | null = null;
  private moveFrom: number | null = null; // slot "preso" per lo scambio (mode view)
  /** Native list in reorder mode: taps pick and place, rows can also be dragged. */
  private reordering = false;
  private movedNote = "";
  /** After switching mode the keyboard cursor stays on the Riordina/Fatto button instead of jumping to the top. */
  private cursorOnToggle = false;
  // Cursore nel DETTAGLIO: scorre le voci ispezionabili (mosse + abilità) per
  // mostrarne la descrizione in basso. -1 = nessuna selezione (vista neutra).
  private detailIndex = 0;
  private summaryPage = 0;
  private summaryScroll = 0;
  private visibleLines = 7;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: PartyOptions
  ) {
    if (opts.mode === "battle-switch" || opts.mode === "forced-switch") {
      this.index = Math.max(0, (opts.partyOverride ?? state.party).findIndex(mon => mon.hp > 0 && mon.uid !== opts.currentUid));
    }
  }

  private chooseSwitch(mon: Monster): void {
    if (this.stack.top !== this || !(this.opts.partyOverride ?? this.state.party).includes(mon) || mon.hp <= 0 || mon.uid === this.opts.currentUid) return;
    this.input.reset(); audio.confirm(); this.stack.pop(); this.opts.onChoose?.(mon);
  }

  private chooseItem(mon: Monster): void {
    if (this.stack.top !== this || this.opts.mode !== "use-item" || !(this.opts.partyOverride ?? this.state.party).includes(mon) ||
      this.opts.itemPreview?.(mon).disabled || (this.opts.directiveMoveId && !canLearnMove(mon, this.opts.directiveMoveId))) return;
    this.input.reset(); audio.confirm(); this.stack.pop(); this.opts.onChoose?.(mon);
  }

  private openEvolution(mon: Monster): void {
    const target = levelEvolution(mon, this.state.sondaggi);
    if (!target || this.opts.partyOverride) return;
    this.stack.push(new EvolutionScene(this.stack, this.input, mon.speciesId, target, () => {
      evolve(mon, target); markSeen(this.state, target); markCaught(this.state, target); saveGame(this.state); this.summaryScroll = 0;
    }, { mon, reduceEffects: this.state.reduceEffects, battleSpeed: this.state.battleSpeed }));
  }
  private nextCandidate(): void {
    const party = this.opts.partyOverride ?? this.state.party;
    this.index = (this.index + 1) % party.length;
    this.summary = party[this.index]; this.detailIndex = 0; this.summaryScroll = 0;
  }
  private canReorder(): boolean {
    return this.opts.mode === "view" && !this.opts.partyOverride && this.state.party.length > 1;
  }

  /** One rule for a tap on a place, a drag released over a row and the START chord. */
  private placeCompanion(from: number, to: number): boolean {
    const party = this.state.party, mon = party[from];
    if (!this.canReorder() || !moveCompanion(party, from, to)) return false;
    this.index = to; this.moveFrom = null; this.cursorOnToggle = false;
    this.movedNote = `${speciesOf(mon).name} ora è ${placeLabel(to)}.`;
    saveGame(this.state);
    return true;
  }

  private toggleReorder(): void {
    if (!this.canReorder()) return;
    this.reordering = !this.reordering; this.moveFrom = null; this.movedNote = ""; this.cursorOnToggle = true;
  }

  /** Tap while reordering: the first tap picks a companion up, the second puts it down there. */
  private reorderTap(index: number): void {
    this.cursorOnToggle = false;
    if (this.moveFrom === null) { this.moveFrom = index; this.movedNote = ""; this.index = index; return; }
    if (this.moveFrom === index) { this.moveFrom = null; return; }
    if (!this.placeCompanion(this.moveFrom, index)) this.moveFrom = null;
  }

  get touchActions(): readonly TouchAction[] | undefined {
    const mon = this.summary;
    if (!mon && (this.opts.mode === "battle-switch" || this.opts.mode === "forced-switch")) {
      const bench = (this.opts.partyOverride ?? this.state.party).filter(target => target.uid !== this.opts.currentUid);
      return [...bench.map((target): TouchAction => {
        return { label: target ? speciesOf(target).name : "—", hint: target ? companionHint(target, this.opts.partyOverride ?? this.state.party, `${target.hp <= 0 ? "KO" : (this.opts.freeSwitch || this.opts.mode === "forced-switch") ? "rimpasto gratis" : this.opts.switchHint?.(target) ?? "Il nemico risponde dopo il cambio."}`) : "Nessun candidato",
          facts:target?[{label:"Livello",value:String(target.level)},{label:"PV",value:`${target.hp} di ${statsOf(target).hp}`}]:undefined, disabled: !target || target.hp <= 0, run: () => { if (target) this.chooseSwitch(target); } };
      }), { label: "INDIETRO", hint: this.opts.mode === "forced-switch" ? "Scegli chi continua la lotta" : "Resti in campo · nessun turno speso", disabled: this.opts.mode === "forced-switch", run: () => {
        if (this.stack.top !== this || this.opts.mode === "forced-switch") return;
        this.input.reset(); audio.cancel(); this.stack.pop();
      } }];
    }
    if (!mon && this.opts.mode === "view") {
      const party = this.opts.partyOverride ?? this.state.party, page = 0;
      const action = (label: string, hint: string, run: () => void, disabled = false): TouchAction => ({ label, hint, disabled, run: () => {
        if (disabled || this.stack.top !== this || this.summary || this.opts.mode !== "view" || page !== 0) return;
        this.input.reset(); audio.confirm(); run();
      } });
      return [...party.map((target, index) => {
        const command=action(target ? speciesOf(target).name : "—", target ? companionHint(target, party, `Livello ${target.level}. ${index===0?"Capofila":"Riserva"}.`) : "Nessun candidato", () => {
          this.index = index; this.summary = target; this.summaryPage = 0; this.summaryScroll = 0;
        }, !target);
        return {...command,icon:`/sprites/monsters/${target.speciesId}.png`,facts:target?[{label:"PV",value:`${target.hp} di ${statsOf(target).hp}`},{label:"Tipo",value:speciesOf(target).types.join(" · ")}]:undefined};
      }),
        action("ESCI", "Torna alla pausa", () => this.stack.pop())];
    }
    if (!mon) return (this.opts.partyOverride ?? this.state.party).map(target => {
      const preview = this.opts.itemPreview?.(target);
      const incompatible = !!this.opts.directiveMoveId && !canLearnMove(target, this.opts.directiveMoveId);
      return { label: speciesOf(target).name, icon: `/sprites/monsters/${target.speciesId}.png`,
        hint: companionHint(target, this.opts.partyOverride ?? this.state.party, preview?.hint ?? (this.opts.directiveMoveId ? incompatible ? 'Non può imparare questa mossa.' : 'Può imparare questa direttiva.' : `Livello ${target.level}`)),
        facts: preview?.facts ?? [{ label: 'PV', value: `${target.hp} di ${statsOf(target).hp}` }],
        disabled: !!preview?.disabled || incompatible,
        run: () => this.chooseItem(target) };
    });
    const page = this.summaryPage, party = this.opts.partyOverride ?? this.state.party;
    const action = (label: string, run: () => void, disabled = false, hint?: string): TouchAction => ({ label, hint, disabled, run: () => {
      if (disabled || this.stack.top !== this || this.summary !== mon || this.summaryPage !== page) return;
      this.input.reset(); audio.confirm(); run();
    } });
    const profile = () => { this.summaryPage = 0; this.summaryScroll = 0; };
    if (page === 1) return [...Array.from({ length: 4 }, (_, i) => {
      const slot = mon.moves[i], move = slot && MOVES[slot.id];
      return action(move?.name ?? "—", () => { this.detailIndex = i; this.summaryScroll = 0; }, !move, move ? `${move.type} · PP ${slot.pp}/${move.pp}` : "Slot libero");
    }), action("SCORRI", () => { const end = Math.max(0, this.summaryLines(mon).length - this.visibleLines); this.summaryScroll = this.summaryScroll < end ? this.summaryScroll + 1 : 0; }, this.summaryLines(mon).length <= this.visibleLines), action("PROFILO", profile)];
    if (page !== 0) return [action("PROFILO", profile), action("MOSSE", () => { this.summaryPage = 1; this.summaryScroll = 0; }),
      action("CARRIERA", () => { this.summaryPage = 3; this.summaryScroll = 0; }, page === 3),
      action("SCORRI", () => { const end = Math.max(0, this.summaryLines(mon).length - this.visibleLines); this.summaryScroll = this.summaryScroll < end ? this.summaryScroll + 1 : 0; }, this.summaryLines(mon).length <= this.visibleLines),
      action("EVOLVI", () => this.openEvolution(mon), !levelEvolution(mon, this.state.sondaggi) || !!this.opts.partyOverride),
      action("CANDIDATO", () => this.nextCandidate(), party.length <= 1, "Scheda successiva")];
    return [action("EVOLVI", () => this.openEvolution(mon), !levelEvolution(mon, this.state.sondaggi) || !!this.opts.partyOverride),
      action("MOSSE", () => { this.summaryPage = 1; }), action("DATI", () => { this.summaryPage = 2; }),
      action("ARCHIVIO", () => this.stack.push(new RecallScene(this.stack, this.input, this.state, mon)), this.opts.mode !== "view" || !!this.opts.partyOverride || !archivedMoves(mon).length),
      action("DIFESE", () => { this.summaryPage = 4; }), action("SQUADRA", () => { this.summary = null; })];
  }
  update(dt = 0): void {
    void dt;
    const party = this.opts.partyOverride ?? this.state.party;
    if (this.summary) {
      const mon = this.summary;
      if (this.input.wasPressed("b")) { audio.cancel(); if(this.summaryPage)this.summaryPage=0;else this.summary=null; return; }
      if (this.input.wasPressed("a")) { this.summaryPage = (this.summaryPage + 1) % 6; this.summaryScroll = 0; audio.cursor(); return; }
      const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
      if (dir && party.length > 1) {
        this.index = (this.index + dir + party.length) % party.length;
        this.summary = party[this.index]; this.detailIndex = 0; this.summaryScroll = 0; audio.cursor(); return;
      }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      if (delta) { this.summaryScroll = Math.max(0, Math.min(Math.max(0, this.summaryLines(mon).length - this.visibleLines), this.summaryScroll + delta)); audio.cursor(); return; }
      if (this.input.wasPressed("start")) {
        if (this.summaryPage === 5 && this.opts.mode === "view" && !this.opts.partyOverride) {
          this.stack.push(new RecallScene(this.stack, this.input, this.state, mon)); audio.confirm(); return;
        }
        if (this.summaryPage === 1) { this.detailIndex = (this.detailIndex + 1) % Math.max(1, mon.moves.length); this.summaryScroll = 0; audio.cursor(); return; }
        if (this.summaryPage === 3 && !this.opts.partyOverride) {
          this.openEvolution(mon); return;
        }
        if (this.summaryPage === 0 && !this.opts.partyOverride) {
          const held = heldItemOf({ ...mon });
          if (held) { delete mon.heldItem; this.state.bag[held.id] = (this.state.bag[held.id] ?? 0) + 1; saveGame(this.state); audio.confirm(); this.summaryScroll = 0; return; }
        }
        audio.cancel();
      }
      return;
    }
    if (this.opts.onInspect && this.input.wasPressed("start")) {
      const mon = party[this.index];
      if (!mon || mon.hp <= 0 || mon.uid === this.opts.currentUid) { audio.cancel(); return; }
      audio.confirm(); this.opts.onInspect(mon); return;
    }
    // Riordino squadra (solo nel menu PARTY): START prende lo slot, START su un
    // altro lo scambia. Il primo della lista combatte per primo.
    if (this.opts.mode === "view" && this.input.wasPressed("start") && party.length > 1) {
      if (this.moveFrom === null) {
        this.moveFrom = this.index;
        audio.confirm();
      } else if (this.moveFrom === this.index) {
        this.moveFrom = null;
        audio.cancel();
      } else {
        const from = this.moveFrom;
        this.moveFrom = null;
        if (this.placeCompanion(from, this.index)) audio.confirm(); else audio.cancel();
      }
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + party.length - 1) % party.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % party.length;
      audio.cursor();
    }
    if (this.input.wasPressed("b")) {
      // In modalità "sposta" B annulla lo spostamento invece di uscire.
      if (this.moveFrom !== null) {
        this.moveFrom = null;
        audio.cancel();
        return;
      }
      if (this.opts.mode !== "forced-switch") {
        audio.cancel();
        this.stack.pop();
        return;
      }
    }
    if (this.input.wasPressed("a")) {
      const mon = party[this.index];
      if (!mon) {
        return;
      }
      if (this.opts.mode === "view") {
        audio.confirm();
        this.moveFrom = null;
        this.detailIndex = 0;
        this.summary = mon;
        this.summaryPage = 0; this.summaryScroll = 0;
        return;
      }
      if (this.opts.mode === "battle-switch" || this.opts.mode === "forced-switch") {
        this.chooseSwitch(mon);
        return;
      }
      if (this.opts.mode === "use-item") {
        this.chooseItem(mon);
      }
    }
  }

  get uiPanel():UiPanel {
    const party=this.opts.partyOverride??this.state.party,mon=this.summary;
    const actions=this.touchActions??[];
    if(!mon){
      const bench=this.opts.mode==="battle-switch"||this.opts.mode==="forced-switch"?party.filter(target=>target.uid!==this.opts.currentUid):party;
      const reorderable=this.opts.mode==="view"&&this.canReorder(),reordering=reorderable&&this.reordering;
      const rows=actions.filter(action=>!['INDIETRO','ESCI','ALTRI'].includes(action.label)).map((action,i):TouchAction=>{
        const target=bench[i];if(!target)return {...action,label:'Nessun compagno'};
        const stats=statsOf(target),preview=this.opts.mode==='use-item'?this.opts.itemPreview?.(target):undefined;
        const incompatible=!!this.opts.directiveMoveId&&!canLearnMove(target,this.opts.directiveMoveId);
        const meta=this.opts.mode==='use-item'?(incompatible?'Non può impararla':preview?.disabled?preview.hint.split('\n')[0]:undefined)
          :this.opts.mode==='battle-switch'||this.opts.mode==='forced-switch'?(target.hp<=0?'KO: non può entrare':this.opts.switchHint?.(target)):undefined;
        const right=preview&&!preview.disabled?preview.facts?.find(fact=>fact.label==='PV'||fact.label==='Stato')?.value:undefined;
        const bar={now:Math.max(0,target.hp),max:stats.hp,text:`${Math.max(0,target.hp)}/${stats.hp}`};
        if(reordering){
          const held=this.moveFrom===i,holding=this.moveFrom!==null;
          return {label:speciesOf(target).name,run:()=>{if(this.stack.top!==this||this.summary||!this.reordering)return;this.input.reset();audio.confirm();this.reorderTap(i);},
            row:{kind:'companion',icon:`/sprites/monsters/${target.speciesId}.png`,level:`Lv${target.level}`,slot:String(i+1),held,bar,
              meta:held?'In mano':holding?'Metti qui':target.hp<=0?'KO':undefined}};
        }
        return {...action,label:speciesOf(target).name,hint:undefined,facts:undefined,onInspect:this.opts.mode==='view'?undefined:action.onInspect,
          row:{kind:'companion',icon:`/sprites/monsters/${target.speciesId}.png`,level:`Lv${target.level}`,types:speciesOf(target).types,
            star:this.opts.mode==='view'&&party[0]===target,bar,
            stamp:target.hp<=0?'KO':target.status?STATUS_LABELS[target.status]:undefined,meta,right}};
      });
      const holdingName=this.moveFrom!==null&&party[this.moveFrom]?speciesOf(party[this.moveFrom]).name:"";
      const subtitle=this.opts.mode==='forced-switch'?'Il compagno in campo è KO.'
        :reordering?(this.moveFrom!==null?`Dove metto ${holdingName}? Tocca il suo nuovo posto.`
          :this.movedNote?`${this.movedNote} Tocca un altro compagno o premi Fatto.`:'Tocca chi vuoi spostare, poi il suo nuovo posto. Oppure trascinalo.')
        :reorderable?'Il primo della lista entra per primo in lotta.':undefined;
      const toggle:TouchAction={label:reordering?'Fatto':'Riordina',run:()=>{if(this.stack.top!==this||this.summary)return;this.input.reset();audio.confirm();this.toggleReorder();}};
      return {title:this.opts.title??(this.opts.mode==='forced-switch'?'Chi continua?':this.opts.mode==='use-item'?'Su chi?':'Squadra'),
        subtitle,fit:true,
        blocks:party.length?undefined:[{title:'Squadra vuota',body:'Vai da Quirino nel laboratorio per scegliere il primo compagno.'}],
        actions:reorderable?[...rows,toggle]:rows,primary:reorderable?rows.length:undefined,
        drag:reordering?{move:(from:number,to:number)=>{if(this.stack.top!==this||this.summary||!this.reordering)return;if(this.placeCompanion(from,to))audio.confirm();}}:undefined,
        selected:this.opts.mode==="battle-switch"||this.opts.mode==="forced-switch"?Math.max(0,bench.indexOf(party[this.index])):reorderable&&this.cursorOnToggle?rows.length:this.index,
        back:{label:'Indietro',disabled:this.opts.mode==='forced-switch',run:()=>{
          if(this.stack.top!==this||this.opts.mode==='forced-switch')return;
          this.input.reset();audio.cancel();
          if(reordering){if(this.moveFrom!==null)this.moveFrom=null;else{this.reordering=false;this.movedNote='';}return;}
          this.stack.pop();
        }}};
    }
    const species=speciesOf(mon),stats=statsOf(mon),ability=abilityOf(mon),held=heldItemOf(mon),blocks:UiBlock[]=[];
    const page=this.summaryPage,tab=page<=1?0:page===2?1:2;
    const guard=(run:()=>void)=>()=>{if(this.stack.top!==this||this.summary!==mon||this.summaryPage!==page)return;this.input.reset();audio.confirm();run();};
    const tabs:TouchAction[]=[{label:'Mosse',run:()=>{this.summaryPage=0;this.summaryScroll=0;audio.cursor();}},
      {label:'Valori',run:()=>{this.summaryPage=2;this.summaryScroll=0;audio.cursor();}},
      {label:'Storia',run:()=>{this.summaryPage=3;this.summaryScroll=0;audio.cursor();}}];
    let rows:TouchAction[]=[],statRows:UiPanel['stats'];
    if(tab===0){
      rows=Array.from({length:4},(_,i):TouchAction=>{
        const slot=mon.moves[i],move=slot&&MOVES[slot.id];
        if(!move)return {label:'Libera',disabled:true,run:()=>{},row:{kind:'move',right:'—'}};
        const detail=()=>openUiSheet(move.name,`${moveDescription(move)}\n\nTipo ${move.type} · Potenza ${move.power||'—'} · Precisione ${move.accuracy}% · PP ${slot.pp}/${move.pp}`);
        return {label:move.name,run:detail,onInspect:detail,row:{kind:'move',tone:move.type,types:[move.type],right:`${slot.pp}/${move.pp}`}};
      });
    }else if(tab===1){
      const max=Math.max(160,stats.hp,stats.atk,stats.def,stats.spc,stats.spd);
      statRows=[['PV',stats.hp],['Grinta',stats.atk],['Faccia tosta',stats.def],['Retorica',stats.spc],['Opportunismo',stats.spd]].map(([label,value])=>({label:String(label),value:Number(value),max}));
      blocks.push({title:ability?.name??'Abilità passiva',body:ability?.desc??'Nessuna abilità passiva.'});
      blocks.push({title:held?.name??'Nessun oggetto',body:held?.desc??'Nessun oggetto equipaggiato.'});
      if(!this.opts.partyOverride){
        if(party.length>1)rows.push({label:'Metti in testa',disabled:party[0]===mon,hint:party[0]===mon?'È già il capofila.':undefined,run:guard(()=>{const at=party.indexOf(mon);if(at<=0)return;party.splice(at,1);party.unshift(mon);this.index=0;saveGame(this.state);})});
        if(held)rows.push({label:`Riprendi ${held.name}`,run:guard(()=>{if(heldItemOf(mon)?.id!==held.id)return;delete mon.heldItem;this.state.bag[held.id]=(this.state.bag[held.id]??0)+1;saveGame(this.state);})});
      }
    }else{
      const rules=species.evolutions??[];
      for(const [i,rule] of rules.entries()){
        const condition=evolutionCondition(rule,rules.slice(0,i));
        blocks.push({title:speciesOf({...mon,speciesId:rule.id}).name,body:condition.charAt(0)+condition.slice(1).toLocaleLowerCase('it')});
      }
      if(!rules.length)blocks.push({title:'Forma finale',body:'Questo compagno non evolve.'});
      blocks.push({title:'Difese',facts:defensiveMatchups(mon.speciesId).filter(match=>match.mult!==1).map(match=>({label:match.type,value:`×${String(match.mult).replace('.',',')}`}))});
      const ready=levelEvolution(mon,this.state.sondaggi)&&!this.opts.partyOverride;
      if(ready)rows.push({label:'Evolvi',run:guard(()=>this.openEvolution(mon))});
      if(!this.opts.partyOverride&&archivedMoves(mon).length)rows.push({label:'Archivio mosse',hint:'Recupera gratis le mosse della forma attuale.',run:guard(()=>this.stack.push(new RecallScene(this.stack,this.input,this.state,mon)))});
    }
    const isLead=party[0]===mon;
    const evolveAt=tab===2&&rows.findIndex(row=>row.label==='Evolvi');
    return {title:species.name,
      hero:{src:`/sprites/monsters/${mon.speciesId}.png`,title:species.name,level:`Lv${mon.level}`,types:species.types,
        bar:{now:Math.max(0,mon.hp),max:stats.hp,text:`${Math.max(0,mon.hp)}/${stats.hp}`},stamp:mon.hp<=0?'KO':isLead?'Eletto':mon.status?STATUS_LABELS[mon.status]:undefined},
      tabs,selectedTab:tab,stats:statRows,blocks:blocks.length?blocks:undefined,actions:rows,
      primary:evolveAt!==false&&evolveAt>=0?evolveAt:undefined,
      back:{label:'Indietro',run:()=>{if(this.stack.top!==this||this.summary!==mon)return;this.input.reset();audio.cancel();this.summary=null;this.summaryPage=0;this.summaryScroll=0;}}};
  }
  draw(screen:Screen):void {screen.clear('#101b32');}

  private profileFacts(mon: Monster): string[] {
    const stats = statsOf(mon), target = levelEvolution(mon, this.state.sondaggi), ability = abilityOf(mon);
    return [`PV ${mon.hp}/${stats.hp} / ${mon.status ? STATUS_LABELS[mon.status] : "STATUS OK"}`,
      `GRINTA ${stats.atk} / RETORICA ${stats.spc}`,
      `ABILITÀ: ${ability?.name ?? "NESSUNA"}`,
      target ? `EVOLUZIONE PRONTA: ${speciesOf({ ...mon, speciesId: target }).name}` : `OGGETTO: ${ITEMS[mon.heldItem ?? ""]?.name ?? "NESSUNO"}`];
  }

  private summaryLines(mon: Monster): string[] {
    const species = speciesOf(mon), stats = statsOf(mon), held = ITEMS[mon.heldItem ?? ""];
    let notes: string[];
    if (this.summaryPage === 0) {
      notes = this.profileFacts(mon);
    } else if (this.summaryPage === 1) {
      const slot = mon.moves[this.detailIndex] ?? mon.moves[0], move = slot ? MOVES[slot.id] : undefined;
      notes = move && slot ? [`${this.detailIndex + 1}/${mon.moves.length}: ${move.name}.`, `PP ${slot.pp}/${move.pp} / ${move.accuracy}% PRECISIONE.`, `TIPO ${move.type}.`, moveSummary(move).replace(/^DANNO /, "POTENZA "), `PRIORITÀ ${move.effect?.priority ?? 0}.`, slot.pp === 0 ? "PP ESAURITI: NON DISPONIBILE IN LOTTA." : "I PP SI CONSUMANO SOLO USANDO LA MOSSA."] : ["NESSUNA MOSSA."];
    } else if (this.summaryPage === 2) {
      const ability = abilityOf(mon);
      notes = [ability ? `${ability.name}. ${ability.desc}` : "NESSUNA ABILITÀ PASSIVA.", `FACCIA TOSTA ${stats.def}. VELOCITÀ ${stats.spd}. EXP ${mon.exp}.`, held?.kind === "hold" ? `${held.name}. ${held.desc}` : "NESSUN OGGETTO TENUTO.", species.dexLine];
    } else if (this.summaryPage === 3) {
      notes = careerNotes(mon, this.state.sondaggi).map((line) => line.replace("A APRE IL CONFRONTO", "START APRE IL CONFRONTO"));
      if (this.opts.partyOverride) notes.unshift("MIRROR: LE EVOLUZIONI SI GESTISCONO NELLA SQUADRA ORIGINALE.");
    } else if (this.summaryPage === 4) notes = ["DANNO SUBITO PER TIPO:", ...defensiveMatchups(mon.speciesId).map((m) => `${m.type}: x${m.mult} ${m.mult > 1 ? "DEBOLE" : m.mult < 1 ? "RESISTE" : "NEUTRO"}.`), "ABILITÀ, OGGETTI E SONDAGGI POSSONO MODIFICARE IL RISULTATO."];
    else notes = [this.opts.mode === "view" && !this.opts.partyOverride ? "START: APRI L'ARCHIVIO GRATUITO." : "ARCHIVIO DISPONIBILE FUORI LOTTA NELLA SQUADRA ORIGINALE.", "PUOI RIPRENDERE LE MOSSE DELLA FORMA ATTUALE FINO AL TUO LIVELLO.", ...archivedMoves(mon).map((id) => MOVES[id].name), "CONFRONTI E CONFERMI PRIMA DI CANCELLARE UNA MOSSA. GLI ALTRI PP RESTANO."];
    return notes.flatMap((line) => wrapText(line, 35));
  }

}

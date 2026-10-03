import { TYPE_ORDER, type PolType } from "../data/poltypes";
import { DEX_ORDER, SPECIES } from "../data/species";
import { ABILITIES } from "../data/abilities";
import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { TouchAction } from "../engine/touchActions";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen } from "../engine/screen";
import type { GameState } from "../game/state";
import { wrapText } from "../ui/widgets";
import { zoneProgress } from "../data/dexzones";
import { formsForSpecies } from "../game/memeForms";
import { runtimeFeatures } from "../game/features";
import { defensiveMatchups, dexHabitats, dexAcquisitionNotes, dexSummary, dexMatches, DEX_FILTERS, DEX_FILTER_LABELS, evolutionCondition, reachableDexMaps, type DexFilter } from "../game/dexGuide";

import type { UiPanel, UiBlock } from "../ui/kit";
import { moveDescription } from "../ui/kit/moveContent";
export class DexScene implements Scene {
  private index = 0;
  private detail = false;
  private filterOpen = false;
  private scroll = 0;
  private page = -1;
  private textScroll = 0;
  private filter: DexFilter = "seen";
  private typeFilter: PolType | null = null;
  private time = 0;
  private reachable: Set<string>;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.reachable = reachableDexMaps(state, runtimeFeatures());
    if (!this.ids().length) this.filter = "all";
    this.selectFirst();
  }

  get touchActions(): readonly TouchAction[] {
    const detail = this.detail, page = this.page, id = DEX_ORDER[this.index];
    const action = (label: string, run: () => void, disabled = false): TouchAction => ({ label, disabled, run: () => {
      if (disabled || this.stack.top !== this || this.detail !== detail || this.page !== page || DEX_ORDER[this.index] !== id) return;
      this.input.reset(); audio.cursor(); run();
    } });
    const inspect = (page: number) => { this.page = page; this.textScroll = 0; };
    if (detail) return [action("HABITAT", () => inspect(3)), action("EVOLUZIONI / MOSSE", () => inspect(4), !this.state.dex[id]),
      action("DIFESE", () => inspect(2), !this.state.dex[id]), action(page === 0 ? "STATISTICHE" : "STORIA", () => inspect(page === 0 ? 1 : 0), !this.state.dex[id]),
      action("FORME MEME", () => inspect(page >= 5 ? 5 + (page - 4) % formsForSpecies(id, this.state.unlockedMemeForms).length : 5), !formsForSpecies(id, this.state.unlockedMemeForms).length),
      action(page < 0 ? "LISTA" : "SCHEDA", () => { if (page < 0) this.detail = false; else inspect(-1); })];
    const filter = (value: DexFilter) => { this.filter = value; this.selectFirst(); };
    return [action("SCHEDA", () => { this.detail = true; inspect(-1); }, !this.ids().length),
      action(this.filter === "all" ? "VISTI" : "TUTTI", () => filter(this.filter === "all" ? "seen" : "all")),
      action("QUI", () => filter("here")), action("MANCANTI", () => filter("missing")),
      action("TIPO", () => { const types: Array<PolType | null> = [null, ...TYPE_ORDER]; this.typeFilter = types[(types.indexOf(this.typeFilter) + 1) % types.length]; this.selectFirst(); }),
      action("ESCI", () => this.stack.pop())];
  }

  private ids(): string[] {
    return DEX_ORDER.filter((id) => dexMatches(id, this.filter, this.state) && (!this.typeFilter || (!!this.state.dex[id] && SPECIES[id].types.includes(this.typeFilter))));
  }

  update(dt = 0): void {
    if (!this.state.reduceEffects) this.time += dt;
    const ids = this.ids();
    if (this.detail) {
      const tap = this.input.consumeTap();
      if (this.page >= 0 && tap && tap.x >= 12 && tap.x < 227 && tap.y >= 65 && tap.y < 76) {
        this.input.clearTap(); this.page = Math.floor((tap.x - 12) / 43); this.textScroll = 0; audio.cursor(); return;
      }
      if (this.input.wasPressed("b") && this.page >= 0) { this.page = -1; this.textScroll = 0; audio.cancel(); return; }
      if (this.input.wasPressed("b")) {
        this.detail = false;
        const i = ids.indexOf(DEX_ORDER[this.index]);
        this.scroll = Math.max(0, Math.min(this.scroll, i));
        if (i >= this.scroll + 7) this.scroll = i - 6;
        audio.cancel(); return;
      }
      if (this.input.wasPressed("a")) {
        this.page = this.state.dex[DEX_ORDER[this.index]] ? (this.page + 1) % this.pageCount() : 3; this.textScroll = 0; audio.cursor(); return;
      }
      const dir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
      if (dir && ids.length) {
        const i = ids.indexOf(DEX_ORDER[this.index]);
        this.index = DEX_ORDER.indexOf(ids[(i + dir + ids.length) % ids.length]);
        this.page = -1; this.textScroll = 0; audio.cursor(); return;
      }
      const delta = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
      if (delta) { this.textScroll = Math.max(0, Math.min(this.lines().length - 7, this.textScroll + delta)); audio.cursor(); }
      return;
    }
    const tap = this.input.consumeTap();
    if (tap && tap.x >= 8 && tap.x < 232 && tap.y >= 36 && tap.y < 120) {
      const id = ids[this.scroll + Math.floor((tap.y - 36) / 12)];
      if (id) { this.input.clearTap(); const selected = DEX_ORDER[this.index] === id; this.index = DEX_ORDER.indexOf(id); if (selected) { this.detail = true; this.page = -1; this.textScroll = 0; } audio.cursor(); return; }
    }
    if (this.input.wasPressed("b")) { audio.cancel(); this.stack.pop(); return; }
    const filterDir = this.input.wasPressed("right") ? 1 : this.input.wasPressed("left") ? -1 : 0;
    if (filterDir) {
      this.filter = DEX_FILTERS[(DEX_FILTERS.indexOf(this.filter) + filterDir + DEX_FILTERS.length) % DEX_FILTERS.length];
      this.selectFirst(); audio.cursor(); return;
    }
    if (this.input.wasPressed("start")) {
      const types: Array<PolType | null> = [null, ...TYPE_ORDER];
      this.typeFilter = types[(types.indexOf(this.typeFilter) + 1) % types.length];
      this.selectFirst(); audio.cursor(); return;
    }
    const dir = this.input.wasPressed("down") ? 1 : this.input.wasPressed("up") ? -1 : 0;
    if (dir && ids.length) {
      const i = ids.indexOf(DEX_ORDER[this.index]);
      this.index = DEX_ORDER.indexOf(ids[(i + dir + ids.length) % ids.length]); audio.cursor();
    }
    const i = ids.indexOf(DEX_ORDER[this.index]);
    this.scroll = Math.max(0, Math.min(this.scroll, i));
    if (i >= this.scroll + 7) this.scroll = i - 6;
    if (this.input.wasPressed("a") && ids.length) {
      this.detail = true; this.page = -1; this.textScroll = 0; audio.confirm();
    }
  }

  private selectFirst(): void {
    const first = this.ids()[0]; if (first) this.index = DEX_ORDER.indexOf(first); this.scroll = 0;
  }
  private pageCount(): number { return 5 + formsForSpecies(DEX_ORDER[this.index], this.state.unlockedMemeForms).length; }

  private lines(): string[] {
    const id = DEX_ORDER[this.index]; const s = SPECIES[id];
    if (this.page < 0) return dexSummary(id, this.state, this.reachable).flatMap(note => wrapText(note, 35));
    const seen = !!this.state.dex[id]; const ability = s.ability ? ABILITIES[s.ability] : undefined;
    const notes: string[] = [];
    if (!seen && this.page !== 3) notes.push("AVVISTA QUESTA SPECIE PER APRIRE IL DOSSIER. LA SCHEDA DOVE TI AIUTA A CERCARLA.");
    else if (this.page === 0) {
      notes.push(s.dexLine, "");
      notes.push(ability ? `ABILITÀ: ${ability.name}. ${ability.desc}` : "NESSUNA ABILITÀ PASSIVA.");
    } else if (this.page === 1) {
      notes.push("VALORI BASE, NON STATISTICHE DEL SINGOLO ESEMPLARE.", `CONSENSO (PV): ${s.base.hp}`, `GRINTA (FISICO): ${s.base.atk}`, `FACCIA TOSTA (DIFESA): ${s.base.def}`, `RETORICA (SPECIALE): ${s.base.spc}`, `VELOCITÀ: ${s.base.spd}`);
      if (s.specialDefense !== undefined) notes.push(`DIFESA SPECIALE FISSA: ${s.specialDefense}`);
      notes.push("LE SPECIALI USANO FACCIA TOSTA IN DIFESA, SALVO ECCEZIONI.");
    } else if (this.page === 2) {
      notes.push("DANNO SUBITO PER TIPO:");
      for (const m of defensiveMatchups(id)) notes.push(`${m.type}: x${m.mult.toFixed(2).replace(/0$/, "")} ${m.mult > 1 ? "DEBOLE" : m.mult < 1 ? "RESISTE" : "NEUTRO"}`);
      notes.push("SONDAGGI, ABILITÀ E OGGETTI POSSONO MODIFICARE IL DANNO.");
    } else if (this.page === 3) notes.push(...dexAcquisitionNotes(id, this.state, this.reachable));
    else if (this.page === 4) {
      if (s.evolutions?.length) for (const [i, rule] of s.evolutions.entries()) notes.push(`${SPECIES[rule.id].name}: ${evolutionCondition(rule, s.evolutions.slice(0, i))}.`);
      else notes.push("FORMA FINALE: NESSUNA EVOLUZIONE.");
      notes.push("", "MOSSE APPRESE PER LIVELLO:");
      for (const [lv, move] of s.learnset) notes.push(`LV ${lv}: ${MOVES[move].name}`);
    } else {
      const form = formsForSpecies(id, this.state.unlockedMemeForms)[this.page - 5];
      if (form) notes.push(form.name, form.season, `BONUS ${form.stat.toUpperCase()} +${form.statPercent}%`, form.provenance, `ARCHIVIO: ${form.sourceId.toUpperCase()}`, "STESSO NUMERO DEX.");
    }
    return notes.flatMap((note) => note ? wrapText(note, 35) : [""]);
  }

  private readable(value:string):string {
    let text=value.charAt(0)+value.slice(1).toLocaleLowerCase("it");
    for(const species of Object.values(SPECIES))text=text.replaceAll(species.name.toLocaleLowerCase("it"),species.name);
    return text.replace(/\bpv\b/gi,"PV").replace(/\bpp\b/gi,"PP");
  }

  get uiPanel():UiPanel {
    const id=DEX_ORDER[this.index],species=SPECIES[id],seen=!!this.state.dex[id],ids=this.ids(),page=this.page,detail=this.detail,filterOpen=this.filterOpen;
    const action=(label:string,run:()=>void,disabled=false,hint?:string):TouchAction=>({label,hint,disabled,run:()=>{
      if(disabled||this.stack.top!==this||this.detail!==detail||this.page!==page||this.filterOpen!==filterOpen||DEX_ORDER[this.index]!==id)return;
      this.input.reset();audio.confirm();run();
    }});
    const back=action("Indietro",()=>{if(this.filterOpen)this.filterOpen=false;else if(this.detail&&this.page>=0)this.page=-1;else if(this.detail)this.detail=false;else this.stack.pop();});
    if(this.filterOpen)return {title:"Tipo da cercare",subtitle:"Il filtro per tipo include solo le specie già avvistate.",
      actions:[action("Ogni tipo",()=>{this.typeFilter=null;this.selectFirst();this.filterOpen=false;}),...TYPE_ORDER.map(type=>({...action(type,()=>{this.typeFilter=type;this.selectFirst();this.filterOpen=false;}),icon:`/sprites/ui/type_${type.toLocaleLowerCase('it')}.png`,group:"Tipi avvistati"}))],selected:this.typeFilter?TYPE_ORDER.indexOf(this.typeFilter)+1:0,back:back};
    if(!detail){
      const seenCount=DEX_ORDER.filter(candidate=>this.state.dex[candidate]).length,caught=DEX_ORDER.filter(candidate=>this.state.dex[candidate]==="caught").length,target=DEX_ORDER.length;
      const zones=zoneProgress(this.state.dex,this.state.flags,this.state.browserSeed),here=zones.find(progress=>progress.zone.id===this.state.pos.mapId);
      return {title:"Politicdex",subtitle:ids.length?`${ids.length} specie nel filtro. Tocca una voce per aprire la scheda.`:this.filter==="here"?"Qui non ci sono incontri selvatici.":"Il filtro non contiene specie.",
        tabs:[...DEX_FILTERS.map(filter=>action(this.readable(DEX_FILTER_LABELS[filter]),()=>{this.filter=filter;this.selectFirst();})),action("Tipo",()=>{this.filterOpen=true;},false,this.typeFilter??"Ogni tipo")],selectedTab:DEX_FILTERS.indexOf(this.filter),
        blocks:[{title:"La collezione",facts:[{label:"Avvistati",value:String(seenCount)},{label:"Eletti",value:`${caught} di ${target}`} ]},
          ...(here?[{title:this.readable(here.zone.name),facts:[{label:"Eletti nella zona",value:`${here.caught} di ${here.total}`},{label:"Premio",value:`${here.zone.reward.money} €`}]}]:[{title:"Zone completate",facts:[{label:"Progressi",value:`${zones.filter(progress=>progress.done).length} di ${zones.length}`}]}]),
          ...(!ids.length?[{title:"Nessuna specie nel filtro",body:"Scegli Tutti o rimuovi il filtro per tipo."}]:[])],
        actions:ids.map(candidate=>{
          const known=!!this.state.dex[candidate],entry=SPECIES[candidate];
          return {...action(known?entry.name:"Da scoprire",()=>{this.index=DEX_ORDER.indexOf(candidate);this.detail=true;this.page=-1;},false,this.state.dex[candidate]==="caught"?"Eletto nella tua collezione":known?"Avvistato":"Consulta l’habitat per cercarlo."),
            icon:known?`/sprites/monsters/${candidate}.png`:undefined,group:"Specie",facts:[{label:"Numero",value:String(entry.dexNum).padStart(2,"0")},...(known?[{label:"Tipo",value:entry.types.join(" · ")}]:[])]};
        }),selected:Math.max(0,ids.indexOf(id)),back:back};
    }
    const blocks:UiBlock[]=[];
    const inspect=(next:number)=>{this.page=next;this.textScroll=0;};
    if(page<0){
      blocks.push({title:"Scheda",facts:[{label:"Numero",value:String(species.dexNum).padStart(2,"0")},{label:"Collezione",value:this.state.dex[id]==="caught"?"Eletto":seen?"Avvistato":"Da scoprire"},...(seen?[{label:"Tipo",value:species.types.join(" · ")}]:[])]});
      if(seen){const ability=species.ability?ABILITIES[species.ability]:undefined;blocks.push({title:ability?.name??"Abilità passiva",body:ability?.desc??"Nessuna abilità passiva."});}
      const habitat=dexHabitats(id,this.state,this.reachable)[0];
      blocks.push({title:"Dove cercare",body:habitat?`${this.readable(habitat.name)}. Livelli ${habitat.minLv}–${habitat.maxLv}.`:this.readable(dexAcquisitionNotes(id,this.state,this.reachable)[0])});
    }else if(!seen&&page!==3)blocks.push({title:"Dossier da aprire",body:"Avvista questa specie per scoprirne le caratteristiche. L’habitat ti aiuta a cercarla."});
    else if(page===0)blocks.push({title:"Storia",body:species.dexLine});
    else if(page===1){
      blocks.push({title:"Valori base della specie",body:"Il livello e la crescita cambiano i valori del singolo compagno.",facts:[{label:"PV",value:String(species.base.hp)},{label:"Grinta",value:String(species.base.atk)},{label:"Faccia tosta",value:String(species.base.def)},{label:"Retorica",value:String(species.base.spc)},{label:"Opportunismo",value:String(species.base.spd)}]});
      blocks.push({title:"Difesa dalle mosse speciali",body:species.specialDefense===undefined?"Usa Faccia tosta anche contro gli attacchi speciali.":"Questa specie ha una difesa speciale fissa.",facts:species.specialDefense===undefined?undefined:[{label:"Difesa speciale",value:String(species.specialDefense)}]});
    }else if(page===2)blocks.push({title:"Danno ricevuto per tipo",body:"Più di ×1 significa debolezza; meno di ×1 significa resistenza. Abilità e oggetti possono cambiare il risultato.",facts:defensiveMatchups(id).map(match=>({label:match.type,value:`×${match.mult.toLocaleString('it')}`}))});
    else if(page===3){
      const habitats=dexHabitats(id,this.state,this.reachable),notes=dexAcquisitionNotes(id,this.state,this.reachable);
      if(habitats.length)blocks.push({title:"Incontri accessibili",body:"La rarità indica la presenza tra i selvatici della zona, non la probabilità di incontrarlo a ogni passo."});
      for(const habitat of habitats)blocks.push({title:this.readable(habitat.name),facts:[{label:"Livelli",value:`${habitat.minLv}–${habitat.maxLv}`},{label:"Rarità",value:habitat.share<.05?"Rarissimo":habitat.share<.15?"Raro":habitat.share<.3?"Regolare":"Comune"}]});
      for(const note of notes.slice(habitats.length?habitats.length+2:0))blocks.push({title:"Come trovarlo",body:this.readable(note)});
    }else if(page===4){
      for(const [i,rule] of (species.evolutions??[]).entries())blocks.push({title:SPECIES[rule.id].name,body:this.readable(evolutionCondition(rule,species.evolutions?.slice(0,i)))});
      if(!species.evolutions?.length)blocks.push({title:"Forma finale",body:"Questa specie non evolve."});
      for(const [level,moveId] of species.learnset){const move=MOVES[moveId];blocks.push({title:`Livello ${level} · ${this.readable(move.name)}`,body:moveDescription(move),facts:[{label:"Tipo",value:move.type},{label:"Potenza",value:move.power?String(move.power):"—"},{label:"PP massimi",value:String(move.pp)},{label:"Precisione",value:`${move.accuracy}%`}]});}
    }else{
      const labels={atk:"Grinta",def:"Faccia tosta",spc:"Retorica",spd:"Opportunismo"};
      for(const form of formsForSpecies(id,this.state.unlockedMemeForms))blocks.push({title:this.readable(form.name),body:this.readable(form.provenance),facts:[{label:"Stagione",value:this.readable(form.season)},{label:labels[form.stat],value:`+${form.statPercent}%`} ]});
      blocks.push({title:"Stessa specie",body:"Le forme meme conservano lo stesso numero nel Politicdex."});
    }
    const forms=formsForSpecies(id,this.state.unlockedMemeForms);
    return {title:seen?species.name:"Da scoprire",portrait:seen?{src:`/sprites/monsters/${id}.png`,label:species.name}:undefined,
      subtitle:page<0?"Politicdex":["Storia","Statistiche","Difese","Habitat","Evoluzioni e mosse"][page]??"Forme meme",blocks,
      actions:page>=0?[]:[action("Habitat",()=>inspect(3),false,"Luoghi aperti e modi per reclutarlo."),action("Storia",()=>inspect(0),!seen),action("Statistiche",()=>inspect(1),!seen),action("Difese",()=>inspect(2),!seen),action("Evoluzioni e mosse",()=>inspect(4),!seen),...(forms.length?[action("Forme meme",()=>inspect(5))]:[])],selected:0,back:back};
  }

  draw(screen:Screen):void{screen.clear("#101b32");}
}

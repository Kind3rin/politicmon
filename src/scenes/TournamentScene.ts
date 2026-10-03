import {MOVES,moveKindLabel} from '../data/moves';
import {SPECIES} from '../data/species';
import {ITEMS} from '../data/items';
import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {movesAtLevel,speciesOf} from '../game/monster';
import {saveGame,type GameState} from '../game/state';
import {coppaOpponentDef,coppaRule,COPPA_FIRST_PRIZE,COPPA_REPEAT_PRIZE,playerOpponent,prepareCoppaParty,roundLabel,type CoppaRule,type TournamentState} from '../game/tournament';
import type {UiPanel,UiBlock} from '../ui/kit';
import {readableCopy} from '../ui/kit/copy';
import {moveDescription} from '../ui/kit/moveContent';

export class TournamentScene implements Scene {
 readonly transparent=false;
 private tab=0;
 private index=0;
 private closed=false;
 private modal:'abort'|'start'|null=null;
 private rule:CoppaRule;
 constructor(private stack:SceneStack,private input:Input,private state:GameState,private tourney:TournamentState,private next:()=>void,private abort:()=>void,rule?:CoppaRule){this.rule=rule??coppaRule(tourney.dateKey);}
 private close(abort:boolean):void {
  if(this.closed||this.stack.top!==this)return;
  if(!abort&&!prepareCoppaParty(this.state.party,this.rule).ok)return;
  this.closed=true;this.input.reset();this.stack.pop();abort?this.abort():this.next();
 }
 private back():void {
  if(this.closed||this.stack.top!==this)return;
  this.input.reset();audio.cancel();
  if(this.modal){this.modal=null;return;}
  if(this.tab){this.tab=0;this.index=0;return;}
  this.modal='abort';
 }
 get uiPanel():UiPanel {
  const tab=this.tab,modal=this.modal;
  const live=()=>!this.closed&&this.stack.top===this&&this.tab===tab&&this.modal===modal;
  const back={label:'Indietro',hint:modal?'Annulla e torna alla preparazione.':tab?'Torna al tabellone.':'Esamina la rinuncia al torneo.',run:()=>{if(live())this.back();}};
  const prepared=prepareCoppaParty(this.state.party,this.rule);
  if(modal==='abort')return {title:'Rinunciare alla Coppa?',blocks:[{title:'Quota già pagata',body:'I 1.500 € di iscrizione non vengono restituiti. Il tabellone di questa sessione va perso.'},{title:'La tua squadra',body:'I compagni della campagna restano tuoi. Indietro annulla la rinuncia.'}],actions:[{label:'Rinuncia al torneo',run:()=>{if(live())this.close(true);}}],primary:0,back};
  if(modal==='start'){
   const prize=this.state.coppaWins?COPPA_REPEAT_PRIZE:COPPA_FIRST_PRIZE;
   return {title:'Prima del match',blocks:[{title:readableCopy(this.rule.name),body:readableCopy(this.rule.description)},
    {title:prepared.ok?'Squadra idonea':'Squadra non idonea',body:prepared.ok?`Apre ${speciesOf(prepared.party[0]).name}. ${prepared.party.length} compagni idonei, curati per questo match.`:readableCopy(prepared.reason)},
    {title:'Cosa resta nella campagna',body:'Livelli, esperienza e PP della squadra originale sono conservati. Gli oggetti di cura usati nel match restano spesi.'},
    {title:'Eliminazione',body:'Se perdi, sei eliminato. Nessuna multa o teletrasporto nella campagna.'},
    {title:'Premio finale',facts:[{label:'Fondi',value:`${prize.money} €`},{label:ITEMS[prize.itemId].name,value:String(prize.qty)}],body:'La quota di iscrizione è già pagata.'}],
    actions:[{label:'Inizia il match',disabled:!prepared.ok,run:()=>{if(live())this.close(false);}}],primary:0,back};
  }
  const tabs=['Tabellone','Avversario','Capofila'].map((label,value)=>({label,run:()=>{if(!live())return;this.tab=value;this.index=0;this.input.reset();audio.cursor();}}));
  const blocks:UiBlock[]=[];
  if(tab===0){
   for(let i=0;i<this.tourney.alive.length;i+=2){const a=this.tourney.alive[i],b=this.tourney.alive[i+1];blocks.push({title:`Incontro ${i/2+1}`,facts:[{label:'Partecipante',value:a.isPlayer?'Tu':readableCopy(a.ghost?.name??'Posto libero')},{label:'Avversario',value:b?.isPlayer?'Tu':readableCopy(b?.ghost?.name??'Passaggio diretto')} ]});}
   blocks.push({title:'Sessione',facts:[{label:'Turno',value:readableCopy(roundLabel(this.tourney))},{label:'Trionfi',value:String(this.state.coppaWins)}]});
   if(!prepared.ok)blocks.push({title:'Squadra non idonea',body:readableCopy(prepared.reason)});
   return {title:'Coppa delle poltrone',tabs,selectedTab:tab,blocks,actions:[{label:'Prepara il match',disabled:!prepared.ok,run:()=>{if(!live())return;this.modal='start';this.input.reset();audio.cursor();}}],primary:0,back};
  }
  if(tab===2)return {title:'Capofila del torneo',tabs,selectedTab:tab,blocks:[{title:'Squadra del match',body:prepared.ok?'Scegli chi apre. Cambia anche l’ordine della squadra nella campagna.':readableCopy(prepared.reason)}],actions:prepared.ok?prepared.party.map(mon=>({label:speciesOf(mon).name,hint:`Livello ${mon.level}. ${this.state.party[0]?.uid===mon.uid?'Capofila attuale.':'Porta in testa alla squadra.'}`,run:()=>{
   if(!live())return;
   const fresh=prepareCoppaParty(this.state.party,this.rule);if(!fresh.ok||!fresh.party.some(m=>m.uid===mon.uid))return;
   const index=this.state.party.findIndex(m=>m.uid===mon.uid);if(index<0)return;
   const [leader]=this.state.party.splice(index,1);this.state.party.unshift(leader);saveGame(this.state);this.tab=0;this.index=0;this.input.reset();audio.confirm();
  }})):[],back};
  const opponent=playerOpponent(this.tourney),def=coppaOpponentDef(this.tourney,this.rule);
  if(!opponent||!def)return {title:'Avversario',tabs,selectedTab:tab,blocks:[{title:'Tabellone',body:'Nessun avversario disponibile.'}],actions:[],back};
  const index=Math.min(this.index,def.team.length-1),[id,level]=def.team[index],species=SPECIES[id];
  blocks.push({title:readableCopy(opponent.name),body:opponent.intro.map(readableCopy).join('\n\n')},{title:species.name,facts:[{label:'Livello',value:String(level)},{label:'Tipo',value:species.types.join(' · ')}]});
  for(const slot of movesAtLevel(id,level)){const move=MOVES[slot.id];blocks.push({title:move.name,body:moveDescription(move),facts:[{label:'Tipo',value:move.type},{label:'Categoria',value:moveKindLabel(move)},{label:'Potenza',value:move.power?String(move.power):'—'},{label:'PP',value:String(move.pp)}]});}
  return {title:'Dossier dell’avversario',tabs,selectedTab:tab,blocks,actions:def.team.map(([speciesId,monLevel],i)=>({label:SPECIES[speciesId].name,hint:`Livello ${monLevel}. Leggi le sue mosse.`,run:()=>{if(!live())return;this.index=i;this.input.reset();audio.cursor();}})),selected:index,back};
 }
 update():void {}
 draw(screen:Screen):void {screen.clear('#17243d');}
}

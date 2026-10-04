import {SPECIES,RIVAL_COUNTER} from '../data/species';
import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import type {TouchAction} from '../engine/touchActions';
import {ABILITIES} from '../data/abilities';
import {MOVES,moveKindLabel} from '../data/moves';
import {TYPE_ORDER,typeMultiplier} from '../data/poltypes';
import {movesAtLevel} from '../game/monster';
import {evolutionCondition} from '../game/dexGuide';
import type {UiPanel,UiBlock} from '../ui/kit';
import {moveDescription} from '../ui/kit/moveContent';
import {openUiSheet} from '../ui/kit/sheet';

export class StarterPreviewScene implements Scene{
 readonly expandedViewport=true;
 private tab=0;
 private closed=false;
 constructor(private stack:SceneStack,private input:Input,private speciesId:string,private onConfirm:()=>void,_reduceEffects=false){}
 private choose():void{if(this.closed)return;this.closed=true;this.stack.pop();audio.confirm();this.onConfirm();}
 private back():void{if(this.tab!==0){this.tab=0;audio.cancel();return;}this.closed=true;this.stack.pop();}
 private action(label:string,hint:string,run:()=>void):TouchAction{
  const tab=this.tab;
  return {label,hint,run:()=>{if(this.closed||this.stack.top!==this||this.tab!==tab)return;this.input.reset();run();}};
 }
 private legacyActions():readonly TouchAction[]{
  return this.tab===0?[this.action('Scegli questo compagno','Entrerà nella squadra al livello 5.',()=>this.choose()),
   ...['Mosse','Difese','Evoluzioni'].map((label,i)=>this.action(label,['Effetti, potenza e PP.','Tipi e confronto con Gianni.','Forme e condizioni.'][i],()=>{this.tab=i+1;audio.cursor();}))]:[];
 }
 get uiPanel():UiPanel{
  const species=SPECIES[this.speciesId],ability=ABILITIES[species.ability??''];
  const moves=movesAtLevel(this.speciesId,5).map(slot=>MOVES[slot.id]);
  const rival=SPECIES[RIVAL_COUNTER[this.speciesId]];
  const blocks:UiBlock[]=[];
  const tab=this.tab===1?1:this.tab===2?2:0;
  const rows:TouchAction[]=[];
  if(tab===0){
   const gag:Record<string,string>={giorgetta:'Radici profonde. Il vaso è su rotelle.',ellyna:'Riunione aperta. Conclusione rinviata.',renzino:'Non cambia idea. Cambia maggioranza.'};
   blocks.push({title:ability?.name??'Abilità passiva',body:`${gag[this.speciesId]}\n\n${ability?.desc??'Nessuna abilità passiva: il risultato dipende dalle mosse che scegli.'}`});
   for(const [i,rule] of (species.evolutions??[]).entries())blocks.push({title:`Evolve in ${SPECIES[rule.id].name}`,body:evolutionCondition(rule,species.evolutions?.slice(0,i)).replace(/LIVELLO/g,'Livello').replace(/SONDAGGI/g,'sondaggi')});
  }else if(tab===1){
   for(const move of moves){
    const detail=()=>openUiSheet(move.name,`${moveDescription(move)}\n\nTipo ${move.type} · ${moveKindLabel(move)} · Potenza ${move.power||'—'} · Precisione ${move.accuracy}% · PP ${move.pp}`);
    rows.push({label:move.name,run:detail,onInspect:detail,row:{kind:'move',tone:move.type,types:[move.type],right:`${move.pp}/${move.pp}`}});
   }
  }else{
   blocks.push({title:'Il primo rivale',body:`Gianni sceglierà ${rival.name}. Una mossa efficace aiuta, ma il danno dipende anche dalle statistiche.`,facts:moves.filter(move=>move.power>0).map(move=>({label:move.name,value:`Efficacia ×${typeMultiplier(move.type,rival.types)}`}))});
   blocks.push({title:'Danno ricevuto',facts:TYPE_ORDER.filter(type=>typeMultiplier(type,species.types)!==1).map(type=>({label:type,value:`×${typeMultiplier(type,species.types)}`}))});
  }
  const choose=this.action('Scegli questo compagno','Entrerà nella squadra al livello 5.',()=>this.choose());
  const tabs:TouchAction[]=['Profilo','Mosse','Difese'].map((label,i)=>({label,run:()=>{if(this.closed||this.stack.top!==this)return;this.tab=i;audio.cursor();}}));
  return {title:species.name,hero:{src:`/sprites/monsters/${this.speciesId}.png`,title:species.name,level:'Lv5',types:species.types},
   tabs,selectedTab:tab,blocks:blocks.length?blocks:undefined,actions:[...rows,choose],primary:rows.length,selected:rows.length,
   back:this.action('Indietro',this.tab===0?'Torna ai tre candidati.':'Torna alla scheda del compagno.',()=>this.back())};
 }
 get touchActions():readonly TouchAction[]{return this.legacyActions();}
 update(_dt:number):void{
  if(this.closed)return;
  if(this.input.wasPressed('b')){this.back();return;}
  if(this.input.wasPressed('left')||this.input.wasPressed('right')){this.tab=(this.tab+(this.input.wasPressed('left')?2:1))%3;audio.cursor();}
  if(this.input.wasPressed('a')){if(this.tab===0)this.choose();else this.tab=0;}
 }
 draw(screen:Screen):void{screen.clear('#101b32');}
}

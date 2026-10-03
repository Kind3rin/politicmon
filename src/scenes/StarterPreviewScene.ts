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
 get uiPanel():UiPanel{
  const species=SPECIES[this.speciesId],ability=ABILITIES[species.ability??''];
  const moves=movesAtLevel(this.speciesId,5).map(slot=>MOVES[slot.id]);
  const rival=SPECIES[RIVAL_COUNTER[this.speciesId]];
  const blocks:UiBlock[]=[];
  if(this.tab===0){
   const gag:Record<string,string>={giorgetta:'Radici profonde. Il vaso è su rotelle.',ellyna:'Riunione aperta. Conclusione rinviata.',renzino:'Non cambia idea. Cambia maggioranza.'};
   blocks.push({title:'Identità',body:gag[this.speciesId],facts:[{label:'Tipo',value:species.types.join(' · ')},{label:'Livello iniziale',value:'5'}]});
   blocks.push({title:ability?.name??'Abilità passiva',body:ability?.desc??'Nessuna abilità passiva. Il risultato dipende dalle mosse che scegli.'});
  }else if(this.tab===1){
   for(const move of moves)blocks.push({title:move.name,body:moveDescription(move),facts:[{label:'Tipo',value:move.type},{label:'Categoria',value:moveKindLabel(move)},{label:'Potenza',value:move.power?String(move.power):'—'},{label:'Precisione',value:`${move.accuracy}%`},{label:'PP',value:String(move.pp)}]});
  }else if(this.tab===2){
   blocks.push({title:'Il primo rivale',body:`Gianni sceglierà ${rival.name}. Una mossa efficace aiuta, ma il danno dipende anche dalle statistiche.`,facts:moves.filter(move=>move.power>0).map(move=>({label:move.name,value:`Efficacia ×${typeMultiplier(move.type,rival.types)}`}))});
   blocks.push({title:'Danno ricevuto',body:'Il moltiplicatore indica quanto pesa il tipo di una mossa avversaria.',facts:TYPE_ORDER.map(type=>({label:type,value:`×${typeMultiplier(type,species.types)}`}))});
  }else{
   for(const [i,rule] of (species.evolutions??[]).entries())blocks.push({title:SPECIES[rule.id].name,body:evolutionCondition(rule,species.evolutions?.slice(0,i)).replace(/LIVELLO/g,'Livello').replace(/SONDAGGI/g,'sondaggi')});
   if(!blocks.length)blocks.push({title:'Forma finale',body:'Questo compagno non evolve.'});
  }
  return {title:species.name,subtitle:['Scegli il tuo primo compagno','Mosse iniziali','Difese e primo rivale','Evoluzioni'][this.tab],
   image:this.tab===0?'/sprites/ui/starter-stage.png':undefined,
   portraits:this.tab===0?[{src:`/sprites/monsters/${this.speciesId}.png`,label:species.name}]:undefined,
   blocks,actions:this.tab===0?[this.action('Scegli questo compagno','Entrerà nella squadra al livello 5.',()=>this.choose()),
    ...['Mosse','Difese','Evoluzioni'].map((label,i)=>this.action(label,['Effetti, potenza e PP.','Tipi e confronto con Gianni.','Forme e condizioni.'][i],()=>{this.tab=i+1;audio.cursor();}))]:[],
   selected:0,primary:this.tab===0?0:undefined,back:this.action('Indietro',this.tab===0?'Torna ai tre candidati.':'Torna alla scheda del compagno.',()=>this.back())};
 }
 get touchActions():readonly TouchAction[]{return this.uiPanel.actions;}
 update(_dt:number):void{
  if(this.closed)return;
  if(this.input.wasPressed('b')){this.back();return;}
  if(this.input.wasPressed('left')||this.input.wasPressed('right')){this.tab=(this.tab+(this.input.wasPressed('left')?3:1))%4;audio.cursor();}
  if(this.input.wasPressed('a')){if(this.tab===0)this.choose();else this.tab=0;}
 }
 draw(screen:Screen):void{screen.clear('#101b32');}
}

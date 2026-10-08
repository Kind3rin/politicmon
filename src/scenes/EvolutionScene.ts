import {SPECIES} from '../data/species';
import {ABILITIES} from '../data/abilities';
import {MOVES} from '../data/moves';
import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import type {TouchAction} from '../engine/touchActions';
import {evolutionPreview} from '../game/evolutionGuide';
import {statsOf,type Monster} from '../game/monster';
import type {UiPanel,UiBlock} from '../ui/kit';
import {readableCopy} from '../ui/kit/copy';

export interface EvolutionOptions {mon?:Monster;reviewed?:boolean;reduceEffects?:boolean;battleSpeed?:1|2;onDecline?:()=>void;}
const PAGES=['Valori','Tipi e abilità','Mosse'];
export class EvolutionScene implements Scene {
 readonly expandedViewport=true;
 private phase=0;
 private phaseT=0;
 private done=false;
 private review:boolean;
 private inspecting=false;
 private page=0;
 constructor(private stack:SceneStack,private input:Input,private fromId:string,private toId:string,private onDone:()=>void,private options:EvolutionOptions={}){this.review=!!options.mon&&!options.reviewed;}
 private finish(accepted:boolean):void {
  if(this.done||this.stack.top!==this)return;
  this.done=true;this.input.reset();this.stack.pop();if(accepted)this.onDone();else this.options.onDecline?.();
 }
 private accept():void {this.review=false;this.phaseT=0;audio.confirm();}
 private action(label:string,run:()=>void,disabled=false):TouchAction {
  const review=this.review,inspecting=this.inspecting,page=this.page,phase=this.phase;
  return {label,disabled,run:()=>{if(disabled||this.done||this.stack.top!==this||this.review!==review||this.inspecting!==inspecting||this.page!==page||this.phase!==phase)return;this.input.reset();run();}};
 }
 private comparison():UiBlock[] {
  const mon=this.options.mon!,next=evolutionPreview(mon,this.toId);
  if(this.page===0){
   const before=statsOf(mon),after=statsOf(next);
   const keys=['hp','atk','def','spc','spd'] as const,labels=['PV massimi','Grinta','Faccia tosta','Retorica','Velocità'];
   return [{title:'Stesso livello, nuova specie',facts:[...keys.map((key,i)=>({label:labels[i],value:`${before[key]} → ${after[key]}`})),{label:'PV attuali',value:`${mon.hp} → ${next.hp}`} ]},
    {title:'Cosa resta',body:'Status, oggetto e PP restano. La forma meme stagionale si azzera.'}];
  }
  if(this.page===1){
   const from=SPECIES[this.fromId],to=SPECIES[this.toId];
   return [{title:'Tipi',facts:[{label:'Prima',value:from.types.join(' · ')},{label:'Dopo',value:to.types.join(' · ')}]},
    ...[from,to].map((species,i)=>{const ability=species.ability?ABILITIES[species.ability]:undefined;return {title:`${i?'Dopo':'Prima'}: ${ability?.name??'nessuna abilità'}`,body:readableCopy(ability?.desc??'Nessuna abilità passiva.')}}),
    {title:'Ingresso in lotta',body:'La passiva cambia. Gli effetti di ingresso richiedono un nuovo ingresso.'}];
  }
  return [{title:'Mosse conservate',body:'Mosse e PP restano. Non impara automaticamente le mosse dei livelli passati.',facts:mon.moves.map(slot=>({label:MOVES[slot.id].name,value:`${slot.pp} di ${MOVES[slot.id].pp} PP`}))},
   {title:'Prossime mosse',facts:SPECIES[this.toId].learnset.filter(([level])=>level>mon.level).map(([level,id])=>({label:`Livello ${level}`,value:MOVES[id].name}))}];
 }
 get uiPanel():UiPanel {
  const from=SPECIES[this.fromId],to=SPECIES[this.toId];
  if(this.review){
   const mon=this.options.mon!,before=statsOf(mon),after=statsOf(evolutionPreview(mon,this.toId)),ability=to.ability?ABILITIES[to.ability]:undefined;
   const nextMove=to.learnset.find(([level])=>level>mon.level);
   const blocks=this.inspecting?this.comparison():[
    {title:'Valori dopo l’evoluzione',facts:[{label:'PV massimi',value:`${before.hp} → ${after.hp}`},{label:'Grinta',value:`${before.atk} → ${after.atk}`},{label:'Tipo',value:to.types.join(' · ')}]},
    {title:ability?.name??'Nessuna abilità',body:readableCopy(ability?.desc??'Nessuna abilità passiva.')},
    {title:'Prossima mossa',body:nextMove?`Livello ${nextMove[0]}: ${MOVES[nextMove[1]].name}.`:'Nessuna nuova mossa prevista.'},
    {title:'Puoi rinviare',body:'Rinvii senza perdere il compagno. L’evoluzione non ricarica i PP.'}
   ];
   return {title:'Scelta di carriera',subtitle:`${from.name} → ${to.name}`,portraits:[{src:`/sprites/monsters/${this.fromId}.png`,label:from.name},{src:`/sprites/monsters/${this.toId}.png`,label:to.name}],blocks,
    tabs:this.inspecting?PAGES.map((label,page)=>this.action(label,()=>{this.page=page;audio.cursor();})):undefined,selectedTab:this.page,
    actions:this.inspecting?[this.action('Evolvi',()=>this.accept())]:[this.action('Evolvi',()=>this.accept()),this.action('Ora no',()=>this.finish(false)),this.action('Dettagli',()=>{this.inspecting=true;audio.cursor();})],primary:0,
    back:this.action('Indietro',()=>{audio.cancel();if(this.inspecting)this.inspecting=false;else this.finish(false);})};
  }
  const showNew=this.phase>=2||(this.phase===1&&this.phaseT>.9);
  const id=showNew?this.toId:this.fromId;
  const quotes:Record<string,string>={giorgiagon:'Il leggio è cresciuto.\n\nLa domanda è rimasta.',schleinix:'La riunione è aperta.\n\nIl simbolo è già cambiato.',renzilla:'Nuova sigla.\n\nStesso numero di telefono.'};
  return {title:this.phase===3?'La carriera continua':'Cambio di casacca',subtitle:this.phase===3?to.name:`${from.name} → ${to.name}`,
   image:this.phase===3?'/sprites/battle/moment_evoluzione.png':'/sprites/ui/starter-stage.png',portraits:[{src:`/sprites/monsters/${id}.png`,label:SPECIES[id].name}],
   blocks:[{title:this.phase===3?'Nuova carta intestata':'Il simbolo cambia',body:this.phase===3?quotes[this.toId]??'Stesso tesserato.\n\nNuova carta intestata.':'I PP non si ricaricano.'}],
   actions:[this.action(this.phase===3?'Continua':'Salta',()=>{if(this.phase===3)this.finish(true);else{this.phase=3;this.phaseT=0;audio.evolveJingle();}})],primary:0,
   back:this.action('Indietro',()=>this.finish(true),this.phase!==3)};
 }
 // Compatibility for game callers: the visible controls still come from the kit.
 get touchActions():readonly TouchAction[]|undefined {
  if(this.done)return undefined;
  const panel=this.uiPanel;
  return [...(panel.tabs??[]),...panel.actions,...(this.inspecting&&panel.back?[panel.back]:[])].map(a=>({...a,label:a.label==='Tipi e abilità'?'TIPI/ABILITÀ':a.label.toLocaleUpperCase('it')}));
 }
 update(dt:number):void {
  if(this.done||this.stack.top!==this)return;
  if(this.review){if(this.input.wasPressed('b')){audio.cancel();if(this.inspecting)this.inspecting=false;else this.finish(false);}return;}
  this.phaseT+=dt*(this.options.battleSpeed??1);
  if(this.phase===3){if(this.phaseT>=1.1||this.input.wasPressed('a')||this.input.wasPressed('b'))this.finish(true);return;}
  const durations=this.options.reduceEffects?[.35,.65,.25]:[.7,1.8,.35];
  if(this.phaseT>=durations[this.phase]){this.phase++;this.phaseT=0;if(this.phase===3)audio.evolveJingle();}
 }
 draw(screen:Screen):void {screen.clear('#17243d');}
}

import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {audio} from '../engine/audio';
import {claimTechnoReward,newTechnoRun,pressTechno,TECHNO_BEAT_SECONDS,TECHNO_SEQUENCE,TECHNO_WINDOW_SECONDS,technoInWindow,technoPressFeedback,technoReward,tickTechno,type TechnoButton,type TechnoRun} from '../game/genovaTechno';
import {saveGame,type GameState} from '../game/state';
import type {UiPanel} from '../ui/kit';
import {readableCopy} from '../ui/kit/copy';
const BUTTONS:readonly TechnoButton[]=['up','down','left','right','a'];
const LABEL:Record<TechnoButton,string>={up:'Su',down:'Giù',left:'Sinistra',right:'Destra',a:'Conferma'};
export class GenovaTechnoScene implements Scene {
 readonly transparent=false;
 private run:TechnoRun;
 private phase:'ready'|'play'|'pause'|'result'='ready';
 private paid={money:0,sondaggi:0};
 private feedback='';
 private before:{money:number;polls:number}|null=null;
 constructor(private stack:SceneStack,private input:Input,private state:GameState){this.run=newTechnoRun(state.reduceEffects);}
 private pressed(button:TechnoButton,index:number):void {
  if(this.stack.top!==this||this.phase!=='play'||this.run.index!==index)return;
  const before=this.run;this.run=pressTechno(before,button);this.feedback=readableCopy(technoPressFeedback(before,button));
  if(this.run!==before)this.run.hits>before.hits?audio.confirm():audio.cancel();
  this.complete();
 }
 private complete():void {
  if(!this.run.complete||this.phase!=='play')return;
  this.phase='result';this.before={money:this.state.money,polls:this.state.sondaggi};this.paid=claimTechnoReward(this.state,this.run);if(this.paid.money)saveGame(this.state);
 }
 private back():void {
  if(this.stack.top!==this)return;
  this.input.reset();audio.cancel();
  if(this.phase==='play'){this.phase='pause';return;}
  this.stack.pop();
 }
 update(dt:number):void {
  if(this.stack.top!==this||this.phase!=='play')return;
  if(this.input.wasPressed('b')||this.input.wasPressed('start')){this.back();return;}
  const pressed=BUTTONS.find(button=>this.input.wasPressed(button)),before=this.run;
  if(pressed)this.pressed(pressed,before.index);
  if(this.run===before)this.run=tickTechno(this.run,dt);
  if(this.feedback==='Troppo presto: aspetta'&&technoInWindow(this.run))this.feedback='';
  if(!pressed&&this.run.misses>before.misses){this.feedback='Battuta persa.';audio.cancel();}
  this.complete();
 }
 get uiPanel():UiPanel {
  const phase=this.phase,index=this.run.index;
  const live=()=>this.stack.top===this&&this.phase===phase;
  const back={label:'Indietro',hint:phase==='play'?'Metti in pausa.':phase==='pause'?'Esci senza premio.':'Torna al porto.',run:()=>{if(live())this.back();}};
  if(phase==='ready')return {title:'Genova Techno',blocks:[{title:'Il palco',body:'Ore 23: il beat salva il paese.\n\nOre 8: il contabile salva la fattura.'},{title:'Sei battute',body:this.run.reducedMotion?'Premi il comando indicato, senza scadenza. Indietro mette in pausa.':'Premi il comando indicato quando il cursore raggiunge la zona verde. Indietro mette in pausa.'},{title:'Premio',body:this.state.flags['genova-techno-complete']?'Allenamento: premio già ritirato.':'6 battute giuste: 1.200 €. Da 3 a 5: 600 €. Fino a 2: 200 €. Il premio si ritira una volta sola.'}],
   tabs:[false,true].map(reduced=>({label:reduced?'Senza timer':'A tempo',run:()=>{if(!live())return;this.run=newTechnoRun(reduced);this.input.reset();audio.cursor();}})),selectedTab:this.run.reducedMotion?1:0,
   actions:[{label:'Inizia',run:()=>{if(!live())return;this.phase='play';this.input.reset();audio.confirm();}}],primary:0,back};
  if(phase==='pause')return {title:'Prova in pausa',blocks:[{title:'Tempo fermo',body:'Riprendi dalla stessa battuta, oppure esci senza premio.\n\nIl DJ la chiama riflessione.'}],actions:[{label:'Riprendi',run:()=>{if(!live())return;this.phase='play';this.input.reset();audio.confirm();}}],primary:0,back};
  if(phase==='result')return {title:readableCopy(technoReward(this.run.hits).grade),blocks:[{title:'Esito',facts:[{label:'Battute giuste',value:`${this.run.hits} di 6`},{label:'Fondi',value:`${this.before?.money??this.state.money} → ${this.state.money} €`},{label:'Sondaggi',value:`${this.before?.polls??this.state.sondaggi} → ${this.state.sondaggi}%`}]},{title:this.paid.money?'Premio accreditato':'Allenamento',body:this.paid.money?'Il premio non è ripetibile.\n\nI debiti non seguono il tempo.':'Nessun nuovo premio. I debiti non seguono il tempo.'}],actions:[{label:'Torna al porto',run:()=>{if(live())this.back();}}],primary:0,back};
  const expected=TECHNO_SEQUENCE[index];
  return {title:`Premi: ${LABEL[expected]}`,subtitle:`Battuta ${index+1} di 6`,directInput:true,
   timing:this.run.reducedMotion?undefined:{label:technoInWindow(this.run)?'Ora!':'Aspetta la zona verde',progress:1-this.run.remaining/TECHNO_BEAT_SECONDS,windowStart:.5-TECHNO_WINDOW_SECONDS/TECHNO_BEAT_SECONDS,windowEnd:.5+TECHNO_WINDOW_SECONDS/TECHNO_BEAT_SECONDS},
   blocks:[{title:this.run.reducedMotion?'Senza scadenza':'Il ritmo',body:this.feedback||(this.run.reducedMotion?'Premi quando vuoi.':'Segui il comando indicato.'),facts:[{label:'Giuste',value:String(this.run.hits)},{label:'Errori',value:String(this.run.misses)}]}],
   actions:BUTTONS.map(button=>({label:LABEL[button],run:()=>{if(!live())return;this.input.reset();this.pressed(button,index);}})),selected:BUTTONS.indexOf(expected),primary:4,columns:2,back};
 }
 draw(screen:Screen):void {screen.clear('#17243d');}
}

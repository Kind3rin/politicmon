import {ITEMS} from '../data/items';
import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {saveGame,type GameState} from '../game/state';
import {CASINO_INVITES,CASINO_PRIZES,CASINO_SYMBOLS,commitCasino,previewCasino,type CasinoAction,type CasinoResult} from '../game/casino';
import type {UiPanel,UiBlock} from '../ui/kit';
import {readableCopy} from '../ui/kit/copy';

type Mode='menu'|'change'|'prizes'|'club'|'review'|'result'|'spin';
const copy=(s:string)=>readableCopy(s).replace(/\bSOND\b/gi,'sondaggi').replace(/\bFID\b/gi,'fiducia').replace(/\bCOE\b/gi,'coesione').replace(/\b(\d+(?:[,.]\d+)?)F\b/gi,'$1 fiche');
export class CasinoScene implements Scene {
 readonly transparent=false;
 private mode:Mode='menu';
 private origin:Mode='menu';
 private pending:CasinoAction|null=null;
 private result:CasinoResult|null=null;
 private spinTime=0;
 private spins=0;
 private slotNet=0;
 private before:{money:number;chips:number;polls:number;trust:number;cohesion:number}|null=null;
 constructor(private stack:SceneStack,private input:Input,private state:GameState){}
 private back():void {
  if(this.stack.top!==this)return;
  this.input.reset();audio.cancel();
  if(this.mode==='spin'){this.mode='result';audio.reelStop();return;}
  if(this.mode==='review'||this.mode==='result'){this.mode=this.origin;this.pending=null;this.result=null;this.before=null;return;}
  if(this.mode==='menu')this.stack.pop();else this.mode='menu';
 }
 private review(action:CasinoAction):void {
  if(this.stack.top!==this||this.mode==='review'||this.mode==='result'||this.mode==='spin')return;
  this.origin=this.mode;this.pending=action;this.result=null;this.before=null;this.input.reset();
  const p=previewCasino(this.state,action);
  if(!p.ok){this.result=p;this.pending=null;this.mode='result';audio.cancel();return;}
  this.mode='review';audio.cursor();
 }
 private commit(action:CasinoAction):void {
  if(this.stack.top!==this||this.mode!=='review'||this.pending!==action)return;
  this.pending=null;this.input.reset();
  this.before={money:this.state.money,chips:this.state.chips,polls:this.state.sondaggi,trust:this.state.morale.trust,cohesion:this.state.morale.cohesion};
  const result=commitCasino(this.state,action);this.result=result;
  if(result.ok){saveGame(this.state);audio.confirm();}else audio.cancel();
  this.mode=result.ok&&action.kind==='slot'&&!this.state.reduceEffects?'spin':'result';
  if(result.ok&&action.kind==='slot'){this.spins++;this.slotNet+=result.net??0;this.spinTime=0;}
 }
 update(dt:number):void {
  if(this.stack.top!==this||this.mode!=='spin')return;
  this.spinTime+=Math.max(0,Math.min(.25,dt));
  if(this.spinTime>=1.5){this.mode='result';audio.reelStop();}
 }
 get uiPanel():UiPanel {
  const mode=this.mode;
  const live=()=>this.stack.top===this&&this.mode===mode;
  const back={label:'Indietro',hint:mode==='menu'?'Torna alla campagna.':mode==='spin'?'Salta i rulli: il risultato è già salvato.':mode==='review'?'Annulla senza spendere.':'Torna al menù precedente.',run:()=>{if(live())this.back();}};
  const wallet:UiBlock={title:'Portafoglio',facts:[{label:'Fondi',value:`${this.state.money} €`},{label:'Fiche',value:String(this.state.chips)},{label:'Sondaggi',value:`${this.state.sondaggi}%`}]};
  if(mode==='spin'){
   const reels=this.result?.ok?this.result.reels??[]:[];
   return {title:'Slot del consenso',blocks:[{title:'Rulli',facts:[0,1,2].map(i=>({label:`Rullo ${i+1}`,value:this.spinTime>=[.7,1.1,1.5][i]?copy(CASINO_SYMBOLS[reels[i]].name):'In movimento'}))},{title:'Esito registrato',body:'Costo ed esito sono già salvati. Saltare i rulli non cambia il risultato.'}],actions:[{label:'Salta i rulli',run:()=>{if(live()){this.mode='result';this.input.reset();audio.reelStop();}}}],primary:0,back};
  }
  if(mode==='review'){
   const action=this.pending!,preview=previewCasino(this.state,action);
   const paragraphs=preview.ok?preview.paragraphs.map(line=>copy(line).replace(/A conferma costo ed esito insieme\./i,'La conferma registra costo ed esito insieme.').replace(/B lo restituisce integro\./i,'Indietro annulla senza consumarlo.')):[copy(preview.error)];
   return {title:'Prima di confermare',blocks:[wallet,{title:'Costo e conseguenze',body:paragraphs.join('\n\n')}],actions:[{label:'Conferma',disabled:!preview.ok,run:()=>{if(live())this.commit(action);}}],primary:0,back};
  }
  if(mode==='result'){
   const result=this.result,blocks:UiBlock[]=[];
   if(result?.ok&&this.before){const b=this.before;blocks.push({title:'Variazioni registrate',facts:[{label:'Fondi',value:`${b.money} → ${this.state.money} €`},{label:'Fiche',value:`${b.chips} → ${this.state.chips}`},{label:'Sondaggi',value:`${b.polls} → ${this.state.sondaggi}%`},{label:'Fiducia',value:`${b.trust} → ${this.state.morale.trust} di 100`},{label:'Coesione',value:`${b.cohesion} → ${this.state.morale.cohesion} di 100`}]});}
   blocks.push({title:result?.ok?'Esito':'Operazione non disponibile',body:result?.ok?result.lines.map(copy).join('\n\n'):result?copy(result.error):'Nessuna operazione registrata.'});
   return {title:result?.ok?'Operazione registrata':'Operazione non disponibile',blocks,actions:[{label:'Continua',run:()=>{if(live())this.back();}}],primary:0,back};
  }
  const review=(action:CasinoAction)=>()=>{if(live())this.review(action);};
  const goto=(next:Mode)=>()=>{if(!live())return;this.mode=next;this.input.reset();audio.cursor();};
  if(mode==='change')return {title:'Cambio fiche',blocks:[wallet,{title:'Tasso di cambio',body:'100 € comprano 90 fiche. Vendere le stesse 90 fiche rende 80 €. Un giro completo costa 20 €.'}],actions:[false,true].flatMap(sell=>[1,5,10].map(units=>({label:`${sell?'Vendi':'Compra'} ${90*units} fiche`,hint:sell?`Ricevi ${80*units} €.`:`Costo ${100*units} €.`,group:sell?'Vendi':'Compra',run:review({kind:'exchange',sell,units})}))),back};
  if(mode==='prizes')return {title:'Premi di Palazzo',blocks:[wallet],actions:CASINO_PRIZES.map((prize,index)=>{const p=previewCasino(this.state,{kind:'prize',index});return {label:ITEMS[prize.itemId].name,hint:p.ok?`Costo ${prize.chips} fiche. Leggi l’effetto prima di acquistare.`:copy(p.error),disabled:!p.ok,run:review({kind:'prize',index})};}),back};
  if(mode==='club')return {title:'Invito al club',blocks:[wallet,{title:'Un invito al giorno',body:'L’invito costa 15 fiche. I tre tavoli hanno esiti diversi. Prima di confermare puoi leggere tutte le conseguenze possibili.'}],actions:CASINO_INVITES.map((invite,index)=>{const p=previewCasino(this.state,{kind:'club',index});return {label:copy(invite.name),hint:p.ok?'Tre esiti equiprobabili. Leggi il dossier.':copy(p.error),disabled:!p.ok,run:review({kind:'club',index})};}),back};
  const slot=previewCasino(this.state,{kind:'slot'});
  return {title:'Casinò di Palazzo',blocks:[wallet,{title:'Il banco ha una maggioranza',facts:[{label:'Giri in questa visita',value:String(this.spins)},{label:'Saldo dei giri',value:`${this.slotNet>0?'+':''}${this.slotNet} fiche`}]}],actions:[{label:'Slot del consenso',hint:slot.ok?'Costo 5 fiche. Leggi le probabilità.':copy(slot.error),disabled:!slot.ok,run:review({kind:'slot'})},{label:'Invito al club',hint:'15 fiche. Un invito al giorno.',run:goto('club')},{label:'Cambio fiche',hint:'Compra o vendi fiche con i fondi di gioco.',run:goto('change')},{label:'Premi di Palazzo',hint:'Oggetti e direttive per la borsa.',run:goto('prizes')}],back};
 }
 draw(screen:Screen):void {screen.clear('#17243d');}
}

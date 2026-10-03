import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {assegnaMinistro,MINISTERI,MINISTERO_ORDER,ministroDi,rimuoviMinistro,type MinisteroId} from '../game/governo';
import {speciesOf} from '../game/monster';
import {saveGame,type GameState} from '../game/state';
import type {UiPanel,UiBlock} from '../ui/kit';
const NAMES:Record<MinisteroId,string>={economia:'Economia',interno:'Interno',esteri:'Esteri',istruzione:'Istruzione',salute:'Salute',propaganda:'Propaganda'};
const copy=(s:string)=>s.replace(/Punti Consenso/g,'esperienza');
export class GovScene implements Scene {
 private index=0;
 private mode:'list'|'detail'|'review'|'result'='list';
 private pending:{uid:string;remove:boolean;holder:string|undefined}|null=null;
 private notice='';
 private receipt:UiBlock[]=[];
 constructor(private stack:SceneStack,private input:Input,private state:GameState){}
 private selected(){return MINISTERO_ORDER[this.index];}
 private holder(id:MinisteroId):string {
  const mon=ministroDi(this.state,id);return mon?speciesOf(mon).name:this.state.ministri[id]?'Compagno fuori squadra':'Incarico vacante';
 }
 private status(id:MinisteroId):string {
  const mon=ministroDi(this.state,id);return mon?`${speciesOf(mon).name}. ${mon.hp>0?'Attivo.':'KO: effetti sospesi.'}`:this.state.ministri[id]?'Fuori squadra: effetti sospesi.':'Incarico vacante.';
 }
 private back():void {
  if(this.stack.top!==this)return;
  this.input.reset();audio.cancel();this.notice='';
  if(this.mode==='list'){this.stack.pop();return;}
  this.mode=this.mode==='detail'?'list':'detail';this.pending=null;
 }
 private review(uid:string,remove:boolean):void {
  if(this.stack.top!==this||this.mode!=='detail')return;
  const id=this.selected();if(remove?this.state.ministri[id]!==uid:!this.state.party.some(m=>m.uid===uid))return;
  this.pending={uid,remove,holder:this.state.ministri[id]};this.mode='review';this.input.reset();audio.cursor();
 }
 private commit(pending:NonNullable<GovScene['pending']>):void {
  if(this.stack.top!==this||this.mode!=='review'||this.pending!==pending)return;
  const id=this.selected(),mon=this.state.party.find(m=>m.uid===pending.uid);
  if(this.state.ministri[id]!==pending.holder||!pending.remove&&!mon){this.notice='La squadra o l’incarico sono cambiati. Torna al dossier e scegli di nuovo.';audio.cancel();return;}
  const old=MINISTERO_ORDER.find(key=>this.state.ministri[key]===pending.uid);
  const before=this.holder(id),oldBefore=old&&old!==id?this.holder(old):null;
  this.pending=null;this.mode='result';this.input.reset();
  if(pending.remove)rimuoviMinistro(this.state,id);else assegnaMinistro(this.state,id,mon!);
  saveGame(this.state);audio.confirm();
  this.receipt=[{title:'Incarico registrato',facts:[{label:NAMES[id],value:`${before} → ${this.holder(id)}`},...(old&&old!==id&&oldBefore?[{label:NAMES[old],value:`${oldBefore} → ${this.holder(old)}`}]:[])]},{title:'Stato attuale',body:this.status(id)}];
 }
 get uiPanel():UiPanel {
  const mode=this.mode,id=this.selected(),def=MINISTERI[id];
  const live=()=>this.stack.top===this&&this.mode===mode&&this.selected()===id;
  const back={label:'Indietro',hint:mode==='list'?'Torna alla campagna.':mode==='detail'?'Torna ai ministeri.':'Torna al dossier.',run:()=>{if(live())this.back();}};
  if(mode==='list')return {title:'Governo ombra',subtitle:'Le sedie cambiano. Il conto resta.',actions:MINISTERO_ORDER.map((key,index)=>({label:NAMES[key],hint:this.status(key),run:()=>{if(!live())return;this.index=index;this.mode='detail';this.input.reset();audio.cursor();}})),selected:this.index,back};
  const blocks:UiBlock[]=[{title:'Beneficio',body:copy(def.desc)},{title:'Costo',body:copy(def.malus)},{title:'Incarico attuale',body:this.status(id)},{title:'Un incarico per compagno',body:'Benefici e costi sono sospesi se il ministro è KO o fuori squadra. Assegnare un nuovo ministero libera quello precedente.'}];
  if(mode==='result')return {title:'Incarico registrato',blocks:this.receipt,actions:[{label:'Continua',run:()=>{if(live())this.back();}}],primary:0,back};
  if(mode==='review'){
   const pending=this.pending!,mon=this.state.party.find(m=>m.uid===pending.uid),old=MINISTERO_ORDER.find(key=>this.state.ministri[key]===pending.uid);
   blocks.push({title:pending.remove?'Sfiducia':'Nomina',facts:[{label:NAMES[id],value:`${this.holder(id)} → ${pending.remove?'Incarico vacante':mon?speciesOf(mon).name:'Compagno non disponibile'}`}],body:pending.remove?'Il beneficio e il costo di questo incarico smettono di applicarsi.':`${old&&old!==id?`Lascia il ministero ${NAMES[old].toLocaleLowerCase('it')}. `:''}${mon&&mon.hp<=0?'È KO: gli effetti saranno sospesi.':''}`});
   if(this.notice)blocks.push({title:'Incarico non registrato',body:this.notice});
   return {title:`Firma: ${NAMES[id]}`,blocks,actions:[{label:pending.remove?'Conferma la sfiducia':'Firma la nomina',disabled:!pending.remove&&!mon||this.state.ministri[id]!==pending.holder,run:()=>{if(live())this.commit(pending);}}],primary:0,back};
  }
  return {title:NAMES[id],blocks,actions:[...(this.state.ministri[id]?[{label:'Sfiducia il ministro',hint:'Libera l’incarico. Leggi la conferma prima di firmare.',run:()=>{if(live())this.review(this.state.ministri[id]!,true);}}]:[]),...this.state.party.filter(mon=>mon.uid!==this.state.ministri[id]).map(mon=>({label:`Nomina ${speciesOf(mon).name}`,hint:mon.hp>0?'Leggi la nomina prima di firmare.':'È KO: gli effetti saranno sospesi.',run:()=>{if(live())this.review(mon.uid,false);}}))],back};
 }
 update():void {}
 draw(screen:Screen):void {screen.clear('#17243d');}
}

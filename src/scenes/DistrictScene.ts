import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {audio} from '../engine/audio';
import {ALLY_NAMES,type AllyId} from '../game/coalition';
import {DISTRICT_CONTENT,districtActionCount} from '../game/districtCampaign';
import {commitDistrictDecision,previewDistrictDecision,type DistrictChoice,type DistrictPreview} from '../game/districtDecisions';
import type {DistrictId} from '../game/election';
import {saveGame,type GameState} from '../game/state';
import type {UiPanel,UiBlock} from '../ui/kit';
import {readableCopy} from '../ui/kit/copy';

const copy=(text:string)=>readableCopy(text).replace(/\bCOE\b/gi,'coesione');
type Choice={choice:DistrictChoice;ally?:AllyId};
export class DistrictScene implements Scene {
 readonly transparent=false;
 private mode:'menu'|'review'|'result'|'history'='menu';
 private pending:Choice|null=null;
 private result:DistrictPreview|null=null;
 private before:{local:number;money:number;cohesion:number}|null=null;
 private notice='';
 private committing=false;
 constructor(private stack:SceneStack,private input:Input,private state:GameState,private districtId:DistrictId,private onDebate:()=>void){}
 private back():void {
  if(this.stack.top!==this||this.committing)return;
  this.input.reset();audio.cancel();
  if(this.mode==='menu'){this.stack.pop();return;}
  this.mode='menu';this.pending=null;this.result=null;this.before=null;this.notice='';
 }
 private review(pending:Choice):void {
  if(this.stack.top!==this||this.mode!=='menu'||this.committing)return;
  const preview=previewDistrictDecision(this.state,this.districtId,pending.choice,pending.ally);
  this.input.reset();
  if(!preview.ok){this.notice=copy(preview.error);audio.cancel();return;}
  this.pending=pending;this.mode='review';this.notice='';audio.cursor();
 }
 private commit(pending:Choice):void {
  if(this.stack.top!==this||this.mode!=='review'||this.pending!==pending||this.committing)return;
  this.committing=true;this.input.reset();
  const district=this.state.election.districts.find(d=>d.id===this.districtId)!;
  const before={local:district.localConsensus,money:this.state.money,cohesion:this.state.morale.cohesion};
  const result=commitDistrictDecision(this.state,this.districtId,pending.choice,pending.ally);
  if(!result.ok){this.notice=copy(result.error);this.committing=false;audio.cancel();return;}
  if(pending.choice==='debate'){this.stack.pop();this.onDebate();return;}
  this.before=before;this.result=result;this.mode='result';saveGame(this.state);this.committing=false;audio.confirm();
 }
 get uiPanel():UiPanel {
  const content=DISTRICT_CONTENT[this.districtId],district=this.state.election.districts.find(d=>d.id===this.districtId)!;
  const back={label:'Indietro',hint:this.mode==='menu'?'Torna alla campagna.':'Torna alle azioni del collegio.',run:()=>this.back()};
  const summary:UiBlock={title:'Collegio',facts:[{label:'Consenso locale',value:`${district.localConsensus}%`},{label:'Azioni svolte',value:`${districtActionCount(this.state.election,this.districtId)} di 2`}]};
  if(this.mode==='menu'){
   const choices:Choice[]=[{choice:'debate'},{choice:'prudent'},{choice:'risky'},...this.state.coalition.members.map(m=>({choice:'endorsement' as const,ally:m.allyId}))];
   if(!this.state.coalition.members.length)choices.push({choice:'endorsement'});
   return {title:copy(content.name),subtitle:copy(content.problem),blocks:[summary,{title:'Due azioni per collegio',body:'Dibattito, promessa o sostegno: puoi sceglierne due. Una promessa prudente e una rischiosa occupano lo stesso tipo di azione.'},...(this.notice?[{title:'Azione non disponibile',body:this.notice}]:[])],
    actions:[...choices.map(pending=>{
     const p=previewDistrictDecision(this.state,this.districtId,pending.choice,pending.ally);
     const label=pending.choice==='debate'?'Dibattito':pending.choice==='prudent'?copy(content.prudent):pending.choice==='risky'?copy(content.risky):pending.ally?`Sostegno: ${ALLY_NAMES[pending.ally]}`:'Sostegno';
     const hint=!p.ok?copy(p.error):pending.choice==='debate'?`Lotta manuale. In caso di vittoria: +${p.localDelta} punti di consenso locale.`:`Consenso locale ${p.localDelta>=0?'+':''}${p.localDelta} punti. Costo ${-p.moneyDelta} €. Coesione ${p.cohesionDelta} punti.`;
     return {label,hint,disabled:!p.ok,run:()=>this.review(pending)};
    }),{label:'Verbale del collegio',hint:'Rileggi le azioni già registrate.',run:()=>{if(this.stack.top!==this||this.mode!=='menu')return;this.mode='history';this.input.reset();audio.cursor();}}],back};
  }
  if(this.mode==='history')return {title:'Verbale del collegio',subtitle:copy(content.name),blocks:[summary,
   ...district.outcomes.map(o=>({title:o.action==='debate'?'Dibattito':o.action==='promise'?'Promessa':'Sostegno',body:o.action==='debate'?o.variant==='win'?'Vittoria.':'Sconfitta.':o.action==='promise'?o.variant==='risky'?'Promessa rischiosa.':'Promessa prudente.':o.allyId?ALLY_NAMES[o.allyId]:'Registrato.'})),
   {title:district.outcomes.length===2?'Dossier chiuso':'Azioni disponibili',body:district.outcomes.length===2?'La terza azione resta esclusa.':`Puoi scegliere ancora ${2-district.outcomes.length} azioni.`}],actions:[],back};
  const pending=this.pending!;
  const preview=this.result??previewDistrictDecision(this.state,this.districtId,pending.choice,pending.ally);
  const blocks:UiBlock[]=[];
  if(preview.ok){
   if(pending.choice!=='debate'){
    const before=this.before??{local:district.localConsensus,money:this.state.money,cohesion:this.state.morale.cohesion};
    blocks.push({title:this.result?'Variazioni registrate':'Conseguenze previste',facts:[{label:'Consenso locale',value:`${before.local} → ${before.local+preview.localDelta}%`},{label:'Fondi',value:`${before.money} → ${before.money+preview.moneyDelta} €`},{label:'Coesione',value:`${before.cohesion} → ${before.cohesion+preview.cohesionDelta} di 100`}]});
   }
   blocks.push({title:pending.choice==='debate'?'Prima del dibattito':'Dossier della scelta',body:preview.lines.map(copy).join('\n\n')});
  }else blocks.push({title:'Azione non disponibile',body:copy(preview.error)});
  if(this.notice)blocks.push({title:'La scelta non è stata registrata',body:this.notice});
  return {title:this.result?'Scelta registrata':'Esamina la scelta',subtitle:copy(content.name),blocks,
   actions:[{label:this.result?'Torna al collegio':pending.choice==='debate'?'Inizia il dibattito':'Conferma la scelta',disabled:!preview.ok||this.committing,run:()=>this.result?this.back():this.commit(pending)}],primary:0,back};
 }
 update():void {}
 draw(screen:Screen):void {screen.clear('#17243d');}
}

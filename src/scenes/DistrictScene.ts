import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {audio} from '../engine/audio';
import {ALLY_NAMES,type AllyId} from '../game/coalition';
import {DISTRICT_CONTENT,districtActionCount} from '../game/districtCampaign';
import {commitDistrictDecision,previewDistrictDecision,type DistrictChoice,type DistrictPreview} from '../game/districtDecisions';
import type {DistrictId} from '../game/election';
import {saveGame,type GameState} from '../game/state';
import {drawScreenHeader} from '../ui/widgets';
import {drawCampaignBackdrop} from '../ui/campaignArt';
import {dossierPages,drawDossierPage} from '../ui/dossier';

const CHOICES:readonly DistrictChoice[]=['debate','prudent','risky','endorsement'];
export class DistrictScene implements Scene{
 readonly transparent=false;
 private index=0;
 private allyIndex=0;
 private mode:'menu'|'review'|'result'|'history'='menu';
 private page=0;
 private notice='';
 private pending:{choice:DistrictChoice;ally?:AllyId}|null=null;
 private result:DistrictPreview|null=null;
 constructor(private stack:SceneStack,private input:Input,private state:GameState,private districtId:DistrictId,private onDebate:()=>void){}
 private allies(){return this.state.coalition.members.map(m=>m.allyId);}
 private selected(){return {choice:CHOICES[this.index],ally:this.allies()[this.allyIndex]};}
 private preview(){const p=this.pending??this.selected();return this.result??previewDistrictDecision(this.state,this.districtId,p.choice,p.ally);}
 private pages():string[][]{
  const district=this.state.election.districts.find(d=>d.id===this.districtId)!;
  const preview=this.preview();
  const paragraphs=this.mode==='history'?[
   `CONSENSO LOCALE ${district.localConsensus}%. ${district.outcomes.length}/2 AZIONI.`,
   ...district.outcomes.map(o=>o.action==='debate'?`DIBATTITO: ${o.variant==='win'?'VITTORIA':'SCONFITTA'}.`:o.action==='promise'?`PROMESSA: ${o.variant==='risky'?'RISCHIOSA':'PRUDENTE'}.`:`SOSTEGNO: ${o.allyId?ALLY_NAMES[o.allyId]:'REGISTRATO'}.`),
   district.outcomes.length===2?'DOSSIER CHIUSO. LA TERZA AZIONE RESTA ESCLUSA.':`PUOI SCEGLIERE ANCORA ${2-district.outcomes.length} AZIONI.`
  ]:preview.ok?preview.lines:[preview.error];
  return dossierPages(paragraphs,5);
 }
 update():void{
  if(this.mode!=='menu'){
   const count=this.pages().length;
   if(this.input.wasPressed('left')||this.input.wasPressed('up'))this.page=Math.max(0,this.page-1);
   if(this.input.wasPressed('right')||this.input.wasPressed('down'))this.page=Math.min(count-1,this.page+1);
   if(this.input.wasPressed('b')){this.back();return;}
   if(!this.input.wasPressed('a'))return;
   if(this.page<count-1){this.page++;audio.cursor();return;}
   if(this.mode!=='review'){this.back();return;}
   const pending=this.pending!;
   const result=commitDistrictDecision(this.state,this.districtId,pending.choice,pending.ally);
   if(!result.ok){this.back();this.notice=result.error;audio.cancel();return;}
   if(pending.choice==='debate'){this.stack.pop();this.onDebate();return;}
   this.result=result;this.mode='result';this.page=0;saveGame(this.state);audio.confirm();return;
  }
  if(this.input.wasPressed('b')){this.stack.pop();return;}
  if(this.input.wasPressed('start')){this.mode='history';this.page=0;return;}
  if(this.input.wasPressed('up')){this.index=(this.index+3)%4;this.notice='';audio.cursor();}
  if(this.input.wasPressed('down')){this.index=(this.index+1)%4;this.notice='';audio.cursor();}
  const allies=this.allies();
  if(this.index===3&&allies.length&&(this.input.wasPressed('left')||this.input.wasPressed('right'))){this.allyIndex=(this.allyIndex+(this.input.wasPressed('left')?allies.length-1:1))%allies.length;this.notice='';audio.cursor();}
  if(!this.input.wasPressed('a'))return;
  const pending=this.selected(),preview=previewDistrictDecision(this.state,this.districtId,pending.choice,pending.ally);
  if(!preview.ok){this.notice=preview.error;audio.cancel();return;}
  this.pending=pending;this.mode='review';this.page=0;audio.cursor();
 }
 private back(){this.mode='menu';this.page=0;this.pending=null;this.result=null;}
 draw(screen:Screen):void{
  drawCampaignBackdrop(screen,`district-${this.districtId}`);
  const content=DISTRICT_CONTENT[this.districtId],district=this.state.election.districts.find(d=>d.id===this.districtId)!;
  drawScreenHeader(screen,content.name,`${district.localConsensus}% · ${districtActionCount(this.state.election,this.districtId)}/2`);
  if(this.mode!=='menu'){
   this.page=drawDossierPage(screen,this.pages(),this.page,this.mode==='review'?'DOSSIER SCELTA':this.mode==='result'?'SCELTA REGISTRATA':'VERBALE COLLEGIO',this.mode==='result',this.mode==='review'?'A CONFERMA':'A MENU',this.mode==='review'?'B ANNULLA':'B MENU',77);return;
  }
  screen.rect(8,45,224,12,'#17243d');screen.text(content.problem,10,48,'#ffe38a');
  const labels=['DIBATTITO',content.prudent,content.risky,'SOSTEGNO ◄►'],ally=this.allies()[this.allyIndex];
  CHOICES.forEach((choice,i)=>{
   const p=previewDistrictDecision(this.state,this.districtId,choice,ally),y=59+i*24;
   screen.panel(8,y,224,23,'card');if(this.index===i)screen.rect(12,y+3,216,10,'#f4d34a');
   screen.text(labels[i],15,y+5,p.ok?'#10141f':'#68758a');
   const value=!p.ok?p.error:choice==='debate'?`VITTORIA +${p.localDelta} · LOTTA MANUALE`:choice==='endorsement'?`${ally?ALLY_NAMES[ally]:'NESSUNO'} ${p.localDelta>=0?'+':''}${p.localDelta}`:`+${p.localDelta} LOC. · ${-p.moneyDelta}€ · COE ${p.cohesionDelta}`;
   screen.textFit(value,15,y+16,210,p.ok?i===2?'#a0443e':'#26745d':'#68758a');
  });
  screen.rect(0,154,240,26,'#17243d');screen.textFit(this.notice||'DUE AZIONI SU TRE · MENU: VERBALE',8,156,224,'#fffaf0');
  screen.text('SU/GIU SCEGLI · A DOSSIER · B ESCI',8,169,'#ffe38a');
 }
}

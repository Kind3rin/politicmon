import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {audio} from '../engine/audio';
import {claimWeeklyReward,resolveWeeklyStage,startWeeklyCampaign,weeklyReward,weeklySchedule,type WeeklyCampaignState,type WeeklyEventChoice} from '../game/weeklyCampaign';
import {saveGame,type GameState} from '../game/state';
import {grantSeasonalForm,memeForm} from '../game/memeForms';
import {applyMemeEffects,canApplyMemeEffects} from '../game/memeEventRuntime';
import {ITEMS} from '../data/items';
import type {UiPanel,UiBlock} from '../ui/kit';
import {readableCopy} from '../ui/kit/copy';
const copy=(s:string)=>readableCopy(s).replace(/\bSOND\b/gi,'sondaggi').replace(/\bFID\b/gi,'fiducia').replace(/\bCOE\b/gi,'coesione').replace(/\brun\b/gi,'della settimana');
export class WeeklyCampaignScene implements Scene {
 readonly transparent=false;
 private receipt:UiBlock[]|null=null;
 private rewardReceipt=false;
 private notice='';
 constructor(private stack:SceneStack,private input:Input,private state:GameState,private onDebate:(index:number)=>void){state.weeklyCampaign=startWeeklyCampaign(state.weeklyCampaign);saveGame(state);}
 private live(weekly:WeeklyCampaignState):boolean {return this.stack.top===this&&!this.receipt&&this.state.weeklyCampaign===weekly;}
 private leave():void {if(this.stack.top!==this)return;this.input.reset();audio.cancel();this.stack.pop();}
 private choose(weekly:WeeklyCampaignState,index:number):void {
  if(!this.live(weekly))return;
  const stage=weeklySchedule(weekly)[weekly.cursor],selected=stage?.event?.choices[index];
  if(stage?.kind!=='event'||!selected)return;
  if(!canApplyMemeEffects(this.state,selected.effects)){this.notice='Fondi insufficienti.';audio.cancel();return;}
  const before={money:this.state.money,polls:this.state.sondaggi,trust:this.state.morale.trust,cohesion:this.state.morale.cohesion,score:weekly.score};
  const bagBefore={...this.state.bag},districtBefore=new Map<string,number>(this.state.election.districts.map(d=>[d.id,d.localConsensus]));
  this.receipt=[];this.input.reset();applyMemeEffects(this.state,selected.effects);this.state.weeklyCampaign=resolveWeeklyStage(weekly,selected.label,selected.delta);saveGame(this.state);audio.confirm();this.notice='';
  this.receipt=[{title:copy(selected.label),body:(selected.lines??['La scelta entra nel verbale.']).map(copy).join('\n\n')},
   {title:'Variazioni registrate',facts:[{label:'Consenso della settimana',value:`${before.score} → ${this.state.weeklyCampaign.score}`},{label:'Fondi',value:`${before.money} → ${this.state.money} €`},{label:'Sondaggi',value:`${before.polls} → ${this.state.sondaggi}%`},{label:'Fiducia',value:`${before.trust} → ${this.state.morale.trust} di 100`},{label:'Coesione',value:`${before.cohesion} → ${this.state.morale.cohesion} di 100`}]},
   ...((selected.effects??[]).some(effect=>effect.kind==='item'||effect.kind==='territory')?[{title:'Altri effetti registrati',facts:(selected.effects??[]).flatMap(effect=>effect.kind==='item'?[{label:ITEMS[effect.id]?.name??effect.id,value:`${bagBefore[effect.id]??0} → ${this.state.bag[effect.id]??0}`}]:effect.kind==='territory'?[{label:`Consenso locale: ${effect.id}`,value:`${districtBefore.get(effect.id)??0} → ${this.state.election.districts.find(d=>d.id===effect.id)?.localConsensus??0}%`}]:[])}]:[])];
 }
 private effectBlocks(choice:WeeklyEventChoice):UiBlock[] {
  const other=(choice.effects??[]).filter(effect=>effect.kind==='item'||effect.kind==='territory'||effect.kind==='flag').map(effect=>effect.kind==='item'?`${ITEMS[effect.id]?.name??effect.id}: ${effect.qty>0?'+':''}${effect.qty}.`:effect.kind==='territory'?`Consenso locale nel ${effect.id}: ${effect.delta>0?'+':''}${effect.delta} punti.`:'La scelta viene registrata nella storia.');
  const body=(choice.effects??[]).filter(effect=>effect.kind==='money'||effect.kind==='sondaggi'||effect.kind==='trust'||effect.kind==='cohesion').map(effect=>`${effect.kind==='money'?'Fondi':effect.kind==='sondaggi'?'Sondaggi':effect.kind==='trust'?'Fiducia':'Coesione'}: ${effect.delta>0?'+':''}${effect.delta}${effect.kind==='money'?' €':' punti'}.`);
  return [{title:'Conseguenze',body:[`I valori di fiducia, coesione e consenso locale restano tra 0 e 100.`,`Consenso della settimana: ${choice.delta>0?'+':''}${choice.delta} punti.`,...body].join('\n\n')},...(other.length?[{title:'Altri effetti',body:other.join('\n\n')}]:[])];
 }
 private claim(weekly:WeeklyCampaignState):void {
  if(!this.live(weekly))return;
  const after=claimWeeklyReward(weekly);if(after===weekly){this.leave();return;}
  const reward=weeklyReward(weekly),money=this.state.money,ballots=this.state.bag.schedona??0;
  this.receipt=[];this.rewardReceipt=true;this.input.reset();this.state.money+=reward.money;this.state.bag.schedona=ballots+reward.ballots;
  let formId='';
  if(weekly.score>=8){const form=grantSeasonalForm(this.state.party,this.state.unlockedMemeForms);this.state.unlockedMemeForms=form.unlocked;formId=form.formId??'';}
  this.state.weeklyCampaign=after;saveGame(this.state);audio.catchJingle();
  const form=memeForm(formId);
  this.receipt=[{title:'Premio accreditato',facts:[{label:'Fondi',value:`${money} → ${this.state.money} €`},{label:ITEMS.schedona.name,value:`${ballots} → ${this.state.bag.schedona}`}],body:'Il premio di questa settimana è stato riscosso.'},...(form?[{title:'Forma meme sbloccata',body:form.name}]:[])];
 }
 get uiPanel():UiPanel {
  const weekly=this.state.weeklyCampaign;
  const back={label:'Indietro',hint:'Salva ed esci: riprendi da questo punto.',run:()=>this.leave()};
  if(this.receipt)return {title:this.rewardReceipt?'Premio della settimana':'Scelta registrata',blocks:this.receipt,actions:[{label:this.rewardReceipt?'Torna alla campagna':'Continua',run:()=>{if(this.stack.top!==this||!this.receipt)return;this.input.reset();audio.confirm();if(this.rewardReceipt)this.leave();else this.receipt=null;}}],primary:0,back};
  const summary:UiBlock={title:'La settimana',facts:[{label:'Settimana',value:weekly.weekKey},{label:'Tappe concluse',value:`${Math.min(weekly.cursor,9)} di 9`},{label:'Consenso della settimana',value:String(weekly.score)},{label:'Fondi disponibili',value:`${this.state.money} €`}]};
  if(weekly.phase==='complete'){
   const reward=weeklyReward(weekly);
   return {title:'Finale settimanale',blocks:[summary,{title:weekly.score>=8?'Trionfo':weekly.score>=3?'In onda':'Resistenza',facts:[{label:'Premio',value:`${reward.money} €`},{label:ITEMS.schedona.name,value:String(reward.ballots)}],body:weekly.rewardClaimed?'Premio già riscosso.':weekly.score>=8?'Il trionfo assegna anche una forma meme se hai un compagno idoneo.':'Il premio si ritira una volta per settimana.'}],actions:[{label:weekly.rewardClaimed?'Torna alla campagna':'Ritira il premio',run:()=>this.claim(weekly)}],primary:0,back};
  }
  const stage=weeklySchedule(weekly)[weekly.cursor];
  if(!stage)return {title:'Campagna settimanale',blocks:[summary,{title:'Tappe',body:'Nessuna tappa disponibile.'}],actions:[],back};
  if(stage.kind==='event'&&stage.event)return {title:copy(stage.event.title),blocks:[summary,{title:'Il fatto',body:copy(stage.event.text)},...(this.notice?[{title:'Scelta non disponibile',body:this.notice}]:[])],actions:stage.event.choices.map((choice,index)=>({label:copy(choice.label),hint:this.effectBlocks(choice).map(block=>block.body).join('\n\n'),disabled:!canApplyMemeEffects(this.state,choice.effects),run:()=>this.choose(weekly,index)})),back};
  if(stage.kind==='debate')return {title:`Dibattito ${stage.debateIndex} di 3`,blocks:[summary,{title:'In diretta',body:'Una lotta manuale. Il risultato cambia il consenso della settimana.',facts:[{label:'Vittoria',value:'+4 punti'},{label:'Sconfitta',value:'−2 punti'}]}],actions:[{label:'Vai in diretta',run:()=>{if(!this.live(weekly))return;this.input.reset();this.stack.pop();this.onDebate(stage.debateIndex??1);}}],primary:0,back};
  return {title:'Scrutinio della settimana',blocks:[summary,{title:'Il verbale',body:'Cinque eventi e tre dibattiti sono nel verbale. Chiudi lo scrutinio per vedere il premio.'}],actions:[{label:'Chiudi lo scrutinio',run:()=>{if(!this.live(weekly))return;this.input.reset();this.state.weeklyCampaign=resolveWeeklyStage(weekly,'finale',0);saveGame(this.state);audio.catchJingle();}}],primary:0,back};
 }
 update():void {}
 draw(screen:Screen):void {screen.clear('#17243d');}
}

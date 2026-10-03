import {currentQuest,QUESTS} from '../data/quests';
import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {dailyQuestStatus,type DailyQuestStatus} from '../game/dailyquests';
import type {GameState} from '../game/state';
import type {UiPanel} from '../ui/kit';
import type {TouchAction} from '../engine/touchActions';

const label=(text:string)=>text.charAt(0)+text.slice(1).toLocaleLowerCase('it');
export class QuestScene implements Scene {
 private index=0;
 private daily:DailyQuestStatus[];
 private detailPage=0;
 private fromList=false;
 constructor(private stack:SceneStack,private input:Input,private state:GameState){
  const current=currentQuest(state),index=current?QUESTS.findIndex(quest=>quest.id===current.id):-1;
  this.index=Math.max(0,index);this.daily=dailyQuestStatus(state);
 }
 private back():void{
  if(this.stack.top!==this)return;this.input.reset();audio.cancel();
  if(this.detailPage===0&&this.fromList){this.detailPage=-1;this.fromList=false;}
  else if(this.detailPage<0){this.detailPage=0;this.fromList=false;const current=currentQuest(this.state);if(current)this.index=QUESTS.indexOf(current);}
  else this.stack.pop();
 }
 get uiPanel():UiPanel{
  const phase=this.detailPage,index=this.index;
  const command=(name:string,run:()=>void,hint?:string):TouchAction=>({label:name,hint,run:()=>{if(this.stack.top!==this||phase!==this.detailPage||index!==this.index)return;this.input.reset();audio.cursor();run();}});
  const back={label:'Indietro',run:()=>this.back()};
  if(phase===-2)return {title:'Missioni del giorno',subtitle:'Tre obiettivi. Si rinnovano a mezzanotte.',blocks:this.daily.map(daily=>({title:label(daily.quest.title),facts:[{label:'Progresso',value:`${daily.count} di ${daily.quest.target}`},{label:'Ricompensa',value:`${daily.quest.reward} €`},{label:'Stato',value:daily.done?'Completata':'In corso'}]})),actions:[],back:back,selected:0};
  if(phase===-1){
   const current=currentQuest(this.state),ordered=QUESTS.map((quest,i)=>({quest,i})).sort((a,b)=>Number(!!a.quest.side)-Number(!!b.quest.side));
   return {title:'Elenco delle missioni',subtitle:`${QUESTS.filter(quest=>quest.isDone(this.state)).length} di ${QUESTS.length} completate.`,actions:ordered.map(({quest,i})=>({...command(label(quest.title),()=>{this.index=i;this.detailPage=0;this.fromList=true;},quest.isDone(this.state)?'Completata':quest.id===current?.id?'Obiettivo corrente':quest.step),group:quest.side?'Missioni facoltative':'Campagna'})),selected:ordered.findIndex(entry=>entry.i===this.index),back:back};
  }
  const quest=QUESTS[this.index],done=quest.isDone(this.state),current=currentQuest(this.state);
  return {title:label(quest.title),subtitle:`${quest.side?'Missione facoltativa':'Campagna'} · ${done?'Completata':current?.id===quest.id?'Obiettivo corrente':'Da svolgere'}`,
   blocks:[{title:'Prossimo passo',body:quest.step},{title:'Dove andare',body:quest.hint},{title:'Obiettivo',body:quest.desc}],
   actions:[command('Elenco delle missioni',()=>{this.detailPage=-1;this.fromList=false;},'Campagna e obiettivi facoltativi.'),command('Missioni del giorno',()=>{this.detailPage=-2;},'Progresso e ricompense dei tre obiettivi.')],selected:0,back:back};
 }
 update():void{if(this.input.wasPressed('b'))this.back();}
 draw(screen:Screen):void{screen.clear('#101b32');}
}

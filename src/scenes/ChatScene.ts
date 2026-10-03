import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {mp} from '../net/mp';
import {PHRASES,EMOTES} from '../ui/kit/communication';
import type {UiPanel,UiBlock} from '../ui/kit';
import {readableCopy} from '../ui/kit/copy';
export class ChatScene implements Scene {
 private tab=0;
 private draft='';
 private notice='';
 constructor(private stack:SceneStack,private input:Input){}
 private send(text:string,tab:number):void {
  if(this.stack.top!==this||this.tab!==tab)return;
  const message=text.trim().slice(0,60);if(!message)return;
  if(!mp.connected){this.notice='Sei offline: il messaggio non è stato inviato.';audio.cancel();return;}
  this.input.reset();mp.sendChat(message);audio.confirm();if(tab===1)this.draft='';this.notice='Messaggio inviato.';
 }
 get uiPanel():UiPanel {
  const tab=this.tab,live=()=>this.stack.top===this&&this.tab===tab;
  const blocks:UiBlock[]=[{title:mp.connected?'Nella zona':'Offline',body:mp.connected?`${mp.onlineCount+1} giocatori nella zona. I messaggi sono visibili nella mappa attuale.`:'Sei offline: i messaggi e le emote non possono essere inviati.'},
   ...(mp.chat.length?mp.chat.slice(-40).map(line=>({title:mp.chatNick(line),body:line.text})):[{title:'Conversazione',body:'Nessun messaggio nella zona.'}]),
   ...(this.notice?[{title:'Invio',body:this.notice}]:[])];
  const tabs=['Frasi rapide','Scrivi','Emote'].map((label,index)=>({label,run:()=>{if(!live())return;this.tab=index;this.notice='';this.input.reset();audio.cursor();}}));
  const back={label:'Indietro',hint:'Chiudi la chat.',run:()=>{if(!live())return;this.input.reset();audio.cancel();this.stack.pop();}};
  if(tab===1)return {title:'Chat di zona',tabs,selectedTab:tab,blocks,
   field:{label:'Messaggio',value:this.draft,singleLine:true,maxLength:60,autofocus:true,placeholder:'Scrivi un messaggio',onChange:value=>{if(live())this.draft=value;},onSubmit:()=>this.send(this.draft,tab)},
   actions:[{label:'Invia',disabled:!mp.connected||!this.draft.trim(),run:()=>this.send(this.draft,tab)}],primary:0,back};
  return {title:'Chat di zona',tabs,selectedTab:tab,blocks,
   actions:tab===0?PHRASES.map(text=>({label:readableCopy(text),hint:'Invia questa frase nella chat.',disabled:!mp.connected,run:()=>this.send(text,tab)})):EMOTES.map(emote=>({label:`${emote.ch} · ${readableCopy(emote.label)}`,hint:'Mostra un fumetto sulla mappa.',disabled:!mp.connected,run:()=>{if(!live()||!mp.connected)return;this.input.reset();mp.sendEmote(emote.ch);audio.confirm();this.notice=mp.connected?'Emote inviata: appare sulla mappa.':'Sei offline: nessuna emote inviata agli altri giocatori.';}})),back};
 }
 update():void {}
 draw(screen:Screen):void {screen.clear('#17243d');}
}

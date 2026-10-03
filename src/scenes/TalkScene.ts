import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {mp} from '../net/mp';
import {TALK_INVITE_TIMEOUT,type DuelMsg} from '../net/duelproto';
import {loadNick} from '../net/profile';
import {PHRASES} from '../ui/kit/communication';
import type {UiPanel,UiBlock} from '../ui/kit';
import {readableCopy} from '../ui/kit/copy';
export interface TalkOptions {peerId:string;peerNick:string;talkId:string;role:'host'|'guest';}
interface TalkLine {me:boolean;text:string;}
export class TalkScene implements Scene {
 private lines:TalkLine[]=[];
 private waiting:boolean;
 private waitT=TALK_INVITE_TIMEOUT;
 private closing=false;
 private active=false;
 private endNotice='';
 private draft='';
 private tab=0;
 private prevOnDuel:typeof mp.onDuel=null;
 private prevOnPeerGone:typeof mp.onPeerGone=null;
 constructor(private stack:SceneStack,private input:Input,private opts:TalkOptions){this.waiting=opts.role==='host';}
 onEnter():void {
  this.active=true;mp.duelBusy=true;this.prevOnDuel=mp.onDuel;this.prevOnPeerGone=mp.onPeerGone;
  mp.onDuel=(message,peerId)=>this.onTalkMsg(message,peerId);
  mp.onPeerGone=peerId=>{if(this.active&&peerId===this.opts.peerId)this.end('Si è scollegato. Fine del confronto.');};
  mp.sendDuel(this.opts.role==='host'?{v:1,duelId:this.opts.talkId,type:'talk-invite',nick:loadNick()||'ANONIMO'}:{v:1,duelId:this.opts.talkId,type:'talk-accept'},this.opts.peerId);
 }
 onExit():void {this.active=false;mp.duelBusy=false;mp.onDuel=this.prevOnDuel;mp.onPeerGone=this.prevOnPeerGone;}
 private onTalkMsg(msg:DuelMsg,peerId:string):void {
  if(!this.active||this.closing)return;
  if(msg.type==='talk-invite'&&!(peerId===this.opts.peerId&&msg.duelId===this.opts.talkId)){mp.sendDuel({v:1,duelId:msg.duelId,type:'talk-decline',reason:'OCCUPATO'},peerId);return;}
  if(peerId!==this.opts.peerId||msg.duelId!==this.opts.talkId)return;
  switch(msg.type){
   case 'talk-accept':this.waiting=false;audio.confirm();return;
   case 'talk-decline':this.end(msg.reason==='OCCUPATO'?`${this.opts.peerNick} è occupato in un altro dibattito.`:`${this.opts.peerNick} ha rifiutato il confronto.`);return;
   case 'talk-line':{const text=String(msg.text??'').slice(0,80);if(text){this.waiting=false;this.lines.push({me:false,text});this.trimLines();audio.cursor();}return;}
   case 'talk-end':this.end(`${this.opts.peerNick} ha chiuso la conversazione.`);return;
  }
 }
 private end(text:string):void {if(this.closing)return;this.closing=true;this.endNotice=text;this.input.reset();audio.cancel();}
 private leave():void {
  if(this.stack.top!==this)return;
  this.input.reset();
  if(!this.closing){this.closing=true;mp.sendDuel({v:1,duelId:this.opts.talkId,type:'talk-end'},this.opts.peerId);}
  audio.cancel();this.stack.pop();
 }
 private trimLines():void {if(this.lines.length>40)this.lines.splice(0,this.lines.length-40);}
 private send(text:string,tab:number):void {
  if(this.stack.top!==this||this.closing||this.waiting||this.tab!==tab)return;
  const message=text.trim().slice(0,60);if(!message)return;
  this.input.reset();mp.sendDuel({v:1,duelId:this.opts.talkId,type:'talk-line',text:message},this.opts.peerId);this.lines.push({me:true,text:message});this.trimLines();if(tab===1)this.draft='';audio.confirm();
 }
 update(dt:number):void {
  if(this.stack.top!==this||this.closing||!this.waiting)return;
  this.waitT-=dt;if(this.waitT<=0)this.end(`${this.opts.peerNick} non risponde. Sarà in conferenza stampa.`);
 }
 get uiPanel():UiPanel {
  const tab=this.tab;
  const live=()=>this.stack.top===this&&!this.closing&&!this.waiting&&this.tab===tab;
  const back={label:'Indietro',hint:tab===2?'Torna alle frasi rapide.':'Chiudi il confronto.',run:()=>{if(this.stack.top!==this)return;if(!this.closing&&!this.waiting&&this.tab===2){this.tab=0;this.input.reset();audio.cancel();}else this.leave();}};
  if(this.endNotice)return {title:'Confronto concluso',subtitle:this.opts.peerNick,blocks:[{title:'Esito',body:this.endNotice}],actions:[{label:'Continua',run:()=>this.leave()}],primary:0,back:{...back,hint:'Chiudi il confronto.'}};
  if(this.waiting)return {title:'Confronto',subtitle:this.opts.peerNick,blocks:[{title:'Invito inviato',body:`In attesa di ${this.opts.peerNick}.`,facts:[{label:'Tempo di risposta',value:`${Math.max(0,Math.ceil(this.waitT))} secondi`}]}],actions:[],back:{...back,hint:'Annulla l’invito.'}};
  const messages=tab===2?this.lines:this.lines.slice(-4);
  const blocks:UiBlock[]=messages.length?messages.map(line=>({title:line.me?'Tu':this.opts.peerNick,body:line.text})):[{title:'La conversazione',body:'La riunione ha finalmente un tu.'}];
  const tabs=['Frasi rapide','Scrivi','Cronologia'].map((label,index)=>({label,run:()=>{if(!live())return;this.tab=index;this.input.reset();audio.cursor();}}));
  if(tab===1)return {title:'Confronto',subtitle:this.opts.peerNick,tabs,selectedTab:tab,blocks,field:{label:'Messaggio',value:this.draft,singleLine:true,maxLength:60,autofocus:true,placeholder:'Scrivi al giocatore',onChange:value=>{if(live())this.draft=value;},onSubmit:()=>this.send(this.draft,tab)},actions:[{label:'Invia',disabled:!this.draft.trim(),run:()=>this.send(this.draft,tab)}],primary:0,back};
  return {title:tab===2?'Cronologia del confronto':'Confronto',subtitle:this.opts.peerNick,tabs,selectedTab:tab,blocks,actions:tab===2?[]:PHRASES.map(text=>({label:readableCopy(text),hint:'Invia al giocatore del confronto.',run:()=>this.send(readableCopy(text),tab)})),back};
 }
 draw(screen:Screen):void {screen.clear('#17243d');}
}

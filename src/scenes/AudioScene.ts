import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import type {UiPanel} from '../ui/kit';
import type {TouchAction} from '../engine/touchActions';

export class AudioScene implements Scene {
 constructor(private stack:SceneStack,private input:Input,private onClose:()=>void=()=>{}){}
 onExit():void{this.onClose();}
 private command(label:string,hint:string,run:()=>void,disabled=false):TouchAction{return {label,hint,disabled,run:()=>{if(disabled||this.stack.top!==this)return;this.input.reset();run();audio.confirm();}};}
 get uiPanel():UiPanel {
  const mix=audio.mix;
  const adjust=(channel:'music'|'effects',delta:number)=>this.command(`${channel==='music'?'Musica':'Effetti'} ${delta>0?'+':'−'}10%`,`${mix[channel]}% → ${Math.max(0,Math.min(100,mix[channel]+delta))}%`,()=>audio.setVolume(channel,audio.mix[channel]+delta),delta<0?mix[channel]<=0:mix[channel]>=100);
  return {title:'Audio',subtitle:'Le impostazioni si salvano su questo dispositivo.',
   blocks:[{title:'Volume',facts:[{label:'Musica',value:`${mix.music}%`},{label:'Effetti',value:`${mix.effects}%`},{label:'Audio',value:mix.enabled?'Attivo':'Disattivato'}]},{title:'In ascolto',body:audio.trackTitle.charAt(0)+audio.trackTitle.slice(1).toLocaleLowerCase("it")}],
   actions:[this.command(mix.enabled?'Disattiva audio':'Attiva audio','Musica ed effetti insieme.',()=>audio.toggle()),adjust('music',-10),adjust('music',10),adjust('effects',-10),adjust('effects',10),this.command('Prova gli effetti','Ascolta un colpo e una cura.',()=>{audio.hit();audio.heal();})],selected:0,
   back:{label:'Indietro',run:()=>{if(this.stack.top!==this)return;this.input.reset();audio.cancel();this.stack.pop();}}};
 }
 update():void{if(this.input.wasPressed('b')){audio.cancel();this.stack.pop();}}
 draw(screen:Screen):void{screen.clear('#101b32');}
}

import {drawMonsterSprite} from '../art/monsters';
import {SPECIES,RIVAL_COUNTER} from '../data/species';
import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {starterDossier} from '../game/onboarding';
import {epiloguePages,drawEpiloguePage} from '../ui/epilogueArt';
import {drawDeskBackdrop} from '../ui/deskArt';
import {drawScreenHeader} from '../ui/widgets';

export class StarterPreviewScene implements Scene{
 private time=0;
 private tab=0;
 private page=0;
 private confirming=false;
 private closed=false;
 constructor(private stack:SceneStack,private input:Input,private speciesId:string,private onConfirm:()=>void,private reduceEffects=false){}
 private pages():string[][]{
  const id=this.speciesId;
  return epiloguePages(this.confirming?[`SCEGLI ${SPECIES[id].name} AL LIVELLO 5?`,`GIANNI SCEGLIERÀ ${SPECIES[RIVAL_COUNTER[id]].name}. LE ALTRE DUE SCHEDE DEL LABORATORIO NON SARANNO PIÙ DISPONIBILI.`,`LA CRESCITA E LE MOSSE SI CONSULTANO IN SQUADRA. B TI RIPORTA AL DOSSIER.`]:starterDossier(id,this.tab),34,6);
 }
 update(dt:number):void{
  if(this.closed)return;if(!this.reduceEffects)this.time+=Math.max(0,Math.min(.25,dt));
  if(this.input.wasPressed('b')){if(this.confirming){this.confirming=false;this.page=0;}else{this.closed=true;this.stack.pop();}return;}
  if(this.confirming){if(this.input.wasPressed('a')){if(this.page<this.pages().length-1)this.page++;else{this.closed=true;this.stack.pop();audio.confirm();this.onConfirm();}}return;}
  if(this.input.wasPressed('left')||this.input.wasPressed('right')){this.tab=(this.tab+(this.input.wasPressed('left')?3:1))%4;this.page=0;audio.cursor();}
  if(this.input.wasPressed('up')||this.input.wasPressed('down'))this.page=(this.page+(this.input.wasPressed('up')?this.pages().length-1:1))%this.pages().length;
  if(this.input.wasPressed('a')){this.confirming=true;this.page=0;}
 }
 draw(screen:Screen):void{
  drawDeskBackdrop(screen,'starter');drawScreenHeader(screen,'PRIMA SCHEDA',SPECIES[this.speciesId].name);
  drawMonsterSprite(screen,this.speciesId,12,27,48,32,{animationTime:this.time});
  screen.text(this.confirming?'LA SCELTA RESTA.': ['IDENTITÀ','MOSSE AL LIVELLO 5','TIPI E PRIMO RIVALE','CRESCITA'][this.tab],70,29,'#fffaf0');
  screen.text(`${this.page+1}/${this.pages().length}`,70,44,'#e6b944');
  drawEpiloguePage(screen,this.pages()[this.page]);
  screen.text(this.confirming?'A: CONFERMA  B: ANNULLA':'SIN/DES: DOSSIER  SU/GIU: TESTO',12,163,'#fffaf0');
  if(!this.confirming)screen.text('A: SCEGLI  B: ALTRE SCHEDE',12,173,'#fffaf0');
 }
}

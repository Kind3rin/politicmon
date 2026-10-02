import {drawMonsterSprite} from '../art/monsters';
import {SPECIES} from '../data/species';
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
 private closed=false;
 constructor(private stack:SceneStack,private input:Input,private speciesId:string,private onConfirm:()=>void,private reduceEffects=false){}
 private pages():string[][]{
  const id=this.speciesId;
  if(this.tab===0) return [[
   ...({giorgetta:['RADICI PROFONDE.','IL VASO È SU ROTELLE.'],ellyna:['RIUNIONE APERTA.','CONCLUSIONE RINVIATA.'],renzino:['NON CAMBIA IDEA.','CAMBIA MAGGIORANZA.']} as Record<string,string[]>)[id],
   `TIPO: ${SPECIES[id].types.join(' / ')}.`,
   'VARIA MOSSE: CARICA POLEMICA.',
   '3 POLEMICA: FUORIONDA O CATTURA.',
   'LE ALTRE SCHEDE SI CHIUDONO.'
  ]];
  return epiloguePages(starterDossier(id,this.tab),34,6);
 }
 update(dt:number):void{
  if(this.closed)return;if(!this.reduceEffects)this.time+=Math.max(0,Math.min(.25,dt));
  if(this.input.wasPressed('b')){this.closed=true;this.stack.pop();return;}
  if(this.input.wasPressed('left')||this.input.wasPressed('right')){this.tab=(this.tab+(this.input.wasPressed('left')?3:1))%4;this.page=0;audio.cursor();}
  if(this.input.wasPressed('up')||this.input.wasPressed('down'))this.page=(this.page+(this.input.wasPressed('up')?this.pages().length-1:1))%this.pages().length;
  if(this.input.wasPressed('a')){this.closed=true;this.stack.pop();audio.confirm();this.onConfirm();}
 }
 draw(screen:Screen):void{
  drawDeskBackdrop(screen,'starter');drawScreenHeader(screen,'PRIMA SCHEDA',SPECIES[this.speciesId].name);
  drawMonsterSprite(screen,this.speciesId,12,27,48,32,{animationTime:this.time});
  screen.text(['IDENTITÀ','MOSSE AL LIVELLO 5','TIPI E PRIMO RIVALE','CRESCITA'][this.tab],70,29,'#fffaf0');
  screen.text(`${this.page+1}/${this.pages().length}`,70,44,'#e6b944');
  drawEpiloguePage(screen,this.pages()[this.page]);
  screen.text('SIN/DES: DETTAGLI  SU/GIU: TESTO',12,163,'#fffaf0');
  screen.text('A: SCEGLI  B: ALTRE SCHEDE',12,173,'#fffaf0');
 }
}

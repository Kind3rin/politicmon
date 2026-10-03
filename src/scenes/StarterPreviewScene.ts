import {drawMonsterSprite} from '../art/monsters';
import {SPECIES} from '../data/species';
import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {starterDossier} from '../game/onboarding';
import {epiloguePages,drawEpiloguePage} from '../ui/epilogueArt';
import type {TouchAction} from '../engine/touchActions';
import {ABILITIES} from '../data/abilities';
import {MOVES} from '../data/moves';
import {movesAtLevel} from '../game/monster';
import {drawScreenHeader} from '../ui/widgets';

export class StarterPreviewScene implements Scene{
 private time=0;
 private tab=0;
 private page=0;
 private closed=false;
 constructor(private stack:SceneStack,private input:Input,private speciesId:string,private onConfirm:()=>void,private reduceEffects=false){}
 private pages():string[][]{
  const id=this.speciesId;
  if(this.tab===0){
   const species=SPECIES[id],attack=movesAtLevel(id,5).map(slot=>MOVES[slot.id]).find(move=>move.power>0&&species.types.includes(move.type));
   return [[`TIPO: ${species.types.join(' / ')}.`, `ABILITÀ: ${ABILITIES[species.ability??'']?.name??'NESSUNA'}.`,
    `ATTACCO: ${attack?.name??'COMIZIO'}.`, `CRESCITA: LV${species.evolutions?.[0]?.level??'—'}.`]];
  }
  return epiloguePages(starterDossier(id,this.tab),34,6);
 }
 private choose():void{if(this.closed)return;this.closed=true;this.stack.pop();audio.confirm();this.onConfirm();}
 get touchActions():readonly TouchAction[]{
  const tab=this.tab,page=this.page;
  const action=(label:string,hint:string,run:()=>void,disabled=false):TouchAction=>({label,hint,disabled,run:()=>{
   if(disabled||this.closed||this.stack.top!==this||this.tab!==tab||this.page!==page)return;this.input.reset();run();
  }});
  const inspect=(tab:number)=>{this.tab=tab;this.page=0;audio.cursor();};
  const last=page+1>=this.pages().length;
  return [action('SCEGLI','Entra al LV5 · le altre schede si chiudono',()=>this.choose()),action('ALTRE SCHEDE','Torna ai tre candidati',()=>{this.closed=true;this.stack.pop();}),
   action('MOSSE','Effetti, PP e potenza',()=>inspect(1)),action('DIFESE','Tipi e primo rivale',()=>inspect(2)),action('CRESCITA','Forme e condizioni',()=>inspect(3)),
   action(last?'SCHEDA':'ALTRA PAGINA',`Pagina ${page+1}/${this.pages().length}`,()=>{if(last)inspect(0);else this.page++;},tab===0)];
 }
 update(dt:number):void{
  if(this.closed)return;if(!this.reduceEffects)this.time+=Math.max(0,Math.min(.25,dt));
  if(this.input.wasPressed('b')){this.closed=true;this.stack.pop();return;}
  if(this.input.wasPressed('left')||this.input.wasPressed('right')){this.tab=(this.tab+(this.input.wasPressed('left')?3:1))%4;this.page=0;audio.cursor();}
  if(this.input.wasPressed('up')||this.input.wasPressed('down'))this.page=(this.page+(this.input.wasPressed('up')?this.pages().length-1:1))%this.pages().length;
  if(this.input.wasPressed('a'))this.choose();
 }
 draw(screen:Screen):void{
  screen.clear('#17243d');drawScreenHeader(screen,'PRIMA SCHEDA',SPECIES[this.speciesId].name);
  drawMonsterSprite(screen,this.speciesId,12,27,48,32,{animationTime:this.time});
  const gag=({giorgetta:['RADICI PROFONDE.','IL VASO È SU ROTELLE.'],ellyna:['RIUNIONE APERTA.','CONCLUSIONE RINVIATA.'],renzino:['NON CAMBIA IDEA.','CAMBIA MAGGIORANZA.']} as Record<string,string[]>)[this.speciesId];
  if(this.tab===0)gag.forEach((line,i)=>screen.text(line,70,29+i*11,'#80d1b0'));
  else{screen.text(['IDENTITÀ','MOSSE AL LIVELLO 5','TIPI E PRIMO RIVALE','CRESCITA'][this.tab],70,29,'#fffaf0');screen.text(`${this.page+1}/${this.pages().length}`,70,44,'#80d1b0');}
  drawEpiloguePage(screen,this.pages()[this.page]);
  screen.text('SIN/DES: DETTAGLI  SU/GIU: TESTO',12,163,'#fffaf0');
  screen.text('A: SCEGLI  B: ALTRE SCHEDE',12,173,'#fffaf0');
 }
}

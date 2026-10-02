import {audio} from '../engine/audio';
import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {assegnaMinistro,MINISTERI,MINISTERO_ORDER,ministroDi,rimuoviMinistro} from '../game/governo';
import {speciesOf,type Monster} from '../game/monster';
import {saveGame,type GameState} from '../game/state';
import {drawScreenHeader} from '../ui/widgets';
import {drawCampaignBackdrop} from '../ui/campaignArt';
import {dossierPages,drawDossierPage} from '../ui/dossier';
import {PartyScene} from './PartyScene';

export class GovScene implements Scene{
 private index=0;
 private page=-1;
 private pending:Monster|null=null;
 private notice='';
 constructor(private stack:SceneStack,private input:Input,private state:GameState){}
 private selected(){return MINISTERO_ORDER[this.index];}
 private status(id=this.selected()){
  const mon=ministroDi(this.state,id);
  return mon?`${speciesOf(mon).name}: ${mon.hp>0?'ATTIVO':'KO'}`:this.state.ministri[id]?'FUORI SQUADRA':'INCARICO VACANTE';
 }
 private pages(){
  const id=this.selected(),def=MINISTERI[id],mon=this.pending;
  const paragraphs=[def.desc,def.malus,this.status(), 'BENEFICI E COSTI SOSPESI PER KO O FUORI SQUADRA.'];
  if(mon){
   const old=MINISTERO_ORDER.find(key=>this.state.ministri[key]===mon.uid);
   paragraphs.push(this.state.ministri[id]===mon.uid?`SFIDUCI ${speciesOf(mon).name}. L'INCARICO TORNA VACANTE.`:`NOMINI ${speciesOf(mon).name}.${old?` LASCIA ${MINISTERI[old].name}.`:''}${mon.hp<=0?' È KO.':''}`);
  }else paragraphs.push('UN INCARICO PER CANDIDATO. SCEGLI IL TITOLARE PER SFIDUCIARLO. FIRMA PER APPLICARE.');
  return dossierPages(paragraphs,9);
 }
 update():void{
  if(this.page>=0){
   if(this.input.wasPressed('b')){this.page=-1;this.pending=null;audio.cancel();return;}
   const count=this.pages().length;
   if(this.input.wasPressed('left')||this.input.wasPressed('up'))this.page=Math.max(0,this.page-1);
   if(this.input.wasPressed('right')||this.input.wasPressed('down'))this.page=Math.min(count-1,this.page+1);
   if(!this.input.wasPressed('a'))return;
   if(this.page<count-1){this.page++;audio.cursor();return;}
   const id=this.selected();
   if(this.pending){
    if(this.state.ministri[id]===this.pending.uid)rimuoviMinistro(this.state,id);
    else assegnaMinistro(this.state,id,this.pending);
    saveGame(this.state);this.pending=null;this.page=-1;this.notice='INCARICO REGISTRATO.';audio.confirm();
   }else if(this.state.party.length){
    this.stack.push(new PartyScene(this.stack,this.input,this.state,{mode:'use-item',title:'SCEGLI IL CANDIDATO',onChoose:mon=>{this.pending=mon;this.page=0;}}));
   }else{this.notice='PRIMA RECLUTA UN POLITICMON.';this.page=-1;audio.cancel();}
   return;
  }
  if(this.input.wasPressed('b')){audio.cancel();this.stack.pop();return;}
  if(this.input.wasPressed('up')){this.index=(this.index+5)%6;audio.cursor();}
  if(this.input.wasPressed('down')){this.index=(this.index+1)%6;audio.cursor();}
  if(this.input.wasPressed('a')){this.page=0;audio.confirm();}
 }
 draw(screen:Screen):void{
  drawCampaignBackdrop(screen,'government');
  drawScreenHeader(screen,'GOVERNO OMBRA',`${this.index+1}/6`);
  if(this.page>=0){this.page=drawDossierPage(screen,this.pages(),this.page,this.pending?'FIRMA INCARICO':'DOSSIER INCARICO',false,this.pending?'A FIRMA':'A SQUADRA','B ANNULLA');return;}
  screen.text('LE SEDIE CAMBIANO. IL CONTO RESTA.',8,25,'#ffe38a');
  const start=Math.floor(this.index/3)*3;
  for(let i=start;i<start+3;i++){
   const id=MINISTERO_ORDER[i],y=43+(i-start)*34;
   screen.panel(8,y,224,31,'card');
   if(i===this.index)screen.rect(13,y+4,214,10,'#f4d34a');
   screen.text(MINISTERI[id].name,18,y+6,'#10141f');
   screen.textFit(this.status(id),18,y+19,204,this.state.ministri[id]&&!ministroDi(this.state,id)?.hp?'#a0443e':'#26745d');
  }
  screen.textFit(this.notice,8,150,224,'#fffaf0');
  screen.text('SU/GIU SFOGLIA · A DOSSIER · B ESCI',8,167,'#ffe38a');
 }
}

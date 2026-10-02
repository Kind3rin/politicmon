import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {audio} from '../engine/audio';
import {palaceDossier,readPalaceDossier,verifyPalaceDossier,type PalaceModule} from '../game/palaceArchive';
import {saveGame,type GameState} from '../game/state';
import {drawCampaignBackdrop} from '../ui/campaignArt';
import {dossierPages,drawDossierPage} from '../ui/dossier';
import {drawScreenHeader,Menu,wrapText} from '../ui/widgets';

export class PalaceArchiveScene implements Scene{
 readonly transparent=false;
 private data;
 private page=0;
 private mode:'study'|'quiz'|'feedback';
 private menu:Menu;
 private feedback='';
 private correct=false;
 constructor(private stack:SceneStack,private input:Input,private state:GameState,private module:PalaceModule,private terminal:'a'|'b'){
  this.data=palaceDossier(state,module);
  this.menu=new Menu(this.data.options.map(label=>({label})));
  this.mode=terminal==='b'&&state.election.phase==='ready'&&state.flags[`palace:${module}:a`]&&!this.data.complete?'quiz':'study';
 }
 private pages(){return dossierPages(this.mode==='feedback'?[this.feedback,...this.data.lines]:this.data.lines,5);}
 update():void{
  if(this.mode==='quiz'){
   const action=this.menu.update(this.input);
   if(action==='cancel'){this.stack.pop();return;}
   if(action!=='select')return;
   const result=verifyPalaceDossier(this.state,this.module,this.data.options[this.menu.index]);
   this.data=palaceDossier(this.state,this.module);
   this.menu=new Menu(this.data.options.map(label=>({label})));
   this.correct=result==='complete';
   this.feedback=this.correct?'VERBALE VALIDATO. NESSUN VOTO O BONUS AGGIUNTO.':result==='wrong'?'LA COPIA NON REGGE. RILEGGI I FATTI. NESSUNA PENALITÀ.':'ARCHIVIO NON DISPONIBILE.';
   this.mode='feedback';this.page=0;if(this.correct){saveGame(this.state);audio.confirm();}else audio.cancel();return;
  }
  const pages=this.pages();
  if(this.input.wasPressed('b')){this.stack.pop();return;}
  if(this.input.wasPressed('left')||this.input.wasPressed('up'))this.page=Math.max(0,this.page-1);
  if(this.input.wasPressed('right')||this.input.wasPressed('down'))this.page=Math.min(pages.length-1,this.page+1);
  if(!this.input.wasPressed('a'))return;
  if(this.page<pages.length-1){this.page++;return;}
  if(this.mode==='study'){
   if(readPalaceDossier(this.state,this.module))saveGame(this.state);
   if(this.terminal==='b'&&this.state.election.phase==='ready'&&!this.data.complete){this.mode='quiz';this.page=0;return;}
  }else if(!this.correct){this.mode='study';this.page=0;return;}
  this.stack.pop();
 }
 draw(screen:Screen):void{
  drawCampaignBackdrop(screen,`palace-${this.module}`);
  drawScreenHeader(screen,this.data.title,this.data.complete?'VALIDATO':'VERBALE DEL TOUR');
  if(this.mode!=='quiz'){
   drawDossierPage(screen,this.pages(),this.page,this.mode==='feedback'?'VERIFICA':this.data.complete?'ARCHIVIO VALIDATO':'FATTI REGISTRATI',this.correct,'A AVANTI','B ESCI',77);return;
  }
  screen.panel(8,77,224,27,'card');
  wrapText(this.data.question,34).forEach((line,i)=>screen.text(line,15,83+i*10,'#17243d'));
  this.menu.draw(screen,8,109,224,17,3);
  screen.rect(0,161,240,19,'#17243d');screen.text('A VERIFICA · B ANNULLA',8,168,'#ffe38a');
 }
}

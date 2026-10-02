import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import {epiloguePages,drawEpiloguePage} from '../ui/epilogueArt';
import {drawDeskBackdrop} from '../ui/deskArt';
import {drawScreenHeader} from '../ui/widgets';
export class FieldGuideScene implements Scene{
 readonly transparent=false;
 private pages:string[][];
 private page=0;
 private closed=false;
 constructor(private stack:SceneStack,private input:Input,private title:string,paragraphs:readonly string[],private done?:()=>void){this.pages=epiloguePages(paragraphs);}
 update():void{
  if(this.closed)return;
  if(this.input.wasPressed('start')){this.close();return;}
  if(this.input.wasPressed('b')){this.page=Math.max(0,this.page-1);return;}
  if(this.input.wasPressed('a')){if(this.page<this.pages.length-1)this.page++;else this.close();}
 }
 private close():void{if(this.closed)return;this.closed=true;this.stack.pop();this.done?.();}
 draw(screen:Screen):void{
  drawDeskBackdrop(screen,'welcome');drawScreenHeader(screen,this.title,`${this.page+1}/${this.pages.length}`);drawEpiloguePage(screen,this.pages[this.page]);
  screen.text(this.page<this.pages.length-1?'A: AVANTI  B: INDIETRO':'A: CONTINUA  B: INDIETRO',12,163,'#fffaf0');screen.text('START: SALTA IL BRIEFING',12,173,'#fffaf0');
 }
}

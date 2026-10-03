import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import type {UiPanel} from '../ui/kit';

export class FieldGuideScene implements Scene {
 readonly transparent=false;
 private closed=false;
 private readonly paragraphs:readonly string[];
 constructor(private stack:SceneStack,private input:Input,private title:string,paragraphs:readonly string[],private done?:()=>void){this.paragraphs=paragraphs;}
 private close():void{if(this.closed||this.stack.top!==this)return;this.closed=true;this.input.reset();this.stack.pop();this.done?.();}
 get uiPanel():UiPanel {
  return {title:this.title.charAt(0)+this.title.slice(1).toLocaleLowerCase('it'),subtitle:'Leggi quanto ti serve. Puoi tornare al gioco in qualsiasi momento.',
   blocks:this.paragraphs.map((text,i)=>{
    const split=text.indexOf(':');
    return split>0&&split<32?{title:text.slice(0,split),body:text.slice(split+1).trim()}:{title:`Nota ${i+1}`,body:text};
   }),
   actions:[],back:{label:'Indietro',hint:'Torna al gioco.',run:()=>this.close()},selected:0};
 }
 update():void{if(this.input.wasPressed('b')||this.input.wasPressed('start')||this.input.wasPressed('a'))this.close();}
 draw(screen:Screen):void{screen.clear('#101b32');}
}

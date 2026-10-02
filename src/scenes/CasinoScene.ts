import { ITEMS } from "../data/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { CASINO_INVITES, CASINO_PRIZES, CASINO_SYMBOLS, commitCasino, previewCasino, type CasinoAction, type CasinoResult } from "../game/casino";
import { Menu, drawScreenHeader } from "../ui/widgets";
import { drawEpiloguePage, epiloguePages } from "../ui/epilogueArt";
import { drawArenaBackdrop, drawArenaIcon } from "../ui/arenaArt";

type Mode="menu"|"change"|"prizes"|"club"|"review"|"result"|"spin";
export class CasinoScene implements Scene {
 readonly transparent=false;
 private menu=new Menu([{label:"SLOT DEL CONSENSO",rightLabel:"5F"},{label:"INVITO AL CLUB",rightLabel:"15F"},{label:"CAMBIO FICHE"},{label:"PREMI DI PALAZZO"},{label:"ESCI"}]);
 private changeMenu=new Menu([1,5,10].flatMap(units=>[{label:`COMPRA ${90*units}F`,rightLabel:`${100*units}€`},{label:`VENDI ${90*units}F`,rightLabel:`${80*units}€`}]).concat([{label:"INDIETRO",rightLabel:""}]));
 private prizeMenu=new Menu([...CASINO_PRIZES.map(p=>({label:ITEMS[p.itemId].name,rightLabel:`${p.chips}F`})),{label:"INDIETRO",rightLabel:""}]);
 private clubMenu=new Menu([...CASINO_INVITES.map(i=>({label:i.name})),{label:"INDIETRO"}]);
 private mode:Mode="menu";
 private origin:Mode="menu";
 private pending:CasinoAction|null=null;
 private pages:string[][]=[];
 private page=0;
 private result:CasinoResult|null=null;
 private spinTime=0;
 private displayedChips=0;
 private spins=0;
 private slotNet=0;
 private selectedMenu():Menu {return this.mode==="change"?this.changeMenu:this.mode==="prizes"?this.prizeMenu:this.mode==="club"?this.clubMenu:this.menu;}
 constructor(private stack:SceneStack,private input:Input,private state:GameState){}
 private review(action:CasinoAction):void {
  this.origin=this.mode;this.pending=action;this.page=0;
  const preview=previewCasino(this.state,action);
  if(!preview.ok){this.pages=epiloguePages([preview.error]);this.result=preview;this.pending=null;this.mode="result";audio.cancel();return;}
  this.pages=epiloguePages(preview.paragraphs);this.mode="review";
 }
 update(dt:number):void {
  if(this.mode==="spin"){
   this.spinTime+=Math.max(0,Math.min(.25,dt));
   if(this.input.wasPressed("b")||this.spinTime>=1.5){this.mode="result";audio.reelStop();}
   return;
  }
  if(this.mode==="review"||this.mode==="result"){
   if(this.input.wasPressed("b")){this.pending=null;this.mode=this.origin;return;}
   if(!this.input.wasPressed("a"))return;
   if(this.page<this.pages.length-1){this.page++;return;}
   if(this.mode==="result"){this.mode=this.origin;return;}
   const action=this.pending;if(!action)return;
   this.pending=null;this.displayedChips=this.state.chips-5;
   this.result=commitCasino(this.state,action);
   if(this.result.ok){saveGame(this.state);audio.confirm();}else audio.cancel();
   this.page=0;this.pages=epiloguePages(this.result.ok?this.result.lines:[this.result.error]);
   this.mode=this.result.ok&&action.kind==="slot"&&!this.state.reduceEffects?"spin":"result";
   if(this.result.ok&&action.kind==="slot"){this.spins++;this.slotNet+=this.result.net??0;this.spinTime=0;}
   return;
  }
  const menu=this.selectedMenu(), action=menu.update(this.input);
  if(action==="cancel"){if(this.mode==="menu")this.stack.pop();else this.mode="menu";return;}
  if(action!=="select")return;
  if(this.mode==="menu"){
   if(menu.index===0)this.review({kind:"slot"});else if(menu.index===1)this.mode="club";else if(menu.index===2)this.mode="change";else if(menu.index===3)this.mode="prizes";else this.stack.pop();
  }else if(this.mode==="change"){
   if(menu.index===6){this.mode="menu";return;}
   this.review({kind:"exchange",sell:menu.index%2===1,units:[1,5,10][Math.floor(menu.index/2)]});
  }else if(this.mode==="prizes"){
   if(menu.index===CASINO_PRIZES.length)this.mode="menu";else this.review({kind:"prize",index:menu.index});
  }else if(this.mode==="club"){
   if(menu.index===CASINO_INVITES.length)this.mode="menu";else this.review({kind:"club",index:menu.index});
  }
 }
 draw(screen:Screen):void {
  drawArenaBackdrop(screen,this.mode==="club"||this.pending?.kind==="club"||(this.mode==="result"&&this.origin==="club")?"club":"casino");
  drawScreenHeader(screen,"CASINÒ DI PALAZZO",`${this.mode==="spin"?this.displayedChips:this.state.chips}F`);
  screen.rect(0,17,240,13,"#17243d");screen.text(`${this.state.money}€`,8,21,"#fffaf0");screen.textRight(`SOND ${this.state.sondaggi}%`,232,21,"#fffaf0");
  if(this.mode==="spin"){
   screen.panel(8,42,224,98,"card");
   const reels=this.result?.ok?this.result.reels??[]:[];
   for(let i=0;i<3;i++){
    const locked=this.spinTime>=[.7,1.1,1.5][i],index=locked?reels[i]:Math.floor(this.spinTime*12+i)%5;
    drawArenaIcon(screen,CASINO_SYMBOLS[index].id,40+i*65,58,32);
    screen.textCenter(locked?CASINO_SYMBOLS[index].name:"...",56+i*65,105,"#17243d");
   }
   screen.text("ESITO SALVATO. B: SALTA I RULLI",12,167,"#fffaf0");return;
  }
  if(this.mode==="review"||this.mode==="result"){
   drawEpiloguePage(screen,this.pages[this.page]);
   screen.text(this.mode==="review"&&this.page===this.pages.length-1?"A: CONFERMA   B: ANNULLA":this.mode==="result"&&this.page===this.pages.length-1?"A/B: INDIETRO":"A: AVANTI   B: INDIETRO",12,167,"#fffaf0");
   return;
  }
  const selected=this.selectedMenu();selected.draw(screen,64,34,168,13,5);
  if(this.mode==="menu"){
   screen.panel(8,119,224,37,"card");
   screen.text("IL BANCO HA UNA MAGGIORANZA.",16,128,"#17243d");
   screen.text(`SLOT: ${this.spins} GIRI / NETTO ${this.slotNet>0?"+":""}${this.slotNet}F`,16,141,"#17243d");
  }else if(this.mode==="change"){
   screen.rect(0,141,240,19,"#17243d");screen.text("100€: 90F / 90F: 80€",12,149,"#fffaf0");
  }else if(this.mode==="prizes"){
   const prize=CASINO_PRIZES[selected.index];screen.rect(0,141,240,19,"#17243d");screen.text(prize&&ITEMS[prize.itemId].reusable&&(this.state.bag[prize.itemId]??0)>0?"DIRETTIVA GIÀ POSSEDUTA":"A LEGGE L'EFFETTO COMPLETO.",12,149,"#fffaf0");
  }else{
   screen.panel(8,111,224,45,"card");screen.text("UN SOLO INVITO AL GIORNO.",16,121,"#17243d");screen.text("I TRE TAVOLI HANNO ESITI DIVERSI.",16,137,"#17243d");
  }
  screen.text(this.mode==="menu"?"A: DOSSIER   B: ESCI":"SU/GIU: SCEGLI  A: DOSSIER  B: TORNA",12,167,"#fffaf0");
 }
}

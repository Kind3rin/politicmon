import type { CivicChoice, CivicEvent } from "../data/civicEvents";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { resolveCivicChoice } from "../game/civicChoices";
import { saveGame, type GameState } from "../game/state";
import { PROMISES } from "../game/morale";
import type { UiPanel, UiBlock } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";

export class CivicScene implements Scene {
  private index = 0;
  private receiptBody: string | undefined;
  private committed = false;
  private receipt: NonNullable<UiBlock["facts"]> = [];
  constructor(private stack: SceneStack, private input: Input, private state: GameState, private event: CivicEvent) {}

  private consequences(choice:CivicChoice):NonNullable<UiBlock["facts"]> {
    const bounded=(before:number,delta:number)=>`${before} → ${Math.max(0,Math.min(100,before+delta))}`;
    const promise=choice.promise?PROMISES[choice.promise]:undefined;
    return [{label:"Costo",value:`${choice.cost} €`},
      {label:"Fondi dopo",value:this.state.money>=choice.cost?`${this.state.money} → ${this.state.money-choice.cost} €`:"Fondi insufficienti"},
      {label:"Sondaggi dopo",value:`${bounded(this.state.sondaggi,choice.polls)}%`},
      {label:"Fiducia dopo",value:bounded(this.state.morale.trust,choice.trust+(choice.fulfill?12:0))},
      {label:"Coesione dopo",value:bounded(this.state.morale.cohesion,choice.cohesion+(choice.fulfill?6:0))},
      ...(promise&&!choice.fulfill?[{label:"Impegno futuro",value:`${promise.cost} €`},{label:"Scadenza",value:`${promise.steps} nuove vittorie`}]:[])];
  }

  get uiPanel():UiPanel|undefined {
    if(this.stack.top!==this)return undefined;
    const back={label:"Indietro",hint:this.receiptBody!==undefined?undefined:"Uscire non registra una decisione.",run:()=>{if(this.stack.top!==this)return;this.input.reset();if(this.receiptBody!==undefined)this.closeReceipt();else{audio.cancel();this.stack.pop();}}};
    if(this.receiptBody!==undefined)return {title:"La decisione",blocks:[{title:readableCopy(this.event.title),body:this.receiptBody},...(this.receipt.length?[{title:"Conseguenze registrate",facts:this.receipt}]:[])],
      actions:[{label:"Continua",run:()=>this.closeReceipt()}],selected:0,primary:0,back:back};
    const closed=this.state.morale.decisions.includes(this.event.id);
    return {title:readableCopy(this.event.title),subtitle:this.event.lines.join(" "),image:`/sprites/ui/civic/${this.event.art}.png`,imageHeight:112,positioned:true,
      blocks:closed?[{title:"Scelta già registrata",body:"La decisione è nel verbale. Parla con gli abitanti per vedere cosa è cambiato."}]:[{title:`${this.event.choices.length} alternative`,body:"Controlla costo e conseguenze. Ogni decisione vale una volta."}],
      actions:this.event.choices.map((choice,index)=>({label:readableCopy(choice.label),
        hint:closed?"Decisione già presa.":choice.promise&&this.state.morale.promises.some(p=>p.id===choice.promise)?"La promessa è già nel verbale.":this.state.money<choice.cost?`Servono ${choice.cost} €. Puoi tornare.`:choice.promise&&!choice.fulfill?"Prendi un impegno: il servizio resta da finanziare.":undefined,
        facts:this.consequences(choice),disabled:closed||this.state.money<choice.cost||Boolean(choice.promise&&this.state.morale.promises.some(p=>p.id===choice.promise)),
        run:()=>this.choose(index)})),selected:this.index,back:back};
  }

  private choose(index:number):void {
    if(this.stack.top!==this||this.receiptBody!==undefined)return;
    this.index=index;
    const before={money:this.state.money,polls:this.state.sondaggi,trust:this.state.morale.trust,cohesion:this.state.morale.cohesion};
    const result=resolveCivicChoice(this.state,this.event.id,index);
    if(result.ok){saveGame(this.state);audio.confirm();this.receipt=[
      {label:"Fondi",value:`${before.money} → ${this.state.money} €`},{label:"Sondaggi",value:`${before.polls} → ${this.state.sondaggi}%`},
      {label:"Fiducia",value:`${before.trust} → ${this.state.morale.trust}`},{label:"Coesione",value:`${before.cohesion} → ${this.state.morale.cohesion}`}];}
    else{audio.cancel();this.receipt=[];}
    this.input.reset();
    this.committed=result.ok;
    this.receiptBody=(result.ok?result.lines.slice(0,-1):result.lines).join(" ");
  }

  private closeReceipt():void {
    if(this.stack.top!==this||this.receiptBody===undefined)return;
    this.input.reset();this.receiptBody=undefined;
    if(this.committed){this.committed=false;this.stack.pop();}
  }
  update(_dt:number):void {}
  draw(screen:Screen):void {screen.clear("#101c30");}
}

import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { keepPromise, moraleExpMultiplier, promiseCost, PROMISES, trustPriceAdjustment, type PromiseId } from "../game/morale";
import { saveGame, type GameState } from "../game/state";
import type { UiPanel, UiBlock } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";

export class MoraleScene implements Scene {
  private section = 0;
  private receipt: {title:string;body:string;facts:NonNullable<UiBlock["facts"]>} | undefined;
  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  private fund(id:PromiseId):void {
    if(this.stack.top!==this||this.receipt)return;
    const promise=this.state.morale.promises.find(p=>p.id===id);
    if(!promise||(promise.status!=="pending"&&promise.status!=="broken"))return;
    const before={money:this.state.money,trust:this.state.morale.trust,cohesion:this.state.morale.cohesion};
    const result=keepPromise(this.state,id);
    if(result==="funds"||result==="unavailable")return;
    saveGame(this.state);audio.confirm();this.input.reset();
    this.receipt={title:result==="kept"?"Promessa mantenuta":"Servizio riparato",
      body:result==="kept"?"Il servizio è finanziato. Il manifesto può aspettare.":"Ripari il servizio, non il passato. Il ritardo resta nel verbale.",
      facts:[{label:"Fondi",value:`${before.money} → ${this.state.money} €`},
        {label:"Fiducia",value:`${before.trust} → ${this.state.morale.trust}`},
        {label:"Coesione",value:`${before.cohesion} → ${this.state.morale.cohesion}`} ]};
  }

  get uiPanel():UiPanel {
    const back={label:"Indietro",run:()=>{if(this.stack.top!==this)return;this.input.reset();audio.cancel();if(this.receipt)this.receipt=undefined;else if(this.section)this.section=0;else this.stack.pop();}};
    if(this.receipt){const receipt=this.receipt;return {title:receipt.title,blocks:[{title:"Nel verbale",body:receipt.body,facts:receipt.facts}],
      actions:[{label:"Continua",run:()=>{if(this.stack.top===this&&this.receipt===receipt)this.receipt=undefined;}}],primary:0,selected:0,back:back};}
    const morale=this.state.morale;
    const blocks:UiBlock[]=[{title:"Come ti vedono",facts:[{label:"Fiducia",value:String(morale.trust)},{label:"Coesione",value:String(morale.cohesion)},{label:"Fondi",value:`${this.state.money} €`}]}];
    if(this.section===1)blocks.push(
      {title:"Sondaggi e fiducia",body:"I sondaggi misurano chi alza la mano. La fiducia ricorda come tratti i cittadini.",facts:[{label:"Prezzi: effetto della fiducia",value:`${Math.round(trustPriceAdjustment(morale)*100)>0?"+":""}${Math.round(trustPriceAdjustment(morale)*100)}%`}]},
      {title:"Fiducia: i prezzi",body:"Da 70, prezzi −5%. Sotto 30, prezzi +5%. Tra 30 e 69, nessuna variazione."},
      {title:"Coesione: la squadra",body:"Da 70, crescita +8%. Sotto 30, crescita −8%. Tra 30 e 69, nessuna variazione. Il bonus vale nelle lotte della campagna, esclusi i duelli online.",facts:[{label:"Bonus di coesione attuale",value:`${Math.round((moraleExpMultiplier(morale)-1)*100)>0?"+":""}${Math.round((moraleExpMultiplier(morale)-1)*100)}%`}]},
      {title:"Le scadenze",body:"Una promessa scade alla terza nuova vittoria contro un allenatore della storia. Selvatici, rivincite, sfide giornaliere, Coppa e campagna settimanale non contano."},
      {title:"Un ritardo resta",body:"Alla scadenza perdi 12 di fiducia e 6 di coesione. Riparare costa il 50% in più. Recuperi 7 di fiducia e 3 di coesione; mantenere la promessa dà 12 e 6."},
      {title:"Una scelta, una conseguenza",body:"Ogni scelta civica vale una volta. I cittadini ricordano la decisione. Il finale ricorda il tuo modo di governare."});
    if(this.section===2){
      blocks.push(...morale.history.slice().reverse().map(record=>({title:readableCopy(record.label),facts:[{label:"Fiducia",value:`${record.trust>=0?"+":""}${record.trust}`},{label:"Coesione",value:`${record.cohesion>=0?"+":""}${record.cohesion}`}]})));
      if(!morale.history.length)blocks.push({title:"Nessun verbale",body:"Le decisioni di quartiere lasceranno qui le loro conseguenze."});
    }
    if(!this.section&&!morale.promises.length)blocks.push({title:"Nessuna promessa aperta",body:"Parla con gli abitanti. Se prendi un impegno, qui trovi costo e scadenza. Le vittorie da sole non comprano fiducia."});
    return {title:"Morale",subtitle:"La fiducia si guadagna. Il sondaggio si alza anche con un jingle.",image:"/sprites/ui/civic/verbale.png",imageHeight:96,blocks,
      tabs:["Promesse","Effetti","Verbale"].map((label,i)=>({label,run:()=>{if(this.stack.top===this&&!this.receipt){this.section=i;audio.cursor();}}})),selectedTab:this.section,
      actions:this.section?[]:morale.promises.map(promise=>{
        const open=promise.status==="pending"||promise.status==="broken",cost=promiseCost(promise),repair=promise.status==="broken";
        return {label:`${open?(repair?"Ripara ":"Finanzia "):""}${readableCopy(PROMISES[promise.id].title)}`,
          hint:!open?(promise.status==="kept"?"Promessa mantenuta.":"Servizio riparato. Il ritardo resta nel verbale."):this.state.money<cost?`Servono ${cost} €. Puoi tornare con più fondi.`:repair?"La scadenza è passata. Il costo include il ritardo.":"Finanzia il servizio prima della scadenza.",disabled:!open||this.state.money<cost,
          facts:open?[{label:"Costo",value:`${cost} €`},{label:"Scadenza",value:repair?"Scaduta":`${Math.max(0,promise.dueAt-morale.progress)} nuove vittorie`},
            {label:"Fondi dopo",value:this.state.money>=cost?`${this.state.money} → ${this.state.money-cost} €`:"Insufficienti"},
            {label:"Fiducia dopo",value:`${morale.trust} → ${Math.min(100,morale.trust+(repair?7:12))}`},
            {label:"Coesione dopo",value:`${morale.cohesion} → ${Math.min(100,morale.cohesion+(repair?3:6))}`}]:[],
          run:()=>this.fund(promise.id)};
      }),selected:0,back:back};
  }
  update(_dt:number):void {}
  draw(screen:Screen):void {screen.clear("#101c30");}
}

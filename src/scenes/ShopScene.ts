import { MOVES } from "../data/moves";
import { moveDescription } from "../ui/kit/moveContent";
import { ITEMS } from "../data/items";
import { itemIconPath } from "../art/items";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { saveGame, type GameState } from "../game/state";
import { shopAdjustments, shopPrice } from "../game/governo";
import { buySupplies, purchaseLimit, shopStock, supplyMatches, supplyNotes } from "../game/supplyGuide";
import type { UiPanel, UiBlock } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";

const FILTERS = ["Tutti", "Cure", "Reclutamento", "Direttive", "Kit"];

export class ShopScene implements Scene {
  private filter = 0;
  private selectedId = "";
  private receiptBody: string | undefined;
  private receiptFacts:NonNullable<UiBlock["facts"]>=[];
  private quote: { id: string; quantity: number; price: number } | null = null;
  constructor(private stack: SceneStack, private input: Input, private state: GameState, _greeting?: string) {}

  private openQuote(id: string): void {
    if (this.stack.top !== this || this.quote || this.receiptBody!==undefined || !shopStock(this.state).includes(id)) return;
    this.selectedId = id; this.input.reset(); audio.confirm();
    this.quote = {id,quantity:1,price:shopPrice(this.state,ITEMS[id])};
  }

  private buy(quote: NonNullable<ShopScene["quote"]>): void {
    if (this.stack.top !== this || this.quote !== quote || this.receiptBody!==undefined) return;
    const before={money:this.state.money,stock:this.state.bag[quote.id]??0};
    this.quote = null; this.input.reset();this.receiptFacts=[];
    if (shopPrice(this.state,ITEMS[quote.id]) !== quote.price || !buySupplies(this.state,quote.id,quote.quantity)) {
      audio.cancel(); this.receiptBody="Preventivo scaduto. Controlla fondi e disponibilità."; return;
    }
    saveGame(this.state); audio.confirm();
    this.receiptFacts=[{label:"Fondi",value:`${before.money} → ${this.state.money} €`},{label:"In borsa",value:`${before.stock} → ${this.state.bag[quote.id]}`}];
    this.receiptBody=`${quote.quantity} × ${readableCopy(ITEMS[quote.id].name)} in borsa. Lo scontrino è lungo. Almeno questa promessa è misurabile.`;
  }

  get uiPanel(): UiPanel {
    const back = {label:"Indietro",run:()=>{if(this.stack.top!==this)return;this.input.reset();audio.cancel();if(this.receiptBody!==undefined)this.receiptBody=undefined;else if(this.quote)this.quote=null;else this.stack.pop();}};
    if(this.receiptBody!==undefined)return {title:"Scontrino",blocks:[{title:"Discount elettorale",body:this.receiptBody,facts:this.receiptFacts}],
      actions:[{label:"Continua",run:()=>{if(this.stack.top===this)this.receiptBody=undefined;}}],selected:0,primary:0,back:back};
    const quote=this.quote;
    if(quote){
      const item=ITEMS[quote.id], max=purchaseLimit(this.state,item), total=quote.quantity*quote.price;
      const adjust=(delta:number)=>{if(this.stack.top!==this||this.quote!==quote)return;quote.quantity=Math.max(1,Math.min(Math.max(1,purchaseLimit(this.state,item)),quote.quantity+delta));audio.cursor();};
      return {title:readableCopy(item.name),subtitle:item.desc,
        blocks:[{title:"Il tuo acquisto",body:item.reusable?"Una copia basta. La direttiva si può riutilizzare.":"Il prezzo unitario resta uguale per ogni quantità.",facts:[
          {label:"Quantità",value:String(quote.quantity)},{label:"Prezzo unitario",value:`${quote.price} €`},
          {label:"Totale",value:`${total} €`},{label:"Fondi dopo",value:total<=this.state.money?`${this.state.money} → ${this.state.money-total} €`:"Fondi insufficienti"},
          {label:"In borsa dopo",value:`${this.state.bag[item.id]??0} → ${(this.state.bag[item.id]??0)+quote.quantity}`} ]},
          {title:"Effetto e utilizzo",body:(item.moveId?["La direttiva è riutilizzabile. Non si consuma."]:supplyNotes(this.state,item,0,false).slice(1)).map(readableCopy).join("\n\n")},
          ...(item.moveId?[{title:readableCopy(MOVES[item.moveId].name),body:moveDescription(MOVES[item.moveId]),facts:[
            {label:"Tipo",value:MOVES[item.moveId].type},{label:"Potenza",value:String(MOVES[item.moveId].power)},
            {label:"PP",value:String(MOVES[item.moveId].pp)},{label:"Precisione",value:`${MOVES[item.moveId].accuracy}%`}]}]:[]),
          {title:"Come si forma il prezzo",body:"Le variazioni si sommano al prezzo base. Il totale unitario è arrotondato a 10 €.",facts:[
            {label:"Prezzo base",value:`${item.price} €`},...shopAdjustments(this.state).map(entry=>({label:readableCopy(entry.label),value:`${entry.percent>0?"+":""}${entry.percent}%`}))]}],
        actions:[{label:`Compra ${quote.quantity}`,hint:max<quote.quantity?(item.reusable&&(this.state.bag[item.id]??0)>0?"Direttiva già tua: riusala dalla borsa.":"Non hai fondi sufficienti."):undefined,disabled:max<quote.quantity,run:()=>this.buy(quote)},
          {label:"Una in meno",disabled:quote.quantity<=1,run:()=>adjust(-1)},
          {label:"Una in più",disabled:quote.quantity>=max,run:()=>adjust(1)},
          {label:"Dieci in più",disabled:quote.quantity>=max,run:()=>adjust(10)}],selected:0,primary:0,back:back};
    }
    const ids=shopStock(this.state).filter(id=>supplyMatches(ITEMS[id],this.filter));
    return {title:"Discount elettorale",compact:true,subtitle:`${this.state.money} € disponibili`,
      blocks:!ids.length?[{title:"Nessun prodotto",body:"Scegli un’altra categoria per vedere le scorte."}]:undefined,
      tabs:FILTERS.map((label,i)=>({label,run:()=>{if(this.stack.top!==this||this.quote||this.receiptBody!==undefined)return;this.filter=i;audio.cursor();}})),selectedTab:this.filter,
      actions:ids.map(id=>({label:readableCopy(ITEMS[id].name),icon:itemIconPath(id)?`/sprites/${itemIconPath(id)}`:undefined,hint:ITEMS[id].desc,
        facts:[{label:"Prezzo unitario",value:`${shopPrice(this.state,ITEMS[id])} €`},{label:"In borsa",value:String(this.state.bag[id]??0)}],
        run:()=>this.openQuote(id)})),selected:Math.max(0,ids.indexOf(this.selectedId)),back:back};
  }

  update(_dt:number):void {}
  draw(screen:Screen):void {screen.clear("#101c30");}
}

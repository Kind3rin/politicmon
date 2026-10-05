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
import { openUiSheet } from "../ui/kit/sheet";

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
      // Quantity and the buy button come first and fit one screen; the long print opens on request.
      const details=()=>{
        const effect=(item.moveId?["La direttiva è riutilizzabile. Non si consuma."]:supplyNotes(this.state,item,0,false).slice(1)).map(readableCopy);
        const move=item.moveId?MOVES[item.moveId]:undefined;
        const price=[`Prezzo base ${item.price} €`,...shopAdjustments(this.state).map(entry=>`${readableCopy(entry.label)} ${entry.percent>0?"+":""}${entry.percent}%`)];
        openUiSheet(readableCopy(item.name),[item.desc,...effect,...(move?[`${readableCopy(move.name)}: ${moveDescription(move)} Potenza ${move.power}, PP ${move.pp}, precisione ${move.accuracy}%.`]:[]),`Come si forma il prezzo: ${price.join("; ")}. Arrotondato a 10 €.`].join("\n\n"));
      };
      const owned=this.state.bag[item.id]??0;
      return {title:readableCopy(item.name),subtitle:item.desc,
        blocks:[{title:"Il tuo acquisto",facts:[
          {label:"Quantità",value:String(quote.quantity)},{label:"Totale",value:`${total} €`},
          {label:"Fondi dopo",value:total<=this.state.money?`${this.state.money} → ${this.state.money-total} €`:"Fondi insufficienti"},
          {label:"In borsa dopo",value:`${owned} → ${owned+quote.quantity}`}]}],
        actions:[{label:`Compra ${quote.quantity} · ${total} €`,hint:max<quote.quantity?(item.reusable&&owned>0?"Direttiva già tua: riusala dalla borsa.":"Non hai fondi sufficienti."):undefined,disabled:max<quote.quantity,run:()=>this.buy(quote)},
          {label:"− Una in meno",disabled:quote.quantity<=1,run:()=>adjust(-1)},
          {label:"+ Una in più",disabled:quote.quantity>=max,run:()=>adjust(1)},
          {label:"+ Dieci in più",disabled:quote.quantity>=max,run:()=>adjust(10)},
          {label:"Dettagli e prezzo",run:details}],selected:0,primary:0,back:back};
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

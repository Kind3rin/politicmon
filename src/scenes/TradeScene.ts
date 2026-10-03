// SCAMBIO 1:1 con un altro giocatore online (stessa mappa, adiacenti).
// UI a due colonne stile BoxScene: a sinistra il tuo party (scegli chi
// offrire), a destra la card dell'offerta remota. Doppia conferma con
// sequence number: cambiare offerta invalida le conferme su entrambi i lati.
// Il mostro ricevuto è SEMPRE ricostruito localmente (vedi net/trade.ts).

import { MOVES } from "../data/moves";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { evolve, speciesOf, statsOf, tradeEvolution, type Monster } from "../game/monster";
import { bumpDailyQuest } from "../game/dailyquests";
import { markCaught, markSeen, saveGame, type GameState } from "../game/state";
import { mp } from "../net/mp";
import { EvolutionScene } from "./EvolutionScene";
import type {UiPanel,UiBlock} from "../ui/kit";
import {readableCopy} from "../ui/kit/copy";

export interface TradeOptions {
  peerId: string;
  peerNick: string;
}

export class TradeScene implements Scene {
  private index = 0;
  private committed = false;
  private closing = false;
  private receipt:UiBlock[]|null=null;
  private continueReceipt:(()=>void)|null=null;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: TradeOptions
  ) {}

  // Mentre lo scambio è aperto siamo "occupati": inviti duello/trade in arrivo
  // ricevono auto-decline (mutua esclusione trade/duello, conflitto #5).
  onEnter(): void {
    mp.duelBusy = true;
  }

  onExit(): void {
    mp.duelBusy = false;
  }

  update(dt:number):void {
    if(this.stack.top!==this)return;
    mp.update(dt);mp.trade.tick(dt);
    if(this.receipt)return;
    const session=mp.trade;
    if(session.phase==='idle'){
      if(!this.closing){this.closing=true;this.receipt=[{title:'Scambio annullato',body:readableCopy(session.noticeMsg??'SCAMBIO ANNULLATO.')}];session.noticeMsg=null;this.continueReceipt=()=>this.stack.pop();}
      return;
    }
    if(session.phase!=='committed'||this.committed)return;
    this.committed=true;
    const received=session.peerOffer;
    if(!received){this.closing=true;this.receipt=[{title:'Scambio non registrato',body:'L’offerta ricevuta non è disponibile.'}];this.continueReceipt=()=>{session.reset();this.stack.pop();};return;}
    const outgoing=this.state.party.find(mon=>mon.uid===session.myOfferUid);
    this.applyCommit(received);audio.catchJingle();
    const target=tradeEvolution(received);
    this.receipt=[{title:'Scambio completato',facts:[{label:'Compagno',value:`${outgoing?speciesOf(outgoing).name:'Posto libero'} → ${speciesOf(received).name}`}],body:'Il nuovo compagno entra nella tua squadra. Trasformismo riuscito!'}];
    this.continueReceipt=()=>{
      session.reset();
      if(!target){this.stack.pop();return;}
      const from=received.speciesId;
      this.stack.push(new EvolutionScene(this.stack,this.input,from,target,()=>{
        evolve(received,target);
        if(this.state.dex[target]!=='caught')this.state.flags[`dex-trade:${target}`]=true;
        markSeen(this.state,target);markCaught(this.state,target);saveGame(this.state);
        if(this.stack.top===this)this.stack.pop();
      },{mon:received,reduceEffects:this.state.reduceEffects,battleSpeed:this.state.battleSpeed,onDecline:()=>{if(this.stack.top===this)this.stack.pop();}}));
    };
  }
  private proceed():void {
    if(this.stack.top!==this||!this.receipt)return;
    const next=this.continueReceipt;
    this.continueReceipt=null;this.receipt=null;this.input.reset();audio.confirm();next?.();
  }
  private cancel():void {
    if(this.stack.top!==this)return;
    if(this.receipt){this.proceed();return;}
    if(mp.trade.phase==='committing'||mp.trade.phase==='committed')return;
    this.closing=true;this.input.reset();audio.cancel();mp.trade.cancel();this.stack.pop();
  }
  get uiPanel():UiPanel {
    const session=mp.trade,phase=session.phase,mySeq=session.mySeq,peerSeq=session.peerSeq;
    const live=()=>this.stack.top===this&&!this.closing&&!this.committed&&!this.receipt&&session.phase===phase&&session.mySeq===mySeq&&session.peerSeq===peerSeq;
    const nick=session.peerNick||this.opts.peerNick||'Anonimo';
    if(this.receipt)return {title:'Scambio',subtitle:nick,blocks:this.receipt,actions:[{label:'Continua',run:()=>this.proceed()}],primary:0,back:{label:'Indietro',hint:'Chiudi la ricevuta.',run:()=>this.proceed()}};
    const back={label:'Indietro',hint:'Annulla lo scambio.',disabled:phase==='committing'||phase==='committed',run:()=>{if(live())this.cancel();}};
    if(phase==='inviting')return {title:'Scambio',subtitle:nick,blocks:[{title:'Proposta inviata',body:'In attesa di risposta. Puoi annullare l’invito.'}],actions:[],back};
    if(phase==='idle')return {title:'Scambio',blocks:[{title:'Sessione conclusa',body:'Lo scambio non è più attivo.'}],actions:[],back};
    const mine=this.state.party.find(mon=>mon.uid===session.myOfferUid),peer=session.peerOffer;
    const blocks:UiBlock[]=[{title:'La tua offerta',body:mySeq>0&&mine?speciesOf(mine).name:'Scegli un compagno dalla tua squadra.'},
      peer?{title:'Offerta ricevuta',facts:[{label:'Specie',value:speciesOf(peer).name},{label:'Livello',value:String(peer.level)},{label:'Tipo',value:speciesOf(peer).types.join(' · ')},{label:'PV',value:`${peer.hp} di ${statsOf(peer).hp}`}],body:'Il compagno ricevuto ha PV e PP pieni. Le caratteristiche sono ricostruite dal gioco.'}:{title:'Offerta ricevuta',body:'In attesa del compagno proposto dall’altro giocatore.'},
      ...(peer?[{title:'Mosse ricevute',facts:peer.moves.map(slot=>({label:MOVES[slot.id].name,value:`${slot.pp} di ${MOVES[slot.id].pp} PP`}))}]:[]),
      {title:'Conferme',facts:[{label:'Tu',value:session.myConfirmed?'Confermato':'Da confermare'},{label:nick,value:session.peerConfirmed?'Confermato':'Da confermare'}],body:phase==='committing'?'Scambio in corso. Attendi la ricevuta.':'Cambiare una delle offerte annulla entrambe le conferme.'}];
    const locked=phase!=='negotiating';
    return {title:'Scambio',subtitle:nick,blocks,portraits:peer?[{src:`/sprites/monsters/${peer.speciesId}.png`,label:speciesOf(peer).name}]:undefined,
      actions:[{label:session.myConfirmed?'La tua offerta è confermata':'Conferma lo scambio',disabled:locked||!mine||mySeq<=0||!peer||session.myConfirmed,hint:mine&&peer?`${speciesOf(mine).name} → ${speciesOf(peer).name}.`:'Servono entrambe le offerte.',run:()=>{if(!live()||!mine||!this.state.party.includes(mine)||!session.peerOffer||session.myConfirmed)return;this.input.reset();session.confirm();audio.confirm();}},
        ...this.state.party.map((mon,index)=>({label:speciesOf(mon).name,hint:`Livello ${mon.level}. ${mySeq>0&&session.myOfferUid===mon.uid?'Offerta attuale.':'Offri questo compagno.'}`,facts:[{label:'PV',value:`${mon.hp} di ${statsOf(mon).hp}`}],disabled:locked||mySeq>0&&session.myOfferUid===mon.uid,run:()=>{if(!live()||!this.state.party.includes(mon))return;this.index=index;this.input.reset();session.setOffer(mon);audio.confirm();}}))],primary:0,selected:mine?0:this.index+1,back};
  }

  // Swap atomico: il tuo slot viene sostituito dal mostro ricostruito. Save
  // IMMEDIATO (anti-dupe C8). Ministeri orfani puliti. Dex: caught globale ma
  // escluso dai gate di zona finché non lo catturi davvero (C10, pattern
  // mattarellux — flag "dex-trade:<specie>").
  private applyCommit(received: Monster): void {
    const i = this.state.party.findIndex((m) => m.uid === mp.trade.myOfferUid);
    if (i < 0) {
      this.state.party.push(received);
    } else {
      const out = this.state.party[i];
      this.state.party[i] = received;
      for (const k of Object.keys(this.state.ministri)) {
        if (this.state.ministri[k] === out.uid) {
          delete this.state.ministri[k];
        }
      }
    }
    if (this.state.dex[received.speciesId] !== "caught") {
      this.state.flags[`dex-trade:${received.speciesId}`] = true;
    }
    markCaught(this.state, received.speciesId);
    this.state.flags["trade-done"] = true;
    bumpDailyQuest(this.state, "social1"); // uno scambio completato conta
    saveGame(this.state);
  }

  draw(screen:Screen):void {screen.clear('#17243d');}
}

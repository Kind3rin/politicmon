import { ITEMS } from "../data/items";
import { localDateKey } from "./daily";
import { bumpDailyQuest } from "./dailyquests";
import { changeMorale } from "./morale";
import type { GameState } from "./state";

export const CASINO_BET = 5, CASINO_CLUB_FEE = 15, CASINO_CHIP_CAP = 999999;
export const CASINO_SYMBOLS = [
 { id:"vote", name:"VOTO", win:50 }, { id:"chair", name:"SCRANNO", win:40 },
 { id:"seat", name:"POLTRONA", win:40 }, { id:"envelope", name:"MAZZETTA", win:40 },
 { id:"star", name:"STELLA", win:150 }
] as const;
export const CASINO_PRIZES = [
 {itemId:"schedona",chips:20}, {itemId:"maalox",chips:25}, {itemId:"dirGreen",chips:120},
 {itemId:"dirSciopero",chips:150}, {itemId:"dirBunga",chips:280}, {itemId:"tessera",chips:400}
] as const;
export const CASINO_INVITES = [
 {name:"VETRINA VIP", outcomes:[
  {money:0,polls:6,trust:-2,cohesion:0,text:"IL VIDEO DURA SETTE SECONDI. IL TUO PROGRAMMA DOVEVA DURARNE OTTO."},
  {money:-100,polls:-4,trust:-4,cohesion:-1,text:"LA FOTO È PERFETTA. NELLO SPECCHIO DIETRO SI LEGGE IL CONTO."},
  {money:0,polls:2,trust:-1,cohesion:0,text:"IL PORTAVOCE CHIEDE DI TAGGARE IL PROGRAMMA. NON HA UN PROFILO."}
 ]},
 {name:"TAVOLO RISERVATO", outcomes:[
  {money:600,polls:-4,trust:-8,cohesion:-4,text:"LO SPONSOR NON CHIEDE NULLA. HA GIÀ PREPARATO L'ELENCO."},
  {money:200,polls:-2,trust:-6,cohesion:-3,text:"LA DONAZIONE È SPONTANEA. LA SEDIA CON IL TUO NOME MENO."},
  {money:-200,polls:-6,trust:-10,cohesion:-5,text:"IL FIORE SUL TAVOLO ERA UN MICROFONO. IL GIARDINIERE È UN CRONISTA."}
 ]},
 {name:"TAVOLO APERTO", outcomes:[
  {money:-100,polls:2,trust:6,cohesion:3,text:"PUBBLICHI IL VERBALE. FINALMENTE UN CONTENUTO CHE NON CHIEDE UN LIKE."},
  {money:-100,polls:0,trust:4,cohesion:2,text:"IL QUARTIERE PORTA DOMANDE. IL PORTAVOCE AVEVA PREPARATO SOLO LE RISPOSTE."},
  {money:-100,polls:-1,trust:5,cohesion:2,text:"AMMETTI CHE UNA SCADENZA ERA SBAGLIATA. IL TITOLO URLA. LA FILA SI ACCORCIA."}
 ]}
] as const;
export type CasinoAction = {kind:"slot"} | {kind:"exchange";sell:boolean;units:number} | {kind:"prize";index:number} | {kind:"club";index:number};
export type CasinoPreview = {ok:true;paragraphs:string[]} | {ok:false;error:string};
const delta = (n:number) => n>0?`+${n}`:String(n);
const clamp = (n:number) => Math.max(0,Math.min(100,n));

export function previewCasino(state:GameState,action:CasinoAction,date=localDateKey()):CasinoPreview {
 let paragraphs:string[]=[];
 if(action.kind==="slot"){
  if(state.chips<CASINO_BET)return {ok:false,error:"SERVONO 5 FICHE PER IL GIRO."};
  paragraphs=["COSTO: 5 FICHE. TRE RULLI INDIPENDENTI, CINQUE SIMBOLI EQUIPROBABILI.","TRIS: 4%. VOTO 50F; STELLA 150F; GLI ALTRI 40F. TRIS DI MAZZETTE: SOND -3.","UNA COPPIA: 48%, RESTITUISCE 5F. TUTTI DIVERSI: 48%, INCASSO ZERO.","INCASSO MEDIO 4,96F SU 5F. IL BANCO CHIAMA QUESTI QUATTRO CENTESIMI STABILITÀ.","A CONFERMA COSTO ED ESITO INSIEME. I RULLI MOSTRANO UN ESITO GIÀ SALVATO."];
 }else if(action.kind==="exchange"){
  if(![1,5,10].includes(action.units))return {ok:false,error:"QUANTITÀ NON DISPONIBILE."};
  const money=action.units*(action.sell?80:100),chips=action.units*90;
  if(action.sell?state.chips<chips:state.money<money)return {ok:false,error:action.sell?"FICHE INSUFFICIENTI PER IL CAMBIO.":"FONDI INSUFFICIENTI PER IL CAMBIO."};
  if(!action.sell&&state.chips+chips>CASINO_CHIP_CAP)return {ok:false,error:"PORTAFICHE PIENO. CAMBIA MENO FICHE."};
  paragraphs=[action.sell?`CEDI ${chips} FICHE. RICEVI ${money}€.`:`SPENDI ${money}€. RICEVI ${chips} FICHE.`,"100€ COMPRANO 90F. LE STESSE 90F TORNANO IN 80€. GIRO COMPLETO: -20€.","IL CASSIERE TI CHIEDE IL PROGRAMMA. POI PRECISA: QUELLO DEL BANCOMAT."];
 }else if(action.kind==="prize"){
  const p=CASINO_PRIZES[action.index];if(!p)return {ok:false,error:"PREMIO NON DISPONIBILE."};
  const item=ITEMS[p.itemId];if(item.reusable&&(state.bag[p.itemId]??0)>0)return {ok:false,error:"DIRETTIVA GIÀ POSSEDUTA. NON PAGHI UN DUPLICATO."};
  if(state.chips<p.chips)return {ok:false,error:`SERVONO ${p.chips} FICHE PER QUESTO PREMIO.`};
  paragraphs=[`${item.name.toUpperCase()}: ${p.chips} FICHE.`,item.desc.toUpperCase(),"RICEVI UN OGGETTO NELLA BORSA. NESSUN CONSUMO FINO ALLA CONFERMA."];
 }else{
  const invite=CASINO_INVITES[action.index];if(!invite)return {ok:false,error:"INVITO NON DISPONIBILE."};
  if(state.flags[`casino-club:${date}`])return {ok:false,error:"INVITO DI OGGI GIÀ USATO. TORNA DOMANI."};
  if(state.chips<CASINO_CLUB_FEE)return {ok:false,error:"SERVONO 15 FICHE PER L'INVITO."};
  if(state.money<Math.max(...invite.outcomes.map(o=>-o.money)))return {ok:false,error:"FONDI INSUFFICIENTI A COPRIRE LE SPESE POSSIBILI."};
  paragraphs=[`${invite.name}: 15 FICHE. UN INVITO AL GIORNO, CONDIVISO TRA I TRE TAVOLI.`,"TRE ESITI EQUIPROBABILI. EFFETTI REALI CON I VALORI ATTUALI:",...invite.outcomes.map(o=>`FONDI ${delta(o.money)}€. SOND ${delta(clamp(state.sondaggi+o.polls)-state.sondaggi)}, FID ${delta(clamp(state.morale.trust+o.trust)-state.morale.trust)}, COE ${delta(clamp(state.morale.cohesion+o.cohesion)-state.morale.cohesion)}.`),"L'INVITO SI CONSUMA ALLA CONFERMA. B LO RESTITUISCE INTEGRO."];
 }
 return {ok:true,paragraphs};
}
export function slotPayout(reels:readonly number[]):number {
 if(reels.length!==3||reels.some(i=>!Number.isInteger(i)||!CASINO_SYMBOLS[i]))return 0;
 const [a,b,c]=reels;
 return a===b&&b===c?CASINO_SYMBOLS[a].win:a===b||b===c||a===c?CASINO_BET:0;
}
export type CasinoResult = {ok:true;lines:string[];reels?:number[];gross?:number;net?:number} | {ok:false;error:string};
export function commitCasino(state:GameState,action:CasinoAction,rng= Math.random,date=localDateKey()):CasinoResult {
 const preview=previewCasino(state,action,date);if(!preview.ok)return preview;
 if(action.kind==="slot"){
  const reels=Array.from({length:3},()=>Math.min(4,Math.max(0,Math.floor(rng()*5)))),win=slotPayout(reels),before=state.chips;
  state.chips=Math.min(CASINO_CHIP_CAP,state.chips-CASINO_BET+win);
  const gross=state.chips-before+CASINO_BET,lines=[reels.map(i=>CASINO_SYMBOLS[i].name).join(" / "),`INCASSO ${gross}F. NETTO ${delta(state.chips-before)}F.`];
  if(reels[0]===reels[1]&&reels[1]===reels[2]){
   state.flags["casino-jackpot"]=true;
   if(reels[0]===3){const old=state.sondaggi;state.sondaggi=clamp(old-3);lines.push(`IL TRIS FINISCE IN PRIMA PAGINA: SOND ${delta(state.sondaggi-old)}.`);}
  }
  if(gross>0)bumpDailyQuest(state,"slot1");
  lines.push("IL BANCARIO PROPONE IL RICONTEGGIO. SOLO SE HAI VINTO.");
  return {ok:true,lines,reels,gross,net:state.chips-before};
 }
 if(action.kind==="exchange"){
  const chips=90*action.units,money=(action.sell?80:100)*action.units;
  state.chips+=action.sell?-chips:chips;state.money+=action.sell?money:-money;
  return {ok:true,lines:[action.sell?`${chips}F CEDUTE. ACCREDITATI ${money}€.`:`SPESI ${money}€. ACCREDITATE ${chips}F.`,"IL CASSIERE SORRIDE. HA VINTO SENZA SEDERSI."]};
 }
 if(action.kind==="prize"){
  const prize=CASINO_PRIZES[action.index];state.chips-=prize.chips;state.bag[prize.itemId]=(state.bag[prize.itemId]??0)+1;
  return {ok:true,lines:[`${ITEMS[prize.itemId].name.toUpperCase()} NELLA BORSA.`,`PAGATE ${prize.chips}F.`,"IL PREMIO È REALE. IL MERITO LO STAMPANO AL GUARDAROBA."]};
 }
 const invite=CASINO_INVITES[action.index],outcome=invite.outcomes[Math.min(2,Math.max(0,Math.floor(rng()*3)))];
 const before=state.sondaggi;state.chips-=CASINO_CLUB_FEE;state.money+=outcome.money;state.sondaggi=clamp(before+outcome.polls);
 state.flags[`casino-club:${date}`]=true;changeMorale(state,invite.name,outcome.trust,outcome.cohesion);
 const morale=state.morale.history.at(-1)!;
 return {ok:true,lines:[outcome.text,`FONDI ${delta(outcome.money)}€. SOND ${delta(state.sondaggi-before)}.`,`FIDUCIA ${delta(morale.trust)}. COESIONE ${delta(morale.cohesion)}.`,"INVITO DI OGGI UTILIZZATO. GLI ALTRI TAVOLI RESTANO CHIUSI FINO A DOMANI."]};
}

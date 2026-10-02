import type {GameState} from './state';
import {ALLY_NAMES,coalitionBonuses,type AllyId} from './coalition';
import {applyTerritoryGain,type DistrictAction,type DistrictId} from './election';
import {districtActionCount,resolveDistrictEndorsement,resolveDistrictPromise,type DistrictCommandResult} from './districtCampaign';
import {changeMorale} from './morale';

export type DistrictChoice='debate'|'prudent'|'risky'|'endorsement';
type Patch=Extract<DistrictCommandResult,{ok:true}>;
export type DistrictPreview={ok:false;error:string}|{ok:true;lines:string[];localDelta:number;moneyDelta:number;cohesionDelta:number;patch?:Patch};
const ACTION_NAMES:Record<DistrictAction,string>={debate:'DIBATTITO',promise:'PROMESSA',endorsement:'SOSTEGNO'};
const STORIES:Record<DistrictId,readonly [string,string,string,string]>={
 "nord": [
  "IL VERBALE HA RAGIONE. QUALCUNO OSERÀ RISPONDERE?",
  "UN ALTRO TAVOLO. STAVOLTA SENZA FATTURA.",
  "BONUS IN STAMPA. IL TONER LO PAGHI TU.",
  "FIRMA QUI. GLI ALTRI VERBALI ASPETTANO."
 ],
 "centro": [
  "HANNO COMMENTATO LA DOMANDA. ORA TOCCA ALLA RISPOSTA.",
  "MICROFONO VUOTO. IL SILENZIO NON INTERROMPE.",
  "TUTTE LE POLTRONE OCCUPATE. IL TUO ALLEATO RESTA IN PIEDI.",
  "OSPITE QUI. NEGLI ALTRI COLLEGI VA IN REPLICA."
 ],
 "sud": [
  "NASTRO PRONTO. DOV'È LA STRADA?",
  "LA CABINA DI REGIA ASPETTA LA SCALETTA.",
  "IL NASTRO AVANZA. IL CANTIERE NO.",
  "UNA FIRMA. NESSUN NASTRO DA TAGLIARE."
 ],
 "isole": [
  "IL PLASTICO È ARRIVATO. IL CAPITANO ANCORA NO.",
  "CORSA ANNUNCIATA. I DEBITI VIAGGIANO CON TE.",
  "PLASTICO GRATIS. PIENO IN SCALA REALE.",
  "SOSTEGNO A BORDO. BIGLIETTO SOLO ANDATA."
 ],
 "feed": [
  "FONTE: STAMPANTE. HA CONFERMATO LA FOTOCOPIATRICE.",
  "NOTIZIA SMENTITA. IL FONT NON CAMBIA.",
  "TREND A TEMPO. RICEVUTA PER SEMPRE.",
  "CONDIVISIONE UNICA. SCEGLI DOVE LA SPENDI."
 ]
};
const signed=(n:number)=>`${n>=0?'+':''}${n}`;

export function previewDistrictDecision(state:Readonly<GameState>,id:DistrictId,choice:DistrictChoice,ally?:AllyId):DistrictPreview{
 const district=state.election.districts.find(d=>d.id===id);
 if(!district||state.election.phase==='inactive'||state.election.phase==='locked'||state.election.phase==='resolved')return{ok:false,error:'CAMPAGNA NON DISPONIBILE'};
 if(districtActionCount(state.election,id)>=2)return{ok:false,error:'COLLEGIO CHIUSO: DUE AZIONI'};
 const action:DistrictAction=choice==='debate'?'debate':choice==='endorsement'?'endorsement':'promise';
 if(district.outcomes.some(o=>o.action===action))return{ok:false,error:`${ACTION_NAMES[action]} GIÀ REGISTRATO`};
 if(choice==='endorsement'){
  if(!ally||!state.coalition.members.some(m=>m.allyId===ally))return{ok:false,error:'NESSUN ALLEATO DISPONIBILE'};
  const used=state.election.endorsementDistrictByAlly[ally];
  if(used)return{ok:false,error:`SOSTEGNO GIÀ USATO: ${used.toUpperCase()}`};
 }
 const index=({debate:0,prudent:1,risky:2,endorsement:3})[choice];
 const lines=[STORIES[id][index]];
 const used=new Set([...district.outcomes.map(o=>o.action),action]);
 if(district.outcomes.length===1){
  const left=(Object.keys(ACTION_NAMES) as DistrictAction[]).find(a=>!used.has(a))!;
  lines.push(`QUESTA È LA SECONDA AZIONE. CHIUDI IL COLLEGIO E RINUNCI A ${ACTION_NAMES[left]}.`);
 }else lines.push('DOPO RESTA UNO SLOT. PRUDENTE E RISCHIOSA SONO LA STESSA AZIONE PROMESSA.');
 if(choice==='debate'){
  const b=coalitionBonuses(state.coalition),mod={bonusPercent:b.bonus.territoryGain,malusPercent:b.malus.territoryGain};
  const gain=(n:number)=>Math.max(0,Math.min(100,district.localConsensus+applyTerritoryGain(n,mod)))-district.localConsensus;
  lines.push(`VITTORIA ${signed(gain(8))}; SCONFITTA ${signed(gain(-4))} CONSENSO LOCALE.`,`LA LOTTA È MANUALE. B NEL BRIEFING RINVIA SENZA CONSUMARE LO SLOT.`);
  return{ok:true,lines,localDelta:gain(8),moneyDelta:0,cohesionDelta:0};
 }
 const result=choice==='endorsement'?resolveDistrictEndorsement(state.election,state.coalition,id,ally!):resolveDistrictPromise(state.election,state.coalition,state.money,id,choice==='risky');
 if(!result.ok)return{ok:false,error:result.error==='insufficient_funds'?'FONDI INSUFFICIENTI':'AZIONE NON DISPONIBILE'};
 const localDelta=result.election.districts.find(d=>d.id===id)!.localConsensus-district.localConsensus;
 const moneyDelta=choice==='endorsement'?0:result.money-state.money;
 const cohesionDelta=-Math.min(state.morale.cohesion,result.strained.length*8+result.broken.length*16)||0;
 lines.push(`FONDI ${signed(moneyDelta)}€. CONSENSO LOCALE ${signed(localDelta)} → ${district.localConsensus+localDelta}%.`,`COESIONE ${signed(cohesionDelta)} → ${state.morale.cohesion+cohesionDelta}/100.`);
 for(const a of result.strained)lines.push(`${ALLY_NAMES[a]}: PATTO TESO.`);
 for(const a of result.broken)lines.push(`${ALLY_NAMES[a]}: PATTO ROTTO.`);
 if(choice==='endorsement')lines.push(`${ALLY_NAMES[ally!]}: SOSTEGNO UNICO CONSUMATO QUI.`);
 else lines.push('QUESTA AZIONE NON RIPARA I DEBITI DEI SERVIZI.');
 return{ok:true,lines,localDelta,moneyDelta,cohesionDelta,patch:result};
}

export function commitDistrictDecision(state:GameState,id:DistrictId,choice:DistrictChoice,ally?:AllyId):DistrictPreview{
 const preview=previewDistrictDecision(state,id,choice,ally);
 if(!preview.ok||!preview.patch)return preview;
 const result=preview.patch;
 state.election=result.election;state.coalition=result.coalition;
 state.money+=preview.moneyDelta;
 if(preview.cohesionDelta)changeMorale(state,'PROMESSA: PATTI DISATTESI',0,preview.cohesionDelta);
 for(const a of result.broken)state.flags[`coalition-broken:${a}`]=true;
 if(districtActionCount(state.election,id)>=2){state.flags[`district-complete:${id}`]=true;state.flags[`district-dossier:${id}`]=true;}
 if(state.election.phase==='ready')state.flags.tourComplete=true;
 return preview;
}

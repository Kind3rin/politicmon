import type {GameState} from './state';
import {ALLY_NAMES,type AllyId} from './coalition';

export const PALACE_MODULES=['algoritmo','factcheck','talkshow','silenzio'] as const;
export type PalaceModule=typeof PALACE_MODULES[number];
const CONTENT={
 algoritmo:['ALGORITMO','QUANTI SOSTEGNI HAI GIÀ SPESO?','SOSTEGNI','IL NASTRO TORNA AL SUO INGRESSO. LO CHIAMANO ASCOLTO.'],
 factcheck:['FACT-CHECK','QUANTE PROMESSE RISCHIOSE?','PROMESSE RISCHIOSE','LA COPIA CITA LA COPIA. IL TIMBRO APPROVA IL TIMBRO.'],
 talkshow:['REGIA','QUANTI DIBATTITI HAI VINTO?','VITTORIE','TRE MICROFONI. LA REPLICA ENTRA SOLO IN QUELLO DEL CONDUTTORE.'],
 silenzio:['STAMPA','QUANTI PATTI TESI O ROTTI?','PATTI IN CRISI','LA SPIA È ROSSA. IL COMUNICATO LA DEFINISCE UNA SCELTA CROMATICA.']
} as const;

export function palaceDossier(state:Readonly<GameState>,id:PalaceModule){
 const [title,question,noun,joke]=CONTENT[id],districts=state.election.districts;
 const endorsements=Object.entries(state.election.endorsementDistrictByAlly);
 const risky=districts.filter(d=>d.outcomes.some(o=>o.action==='promise'&&o.variant==='risky'));
 const wins=districts.filter(d=>d.outcomes.some(o=>o.action==='debate'&&o.variant==='win'));
 const broken=Object.keys(ALLY_NAMES).filter(a=>state.flags[`coalition-broken:${a}`]) as AllyId[];
 const tense=state.coalition.members.filter(m=>m.status==='strained').map(m=>m.allyId);
 const crisis=[...new Set([...broken,...tense])];
 const index=PALACE_MODULES.indexOf(id),count=[endorsements.length,risky.length,wins.length,crisis.length][index];
 const evidence=id==='algoritmo'?endorsements.map(([a,d])=>`${ALLY_NAMES[a as AllyId]}: SOSTEGNO SPESO IN ${d?.toUpperCase()}.`)
  :id==='factcheck'?risky.map(d=>`${d.id.toUpperCase()}: PROMESSA RISCHIOSA.`)
  :id==='talkshow'?districts.map(d=>{const debate=d.outcomes.find(o=>o.action==='debate');return`${d.id.toUpperCase()}: ${!debate?'DIBATTITO NON SCELTO':debate.variant==='win'?'VINTO':'PERSO'}.`;})
  :[...tense.map(a=>`${ALLY_NAMES[a]}: PATTO TESO.`),...broken.map(a=>`${ALLY_NAMES[a]}: ROTTURA REGISTRATA.`)];
 const answer=`${count} ${noun}`,max=id==='silenzio'?Object.keys(ALLY_NAMES).length:5;
 const start=Math.min(Math.max(0,count-1),max-2),offset=(state.election.revision+index)%3;
 const options=[0,1,2].map(i=>`${start+(i+offset)%3} ${noun}`);
 return{title,question,answer,options,lines:[joke,answer+'.',...evidence,
  `COESIONE ${state.morale.cohesion}/100. I DEBITI DEI SERVIZI RESTANO NEL REGISTRO.`],complete:!!state.flags[`palace-module:${id}`]};
}

export function readPalaceDossier(state:GameState,id:PalaceModule):boolean{
 if(state.election.phase!=='ready'||state.flags[`palace-module:${id}`]||state.flags[`palace:${id}:a`])return false;
 state.flags[`palace:${id}:a`]=true;return true;
}

export function verifyPalaceDossier(state:GameState,id:PalaceModule,answer:string):'complete'|'wrong'|'unread'|'closed'{
 if(state.flags[`palace-module:${id}`]||state.election.phase!=='ready')return'closed';
 if(!state.flags[`palace:${id}:a`])return'unread';
 if(answer!==palaceDossier(state,id).answer)return'wrong';
 state.flags[`palace:${id}:b`]=true;state.flags[`palace-module:${id}`]=true;
 if(PALACE_MODULES.every(m=>state.flags[`palace-module:${m}`]))state.flags.palaceRoomsComplete=true;
 return'complete';
}

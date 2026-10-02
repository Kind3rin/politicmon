import {ABILITIES} from '../data/abilities';
import {MOVES} from '../data/moves';
import {TYPE_ORDER,typeMultiplier} from '../data/poltypes';
import {currentQuest} from '../data/quests';
import {SPECIES,RIVAL_COUNTER} from '../data/species';
import {evolutionCondition} from './dexGuide';
import {movesAtLevel} from './monster';
import {hardModeLevelBonus} from './rematch';
import type {GameState} from './state';

export function starterDossier(id:string,tab:number):string[]{
 const species=SPECIES[id],rival=SPECIES[RIVAL_COUNTER[id]],moves=movesAtLevel(id,5).map(m=>MOVES[m.id]);
 if(tab===0)return [species.category,species.dexLine,`STATISTICHE BASE: PV ${species.base.hp}, GRINTA ${species.base.atk}, DIFESA ${species.base.def}, RETORICA ${species.base.spc}, VELOCITÀ ${species.base.spd}.`,...(species.ability?[`${ABILITIES[species.ability].name}: ${ABILITIES[species.ability].desc}`]:[])];
 if(tab===1)return ['ENTRA AL LIVELLO 5 CON QUESTE MOSSE:',...moves.flatMap(m=>[`${m.name}: ${m.type}, ${m.category}. POT ${m.power}, PREC ${m.accuracy}%, PP ${m.pp}.`,m.flavor])];
 if(tab===2)return [`TIPI: ${species.types.join(' / ')}.`, 'DANNO RICEVUTO PER TIPO DI MOSSA:',...TYPE_ORDER.map(t=>`${t}: ×${typeMultiplier(t,species.types)}.`),`GIANNI SCEGLIE ${rival.name}: ${rival.types.join(' / ')}.`,...moves.filter(m=>m.power>0).map(m=>`${m.name} CONTRO GIANNI: ×${typeMultiplier(m.type,rival.types)}.`),'IL DANNO DIPENDE ANCHE DA STATISTICHE, STATI E BONUS.'];
 return [...(species.evolutions??[]).map((r,i)=>`${SPECIES[r.id].name}: ${evolutionCondition(r,species.evolutions?.slice(0,i))}.`),...(species.evolutions?.length?[]:['NESSUNA EVOLUZIONE.']),'L’EVOLUZIONE APRE UN CONFRONTO. PUOI RINVIARE E RIPRENDERLA DALLA SQUADRA.','LE ALTRE SCHEDE DEL LABORATORIO SI CHIUDONO DOPO LA SCELTA. POTRAI RECLUTARE ALTRE SPECIE NELLA CAMPAGNA.'];
}
export function welcomeGuide(state:GameState):string[]{
 const quest=currentQuest(state);
 return ['QUIRINO: IL CONSENSO SI MISURA. IL BUS CHE NON PASSA PURE. QUI IMPARERAI A GUARDARE ENTRAMBI.', 'FRECCE / CROCE / LEVETTA: CAMMINA. A PARLA E CONFERMA; B TORNA. START O P APRE IL QUARTIER GENERALE.','NEL MENU TROVI SALVA, MISSIONI, MAPPA E MORALE. EXTRA > GUIDA CAMPAGNA RIPETE QUESTO BRIEFING.',quest?`PROSSIMO PASSO: ${quest.title}. ${quest.step} ${quest.hint}`:'LE MISSIONI PRINCIPALI SONO CONCLUSE. MAPPA E CONTENUTI MOSTRANO LE ATTIVITÀ ANCORA APERTE.',state.flags['dex-received']&&!state.badges.includes('auditel')?'KO E CATTURE DANNO EXP: IL LEADER RICEVE ×2 FINO A LIVELLO 10, POI IL BONUS CALA A ×1 A 20. RECLUTA NEL PERCORSO 1; CHIEDI LA DIVISA AL SINDACALISTA. MARA OFFRE UNA PROVA ANNULLABILE. IL BAR CURA PV, PP E STATUS GRATIS.':'PRIMA META: IL LABORATORIO COL TETTO BLU A BORGO URNE. TRE SCHEDE, TRE STILI. LEGGI MOSSE E TIPI PRIMA DI CONFERMARE.','TRE MEDAGLIE APRONO IL PALAZZO. LE STORIE DI QUARTIERE CAMBIANO FIDUCIA E COESIONE: I SONDAGGI DA SOLI NON RACCONTANO COME GOVERNI.','UNA PROMESSA SCADE DOPO TRE NUOVI DIBATTITI VINTI. LE RIVINCITE NON FANNO SCORRERE QUELLA SCADENZA. MORALE MOSTRA IL VERBALE.'];
}
export function firstDebateGuide(state:GameState,id:string):string[]{
 const rival=SPECIES[RIVAL_COUNTER[id]],level=4+hardModeLevelBonus(state,4),lead=state.party[0],chosen=SPECIES[lead?.speciesId??id],moves=lead?.moves??movesAtLevel(id,5);
 return [`GIANNI PORTA ${rival.name} AL LIVELLO ${level}. IL TUO ${chosen.name} ENTRA AL LIVELLO ${lead?.level??5}.`,...moves.map(slot=>{const m=MOVES[slot.id];return m.power>0?`${m.name}: EFFICACIA ×${typeMultiplier(m.type,rival.types)} CONTRO IL SUO TIPO.`:`${m.name}: ${m.flavor}`;}),'LOTTA SCEGLIE LA MOSSA. SU/GIU CAMBIA IL CURSORE. NEL MENU LOTTA, START APRE IL DOSSIER TATTICO E B TORNA ALLE AZIONI.','GIANNI NON USA CURE IN QUESTO PRIMO DIBATTITO. UNA MOSSA DI STATO COSTA UN TURNO, MA PUÒ CAMBIARE QUELLI SUCCESSIVI.','LA BORSA USA CONSUMABILI. CAMBIARE POLITICMON CONSUMA IL TURNO; CONSULTARE IL DOSSIER NO. CONTRO UN ALLENATORE NON PUOI CATTURARE O FUGGIRE.','SE PERDI QUESTO PRIMO DIBATTITO, QUIRINO TI RIMETTE IN PIEDI SENZA MULTA. POTRAI RIPROVARE GIANNI DAL LABORATORIO.','QUIRINO: GIANNI HA STUDIATO IL TUO CONTRARIO. TU STUDIA LE MOSSE. IL TELEVISORE NON FA LE MOLTIPLICAZIONI.'];
}

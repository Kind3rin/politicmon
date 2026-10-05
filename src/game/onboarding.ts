import {commandHint, currentInputDevice} from '../engine/inputDevice';
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
 if(tab===0)return [species.category,species.dexLine];
 if(tab===1)return ['ENTRA AL LIVELLO 5 CON QUESTE MOSSE:',...moves.flatMap(m=>[`${m.name}: ${m.type}, ${m.category}. POT ${m.power}, PREC ${m.accuracy}%, PP ${m.pp}.`,m.flavor])];
 if(tab===2)return [`TIPI: ${species.types.join(' / ')}.`, 'DANNO RICEVUTO PER TIPO DI MOSSA:',...TYPE_ORDER.map(t=>`${t}: ×${typeMultiplier(t,species.types)}.`),`GIANNI SCEGLIE ${rival.name}: ${rival.types.join(' / ')}.`,...moves.filter(m=>m.power>0).map(m=>`${m.name} CONTRO GIANNI: ×${typeMultiplier(m.type,rival.types)}.`),'IL DANNO DIPENDE ANCHE DA STATISTICHE, STATI E BONUS.'];
 return [...(species.evolutions??[]).map((r,i)=>`${SPECIES[r.id].name}: ${evolutionCondition(r,species.evolutions?.slice(0,i))}.`),...(species.evolutions?.length?[]:['NESSUNA EVOLUZIONE.'])];
}
export function welcomeGuide(state:GameState):string[]{
 const quest=currentQuest(state);
 return [
  'Muoversi: Usa la levetta o la croce per camminare. Conferma parla o interagisce; Indietro chiude una pagina.',
  'Polemica: Alterna mosse riuscite per caricarla. A tre punti puoi usare Fuorionda o tentare una cattura virale.',
  ...(quest?[`Prossima tappa: ${quest.title}.`,quest.step,quest.hint]:['Campagna completata: Consulta la mappa per le attività ancora disponibili.']),
  'Reclutare: Nell’erba, indebolisci il selvatico e usa una scheda elettorale dalla borsa. Se lo mandi KO, perdi l’occasione.',
  'Curarsi: Il Bar Sport cura gratuitamente PV, PP e status. Il caffè recupera solo PV; il Maalox rimuove gli status.',
  'Morale: Fiducia e coesione reagiscono alle tue scelte. Le promesse richiedono tre nuovi dibattiti vinti: controlla le scadenze.'
 ];
}
export function firstDebateGuide(state:GameState,id:string):string[]{
 const rival=SPECIES[RIVAL_COUNTER[id]],level=4+hardModeLevelBonus(state,4),lead=state.party[0],chosen=SPECIES[lead?.speciesId??id],moves=lead?.moves??movesAtLevel(id,5);
 return [`GIANNI PORTA ${rival.name} AL LIVELLO ${level}. IL TUO ${chosen.name} ENTRA AL LIVELLO ${lead?.level??5}.`,...moves.map(slot=>{const m=MOVES[slot.id];return m.power>0?`${m.name}: EFFICACIA ×${typeMultiplier(m.type,rival.types)} CONTRO IL SUO TIPO.`:`${m.name}: ${m.flavor}`;}),'LE QUATTRO MOSSE SONO VISIBILI. SCEGLINE UNA DIRETTAMENTE. TIENI PREMUTA UNA SCHEDA, O PREMI I SULLA TASTIERA, PER LEGGERNE IL DETTAGLIO SENZA CONSUMARE IL TURNO.','GIANNI NON USA CURE IN QUESTO PRIMO DIBATTITO. UNA MOSSA DI STATO COSTA UN TURNO, MA PUÒ CAMBIARE QUELLI SUCCESSIVI.','LA BORSA USA CONSUMABILI. CAMBIARE POLITICMON CONSUMA IL TURNO; CONSULTARE IL DOSSIER NO. CONTRO UN ALLENATORE NON PUOI CATTURARE O FUGGIRE.','SE PERDI QUESTO PRIMO DIBATTITO, QUIRINO TI RIMETTE IN PIEDI SENZA MULTA. POTRAI RIPROVARE GIANNI DAL LABORATORIO.','QUIRINO: GIANNI HA STUDIATO IL TUO CONTRARIO. TU STUDIA LE MOSSE. IL TELEVISORE NON FA LE MOLTIPLICAZIONI.'];
}

/** Teach one gesture when it is useful, then retire it after actual use. */
export function controlLesson(state: GameState, context?: string): {title:string;body:string} | undefined {
 if (!state.flags['controls-intro']) return undefined;
 const device=currentInputDevice();
 if (state.stepsTotal<2) return {title:'Muoviti',body:device==='touch'
  ? 'Trascina la levetta o tocca un punto della mappa: ci cammini da solo.'
  : device==='controller' ? 'Muovi la leva sinistra o usa la croce. Rilascia per fermarti.' : 'Muoviti con le frecce o WASD. Rilascia per fermarti.'};
 // A lesson that nobody needed must not nag for the whole route: each one retires with distance.
 if (state.stepsTotal>=60) return undefined;
 if (!state.flags['controls-interacted'] && state.stepsTotal<30) return {title:'Parla con qualcuno',body:context==='Parla'
  ? device==='touch' ? 'Tocca Parla. Un tocco completa il testo; il successivo continua.' : `Premi ${commandHint('a')} per parlare. Una pressione completa il testo; la successiva continua.`
  : device==='touch' ? 'Tocca un personaggio: ti avvicini e gli parli.' : 'Avvicinati a un personaggio. Il pulsante in basso diventerà Parla.'};
 if(state.flags['controls-returned'])return undefined;
 return {title:'Trova le tue cose',body:device==='touch'
  ? 'Apri Menu: squadra, borsa e mappa sono lì. Indietro ti riporta al gioco.'
  : `Premi ${commandHint('start')} per aprire Menu. ${commandHint('b')} ti riporta al gioco.`};
}

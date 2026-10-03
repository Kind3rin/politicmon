import type {Move,StatKey} from '../../data/moves';

const stats:Record<StatKey,string>={atk:'Grinta',def:'Faccia tosta',spc:'Retorica',spd:'Opportunismo'};
/** Plain descriptions share the simulation's effect values, including conditional effects. */
export function moveDescription(move:Move):string{
 const lines:string[]=[];
 const effect=move.effect;
 if(move.power>0)lines.push(`Infligge danno ${move.category==='fisico'?'fisico':'speciale'}.`);
 if(effect){
  if(effect.healRatio)lines.push(`Recupera il ${Math.round(effect.healRatio*100)}% dei PV massimi.`);
  if(effect.drainRatio)lines.push(`Recupera il ${Math.round(effect.drainRatio*100)}% del danno inflitto.`);
  if(effect.recoilRatio)lines.push(`Subisce un contraccolpo pari al ${Math.round(effect.recoilRatio*100)}% del danno inflitto.`);
  if(effect.cureStatus)lines.push('Rimuove gli status negativi.');
  if(effect.stat){const fx=effect.stat;lines.push(`${fx.chance&&fx.chance<100?`Nel ${fx.chance}% dei casi, `:''}${fx.stages>0?'Aumenta':'Riduce'} ${stats[fx.key]} ${fx.target==='self'?'di chi la usa':'del nemico'} di ${Math.abs(fx.stages)} ${Math.abs(fx.stages)===1?'grado':'gradi'}.`);}
  if(effect.status)lines.push(`Può infliggere ${effect.status.id} al nemico: ${effect.status.chance}% di probabilità.`);
  if(effect.statusIfFirst)lines.push(`Se agisce per primo, può infliggere ${effect.statusIfFirst.id}: ${effect.statusIfFirst.chance}%.`);
  if(effect.highCrit)lines.push('Ha una maggiore probabilità di colpo critico.');
  if(effect.priority)lines.push(effect.priority>0?'Agisce prima delle mosse senza priorità.':'Agisce dopo le mosse senza priorità.');
 }
 return lines.join('\n\n')||'Nessun effetto aggiuntivo.';
}

/** Cards show one compact, concrete effect; the dossier keeps the full contract. */
export function moveCardDescription(move:Move):string {
 const effect=move.effect;
 if(effect?.stat){const fx=effect.stat;return `${fx.target==='self'?'Tu':'Nemico'}: ${stats[fx.key]} ${fx.stages>0?'+':'−'}${Math.abs(fx.stages)} ${Math.abs(fx.stages)===1?'grado':'gradi'}${fx.chance&&fx.chance<100?` (${fx.chance}%)`:''}.`;}
 if(effect?.healRatio)return `Recupera il ${Math.round(effect.healRatio*100)}% dei PV massimi.`;
 if(effect?.cureStatus)return 'Rimuove gli status negativi.';
 if(effect?.status)return `${effect.status.id}: ${effect.status.chance}% sul nemico.`;
 if(effect?.statusIfFirst)return `${effect.statusIfFirst.id}: ${effect.statusIfFirst.chance}% se agisci prima.`;
 return moveDescription(move).split('\n\n')[0];
}

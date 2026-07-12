# Balance Check: campagna e boss

## Fonti analizzate

- `src/data/trainers.ts`
- `src/data/species.ts`
- `src/data/moves.ts`
- `src/game/battle/sim.ts`
- `src/game/battle/duelsim.ts`
- `scripts/sim-boss-progression.mjs`
- `scripts/playtest-campaign.mjs`
- `design/gdd/game-concept.md`

## Esito: HEALTHY con playtest umano ancora necessario

Il precedente report “6/7 troppo facili” confrontava un party completo, sopra la
media e con fino a sei cure contro il target da primo tentativo. Applicare i livelli
necessari a portarlo al 40–70% faceva crollare il profilo normale al 9–44% e avrebbe
introdotto grind obbligatorio.

## Profili separati

| Profilo | Target | Copertura |
|---|---:|---|
| Primo tentativo, roster variabile, nessun consumabile | 55–75% | `npm run balance:bosses` |
| Party preparato, matchup competente, cure disponibili | 85–100% | `npm run playtest:campaign` |

Entrambi devono restare verdi. Il primo impedisce boss-spugna e grind obbligatorio;
il secondo verifica che preparazione, catture e consumabili producano un vantaggio
reale invece di essere cosmetici.

## Strategie degeneri

- Nessuna strategia unica provata dai simulatori: i roster del primo profilo ruotano.
- Il profilo preparato premia ancora troppe cure consecutive, ma consuma un turno e
  registra cure/KO/turni; il limite reale va confermato con telemetria di run umane.

## Gate

- Ogni boss deve rientrare nel proprio profilo.
- Nessun run simulato può stallare.
- I turni medi devono restare nei range per checkpoint.
- Modifiche a livelli, statistiche, mosse o oggetti richiedono entrambi i comandi.

# Balance Check: Combat (sim.ts) — 2026-06-30

## Data Sources Analyzed
- `src/game/battle/sim.ts` — formule danno, cattura, fuga, IA
- `src/data/moves.ts` — 134 mosse (power / accuracy / category / effect)
- Nota: le dir del template `assets/data/`, `design/gdd/`, `design/balance/` non
  esistevano (Politicmon non usa lo scaffold dello studio). Analisi fatta sul sorgente.

## Health Summary: CONCERNS — 1 bug reale + 2 punti di tuning

## Outliers Detected
| Valore | Atteso | Reale | Issue |
|--------|--------|-------|-------|
| `calcDamage` defKey speciale | mossa speciale colpisce la DIFESA del difensore | `defKey = "spc"` | BUG: difesa speciale legge RETORICA, non FACCIA TOSTA |
| `vaffa` (POPULISMO speciale, power 90) | coerenza tipo↔categoria | starter populista ha RETORICA bassa | mismatch di design, non bug |

## Bug confermato — sim.ts:38-39
```ts
const atkKey: StatKey = move.category === "fisico" ? "atk" : "spc";
const defKey: StatKey = move.category === "fisico" ? "def" : "spc";
```
Per le mosse **speciali** sia attacco che difesa leggono `spc` (RETORICA). In gen-1
esiste un solo stat "special" e questo è corretto, ma Politicmon ha **4 stat
distinti** con `def` (FACCIA TOSTA) dedicata alla difesa. Conseguenza: FACCIA TOSTA
non protegge **mai** dalle mosse speciali. Un mostro tank difensivo viene bucato da
qualsiasi `tweet`/`vaffa`/`editoriale` come se la difesa fisica non esistesse → metà
del sistema di stat è inutile contro metà delle mosse.

## Degenerate Strategies
1. **`vaffa` sovra-performante** (sim.ts:43-44 + bug sopra): nel crit l'attaccante
   ignora gli stage; combinato con la difesa speciale rotta, `vaffa` (90) ignora sia
   FACCIA TOSTA (sempre) sia i buff difensivi nel crit.
2. **Stallo cura IA** (sim.ts:128-132): l'IA competente cura a +120 score quando
   `hpRatio < 0.45`; `mojito` recupera il 50% PV. Un boss con `mojito` può allungare
   lo scontro oltre il target 5-7 turni se il player non scende sotto soglia in un colpo.

## Progression / target turni
Il commento sim.ts:48-52 dichiara target **5-7 turni player-perfetto** (divisore 58),
coerente con la memory `politicmon-battle-balance`. Il bug difesa speciale però rende
i turni reali dipendenti dal mix di mosse più che dal livello: dove dominano le mosse
speciali le lotte sono artificialmente corte.

## Recommendations
| Prio | Issue | Fix | Impatto |
|------|-------|-----|---------|
| P0 | Difesa speciale usa `spc` invece di `def` | sim.ts:39 → `defKey` speciale = `"def"` | FACCIA TOSTA torna utile; ribilancia TUTTE le lotte → ri-testare turni |
| P1 | `vaffa` over-tuned dopo il fix | power 90→75 o ridurre accuracy | normalizza il burst speciale |
| P2 | Stallo cura IA boss | cap al numero di auto-cure o ridurre healRatio dei boss | rispetta il target turni |

## Values che chiedono attenzione
- **sim.ts:39** — fix a riga singola, massimo impatto. Cambia il bilanciamento di
  ogni lotta: applicare e poi misurare i turni col metodo in memory
  `politicmon-battle-balance` prima di consegnare.

---
Re-run `/balance-check` dopo i fix per verificare.

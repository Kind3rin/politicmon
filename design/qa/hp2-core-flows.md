# HP2 — Flussi principali di consultazione

Verifica del 2026-07-12 su canvas reale 240x180.

| Flusso | Evidenza | Criterio chiuso |
|---|---|---|
| Tessera | `artifacts/screens/candidate-card.png` | voce nel menu principale, documento unico, foto, numero, qualifica e statistiche; A/B visibile |
| Mappa | `artifacts/screens/world-map-capitale.png` | cartina PixelLab, cartellino TU sul landmark, località corrente e tappa sfogliata |
| Scambio | `artifacts/screens/dex-trade-guide.png`, `trade-ui.png`, `trade-done.png` | provenienza spiegata nel Dex, requisito vicinanza, doppia conferma, esito esplicito |
| Coalizione | `p5_coalition_card.png`, `p5_coalition_selected.png` | barra piena IN ESAME/SCELTA, stato fuori foto/nella coalizione, vantaggio/costo/rischi completi |
| Governo | `government_active.png`, `government_ko.png` | ministero selezionato, bonus e costo, ministro KO e bonus sospeso espliciti |

Comandi di regressione:

```text
node scripts/shot-candidate-card.mjs
node scripts/shot-world-map.mjs
node scripts/shot-dex-trade.mjs
node scripts/shot-trade.mjs
node scripts/shot-p5-photo-field.mjs
node scripts/shot-government.mjs
```

Lo scambio ricostruisce sempre localmente il Politicmon ricevuto, limita il
livello a `LEVEL_CAP`, filtra mosse illegali e richiede doppio commit simmetrico.

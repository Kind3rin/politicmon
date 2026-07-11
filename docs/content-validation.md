# Validazione contenuti

Gate principale: `npm run validate:content`.

Il comando usa Node + `tsx`, non avvia Vite, Playwright o un browser. Controlla:

- coerenza chiave/ID dei registry;
- specie, tipi, learnset, evoluzioni, abilità e PNG mostro;
- mosse, oggetti, potenza, precisione, PP e riferimenti MT;
- team trainer, livelli, mosse, hold item e ricompense;
- righe/tile mappe, coordinate NPC/pickup/warp, destinazioni ed edge;
- quest duplicate, target e flag di completamento senza producer;
- eventi di strada con testo/effetto;
- eventi meme con fonte HTTPS, finestra valida, due scelte ed effetti whitelist;
- budget single-line di specie, mosse, oggetti e titoli quest.

Controlli geometrici/visuali aggiuntivi:

- `npm run check:map-consistency`;
- `npm run check:building-doors`;
- `npm run check:world-layout`;
- `npm run check:map-exit`;
- `npm run check:sprite-bounds`.

Il gate principale gira in CI. I controlli visuali esistenti restano separati
finché non vengono convertiti completamente a Node: richiedono Playwright e
servono come evidenza locale, non come fonte unica di validità dati.

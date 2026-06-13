# Piano: riscrittura completa Politicmon (clone Pokémon, satira politica)

Data: 2026-06-11
Motivo: la versione attuale (Phaser + UI DOM, battaglie "a tavolo negoziale") non somiglia a Pokémon. Riscrittura da zero con formula Pokémon classica e satira politica italiana.

## Decisioni architetturali

- **Niente Phaser**: motore canvas 2D custom, risoluzione interna 240×160 (stile GBA) scalata pixel-perfect. Zero dipendenze runtime.
- **Tutto su canvas**: bitmap font 5×7 disegnato a mano (maiuscole + accenti italiani), pixel art procedurale definita come pixel-map in TypeScript (niente asset binari, niente rete).
- **Contenuti satirici**: cast parodistico della politica italiana (nomi di fantasia: Giorgiagon, Renzilla, Salvinator, Berlusconix, Draghimon, …), tipi satirici (POPULISMO, TECNO, DESTRA, SINISTRA, CENTRO, MEDIA, ISTITUZIONE, VERDE) con tabella efficacie ironica (es. SINISTRA super efficace contro SINISTRA).
- **Formula Pokémon fedele**: overworld a griglia con erba alta e incontri casuali, battaglie a turni (LOTTA/BORSA/SQUADRA/FUGA, PP, STAB, critici, status), cattura con Schede Elettorali, EXP/livelli/evoluzioni, PoliticDex, salvataggio localStorage.
- **Mobile**: D-pad e tasti A/B touch in overlay HTML, tastiera su desktop.

## Task

1. 🟢 Pulizia progetto: rimozione vecchio `src/`, Phaser e script dati da `package.json`.
2. 🟡 Engine: game loop, renderer pixel-perfect, input (tastiera+touch), bitmap font, audio chiptune WebAudio.
3. 🔴 Pixel art: tileset overworld (16×16), sprite giocatore/NPC, 16 specie in pixel-map 24×24.
4. 🟡 Dati: tipi + tabella efficacie, ~25 mosse, 16 specie (stats, learnset, evoluzioni, voci Dex), trainer, oggetti.
5. 🔴 Mappe: overworld Palazzopoli (ASCII tilemap), interno laboratorio, warp, NPC, zone incontri.
6. 🔴 Battaglia: sim turni (danno gen-1, tipi, STAB, crit, status, cattura, EXP/level-up/evoluzione) + scena battaglia con barre HP animate e coda messaggi.
7. 🟡 Scene di contorno: title screen, menu pausa, squadra, borsa, PoliticDex, dialoghi con scelte.
8. 🟢 Salvataggio localStorage + flusso completo (starter → rivale → route → boss al Palazzo).
9. 🟢 Verifica: `tsc --noEmit`, `vite build`, smoke test visivo via preview.

## Verifica di chiusura

- `npm run typecheck` e `npm run build` senza errori.
- Avvio dev server e controllo visivo: title → scelta starter → battaglia rivale → cattura in erba alta → salvataggio/caricamento.

# Controlli ritirati

Questi script non sono più eseguiti: descrivono interfacce che il restyling ha sostituito e fallivano già prima di essere ritirati (7 ottobre 2026). Restano qui perché la storia dei controlli si legge e perché i file di prova in `docs/*-proof.json` ne citano l'impronta.

| Script | Perché | Chi lo sostituisce |
|---|---|---|
| `check-mobile-controls.mjs` | Guidava la croce e i pulsanti A/B a schermo (`#touch-dpad`, `.a-btn`), ora levetta flottante e pulsante contestuale. | `check-world-controls.mjs` (levetta, tocco sulla mappa, due dita, corsa); la parte sulla tastiera è in `check-input-keys.mjs`. |
| `check-mobile-layout.mjs` | Misurava la posizione dei vecchi comandi dal bordo basso. | `check-ui-layout.mjs` e `check-ui-runtime.mjs` (28 schermate × 4 viewport), `check-world-controls.mjs`. |
| `check-audio-toggle.mjs` | Screenshot, senza verifiche, del vecchio titolo su canvas, contro il sito pubblico. | `check-audio-runtime.mjs` e `tests/unit/audioPreferences.test.ts`. |
| `check-r39-gameplay.mjs` | Oggetti e spray guidati coi tasti sulla vecchia Borsa. | `check-items.mjs` (Borsa, gilet, spray, tessera rimborso, a tocco), `check-roamers.mjs` (repellente). |

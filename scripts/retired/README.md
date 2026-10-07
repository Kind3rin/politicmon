# Controlli ritirati

Questi script non sono più eseguiti: descrivono interfacce che il restyling ha sostituito e fallivano già prima di essere ritirati (7 ottobre 2026). Restano qui perché la storia dei controlli si legge e perché i file di prova in `docs/*-proof.json` ne citano l'impronta.

| Script | Perché | Chi lo sostituisce |
|---|---|---|
| `check-mobile-controls.mjs` | Guidava la croce e i pulsanti A/B a schermo (`#touch-dpad`, `.a-btn`), ora levetta flottante e pulsante contestuale. | `check-world-controls.mjs` (levetta, tocco sulla mappa, due dita, corsa); la parte sulla tastiera è in `check-input-keys.mjs`. |
| `check-mobile-layout.mjs` | Misurava la posizione dei vecchi comandi dal bordo basso. | `check-ui-layout.mjs` e `check-ui-runtime.mjs` (28 schermate × 4 viewport), `check-world-controls.mjs`. |
| `check-audio-toggle.mjs` | Screenshot, senza verifiche, del vecchio titolo su canvas, contro il sito pubblico. | `check-audio-runtime.mjs` e `tests/unit/audioPreferences.test.ts`. |
| `check-r39-gameplay.mjs` | Oggetti e spray guidati coi tasti sulla vecchia Borsa. | `check-items.mjs` (Borsa, gilet, spray, tessera rimborso, a tocco), `check-roamers.mjs` (repellente). |
| `check-audio-release.mjs` | Guidava il titolo su canvas coi tasti e leggeva il mixer dal vecchio menu. | `check-audio-runtime.mjs`, `tests/unit/audioPreferences.test.ts`. |
| `check-opening-release.mjs` | Verificava la selezione del titolo leggendo un pixel del canvas (`[244,211,74]`): il titolo ora è DOM. | `check-ui-runtime.mjs` (titolo e overlay), `check-first-minutes.mjs`. |
| `check-shell-release.mjs` | Cercava `#touch-dpad` e `.a-btn` e confrontava l'hash del canvas del titolo. | `check-world-controls.mjs`, `check-ui-layout.mjs`. |
| `check-campo-release.mjs`, `check-diplomacy-release.mjs`, `check-genova-release.mjs`, `check-government-release.mjs`, `check-offshore-release.mjs`, `check-palace-release.mjs`, `check-tour-release.mjs`, `check-terrace-return.mjs` | Salvataggi `politicmon-save-v18__s0`, rapporti di campagna in `artifacts/` che non esistono più, hash di pixel del canvas e movimento coi tasti nei menu; contro il sito pubblicato. | `check-first-campaign.mjs`, `check-world-navigation-release.mjs` e i giri di `playtest-campaign.mjs`; ferry e terrazze nei test di mappa (`npm test`) e in `check-world-controls.mjs`. |

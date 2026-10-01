# Politicmon: piano del redesign completo

Aggiornato il 1 ottobre 2026. Obiettivo attivo: rifare gameplay, scene, asset,
dialoghi satirici, lotte, evoluzioni e schede, usando il credito Higgsfield dove
migliora il gioco. I round pubblicati sono tappe; il progetto non è dichiarato
completamente ridisegnato. Le vecchie rinunce per «basso ROI» del piano PixelLab
sono superate dalla richiesta attuale.

## Baseline verificata

52 specie, 78 mosse, 48 allenatori, 66 mappe, 47 quest, 8 eventi meme classici.
Salvataggi v18 con migrazione v13 verificata. Il deploy esistente è
[politicmon.vercel.app](https://politicmon.vercel.app/); master attiva CI e Vercel.
Ogni round termina con documentazione, verifiche pertinenti, schermate e pubblicazione.

| Area | Stato attuale | Prova |
|---|---|---|
| Roster | 52 fogli Higgsfield, quattro pose per specie; caricature testuali rimosse | `shot:monster-frames`, `check:evolutions` |
| Battaglie | Sfondi per ambiente, effetti per tipo, dossier e cambio consultabile; IA con statistiche e sei stili | `shot:gameplay-guide`, `shot:switch-guide`, simulazioni boss |
| Boss | Nove illustrazioni, briefing e leader persistente | `shot:boss-briefing` |
| Morale | Fiducia, coesione, tre promesse con scadenza, sette scelte civiche e memorie nei dialoghi | unit test, `shot:morale-satire` |
| Politicdex | Cinque pagine, filtri, habitat, condizioni e forme meme | `shot:gameplay-guide` |
| Schede squadra | Cinque pagine, descrizioni complete, oggetti e difese | `shot:evolution-dossier` |
| Evoluzioni | Confronto, rinvio, ripresa al cap, soglie aggiornate, tessera dopo conferma, presentazione accessibile | `shot:evolution-dossier`, unit test |
| PWA | Precache e primo utilizzo offline dei 76 asset Higgsfield; salvataggio conservato | `smoke:pwa:release` |

Credito osservato all'inizio dei round Higgsfield: 885,97. Saldo attuale
verificato: 769,97; spesa cumulativa 116 crediti. Non sono stati attivati acquisti
né abbonamenti. Il credito residuo è autorizzato per ulteriori risorse del gioco.

## Lavoro ancora necessario

1. **Esplorazione e mondo.** Audit visivo delle 66 mappe e dei percorsi reali,
   identità di quartieri e interni, scene e oggetti coerenti con la satira,
   segnaletica leggibile, incontri e deviazioni che producano decisioni.
   Rivedere anche i PNG storici di player, NPC, terreni, edifici e veicoli:
   l'esistenza di un PNG non prova che il redesign sia concluso.
2. **Lotte e crescita.** Rivedere ritmo delle lotte selvatiche, apprendimento delle
   mosse, strumenti tattici, ricompense e identità delle evoluzioni ramificate.
   Verificare campagne preparate e improvvisate, consumabili e combinazioni,
   senza affidare il bilanciamento al solo tasso di vittoria di una fixture.
3. **Interfaccia completa.** Titolo/onboarding, borsa, negozio, box, insegnamento,
   obiettivi, viaggi e schermate del postgame devono passare una revisione
   coerente del contenuto e del design. Eliminare layout e asset residui vecchi;
   mantenere controlli leggibili su canvas 240×180 e mobile.
4. **Scrittura.** Revisione dei dialoghi e degli archi di ogni zona, incluse
   ricorrenze e risposte alle azioni. La ricerca web deve generare satira
   originale con bersagli e contraddizioni precisi, senza copiare i meme.
   Il round carburante aggiunge una scena, non esaurisce questa revisione.
5. **Audio e animazione.** Riesaminare feedback, musica, transizioni e momenti
   chiave; usare media generati dove servono al ritmo o alla comprensione.
   Ogni effetto deve rispettare RIDUCI EFFETTI e RITMO RAPIDO.
6. **Verifica integrale.** Campagna reale dall'inizio al finale, postgame,
   evoluzioni e percorsi alternativi, import/export dei save, offline e
   dispositivi. Ripetere duello e scambio su relay raggiungibili: i renderer
   PVE/PVP e gli scambi locali già conclusi non provano la connettività di rete.

## Regole di produzione

- Generare risorse destinate a scene o sistemi concreti; registrare prompt, job,
  saldo e file finali. Controllare l'immagine prima dell'integrazione.
- Per player, NPC e veicoli che cambiano direzione, produrre viste N/S/E/O;
  tenere ancoraggi, trasparenza, dimensioni e ingombri coerenti con le mappe.
- Migrare le scene al nuovo renderer; un fallback neutro protegge il caricamento,
  ma un vecchio asset presente non deve essere considerato un redesign finito.
- Conservare salvataggi e stato durante la consultazione; pagamenti, PP e
  ricompense avvengono nelle azioni che li dichiarano.
- Rispettare i budget misurati: iniziale ≤250 KiB gzip, totale ≤350 KiB, p95 ≤33,4 ms
  sotto CPU Chromium ×4. Le nuove funzioni richiedono rimozione di codice morto
  o caricamento modulare, non l'aumento silenzioso dei limiti.
- Aggiornare le guide alla fine di ogni round, distinguendo prove eseguite e
  lavoro aperto. Il completamento richiede evidenza su tutte le aree sopra.

## Ultimo round

[EVOLUZIONI-SCHEDE.md](EVOLUZIONI-SCHEDE.md): 246 test, 2.137 layout, tre nuove
immagini Higgsfield (4,5 crediti), caricature testuali eliminate e nuova scena
sul caro carburante. Budget verificati: 216,7 KiB iniziali, 348,5 KiB totali;
p95 18,4–18,5 ms nei tre scenari. [Asset e provenienza](HIGGSFIELD-ASSETS.md).

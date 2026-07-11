# Politicmon — Roster Atto 3

> **Status**: Approved for implementation
> **Version**: 1.0 — 2026-07-10
> **Scope**: sei slot tattici e dieci specifiche PixelLab; produzione da R2

## Principi di bilanciamento

- Nessun nuovo tipo: il roster copre tutti gli otto tipi esistenti.
- Stadi base: BST 304; finali/singoli: BST 388–395. Nessuna statistica supera 112.
- Una specie non combina naturalmente muro, cura al 50%, boost e immunità ai debuff.
- STAB affidabile massimo potenza 85; mosse più forti pagano precisione, PP o recoil.
- Le abilità nuove sono deterministiche nel replay/PvP e non scrivono direttamente lo stato narrativo.
- I riferimenti politici restano caricature di ruoli e fenomeni pubblici: niente loghi, accuse o somiglianze realistiche.

## Matrice dei ruoli

| Slot | Famiglia | Tipi finali | Ruolo | Risposta tattica |
|---:|---|---|---|---|
| 1 | SALISTROBO → SALISOUND | SINISTRA/MEDIA | cleaner fisico veloce | pressione senza superare i fast legacy |
| 2 | VANNACCIX → FUTURORSO | DESTRA/CENTRO | bruiser e reset simmetrico | interrompe setup senza cancellare status/PV |
| 3 | GIANIMAGO → QUASIMAGIANI | MEDIA/TECNO | glass cannon speciale variabile | alto payoff, affidabilità leggibile |
| 4 | CROSETTANK | ISTITUZIONE/DESTRA | muro fisico lento | counter speciale netto, nessuna cura naturale |
| 5 | FRATOCORNO → CAMPOCORNO | SINISTRA/VERDE | sustain/support | resistenza con PP limitati |
| 6 | NORDIODO → REFERENDODO | POPULISMO/ISTITUZIONE | controllo velocità/attrito | completa copertura tipi e controllo mancante |

La sesta famiglia è NORDIODO: il playtest su carta mostrava già quattro attaccanti/bruiser e un supporto, ma nessun controller puro. Aggiungerne un altro offensivo avrebbe aumentato il power creep senza ampliare le decisioni.

## Schede specie

Formato statistiche: `HP/ATK/DEF/SPC/SPD`.

### SALISTROBO

- **Dex**: 43; **categoria**: Mostro Palco; **tipi**: SINISTRA/MEDIA.
- **Silhouette**: atleta robotico minuto, testa-schermo inclinata, cuffie circolari, gambe a molla e cavo-microfono come coda.
- **Satira**: l'outsider trasforma palco, corsa e presenza mediatica in capitale politico; il bersaglio è il meccanismo comunicativo.
- **Statistiche**: `58/80/50/44/72` (BST 304); cattura 90; EXP 138.
- **Abilità**: nessuna.
- **Learnset**: 1 CORTEO; 1 COMIZIO; 24 MONOPATTINO; 28 FESTIVAL; 31 ARTICOLO 1.
- **Evoluzione**: SALISOUND al livello 32 con SONDAGGI ≥55. Se la soglia manca, ricontrollo al livello successivo.
- **Habitat**: CAMPO LARGO, palco del tour, incontri evento.
- **Ruolo**: apprendista fisico rapido.

### SALISOUND

- **Dex**: 44; **categoria**: Mostro Amplificatore; **tipi**: SINISTRA/MEDIA.
- **Silhouette**: impianto audio atletico, torso trapezoidale, woofer-braccia, cuffie ad aureola e cresta a onda.
- **Statistiche**: `72/105/62/55/98` (BST 392); cattura 30; EXP 198.
- **Abilità**: OPPOSIZIONE, contratto esistente.
- **Learnset evolutivo**: 32 FESTIVAL; 35 SCIOPERO GENERALE; 38 EDITORIALE; 42 SCISSIONE.
- **Habitat/ruolo**: boss o ricompensa del CAMPO LARGO; cleaner fisico. SPD 98 resta sotto VAFFENIX e MARSRAT.

### FUTURORSO

- **Dex**: 45; **categoria**: Mostro Corrente; **tipi**: DESTRA/CENTRO.
- **Silhouette**: orso massiccio in avanzata, mappa rovesciata ereditata, vecchio mantello strappato e giacca geometrica nuova; podio-valigetta.
- **Satira**: rebranding, scissioni e promessa di futuro come reset della posizione precedente.
- **Statistiche**: `94/101/89/48/58` (BST 390); cattura 30; EXP 210.
- **Abilità nuova — TABULA RASA**: al primo ingresso in battaglia azzera gli stage statistici di entrambi i combattenti. Non cura PV/status; evento one-shot persistito nel checkpoint della battaglia.
- **Learnset**: 1 RADICI; 1 MONDO AL CONTRARIO; 1 GIRAVOLTA; 32 STAI SERENO; 36 FIDUCIA; 40 QUORUM.
- **Evoluzione**: ramo esplicito di VANNACCIX tramite consumabile `tessera_futuro`. L'uso dell'oggetto ha precedenza solo durante il comando item e non innesca retroattivamente GENERORSO.
- **Habitat/ruolo**: FUTURO NAZIONALE; bruiser e anti-setup. BST entro 2 punti da GENERORSO.

### GIANIMAGO

- **Dex**: 46; **categoria**: Mostro Telemago; **tipi**: MEDIA/TECNO.
- **Silhouette**: piccolo anfibio-prestigiatore, corpo a goccia, cappello-parabola e bacchetta-antenna.
- **Satira**: sondaggi, conduzione televisiva e tormentoni diventano numeri di magia dichiaratamente assurdi.
- **Statistiche**: `57/43/55/88/61` (BST 304); cattura 90; EXP 138.
- **Abilità**: nessuna.
- **Learnset**: 1 GRAFICO; 1 TWEET; 24 POCHETTE; 28 CONFERENZA; 31 EXIT POLL.
- **Evoluzione**: QUASIMAGIANI al livello 32.
- **Habitat/ruolo**: studi e palco del TOUR MEDIATICO; setup speciale.

### QUASIMAGIANI

- **Dex**: 47; **categoria**: Mostro Quasi Magico; **tipi**: MEDIA/TECNO.
- **Silhouette**: nucleo a goccia, tre maschere laterali, mantello-tenda e parabola più grande.
- **Statistiche**: `74/55/68/112/86` (BST 395); cattura 25; EXP 205.
- **Abilità nuova — FORCHETTA SONDAGGI**: le sole mosse speciali dannose ricevono 0,85× o 1,15× equiprobabile dal battle RNG; mostra `STIMA BASSA/ALTA`. Sostituisce il roll casuale standard del danno, non vi si somma.
- **Learnset evolutivo**: 32 EXIT POLL; 35 ALGORITMO; 38 EDITORIALE; 42 RAZZO X.
- **Habitat/ruolo**: boss del TOUR MEDIATICO; glass cannon speciale, fragile e deliberatamente variabile.

### CROSETTANK

- **Dex**: 48; **categoria**: Mostro Dicastero; **tipi**: ISTITUZIONE/DESTRA.
- **Silhouette**: rinoceronte corazzato caricaturale, spalle-scudo, corno-penna stilografica, leggio e cartellina; nessun realismo militare.
- **Satira**: la diplomazia pesante e il linguaggio ministeriale diventano massa difensiva, non glorificazione bellica.
- **Statistiche**: `104/76/108/58/42` (BST 388); cattura 35; EXP 205.
- **Abilità**: POLTRONA, contratto esistente.
- **Learnset**: 1 DECRETO; 1 DIRETTIVA; 26 BLOCCO NAVALE; 30 FIDUCIA; 34 QUORUM; 38 TAVOLO LUNGO.
- **Evoluzione**: nessuna.
- **Habitat/ruolo**: DIPLOMAZIA IN DIRETTA; muro fisico lento. SPC 58 è il counter; nessuna cura naturale.

### FRATOCORNO

- **Dex**: 49; **categoria**: Mostro Assemblea; **tipi**: SINISTRA/ISTITUZIONE.
- **Silhouette**: giovane capra da piazza, corna a parentesi, lana-foglia, zoccoli larghi e megafono-fiore.
- **Satira**: il campo largo reso letterale come creatura che protegge una coalizione difficile da tenere insieme.
- **Statistiche**: `66/52/72/66/48` (BST 304); cattura 95; EXP 135.
- **Abilità**: POLTRONA.
- **Learnset**: 1 CORTEO; 1 DIRETTIVA; 24 RACCOLTA DIFFERENZIATA; 28 ARTICOLO 1; 31 CONCERTONE.
- **Evoluzione**: CAMPOCORNO al livello 32.
- **Habitat/ruolo**: CAMPO LARGO; supporto robusto.

### CAMPOCORNO

- **Dex**: 50; **categoria**: Mostro Campo Largo; **tipi**: SINISTRA/VERDE.
- **Silhouette**: grande stambecco, corna ad arco protettivo, criniera di foglie e megafono-fiore evoluto.
- **Statistiche**: `88/64/94/94/50` (BST 390); cattura 30; EXP 198.
- **Abilità**: GALLEGGIAMENTO, contratto esistente.
- **Learnset evolutivo**: 32 PIAZZA; 35 AUREOLA; 38 TRANSIZIONE; 42 GAZZETTA.
- **Vincolo**: non aggiungere FIDUCIA o TAVOLO LUNGO al learnset naturale; AUREOLA a 5 PP è già il limite del sustain.
- **Habitat/ruolo**: boss o alleato del CAMPO LARGO; sustain/support.

### NORDIODO

- **Dex**: 51; **categoria**: Mostro Consultivo; **tipi**: POPULISMO/VERDE.
- **Silhouette**: piccolo dodo giudiziario, becco a pennino, toga sovradimensionata, regolamento bianco e sigillo.
- **Satira**: referendum, regolamenti e autonomie rappresentati come burocrazia aviaria; nessun riferimento a esiti reali come fatto provato.
- **Statistiche**: `61/54/63/72/54` (BST 304); cattura 95; EXP 135.
- **Abilità**: nessuna.
- **Learnset**: 1 SLOGAN; 1 GREENWASHING; 24 ZTL; 28 CITOFONATA; 31 AUTONOMIA.
- **Evoluzione**: REFERENDODO al livello 32.
- **Habitat/ruolo**: collegio NORD-OVEST e uffici elettorali; controller apprendista.

### REFERENDODO

- **Dex**: 52; **categoria**: Mostro Quesito; **tipi**: POPULISMO/ISTITUZIONE.
- **Silhouette**: dodo largo, becco a doppio pennino, ali-parentesi, toga stratificata e urna astratta sul petto.
- **Statistiche**: `82/62/84/94/68` (BST 390); cattura 30; EXP 200.
- **Abilità**: CAIMANO, contratto esistente.
- **Learnset evolutivo**: 32 AUTONOMIA; 35 DOSSIER; 38 QUORUM; 42 TSUNAMI TOUR.
- **Vincolo**: non apprende TELEPROMESSA o COVFEFE; insieme a SPD -2 produrrebbero hard control.
- **Habitat/ruolo**: Election Night e collegi settentrionali; controllo velocità e attrito.

## Nuovi contratti combat minimi

| ID | Tipo/categoria | P/ACC/PP | Contratto |
|---|---|---:|---|
| `festival` | SINISTRA/fisico | 70/100/15 | 20% SCANDALO solo se l'utilizzatore agisce per primo; fallback slice: P75 senza proc |
| `exit_poll` | MEDIA/speciale | 80/90/10 | potenza dinamica pura: 60 con PV <50%, 100 con PV ≥50% |
| `autonomia` | ISTITUZIONE/status | —/85/10 | SPD bersaglio -2 tramite effetto stat esistente |

Solo tre mosse e due abilità richiedono implementazione nuova. Gli ID visuali mantengono testo italiano; gli ID dati restano snake_case solo per i nuovi contratti. `sciopero` è l'ID corretto della mossa legacy.

## Acceptance criteria di bilanciamento

1. Validator: ID unici, mosse esistenti, livelli monotoni, evoluzioni acicliche e almeno una STAB conservata.
2. Boundary test: EXIT POLL vale 60 a 49% e 100 a 50%; TABULA RASA azzera ogni stage da -6 a +6, non status/PV, una sola volta anche dopo checkpoint/replay.
3. Simulazione deterministica di 10.000 match per ruolo contro sei finali legacy: win rate aggregato 45–55%; nessuna nuova specie >60% sul roster o >70% contro più di un ruolo.
4. A livello 35: 3–5 colpi neutrali medi; un muro non supera 7 colpi speciali neutrali; un cleaner non fa OHKO neutrale senza setup/critico.
5. Test separati con abilità on/off e seed alto/basso di FORCHETTA SONDAGGI.

## Dipendenze di implementazione

- P2: schema evoluzione item `tessera_futuro`, battle event one-shot e RNG serializzato.
- P3: mosse/abilità/specie, Dex e validator.
- PixelLab: asset `ASSET-001..010` descritti nella specifica collegata.
- P4/P5: habitat, incontri, boss e ricompense; nessun asset entra in produzione prima della vertical slice con una sola famiglia.

# Le leggende: un rito, un luogo, un cimelio, una regola

Prima i quattro Politicmon leggendari (Berlusconix, Draghimon, Mattarellux, Bunkerput) stavano fermi in una stanza, o addirittura nell'erba: Bunkerput era il selvatico più comune dell'Oblast e Mattarellux uscisse con l'1% a Caput Mundi e a Offshore. Bastava arrivarci. Ora sono una missione.

## Il rito (`src/game/legends.ts`)

Ogni leggenda ha un **rito** di tre passi, elencato nelle Missioni (missioni facoltative «Leggenda: …», con il passo successivo e i suggerimenti) e nelle note del Politicdex. Al terzo passo il mondo lo dice (banner «Rito compiuto», scossone, messaggio) e si apre una **porta** in un luogo che già conosci; dietro c'è un **sacrario**, una stanza nuova con pavimento, pareti e musica propri, un custode che commenta il tuo percorso e la leggenda.

| Leggenda | Rito | Porta e sacrario |
|---|---|---|
| **Berlusconix** — La discesa in campo | batti Sua Emittenza; ascolta la tifosa della TV a Mediopoli; chiudi il caso del Ritornello (evento civico); fatti raccontare il retroscena a Caput Mundi | porta «Regia» nello Studio 5 → *La Regia segreta* |
| **Draghimon** — Quello che serve | supera il Garante; chiudi il caso dello sportello; mantieni una promessa (menu Morale); parla con lo Sherpa UE a Offshore | «Archivio» nel Colle → *L'Archivio dei bilanci* |
| **Mattarellux** — Il settimo anno | supera il Garante; fiducia ≥ 70; cinque dossier civici decisi; benedizione del Garante | «Studio» nel Colle → *Lo Studio presidenziale* |
| **Bunkerput** — Il bunker | parla con il medico d'Oblast; batti il Bunkerista sul Percorso 1; chiudi il caso del citofono | «Bunker» dietro tre massi nell'Oblast → *Il Bunker* |

Il rito usa i sistemi che già c'erano: gli eventi civici, la fiducia e le promesse del menu Morale, gli allenatori, i dialoghi. Le leggende non compaiono più nell'erba (`encounters` ripulite); se erano già state reclutate il loro flag resta valido.

## Il valore del Politicmon

- **Cimelio**: reclutare la leggenda lascia nella borsa un oggetto chiave (icone Higgsfield 32×32) che agisce da solo: *Telecomando d'Oro* (+25% ai premi in denaro degli allenatori), *Agenda d'Oro* (+15% esperienza), *Penna del Garante* (+12% di reclutamento), *Kit del Bunker* (+2 sondaggi a ogni vittoria su un allenatore). Valori in `RELIC_EFFECTS`.
- **Aura e ingresso**: una leggenda nella tua squadra ha l'aura dorata e le scintille anche in lotta (prima solo quelle nemiche) e, quando entra in campo (a inizio lotta o al cambio), raggi che si aprono dal compagno, un anello di luce e un velo dorato ai bordi.
- **Regola della leggenda**: un pulsante «Leggenda» accanto a Cambio, Borsa, Recluta e Altro, una volta per lotta e senza costo di turno, evoca la regola del suo rito, la stessa degli eventi di area: *Diretta TV* (Berlusconix, Grinta +1 a entrambi), *Standard CE* (Draghimon, statistiche riportate tra −1 e +1), *Taglio lineare* (Mattarellux, −8% PV a tutti, mai KO), *Cantiere aperto* (Bunkerput, Velocità −1 a entrambi). Anche quando le incontri, combattono sotto la propria regola.
- **Più duri da trovare, più forti da affrontare**: Berlusconix Lv 20 (era 18), Draghimon Lv 32 (era 30), Bunkerput Lv 14 (era 10); Mattarellux resta Lv 49. Il Casinò mantiene la rivincita di Berlusconix a Lv 50.

## Cosa non so

Non ho giocato i riti a mano: i test verificano che ogni passo si compia nel mondo, che la porta si apra una volta, che il sacrario sia percorribile e che relitto, regola e aura funzionino (`tests/content/legends.test.ts`, `npm run check:legends`). Gli effetti dei cimeli sono piccoli e non bilanciati su una campagna intera.

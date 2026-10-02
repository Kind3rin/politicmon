# Palazzo: il verbale prima della diretta

Round del 2 ottobre 2026, dopo il [Tour](TOUR-VERBALE.md) e il [layout della PWA mobile](MOBILE-PWA-LAYOUT.md). Prove riproducibili e stato della pubblicazione in [palace-proof.json](palace-proof.json). Il redesign completo resta attivo.

Reception, quattro archivi, studio e terrazza hanno pavimenti, arredi e personaggi dedicati. Dieci NPC animali hanno quattro direzioni effettive: reception gufo, analista ragno, curatore topo, archivista ibis, revisore tasso, conduttore ara, operatore fenicottero, addetto stampa lumaca, giornalista istrice e regista rana pescatrice. I vecchi ingressi dei salvataggi restano validi. Ogni archivio ha due porte di ritorno; la terrazza conserva tutti e quattro gli arrivi precedenti.

31 generazioni Higgsfield completate, **46,5 crediti**, saldo verificato **382,72**. Sono integrati 60 PNG unici: 40 direzioni dei personaggi, sette pavimenti, sette scenografie, una parete e cinque illustrazioni dei verbali/risultati. Il primo profilo nord dell'analista mostrava gli occhi: è stato scartato e sostituito con una generazione dedicata. Manifest, provenance e checksum in `scripts/higgsfield-palace.json` e `scripts/higgsfield-palace-dossiers.json`; conversione riproducibile in `scripts/prepare-palace-assets.py`. Originali, ritagli nativi e scene sono stati ispezionati.

## Satira e memoria della partita

Il Palazzo richiede di leggere e verificare i risultati del proprio Tour. L'Algoritmo conta i sostegni già consumati; il Fact-check le promesse rischiose; la Regia i dibattiti realmente vinti; la Stampa i patti tesi o storicamente rotti, senza contare due volte lo stesso alleato. Le risposte cambiano con il salvataggio e restano verificabili nelle pagine del dossier. «Il nastro torna al suo ingresso. Lo chiamano ascolto» e «La copia cita la copia. Il timbro approva il timbro» collegano l'ambiente al funzionamento degli archivi.

La negazione della crisi riprende il meccanismo di [This Is Fine](https://knowyourmeme.com/memes/this-is-fine), con personaggi e immagini originali: «La spia è rossa. Il comunicato la definisce una scelta cromatica». Non si usa il disegno del cane del meme.

Leggere non aggiunge voti o risorse. Una risposta corretta valida una sola volta il verbale; una risposta sbagliata lascia invariati fondi, squadra, morale, coalizione e collegi. B annulla. Gli archivi già validati o congelati restano consultabili. Quattro verifiche aprono lo studio. I debiti dei servizi e le rotture politiche rimangono registrati.

## Conferma e finale

Prima della diretta compare una scelta esplicita: **Rivedi i verbali** è l'opzione iniziale; solo **Congela e sfida** salva lo snapshot dei cinque collegi e blocca la coalizione. B annulla. Il briefing del boss può essere rinviato senza inventare un risultato; la sfida riprende dallo snapshot salvato. L'illustrazione dei risultati mostra cinque finestre neutre: i numeri arrivano dall'esito effettivo.

Il runner nativo ha ripreso la partita guadagnata nel Tour, letto e verificato i quattro archivi, raggiunto il guaritore di Campo Largo e vinto realmente contro Algoritmo Sovrano (avversari LV55–57). Nessun livello, fondo, cura o flag di vittoria è stato iniettato. Putingrad LV53 sopravvive con 22 PV, gli altri cinque sono KO. I collegi restano **51/59/58/52/58**, coesione **40**, fiducia **68**: cinque seggi e finale `government_fractured`, perché vincere la lotta non ripara i patti. Fondi **64851 → 71026**, con premi ordinari di boss ed epilogo; il mondo viene riaperto dopo il finale. Questa è una prova automatizzata sul motore reale, non una valutazione umana del bilanciamento.

## Verifiche e limiti

314 test passano. Due prove distinte: campagna nativa di sviluppo fino al finale; runtime compilato Chromium e WebKit con input touch, quattro verifiche, risposte sbagliate senza effetti, annullamento/default della diretta e snapshot riprendibile. `npm run check:palace:release` accetta `PREVIEW_URL`; i codici guadagnati sono conservati nel JSON di prova per un checkout privo degli artefatti locali. `npm run shot:palace` verifica 16 viste e l'assenza di testo fuori schermo.

Audit visivo 50/50 scene, controllo 691 PNG e 20 checksum audio/catalogo. PWA: 829 voci precache, primo utilizzo offline di 797 asset Higgsfield e 19 tracce AAC; Chromium verifica anche reload offline. WebKit verifica precache, uso offline e resume: Playwright non supporta il suo reload offline. Il POCO fisico non è stato provato; viewport, touch e densità sono emulati.

Il limite del codice resta 350 KiB gzip, inclusi i chunk caricati successivamente. Compilazione locale: **358123/358400 byte**. Il compilatore assegna alias brevi solo a nove classi interne esplicitamente ammesse; conserva contratti delle scene, API esterne, dati e salvataggi. I test coprono getter/setter e riferimenti tra chunk. Le 52 specie/78 mosse e la matrice dei 159 sprite critici restano semanticamente identiche.

Restano sei segnalazioni delle mappe esterne a questo round: quattro arrivi delle console di Futuro e due porte della terrazza dell'Hotel. I quattro problemi delle porte del Palazzo sono risolti. Altre partite iniziali, difficoltà e prova sul telefono reale restano da completare nel redesign generale.

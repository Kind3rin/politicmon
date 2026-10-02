# Campo Largo: audit storico prima della nuova cornice

Implementazione e prove del round successivo sono in [CAMPO-CORNICE.md](CAMPO-CORNICE.md). I livelli 28–31, i due automatismi da campo visivo e il cast generico descritti sotto sono lo stato precedente; oggi il reclutamento è LV 43–46, i dossier sono manuali e quattro attori hanno direzioni proprie.

Audit del 2 ottobre 2026 dopo Bruxelles. Non certifica un redesign concluso del Campo. Le viste campione `artifacts/screens/world-redesign/bruxelles/campo_largo-*.png` e `retropalco_campo-*.png` mostrano ancora terreno e recinti condivisi, pannello generico, casa standard per il retropalco, pavimento in legno e otto tavoli ripetuti. I PNG condivisi sono rinnovati; manca un ambiente specifico per questo capitolo. L'HUD delle viste campione usa una fixture sintetica e non prova lo stato missione di una campagna entrata da Bruxelles.

## Percorso e contratti da conservare

`src/data/maps/atto3.ts` definisce Campo Largo 24×18 e retropalco 16×11. La casa del retropalco occupa quattro tile per tre, ai tile 16–19,10–12; ingressi 17/18,12, uscite interne 7/8,9. L'uscita del Campo è a sud, 10/11,17, torna a Capitale con conferma e conserva la coalizione. Il passaggio a Futuro Anteriore è 20,8 e richiede `future-chapter-unlocked`. L'ambulatorio volontario è 19,14: le cure devono rimanere raggiungibili prima e dopo ogni confronto.

I tre candidati aprono il pannello della coalizione tramite il controller, non soltanto le frasi in `MapDef`. Le risposte satiriche principali vanno riviste in `atto3Controller.ts` insieme ai testi di mappa. Il giocatore deve incontrare tutti e tre e scegliere due alleati. `photoEvent.ts` controlla i requisiti: STRINGETEVI costa zero e produce delta locale base +4; PANORAMICA costa 800 e usa base +12, con evento di linea rossa 13. Questo può mettere in tensione gli alleati interessati. Sono effetti reali già presenti: una nuova scena deve mostrarli prima della conferma e verificarli dopo, senza promettere che «tutti entrano» senza conseguenze.

Dopo la scelta, il Moderatore è necessario per sbloccare il Fotografo; la Claque non è richiesta dal controller. Le due prove hanno ancora `sightRange: 2` quando compare `campo-photo-choice-complete`. Il Fotografo parte da A dopo `campo-debate-resolved`, ma non possiede un panorama nel catalogo dei 28 dossier: manca la consultazione illustrata prima della sua lotta. I nuovi briefing devono distinguere una prova facoltativa da un requisito di capitolo, senza saltare flag o ricompense.

## Gameplay da provare dai salvataggi guadagnati

Moderatore: Mediocrate 49 / Contemorfo 50. Claque: Vannaccix 48 / Bojoon 49 / Tajanide 49. Fotografo: Mediocrate 50, Gianimago 51 e Salistrobo 52 con mosse esplicite. Questi dati non sono ancora verificati con i tre salvataggi reali post Commissione in questo nuovo flusso.

Gli incontri selvatici sono Salistrobo e Fratocorno LV 28–31, mentre il capitolo si raggiunge dopo la Commissione LV 52–55. È una discrepanza da indagare: potrebbe offrire reclutamenti tematici ma richiede molta crescita per usarli subito. Non è ancora provato quale curva li renda utili senza regalare livelli. Servono percorsi con reclutamento reale, archivio, equipaggiamento e recupero dei PP; non alzare numeri soltanto per far passare una fixture.

I report `brux-final-{ellyna,renzino,giorgetta}-direct-20261002.json` forniscono tre stati guadagnati per riprendere il capitolo. Le prove devono includere entrambe le composizioni di foto, fondi insufficienti, cancellazione, linee rosse e conciliazione, ritorno a Capitale, cure e vittoria del Fotografo. Va distinto il morale civile, che conserva promesse e scadenze, dai canali della coalizione e del consenso locale.

## Direzione del prossimo round

Il Campo può diventare un set temporaneo in cui ogni alleato pretende il centro della foto e il programma resta fuori dall'inquadratura. Il fotografo misura il consenso in centimetri di cornice; chi paga la panoramica deve vedere chi si sposta e quale accordo entra in tensione. Servono palcoscenico e retropalco riconoscibili, segni per i posti in foto, elementi specifici dei candidati e del fotografo, tre dossier, dialoghi con memoria delle scelte e un finale che legga gli accordi realmente mantenuti.

Il budget codice di Bruxelles ha circa mezzo KiB di margine: prima di espandere il capitolo occorre recuperare spazio con riuso o separazione verificati, senza alzare il limite di 350 KiB o togliere funzionalità. Resta attivo il redesign dell'intero gioco, non soltanto di questa mappa.

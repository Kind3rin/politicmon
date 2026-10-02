# Apertura: il voto è tuo

Round del 2 ottobre 2026, dopo [gli interni](WORLD-INTERIORS-VERBALE.md). [Proof](opening-proof.json) e [manifest delle generazioni](../scripts/higgsfield-opening.json). Il redesign completo resta attivo.

Il precedente filmato del ponte era fotorealistico, con un politico sul cartellone, audio e formato 16:9. Ora una breve scena illustrata segue la palette e i contorni del gioco: il voto entra nell’urna, la corona di carta scende sul coccodrillo che prende il microfono. La didascalia è «Il voto è tuo. Il merito lo prendono loro.» I tre personaggi della vignetta sono figure originali; non sono presentati come i tre starter selezionabili.

Higgsfield produce un’immagine di riferimento e un video Seedance 2.5 di quattro secondi. Spesa effettiva **29,5 crediti**, saldo verificato **353,22**. L’originale del video viene usato senza ricompressione: **1112×834, 4:3, 4,04 secondi, 242210 byte**, nessuna traccia audio. Il vecchio file pesava 2598848 byte: riduzione di circa **90,7%**. Quattro fotogrammi sono valutati visivamente e tutti i 97 frame vengono decodificati senza errori. L’immagine serve come riferimento del video, non aggiunge una risorsa PNG al runtime.

Il titolo si avvia subito sotto l’overlay. La preferenza di sistema per movimento ridotto e una sessione già vista escludono il filmato senza scaricarlo. Il video resta fuori dalla cache offline; se manca, il titolo rimane disponibile. Il salto interrompe il download, ripristina focus e comandi, e non seleziona una voce del menu. Invio, Esc, Spazio, Z/X, K/J e Backspace saltano; Tab resta sul pulsante SALTA. Durante l’apertura la console è inerte. Fine naturale, errore del file, rifiuto dell’autoplay e download fermo chiudono l’overlay; resta il limite massimo precedente di otto secondi. Le chiavi di sessione e salvataggio non cambiano. Il video non altera le preferenze audio del gioco.

Titolo, filmato, didascalia e pulsante occupano righe separate. Otto configurazioni compilate fra Chromium e WebKit verificano verticale, compatto, orizzontale e orizzontale compatto, con margini sicuri asimmetrici. La prima prova rileva su WebKit una percentuale di altezza del video risolta rispetto all’intero contenitore, che invade la didascalia. Altezza automatica e allineamento esplicito alla riga correggono la geometria effettiva; la prova completa passa poi nei due motori. I controlli comprendono isolamento della tastiera, restituzione del focus, input successivo, fine naturale, ripetizione nella stessa sessione e guasti simulati: **38 casi complessivi**. Non è una prova sul POCO fisico.

La guida mobile conserva i comandi e li descrive più brevemente. Il titolo usa un fallback coerente in blu, avorio e menta mentre si carica lo sfondo Higgsfield esistente. Viene rimosso un vecchio MessageBox del selettore difficoltà che non riceveva mai un messaggio; le scelte normale/difficile restano disponibili.

Passano **320 test**, build, contenuti, contratti di input, le dieci prove compilate della guida e l’inventario esatto di **829 risorse PWA**. Il limite completo del codice rimane **358400 byte gzip**; la build locale misura **358264**, compreso il chunk del mondo. Non è una misura della nuova versione sul dominio principale, il cui ultimo deploy è stato limitato dalla quota Vercel. La PWA locale Chromium passa installazione, aggiornamento, riavvio offline e ripresa dal background, con 797 risorse Higgsfield e 19 tracce AAC. La pubblicazione di questo round viene registrata nel proof dopo il suo completamento.

Restano campagne iniziali e seed ulteriori, una campagna a difficoltà alta, prova fisica sul telefono e valutazione del comfort audio. Questa apertura e i percorsi degli interni non sostituiscono quelle verifiche del gameplay.

Il round successivo [Comandi e campagne nuove](CONTROLLI-CAMPAGNE-VERBALE.md) corregge l'autorepeat di un tasto tenuto attraverso il salto dell'apertura, estende le prove a 46 casi e completa due campagne nuove, normale e difficile. Le 38 prove pubbliche registrate qui rimangono quelle della versione di questo round.

## Pubblicazione verificata

Runtime `bde332b`, [CI riuscita](https://github.com/Kind3rin/politicmon/actions/runs/37058279834). L’[anteprima link-check](https://politicmon-link-check.vercel.app/) contiene il nuovo filmato e tutti i cambiamenti agli interni del round precedente. Video HTTP 200, 242210 byte e SHA-256 identico all’originale locale. Codice pubblico completo: **358262/358400 byte gzip**, 138 byte di margine.

Sull’anteprima passano tutti i **38 casi dell’apertura nei due motori**, compresa la fine effettiva del filmato, verificata tramite l’evento `ended` e la posizione temporale. Chromium passa inoltre aggiornamento, riavvio offline e ripresa della campagna dopo background: 797 risorse Higgsfield e 19 tracce AAC. Il worker viene attivato in 29491 ms nella prova pubblica, entro la soglia standard di 30 secondi; nessuna soglia modificata.

Dominio principale e `test-link` riportano «Deployment rate limited — retry in 24 hours.» per questo commit. Il principale resta a `adde6bc`, con scocca mobile e Palazzo già pubblicati, senza questo nuovo filmato e senza le ultime correzioni degli interni. L’anteprima consente di valutare il nuovo round; la PWA installata dal dominio principale non viene presentata come aggiornata a questa versione.

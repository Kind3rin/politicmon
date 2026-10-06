# Cornice e comandi mobile

L’aggiornamento per la PWA segnalata sul POCO è documentato in [MOBILE-PWA-LAYOUT.md](MOBILE-PWA-LAYOUT.md). Le misure fisse descritte nel primo round qui sotto sono sostituite dal dimensionamento reale dello spazio CSS.

Round del 2 ottobre 2026, su richiesta dell’utente. La superficie lascia il bordo spesso e la falsa scocca, porta il logo e gli strumenti in alto e ancora i comandi alla parte inferiore in verticale. In orizzontale croce e azioni occupano le fasce laterali. Schermo e controlli restano separati; il focus da tastiera mantiene un contorno visibile.

La croce usa aree da 52 px, 48 sui formati compatti; A è 76 px, B 64, con etichette CONFERMA e INDIETRO. Sui formati compatti A/B diventano 64/56 px. MENU resta 44 px. Le misure condivise nel CSS consentono a croce, levetta e pulsanti di adattarsi insieme. Il centro della croce ferma il movimento; trascinare cambia asse e direzione senza sollevare il dito. La cattura del puntatore permette al dito di uscire dall’area visiva durante il gesto. A e B restano premuti fino al rilascio o alla cancellazione. Il feedback mostra l’input realmente mantenuto.

Ogni dito e ogni tasto possiede il proprio input: sollevare un dito non annulla l’altro, né un tasto ancora premuto. Anche due alias della tastiera restano indipendenti. Blur, cambio di visibilità, cancellazione e perdita di cattura puliscono i controlli. La levetta conserva la preferenza salvata e condivide le stesse regole. La guida spiega trascinamento e uso con due dita.

I margini di notch e barra inferiore alimentano sia il primo dimensionamento sincrono sia il resize del motore. Variabili CSS condivise permettono di verificare margini 47/34 in verticale, 59/59/21 in orizzontale e 44/44/16 sul telefono compatto. Queste sono simulazioni dei margini, non misure di un dispositivo fisico.

## Gameplay e verifiche

Chromium e WebKit passano dieci viewport ciascuno, da 320×568 a tablet e desktop: pulsanti almeno 44 px, nessun comando sopra il gioco, guida che congela mondo e lotta locale, focus nativo, menu e salvataggio reali, rilascio dei tasti e rotazione. La produzione locale passa altre dieci combinazioni con trascinamento, cattura, proprietà indipendente del tasto, guida e margini sicuri.

Il controllo dedicato verifica cambi di direzione, arresto al centro, trascinamento oltre il bordo, tastiera e puntatore sullo stesso comando, due puntatori sullo stesso pulsante, cancellazione, reset e levetta. Chromium esegue anche due tocchi nativi attraverso CDP. WebKit usa eventi sintetici per la proprietà multipla: solo la cattura non disponibile per quegli eventi viene simulata, mentre trascinamento e cattura normali sono reali in entrambi.

La corsa riprende senza modifiche il codice `diplomacy-arrival` di una campagna guadagnata. Due tocchi nativi destra+B portano da (9,10) a (10,10) nella lobby e attivano la corsa. Rilasciare B conserva la direzione. Il confronto mantiene fondi, squadra, borsa, morale, coalizione ed elezione. Nessuna vittoria viene assegnata da questa prova. I sei percorsi nativi Hotel della produzione locale passano anche con il nuovo motore di input.

292 test, validator dei contenuti e controlli visuali, leggibilità e contratti input passano. Il catalogo usa ID e nomi ordinari da un’unica fonte, con eccezioni esplicite: tutte le proprietà delle 78 mosse e 52 specie conservano il digest canonico catturato prima del cambiamento. Il controllo delle evoluzioni legge i registri esportati reali, evitando dipendenze dalla forma testuale del sorgente: 20 regole per livello, tre per oggetto e 23 destinazioni valide. Un primo fallimento aveva trovato zero specie perché il controllo cercava la vecchia sintassi `S({`.

Il limite di 350 KiB resta invariato. Build finale: **358163 byte gzip**, 237 byte di margine, **187964 iniziali**. Mondo/lotta/Dex hanno p95 massimo 17,6 ms con CPU ×4. Inventario PWA: 701 risorse esatte. I tentativi di opzioni del minificatore che aumentavano la dimensione sono stati scartati; rimane la configurazione originale. Il margine resta stretto per le prossime funzioni.

Questa cornice usa controlli HTML/CSS scalabili: il round non richiede generazioni a pagamento. L’Hotel precedente è pubblicato e verificato; ultimo saldo Higgsfield confermato 484,72. Provenienza, risultati, limiti e pubblicazione in [mobile-controls-proof.json](mobile-controls-proof.json).

## Seguito

Pubblicato `df71efb`: CI 37010182278 e tre Vercel riusciti. Tutte le dieci prove della cornice e i sei percorsi nativi Hotel passano sul dominio pubblico nei due motori; 563 checksum grafici, 20 audio/catalogo e PWA con 669 asset e 19 AAC verificati. WebKit verifica precache/primo utilizzo offline; il reload offline completo è certificato in Chromium. Report e identificativi sono nel proof. Restano da verificare comodità, ascolto e prestazioni su telefoni fisici, inclusa la tastiera del sistema e le barre mobili del browser. Il redesign integrale prosegue: Genova, Tour, Palazzo, introduzione, animazioni e ulteriori combinazioni tattiche rimangono nel perimetro.

Nel round [Genova](GENOVA-VERBALE.md) la stessa cornice supera inoltre otto percorsi pubblici a 390×844/DPR 2 con emulazione touch: tastiera e tap effettivi sulle sei battute nei due motori, anche con timer. Si conservano pausa, annullamento, premio unico e patti reali.

## Il tocco sulla mappa non è più involontario (6 ottobre 2026)

Camminare toccando la mappa partiva per sbaglio quando si usavano i tasti o lo stick. Ora un tocco vale solo se è *deliberato* (`Input.tapDeliberate()` in `src/engine/input.ts`): niente se una direzione è tenuta o è stata rilasciata da meno di 350 ms (1,5 s con tastiera e mouse), niente se un altro dito sta già premendo o muovendo lo stick, niente per il primo click dopo che la finestra ha ripreso il focus, niente per i tocchi lunghi (oltre 0,55 s: pollice appoggiato) e per i pulsanti diversi dal primo. Lo stick fluttuante non annulla i propri tocchi. Verificato in `check:world-controls` (stick poi tocco, seconda dita, tasto poi click, attesa e tocco valido).


## Passo e porte (6 ottobre 2026)

Segnalazione: sugli ingressi il personaggio non entra mai al centro dell'edificio e alcune animazioni di movimento «impacciano».

- **Porte.** Le porte esterne (`dd`, `DD`, `gg`) e i tappetini interni (`cc`) sono larghe 2 caselle. Il disegno del giocatore scivola di mezzo tile (mai oltre ±8 px) verso il centro della porta durante il passo che ci sale (`doorShiftNow`, interpolato con il passo, non con il tempo) e all'arrivo da una porta (`doorArrival`, fissato al cambio mappa e sciolto al primo passo). Collisioni, camera e warp non cambiano. Camminando lungo la via davanti a una porta il disegno non si sposta.
- **Passo.** `update` non ritorna più sul fotogramma di fine passo: se c'è ancora una direzione (tasto, stick, percorso a tocco) il passo successivo parte subito con il tempo avanzato (`tryStep(facing, carry)`, al massimo mezzo passo). Prima erano due fotogrammi fermi per casella e la camera perdeva l'anticipo a ogni passo. `walkCycle` è ora `(stride + moveT) × 2`: due fotogrammi a casella, gambe alternate (prima 8 a casella).
- **Percorsi a tocco.** Ricerca a costo (100 per passo + 1 per curva): stessa lunghezza, meno zig-zag. `tapRun` fissa la corsa all'inizio del percorso se è lungo almeno 7 passi.
- **Verifica.** `npm run check:doors` (38 porte percorribili dentro e fuori, nessun fotogramma fermo tenendo premuto a 60 Hz e con frame rate irregolare, percorso senza zig-zag). Limite: l'ho visto in fotogrammi catturati e nei numeri, non con il pollice su un telefono vero.
- **Bordi.** Il passaggio nord/sud tra mappe (`crossEdge`) usa la stessa dissolvenza d'uscita di una porta (0,16 s) invece dello stacco secco; `check:doors` lo verifica.

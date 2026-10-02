# Tour: cinque dossier, una sola memoria

Round del 2 ottobre 2026, dopo [Genova](GENOVA-VERBALE.md) e il [controller mobile](MOBILE-CONTROLS.md). Prove e pubblicazione in [tour-proof.json](tour-proof.json). Il redesign completo resta attivo: questo round arriva alla porta del Palazzo, senza dichiarare completata la campagna finale.

La centrale ha pavimento, tavolo dei percorsi, ingressi evidenti e un coordinatore lince. I cinque collegi hanno piantine, materiali, personaggi, illustrazioni e briefing propri: castoro dei verbali al Nord, volpe televisiva al Centro, tartaruga dei cantieri al Sud, pellicano dei traghetti nelle Isole e gazza delle fonti nel Feed. Le quattro direzioni dei sei personaggi sono disegnate effettivamente; non vengono ottenute specchiando i profili. Le uscite e gli arrivi dei salvataggi precedenti si conservano.

25 generazioni Higgsfield completate producono 48 PNG: 24 viste dei personaggi, sei scenografie, sei pavimenti, cinque panorami dei dossier e cinque ritagli per i briefing, soglia e parapetto. Originali ed esportazioni native sono stati ispezionati. Il parapetto usa la larghezza nativa completa affinché il campionamento nearest conservi la traversa verde; la soglia alpha elimina l'alone del sorgente. Prompt, job, URL, ritagli e checksum in `scripts/higgsfield-tour.json`; conversione riproducibile in `scripts/prepare-tour-assets.py`. Spesa del round **37,5 crediti**, saldo verificato **429,22**. Una richiesta respinta con 429 e senza job ID non è contata fra le 25 generazioni accettate; è stata ripresentata dopo il rallentamento.

La satira segue le fonti che si autocertificano e la stampante che confonde annuncio e risorsa, documentate da [Source: I Made It Up](https://knowyourmeme.com/memes/source-i-made-it-up) e [Money Printer Go Brrr](https://knowyourmeme.com/memes/money-printer-go-brrr). Testi e cast sono originali. Esempi nel gioco: «Fonte: stampante. Ha confermato la fotocopiatrice», il nastro che avanza senza il cantiere, il plastico gratuito con il pieno a grandezza reale.

## Scelte e conseguenze

Ogni collegio chiude dopo **due azioni su tre**: dibattito, promessa o sostegno. Prudente e rischiosa condividono l'azione promessa; il dossier indica quale terza azione viene esclusa dal secondo impegno. A apre l'anteprima; la conferma avviene solo all'ultima pagina. B annulla. Il risultato mostra gli effetti registrati; MENU riapre il verbale anche dopo la chiusura del collegio.

I conti sono calcolati sullo stato corrente: consenso locale al limite 100, fondi realmente disponibili, compatibilità e uso globale del sostegno. Un endorsement incompatibile può ridurre il consenso; ogni alleato può spenderlo in un solo collegio. Il commit rivalida fondi, alleato e slot, evitando di applicare un'anteprima ormai superata o una ricompensa due volte.

Le promesse rischiose mostrano per nome i patti che diventano tesi o si rompono. La coesione perde 8 punti per patto teso e 16 per patto rotto, limitati al valore disponibile; la modifica passa dal sistema morale effettivo e viene registrata nello storico. Le promesse civiche e i debiti dei servizi mantengono il proprio stato. Confermare una promessa elettorale non cancella un debito precedente.

Il dibattito resta una lotta manuale: l'anteprima non inventa l'esito. I briefing annunciano le squadre reali e consentono leader, dossier avversari e rinvio con B. Nord difende, Centro controlla, Sud mette pressione, Isole prepara potenziamenti, Feed punta sul danno immediato. Le policy guidano l'IA; non sono semplici etichette. Squadre e regole sulle cure rimangono quelle dei trainer.

## Prove distinte

Il runner nativo di sviluppo riprende il codice ottenuto vincendo il Partner, senza aggiungere fondi, PV, PP o flag di vittoria. Percorre cure e mappe con input e vince realmente i cinque dibattiti contro squadre LV52–54. Segue promessa prudente al Nord, rischiosa al Centro/Sud/Feed e sostegno di Generorso nelle Isole. Tutti i collegi registrano due azioni: consenso finale **51/59/58/52/58**. Campo esce dalla coalizione; Quantum e Generorso restano con patti tesi. Coesione **72 → 40**, fiducia 68, promessa del traghetto mantenuta. Fondi **59726 → 64851**, comprensivi dei premi dei dibattiti e di 2900 spesi nelle tre promesse. Palazzo raggiunto; 6641 frame, cinque vittorie, nessun esito forzato. Il controllo usa un autopilota tattico sul motore reale, non una valutazione umana del bilanciamento.

La build di produzione viene verificata separatamente nei due browser, con touch 390×844/DPR2. Dal codice Hotel non modificato: percorso fino ai cinque collegi, dossier paginati, rinvio del briefing, annullamento senza effetti, promessa prudente e sostegno incompatibile applicati una volta, riapertura del collegio chiuso, diniego del sostegno già usato altrove, entrambe le corsie di ritorno e Palazzo ancora bloccato con un solo collegio chiuso. Un secondo codice, guadagnato nelle cinque lotte, verifica l'ingresso nativo al Palazzo senza alterare risultati o risorse. Queste prove pubbliche di preparazione e routing non vengono presentate come cinque battaglie giocate sulla build pubblica.

303 test passano; catalogo completo: 52 specie, 78 mosse, 49 trainer, 66 mappe, 49 quest e 8 eventi. Evoluzioni e controlli richiesti dalla CI passano. 200 viste per motore verificano paginazione, annullamento, applicazione precisa e zero overflow; dieci configurazioni della cornice esterna passano. Genova supera di nuovo quattro percorsi di produzione con tap, premio unico e allenamento.

## Prestazioni e limiti

Per mantenere il budget invariato, la build abbrevia soltanto i simboli dichiarati privati in TypeScript. Il riconoscimento usa la tabella dei simboli, preservando proprietà pubbliche omonime, binding del costruttore, callback, accessi con stringa e chiavi dei payload. Un test compila e minifica una fixture e confronta il comportamento con la versione ordinaria; i percorsi nativi verificano anche la build risultante. Il sorgente di sviluppo conserva i nomi leggibili. Catalogo e mappe restano completi e inclusi nel bundle.

Build definitiva locale: **358265 byte gzip / 358400**, margine 135; iniziale 187654. Profilo CPU ×4: p95 mondo 17,6 ms, battaglia/Dex 17,5 ms. L'ID automatico della build può cambiare di pochi byte la compressione al deploy. Il margine è ancora ridotto e la prossima espansione richiede ulteriore lavoro sulla struttura del codice.

631 checksum PNG e 20 audio/catalogo verificati; inventario esatto di 769 risorse. Primo uso offline di 737 asset Higgsfield e 19 AAC nei due browser. Reload offline completo verificato in Chromium; Playwright WebKit consente la verifica della precache, ma non quel reload.

Il verificatore globale delle mappe conserva **10 rilievi precedenti**, riportati integralmente nel proof: arrivi del Futuro su console e convenzioni di abbinamento di porte/arrivi delle terrazze Hotel/Palazzo. Non si dichiara quell'audit interamente verde. Il percorso del Tour e i ritorni appena descritti passano senza nuovi rilievi del Tour. Comfort e FPS su dispositivi fisici restano da valutare; Palazzo, finale, intro/animazioni, altri seed e difficoltà elevata sono lavoro aperto.

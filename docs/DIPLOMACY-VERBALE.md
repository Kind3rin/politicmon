# Hotel Diplomatico: una foto, tre conti

Round del 2 ottobre 2026. Lobby, tre suite e terrazza hanno nuovi materiali, arredi, padiglione a vetri e cinque personaggi in quattro direzioni. Il Partner sul campo e nel dossier mantiene la stessa identità. La ricerca di [Two Buttons](https://knowyourmeme.com/memes/daily-struggle-two-buttons) e [Epic Handshake](https://knowyourmeme.com/memes/epic-handshake) suggerisce contraddizioni e accordi apparenti: qui diventano tre delegazioni, documenti incompatibili e una sola ricevuta. Illustrazioni e battute sono originali.

Fedeltà usa un timbro per coprire due accordi; Autonomia separa i tavoli ma conserva il conto; Consenso lascia accesi soltanto i microfoni che applaudono. I dossier calcolano gli effetti prima della firma. Mostrano anche lo stato successivo dei membri della coalizione e i debiti civici ancora da riparare. Con sondaggi già a 100 l'aumento effettivo è zero: il rischio per i patti rimane visibile. Autonomia paga 500€ e ripara subito un patto teso disponibile; senza un patto riparabile dichiara l'incasso con i modificatori effettivi. I token dei salvataggi storici restano utilizzabili una sola volta.

Il Partner non attacca a vista e non vaga. A apre il dossier, B rinvia. Mantiene Macronfox 52, Ursulax 53 con Gilet e Trumpon 54, mosse, IA e premio originali: nessuna riduzione di difficoltà. Si può tornare dal medico del Campo via Futuro prima della sfida, passando da entrambe le porte del padiglione. Le suite hanno due uscite ciascuna. Tour e Genova aprono dopo la vittoria.

## Partite guadagnate

Cinque segmenti normali, seed 20261002, riprendono i codici `future-diplomacy` di campagne già giocate. Il primo codice mantiene squadra, borsa, fondi, morale, patti, elezione e flag del padre. Cure, tre suite, scelta, boss e trasferimento al Tour avvengono con input nativi. Nessun mostro, oggetto o flag di vittoria viene assegnato al runner.

| Percorso | Fondi dopo il Partner | Fiducia / coesione | Esito effettivo |
|---|---:|---:|---|
| Ellyna, Autonomia | 59726 | 68 / 72 | Segretaria riconciliata, bonus al 75%, violazione e riparazione consumata conservate |
| Renzino, Fedeltà | 58606 | 80 / 48 | Segretaria tesa; Centrista precedentemente escluso non ricompare |
| Giorgetta, Consenso | 50866 | 36 / 56 | Sondaggi già saturi; bus e molo restano debiti civici |
| Ellyna, Fedeltà | 61214 | 68 / 50 | Secondo strappo: Segretaria esclusa; Generorso e Centrista restano |
| Giorgetta con Futurorso, Autonomia | 50391 | 50 / 62 | Nessun patto teso: incasso; servizi realmente riparati e Futurorso guadagnato restano |

Tutti vincono al primo tentativo del segmento. Il premio inizializza cinque nuovi collegi con maschere azzerate. La vittoria fa avanzare di uno il contatore delle scadenze civiche; nei cinque stati osservati conserva fiducia, coesione, promesse, storia e coalizione della scelta. Non cancella i debiti né riporta alleati esclusi. Questo non certifica una campagna ininterrotta, altri seed o difficoltà alta. Prove complete e impronte sono in [diplomacy-proof.json](diplomacy-proof.json).

## Risorse e verifiche

25 generazioni completate `gpt_image_2_5` high: 20 voci di asset, un profilo supplementare e **35 PNG runtime**, di cui 33 nuovi percorsi e due sostituzioni. **37,5 crediti**, saldo verificato **522,22 → 484,72**, cumulativo 401,25. Undici invii respinti per rate limit non hanno restituito job e non sono conteggiati come generazioni. Due città scambiate per pavimenti, una trama troppo fitta e due fogli con profili duplicati sono identificati nel manifest. Il profilo sinistro è generato separatamente e ispezionato; non è una copia specchiata. Prompt, job, sorgenti, conversioni e checksum in `scripts/higgsfield-diplomacy.json`. Converter ripetibile: `scripts/prepare-diplomacy-assets.py`, con Pillow.

291 test passano. Contenuti: 66 mappe, 52 specie, 78 mosse, 49 trainer e 49 quest. Chromium e WebKit verificano tre accessi bloccati, tre suite con entrambe le uscite, anteprima e annullamento, fondi 499 insufficienti, riparazione reale, nessun secondo incasso, dossier manuale, cure e ritorno. Le 20 direzioni del cast sono realmente disegnate. I fondi insufficienti e i danni PV/PP sono fixture isolate, senza vittorie attribuite. La matrice delle scelte ha 153 viste senza overflow; il mondo ha 253 viste su 66 mappe e 220 pose condivise, oltre al cast specifico.

Build locale: 563 checksum grafici e 20 audio/catalogo; primo utilizzo offline di 669 asset Higgsfield e 19 tracce AAC nei due motori. Il reload offline completo è verificato in Chromium; Playwright WebKit verifica la cache e il primo utilizzo, senza supportare quel reload. Il font conserva tutti i pixel dei 66 glifi originali, verificati con digest catturato prima della conversione. La rappresentazione compatta e le istruzioni condivise mantengono il limite invariato di 350 KiB: build finale 358245 byte gzip, margine 155 byte; p95 mondo/lotta/Dex massimo 17,6 ms con CPU ×4. Ulteriori funzioni richiedono lavoro sulla modularità.

La produzione locale viene percorsa dai codici guadagnati tramite tastiera: suite Consenso con dossier annullato, terrazza con dossier del Partner annullato, accesso al Tour. Le prove del dominio pubblico e gli identificativi di pubblicazione vengono registrati nel proof dopo il deploy. FPS, ascolto e comandi su dispositivi fisici restano aperti.

## Prossimo tratto

[GENOVA-TOUR-AUDIT.md](GENOVA-TOUR-AUDIT.md) conserva la prossima fase: set musicale, Tour, collegi e Palazzo devono ottenere identità, azioni e memoria coerenti. Anche introduzione, altre animazioni, combinazioni tattiche e campagne complete restano nel perimetro. Il redesign integrale è attivo.

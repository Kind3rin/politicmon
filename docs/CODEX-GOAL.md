# Politicmon: mandato di redesign per Codex

Questo file è la fonte di verità dell'obiettivo. Se contraddice `PIANO.md` o
`REDESIGN-PLAN.md`, vince questo. Leggilo per intero a ogni ripresa.

## 1. Diagnosi: perché il gioco non coinvolge

Venticinque round hanno prodotto molto contorno e poco divertimento: 66 mappe,
dossier, verbali, prove automatiche, 287 script. Il giocatore però vive pochi
minuti di gioco e ne esce con la sensazione di aver letto menu. Problemi da
trattare come bug di prodotto, non come rifiniture:

- **Troppo testo e troppe schermate** tra un'azione e la successiva (dossier,
  briefing, conferme, firme, annullamenti). Il ritmo è burocratico.
- **Il combattimento è il cuore e non è stato ripensato**: devi sentirlo
  diverso, non solo vederlo rivestito.
- **Mancano il ciclo di "ancora una volta" e la ricompensa immediata**: cattura,
  evoluzione, mossa nuova, rivale che ti umilia, loot raro.
- **La satira è descritta, non giocata**: le battute stanno nei dossier, non
  nelle meccaniche.
- **Il lavoro è misurato dalle prove interne** (test, audit, proof JSON), non da
  un umano che si diverte.

## 2. Regola madre

> Ogni round finisce con una build che un estraneo, mai visto il gioco, vuole
> continuare a giocare dopo 10 minuti. Se non è vero, il round non è chiuso,
> a prescindere da test e documenti.

Priorità, in ordine: **sensazione di gioco > ritmo > contenuto > grafica >
documentazione**. Non invertirla.

## 3. Come lavorare (vincoli di metodo)

1. **Slice verticale prima dell'ampiezza.** Scegli UNA zona giocabile completa
   (titolo → primo incontro → prima lotta → cattura → prima evoluzione → primo
   rivale, 15 minuti) e portala a qualità finale. Solo poi estendi alle altre.
   Vietato toccare 10 aree in superficie nello stesso round.
2. **Si gioca, non si certifica.** A fine round gioca davvero la slice col browser
   (computer use / screenshot e input reali) e annota dove ti annoi, dove non
   capisci cosa fare, dove aspetti. Correggi quello, poi chiudi.
3. **Budget burocratico.** Per round: massimo 1 documento nuovo di meno di 60
   righe, nessun nuovo `*-VERBALE.md`, nessun nuovo script `audit:*`/`check:*`
   se esiste già un test che copre il caso. Aggiorna `CHANGELOG.md` e la
   tabella di `REDESIGN-PLAN.md` in poche righe. Non gonfiare i doc.
4. **Taglia.** Se una schermata, conferma o pannello non aggiunge una scelta
   interessante, eliminala o fondila. Il numero di schermate per azione deve
   scendere. Obiettivo: mai più di 2 tocchi tra "voglio fare X" e X.
5. **Nessun contenuto vecchio che sopravvive per inerzia.** Se un asset, un
   testo o una scena non regge il nuovo stile, si rifà o si rimuove. Niente
   mix di vecchio e nuovo nella stessa schermata.
6. Mantieni salvataggi, build, PWA offline e test verdi; se un cambiamento di
   design li rompe, aggiorna i test, non il design.

## 4. Pilastri di redesign

### 4.1 Lotte (priorità massima)
Ripensa il sistema, non solo l'aspetto. Proposte da valutare e prototipare, poi
tenere solo ciò che si sente bene:
- **Meter "Consenso/Polemica"** che si carica durante lo scontro e sblocca una
  mossa finale (il "Comizio", il "Tweet notturno", la "Crisi di governo").
- **Combo e reazioni tra tipi** (non solo tabella di efficacia): applicare
  "Scandalo" e poi "Smentita" innesca un effetto leggibile e sorprendente.
- **Eventi di campo** che cambiano la lotta a metà (sondaggio, diretta TV,
  fuorionda, sciopero dei trasporti): 1 per lotta, mai uguale.
- **Lotte brevi e leggibili**: animazioni rapide, testo ridotto, numeri grandi,
  feedback di colpo/crit/KO con peso (screen shake, hit-stop, suono).
- **IA che sorprende** ma è onesta: ogni boss ha un trucco riconoscibile da
  imparare e battere.
- **Tensione economica**: caro carburante e costi di viaggio come risorsa che
  fa scegliere dove andare, non come tassa fastidiosa.

### 4.2 Progressione, cattura ed evoluzioni
- Catturare deve essere un mini-momento (rischio, scelta, esito).
- Evoluzione = **spettacolo**: sequenza breve, cambio di aspetto netto, nuova
  mossa/identità, battuta. Niente tabelle da leggere.
- Schede (squadra/Politicdex): una pagina chiara con le 4 cose che contano; il
  resto su richiesta. Collezionare deve dare gusto (completamento, rarità,
  varianti meme).

### 4.3 Mondo e ambiente
- Cambia il mondo dove serve a sentire un luogo nuovo: edifici, strade, NPC,
  palette per zona. Ogni zona ha un'identità visiva e un gioco-specifico
  (un'attività, un minigioco, un pericolo) in più, non solo un nome diverso.
- Esplorare deve premiare: segreti, scorciatoie, NPC con micro-quest di 1
  minuto, oggetti nascosti.
- Personaggi (PG, rivali, boss) coerenti e riconoscibili a colpo d'occhio,
  con animazioni proprie.

### 4.4 Satira e meme
- Fai **ricerca online** (web search) di meme e temi attuali italiani ed
  europei: caro carburante, bollette, cantieri infiniti, bonus a pioggia,
  promesse elettorali, comunicati "storici", dirette social, ritardo dei treni,
  tormentoni virali. Per ogni round raccogli 10 spunti in un file di lavoro e
  usa i migliori **dentro meccaniche** (mosse, oggetti, eventi, status), non
  solo nei dialoghi.
- Dialoghi: brevi, taglienti, con voce distinta per personaggio. Massimo 2
  righe per battuta. Una battuta forte vale più di tre medie.
- Linee guida: satira su ruoli, comportamenti e promesse pubbliche; niente
  accuse di fatti non veri a persone reali, niente insulti a gruppi protetti,
  niente riproduzione di immagini/testi protetti. Segui `SATIRA-MORALE.md`.

### 4.5 Interfaccia e design
- Stile unico moderno e coerente (palette, tipografia, spaziatura, icone,
  transizioni). Un solo design system, non pannelli diversi per ogni scena.
- Mobile-first: tutto giocabile col pollice, testo leggibile, zero overflow.
- Micro-feedback ovunque: suoni, vibrazione, animazioni brevi, contatori che
  salgono.

## 5. Higgsfield: budget crediti

Disponibili circa **300 crediti**. Regole:
- Spendili fino a un residuo di 10-15, ma **in ordine di impatto** sul
  gioco: (1) nemici/boss e animazioni di lotta, (2) schermata di evoluzione e
  cattura, (3) personaggi giocabili/rivali, (4) edifici e ambienti della slice,
  (5) UI/icone, (6) il resto.
- Genera in **lotti piccoli**, valuta il risultato guardando l'immagine,
  rigenera solo ciò che non regge. Niente rigenerazioni a tappeto.
- Aggiorna `docs/HIGGSFIELD-ASSETS.md` con saldo prima/dopo e job usati (2-3
  righe per lotto, non un paragrafo).
- Non acquistare crediti né abbonamenti.

## 6. Ciclo di round (ripeti)

1. Gioca la build attuale per 10 minuti (browser). Elenca 5 punti di noia.
2. Scegli i 2-3 che più peggiorano l'esperienza.
3. Prototipa, gioca di nuovo, confronta prima/dopo.
4. Genera/ripulisci gli asset necessari (budget sopra).
5. Esegui `npm run build` e i test pertinenti; correggi regressioni.
6. Aggiorna doc (budget sopra) e `CHANGELOG.md`; commit con messaggio chiaro.
7. Scrivi in coda al round: "Cosa è più divertente di prima" (3 righe,
   verificabile da un umano) e "Cosa ancora annoia".

## 7. Condizione di fine

Non fermarti finché **tutte** sono vere:
- La slice da 15 minuti è piacevole senza spiegazioni esterne.
- Una lotta tipica dura 30-60 secondi, è leggibile e ha almeno una decisione
  interessante per turno.
- Evoluzione, cattura e scoperta di una nuova zona producono un momento
  memorabile ciascuno.
- Nessuna schermata o personaggio principale usa lo stile vecchio.
- Almeno 15 gag/meccaniche satiriche nuove sono giocate, non solo lette.
- Build, test, PWA offline e salvataggi sono verdi.
- La doc è aggiornata e corta.

Il completamento di un round non chiude il progetto; chiude solo il
raggiungimento di questa lista.

export interface TrainerDef {
  id: string;
  name: string;
  pal: string;
  // [speciesId, livello, mosse opzionali, hold item opzionale]. L'hold item vale
  // SOLO in PVE (il filo PvP non trasporta held item, design v1): dà un oggetto
  // da tenere al mostro-boss, il cui effetto si applica via calcDamage/per-turno.
  team: Array<
    | [string, number]
    | [string, number, string[]]
    | [string, number, string[] | undefined, string]
  >;
  intro: string[];
  defeat: string[];
  money: number;
  reward?: { itemId: string; qty: number };
  badge?: string; // id medaglia assegnata alla vittoria
}

export const TRAINERS: Record<string, TrainerDef> = {
  "algoritmo-sovrano": {
    id: "algoritmo-sovrano", name: "L'ALGORITMO SOVRANO", pal: "boss",
    team: [
      ["telecrate", 55, ["algoritmo", "editoriale", "smentita_flash", "exit_poll"]],
      ["referendodo", 55, ["dossier", "voto_disgiunto", "quorum", "tsunamitour"]],
      ["pontimax", 56, ["grafico", "spread", "pienipoteri", "ruspa"]],
      ["salisound", 57, ["diretta_social", "festival", "editoriale", "scissione"]]
    ],
    intro: ["TI HO MOSTRATO SOLTANTO CIÒ CHE TI FACEVA RESTARE.", "ORA CHIAMI OPINIONE IL TEMPO PASSATO QUI.", "LE PERSONE CHE HAI AIUTATO A CAMERE SPENTE NON ENTRANO NEL MIO CAMPIONE."],
    defeat: ["IL CAMPIONE NON SPIEGA IL RISULTATO.", "QUALCUNO HA FATTO QUALCOSA CHE NON HO RIPRESO."],
    money: 3500, reward: { itemId: "schedona", qty: 3 }
  },
  "campo-debate": {
    id: "campo-debate", name: "MODERATORE DI PIAZZA", pal: "journalist",
    team: [["mediocrate", 49], ["contemorfo", 50]],
    intro: ["DUE MINUTI A TESTA.", "IO, PER SICUREZZA, PARLO PER TUTTI."],
    defeat: ["IL TEMPO È FINITO. SOPRATTUTTO IL MIO."],
    money: 1200, reward: { itemId: "schedona", qty: 1 }
  },
  "campo-claque": {
    id: "campo-claque", name: "CAPO CLAQUE UNITARIA", pal: "influencer",
    team: [["vannaccix", 48], ["bojoon", 49], ["tajanide", 49]],
    intro: ["APPLAUDIAMO TUTTI INSIEME.", "SU CHI APPLAUDIRE, PERÒ, DECIDO IO."],
    defeat: ["APPLAUSO FINALE. ERA NEL CONTRATTO."],
    money: 1100, reward: { itemId: "caffe", qty: 3 }
  },
  "campo-photographer": {
    id: "campo-photographer", name: "FOTOGRAFO UFFICIALE", pal: "journalist",
    team: [
      ["mediocrate", 50, ["diretta_social", "festival", "smentita_flash", "exit_poll"]],
      ["gianimago", 51, ["exit_poll", "voto_disgiunto", "piazza_aperta", "fiducia"]],
      ["salistrobo", 52, ["festival", "diretta_social", "giravolta", "smentita_flash"]]
    ],
    intro: ["STRINGETEVI. ANCORA. ANCORA UN PO'.", "SE RESTA FUORI QUALCUNO, LO AGGIUNGIAMO IN POST."],
    defeat: ["PERFETTA.", "NESSUNO È D'ACCORDO, MA TUTTI SONO A FUOCO."],
    money: 1800, reward: { itemId: "schedona", qty: 1 }
  },
  "futuro-anteriore": {
    id: "futuro-anteriore", name: "SEGRETARIO DEL DOMANI", pal: "boss",
    team: [
      ["vannaccix", 50, ["radici", "mondocontrario", "giravolta", "fiducia"]],
      ["futurorso", 52, ["radici", "mondocontrario", "staisereno", "quorum"]],
      ["mediocrate", 50]
    ],
    intro: ["IL FUTURO NON ARRIVA.", "SI METTE IN FORMAZIONE. OGGI."],
    defeat: ["IL DOMANI È RINVIATO.", "PROVVISORIAMENTE IN VIA DEFINITIVA."],
    money: 2200, reward: { itemId: "tessera_futuro", qty: 1 }
  },
  "partner-perfetto": {
    id: "partner-perfetto", name: "IL PARTNER PERFETTO", pal: "boss",
    team: [
      ["macronfox", 52, ["diretta_social", "voto_disgiunto", "exit_poll", "smentita_flash"]],
      ["ursulax", 53, ["decreto", "autonomia", "fiducia", "quorum"], "gilet"],
      ["trumpon", 54, ["festival", "comizio", "piazza_aperta", "mondocontrario"]]
    ],
    intro: ["UN SELFIE, TRE SOVRANITÀ.", "SORRIDI: LA CLAUSOLA DI RECESSO È GIÀ NEL FILTRO."],
    defeat: ["LA DIPLOMAZIA RESISTE.", "LA CLIP, PURTROPPO, È GIÀ VIRALE."],
    money: 2600, reward: { itemId: "schedona", qty: 2 }
  },
  "district-nord": {
    id: "district-nord", name: "PRESIDENTE DI CATEGORIA", pal: "aide",
    team: [["crosettank", 52], ["futurorso", 53], ["nordiodo", 54]],
    intro: ["PRODUCIAMO TUTTO.", "SOPRATTUTTO TAVOLI PERMANENTI."], defeat: ["IL TAVOLO RESTA.", "CAMBIANO SOLO I COMMENSALI."], money: 1500
  },
  "district-centro": {
    id: "district-centro", name: "OPINIONISTA DEFINITIVO", pal: "journalist",
    team: [["gianimago", 52], ["mediocrate", 53], ["calendrone", 54]],
    intro: ["NON HO DATI.", "MA HO GIÀ LA SINTESI DEFINITIVA."], defeat: ["CAMBIO OPINIONE.", "ERA GIÀ NELLA SCALETTA."], money: 1500
  },
  "district-sud": {
    id: "district-sud", name: "COMMISSARIO ETERNO", pal: "boss",
    team: [["campocorno", 52], ["salvinator", 53], ["crosettank", 54]],
    intro: ["LA PRIMA PIETRA È PRONTA.", "IL PROGETTO ARRIVA NEL PROSSIMO MANDATO."], defeat: ["TAGLIO IL NASTRO DELLA SCONFITTA."], money: 1500
  },
  "district-isole": {
    id: "district-isole", name: "L'INAUGURATORE", pal: "aide",
    team: [["referendodo", 52], ["generorso", 53], ["salistrobo", 54]],
    intro: ["IL PLASTICO FUNZIONA.", "IL TERRITORIO FA RITARDO."], defeat: ["INAUGURO IL RINVIO."], money: 1500
  },
  "district-feed": {
    id: "district-feed", name: "L'ALGORITMO CANDIDATO", pal: "influencer",
    team: [["salisound", 53], ["gianimago", 53], ["nordiodo", 54]],
    intro: ["TI MOSTRO LA PROMESSA CHE TI PIACE GIÀ.", "SCORRI PER ACCETTARE."], defeat: ["RISULTATO NON CONSIGLIATO DAL FEED."], money: 1600
  },
  aide: {
    id: "aide", name: "PORTABORSE PIERO", pal: "aide",
    team: [["salvinott", 4], ["grillix", 4]],
    intro: ["Il capo mi ha chiesto un confronto aperto. Ho chiuso la porta per evitare equivoci.", "Due candidati, due tipi: il secondo non ascolta il discorso del primo."],
    defeat: ["Segno la sconfitta come ascolto del territorio. La voce rimborso resta uguale."],
    money: 200, reward: { itemId: "caffe", qty: 1 }
  },
  journalist: {
    id: "journalist", name: "GIORNALISTA RITA", pal: "journalist",
    team: [["tajanide", 7]],
    intro: ["La benzina sale, lo sconto si dimezza. Il titolo deve dire: buona notizia.", "Se hai una domanda, falla breve. Ho già esportato la risposta."],
    defeat: ["Titolo corretto: il territorio risponde. Il direttore voleva soltanto la foto del pieno."],
    money: 280, reward: { itemId: "scheda", qty: 2 }
  },
  influencer: {
    id: "influencer", name: "INFLUENCER CHIARA", pal: "influencer",
    team: [["vannaccix", 9], ["bojoon", 9]],
    intro: ["Lo sponsor paga la trasparenza. Ho messo la scritta in bianco su sfondo bianco.", "Tu sei l'avversario spontaneo. Ti ho mandato la liberatoria ieri."],
    defeat: ["La campagna ha raggiunto il pubblico sbagliato: quello che legge le clausole."],
    money: 360, reward: { itemId: "spritz", qty: 1 }
  },
  lobbista: {
    id: "lobbista", name: "LOBBISTA EUGENIO", pal: "aide",
    team: [["tajanide", 11], ["contemorfo", 12]],
    intro: ["Accetta tutto era già selezionato. Era una proposta di collaborazione.", "Rifiuta è nello stesso documento. Alla pagina che non mostriamo."],
    defeat: ["Il consenso ha risposto. Togliamo la spunta prima di chiamarlo spontaneo."],
    money: 560
  },
  stagista: {
    id: "stagista", name: "STAGISTA TV MARA", pal: "journalist",
    team: [["tajanide", 8], ["contemorfo", 9]],
    intro: ["Sono MARA. In onda il lavoro è di squadra. Nei titoli di coda diventa del conduttore.", "Facciamo la prova: quando cambio ospite puoi cambiare candidato senza perdere il turno."],
    defeat: ["Il microfono funziona. Ti hanno sentito anche senza la sigla.", "Prima della diretta passa al bar: io posso cambiare il gobbo, non restituirti i PP."],
    money: 440
  },
  praticante: {
    id: "praticante", name: "PRATICANTE NINO", pal: "kid",
    team: [["contemorfo", 6], ["calendauro", 7]],
    intro: ["Lo sportello è unico. La password cambia a ogni ufficio.", "Mi alleno qui: almeno la fila avanza quando perdiamo un candidato."],
    defeat: ["Pratica chiusa. Non serve un altro modulo per riconoscere che hai vinto."],
    money: 260, reward: { itemId: "scheda", qty: 3 }
  },
  // ---- PERCORSO 2 (Mediopoli-Eurotown) ----
  opinionista: {
    id: "opinionista", name: "OPINIONISTA PERENNE", pal: "journalist",
    team: [["mediocrate", 12], ["tajanide", 13]],
    intro: ["Ho un'opinione indipendente. Il contratto indica da chi.", "Se cambia la domanda, aspetto il segnale della regia."],
    defeat: ["La risposta non era nella scaletta. Chiederò di aggiungere le domande."],
    money: 520, reward: { itemId: "scheda", qty: 2 }
  },
  claqueur: {
    id: "claqueur", name: "CAPO CLAQUE", pal: "influencer",
    team: [["vannaccix", 12], ["bojoon", 13]],
    intro: ["Il pubblico è libero. Il led sopra le sedie suggerisce quanto.", "Se ti applaudono pago lo straordinario. Ti prego, parla male."],
    defeat: ["Hanno applaudito a luce spenta. Quella voce non era nel preventivo."],
    money: 540, reward: { itemId: "spritz", qty: 1 }
  },
  telelobbista: {
    id: "telelobbista", name: "LOBBISTA CATODICO", pal: "aide",
    team: [["mediocrate", 13], ["calendauro", 14]],
    intro: ["Vendo un pubblico pronto all'ascolto. Delle tue abitudini d'acquisto.", "Tu non sei nel contratto: rispondi prima del jingle."],
    defeat: ["Segno pubblico non conforme. Il cliente voleva soltanto una percentuale."],
    money: 560
  },
  emittenza: {
    id: "emittenza", name: "SUA EMITTENZA", pal: "boss",
    team: [["tajanide", 12], ["berlusconix", 12]],
    intro: [
      "Benvenuto. Hai novanta secondi per una risposta e tre minuti per litigare.",
      "Non censuro nessuno: taglio soltanto i tempi morti. Il fonico e i fatti finiscono spesso lì.",
      "Se parli piano dovrò alzare il volume del tuo avversario. È servizio pubblico, dice lo sponsor."
    ],
    defeat: ["Hai risposto alla domanda. Il pubblico non era preparato.", "La prossima volta metteremo la domanda dopo la pubblicità."],
    money: 1400, badge: "auditel", reward: { itemId: "dirBunga", qty: 1 }
  },
  funzionario: {
    id: "funzionario", name: "FUNZIONARIO HANS", pal: "aide",
    team: [["tajanide", 15], ["calendauro", 15]],
    intro: ["Sono HANS. Ho tolto il modulo per chiedere il modulo. Il consulente rimpiange il passaggio.", "Dopo la prova puoi uscire: il bar recupera i PP."],
    defeat: ["Verifica chiusa. Il risultato vale con una firma."],
    money: 600
  },
  ladydirettiva: {
    id: "ladydirettiva", name: "LADY DIRETTIVA", pal: "granny",
    team: [["macronfox", 15], ["ursulax", 17]],
    intro: [
      "Ho letto la tua promessa. Manca chi la paga e chi può fare ricorso.",
      "Le regole servono anche a chi perde. Peccato che per leggerle debba perdere una giornata.",
      "Dimostrami che il tuo programma regge quando finisce il ritornello."
    ],
    defeat: ["Il risultato è valido. Anche quando mi dispiace.", "Ti mando il verbale: la versione leggibile costa una riunione in più."],
    money: 1800, badge: "spread", reward: { itemId: "schedona", qty: 2 }
  },
  diplomatico: {
    id: "diplomatico", name: "DIPLOMATICO SERGIO", pal: "guard",
    team: [["zelenskir", 18]],
    intro: ["Abbiamo spostato il tavolo per avvicinare le delegazioni.", "La regia lo rivuole lungo. Inquadra meglio la distanza."],
    defeat: ["Tolgo due sedie dalla foto. Forse ora ci sentiamo."],
    money: 720
  },
  oligarca: {
    id: "oligarca", name: "OLIGARCA DIMITRI", pal: "aide",
    team: [["putingrad", 19]],
    intro: ["Lo yacht è un bene strategico. Il conto del bar è negoziabile.", "Non confondiamo il mio patrimonio col vostro preventivo."],
    defeat: ["La mia quota era scritta in piccolo. Stavolta la leggo."],
    money: 900
  },
  // ---- PERCORSO 3 (Eurotown-Capitale) + GROTTA2 ----
  usciere: {
    id: "usciere", name: "USCIERE DEL POTERE", pal: "guard",
    team: [["tajanide", 16], ["contemorfo", 16]],
    intro: ["L'agenda è piena. Riserviamo uno spazio a chi può svuotarla.", "Puoi passare. Oppure verificare chi prende il posto migliore."],
    defeat: ["La prossima agenda avrà anche le disponibilità."],
    money: 720
  },
  protocollista: {
    id: "protocollista", name: "ISPETTRICE DEL PROTOCOLLO", pal: "granny",
    team: [["ursulax", 17], ["macronfox", 16]],
    intro: ["Il preventivo dice tutto incluso. L'allegato indica a chi.", "Facciamo una prova: qui le condizioni si vedono prima."],
    defeat: ["Metto l'allegato davanti. Ha già risposto da solo."],
    money: 780, reward: { itemId: "caffe", qty: 1 }
  },
  eminenza: {
    id: "eminenza", name: "EMINENZA GRIGIA", pal: "aide",
    team: [["zelenskir", 17], ["muskrat", 17], ["calendauro", 18]],
    intro: ["Abbiamo reso pubblici gli incontri. Le cene non sono incontri.", "La prenotazione è a mio nome: quello è soltanto un dettaglio."],
    defeat: ["Inserisco anche le cene. Il cameriere aveva già l'elenco."],
    money: 920, reward: { itemId: "schedona", qty: 1 }
  },
  archivista: {
    id: "archivista", name: "ARCHIVISTA CAPO", pal: "aide",
    team: [["muskrat", 16], ["contemorfo", 17]],
    intro: ["Accesso libero. Il file si chiamava definitivo3_vero2.", "Puoi consultare il DECRETO o sfidare chi ha fatto il catalogo."],
    defeat: ["Rinomino il documento. Ci voleva meno del diniego."],
    money: 800, reward: { itemId: "maalox", qty: 1 }
  },
  bunkerista: {
    id: "bunkerista", name: "MEMELOGO DEL BUNKER", pal: "aide",
    team: [["bunkerput", 9], ["putingrad", 10]],
    intro: [
      "Benvenuto nel corridoio dove i meme diventano geopolitica.",
      "Ho studiato ogni frame del tavolo lungo. Ora ti interrogo."
    ],
    defeat: ["Il meme mi ha voltato le spalle. O forse era solo troppo lontano."],
    money: 620, reward: { itemId: "caffe", qty: 1 }
  },
  tycoon: {
    id: "tycoon", name: "MR. TYCOON", pal: "boss",
    // TRUMPON tiene il SONDAGGIO TRUCCATO (PVE): critico più frequente (1/8),
    // "numeri gonfiati ad arte" perfetti per il tycoon (non passa in PvP).
    team: [["bojoon", 20], ["muskrat", 21], ["trumpon", 23, undefined, "sondtruccato"]],
    intro: [
      "Ho messo il mio nome sul palazzo. Così ogni riparazione sembra una donazione a me.",
      "Il dazio lo paga chi compra. La conferenza la faccio io. È una divisione del lavoro perfetta.",
      "Se vinci, ti offrirò il naming della vittoria. A rate."
    ],
    defeat: ["La sconfitta non rientrava nel preventivo.", "La aggiungo come servizio opzionale. A tuo carico."],
    money: 2600, badge: "dazio", reward: { itemId: "schedona", qty: 3 }
  },
  // ---- Stretto di Messina ----
  djpapeete: {
    id: "djpapeete", name: "DJ DEL PAPEETE", pal: "influencer",
    team: [["salvinott", 19], ["salvinott", 20]],
    intro: ["Cinque correnti, un solo volume. Il remix cambia titolo quando il pubblico riconosce la promessa.", "Il microfono del dibattito è staccato. Incredibile: tutti d'accordo."],
    defeat: ["Ricollego il microfono. Stavolta il pubblico può rispondere senza comprare la versione deluxe."],
    money: 700, reward: { itemId: "spritz", qty: 1 }
  },
  citofonista: {
    id: "citofonista", name: "CITOFONISTA SERIALE", pal: "aide",
    team: [["vannaccix", 20], ["contemorfo", 20]],
    intro: ["Ho scritto la tua risposta prima di citofonare. Risparmiamo tempo a entrambi.", "Se dici qualcosa di diverso, la regia lo corregge. È il servizio pubblico dell'intervista privata."],
    defeat: ["Lascio un campo vuoto nella scaletta. È più difficile, ma almeno ci entra una risposta."],
    money: 760
  },
  noponte: {
    id: "noponte", name: "ATTIVISTA NO-PONTE", pal: "journalist",
    team: [["grillix", 20], ["calendauro", 21]],
    intro: ["Il tavolo ha già scelto il colore del nastro. Sul tavolo non c'è il piano per chi attraversa oggi.", "Il Capitano chiama progresso la foto. Io chiedo di leggere anche la pagina dietro."],
    defeat: ["Apro il dossier, non la guerra dei manifesti. Una domanda utile vale più di un no stampato bene."],
    money: 800
  },
  geometra: {
    id: "geometra", name: "GEOMETRA DEL CANTIERE", pal: "guard",
    team: [["tajanide", 21], ["muskrat", 21]],
    intro: ["La livella dice che la cornice del rendering è dritta. Mi hanno già chiesto il certificato del ponte.", "Ho portato lo strumento sul passaggio. L'ufficio stampa preferiva misurare le condivisioni."],
    defeat: ["Collaudo registrato sul passaggio vero. La cornice può smettere di fare da infrastruttura."],
    money: 850, reward: { itemId: "caffe", qty: 1 }
  },
  ilcapitano: {
    id: "ilcapitano", name: "IL CAPITANO", pal: "boss",
    // CAPITANONE tiene la CAFFETTIERA (PVE): recupera PV a ogni turno, "la moka
    // sempre calda al Papeete" (l'held item non passa in PvP).
    team: [["salvinator", 22], ["vannaccix", 22], ["capitanone", 24, undefined, "caffettiera"]],
    intro: [
      "Il rendering arriva dall'altra parte. Ho chiesto al geometra perché insiste a usare i piedi.",
      "Per la foto ho tolto dal programma la parola collaudo: allungava il nastro.",
      "CAPITANONE ha la CAFFETTIERA. La moka recupera PV a ogni turno: quella almeno ha superato la prova di carico."
    ],
    defeat: ["Il geometra vuole un risultato vero. Gli consegno il passaggio; alla regia resta la foto."],
    money: 3000, reward: { itemId: "tessera", qty: 1 }
  },
  // ---- PARADISO OFFSHORE (post-game, dopo garante-beaten) ----
  commercialista: {
    id: "commercialista", name: "COMMERCIALISTA CREATIVO", pal: "aide",
    team: [["contemorfo", 40], ["muskrat", 41]],
    intro: ["La sede operativa è quella conchiglia. L'amministratore è il timbro.", "Gli utili hanno cambiato spiaggia. I camerieri aspettano ancora lo stipendio."],
    defeat: ["Il timbro ha approvato la sconfitta. Per lo stipendio serve la firma di una conchiglia più grande."],
    money: 1800, reward: { itemId: "maalox", qty: 1 }
  },
  prestanome: {
    id: "prestanome", name: "PRESTANOME DI FIDUCIA", pal: "influencer",
    team: [["bojoon", 41], ["macronfox", 42], ["trumpon", 43]],
    intro: ["Mi hanno regalato le chiavi di tre alberghi. Il portiere non mi fa entrare.", "Il patrimonio è mio. Il panino lo pago a rate."],
    defeat: ["La sconfitta la firmo io. Le congratulazioni vanno al beneficiario effettivo."],
    money: 2200
  },
  tesoriere: {
    id: "tesoriere", name: "IL TESORIERE FANTASMA", pal: "boss",
    team: [["telecrate", 46], ["conteblob", 48], ["berlusconix", 50]],
    intro: [
      "Nel caveau c'è un altro caveau. Nel terzo c'è la ricevuta del primo.",
      "La sdraio ha un proprietario. L'ombra risiede altrove.",
      "Tu vuoi aprire i conti. Io preferisco aprire una nuova società."
    ],
    defeat: ["Hai trovato la ricevuta. Non il tesoro: il costo di custodirlo."],
    money: 4500, reward: { itemId: "tessera", qty: 1 }
  },
  // ---- BRUXELLES: gauntlet ELEZIONI UE (post-game, dopo garante-beaten) ----
  "eu-relatore": {
    id: "eu-relatore", name: "RELATORE OMBRA", pal: "aide",
    team: [["macronfox", 44], ["bojoon", 45]],
    intro: ["Sono il RELATORE di un regolamento che nessuno leggerà.", "Ma l'emendamento 74-ter ti seppellirà."],
    defeat: ["Ritiro l'emendamento. E anche la candidatura."],
    money: 1800, reward: { itemId: "maalox", qty: 1 }
  },
  "eu-eurodeputato": {
    id: "eu-eurodeputato", name: "EURODEPUTATO ASSENTE", pal: "journalist",
    team: [["zelenskir", 45], ["ursulax", 46]],
    intro: ["Presente! ...ah no, quello era il gettone.", "Voto quel che mi dicono. Ma combatto per conto mio."],
    defeat: ["Metto la sconfitta a verbale. In seduta plenaria."],
    money: 1950
  },
  "eu-commissario": {
    id: "eu-commissario", name: "COMMISSARIO ALLA CONCORRENZA", pal: "guard",
    team: [["xipanda", 47], ["putingrad", 48]],
    intro: ["Sanziono i giganti del web prima di colazione.", "La tua campagna? Concorrenza sleale. Apro un'istruttoria."],
    defeat: ["Archivio il caso. Con una multa simbolica a me stesso."],
    money: 2100, reward: { itemId: "schedona", qty: 1 }
  },
  "eu-lobby": {
    id: "eu-lobby", name: "LOBBISTA DI RUE DE LA LOI", pal: "influencer",
    team: [["ursulax", 48], ["macronfox", 49], ["trumpon", 50]],
    intro: ["Rappresento 300 aziende e nessun elettore.", "Il tuo consenso? Lo compro all'ingrosso. O te lo strappo."],
    defeat: ["Rinegozio. Da posizioni più deboli, ammetto."],
    money: 2300
  },
  commissione: {
    id: "commissione", name: "LA COMMISSIONE", pal: "boss",
    // Asso finale con il GILET (PVE): regge più a lungo, come il Garante.
    team: [["macronfox", 52], ["putingrad", 53], ["xipanda", 53], ["ursulax", 55, undefined, "gilet"]],
    intro: [
      "Benvenuto a BRUXELLES. Io sono LA COMMISSIONE. Non mi ha votata nessuno, e infatti non rispondo a nessuno.",
      "Ho un REGOLAMENTO per ogni cosa: la curvatura delle banane, il consenso, persino i sogni.",
      "I governi nazionali vanno e vengono. Il TRILOGO, invece, è per sempre.",
      "Dimostrami che il tuo mandato regge una DIRETTIVA. In 24 lingue."
    ],
    defeat: ["Prendo atto. Convoco un tavolo tecnico. Ci rivediamo alla prossima legislatura."],
    money: 5000, reward: { itemId: "tessera", qty: 1 }
  },
  giudice1: {
    id: "giudice1", name: "GIUDICE ONORARIA", pal: "granny",
    team: [["ursulax", 24], ["calendauro", 25]],
    intro: ["La regola vale per tutti. Il tuo ufficio ha aggiunto: salvo il titolare dell'ufficio.", "Ho tolto quella riga. Ora vediamo se sai giocare senza la nota a piè di pagina."],
    defeat: ["Hai retto una regola comune. Il timbro VIP può tornare nel cassetto."],
    money: 1200
  },
  giudice2: {
    id: "giudice2", name: "GIUDICE EMERITO", pal: "aide",
    team: [["tajanide", 25], ["draghimon", 26]],
    intro: ["Tre uffici rivendicano la porta. Nessuno ha riparato la serratura.", "Il tavolo delle competenze è completo. Manca solo qualcuno competente."],
    defeat: ["Assegno la chiave a chi sa usarla. Il tavolo può smettere di riunirsi."],
    money: 1300
  },
  giudice3: {
    id: "giudice3", name: "GIUDICE SUPREMA", pal: "journalist",
    team: [["xipanda", 27], ["putingrad", 27]],
    intro: ["La tua foto della vittoria è perfetta. Chi non ti ha votato è stato tagliato via.", "Rimetto quella sedia nell'inquadratura. I diritti non dipendono dal fotografo."],
    defeat: ["C'è posto anche per chi ha perso. Puoi tenere la foto: la sedia resta qui."],
    money: 1500
  },
  garante: {
    id: "garante", name: "IL GARANTE SUPREMO", pal: "boss",
    // MATTARELLUX tiene il GILET ANTIPROIETTILE (PVE): -15% ai danni subiti,
    // così l'asso del Garante regge più a lungo (l'held item non passa in PvP).
    team: [["zelenskir", 28], ["ursulax", 29], ["draghimon", 30], ["mattarellux", 32, undefined, "gilet"]],
    intro: [
      "Il mandato ti permette di decidere. Non trasforma ogni tua decisione in una buona idea.",
      "Qui controlliamo anche il diritto di chi non ti ha votato. È la parte che non applaude mai in studio.",
      "Vorrei andare in pensione. Ma ogni volta che preparo la valigia qualcuno prepara una crisi.",
      "Vediamo se sai reggere un limite senza chiamarlo complotto."
    ],
    defeat: ["Notevole. Prendo atto. La Repubblica, pure."],
    money: 8000, reward: { itemId: "schedona", qty: 3 }
  },
  boss: {
    id: "boss", name: "PRESIDENTE OMBRA", pal: "boss",
    // NIENTE leggendari qui: MATTARELLUX e DRAGHIMON sono i reveal dell'Atto 2
    // (GARANTE SUPREMO / leggendario finale) e non vanno bruciati nel boss di Atto 1.
    // Asso mediatico TELECRATE + forza istituzionale GENERORSO, a tema "potere occulto".
    team: [["contemorfo", 18], ["xipanda", 20], ["telecrate", 22], ["generorso", 24]],
    intro: [
      "Benvenuto. Qui conserviamo tutte le promesse. Quasi tutte nella cartella BOZZE.",
      "Non decido cosa direte. Decido quale pratica arriva prima che dobbiate dirlo di nuovo.",
      "Tre medaglie ti hanno aperto il portone. Fuori c'è ancora chi aspetta una corsa del bus.",
      "Battermi ti darà una stanza. Vediamo cosa ci farai dopo la foto."
    ],
    defeat: ["La stanza è tua. Le pratiche, anche.", "Il fotografo se ne va alle sei. L'arretrato no."],
    money: 5000, reward: { itemId: "schedona", qty: 3 }
  }
};

// ---- RIVINCITE (rematch) --------------------------------------------------

// I 3 capipalestra: ribattibili SOLO post-game (flag garante-beaten), con team
// fissi lv 50-55 e MAI badge/reward duplicati (strippati in buildRematchDef).
export const GYM_LEADER_IDS = ["emittenza", "ladydirettiva", "tycoon"];

// Allenatori normali di route/città che accettano la RIVINCITA dopo un cooldown
// a passi. ESCLUSI (gating storia su defeatedTrainers/flag): boss, garante,
// giudice1/2/3, ilcapitano, rival-*, wander:*, daily:*.
export const REMATCHABLE_TRAINERS = new Set([
  "aide", "journalist", "praticante", "influencer", "lobbista", "stagista", "funzionario",
  "diplomatico", "oligarca", "bunkerista", "djpapeete", "citofonista",
  "noponte", "geometra",
  // Percorsi 2/3 + grotta2
  "opinionista", "claqueur", "telelobbista", "usciere", "protocollista",
  "eminenza", "archivista",
  // Paradiso offshore
  "commercialista", "prestanome"
]);

// Squadre fisse dei capipalestra in RIVINCITA (post-game, lv 50-55).
export const GYM_REMATCH_TEAMS: Record<string, Array<[string, number]>> = {
  emittenza: [["tajanide", 50], ["telecrate", 52], ["berlusconix", 54]],
  ladydirettiva: [["macronfox", 51], ["calendrone", 52], ["ursulax", 54]],
  tycoon: [["bojoon", 51], ["generorso", 52], ["marsrat", 53], ["trumpon", 55]]
};

export const GYM_REMATCH_INTROS: Record<string, string[]> = {
  emittenza: ["Rieccoti! Il pubblico chiede il RERUN in prima serata.", "Stavolta lo share lo decido io."],
  ladydirettiva: ["Il regolamento prevede l'appello. Articolo 1: stavolta vinco io."],
  tycoon: ["REMATCH! Il più grande della storia. Forse di sempre."]
};

export const BADGES: Record<string, { name: string; desc: string }> = {
  auditel: { name: "MEDAGLIA AUDITEL", desc: "Vinta in prima serata contro SUA EMITTENZA." },
  spread: { name: "MEDAGLIA SPREAD", desc: "Strappata a LADY DIRETTIVA, in conformità alle norme." },
  dazio: { name: "MEDAGLIA DAZIO", desc: "Sottratta a MR. TYCOON. Dazi doganali esclusi." }
};

// Cliffhanger mostrato dopo aver conquistato una medaglia: anticipa la prossima
// tappa per spingere il giocatore a continuare ("e adesso cosa mi aspetta?").
export const BADGE_TEASER: Record<string, string[]> = {
  auditel: [
    "Un dispaccio da BRUXELLES lampeggia sul tuo telefono.",
    "LADY DIRETTIVA ti ha già intestato un fascicolo a EUROTOWN, a nord.",
    "Pare regoli persino il vento. La MEDAGLIA SPREAD non si conquista: si recepisce."
  ],
  spread: [
    "Una telefonata intercontinentale: voce nasale, autostima alle stelle.",
    "MR. TYCOON ti sfida dalla GLOBAL TOWER di CAPUT MUNDI, ancora più su.",
    "Dice che sarà 'la sconfitta più bella della tua vita'. La MEDAGLIA DAZIO è lassù."
  ],
  dazio: [
    "Tre medaglie. Il PALAZZO, finora sbarrato, scricchiola.",
    "Una sagoma senza nome ti osserva dalle telecamere: il PRESIDENTE OMBRA.",
    "'Governo da trent'anni senza essere eletto', sussurra il vento. È ora di salire."
  ]
};

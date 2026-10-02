import type { MapDef } from "./types";
import { STRETTO_TILES, OFFSHORE_TILES, BRUXELLES_TILES, COMMISSIONE_TILES, HOUSE_ENTRY_A, HOUSE_ENTRY_B, BAR_ENTRY, lucaGuide } from "./factories";

export const POSTGAME_MAPS: Record<string, MapDef> = {

  stretto: {
    id: "stretto",
    name: "STRETTO DI MESSINA",
    tiles: STRETTO_TILES,
    outdoor: true,
    music: "stretto",
    warps: [
      // RITORNO A CAPUT MUNDI: UN SOLO imbarco, segnalato direttamente sulla
      // casella d'acqua a (11,14) — mare aperto, sempre
      // raggiungibile (anche senza battere IL CAPITANO: niente intrappolamento).
      // confirm: prompt SÌ/NO così non riparti per sbaglio e sai dove porta.
      {
        x: 11, y: 14, toMap: "capitale", toX: 6, toY: 21, facing: "up",
        confirm: "DARSENA: rientrare a CAPUT MUNDI?",
        markerLabel: "TRAGHETTO: CAPUT MUNDI"
      },
      // BOE del PARADISO OFFSHORE: acque aperte a est, solo post-game. Warp
      // d'acqua (pattern del molo 13-14,6): ci si arriva SOLO col TRAGHETTO.
      {
        x: 28, y: 10, toMap: "offshore", toX: 3, toY: 9, facing: "right",
        requiresFlag: "garante-beaten",
        lockedLines: ["Acque internazionali. Una motovedetta ti rimbalza.", "'Prima la CONTROFIRMA del COLLE, poi i paradisi.'"],
        markerLabel: "ROTTA: PARADISO OFFSHORE",
        confirm: "SALPARE PER IL PARADISO OFFSHORE?"
      },
      {
        x: 28, y: 11, toMap: "offshore", toX: 3, toY: 10, facing: "right",
        requiresFlag: "garante-beaten",
        lockedLines: ["Acque internazionali. Una motovedetta ti rimbalza.", "'Prima la CONTROFIRMA del COLLE, poi i paradisi.'"],
        confirm: "SALPARE PER IL PARADISO OFFSHORE?"
      },
      { x: 10, y: 2, toMap: "chiosco", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 11, y: 2, toMap: "chiosco", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 20, y: 2, toMap: "covo", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 21, y: 2, toMap: "covo", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 14, y: 4, toMap: "bar-stretto", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 15, y: 4, toMap: "bar-stretto", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.20,
    // STRETTO = endgame meme italiano. L'UNICO posto dove pescare salvinator
    // selvatico e — novità — capitanone allo stato brado (prima solo evo-tessera).
    // Un vero motivo per venire qui: roba che non trovi altrove.
    encounters: [
      { speciesId: "salvinator", weight: 30, minLv: 19, maxLv: 22 },
      { speciesId: "pontigor", weight: 18, minLv: 21, maxLv: 24 },
      { speciesId: "capitanone", weight: 12, minLv: 22, maxLv: 24 },
      { speciesId: "vannaccix", weight: 18, minLv: 20, maxLv: 22 },
      { speciesId: "muskrat", weight: 14, minLv: 21, maxLv: 23 },
      { speciesId: "contemorfo", weight: 8, minLv: 20, maxLv: 22 }
    ],
    signs: [
      {
        x: 14, y: 2,
        lines: [
          "PONTE SULLO STRETTO - CANTIERE APERTO",
          "Rendering: attraversamento in tre minuti. Cantiere: tre minuti solo per trovare la slide.",
          "IL CAPITANO aspetta A sul ponte. B annulla il briefing. Premio: TESSERA DORATA; il bar a nord apre dopo la vittoria."
        ]
      },
      {
        x: 5, y: 5,
        lines: [
          "SPIAGGIA PAPEETE BEACH",
          "Cinque remix della stessa promessa. Il fonico chiede quale versione abbia almeno una data.",
          "Le prove sulla spiaggia sono facoltative: A apre il briefing. Il bar recupera PV e PP."
        ]
      },
      {
        // Segnale informativo della DARSENA; il punto esatto di partenza è
        // evidenziato dal marker persistente sulla casella d'acqua (11,14).
        x: 11, y: 13,
        lines: [
          "DARSENA DELLO STRETTO",
          "Traghetto per CAPUT MUNDI: sali in acqua qui a fianco.",
          "Ritorno disponibile anche prima della sfida. La traversata non cura: il bar di Capitale sì."
        ]
      }
    ],
    pickups: [
      { id: "pk-s1", x: 3, y: 6, itemId: "schedona", qty: 1 },
      { id: "pk-s2", x: 26, y: 7, itemId: "spritz", qty: 1 },
      // Spostato da (13,15): coincideva con l'NPC capitano-after (post ponte-beaten).
      { id: "pk-s3", x: 25, y: 6, itemId: "mojito", qty: 1 },
      { id: "pk-s4", x: 3, y: 7, itemId: "dirVaffa", qty: 1 }
    ],
    npcs: [
      lucaGuide(
        "LO STRETTO", 18, 5,
        [
          "Il rendering arriva sull'altra sponda. Il geometra vorrebbe arrivarci con i piedi.",
          "IL CAPITANO sul ponte: A apre il briefing, B torna. Tre avversari; l'ultimo recupera PV con la CAFFETTIERA.",
          "Dopo la vittoria: bar a nord e quattro prove facoltative sulla spiaggia."
        ],
        [
          "Premio del Capitano: TESSERA DORATA. BORSA > TESSERA: scegli un tesserato. Se compatibile, confronti prima di accettare.",
          "La darsena a sudovest riporta a Capitale anche prima di vincere. Deviazione facoltativa; il Palazzo resta la missione principale."
        ]
      ),
      {
        id: "scorta-stretto", pal: "guard", x: 8, y: 5, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "L'AUTO BLU è qui pronta: ti riporto sulla terraferma quando vuoi."]
      },
      {
        id: "elevato", pal: "professor", x: 24, y: 3, facing: "down",
        lines: [
          "L'ELEVATO: ho abolito le intermediazioni. Per parlarmi serve il mio addetto alle intermediazioni.",
          "Il blog dice che qui siamo tutti alla stessa altezza. Lo leggo dal mio scoglio."
        ]
      },
      {
        id: "ingegnere", pal: "kid", x: 17, y: 5, facing: "left",
        gift: {
          itemId: "mojito", qty: 2, flag: "gift-ingegnere",
          lines: [
            "INGEGNERE: nella slide ho collaudato il ponte con un camion trasparente. Non ha pesato affatto.",
            "Per la lotta servono cure vere: 2 MOJITO. Recuperano PV, non PP. Il bar recupera entrambi."
          ]
        },
        lines: ["Il cliente chiede più realismo. Ho aggiunto una buca al rendering. Approvato senza riserve."]
      },
      {
        id: "tr-djpapeete", pal: "influencer", x: 6, y: 7, facing: "right",
        trainerId: "djpapeete",
        lines: ["La cassa dritta è l'unica linea politica che non tradisce."]
      },
      {
        id: "tr-citofonista", pal: "aide", x: 22, y: 6, facing: "left",
        trainerId: "citofonista",
        lines: ["Il citofono squilla. La risposta era già nella scaletta."]
      },
      {
        id: "tr-noponte", pal: "journalist", x: 8, y: 2, facing: "left",
        trainerId: "noponte",
        lines: ["Prima di scegliere il nastro, possiamo leggere il piano dei trasporti?"]
      },
      {
        // Presidia la banchina a (12,7), fuori dal corridoio single-file (col 14).
        // Prova volontaria sulla banchina, disponibile anche dopo il Capitano.
        id: "tr-geometra", pal: "guard", x: 12, y: 7, facing: "up",
        trainerId: "geometra",
        lines: ["Il collaudo del plastico è perfetto. Ora porto la livella sul passaggio vero."]
      },
      {
        // Presidia il corridoio del ponte. Aspetta A: lo sbarco non avvia lotte.
        // B nel briefing lascia libero il ritorno alla darsena a sud.
        id: "tr-ilcapitano", pal: "boss", x: 14, y: 12, facing: "down",
        trainerId: "ilcapitano", hideIfFlag: "ponte-beaten",
        lines: []
      },
      {
        // Post-vittoria: si gode il ponte DALLA SPIAGGIA (17,6), NON dal deck —
        // qualsiasi NPC sul corridoio single-file (col 14) murerebbe il passaggio.
        id: "capitano-after", pal: "boss", x: 17, y: 6, facing: "left", showIfFlag: "ponte-beaten",
        lines: [
          "IL CAPITANO: avevo preparato una foto in cui avevo già vinto. Il geometra dice che non è un risultato misurabile.",
          "La TESSERA DORATA almeno apre una carriera vera. BORSA > TESSERA: leggi il confronto prima di usarla."
        ]
      },
      {
        // CONTABILE PENTITO: post-game, svela la rotta per il PARADISO OFFSHORE.
        id: "contabile-pentito", pal: "aide", x: 25, y: 7, facing: "left",
        showIfFlag: "garante-beaten",
        lines: [
          "Shhh. Ero il CONTABILE di... tutti, in pratica.",
          "A est, oltre le boe, c'è un'isola che non esiste su nessun catasto: il PARADISO OFFSHORE.",
          "Col TRAGHETTO ci arrivi. Io non ti ho detto niente. Anzi, non ci siamo mai visti."
        ]
      }
    ]
  },

  // PARADISO OFFSHORE: isola post-game a est dello STRETTO (boe con
  // requiresFlag garante-beaten). Wild lv 30-45 (curva post-storia) con le prime catture selvatiche
  // di telecrate/pontimax/conteblob, bar-healer LIDO CAYMAN e il mini-boss
  // IL TESORIERE FANTASMA sull'altopiano (flag offshore-beaten).
  offshore: {
    id: "offshore",
    name: "PARADISO OFFSHORE",
    tiles: OFFSHORE_TILES,
    outdoor: true,
    music: "offshore",
    tileOverrides: { ".": "tiles/sand.png", j: "tiles/deck_wood.png" },
    buildingOverrides: { e: "tiles/offshore_bar.png", Q: "tiles/offshore_bar.png" },
    objectOverrides: { T: "tiles/offshore_palm.png" },
    warps: [
      // Punta del molo: ritorno in TRAGHETTO allo STRETTO (approdo sul pilone
      // del ponte, MAI su acqua).
      {
        x: 2, y: 9, toMap: "stretto", toX: 14, toY: 8, facing: "up",
        markerLabel: "ROTTA: STRETTO", confirm: "TORNARE ALLO STRETTO?"
      },
      { x: 2, y: 10, toMap: "stretto", toX: 14, toY: 8, facing: "up", confirm: "TORNARE ALLO STRETTO?" },
      // BAR "LIDO CAYMAN": porte sui 2 tile centrali dell'edificio.
      { x: 14, y: 4, toMap: "bar-offshore", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 15, y: 4, toMap: "bar-offshore", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      // ROTTA PER BRUXELLES: dalle boe a est (acqua) parte il traghetto per la
      // capitale UE. Contenuto end-game come l'offshore: stesso gate garante-beaten
      // (chi è qui l'ha già). Lo Sherpa informa, non blocca il passaggio.
      {
        x: 28, y: 9, toMap: "bruxelles", toX: 14, toY: 13, facing: "up",
        requiresFlag: "garante-beaten",
        lockedLines: ["Un motoscafo diplomatico attende oltre le boe.", "'Rotta per BRUXELLES: solo per chi ha già la CONTROFIRMA del COLLE.'"],
        markerLabel: "ROTTA: BRUXELLES",
        confirm: "SALPARE PER BRUXELLES?"
      },
      {
        x: 28, y: 10, toMap: "bruxelles", toX: 15, toY: 13, facing: "up",
        requiresFlag: "garante-beaten",
        lockedLines: ["Un motoscafo diplomatico attende oltre le boe.", "'Rotta per BRUXELLES: solo per chi ha già la CONTROFIRMA del COLLE.'"],
        confirm: "SALPARE PER BRUXELLES?"
      }
    ],
    encounterRate: 0.18,
    // Post-game: banda d'ingresso abbassata a lv 30-38 (raccordo con la fine storia
    // ~lv28-32) e curva crescente verso i pezzi grossi lv 42-45. Prima l'intera zona
    // partiva a lv38-45 → un muro di 8+ livelli subito dopo i titoli, dove serve
    // retention non grinding (audit gameplay). Mai oltre il level cap 55.
    encounters: [
      { speciesId: "telecrate", weight: 26, minLv: 30, maxLv: 35 },
      { speciesId: "trumpon", weight: 18, minLv: 32, maxLv: 38 },
      { speciesId: "putingrad", weight: 14, minLv: 33, maxLv: 39 },
      { speciesId: "xipanda", weight: 14, minLv: 33, maxLv: 39 },
      { speciesId: "muskrat", weight: 12, minLv: 31, maxLv: 37 },
      { speciesId: "pontimax", weight: 10, minLv: 40, maxLv: 44 },
      { speciesId: "conteblob", weight: 5, minLv: 36, maxLv: 41 },
      { speciesId: "mattarellux", weight: 1, minLv: 44, maxLv: 45 }
    ],
    signs: [
      {
        x: 6, y: 9,
        lines: [
          "PARADISO OFFSHORE",
          "La conchiglia è una sede. La sdraio un consiglio d'amministrazione.",
          "LIDO CAYMAN a nord: PV e PP gratis. Le sfide iniziano con A."
        ]
      }
    ],
    pickups: [
      { id: "pk-off-mojito", x: 10, y: 2, itemId: "mojito", qty: 1 },
      { id: "pk-off-schedona", x: 21, y: 4, itemId: "schedona", qty: 2 },
      { id: "pk-off-tessera", x: 26, y: 6, itemId: "tessera", qty: 1, hidden: true },
      { id: "pk-off-dir", x: 7, y: 5, itemId: "dirWhatever", qty: 1, hidden: true },
      // Hold item nascosto: GILET ANTIPROIETTILE, "collaudato in piazza".
      { id: "pk-off-gilet", x: 5, y: 12, itemId: "gilet", qty: 1, hidden: true }
    ],
    npcs: [
      lucaGuide(
        "L'OFFSHORE", 15, 8,
        [
          "Qui l'indirizzo della società è più importante di chi ci abita.",
          "Commercialista e Prestanome sono prove facoltative: A apre il dossier.",
          "L'erba ha nuovi candidati. Cura PV e PP al LIDO CAYMAN prima di reclutarli."
        ],
        [
          "Il TESORIERE è sull'altopiano a nord-est: sali dalla scala, leggi il dossier, scegli il leader.",
          "Le boe a est portano a BRUXELLES anche senza batterlo. La vittoria non riscrive le tue promesse."
        ]
      ),
      {
        id: "tr-commercialista", pal: "aide", x: 8, y: 10, facing: "left",
        trainerId: "commercialista",
        lines: ["La conchiglia non assume personale. Fattura soltanto il lavoro degli altri."]
      },
      {
        id: "tr-prestanome", pal: "influencer", x: 24, y: 12, facing: "left",
        trainerId: "prestanome",
        lines: ["Sul contratto sono il padrone. Sul citofono sono il fattorino."]
      },
      {
        // Il MINI-BOSS in cima all'altopiano: si dissolve dopo la sconfitta
        // (flag offshore-beaten, coerente con l'epilogo in WorldScene).
        id: "tr-tesoriere", pal: "boss", spriteSet: "offshore-treasurer", x: 24, y: 5, facing: "left",
        trainerId: "tesoriere", hideIfFlag: "offshore-beaten",
        lines: []
      },
      {
        id: "evasore-offshore", pal: "influencer", x: 12, y: 12, facing: "down",
        lines: [
          "Il dépliant diceva casa gratis. Era gratis solo il mio nome sulla società.",
          "Ho provato a dormirci. Mi hanno offerto una casella postale."
        ]
      },
      {
        id: "ambulante-offshore", pal: "barista", x: 10, y: 9, facing: "down", shop: true,
        lines: ["I fondi viaggiano. Cure, schede e oggetti restano sul banco: il preventivo viene prima della firma."]
      },
      {
        // BANDITORE della COPPA DELLE POLTRONE: compare solo post-garante.
        id: "banditore-coppa", pal: "boss", x: 18, y: 10, facing: "down",
        coppa: true, showIfFlag: "garante-beaten",
        lines: []
      },
      {
        // SHERPA UE: svela la rotta per BRUXELLES (elezioni europee). Solo
        // post-garante; parlare imposta hint-ue (isDone della quest UE).
        id: "sherpa-ue", pal: "journalist", x: 25, y: 10, facing: "left",
        showIfFlag: "garante-beaten", setFlag: "hint-ue",
        lines: [
          "SHERPA UE: le boe a est portano a BRUXELLES. Il Tesoriere non timbra il biglietto.",
          "Il CAFFÈ SCHUMAN cura PV e PP. Prima della Commissione ci sono quattro prove.",
          "Qui spostano gli utili. Là spostano gli emendamenti. Chiedi sempre dove finiscono."
        ]
      }
    ]
  },

  // BRUXELLES: capitale UE, gauntlet delle ELEZIONI EUROPEE (Round 41 narrativo).
  // End-game post garante-beaten, raggiungibile in traghetto dall'OFFSHORE. Wild
  // = roster UE (trumpon/putingrad/xipanda/macronfox/ursulax/zelenskir/bojoon) lv
  // 42-50. 4 allenatori eu-* + boss LA COMMISSIONE (in BOSS_TRAINER_IDS). Vittoria
  // sul boss = flag ue-beaten + TESSERA DORATA una-tantum.
  bruxelles: {
    id: "bruxelles",
    name: "BRUXELLES",
    tiles: BRUXELLES_TILES,
    outdoor: true,
    music: "bruxelles",
    warps: [
      // PALAZZO DELLA COMMISSIONE: porte DD centrali (12-13,4) -> interno.
      { x: 12, y: 4, toMap: "commissione", toX: 5, toY: 6, facing: "up" },
      { x: 13, y: 4, toMap: "commissione", toX: 6, toY: 6, facing: "up" },
      // Bar CAFFÈ SCHUMAN (centro cura): porte sui 2 tile centrali.
      { x: 10, y: 11, toMap: "bar-bruxelles", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 11, y: 11, toMap: "bar-bruxelles", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      // Traghetto di ritorno al PARADISO OFFSHORE: boe d'acqua a sud (approdo
      // sull'attracco offshore, mai su acqua). Serve la MN TRAGHETTO (già posseduta).
      {
        x: 14, y: 14, toMap: "offshore", toX: 27, toY: 9, facing: "left",
        markerLabel: "ROTTA: PARADISO OFFSHORE", confirm: "TORNARE AL PARADISO OFFSHORE?"
      },
      { x: 15, y: 14, toMap: "offshore", toX: 27, toY: 10, facing: "left", confirm: "TORNARE AL PARADISO OFFSHORE?" },
      // Invito Atto 3: destinazione narrativa, mai edge della world chain.
      {
        x: 19, y: 12, toMap: "campo_largo", toX: 10, toY: 16, facing: "up",
        requiresFeature: "atto3",
        requiresFlag: "ue-beaten",
        confirm: "VUOI RAGGIUNGERE IL CAMPO LARGO?"
      }
    ],
    encounterRate: 0.16,
    // Roster UE lv 42-50 (coerente con offshore 38-45 e col level cap 55). Qui le
    // specie europee trovano finalmente casa allo stato brado.
    encounters: [
      { speciesId: "macronfox", weight: 22, minLv: 42, maxLv: 46 },
      { speciesId: "bojoon", weight: 20, minLv: 42, maxLv: 45 },
      { speciesId: "zelenskir", weight: 16, minLv: 43, maxLv: 47 },
      { speciesId: "ursulax", weight: 14, minLv: 44, maxLv: 48 },
      { speciesId: "xipanda", weight: 12, minLv: 45, maxLv: 49 },
      { speciesId: "putingrad", weight: 10, minLv: 45, maxLv: 49 },
      { speciesId: "trumpon", weight: 6, minLv: 46, maxLv: 50 }
    ],
    signs: [
      {
        x: 18, y: 11,
        lines: [
          "PARLAMENTO EUROPEO - AULA PLENARIA",
          "Sessione a Bruxelles. Poi a Strasburgo. Poi di nuovo a Bruxelles.",
          "Il trasloco mensile è previsto dai Trattati. Le poltrone viaggiano in camion."
        ]
      }
    ],
    pickups: [
      { id: "pk-brux-schedona", x: 3, y: 9, itemId: "schedona", qty: 2 },
      // Tesoro nascosto nell'erba UE: DIRETTIVA rara (MULTA UE, ramo istituzione).
      { id: "pk-brux-dir", x: 24, y: 9, itemId: "dirMulta", qty: 1, hidden: true }
    ],
    npcs: [
      // ---- GAUNTLET UE (4 allenatori sul viale) ----
      {
        id: "tr-eucommissario", pal: "guard", x: 7, y: 7, facing: "right",
        trainerId: "eu-commissario", sightRange: 3,
        lines: ["Ho un portafoglio: la CONCORRENZA. E tu mi fai concorrenza sleale."]
      },
      {
        id: "tr-eulobby", pal: "influencer", x: 23, y: 7, facing: "left",
        trainerId: "eu-lobby", sightRange: 3,
        lines: ["Rue de la Loi è la mia seconda casa. La prima è il corridoio."]
      },
      {
        id: "tr-eurelatore", pal: "aide", x: 7, y: 9, facing: "right",
        trainerId: "eu-relatore", sightRange: 3,
        lines: ["Il mio emendamento ha 400 pagine di allegati. Buona lettura."]
      },
      {
        id: "tr-eurodeputato", pal: "journalist", x: 21, y: 9, facing: "left",
        trainerId: "eu-eurodeputato", sightRange: 3,
        lines: ["Presente in aula il 12% delle volte. Ma alle foto, sempre."]
      },
      // ---- NPC ambientale d'ingresso: bussola narrativa sull'attracco ----
      {
        id: "hostess-ue", pal: "granny", x: 16, y: 13, facing: "left",
        lines: [
          "HOSTESS DI PARTITO: benvenuto a BRUXELLES!",
          "Il PARLAMENTO è a sinistra, la COMMISSIONE lassù in fondo al viale.",
          "Vinci il gauntlet e prenditi la poltrona europea. In bocca al lupo."
        ]
      }
    ]
  },

  // Interno del Palazzo della Commissione: LA COMMISSIONE presidia in fondo alla
  // scalinata; l'uscita (zerbino) riporta a BRUXELLES davanti alle porte DD.
  commissione: {
    id: "commissione",
    name: "PALAZZO DELLA COMMISSIONE",
    tiles: COMMISSIONE_TILES,
    outdoor: false,
    music: "palazzo",
    warps: [
      { x: 5, y: 7, toMap: "bruxelles", toX: 12, toY: 5, facing: "down" },
      { x: 6, y: 7, toMap: "bruxelles", toX: 13, toY: 5, facing: "down" }
    ],
    signs: [
      { x: 3, y: 0, lines: ["Motto sopra la porta:", "'IN VARIETATE CONCORDIA.' Cioè: litighiamo, ma in 24 lingue."] }
    ],
    pickups: [],
    npcs: [
      lucaGuide(
        "BRUXELLES", 8, 6,
        [
          "BRUXELLES: la capitale UE delle elezioni europee.",
          "Il Parlamento trasloca ogni mese: nessuno sa mai dove sia la seduta.",
          "In varietate concordia: qui si litiga, ma in 24 lingue diverse."
        ],
        [
          "Gauntlet finale: commissari, lobbisti ed eurodeputati fino a LA COMMISSIONE.",
          "Batti il boss e ti prendi la TESSERA DORATA: sei arrivato in cima."
        ]
      ),
      {
        id: "commissione", pal: "boss", x: 5, y: 1, facing: "down",
        trainerId: "commissione", sightRange: 5, hideIfFlag: "ue-beaten",
        lines: []
      },
      {
        id: "commissione-after", pal: "boss", x: 2, y: 1, facing: "down", showIfFlag: "ue-beaten",
        lines: [
          "LA COMMISSIONE: complimenti, hai vinto le elezioni. Ora inizia il difficile.",
          "Riunioni, trilogo, comitatologia. Rimpiangerai i comizi.",
          "La poltrona è tua. Il REGOLAMENTO, però, resta mio. Come sempre."
        ]
      }
    ]
  },
};

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
      // RITORNO A CAPUT MUNDI: UN SOLO imbarco, la DARSENA segnalata dal cartello
      // blu 'W' a (11,13). Si riparte dall'acqua a (11,14) — mare aperto, sempre
      // raggiungibile (anche senza battere IL CAPITANO: niente intrappolamento).
      // confirm: prompt SÌ/NO così non riparti per sbaglio e sai dove porta.
      {
        x: 11, y: 14, toMap: "capitale", toX: 6, toY: 21, facing: "up",
        confirm: "DARSENA: rientrare a CAPUT MUNDI?"
      },
      // BOE del PARADISO OFFSHORE: acque aperte a est, solo post-game. Warp
      // d'acqua (pattern del molo 13-14,6): ci si arriva SOLO col TRAGHETTO.
      {
        x: 28, y: 10, toMap: "offshore", toX: 3, toY: 9, facing: "right",
        requiresFlag: "garante-beaten",
        lockedLines: ["Acque internazionali. Una motovedetta ti rimbalza.", "'Prima la CONTROFIRMA del COLLE, poi i paradisi.'"]
      },
      {
        x: 28, y: 11, toMap: "offshore", toX: 3, toY: 10, facing: "right",
        requiresFlag: "garante-beaten",
        lockedLines: ["Acque internazionali. Una motovedetta ti rimbalza.", "'Prima la CONTROFIRMA del COLLE, poi i paradisi.'"]
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
          "Fine lavori prevista: 1972. Poi 1985. Poi 2009. Poi 2024.",
          "Nuova stima: 'prima dei prossimi sondaggi'."
        ]
      },
      {
        x: 5, y: 5,
        lines: [
          "SPIAGGIA PAPEETE BEACH",
          "Vietato disturbare il Ministro durante la consolle.",
          "Mojito sì, mozioni no."
        ]
      },
      {
        // Cartello blu 'W' della DARSENA di ritorno: rende esplicito che da qui
        // (acqua a fianco, 11,14) si riparte per Caput Mundi.
        x: 11, y: 13,
        lines: [
          "DARSENA DELLO STRETTO",
          "Traghetto per CAPUT MUNDI: sali in acqua qui a fianco.",
          "Il CAPITANO SCHETTINO ti riporta a casa... si spera."
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
          "STRETTO DI MESSINA: spiaggia, mojito e un ponte eternamente incompiuto.",
          "Fine lavori prevista: 1972. Poi 2024. Poi... vabbè.",
          "Al Papeete c'è il Ministro alla consolle: qui si fa campagna in costume."
        ],
        [
          "Il boss IL CAPITANO ti aspetta: mojito sì, mozioni no.",
          "Zona endgame-meme: torni indietro dalla darsena quando vuoi."
        ]
      ),
      {
        id: "scorta-stretto", pal: "guard", x: 8, y: 5, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "L'AUTO BLU è qui pronta: ti riporto sulla terraferma quando vuoi."]
      },
      {
        id: "elevato", pal: "professor", x: 24, y: 3, facing: "down",
        lines: [
          "Io sono L'ELEVATO. Parlo solo dal mio scoglio sacro.",
          "Un tempo da qui si gridava una parola sola. Il mare la grida ancora.",
          "Vedi quel ponte? Lo avevo previsto nel mio blog. Nessuno legge più i blog."
        ]
      },
      {
        id: "ingegnere", pal: "kid", x: 17, y: 5, facing: "left",
        gift: {
          itemId: "mojito", qty: 2, flag: "gift-ingegnere",
          lines: [
            "INGEGNERE CAPO: il progetto è pronto dal 1969. PRONTISSIMO.",
            "Manca solo il ponte. Dettagli. Tieni: 2 MOJITO, offre l'appalto."
          ]
        },
        lines: ["Il rendering è bellissimo. Vuoi vederlo? È l'unica cosa costruita."]
      },
      {
        id: "tr-djpapeete", pal: "influencer", x: 6, y: 7, facing: "right",
        trainerId: "djpapeete", sightRange: 3,
        lines: ["La cassa dritta è l'unica linea politica che non tradisce."]
      },
      {
        id: "tr-citofonista", pal: "aide", x: 22, y: 6, facing: "left",
        trainerId: "citofonista", sightRange: 3,
        lines: ["Citofonare prima di entrare. Sempre. È il mio format."]
      },
      {
        id: "tr-noponte", pal: "journalist", x: 8, y: 2, facing: "left",
        trainerId: "noponte", sightRange: 3,
        lines: ["Protesto contro il ponte da prima che non esistesse."]
      },
      {
        // Presidia la banchina a (12,7), fuori dal corridoio single-file (col 14).
        // facing "up": il cono guarda la spiaggia (12,6)=z, (12,5)== (libere) e
        // sfida chi sbarca dal ponte. hideIfFlag ponte-beaten: sparisce col boss.
        id: "tr-geometra", pal: "guard", x: 12, y: 7, facing: "up",
        trainerId: "geometra", sightRange: 3, hideIfFlag: "ponte-beaten",
        lines: ["Il collaudo è ok: il ponte regge benissimo dove c'è."]
      },
      {
        // Cancello OBBLIGATORIO del ponte: a (14,12) guarda a SUD lungo il corridoio
        // single-file (col 14). Il cono di vista (sightRange 4) copre (14,13..15)
        // con margine: sbarcando dal mare su (14,15) il fight scatta SUBITO,
        // non è aggirabile (col 15 è tutta tralicci 'J' solidi).
        id: "tr-ilcapitano", pal: "boss", x: 14, y: 12, facing: "down",
        trainerId: "ilcapitano", sightRange: 4, hideIfFlag: "ponte-beaten",
        lines: []
      },
      {
        // Post-vittoria: si gode il ponte DALLA SPIAGGIA (17,6), NON dal deck —
        // qualsiasi NPC sul corridoio single-file (col 14) murerebbe il passaggio.
        id: "capitano-after", pal: "boss", x: 17, y: 6, facing: "left", showIfFlag: "ponte-beaten",
        lines: [
          "IL CAPITANO: lo senti? Il profumo della SICILIA. Praticamente fatta.",
          "Il ponte si farà. Intanto ho fatto il selfie dal pilone: 49 milioni di like.",
          "Anzi no, 49 e basta. Ma torneranno. Tornano sempre."
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
    warps: [
      // Punta del molo: ritorno in TRAGHETTO allo STRETTO (approdo sul pilone
      // del ponte, MAI su acqua).
      { x: 2, y: 9, toMap: "stretto", toX: 14, toY: 8, facing: "up" },
      { x: 2, y: 10, toMap: "stretto", toX: 14, toY: 8, facing: "up" },
      // BAR "LIDO CAYMAN": porte sui 2 tile centrali dell'edificio.
      { x: 14, y: 4, toMap: "bar-offshore", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 15, y: 4, toMap: "bar-offshore", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      // ROTTA PER BRUXELLES: dalle boe a est (acqua) parte il traghetto per la
      // capitale UE. Contenuto end-game come l'offshore: stesso gate garante-beaten
      // (chi è qui l'ha già), ma serve anche aver appreso la rotta (flag hint-ue).
      {
        x: 28, y: 9, toMap: "bruxelles", toX: 14, toY: 13, facing: "up",
        requiresFlag: "garante-beaten",
        lockedLines: ["Un motoscafo diplomatico attende oltre le boe.", "'Rotta per BRUXELLES: solo per chi ha già la CONTROFIRMA del COLLE.'"]
      },
      {
        x: 28, y: 10, toMap: "bruxelles", toX: 15, toY: 13, facing: "up",
        requiresFlag: "garante-beaten",
        lockedLines: ["Un motoscafo diplomatico attende oltre le boe.", "'Rotta per BRUXELLES: solo per chi ha già la CONTROFIRMA del COLLE.'"]
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
          "Capitali? Mai visti. Chiedere al mare.",
          "Pressione fiscale: 0%. Pressione dei SONDAGGI: altissima."
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
          "PARADISO OFFSHORE: un'isola che non risulta su nessun catasto.",
          "Pressione fiscale 0%, pressione dei sondaggi altissima.",
          "Evasori, prestanome e commercialisti creativi: candidati sfuggenti."
        ],
        [
          "Il mini-boss è IL TESORIERE FANTASMA: da qualche parte, tra i conti cifrati.",
          "Da qui si salpa per BRUXELLES e le elezioni europee."
        ]
      ),
      {
        id: "tr-commercialista", pal: "aide", x: 8, y: 10, facing: "left",
        trainerId: "commercialista", sightRange: 3,
        lines: ["Qui ogni scontrino diventa una nota spese. Anche il tuo."]
      },
      {
        id: "tr-prestanome", pal: "influencer", x: 24, y: 12, facing: "left",
        trainerId: "prestanome", sightRange: 3,
        lines: ["Firmo tutto io. Capire, invece, non è compito mio."]
      },
      {
        // Il MINI-BOSS in cima all'altopiano: si dissolve dopo la sconfitta
        // (flag offshore-beaten, coerente con l'epilogo in WorldScene).
        id: "tr-tesoriere", pal: "boss", x: 24, y: 5, facing: "left",
        trainerId: "tesoriere", sightRange: 3, hideIfFlag: "offshore-beaten",
        lines: []
      },
      {
        id: "evasore-offshore", pal: "influencer", x: 12, y: 12, facing: "down",
        lines: [
          "Io? In vacanza. Da undici anni fiscali consecutivi.",
          "Il mio commercialista dice che tecnicamente non esisto. Che pace."
        ]
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
          "SHERPA UE: la vera partita non è a Roma. È a BRUXELLES.",
          "Oltre quelle boe c'è un motoscafo diplomatico: rotta per la capitale UE.",
          "Si vota per il PARLAMENTO. E LA COMMISSIONE non cede la poltrona a nessuno.",
          "Prendi il traghetto a est. Porta una squadra da lv 50+: LA COMMISSIONE non perdona."
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
      { x: 14, y: 14, toMap: "offshore", toX: 27, toY: 9, facing: "left" },
      { x: 15, y: 14, toMap: "offshore", toX: 27, toY: 10, facing: "left" },
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

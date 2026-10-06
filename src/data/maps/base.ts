import type { MapDef } from "./types";
import { BORGO_TILES, ROUTE1_TILES, GROTTA1_TILES, OBLAST_MEME_TILES, ROUTE2_TILES, ROUTE3_TILES, GROTTA2_TILES, MEDIOPOLI_TILES, EUROTOWN_TILES, CAPITALE_TILES, LAB_ENTRY, GROTTA1_ENTRY, GROTTA2_ENTRY, GYMTV_ENTRY, GYMUE_ENTRY, GYMGLOBAL_ENTRY, MARKET_ENTRY, HOUSE_ENTRY_A, HOUSE_ENTRY_B, HOUSE_ENTRY_C, BAR_ENTRY, lucaGuide } from "./factories";

export const BASE_MAPS: Record<string, MapDef> = {
  borgo: {
    id: "borgo",
    lamps: [{ x: 10, y: 6 }, { x: 19, y: 6 }],
    scatter: [{kind:"flowers",density:.06},{kind:"leaflets",density:.025}],
    weather:"sereno",
    name: "BORGO URNE",
    tiles: BORGO_TILES,
    // Tre quote: la piazza in basso, la campagna sulla prima terrazza, il belvedere in cima.
    zones: [
      { name: "Belvedere", x: 0, y: 0, w: 30, h: 5 },
      { name: "Campagna", x: 0, y: 5, w: 30, h: 4 },
      { name: "Piazza", x: 0, y: 9, w: 30, h: 15 }
    ],
    outdoor: true,
    music: "borgo",
    edges: { north: { toMap: "route1", offsetX: 0 } },
    warps: [
      { x: 6, y: 12, toMap: "lab", toX: LAB_ENTRY.x, toY: LAB_ENTRY.y, facing: "up" },
      { x: 7, y: 12, toMap: "lab", toX: LAB_ENTRY.x, toY: LAB_ENTRY.y, facing: "up" },
      { x: 22, y: 12, toMap: "home", toX: HOUSE_ENTRY_C.x, toY: HOUSE_ENTRY_C.y, facing: "up" },
      { x: 23, y: 12, toMap: "home", toX: HOUSE_ENTRY_C.x, toY: HOUSE_ENTRY_C.y, facing: "up" },
      { x: 5, y: 18, toMap: "circolo", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 6, y: 18, toMap: "circolo", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 20, y: 17, toMap: "bar-borgo", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 21, y: 17, toMap: "bar-borgo", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.10,
    // BORGO = politica italiana di base. Zona-casa di salvinott e grillix.
    // Rate basso: è la città-tutorial, deve restare calma (più bassa della route).
    encounters: [
      { speciesId: "salvinott", weight: 38, minLv: 2, maxLv: 4 },
      { speciesId: "grillix", weight: 26, minLv: 3, maxLv: 5 },
      { speciesId: "tajanide", weight: 22, minLv: 3, maxLv: 5 },
      { speciesId: "contemorfo", weight: 14, minLv: 4, maxLv: 5 }
    ],
    signs: [
      {
        x: 3, y: 16,
        lines: ["BORGO URNE", "Dove ogni promessa è per sempre. O almeno fino al ballottaggio."]
      },
      {
        x: 9, y: 7,
        lines: ["CAMPAGNA ELETTORALE NORD", "Attenti ai candidati selvatici nell'erba alta.", "Dicono che nei vicoli più sperduti qualcuno nasconda 'fondi neri'... esplora gli angoli!", "Prima di MEDIOPOLI: recluta nel PERCORSO 1. Lo STUDIO 5 non offre corsi di recupero."]
      },
      {
        x: 24, y: 12,
        lines: ["CASA TUA.", "Mamma non c'è: è a un talk show a difendere il tuo operato."]
      }
    ],
    pickups: [
      { id: "pk-b1", x: 4, y: 6, itemId: "scheda", qty: 2 },
      { id: "pk-b2", x: 4, y: 22, itemId: "caffe", qty: 1 },
      { id: "pk-b3", x: 25, y: 19, itemId: "spritz", qty: 1 },
      // Tesori nascosti: angoli morti che premiano chi gironzola.
      { id: "pk-b-hide1", x: 26, y: 1, itemId: "schedona", qty: 1, hidden: true },
      { id: "pk-b-hide2", x: 2, y: 16, itemId: "caffe", qty: 2, hidden: true }
    ],
    decoratives: [
      {
        x: 20, y: 14,
        lines: [
          "FONTANA DEL CONSENSO.",
          "L'acqua sgorga solo in campagna elettorale.",
          "Negli altri mesi: \"guasto tecnico, fondi in arrivo\"."
        ]
      },
      {
        x: 11, y: 14,
        lines: ["PANCHINA DEI SAGGI.", "Qui si decideva tutto. Ora c'è solo il wifi del bar."]
      },
      {
        x: 18, y: 3,
        lines: [
          "MONUMENTO AL CANDIDATO IGNOTO.",
          "Dal belvedere si vede tutto Borgo: il laboratorio col tetto blu a sinistra, casa tua col tetto rosso a destra, il bar in basso.",
          "Sotto la targa: \"Ignoto perché non si è mai ripresentato\"."
        ]
      },
      {
        x: 11, y: 3,
        lines: ["PANCHINA DEL PANORAMA.", "Tre terrazze, due scalinate, zero ascensori. L'accessibilità è rimandata alla prossima legislatura."]
      }
    ],
    npcs: [
      {
        id: "granny", pal: "granny", x: 10, y: 17, facing: "down",
        lines: [
          "In TV basta dire: siamo una squadra. Qui serve un secondo candidato.",
          "Indeboliscilo senza KO, poi usa una SCHEDA. Reclutare dà anche esperienza."
        ]
      },
      {
        id: "egg-pensionato", pal: "granny", x: 10, y: 7, facing: "down",
        lines: [
          "Il sondaggio mi conta se rispondo. Il bus mi serve anche quando non rispondo.",
          "Al laboratorio misurano il primo. Al bar aspettano il secondo."
        ]
      },
      {
        id: "egg-complotto", pal: "aide", x: 18, y: 9, facing: "down",
        lines: [
          "Il documento è pubblico. Per trovarlo servono tre uffici e il cognome di chi lo ha caricato."
        ]
      },
      {
        id: "scorta-borgo", pal: "guard", x: 25, y: 22, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "Salta su: la macchina elettorale conosce ogni scorciatoia."]
      },
      {
        id: "tipografo", pal: "kid", x: 17, y: 15, facing: "left",
        gift: {
          itemId: "scheda", qty: 5, flag: "gift-tipografo",
          lines: [
            "Stampo su carta riciclata: le promesse hanno già fatto un mandato.",
            "5 SCHEDE: un candidato in più vale più di cinque ristampe dello stesso slogan."
          ]
        },
        lines: ["Le ristampe costano. Torna dopo le elezioni."]
      },
      {
        id: "tr-aide", pal: "aide", x: 9, y: 6, facing: "right",
        trainerId: "aide", nameplate: "DIBATTITO A",
        lines: ["Ho detto al capo che mi hai ascoltato. Non ha chiesto chi ha vinto."]
      },
      {
        id: "tr-journalist", pal: "journalist", x: 20, y: 3, facing: "left",
        trainerId: "journalist", nameplate: "INTERVISTA A",
        lines: ["Il titolo sul pieno resta in archivio. La domanda adesso la faccio prima della risposta."]
      },
      {
        // VERSIONE ESCLUSIVA: testo dinamico gestito in WorldScene.interactNpc
        // (dipende dal browserSeed: GOVERNO/OPPOSIZIONE).
        id: "sondaggista-versioni", pal: "aide", x: 16, y: 18, facing: "left", wander: false,
        lines: ["SONDAGGISTA: campiono l'erba alta, un comizio alla volta."]
      },
      lucaGuide("BORGO URNE", 17, 9,
        ["Il tipografo regala SCHEDE. Piero e Rita accettano sfide con A; puoi prepararti prima."],
        ["Recluta nel PERCORSO 1, poi chiedi la DIVISA EQUA al sindacalista di MEDIOPOLI.", "Il bar cura PV, PP e status gratis. Studio 5: prima la prova con Mara, poi la diretta."])
    ]
  },

  // PERCORSO 1: route tra BORGO (sud) e MEDIOPOLI (nord). Erba alta con incontri,
  // un LAGHETTO con isoletta-tesoro (solo col TRAGHETTO) e una GROTTA opzionale.
  route1: {
    id: "route1",
    scatter: [{kind:"tufts",density:.12},{kind:"flowers",density:.055},{kind:"stones",density:.025}],
    weather:"sereno",
    name: "PERCORSO 1",
    tiles: ROUTE1_TILES,
    // Da Borgo a Mediopoli si sale: due scarpate con la scalinata sulla strada.
    zones: [
      { name: "Altopiano dei sondaggi", x: 0, y: 0, w: 29, h: 18 },
      { name: "Valle del lago", x: 0, y: 18, w: 29, h: 10 },
      { name: "Piana di Borgo", x: 0, y: 28, w: 29, h: 3 }
    ],
    outdoor: true,
    music: "borgo",
    edges: {
      north: { toMap: "mediopoli", offsetX: 0 },
      south: { toMap: "borgo", offsetX: 0 }
    },
    warps: [
      { x: 22, y: 3, toMap: "grotta1", toX: GROTTA1_ENTRY.x, toY: GROTTA1_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.14,
    // Mix delle due città a livello intermedio: chi attraversa allena la squadra.
    encounters: [
      { speciesId: "salvinott", weight: 24, minLv: 4, maxLv: 6 },
      { speciesId: "grillix", weight: 22, minLv: 4, maxLv: 6 },
      { speciesId: "contemorfo", weight: 20, minLv: 5, maxLv: 7 },
      { speciesId: "vannaccix", weight: 18, minLv: 5, maxLv: 7 },
      { speciesId: "calendauro", weight: 16, minLv: 6, maxLv: 7 }
    ],
    signs: [
      { x: 17, y: 7, lines: ["PERCORSO 1", "Nord: MEDIOPOLI. Sud: BORGO URNE.", "L'erba alta pullula di candidati. La GROTTA a est nasconde qualcosa."] },
      { x: 17, y: 26, lines: ["PONTE SUL RIO LENTO", "Inaugurato tre volte. Collaudato mai.", "Le scarpate si scendono saltando, ma non si risalgono: per tornare su c'è il varco."] }
    ],
    pickups: [
      // The civic footbridge offers early access; otherwise return by ferry.
      { id: "pk-r1-isola", x: 6, y: 6, itemId: "schedona", qty: 2 },
      { id: "pk-r1", x: 24, y: 9, itemId: "caffe", qty: 2 },
      { id: "pk-r1-riva", x: 24, y: 24, itemId: "caffe", qty: 2 },
      { id: "pk-r1-bosco", x: 2, y: 27, itemId: "spritz", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-route1", pal: "kid", x: 20, y: 9, facing: "left",
        trainerId: "praticante", nameplate: "PRATICA A",
        lines: ["Pratica chiusa. Sono ancora in fila, ma per la macchinetta del caffè."]
      },
      {
        id: "viandante-r1", pal: "granny", x: 9, y: 8, facing: "right", nameplate: "UMARELL",
        lines: ["Tre inaugurazioni. La passerella è ancora un allegato.", "L'isola ha due SCHEDE BLINDATE. Il nastro non ti ci porta."]
      },
      {
        id: "benzinaio-r1", pal: "barista", x: 18, y: 25, facing: "left", pump: true, nameplate: "BENZINAIO", lines: ["Il prezzo cambia ogni giorno. Il cartello, ogni tanto."]
      },
      {
        id: "pescatore-r1", pal: "granny", x: 21, y: 24, facing: "left", nameplate: "PESCATORE",
        lines: ["Due anni di cantiere per attraversare tre metri d'acqua.", "Pesco in attesa dei fondi europei. Abboccano solo le promesse."]
      }
    ]
  },

  // GROTTA 1: caverna opzionale sul PERCORSO 1, con percorso vero e uscita
  // secondaria verso l'OBLAST DEL MEME.
  grotta1: {
    id: "grotta1",
    name: "GROTTA DEL CONSENSO",
    tiles: GROTTA1_TILES,
    outdoor: false,
    music: "interior",
    // Look da caverna: pavimento/uscita e muri diventano roccia (texture
    // PixelLab). L'uscita `c` (era tappeto rosso) diventa roccia: il varco è già
    // segnato dal warp, niente quadrato rosso fuori contesto nella grotta.
    tileOverrides: {
      p: "tiles/cave_floor.png", A: "tiles/cave_rock.png", c: "tiles/cave_floor.png"
    },
    warps: [
      { x: 7, y: 13, toMap: "route1", toX: 22, toY: 4, facing: "down" },
      { x: 8, y: 13, toMap: "route1", toX: 22, toY: 4, facing: "down" },
      { x: 17, y: 1, toMap: "oblast-meme", toX: 7, toY: 1, facing: "right" }
    ],
    encounterRate: 0.16,
    encounters: [
      { speciesId: "muskrat", weight: 28, minLv: 5, maxLv: 7 },
      { speciesId: "grillix", weight: 22, minLv: 5, maxLv: 7 },
      { speciesId: "contemorfo", weight: 18, minLv: 6, maxLv: 8 },
      { speciesId: "bunkerput", weight: 10, minLv: 7, maxLv: 9 }
    ],
    signs: [
      { x: 14, y: 3, lines: ["BUNKER DEL CONSENSO", "Il corridoio gira, rigira e poi sbuca in un posto freddissimo.", "Se senti un tavolo troppo lungo, non è eco."] }
    ],
    pickups: [
      { id: "pk-grotta1", x: 18, y: 2, itemId: "tessera", qty: 1 },
      { id: "pk-grotta1b", x: 2, y: 11, itemId: "spritz", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-bunkerista", pal: "aide", x: 12, y: 6, facing: "down",
        trainerId: "bunkerista", sightRange: 3,
        lines: ["Hai trovato il corridoio riservato ai meme geopolitici.", "Qui il consenso si misura in metri di tavolo."]
      }
    ]
  },

  "oblast-meme": {
    id: "oblast-meme",
    name: "OBLAST DEL MEME",
    tiles: OBLAST_MEME_TILES,
    outdoor: true,
    music: "interior",
    tileOverrides: {
      "=": "tiles/snow_path.png"
    },
    warps: [
      { x: 6, y: 1, toMap: "grotta1", toX: 16, toY: 1, facing: "left" }
    ],
    encounterRate: 0.14,
    encounters: [
      { speciesId: "putingrad", weight: 26, minLv: 9, maxLv: 11 },
      { speciesId: "bunkerput", weight: 22, minLv: 8, maxLv: 11 },
      { speciesId: "bojoon", weight: 16, minLv: 8, maxLv: 10 },
      { speciesId: "muskrat", weight: 14, minLv: 8, maxLv: 10 }
    ],
    signs: [
      { x: 18, y: 1, lines: ["OBLAST DEL MEME", "Gemellato con ogni chat dove qualcuno scrive 'fonte: fidati'."] }
    ],
    pickups: [
      { id: "pk-oblast-1", x: 4, y: 13, itemId: "schedona", qty: 1 },
      { id: "pk-oblast-hide", x: 20, y: 5, itemId: "caffe", qty: 2, hidden: true }
    ],
    npcs: [
      {
        // MEDICO DA CAMPO: l'OBLAST era un vicolo cieco senza cura né respawn
        // (rischio soft-lock: KO contro il leggendario lv10 e risveglio a Borgo).
        // Una crocerossina meme cura la squadra prima/dopo BUNKERPUT.
        id: "medico-oblast", pal: "granny", x: 5, y: 13, facing: "down", healer: true,
        lines: [
          "MEDICO DA CAMPO: questa è zona di guerre social, candidato.",
          "Siediti: ti rimetto in sesto la squadra prima del BUNKER."
        ]
      },
      {
        id: "legend-bunkerput", pal: "boss", x: 18, y: 10, facing: "left",
        legendary: {
          speciesId: "bunkerput",
          level: 10,
          flag: "legend-bunkerput-gone",
          lines: [
            "Dal fondo della taiga arriva un tavolo lunghissimo.",
            "BUNKERPUT emerge dal meme e pretende distanza di sicurezza."
          ],
          afterRunLines: ["BUNKERPUT si richiude nel bunker. Il tavolo resta apparecchiato."],
          afterGoneLines: ["Il bunker si svuota. Resta solo un eco: 'riunione da remoto'."]
        },
        lines: ["Il bunker è chiuso. Dentro qualcuno misura la stanza col righello."]
      }
    ]
  },

  mediopoli: {
    id: "mediopoli",
    lamps: [{ x: 11, y: 5 }, { x: 18, y: 5 }],
    groundMaterials: { "=": "asphalt" },
    name: "MEDIOPOLI",
    tiles: MEDIOPOLI_TILES,
    // La città bassa con i suoi studi e, su una gradinata alta due righe, la collina dello studio televisivo.
    zones: [
      { name: "Collina della TV", x: 0, y: 0, w: 30, h: 8 },
      { name: "Piazza dei Salotti", x: 0, y: 8, w: 30, h: 13 }
    ],
    outdoor: true,
    music: "mediopoli",
    edges: {
      north: {
        toMap: "route2", offsetX: 0, requiresBadges: 1,
        lockedLines: [
          "La strada per EUROTOWN è presidiata dai gazebo.",
          "\"Senza la MEDAGLIA AUDITEL non si passa: prima conquista la palestra di MEDIOPOLI.\""
        ]
      },
      south: { toMap: "route1", offsetX: 0 }
    },
    warps: [
      { x: 7, y: 10, toMap: "gymtv", toX: GYMTV_ENTRY.x, toY: GYMTV_ENTRY.y, facing: "up" },
      { x: 6, y: 10, toMap: "gymtv", toX: GYMTV_ENTRY.x, toY: GYMTV_ENTRY.y, facing: "up" },
      { x: 21, y: 10, toMap: "market1", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 22, y: 10, toMap: "market1", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 5, y: 18, toMap: "attico", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 6, y: 18, toMap: "attico", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 22, y: 16, toMap: "redazione", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 23, y: 16, toMap: "redazione", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 6, y: 15, toMap: "bar-medio", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 7, y: 15, toMap: "bar-medio", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.18,
    // MEDIOPOLI = media/talk-show + destra italiana. Zona-casa di vannaccix e
    // calendauro. contemorfo qui è la versione più alta di livello (come in
    // Pokémon la stessa specie ricompare più forte nella zona avanzata).
    encounters: [
      { speciesId: "vannaccix", weight: 30, minLv: 8, maxLv: 11 },
      { speciesId: "calendauro", weight: 24, minLv: 9, maxLv: 12 },
      { speciesId: "mediocrate", weight: 22, minLv: 9, maxLv: 12 },
      { speciesId: "contemorfo", weight: 14, minLv: 9, maxLv: 12 },
      { speciesId: "macronfox", weight: 10, minLv: 10, maxLv: 12 }
    ],
    signs: [
      {
        x: 6, y: 5,
        lines: ["MEDIOPOLI", "La città che decide cosa pensi. In onda dal 1980."]
      },
      {
        x: 24, y: 18,
        lines: ["PALESTRA TV: STUDIO 5", "Capopalestra: SUA EMITTENZA.", "Medaglia in palio: AUDITEL."]
      }
    ],
    pickups: [
      { id: "pk-m1", x: 3, y: 17, itemId: "maalox", qty: 1 },
      { id: "pk-m2", x: 26, y: 16, itemId: "schedona", qty: 1 },
      { id: "pk-m-hide1", x: 26, y: 1, itemId: "spritz", qty: 2, hidden: true },
      { id: "pk-m-hide2", x: 2, y: 19, itemId: "maalox", qty: 1, hidden: true }
    ],
    decoratives: [
      {
        x: 9, y: 12,
        lines: ["FONTANA DELLO SHARE.", "Più ascolti fai, più zampilla. Stasera: replica."]
      },
      {
        x: 20, y: 12,
        lines: ["STATUA DEL GRANDE COMUNICATORE.", "Dito puntato verso il futuro. O verso la telecamera."]
      }
    ],
    npcs: [
      lucaGuide(
        "MEDIOPOLI", 15, 10,
        [
          "Mara prepara lo studio. Il conduttore prepara la copertina.",
          "I selvatici della città sono più forti: il PERCORSO 1 serve a reclutare prima della diretta."
        ],
        [
          "Il sindacalista offre la DIVISA EQUA: metà EXP anche alla panchina viva.",
          "Studio 5: prova Mara, curati al bar e torna per SUA EMITTENZA. AUDITEL apre EUROTOWN."
        ]
      ),
      {
        id: "scorta-medio", pal: "guard", x: 24, y: 19, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU:", "Destinazioni rapide, sirena inclusa, spiegazioni escluse."]
      },
      {
        id: "tr-influencer", pal: "influencer", x: 10, y: 12, facing: "right",
        trainerId: "influencer", nameplate: "SPONSOR A",
        lines: ["Ho reso visibile la scritta sponsor. Il marchio ha chiesto di togliere il video."]
      },
      {
        id: "fan-tv", pal: "granny", x: 18, y: 14, facing: "left",
        lines: [
          "Mara ti lascia provare prima della diretta. Il conduttore ti lascia spiegare dopo la pubblicità."
        ]
      },
      {
        id: "sindacalista", dialogueName: "Sindacalista", pal: "barista", x: 15, y: 5, facing: "down",
        gift: {
          itemId: "divisa", qty: 1, flag: "gift-divisa",
          lines: [
            "Il capo chiama squadra chi gli regge il fondale. Noi abbiamo chiesto una quota.",
            "La Divisa Equa dà metà esperienza anche alle riserve vive. Il capofila conserva tutta la sua quota.",
            "Vale per KO e catture. Il nuovo arrivato comincia dal prossimo incontro."
          ]
        },
        lines: ["La Divisa Equa funziona da sola. I compagni KO non crescono: il bar cura anche le riserve."]
      },
      {
        id: "rider-monopattino", pal: "kid", x: 15, y: 16, facing: "down",
        vehicleGift: {
          vehicle: "monopattino", flag: "gift-monopattino",
          lines: [
            "Rider in sciopero: ho mollato le consegne, mi tengo il mezzo.",
            "Tieni il MONOPATTINO: sfreccia in città, tanto le piste ciclabili non le useremo mai."
          ]
        },
        lines: ["Il MONOPATTINO te l'ho già dato. Pedala, anzi... spingi."]
      },
      {
        id: "talkshow-fan", pal: "journalist", x: 3, y: 5, facing: "right",
        lines: [
          "La regia voleva un'opinione diversa. Mi ha dato la risposta per essere sicura."
        ]
      }
    ]
  },

  // PERCORSO 2: route tra MEDIOPOLI (sud) e EUROTOWN (nord). Tema talk show:
  // il LAGHETTO DELL'AUDITEL con isoletta-tesoro (solo TRAGHETTO), erba alta
  // e tre professionisti del salotto televisivo. Il gate a 1 medaglia resta
  // sull'edge nord di MEDIOPOLI (mai lato route: niente trappole).
  route2: {
    id: "route2",
    weather:"nebbia",
    name: "PERCORSO 2",
    tiles: ROUTE2_TILES,
    zones: [
      { name: "Colline del talk show", x: 0, y: 0, w: 29, h: 14 },
      { name: "Lungolago dell'Auditel", x: 0, y: 14, w: 29, h: 15 },
      { name: "Piana di Mediopoli", x: 0, y: 29, w: 29, h: 3 }
    ],
    outdoor: true,
    music: "mediopoli",
    edges: {
      north: { toMap: "eurotown", offsetX: 0 },
      south: { toMap: "mediopoli", offsetX: 0 }
    },
    warps: [],
    encounterRate: 0.14,
    // Ponte tra MEDIOPOLI (8-12) ed EUROTOWN (12-15): media italiani in uscita,
    // primi leader europei in anteprima.
    encounters: [
      { speciesId: "mediocrate", weight: 26, minLv: 12, maxLv: 14 },
      { speciesId: "vannaccix", weight: 22, minLv: 12, maxLv: 14 },
      { speciesId: "calendauro", weight: 18, minLv: 12, maxLv: 15 },
      { speciesId: "macronfox", weight: 18, minLv: 13, maxLv: 15 },
      { speciesId: "bojoon", weight: 16, minLv: 13, maxLv: 15 },
      // LINEA VERDE (Round 40): il germoglio attivista spunta raro tra i cortei.
      { speciesId: "verdolino", weight: 8, minLv: 11, maxLv: 13 }
    ],
    signs: [
      {
        x: 9, y: 6,
        lines: ["LAGHETTO DELL'AUDITEL", "Il pubblico è spontaneo. Gli applausi hanno un capoturno.", "L'isola si raggiunge col TRAGHETTO."]
      },
      {
        x: 17, y: 14,
        lines: ["PERCORSO 2", "Nord: EUROTOWN. Sud: MEDIOPOLI.", "Gli ospiti sfidano con A. Il bar di EUROTOWN recupera anche i PP."]
      },
      {
        x: 14, y: 22,
        lines: ["LAGO DEL SECONDO TURNO", "Qui si pesca in diretta. I pesci sono tutti ospiti fissi.", "Il molo porta all'isolotto. Chi sale sul palco viene ripreso."]
      }
    ],
    pickups: [
      // Tesoro sull'isoletta del LAGHETTO: ci si arriva solo col TRAGHETTO.
      { id: "pk-r2-isola", x: 5, y: 6, itemId: "schedona", qty: 2 },
      { id: "pk-r2", x: 24, y: 10, itemId: "maalox", qty: 1 },
      { id: "pk-r2-hide", x: 5, y: 12, itemId: "spritz", qty: 2, hidden: true },
      { id: "pk-r2-lago", x: 6, y: 22, itemId: "caffe", qty: 2 },
      // Pickup raro Round 39: un hold item gratis per far scoprire la meccanica.
      { id: "pk-r2-santino", x: 23, y: 10, itemId: "santino", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-claqueur", pal: "influencer", x: 19, y: 5, facing: "left",
        trainerId: "claqueur", nameplate: "APPLAUSI A",
        lines: ["Hanno applaudito a luce spenta. Non era a budget."]
      },
      {
        id: "tr-telelobbista", pal: "aide", x: 6, y: 20, facing: "right",
        trainerId: "telelobbista", nameplate: "CONFRONTO A",
        lines: ["Il pubblico risponde. Non è nel pacchetto."]
      },
      {
        id: "tr-opinionista", pal: "journalist", x: 16, y: 12, facing: "right",
        trainerId: "opinionista", nameplate: "PARERE A",
        lines: ["La prossima opinione parte dai fatti."]
      },
      {
        id: "spettatore-r2", pal: "granny", x: 22, y: 17, facing: "down",
        lines: ["Ho rifiutato il sondaggio. Mi hanno contato tra gli indecisi: fa più grafico che assente."]
      },
      {
        id: "cameraman-r2", pal: "journalist", x: 18, y: 26, facing: "left", nameplate: "TROUPE",
        lines: ["Riprendo il lago: fa più ascolti delle idee.", "Se passi in campo, saluta: il montaggio ti taglia comunque."]
      }
    ]
  },

  eurotown: {
    id: "eurotown",
    name: "EUROTOWN",
    tiles: EUROTOWN_TILES,
    // La terrazza delle istituzioni (palestra e mercato) sta in alto, raggiunta da una scalinata larga otto caselle.
    zones: [
      { name: "Terrazza d'Europa", x: 0, y: 0, w: 30, h: 7 },
      { name: "Strada dei Vertici", x: 0, y: 7, w: 30, h: 9 }
    ],
    outdoor: true,
    music: "eurotown",
    edges: {
      north: {
        toMap: "route3", offsetX: 0, requiresBadges: 2,
        lockedLines: [
          "Il confine di CAPUT MUNDI è blindato da transenne istituzionali.",
          "\"Per accedere serve la MEDAGLIA SPREAD: torna quando avrai vinto a EUROTOWN.\""
        ]
      },
      south: { toMap: "route2", offsetX: 0 }
    },
    warps: [
      { x: 7, y: 5, toMap: "gymue", toX: GYMUE_ENTRY.x, toY: GYMUE_ENTRY.y, facing: "up" },
      { x: 6, y: 5, toMap: "gymue", toX: GYMUE_ENTRY.x, toY: GYMUE_ENTRY.y, facing: "up" },
      { x: 21, y: 5, toMap: "market2", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 22, y: 5, toMap: "market2", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 5, y: 9, toMap: "lobbystudio", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 6, y: 9, toMap: "lobbystudio", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 21, y: 9, toMap: "bistrot", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 22, y: 9, toMap: "bistrot", toX: HOUSE_ENTRY_B.x, toY: HOUSE_ENTRY_B.y, facing: "up" },
      { x: 7, y: 12, toMap: "bar-euro", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 8, y: 12, toMap: "bar-euro", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.18,
    // EUROTOWN = leader europei/esteri. Zona-casa di macronfox, zelenskir,
    // bojoon (UK), ursulax. draghimon tolto dal wild: resta SOLO il leggendario
    // gift al COLLE, così l'evento riacquista valore.
    encounters: [
      { speciesId: "macronfox", weight: 28, minLv: 12, maxLv: 15 },
      { speciesId: "zelenskir", weight: 24, minLv: 13, maxLv: 15 },
      { speciesId: "bojoon", weight: 20, minLv: 12, maxLv: 15 },
      { speciesId: "ursulax", weight: 16, minLv: 14, maxLv: 15 },
      { speciesId: "calendauro", weight: 12, minLv: 13, maxLv: 15 }
    ],
    signs: [
      {
        // Spostato da (21,11): lì coincideva con l'NPC pensionato-euro, che lo
        // shadowava (interact() controlla gli NPC prima dei cartelli) → cartello
        // illeggibile. (22,11) è erba libera, accessibile da (23,11)/(22,12).
        x: 22, y: 11,
        lines: ["EUROTOWN", "Lo sportello è aperto. La clausola piccola pure.", "PALESTRA UE: SPREAD. Hans offre una verifica facoltativa."]
      }
    ],
    pickups: [
      { id: "pk-e1", x: 26, y: 2, itemId: "spritz", qty: 1 },
      { id: "pk-e2", x: 2, y: 2, itemId: "dirGreen", qty: 1 },
      { id: "pk-e-hide1", x: 26, y: 14, itemId: "dirBunga", qty: 1, hidden: true },
      { id: "pk-e-hide2", x: 2, y: 14, itemId: "mojito", qty: 1, hidden: true }
    ],
    decoratives: [
      {
        x: 6, y: 14,
        lines: ["FONTANA DELL'EURO.", "Desiderio gratis: include l'accettazione di quelli dello sponsor."]
      },
      {
        x: 23, y: 14,
        lines: ["STATUA DEL PADRE FONDATORE.", "La targa dice: persona libera. Il chiosco chiede i dati per leggerla."]
      }
    ],
    npcs: [
      lucaGuide(
        "EUROTOWN", 15, 8,
        [
          "Hans verifica la squadra. Il consulente fattura la verifica.",
          "Le DIRETTIVE insegnano mosse per tipo; non si consumano. Controlla resistenze e PP."
        ],
        [
          "PALESTRA UE: Hans è facoltativo. Prima di LADY DIRETTIVA puoi uscire e curarti al bar.",
          "SPREAD apre CAPUT MUNDI. Il boss abbassa le statistiche: il dossier spiega le difese."
        ]
      ),
      {
        id: "scorta-euro", pal: "guard", x: 24, y: 14, facing: "left", transport: true,
        lines: ["SCORTA AUTO BLU: tragitto pubblico. Attesa a carico di chi va a piedi."]
      },
      {
        id: "tr-lobbista", pal: "aide", x: 9, y: 13, facing: "up",
        trainerId: "lobbista", nameplate: "CLAUSOLE A",
        lines: ["Ho tolto il consenso precompilato. Adesso qualcuno può dirmi di no."]
      },
      {
        id: "fan-ue", pal: "journalist", x: 18, y: 8, facing: "left",
        lines: [
          "START nel briefing sceglie il leader. Il tipo conta più del volume."
        ]
      },
      {
        id: "euroburocrate", pal: "aide", x: 3, y: 11, facing: "right",
        lines: [
          "Ho eliminato una firma. Il consulente vuole tre incontri per certificarlo."
        ]
      },
      {
        id: "pensionato-euro", pal: "granny", x: 21, y: 11, facing: "down",
        lines: [
          "Rifiuta tutto era in grigio. Ho premuto lo stesso: il sito mi ha chiesto perché fossi così negativo."
        ]
      }
    ]
  },

  // PERCORSO 3: route tra EUROTOWN (sud) e CAPUT MUNDI (nord). Tema potere e
  // burocrazia: checkpoint di recinzioni a metà strada, funzionari in agguato
  // e la bocca della GROTTA2 "ARCHIVIO DI STATO" a nord-est (pattern route1).
  // Il gate a 2 medaglie resta sull'edge nord di EUROTOWN.
  route3: {
    id: "route3",
    weather:"pioggia",
    name: "PERCORSO 3",
    tiles: ROUTE3_TILES,
    zones: [
      { name: "Cava del Protocollo", x: 0, y: 0, w: 29, h: 21 },
      { name: "Valle del fiume", x: 0, y: 21, w: 29, h: 8 },
      { name: "Piana di Eurotown", x: 0, y: 29, w: 29, h: 3 }
    ],
    outdoor: true,
    music: "eurotown",
    edges: {
      north: { toMap: "capitale", offsetX: 0 },
      south: { toMap: "eurotown", offsetX: 0 }
    },
    warps: [
      { x: 22, y: 3, toMap: "grotta2", toX: GROTTA2_ENTRY.x, toY: GROTTA2_ENTRY.y, facing: "up" }
    ],
    encounterRate: 0.14,
    // Ponte tra EUROTOWN (12-15) e CAPUT MUNDI (15-18): istituzioni europee in
    // uscita, potenze mondiali in anteprima.
    encounters: [
      { speciesId: "ursulax", weight: 24, minLv: 16, maxLv: 18 },
      { speciesId: "muskrat", weight: 20, minLv: 17, maxLv: 19 },
      { speciesId: "zelenskir", weight: 20, minLv: 16, maxLv: 18 },
      { speciesId: "macronfox", weight: 18, minLv: 16, maxLv: 18 },
      { speciesId: "mediocrate", weight: 18, minLv: 17, maxLv: 19 },
      // LINEA VERDE (Round 40): il germoglio già cresciuto pattuglia il Percorso 3.
      { speciesId: "verdolino", weight: 8, minLv: 16, maxLv: 17 },
      { speciesId: "ecoverdon", weight: 4, minLv: 18, maxLv: 19 }
    ],
    signs: [
      {
        x: 17, y: 2,
        lines: ["PERCORSO 3", "Nord: CAPUT MUNDI. Sud: EUROTOWN.", "Sfide con A. ARCHIVIO a est: DIRETTIVA DECRETO. Il bar è in città."]
      },
      {
        x: 17, y: 28,
        lines: ["PONTE DELLA CONCERTAZIONE", "Quattro tavoli, sei sigle, un solo cantiere.", "Le scarpate si scendono saltando. Per tornare su c'è la scalinata a ovest."]
      }
    ],
    pickups: [
      { id: "pk-r3", x: 4, y: 14, itemId: "schedona", qty: 2 },
      { id: "pk-r3-ponte", x: 24, y: 24, itemId: "caffe", qty: 2 },
      { id: "pk-r3-hide", x: 25, y: 13, itemId: "caffe", qty: 2, hidden: true },
      // Pickup raro Round 39: hold item speciale nascosto sul percorso.
      { id: "pk-r3-agenda", x: 6, y: 8, itemId: "agendarossa", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-usciere", pal: "guard", x: 11, y: 6, facing: "right",
        trainerId: "usciere", nameplate: "AGENDA A",
        lines: ["Ti avevo messo in attesa. È diverso dal riceverti."]
      },
      {
        id: "tr-protocollista", pal: "granny", x: 12, y: 12, facing: "right",
        trainerId: "protocollista", nameplate: "AUDIT A",
        lines: ["L'allegato indica chi paga. Ecco perché non lo proiettavano."]
      },
      {
        id: "tr-eminenza", pal: "aide", x: 19, y: 12, facing: "right",
        trainerId: "eminenza", nameplate: "CONTATTI A",
        lines: ["Abbiamo pubblicato gli incontri. Le cene restano conviviali."]
      },
      {
        id: "benzinaio-r3", pal: "barista", x: 4, y: 17, facing: "right", pump: true, nameplate: "BENZINAIO",
        lines: ["Alla pompa è arrivato il cartello nuovo. Lo sconto no.", "Il pendolare ha un turno alle sei. Il comunicato esce alle nove."]
      },
      {
        id: "geologa-r3", pal: "aide", x: 19, y: 6, facing: "down", nameplate: "GEOLOGA",
        lines: ["Ho sondato il terreno tre volte. La roccia è stabile.", "A franare, ogni inverno, è l'impegno di spesa."]
      },
      {
        id: "cavatore-r3", pal: "kid", x: 9, y: 13, facing: "down", nameplate: "CAVATORE",
        lines: ["Estraggo sabbia dal 2009. Il progetto prevedeva ghiaia.", "La ghiaia è prevista dal progetto successivo."]
      },
      {
        id: "camionista-r3", pal: "guard", x: 21, y: 24, facing: "left", nameplate: "CAMIONISTA",
        lines: ["Il ponte nuovo regge. Le accise no.", "Con questo prezzo al litro, il viaggio costa più della merce."]
      }
    ]
  },

  // GROTTA 2 "ARCHIVIO DI STATO": caverna opzionale sul PERCORSO 3, un'unica
  // uscita a sud. Scaffali-dossier, un archivista permaloso e la DIRETTIVA:
  // DECRETO sepolta in fondo all'archivio.
  grotta2: {
    id: "grotta2",
    name: "ARCHIVIO DI STATO",
    tiles: GROTTA2_TILES,
    outdoor: false,
    music: "interior",
    // Look da caverna come grotta1: pavimento/uscita e muri diventano roccia.
    tileOverrides: {
      p: "tiles/cave_floor.png", A: "tiles/cave_rock.png", c: "tiles/cave_floor.png"
    },
    warps: [
      { x: 8, y: 13, toMap: "route3", toX: 22, toY: 4, facing: "down" },
      { x: 9, y: 13, toMap: "route3", toX: 22, toY: 4, facing: "down" }
    ],
    encounterRate: 0.16,
    encounters: [
      { speciesId: "muskrat", weight: 28, minLv: 16, maxLv: 18 },
      { speciesId: "contemorfo", weight: 22, minLv: 16, maxLv: 18 },
      { speciesId: "calendauro", weight: 18, minLv: 17, maxLv: 19 },
      { speciesId: "putingrad", weight: 12, minLv: 18, maxLv: 19 }
    ],
    signs: [
      { x: 14, y: 3, lines: ["ARCHIVIO DI STATO", "DECRETO in fondo a destra. Archivista facoltativo: A per la sfida."] }
    ],
    pickups: [
      { id: "pk-g2", x: 17, y: 2, itemId: "dirDecreto", qty: 1 },
      { id: "pk-g2-hide", x: 2, y: 11, itemId: "mojito", qty: 1, hidden: true }
    ],
    npcs: [
      {
        id: "tr-archivista", pal: "aide", x: 10, y: 6, facing: "down",
        trainerId: "archivista", nameplate: "ACCESSO A",
        lines: ["Il documento adesso si trova. La segretezza era tutta nel catalogo."]
      }
    ]
  },

  capitale: {
    id: "capitale",
    groundMaterials: { "=": "asphalt" },
    weather:"afa",
    name: "CAPUT MUNDI",
    tiles: CAPITALE_TILES,
    // Il Palazzo sta in cima a una gradinata: il viale resta in basso con palestra, casinò e porto.
    zones: [
      { name: "Colle del Palazzo", x: 0, y: 0, w: 30, h: 7 },
      { name: "Viale dei Poteri", x: 0, y: 7, w: 30, h: 13 },
      { name: "Porto", x: 0, y: 20, w: 30, h: 5 }
    ],
    outdoor: true,
    music: "capitale",
    edges: { south: { toMap: "route3", offsetX: 0 } },
    warps: [
      { x: 7, y: 11, toMap: "gymglobal", toX: GYMGLOBAL_ENTRY.x, toY: GYMGLOBAL_ENTRY.y, facing: "up" },
      { x: 6, y: 11, toMap: "gymglobal", toX: GYMGLOBAL_ENTRY.x, toY: GYMGLOBAL_ENTRY.y, facing: "up" },
      { x: 22, y: 11, toMap: "casino", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 21, y: 11, toMap: "casino", toX: MARKET_ENTRY.x, toY: MARKET_ENTRY.y, facing: "up" },
      { x: 23, y: 7, toMap: "bar-cap", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 24, y: 7, toMap: "bar-cap", toX: BAR_ENTRY.x, toY: BAR_ENTRY.y, facing: "up" },
      { x: 4, y: 18, toMap: "salotto", toX: HOUSE_ENTRY_C.x, toY: HOUSE_ENTRY_C.y, facing: "up" },
      { x: 5, y: 18, toMap: "salotto", toX: HOUSE_ENTRY_C.x, toY: HOUSE_ENTRY_C.y, facing: "up" },
      { x: 24, y: 18, toMap: "retroscena", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      { x: 25, y: 18, toMap: "retroscena", toX: HOUSE_ENTRY_A.x, toY: HOUSE_ENTRY_A.y, facing: "up" },
      {
        // IMBARCO per la SICILIA: sulla PUNTA del MOLO di legno del PORTO (12,21),
        // ultima cella calpestabile prima della darsena d'acqua. Ci arrivi a piedi
        // camminando sul molo, quindi il gate "serve il TRAGHETTO" (lockedLines) si
        // vede davvero; col TRAGHETTO scendi in acqua e approdi DIRETTAMENTE a nord
        // dello STRETTO (13,6) — niente mappa "mare" intermedia. Il MARINAIO accanto
        // regala la MN a 3 medaglie.
        // Arrivo NAVALE: si approda in ACQUA sul bordo sud dello Stretto (14,16) col
        // TRAGHETTO già attivo (syncFerryVehicle: onWater + flag → vehicle=traghetto)
        // e si NAVIGA a nord fino al porto — niente più spawn "in mezzo alla mappa".
        x: 6, y: 21, toMap: "stretto", toX: 14, toY: 16, facing: "up",
        requiresFlag: "veh-traghetto",
        lockedLines: ["Il MOLO è chiuso.", "Il MARINAIO non ti fa salire senza il TRAGHETTO."]
      },
      {
        x: 14, y: 5, toMap: "palazzo", toX: 5, toY: 6, facing: "up",
        requiresBadges: 3,
        lockedLines: ["Il portone è sbarrato.", "Un cartello: 'SI RICEVE SOLO CON 3 MEDAGLIE.'"]
      },
      {
        x: 15, y: 5, toMap: "palazzo", toX: 6, toY: 6, facing: "up",
        requiresBadges: 3,
        lockedLines: ["Il portone è sbarrato.", "Un cartello: 'SI RICEVE SOLO CON 3 MEDAGLIE.'"]
      }
    ],
    encounterRate: 0.20,
    // CAPUT MUNDI = potenze mondiali. La "vetrina": 4 esclusive (putingrad,
    // xipanda, trumpon e il rarissimo mattarellux) + muskrat zona-casa.
    encounters: [
      { speciesId: "muskrat", weight: 24, minLv: 15, maxLv: 18 },
      { speciesId: "putingrad", weight: 16, minLv: 18, maxLv: 18 },
      { speciesId: "xipanda", weight: 16, minLv: 18, maxLv: 18 },
      { speciesId: "trumpon", weight: 14, minLv: 18, maxLv: 18 },
      { speciesId: "zelenskir", weight: 14, minLv: 16, maxLv: 18 },
      { speciesId: "mattarellux", weight: 1, minLv: 20, maxLv: 20 }
    ],
    signs: [
      {
        x: 7, y: 19,
        lines: ["CAPUT MUNDI", "La foto del vertice costa meno del conto. La pubblicano per prima."]
      },
      {
        // Accanto alla porta PALESTRA (6,11), non più scambiata col casinò.
        x: 7, y: 12,
        lines: ["PALESTRA GLOBAL TOWER", "Capopalestra: MR. TYCOON.", "DAZIO: tre avversari. Le prove sono facoltative; puoi tornare al bar."]
      },
      {
        // Accanto alla porta del CASINÒ (21,11). Il tetto bordeaux-oro con "$"
        // ora lo distingue dalle case; il cartello conferma l'ingresso.
        x: 22, y: 12,
        lines: ["CASINÒ DI PALAZZO", "Cerca il TETTO ROSSO E ORO col simbolo $.", "Dentro: SLOT DEL CONSENSO e BUNGA BUNGA CLUB."]
      },
      {
        // Cartello del PORTO (accanto al molo di legno, tile `s` a 5,19).
        x: 9, y: 19,
        lines: ["PORTO: TRAGHETTO CON TRE MEDAGLIE.", "Il pinguino rifiuta il dazio. Chiedono una firma: non ha pollici."]
      },
      {
        // Cartello della SFIDA DEL GIORNO, accanto all'OPINIONISTA in piazza.
        x: 12, y: 13,
        lines: ["SFIDA DEL GIORNO", "Un panel nuovo ogni 24 ore. Vince chi resta in onda.", "Premio quotidiano: fondi e rifornimenti. Una sola diretta al giorno."]
      }
    ],
    pickups: [
      { id: "pk-c1", x: 25, y: 8, itemId: "schedona", qty: 2 },
      // Spostato da (4,18): era sulla stessa cella del warp SALOTTO (porta) → conflitto.
      { id: "pk-c2", x: 3, y: 19, itemId: "spritz", qty: 1 },
      { id: "pk-c3", x: 4, y: 2, itemId: "dirWhatever", qty: 1 },
      // Tesoro grosso nella capitale: la TESSERA DORATA per evolvere.
      { id: "pk-c-hide1", x: 2, y: 8, itemId: "tessera", qty: 1, hidden: true },
      { id: "pk-c-hide2", x: 26, y: 14, itemId: "mojito", qty: 1, hidden: true },
      // Hold item nascosto in città late: la CAFFETTIERA (cura a ogni turno).
      { id: "pk-c-hide3", x: 26, y: 10, itemId: "caffettiera", qty: 1, hidden: true }
    ],
    decoratives: [
      {
        x: 9, y: 13,
        lines: ["FONTANA MONUMENTALE.", "Il getto è pubblico. La foto sponsorizzata copre il rubinetto rotto."]
      },
      {
        x: 20, y: 13,
        lines: ["STATUA EQUESTRE.", "Chi pulisce il cavallo non entra nell'inquadratura del leader."]
      }
    ],
    npcs: [
      lucaGuide(
        "CAPUT MUNDI", 15, 12,
        [
          "CAPUT MUNDI: GLOBAL TOWER, tetto blu a ovest. Il bar cura; l'ambulante rifornisce.",
          "Tycoon punta sul danno. Leggi il dossier, prepara tipi e mosse, conserva le cure."
        ],
        [
          "DAZIO apre IL PALAZZO. Con tre medaglie il marinaio dà il TRAGHETTO."
        ]
      ),
      {
        id: "scorta-cap", pal: "guard", x: 20, y: 18, facing: "right", transport: true,
        lines: [
          "SCORTA: città già visitate. Per la Sicilia serve il TRAGHETTO al porto."
        ]
      },
      {
        id: "corazziere", pal: "guard", x: 12, y: 6, facing: "right",
        lines: [
          "PALAZZO: servono AUDITEL, SPREAD e DAZIO. Il pass non è un invito a cena."
        ]
      },
      {
        // MARINAIO del PORTO: sta sulla strada del molo (4,19, guarda il molo/cartello
        // a destra), regala il TRAGHETTO a 3 medaglie. Dalla punta del molo (6,21) si
        // salpa e si approda DIRETTAMENTE allo STRETTO: la traversata è una continuazione.
        id: "marinaio-cap", pal: "guard", x: 4, y: 19, facing: "right",
        vehicleGift: {
          vehicle: "traghetto", flag: "veh-traghetto", requiresBadges: 3,
          lines: [
            "TRE MEDAGLIE: TRAGHETTO CONSEGNATO. Cammina sull'acqua per imbarcarti; sulla terra scendi automaticamente.",
            "Il molo a sud porta allo STRETTO. Deviazione facoltativa: il Capitano assegna una TESSERA DORATA per certe evoluzioni.",
            "Il biglietto include l'acqua, non l'inchino. La darsena dello Stretto riporta qui anche prima della sfida."
          ],
          lockedLines: [
            "TRAGHETTO: torna con tre medaglie. Per ora il molo è chiuso."
          ]
        },
        lines: ["MARINAIO: il MOLO è a sud. Il traghetto si attiva sull'acqua. Il rendering del ponte, invece, galleggia solo nella presentazione."]
      },
      {
        id: "ruspista", pal: "aide", x: 8, y: 18, facing: "down",
        vehicleGift: {
          vehicle: "ruspa", flag: "gift-ruspa",
          lines: [
            "RUSPA CONSEGNATA: START > VEICOLO, poi A davanti a un albero.",
            "Il cantiere è fermo. Le foto della ruspa sono sempre in movimento."
          ]
        },
        lines: ["La RUSPA è tua. Il cartello del cantiere diceva già presto."]
      },
      {
        id: "autista-cap", pal: "guard", x: 17, y: 18, facing: "down",
        vehicleGift: {
          vehicle: "auto", flag: "gift-auto",
          lines: [
            "AUTO BLU CONSEGNATA: START > VEICOLO. Accelera all'aperto.",
            "Il pieno è nel bilancio. Il pendolare guarda il prezzo alla pompa."
          ]
        },
        lines: ["AUTO BLU: il tragitto diventa urgente quando entri tu."]
      },
      {
        id: "turista-cap", pal: "kid", x: 17, y: 19, facing: "up",
        lines: [
          "La guida indica il monumento. La transenna indica il fotografo del ministro."
        ]
      },
      {
        // Banchetto del venditore ambulante: Caput Mundi era l'unica città
        // grande SENZA negozio (niente rifornimento prima di palazzo/colle).
        // Un ambulante con shop:true vende le stesse cose del DISCOUNT.
        id: "ambulante-cap", pal: "barista", x: 14, y: 14, facing: "down", shop: true,
        lines: [
          "Al palazzo vendono coperture. Io vendo gilet: almeno sai cosa proteggono.",
          "Schede, caffè e direttive. Se lo scontrino è lungo, puoi istituire una commissione."
        ]
      },
      {
        id: "influencer-cap", pal: "influencer", x: 22, y: 19, facing: "left",
        lines: [
          "La diretta mostra il corteo. L'app ritaglia chi chiede chi paga."
        ]
      },
      {
        // SFIDA DEL GIORNO: 1 dibattito al giorno reale, team deterministico
        // dalla data. daily:true la esclude dall'ambient movement (non vaga).
        id: "opinionista-daily", pal: "journalist", x: 11, y: 13, facing: "down", daily: true,
        lines: ["OPINIONISTA PERPETUA: il dibattito è il mio habitat naturale."]
      },
      {
        // ARCHITETTO DI CORTE (R42): money-sink terminale MONUMENTO AL CANDIDATO,
        // accanto alla STATUA EQUESTRE (20,13). Cella (19,13) = prato calpestabile.
        id: "architetto-cap", pal: "aide", x: 19, y: 13, facing: "left", monument: true,
        lines: [
          "ARCHITETTO DI CORTE: un grande statista merita un grande MONUMENTO.",
          "Coi TUOI soldi, s'intende. È tutto legale: te lo dedichi da solo."
        ]
      }
    ]
  },

};

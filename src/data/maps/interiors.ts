import type { MapDef } from "./types";
import { LAB_TILES, MARKET_TILES, COLLE_TILES, PALAZZO_TILES, gymMap, marketMap, houseMap, barMap } from "./factories";

export const INTERIOR_MAPS: Record<string, MapDef> = {
  lab: {
    id: "lab",
    name: "LABORATORIO DEL CONSENSO",
    tiles: LAB_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      { x: 5, y: 7, toMap: "borgo", toX: 7, toY: 13, facing: "down" },
      { x: 6, y: 7, toMap: "borgo", toX: 7, toY: 13, facing: "down" }
    ],
    signs: [
      {
        x: 2, y: 1,
        lines: ["Tesi del Professore:", "'Il consenso: crearlo dal nulla e perderlo in un weekend.'"]
      },
      {
        x: 9, y: 1,
        lines: ["SONDAGGIOTRON 3000.", "Schermata attuale: 'MARGINE DI ERRORE: 100%'."]
      }
    ],
    pickups: [],
    npcs: [
      {
        id: "professor", pal: "professor", x: 9, y: 4, facing: "left",
        lines: [
          "Io sono il PROFESSOR QUIRINO, studioso del consenso.",
          "Sul tavolo ci sono tre SCHEDE STARTER: avvicinati a una e premi A per esaminarla.",
          "Ne scegli SOLO una: sarà il tuo primo POLITICMON. Le altre? Le prenderà chi viene dopo di te..."
        ]
      }
    ]
  },

  gymtv: gymMap(
    "gymtv", "STUDIO 5 - PALESTRA TV", "mediopoli", 6, 11,
    [
      {
        id: "gym1-allievo", pal: "journalist", x: 2, y: 4, facing: "right",
        trainerId: "stagista", sightRange: 3,
        lines: ["Lo stage dura da undici anni. Ma sono in onda!"]
      },
      {
        id: "gym1-capo", pal: "boss", x: 4, y: 1, facing: "down",
        trainerId: "emittenza",
        lines: ["Torna quando vuoi: la pubblicità paga comunque."]
      },
      {
        id: "berlusconix-legend", pal: "boss", x: 7, y: 1, facing: "down",
        showIfFlag: "legend-berlusconix-ready",
        hideIfFlag: "legend-berlusconix-gone",
        legendary: {
          speciesId: "berlusconix",
          level: 18,
          flag: "legend-berlusconix-gone",
          lines: [
            "Dietro le quinte lampeggia un telecomando d'oro.",
            "SUA EMITTENZA: hai conquistato l'AUDITEL. Ora puoi vedere il vero ospite della serata.",
            "BERLUSCONIX emerge dal maxischermo: sorriso a trentadue denti e sigla anni novanta."
          ],
          afterRunLines: [
            "BERLUSCONIX rientra nello schermo ridendo.",
            "Il telecomando d'oro resta acceso: puoi ritentare quando vuoi."
          ],
          afterGoneLines: [
            "Il maxischermo si spegne. In studio resta solo un applauso registrato.",
            "BERLUSCONIX è diventato una leggenda nel tuo POLITICDEX."
          ]
        },
        lines: ["Il maxischermo è spento. Sembra aspettare lo share giusto."]
      }
    ],
    ["REGOLAMENTO DELLO STUDIO:", "sorridere sempre, contraddire mai."]
  ),

  gymue: gymMap(
    "gymue", "PALESTRA UE", "eurotown", 6, 6,
    [
      {
        id: "gym2-allievo", pal: "aide", x: 7, y: 4, facing: "left",
        trainerId: "funzionario", sightRange: 3,
        lines: ["Ho un modulo per ogni emozione. In triplice copia."]
      },
      {
        id: "gym2-capo", pal: "granny", x: 4, y: 1, facing: "down",
        trainerId: "ladydirettiva",
        lines: ["La tua vittoria sarà recepita negli ordinamenti nazionali."]
      }
    ],
    ["AVVISO UE:", "questa palestra è conforme alla direttiva 2026/1, allegato C."]
  ),

  gymglobal: gymMap(
    "gymglobal", "GLOBAL TOWER", "capitale", 6, 12,
    [
      {
        id: "gym3-allievo1", pal: "guard", x: 2, y: 5, facing: "right",
        trainerId: "diplomatico", sightRange: 3,
        lines: ["La diplomazia è l'arte di perdere con stile."]
      },
      {
        id: "gym3-allievo2", pal: "aide", x: 7, y: 3, facing: "left",
        trainerId: "oligarca", sightRange: 3,
        lines: ["Io non perdo mai. Al massimo rinegozio."]
      },
      {
        id: "gym3-capo", pal: "boss", x: 4, y: 1, facing: "down",
        trainerId: "tycoon",
        lines: ["Nessuno perde meglio di me. Nessuno. È una vittoria enorme."]
      }
    ],
    ["GLOBAL TOWER:", "il piano terra è gratis, l'attico è in svendita a un miliardo."]
  ),

  market1: marketMap("market1", "mediopoli", 22, 11),
  market2: marketMap("market2", "eurotown", 22, 6),

  casino: {
    id: "casino",
    name: "CASINÒ DI PALAZZO",
    tiles: MARKET_TILES,
    outdoor: false,
    music: "interior",
    warps: [
      // Allineati ai tappeti `cc` (x 5 e 6), come marketMap.
      { x: 5, y: 5, toMap: "capitale", toX: 21, toY: 12, facing: "down" },
      { x: 6, y: 5, toMap: "capitale", toX: 21, toY: 12, facing: "down" }
    ],
    signs: [
      // Spostato da (0,1): lì era circondato dagli scaffali `b` (illeggibile).
      // (0,2) è muro laterale con pavimento accanto → leggibile da (1,2).
      { x: 0, y: 2, lines: ["CASINÒ DI PALAZZO", "Si entra elettori, si esce contribuenti."] }
    ],
    pickups: [],
    npcs: [
      {
        id: "croupier", pal: "boss", x: 4, y: 2, facing: "down", casino: true,
        lines: ["Benvenuto al CASINÒ DI PALAZZO.", "Qui il consenso si gioca a soldi. Letteralmente."]
      },
      {
        id: "habitue", pal: "journalist", x: 7, y: 3, facing: "left",
        lines: ["Vengo qui da vent'anni.", "Ho perso una legislatura intera alla roulette. Rifarei tutto."]
      },
      {
        // ENCORE di BERLUSCONIX: seconda chance post-game se non è mai stato
        // eletto. Il flag berlu-encore-ready è RICALCOLATO a ogni ingresso al
        // casinò (WorldScene.loadMap): garante-beaten E dex senza berlusconix.
        id: "magnate-encore", pal: "boss", x: 2, y: 3, facing: "right",
        showIfFlag: "berlu-encore-ready",
        hideIfFlag: "legend-berlusconix-encore-gone",
        legendary: {
          speciesId: "berlusconix",
          level: 50,
          flag: "legend-berlusconix-encore-gone",
          lines: [
            "Nel privé, dietro il velluto rosso, una risata inconfondibile.",
            "'Ah, il nuovo CAMPIONE! Le racconto una barzelletta... anzi no: gliela DIMOSTRO.'",
            "BERLUSCONIX sale sul tavolo verde: ultimo giro, posta massima."
          ],
          afterRunLines: ["'Torni pure, il banco non chiude mai per gli amici.'"],
          afterGoneLines: ["Il privé è vuoto. Resta solo un profumo di sigaro e share."]
        },
        lines: ["Il tavolo VIP è riservato. Torna quando conti qualcosa."]
      }
    ]
  },


  palazzo: {
    id: "palazzo",
    name: "IL PALAZZO",
    tiles: PALAZZO_TILES,
    outdoor: false,
    music: "palazzo",
    warps: [
      { x: 5, y: 7, toMap: "capitale", toX: 14, toY: 6, facing: "down" },
      { x: 6, y: 7, toMap: "capitale", toX: 15, toY: 6, facing: "down" },
      {
        x: 5, y: 1, toMap: "colle", toX: 5, toY: 7, facing: "up",
        requiresFlag: "boss-beaten",
        lockedLines: ["Una PORTA DORATA sigillata.", "Si aprirà solo quando il PALAZZO avrà un vincitore."]
      },
      {
        x: 6, y: 1, toMap: "colle", toX: 5, toY: 7, facing: "up",
        requiresFlag: "boss-beaten",
        lockedLines: ["Una PORTA DORATA sigillata.", "Si aprirà solo quando il PALAZZO avrà un vincitore."]
      }
    ],
    signs: [
      // Spostati da (0,1)/(11,1): erano fiancheggiati da macchine `k` e muri `A`
      // (illeggibili). (3,0)/(8,0) hanno pavimento sotto → leggibili da (3,1)/(8,1).
      { x: 3, y: 0, lines: ["Albo dei governi:", "68 in 80 anni. Nuovo record europeo."] },
      { x: 8, y: 0, lines: ["Registro visite:", "'Lobbista, lobbista, lobbista, idraulico, lobbista.'"] }
    ],
    pickups: [],
    npcs: [
      {
        id: "boss", pal: "boss", x: 5, y: 2, facing: "down",
        trainerId: "boss", hideIfFlag: "boss-beaten",
        lines: []
      },
      {
        id: "boss-after", pal: "boss", x: 2, y: 2, facing: "down", showIfFlag: "boss-beaten",
        lines: [
          "Hai vinto, per ora. Ma ricorda:",
          "i governi passano, io resto. Ci vediamo alla prossima crisi.",
          "La PORTA DORATA lassù? Porta al COLLE. Nessuno è mai tornato... promosso."
        ]
      }
    ]
  },

  colle: {
    id: "colle",
    name: "IL COLLE",
    tiles: COLLE_TILES,
    outdoor: false,
    music: "palazzo",
    warps: [
      { x: 5, y: 8, toMap: "palazzo", toX: 5, toY: 2, facing: "down" },
      { x: 6, y: 8, toMap: "palazzo", toX: 6, toY: 2, facing: "down" }
    ],
    signs: [
      {
        x: 0, y: 3,
        lines: ["ALBO DELLA CONSULTA:", "tre giudici, zero appelli, nessuna pausa caffè.", "Da qui in poi niente BAR SPORT: portati le scorte."]
      },
      {
        x: 11, y: 5,
        lines: ["AVVISO AI CANDIDATI:", "vietato l'ingresso ai sondaggisti.", "Le toghe non si misurano in percentuale."]
      }
    ],
    pickups: [],
    npcs: [
      {
        id: "tr-giudice1", pal: "granny", x: 2, y: 6, facing: "right",
        trainerId: "giudice1", sightRange: 4,
        lines: ["La forma è sostanza. E la tua è rivedibile."]
      },
      {
        id: "tr-giudice2", pal: "aide", x: 9, y: 4, facing: "left",
        trainerId: "giudice2", sightRange: 4,
        lines: ["Ho bocciato leggi più simpatiche di te."]
      },
      {
        id: "tr-giudice3", pal: "journalist", x: 2, y: 2, facing: "right",
        trainerId: "giudice3", sightRange: 4,
        lines: ["Tre gradi di giudizio. Sei al terzo."]
      },
      {
        id: "tr-garante", pal: "boss", x: 5, y: 1, facing: "down",
        trainerId: "garante", sightRange: 5, hideIfFlag: "garante-beaten",
        lines: []
      },
      {
        id: "garante-after", pal: "boss", x: 2, y: 1, facing: "down", showIfFlag: "garante-beaten",
        lines: [
          "GARANTE: la controfirma non si revoca. Purtroppo per te, ora tocca governare.",
          "Torna quando vuoi: il COLLE è sempre aperto. Le dimissioni, mai accettate."
        ]
      },
      {
        id: "draghimon-legend", pal: "guard", x: 9, y: 1, facing: "down",
        showIfFlag: "garante-beaten", hideIfFlag: "legend-draghimon-gone",
        legendary: {
          speciesId: "draghimon",
          level: 30,
          flag: "legend-draghimon-gone",
          lines: [
            "USCIERE DEL COLLE: da questa porta si evoca solo in caso di crisi.",
            "Tu hai appena risolto una crisi. Tecnicamente... ne serve un'altra.",
            "Lo spread sussulta. Un'ombra elegante esce dalla sala dei bilanci.",
            "DRAGHIMON ti osserva, in silenzio. Whatever."
          ],
          afterRunLines: [
            "DRAGHIMON torna ai suoi grafici senza voltarsi.",
            "L'usciere sospira: 'Riproveremo alla prossima manovra.'"
          ],
          afterGoneLines: [
            "La sala dei bilanci è vuota. Lo spread riposa.",
            "DRAGHIMON è registrato nel tuo POLITICDEX."
          ]
        },
        lines: ["La sala dei bilanci è sigillata. Si apre solo nelle crisi."]
      },
      {
        // MATTARELLUX (Round 40): il GARANTE SUPREMO in persona, catturabile solo
        // dopo aver superato il garante. Prima era nel dex ma di fatto irraggiungibile.
        id: "mattarellux-legend", pal: "boss", x: 2, y: 4, facing: "down",
        showIfFlag: "garante-beaten", hideIfFlag: "legend-mattarellux-gone",
        legendary: {
          speciesId: "mattarellux",
          level: 49,
          flag: "legend-mattarellux-gone",
          lines: [
            "USCIERE DEL COLLE: c'è ancora qualcuno che vuole conoscerti.",
            "Le porte del Quirinale si socchiudono. Nessun clamore, solo garbo.",
            "Un'aura istituzionale riempie la sala: MATTARELLUX ti osserva, paziente.",
            "\"Volevo andare in pensione. Ma prima, mettiamoci alla prova.\""
          ],
          afterRunLines: [
            "MATTARELLUX annuisce e torna ai suoi doveri, senza rancore.",
            "L'usciere sorride: 'Il GARANTE SUPREMO sa aspettare. Torna quando vuoi.'"
          ],
          afterGoneLines: [
            "La sala presidenziale è di nuovo silenziosa e ordinata.",
            "MATTARELLUX è registrato nel tuo POLITICDEX. Con tutti gli onori."
          ]
        },
        lines: ["Questa sala si apre solo per chi ha già garantito la Costituzione."]
      }
    ]
  },

  // ----------------------------------------------------- CASE VISITABILI -----

  // BORGO — casa tua.
  home: houseMap("home", "CASA TUA", "borgo", 23, 13, [
    {
      id: "home-mom", pal: "granny", x: 7, y: 2, facing: "down", setFlag: "talked-mom",
      gift: {
        itemId: "divisa", qty: 1, flag: "gift-divisa",
        lines: [
          "MAMMA: torni a casa solo quando ti serve qualcosa, come i partiti a gennaio.",
          "Tieni la DIVISA EQUA: spartisce i PUNTI CONSENSO con TUTTA la squadra.",
          "Anche chi resta in panchina cresce. Equità, almeno tra i tuoi POLITICMON!",
          "Ora vai a prenderti quel PALAZZO. E mangia, che a digiuno non si vincono i ballottaggi."
        ]
      },
      lines: [
        "MAMMA: la DIVISA EQUA ce l'hai. Nessuno resta indietro... in teoria.",
        "Ho rifatto il letto e stirato la fascia tricolore. Vai a prenderti quel PALAZZO!"
      ]
    }
  ], {
    variant: 2,
    // Spostato da (9,1): lì era sepolto nel blocco scaffali `b` (illeggibile).
    // (5,0) è muro di fondo con pavimento sotto → leggibile da (5,1) in alto.
    signs: [{ x: 5, y: 0, lines: ["Diploma di MAMMA POLITICA dell'anno.", "Conferito da: se stessa."] }],
    pickups: [{ id: "home-pk", x: 4, y: 1, itemId: "caffe", qty: 1 }]
  }),

  // BORGO — circolo del paese.
  circolo: houseMap("circolo", "CIRCOLO DEL BORGO", "borgo", 6, 19, [
    {
      id: "circolo-anziano", pal: "granny", x: 1, y: 3, facing: "right",
      lines: [
        "Al CIRCOLO si gioca a carte e si rifà il governo ogni sera.",
        "Nessuno ha mai vinto una partita, ma tutti hanno sempre ragione."
      ]
    },
    {
      id: "circolo-tesserato", pal: "aide", x: 6, y: 3, facing: "down",
      gift: {
        itemId: "dirGreen", qty: 1, flag: "gift-circolo",
        lines: [
          "Tu sei la giovane promessa, vero? Tieni, una vecchia DIRETTIVA che non uso più.",
          "GREENWASHING: fa sembrare ecologico anche un inceneritore. Falla tua."
        ]
      },
      lines: ["Ho la tessera n.1 dal 1974. Di quale partito? Cambia ogni martedì."]
    }
  ], { variant: 1 }),

  // MEDIOPOLI — appartamento influencer.
  attico: houseMap("attico", "ATTICO INFLUENCER", "mediopoli", 6, 19, [
    {
      id: "attico-influencer", pal: "influencer", x: 5, y: 2, facing: "down", setFlag: "talked-influencer",
      lines: [
        "Sto girando un reel: 'cinque promesse che non manterrò, la terza vi sorprenderà'.",
        "Il consenso? Si fa coi like, non con le idee. Idee è un account che non seguo."
      ]
    }
  ], {
    variant: 0,
    pickups: [{ id: "attico-pk", x: 4, y: 1, itemId: "schedona", qty: 1 }]
  }),

  // MEDIOPOLI — redazione del TG.
  redazione: houseMap("redazione", "REDAZIONE DEL TG", "mediopoli", 23, 17, [
    {
      id: "redaz-direttore", pal: "journalist", x: 1, y: 2, facing: "right",
      lines: [
        "Notizia in apertura: tu. Domani: ancora tu. La verità? In coda, dopo lo sport.",
        "Un consiglio: se vuoi i SONDAGGI alti, falli scrivere a noi."
      ]
    },
    {
      id: "redaz-stagista", pal: "kid", x: 6, y: 3, facing: "left",
      lines: ["Sono lo stagista. Scrivo i titoli, firmano gli altri. Il giornalismo!"]
    }
  ], { variant: 1 }),

  // EUROTOWN — ufficio del lobbista.
  lobbystudio: houseMap("lobbystudio", "STUDIO DI LOBBYING", "eurotown", 6, 10, [
    {
      id: "lobby-capo", pal: "boss", x: 6, y: 2, facing: "down",
      lines: [
        "Una lobby? Che parolaccia. Diciamo 'consulenza per il bene comune'.",
        "Il bene di chi? Dettaglio tecnico. Firma qui, qui e qui."
      ]
    }
  ], { variant: 0 }),

  // EUROTOWN — bistrot della burocrazia.
  bistrot: houseMap("bistrot", "BISTROT DELLE DIRETTIVE", "eurotown", 22, 10, [
    {
      id: "bistrot-funz", pal: "professor", x: 7, y: 2, facing: "down",
      lines: [
        "La DIRETTIVA 2024/banane stabilisce la curvatura massima del consenso.",
        "Allegato B, comma 12: ogni promessa va tradotta in 24 lingue prima di romperla."
      ]
    }
  ], {
    variant: 1,
    pickups: [{ id: "bistrot-pk", x: 8, y: 4, itemId: "maalox", qty: 1 }]
  }),

  // CAPUT MUNDI — salotto romano.
  salotto: houseMap("salotto", "SALOTTO ROMANO", "capitale", 5, 19, [
    {
      id: "salotto-vip", pal: "influencer", x: 7, y: 2, facing: "down",
      lines: [
        "Tesoro, al SALOTTO contano due cose: con chi ti siedi e da chi ti fai vedere.",
        "Il programma elettorale? Lo serviamo come antipasto, tanto nessuno lo finisce."
      ]
    },
    {
      id: "salotto-trombato", pal: "aide", x: 2, y: 4, facing: "right",
      lines: ["Sono un ex-ministro. Di cosa? Bella domanda. Anche io me lo chiedo."]
    }
  ], { variant: 2 }),

  // CAPUT MUNDI — covo dei retroscenisti.
  retroscena: houseMap("retroscena", "COVO DEI RETROSCENISTI", "capitale", 25, 19, [
    {
      id: "retro-cronista", pal: "journalist", x: 5, y: 2, facing: "down",
      lines: [
        "Fonti vicine al PALAZZO dicono che fonti vicine a te smentiscono le fonti.",
        "Scrivo retroscena da vent'anni. Non è ancora successo nessuno scena, solo retro."
      ]
    }
  ], {
    variant: 0,
    pickups: [{ id: "retro-pk", x: 8, y: 4, itemId: "scheda", qty: 3 }]
  }),

  // STRETTO — covo della "famiglia": fazione satirica del clientelismo.
  covo: houseMap("covo", "RETROBOTTEGA DEL PADRINO", "stretto", 21, 3, [
    {
      id: "covo-padrino", pal: "boss", x: 5, y: 3, facing: "down", mafia: true,
      lines: [
        "IL PADRINO: ti aspettavo, candidato. Una cosa la dico sempre:",
        "il consenso è come l'acqua, va incanalato. Noi sappiamo dove.",
        "Favori, scorciatoie, qualche... cortesia. Ma certe cose si pagano due volte."
      ]
    },
    {
      id: "covo-picciotto", pal: "aide", x: 2, y: 4, facing: "right",
      lines: ["Il PADRINO riceve tutti. Anche chi poi se ne pente. Specialmente quelli."]
    }
  ], {
    variant: 1,
    signs: [{ x: 8, y: 1, lines: ["'Una mano lava l'altra.'", "Qui ce ne sono parecchie, di mani."] }]
  }),

  // STRETTO — chiosco del ponte.
  chiosco: houseMap("chiosco", "CHIOSCO DEL PONTE", "stretto", 11, 3, [
    {
      id: "chiosco-oste", pal: "barista", x: 7, y: 2, facing: "down",
      lines: [
        "Vendo granite e plastici del PONTE da trent'anni. Il ponte non c'è, le granite sì.",
        "Tutti chiedono: 'quando lo finite?'. Io rispondo: 'quale, il ponte o la granita?'."
      ]
    }
  ], {
    variant: 1,
    pickups: [{ id: "chiosco-pk", x: 8, y: 4, itemId: "mojito", qty: 1 }]
  }),

  // ------------------------------------------------ BAR SPORT (centri cura) ---
  // Un "Pokémon Center" tematico per città: entri, il barista dietro al bancone
  // ti rimette in sesto la squadra. Sostituiscono i vecchi barista-in-piazza.
  "bar-borgo": barMap("bar-borgo", "BAR SPORT BORGO", "borgo", 21, 18),
  "bar-medio": barMap("bar-medio", "BAR SPORT MEDIOPOLI", "mediopoli", 7, 16),
  "bar-euro": barMap("bar-euro", "CAFFÈ EUROPA", "eurotown", 8, 13),
  "bar-cap": barMap("bar-cap", "GRAN CAFFÈ ROMANO", "capitale", 24, 8),
  "bar-stretto": barMap("bar-stretto", "CHIRINGUITO PAPEETE", "stretto", 15, 5),
  "bar-offshore": barMap("bar-offshore", "LIDO CAYMAN", "offshore", 15, 5),
  "bar-bruxelles": barMap("bar-bruxelles", "CAFFÈ SCHUMAN", "bruxelles", 10, 12)
};

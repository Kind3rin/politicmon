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
          "QUIRINO: TRE SCHEDE. UN POSTO.\nIL GRAFICO LO FACCIAMO DOPO.",
          "SCEGLI UNA SCHEDA SUL TAVOLO.\nA CONFERMA, B TI FA RIPENSARE."
        ]
      }
    ]
  },

  gymtv: gymMap(
    "gymtv", "STUDIO 5 - PALESTRA TV", "mediopoli", 6, 11,
    [
      {
        id: "gym1-allievo", dialogueName: "Mara", pal: "journalist", x: 2, y: 4, facing: "right",
        trainerId: "stagista", nameplate: "PROVA A",
        lines: ["Il backstage ha ascoltato. Il conduttore ha preso appunti su come interromperti.", "Puoi uscire dal tappeto a sud e curarti al bar prima della diretta."]
      },
      {
        id: "gym1-capo", dialogueName: "Sua Emittenza", pal: "boss", x: 4, y: 1, facing: "down",
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
        trainerId: "funzionario", nameplate: "VERIFICA A",
        lines: ["Verifica chiusa. Per i PP esci dal tappeto a sud: il bar è aperto."]
      },
      {
        id: "gym2-capo", pal: "granny", x: 4, y: 1, facing: "down",
        trainerId: "ladydirettiva",
        lines: ["Il risultato è registrato. La clausola vale anche quando vinci tu."]
      }
    ],
    ["PALESTRA UE: Hans offre una verifica facoltativa.", "Il bar recupera PV, PP e status. Puoi uscire prima del boss."]
  ),

  gymglobal: gymMap(
    "gymglobal", "GLOBAL TOWER", "capitale", 6, 12,
    [
      {
        id: "gym3-allievo1", pal: "guard", x: 2, y: 5, facing: "right",
        trainerId: "diplomatico", nameplate: "VERTICE A",
        lines: ["Il tavolo adesso serve a parlare. Per i PP puoi tornare al bar."]
      },
      {
        id: "gym3-allievo2", pal: "aide", x: 7, y: 3, facing: "left",
        trainerId: "oligarca", nameplate: "CAPITALE A",
        lines: ["Il conto è arrivato. La trattativa sulla mia quota è finita."]
      },
      {
        id: "gym3-capo", pal: "boss", x: 4, y: 1, facing: "down",
        trainerId: "tycoon",
        lines: ["Sul conto compare il mio nome. Per una volta devo pagarlo io."]
      }
    ],
    ["GLOBAL TOWER: due prove facoltative. A inizia, B annulla.", "Tycoon: tre avversari. Puoi uscire e curare PV e PP al bar."]
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
      { x: 3, y: 0, lines: ["ARCHIVIO DEI PROGRAMMI:", "Cartella ESEGUITI: vuota. Il tecnico dice che almeno si apre subito."] },
      { x: 8, y: 0, lines: ["REGISTRO VISITE:", "L'idraulico aspetta. La perdita è urgente, ma non ha un ufficio stampa."] }
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
          "La stanza è tua. La cartella BOZZE è ancora piena: quella non applaude.",
          "Al COLLE trovi tre prove facoltative e il GARANTE. Puoi tornare al bar di Capitale fra le lotte.",
          "Il portone non sparisce quando esci. Per una volta, nemmeno il problema."
        ]
      }
    ]
  },

  colle: {
    id: "colle",
    name: "IL COLLE",
    tiles: COLLE_TILES,
    // Il Garante siede su un palco in cima a quattro gradini di tappeto rosso.
    stairStyle: "carpet",
    zones: [
      { name: "Scranno del Garante", x: 0, y: 0, w: 12, h: 4 },
      { name: "Aula", x: 0, y: 4, w: 12, h: 6 }
    ],
    outdoor: false,
    music: "palazzo",
    warps: [
      { x: 5, y: 8, toMap: "palazzo", toX: 5, toY: 2, facing: "down" },
      { x: 6, y: 8, toMap: "palazzo", toX: 6, toY: 2, facing: "down" }
    ],
    signs: [
      {
        x: 0, y: 2,
        lines: ["PROVE DELLA CONSULTA:", "tre sfide facoltative: regole, competenze, diritti. A apre il briefing, B annulla.", "Puoi scendere dal Palazzo e recuperare PV e PP al bar di Capitale, anche fra le prove."]
      },
      {
        x: 11, y: 5,
        lines: ["PRIMA DEL GARANTE:", "quattro avversari. START sceglie il leader. Il bar recupera PV e PP; l'ambulante di Capitale vende cure.", "Mosse dimenticate? START > SQUADRA: A scorre il dossier fino ad ARCHIVIO. Riprendi gratis le linee disponibili al tuo livello.", "Il fotografo chiede una vittoria senza ombre. Abbiamo acceso la luce anche sull'altra sedia."]
      }
    ],
    pickups: [],
    npcs: [
      {
        id: "tr-giudice1", pal: "granny", x: 2, y: 6, facing: "right",
        trainerId: "giudice1",
        lines: ["La regola vale anche per chi la firma. Prova facoltativa: A."]
      },
      {
        id: "tr-giudice2", pal: "aide", x: 9, y: 4, facing: "left",
        trainerId: "giudice2",
        lines: ["Una porta, tre uffici, nessuna chiave. Prova facoltativa: A."]
      },
      {
        id: "tr-giudice3", pal: "journalist", x: 2, y: 2, facing: "right",
        trainerId: "giudice3",
        lines: ["Chi perde resta nella stanza. Prova facoltativa: A."]
      },
      {
        id: "tr-garante", pal: "boss", x: 5, y: 1, facing: "down",
        trainerId: "garante", hideIfFlag: "garante-beaten",
        lines: []
      },
      {
        id: "garante-after", pal: "boss", x: 2, y: 1, facing: "down", showIfFlag: "garante-beaten",
        lines: [
          "GARANTE: il mandato è firmato. Le promesse non si archiviano con la stessa penna.",
          "START > MORALE conserva le date. Il cittadino aspetta il servizio, non questa cerimonia."
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
            "USCIERE: avevamo scritto stabile. Il grafico ha chiesto rispetto per la sua carriera.",
            "DRAGHIMON esce dai bilanci. Non applaude: vuole sapere come hai pagato le sedie."
          ],
          afterRunLines: [
            "DRAGHIMON riapre il grafico. L'usciere: torna pure, il confronto resta disponibile."
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
            "MATTARELLUX ha preparato la valigia. Sopra c'è una pratica urgente: è diventata una scrivania.",
            "Vuole un confronto. Il livello 49 spiega perché la valigia aspetta ancora."
          ],
          afterRunLines: [
            "MATTARELLUX rimette la pratica sulla valigia. Puoi tornare a sfidarlo."
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
          "MAMMA: hai già una squadra? Allora hai già qualcuno che aspetta un rimborso.",
          "Tieni la DIVISA EQUA: spartisce i PUNTI CONSENSO con TUTTA la squadra.",
          "Anche chi resta in panchina cresce. Equità, almeno tra i tuoi POLITICMON!",
          "Al Palazzo chiedi una stanza. Qui fuori chiedono un orario. Cerca di ricordarti entrambi."
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
        "Il pulsante accetta tutto occupa il tavolo. Quello rifiuta è nella fattura.",
        "Scelta libera: la fatica di rifiutare non entra nella slide."
      ]
    }
  ], { variant: 0 }),

  // EUROTOWN — bistrot della burocrazia.
  bistrot: houseMap("bistrot", "BISTROT DELLE DIRETTIVE", "eurotown", 22, 10, [
    {
      id: "bistrot-funz", pal: "professor", x: 7, y: 2, facing: "down",
      lines: [
        "La semplificazione toglie una pagina. Ho messo la spiegazione in un allegato di due.",
        "Le DIRETTIVE della borsa si riusano: il candidato compatibile impara, la copia resta."
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
        "Ho fatto spostare le sedie. Sembrava un accordo: era per far entrare tutti nella foto."
      ]
    },
    {
      id: "salotto-trombato", pal: "aide", x: 2, y: 4, facing: "right",
      lines: ["Mi invitano come ex-ministro. Quando ero in carica volevano il mio autista."]
    }
  ], { variant: 2 }),

  // CAPUT MUNDI — covo dei retroscenisti.
  retroscena: houseMap("retroscena", "COVO DEI RETROSCENISTI", "capitale", 25, 19, [
    {
      id: "retro-cronista", pal: "journalist", x: 5, y: 2, facing: "down",
      lines: [
        "La fonte chiede anonimato. Poi mi corregge perché dalla foto non si capisce chi è."
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
        "La granita si scioglie se la lasci nella presentazione. Il plastico no: infatti è il prodotto che va meglio.",
        "Il cliente ha chiesto il ponte senza ghiaccio. Ho richiamato l'ingegnere."
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
  "bar-bruxelles": {
    ...barMap("bar-bruxelles", "CAFFÈ SCHUMAN", "bruxelles", 10, 12),
    tileOverrides: { p: "tiles/commissione_floor.png", A: "tiles/commissione_wall.png" },
    objectOverrides: { t: "tiles/commissione_table.png" }
  }
};

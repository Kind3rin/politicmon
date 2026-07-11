import type { MemeEventDef } from "./types";

export const EVERGREEN_MEME_EVENTS: readonly MemeEventDef[] = [
  {
    id: "photo_field_slots",
    title: "LA FOTO IMPOSSIBILE",
    lines: ["IL FOTOGRAFO CONTA QUATTRO LEADER.", "IL FRAME, CON GRANDE AUTONOMIA, NE CONTA TRE."],
    conditions: [{ kind: "flag", id: "atto3-started", value: true }],
    choices: [
      { label: "STRINGETEVI", lines: ["LA FOTO ENTRA.", "LE LINEE ROSSE PURE."], effects: [{ kind: "sondaggi", delta: 2 }] },
      { label: "PANORAMICA", lines: ["SERVE UN TAVOLO PIÙ LARGO.", "E UN ALTRO COMUNICATO."], effects: [{ kind: "money", delta: -200 }, { kind: "sondaggi", delta: 3 }] }
    ],
    tags: ["coalizione", "foto", "evergreen"],
    source: { label: "Il Fatto Quotidiano — foto del campo largo, 16/06/2026", url: "https://www.ilfattoquotidiano.it/2026/06/16/campo-largo-schlein-conte-eventi-luglio-notizie/8421147/" },
    editorial: {
      verifiedOn: "2026-07-10",
      risk: "low",
      fact: "Quattro leader hanno diffuso una foto comune annunciando iniziative condivise.",
      fallback: "Una coalizione tenta una foto di gruppo con più invitati che spazio."
    }
  },
  {
    id: "quasi_magic_office",
    title: "QUASI MAGIA ISTITUZIONALE",
    lines: ["IL NUOVO CONSULENTE APRE IL DOSSIER.", "PARTE UN JINGLE. IL DOSSIER RESTA CHIUSO."],
    conditions: [{ kind: "minBadges", value: 3 }],
    choices: [
      { label: "METTI IL RITORNELLO", lines: ["LA PRATICA NON AVANZA.", "IL PUBBLICO LA CANTICCHIA."], effects: [{ kind: "sondaggi", delta: 3 }] },
      { label: "LEGGI GLI ALLEGATI", lines: ["SCOPRI UN MODULO PER RICHIEDERE IL MODULO."], effects: [{ kind: "money", delta: 250 }] }
    ],
    tags: ["media", "burocrazia", "evergreen"],
    source: { label: "RaiNews — dal meme allo staff politico, 23/04/2026", url: "https://www.rainews.it/amp/articoli/2026/04/dal-meme-alla-politica-il-creator-di-e-quasi-magia-giany-entra-nello-staff-di-eugenio-giani-a3d37b13-9acd-4423-9b6d-d9250cd583e6.html" },
    editorial: {
      verifiedOn: "2026-07-10",
      risk: "low",
      fact: "Il creator di una pagina satirica è entrato nello staff del presidente della Toscana.",
      fallback: "Un consulente social trasforma la burocrazia in un jingle."
    }
  }
];

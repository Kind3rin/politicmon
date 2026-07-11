import type { MemeEventDef } from "./types";

export const SEASON_2026_MEME_EVENTS: readonly MemeEventDef[] = [
  {
    id: "future_provisional_final",
    title: "PROVVISORIAMENTE DEFINITIVO",
    lines: ["IL PARTITO È APPENA NATO.", "LA TESSERA HA GIÀ LA VERSIONE 2.0."],
    active: { from: "2026-06-01", until: "2027-12-31" },
    conditions: [{ kind: "flag", id: "atto3-started", value: true }],
    choices: [
      { label: "GUARDA AVANTI", lines: ["IL MANIFESTO INDICA DOMANI.", "LA FRECCIA INDICA L'USCITA."], effects: [{ kind: "sondaggi", delta: 2 }] },
      { label: "RILEGGI IERI", lines: ["SOTTO LA VERNICE C'È UN ALTRO MANIFESTO."], effects: [{ kind: "money", delta: 400 }, { kind: "sondaggi", delta: -1 }] }
    ],
    tags: ["scissione", "rebranding", "season-2026"],
    source: { label: "Sky TG24 — assemblea costituente Futuro Nazionale, 15/06/2026", url: "https://tg24.sky.it/politica/2026/06/15/roberto-vannacci-futuro-nazionale-programma-reazioni" },
    editorial: {
      verifiedOn: "2026-07-10",
      risk: "medium",
      fact: "Futuro Nazionale ha tenuto la propria assemblea costituente nel giugno 2026.",
      fallback: "Una scissione fonda il partito del domani e ristampa subito i badge."
    }
  },
  {
    id: "diplomatic_selfie_reality",
    title: "DIPLOMAZIA IN MODALITÀ SELFIE",
    lines: ["IL VERTICE HA TRE PASSERELLE:", "FEDELTÀ, AUTONOMIA E LATO MIGLIORE."],
    active: { from: "2026-06-15", until: "2026-09-30" },
    conditions: [{ kind: "minBadges", value: 3 }],
    choices: [
      { label: "FOTO UFFICIALE", lines: ["SORRIDONO TUTTI.", "IL TRADUTTORE CERCA IL CONTESTO."], effects: [{ kind: "sondaggi", delta: 4 }, { kind: "money", delta: -300 }] },
      { label: "VERTICE SENZA FILTRI", lines: ["IL COMUNICATO È SOBRIO.", "IL FEED LO TROVA SOSPETTO."], effects: [{ kind: "sondaggi", delta: -1 }, { kind: "money", delta: 500 }] }
    ],
    tags: ["diplomazia", "selfie", "season-2026"],
    source: { label: "RaiNews — meme e rapporti diplomatici, 06/07/2026", url: "https://www.rainews.it/articoli/2026/07/lultimo-schiaffo-di-trump-per-meloni-serve-un-ordine-restrittivo-1d2bdd3e-2683-4ff8-8b1c-53182e9ab76f.html" },
    editorial: {
      verifiedOn: "2026-07-10",
      risk: "medium",
      fact: "Un post social del presidente statunitense ha usato una foto con la premier italiana ed è stato trattato pubblicamente come meme diplomatico.",
      fallback: "Un vertice internazionale diventa un reality del selfie."
    }
  }
];

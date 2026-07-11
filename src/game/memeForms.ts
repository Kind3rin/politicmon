import type { Monster, Stats } from "./monster";

export type MemeFormStat = "atk" | "def" | "spc" | "spd";

export interface MemeFormDef {
  readonly id: string;
  readonly speciesId: string;
  readonly name: string;
  readonly season: string;
  readonly availableFrom: string;
  readonly availableTo: string;
  readonly provenance: string;
  readonly sourceId: string;
  readonly accent: string;
  readonly stat: MemeFormStat;
  readonly statPercent: number;
}

// Varianti dello stesso personaggio: nessun nuovo numero Dex e nessun nuovo
// volto generico. L'aura si sovrappone allo sprite PixelLab riconoscibile.
export const MEME_FORMS: Readonly<Record<string, MemeFormDef>> = {
  salvinator_spiaggia: {
    id: "salvinator_spiaggia", speciesId: "salvinator", name: "CAPITANO DA SPIAGGIA",
    season: "ESTATE 2026", availableFrom: "2026-06-01", availableTo: "2026-09-30",
    provenance: "TOUR BALNEARE E SELFIE DA BAGNINO", sourceId: "weekly:estate-2026",
    accent: "#49b9e8", stat: "def", statPercent: 5
  },
  giorgiagon_comizio: {
    id: "giorgiagon_comizio", speciesId: "giorgiagon", name: "FIAMMA DA PALCO",
    season: "AUTUNNO 2026", availableFrom: "2026-09-01", availableTo: "2026-12-15",
    provenance: "COMIZIO, OCCHIATA E PODIO IN TENDENZA", sourceId: "weekly:autunno-2026",
    accent: "#e15c4a", stat: "atk", statPercent: 5
  },
  ellyna_armocromia: {
    id: "ellyna_armocromia", speciesId: "ellyna", name: "ARMOCROMIA CIVICA",
    season: "PRIMAVERA 2027", availableFrom: "2027-03-01", availableTo: "2027-06-30",
    provenance: "LOOK DA INTERVISTA DIVENTATO MEME", sourceId: "weekly:primavera-2027",
    accent: "#bd70c9", stat: "spc", statPercent: 5
  },
  renzino_slide: {
    id: "renzino_slide", speciesId: "renzino", name: "SLIDE VIVENTE",
    season: "INVERNO 2026", availableFrom: "2026-12-01", availableTo: "2027-03-31",
    provenance: "LAVAGNA, FRECCE E PIANO IN DIECI PUNTI", sourceId: "weekly:inverno-2026",
    accent: "#e6b944", stat: "spd", statPercent: 5
  }
};

export function memeForm(id?: string): MemeFormDef | undefined {
  return id ? MEME_FORMS[id] : undefined;
}

export function isFormAvailable(form: MemeFormDef, now = new Date()): boolean {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return day >= form.availableFrom && day <= form.availableTo;
}

export function currentMemeForms(now = new Date()): MemeFormDef[] {
  return Object.values(MEME_FORMS).filter((form) => isFormAvailable(form, now));
}

export function applyMemeFormStats(mon: Monster, stats: Stats): Stats {
  const form = memeForm(mon.memeFormId);
  if (!form || form.speciesId !== mon.speciesId) return stats;
  return { ...stats, [form.stat]: Math.max(1, Math.floor(stats[form.stat] * (1 + form.statPercent / 100))) };
}

export function grantSeasonalForm(party: Monster[], unlocked: readonly string[], now = new Date()): { formId?: string; unlocked: string[] } {
  const owned = new Set(unlocked.filter((id) => Boolean(MEME_FORMS[id])));
  const candidate = currentMemeForms(now).find((form) => !owned.has(form.id) && party.some((mon) => mon.speciesId === form.speciesId));
  if (!candidate) return { unlocked: [...owned] };
  const mon = party.find((entry) => entry.speciesId === candidate.speciesId);
  if (!mon) return { unlocked: [...owned] };
  mon.memeFormId = candidate.id;
  owned.add(candidate.id);
  return { formId: candidate.id, unlocked: [...owned] };
}

export function formsForSpecies(speciesId: string, unlocked: readonly string[]): MemeFormDef[] {
  const ids = new Set(unlocked);
  return Object.values(MEME_FORMS).filter((form) => form.speciesId === speciesId && ids.has(form.id));
}

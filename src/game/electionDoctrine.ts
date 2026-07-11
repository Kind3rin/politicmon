import { coalitionId, type CoalitionState } from "./coalition";

export type ElectionDoctrine = "campo_largo" | "centro_mobile" | "destra_competitiva" | "lista_civica" | "scissione" | "none";

export function electionDoctrine(coalition: CoalitionState, flags: Readonly<Record<string, boolean>>): ElectionDoctrine {
  if (Object.keys(flags).some((flag) => flag.startsWith("coalition-broken:") && flags[flag])) return "scissione";
  return coalitionId(coalition);
}

export const DOCTRINE_LABEL: Readonly<Record<ElectionDoctrine, string>> = {
  campo_largo: "DIFESA COLLETTIVA",
  centro_mobile: "CENTRO MOBILE",
  destra_competitiva: "DESTRA COMPETITIVA",
  lista_civica: "LISTA CIVICA",
  scissione: "SCISSIONE",
  none: "NESSUNA DOTTRINA"
};

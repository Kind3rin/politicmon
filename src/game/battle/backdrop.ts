import { MAPS } from "../../data/maps";

import { BATTLE_BACKDROPS, type BattleBackdrop, type BattleBackdropId } from "./backdropArt";
export { BATTLE_BACKDROPS, type BattleBackdrop, type BattleBackdropId } from "./backdropArt";

const MAP_BACKDROPS: Readonly<Record<string, BattleBackdropId>> = {
  borgo: "piazza", mediopoli: "tv", eurotown: "viale", capitale: "foro", bruxelles: "bruxelles",
  route2: "lago", route3: "cava", antenna: "tv",
  grotta1: "grotta", grotta2: "grotta", "oblast-meme": "neve",
  gymtv: "studio", redazione: "studio", retroscena: "studio", attico: "studio",
  stretto: "costa", offshore: "offshore", chiosco: "costa", "bar-stretto": "costa", "bar-offshore": "costa",
  campo_largo: "campo", retropalco_campo: "studio", diplomacy_terrace: "studio", genova_techno: "rete",
  futuro_piazza: "rete", futuro_sede: "rete", futuro_scissione: "rete", futuro_rebrand: "rete", futuro_tesoreria: "rete",
  tour_feed: "studio", district_nord: "piazza", district_centro: "piazza", district_sud: "costa", district_isole: "costa", district_feed: "rete",
  palazzo_feed: "rete", palazzo_algoritmo: "rete", palazzo_factcheck: "rete", palazzo_talkshow: "studio",
  palazzo_silenzio: "rete", palazzo_feed_studio: "studio", palazzo_feed_terrazza: "piazza",
  // Interni con un ambiente proprio: bar e caffè, case, palestre, mercati, casinò, laboratori, archivi, uffici e bunker.
  "bar-borgo": "bar", "bar-medio": "bar", "bar-euro": "bar", "bar-cap": "bar", "bar-bruxelles": "bar", circolo: "bar", bistrot: "bar",
  home: "casa", salotto: "casa", gymue: "palestra", gymglobal: "palestra",
  market1: "mercato", market2: "mercato", covo: "mercato", casino: "casino", lab: "laboratorio", archivio: "archivio",
  commissione: "ufficio", lobbystudio: "ufficio", diplomacy_lobby: "ufficio", diplomacy_loyalty: "ufficio",
  diplomacy_autonomy: "ufficio", diplomacy_home: "ufficio", studio: "ufficio", bunker: "bunker", regia: "studio"
};

export function battleBackdropId(mapId: string): BattleBackdropId {
  if (Object.hasOwn(MAP_BACKDROPS, mapId)) return MAP_BACKDROPS[mapId];
  return Object.hasOwn(MAPS, mapId) && MAPS[mapId].outdoor === false ? "palazzo" : "prato";
}

export function battleBackdropForMap(mapId: string): BattleBackdrop {
  return BATTLE_BACKDROPS[battleBackdropId(mapId)];
}

import { getSpriteImage } from "../engine/assets";

// Directional Higgsfield sprites: idle plus four walking poses for every role.
// West is native; no mirroring. While an image decodes, keep the idle pose.
const FACING_FILE: Record<string, string> = {
  down: "south", up: "north", left: "west", right: "east"
};

// Numero di frame di camminata Higgsfield disponibili per il player (0 = solo
// sprite statico). Quando si scaricano i frame walk (chars/player_<dir>_w<n>.png)
// si imposta a >0 e il rendering li alterna mentre il player cammina.
export const PLAYER_WALK_FRAMES = 4;

// `frame` indica il fotogramma di camminata desiderato (0..N-1); con `moving=false`
// si usa lo sprite a riposo. Se i frame walk non ci sono, ricade sullo statico.
export function playerImage(facing: Facing, frame = 0, moving = false): HTMLImageElement | null {
  const dir = FACING_FILE[facing] ?? "south";
  if (moving && PLAYER_WALK_FRAMES > 0) {
    const f = frame % PLAYER_WALK_FRAMES;
    const img = getSpriteImage(`player:${dir}:w${f}`, `chars/player_${dir}_w${f}.png`);
    if (img) {
      return img;
    }
  }
  return getSpriteImage(`player:${dir}`, `chars/player_${dir}.png`);
}

// Scafo del TRAGHETTO (Higgsfield, vista dall'alto, 1 sola direzione: ondeggia
// sull'acqua sotto il player).
export function ferryImage(): HTMLImageElement | null {
  return getSpriteImage("veh:ferry", "chars/ferry.png");
}

// Veicoli terrestri Higgsfield (auto, ruspa, monopattino): 4 VISTE N/S/E/O — il
// veicolo SI MUOVE e deve puntare nella direzione di marcia (come il player).
// File: chars/<id>_<dir>.png con dir = south/north/east/west.
const VEHICLE_WITH_PNG = new Set<string>(["auto", "ruspa", "monopattino"]);

export function vehicleImage(vehicleId: string, facing: Facing): HTMLImageElement | null {
  if (!VEHICLE_WITH_PNG.has(vehicleId)) {
    return null;
  }
  const dir = FACING_FILE[facing] ?? "south";
  return getSpriteImage(`veh:${vehicleId}:${dir}`, `chars/${vehicleId}_${dir}.png`);
}

// All ten NPC roles have their own four directional views and walking poses.
export const NPC_WITH_PNG = new Set<string>([
  "professor", "guard", "kid", "journalist", "boss", "granny", "rival",
  "influencer", "aide", "barista"
]);

// Chest-up busts for dialogue (public/sprites/portraits): one per base role, one per story sprite set, one for the player.
export const PORTRAIT_SETS = new Set<string>([
  "civic-mayor", "commissione", "offshore-treasurer", "campo-secretary", "quantum-centrist", "campo-photographer",
  "future-reception", "future-reporter", "future-treasurer", "future-split", "future-brand", "future-guard", "future-secretary",
  "diplomacy-host", "diplomacy-loyalist", "diplomacy-mediator", "diplomacy-producer", "diplomacy-partner",
  "genova-dj", "genova-stagehand", "genova-accountant", "tour-hub", "tour-nord", "tour-centro", "tour-sud", "tour-isole", "tour-feed",
  "palace-reception", "palace-algorithm-a", "palace-algorithm-b", "palace-factcheck-a", "palace-factcheck-b",
  "palace-talkshow-a", "palace-talkshow-b", "palace-silence-a", "palace-silence-b", "palace-studio"
]);
export const PLAYER_PORTRAIT = "/sprites/portraits/player.png";

/** What a story character is called in a dialogue when the map gives no name: the look implies the job. */
export const SET_NAMES: Readonly<Record<string, string>> = {
  "civic-mayor": "Il Sindaco", "commissione": "La Commissione", "offshore-treasurer": "Il Tesoriere",
  "campo-secretary": "Segretaria di Campo Largo", "quantum-centrist": "Il Centrista quantistico", "campo-photographer": "Il Fotografo",
  "future-reception": "Accoglienza", "future-reporter": "Cronista", "future-treasurer": "Tesoriera", "future-split": "Ufficio Scissioni",
  "future-brand": "Ufficio Rebrand", "future-guard": "Guardia della sede", "future-secretary": "Segretario",
  "diplomacy-host": "Cerimoniera", "diplomacy-loyalist": "Il Lealista", "diplomacy-mediator": "Mediatrice",
  "diplomacy-producer": "Il Produttore", "diplomacy-partner": "Il Partner perfetto",
  "genova-dj": "DJ", "genova-stagehand": "Macchinista", "genova-accountant": "Contabile",
  "tour-hub": "Guida del tour", "tour-nord": "Chiosco Nord", "tour-centro": "Chiosco Centro", "tour-sud": "Chiosco Sud",
  "tour-isole": "Chiosco Isole", "tour-feed": "Chiosco Feed",
  "palace-reception": "Portineria", "palace-algorithm-a": "Algoritmo A", "palace-algorithm-b": "Algoritmo B",
  "palace-factcheck-a": "Fact-checker A", "palace-factcheck-b": "Fact-checker B",
  "palace-talkshow-a": "Conduttore", "palace-talkshow-b": "Ospite", "palace-silence-a": "Custode del silenzio A",
  "palace-silence-b": "Custode del silenzio B", "palace-studio": "Regia"
};

/**
 * Who a speaker looks like in a dialogue. A character with its own sprite set is drawn from that set
 * (never from the generic role it falls back to); the bust is used when it exists, the walking sprite otherwise.
 */
export function dialoguePortrait(palId: string, spriteSet?: string): string | undefined {
  if (spriteSet) return PORTRAIT_SETS.has(spriteSet) ? `/sprites/portraits/${spriteSet}.png` : `/sprites/chars/npc_${spriteSet}_south.png`;
  return NPC_WITH_PNG.has(palId) ? `/sprites/portraits/${palId}.png` : undefined;
}

// Archetipi NPC con frame di camminata Higgsfield disponibili (chars/npc_<pal>_<dir>_w<n>.png).
export const NPC_WALK = new Set<string>([
  "granny", "guard", "kid", "aide", "barista", "professor", "journalist", "boss",
  "rival", "influencer"
]);
export const NPC_WALK_FRAMES = 4;

export function npcImage(palId: string, facing: Facing, frame = 0, moving = false): HTMLImageElement | null {
  if (!NPC_WITH_PNG.has(palId)) {
    return null;
  }
  const dir = FACING_FILE[facing] ?? "south";
  if (moving && NPC_WALK.has(palId)) {
    const f = frame % NPC_WALK_FRAMES;
    const img = getSpriteImage(`npc:${palId}:${dir}:w${f}`, `chars/npc_${palId}_${dir}_w${f}.png`);
    if (img) {
      return img;
    }
  }
  return getSpriteImage(`npc:${palId}:${dir}`, `chars/npc_${palId}_${dir}.png`);
}

export type Facing = "down" | "up" | "left" | "right";

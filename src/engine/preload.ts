import { coreTerrainEntries } from "../art/tiles";
import { NPC_WITH_PNG } from "../art/characters";
import { preloadSprites, waitForSprites } from "./assets";
import { BAG_ORDER } from "../data/items";
import { MONSTERS_WITH_ACTION_PNG, MONSTERS_WITH_PNG } from "../art/monsters";
import { ITEMS_WITH_PNG } from "../art/items";
import { BATTLE_BACKDROPS } from "../game/battle/backdropArt";
import { ANIMATED_MONSTERS } from "../art/monsterFrames";
import { BOSS_ART_IDS } from "../game/battle/trainerStyle";

const DIRS = ["south", "north", "east", "west"] as const;
const NPCS = [...NPC_WITH_PNG];
const VEHICLES = ["auto", "ruspa", "monopattino"] as const;

// Sprite che il PRIMO frame mostra davvero (mappa iniziale "borgo": terreno,
// edifici, player fermo). Il boot ASPETTA solo questi → schermata CARICAMENTO
// breve anche su rete lenta. Tutto il resto (frame di camminata NPC, mostri, item,
// veicoli) parte in preload di SFONDO non bloccante: getSpriteImage è lazy, quindi
// se un asset non è ancora pronto usa il fallback per un frame senza crashare.
export function criticalSpriteEntries(): Record<string, string> {
  const entries: Record<string, string> = {
    ...coreTerrainEntries(),
    "veh:ferry": "chars/ferry.png",
    "char:schettino": "chars/schettino.png",
    // The candidate portrait is rendered inside the current document layout.
    "ui:candidate-avatar": "chars/player_south.png"
  };

  // Player fermo nelle 4 direzioni: il primo frame lo disegna, è critico.
  for (const dir of DIRS) {
    entries[`player:${dir}`] = `chars/player_${dir}.png`;
    // Frame di camminata NPC statici (fermi) delle 4 direzioni: leggeri e visibili
    // già sulla mappa iniziale.
    for (const npc of NPCS) {
      entries[`npc:${npc}:${dir}`] = `chars/npc_${npc}_${dir}.png`;
    }
  }

  return entries;
}

// The roster used to be awaited before the title: a hundred and thirty pictures between a new player and the first screen, for a battle
// that is minutes away. It now opens the background queue (first in line, so it is ready long before the laboratory), and a scene that
// draws a Politicmon still not loaded starts it at once.
export function rosterSpriteEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const speciesId of MONSTERS_WITH_PNG) {
    entries[`mon:${speciesId}`] = `monsters/${speciesId}.png`;
  }
  for (const speciesId of MONSTERS_WITH_ACTION_PNG) {
    entries[`mon:${speciesId}_action`] = `monsters/${speciesId}_action.png`;
  }
  return entries;
}

// Tutto ciò che NON serve al primo frame: frame di camminata (player+NPC),
// veicoli, item, mostri. Precaricato in sfondo, mai atteso dal boot.
// In the order a new game meets them: the player walking, the bag, the people walking, the first backdrops; the big dossiers of the
// bosses, hours away, come last.
function deferredSpriteEntries(): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const dir of DIRS) {
    for (let frame = 0; frame < 4; frame += 1) {
      entries[`player:${dir}:w${frame}`] = `chars/player_${dir}_w${frame}.png`;
    }
  }
  // Solo gli item con PNG (i nuovi item R39 senza icona userebbero un path 404).
  for (const itemId of BAG_ORDER) {
    if (ITEMS_WITH_PNG.has(itemId)) {
      entries[`item:${itemId}`] = `items/${itemId}.png`;
    }
  }
  entries["ui:starter-stage"] = "ui/starter-stage.png";
  for (const id of ["bag", "shop", "teach"]) entries[`ui:${id}`] = `ui/${id}.png`;
  entries["ui:dossier"] = "ui/dossier.png";
  // Gli ambienti sono piccoli PNG nativi: partono in sfondo senza allungare
  // il boot e riusano il versionamento/offline del registry degli sprite.
  for (const backdrop of Object.values(BATTLE_BACKDROPS)) {
    entries[backdrop.spriteId] = backdrop.path;
  }
  for (const dir of DIRS) {
    for (const npc of NPCS) {
      for (let frame = 0; frame < 4; frame += 1) {
        entries[`npc:${npc}:${dir}:w${frame}`] = `chars/npc_${npc}_${dir}_w${frame}.png`;
      }
    }
    for (const vehicle of VEHICLES) {
      entries[`veh:${vehicle}:${dir}`] = `chars/${vehicle}_${dir}.png`;
    }
  }
  entries["ui:evolution"] = "ui/evolution.png";
  entries["ui:evolution-stage"] = "ui/evolution-stage.png";
  entries["ui:career-portrait"] = "ui/evolution-portrait.png";
  for (const art of ["sportello", "studio", "molo", "verbale", "pompa"]) {
    entries[`civic:${art}`] = `ui/civic/${art}.png`;
  }
  return entries;
}

// Heavy and late: the animated sheets, then the boss dossiers.
function lateSpriteEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const id of ANIMATED_MONSTERS) entries[`mon:frames:${id}`] = `monsters/animated/${id}.png`;
  for (const id of BOSS_ART_IDS) entries[`boss:${id}`] = `ui/boss/${id}.png`;
  return entries;
}

const CRITICAL_SPRITES = criticalSpriteEntries();
const DEFERRED_SPRITES = deferredSpriteEntries();

// Avvia SUBITO il fetch dei deferred (non blocca), da chiamare dopo il primo frame.
function startDeferredPreload(): void {
  preloadSprites(rosterSpriteEntries(), true);
  preloadSprites(DEFERRED_SPRITES, true);
  preloadSprites(lateSpriteEntries(), true);
}

let core: Promise<void> | null = null;
/** Starts the pictures of the first map (once) and resolves when they are in, or after eight seconds. */
export function preloadCoreSprites(): Promise<void> {
  return core ??= loadCore();
}

function loadCore(): Promise<void> {
  preloadSprites(CRITICAL_SPRITES);
  return waitForSprites(Object.keys(CRITICAL_SPRITES), 8000).finally(() => {
    // Il resto parte in sfondo: se il browser ha requestIdleCallback lo usa,
    // altrimenti un microtask dopo il primo frame.
    const kick = () => startDeferredPreload();
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(kick, { timeout: 2000 });
    } else {
      setTimeout(kick, 0);
    }
  });
}

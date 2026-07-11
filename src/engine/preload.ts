import { preloadSprites, waitForSprites } from "./assets";
import { BAG_ORDER } from "../data/items";
import { MONSTERS_WITH_PNG } from "../art/monsters";
import { ITEMS_WITH_PNG } from "../art/items";

const DIRS = ["south", "north", "east", "west"] as const;
const NPCS = [
  "professor",
  "guard",
  "kid",
  "journalist",
  "boss",
  "granny",
  "rival",
  "influencer",
  "aide",
  "barista"
] as const;
const VEHICLES = ["auto", "ruspa", "monopattino"] as const;

// Sprite che il PRIMO frame mostra davvero (mappa iniziale "borgo": terreno,
// edifici, player fermo). Il boot ASPETTA solo questi → schermata CARICAMENTO
// breve anche su rete lenta. Tutto il resto (frame di camminata NPC, mostri, item,
// veicoli) parte in preload di SFONDO non bloccante: getSpriteImage è lazy, quindi
// se un asset non è ancora pronto usa il fallback per un frame senza crashare.
function criticalSpriteEntries(): Record<string, string> {
  const entries: Record<string, string> = {
    "tile:.": "tiles/grass_flat.png",
    "tile:=": "tiles/path_flat.png",
    "tile:z": "tiles/sand.png",
    "tile:w": "tiles/water.png",
    "tile:i": "tiles/snow_floor.png",
    "tile:I": "tiles/snow_drift.png",
    "tile:p": "tiles/floor_wood.png",
    "tile:A": "tiles/wall_interior.png",
    "tile:c": "tiles/doormat.png",
    "tile:^": "tiles/cliff_sand.png",
    "tile:l": "tiles/stairs_sand.png",
    "tile:j": "tiles/deck_asphalt.png",
    "tile:O": "tiles/cave_mouth.png",
    "tile:R": "tiles/cave_boulder.png",
    "tile:S": "tiles/cave_stalagmite.png",
    "tile:N": "tiles/snow_pine.png",
    "obj:T": "tiles/tree.png",
    "obj:s": "tiles/sign.png",
    "obj:f": "tiles/fence.png",
    "obj:L": "tiles/obj_bed.png",
    "obj:t": "tiles/obj_table.png",
    "obj:b": "tiles/obj_shelf.png",
    "obj:P": "tiles/obj_plant.png",
    "obj:h": "tiles/obj_counter.png",
    "obj:k": "tiles/obj_machine.png",
    "obj:~": "tiles/obj_tallgrass.png",
    "obj:,": "tiles/obj_flowers.png",
    "obj:J": "tiles/obj_girder.png",
    "obj:K": "tiles/obj_crane.png",
    "obj:g": "tiles/obj_golddoor.png",
    "obj:W": "tiles/obj_fountain.png",
    "obj:Y": "tiles/obj_statue.png",
    "obj:U": "tiles/obj_bench.png",
    "build:r:tiles/build_house_front_red.png": "tiles/build_house_front_red.png",
    "build:H:tiles/build_house_front_brick.png": "tiles/build_house_front_brick.png",
    "build:v:tiles/build_house_front_blue.png": "tiles/build_house_front_blue.png",
    "build:o:tiles/build_house_front_green.png": "tiles/build_house_front_green.png",
    "build:!:tiles/build_circolo_front.png": "tiles/build_circolo_front.png",
    "build:?:tiles/build_apartment_front.png": "tiles/build_apartment_front.png",
    "build:@:tiles/build_kiosk_front.png": "tiles/build_kiosk_front.png",
    "build:u:tiles/build_lab_front.png": "tiles/build_lab_front.png",
    "build:e:tiles/build_bar_front.png": "tiles/build_bar_front.png",
    "build:Q:tiles/build_bar_front.png": "tiles/build_bar_front.png",
    "build:y:tiles/build_gym_front.png": "tiles/build_gym_front.png",
    "build:B:tiles/build_gym_front.png": "tiles/build_gym_front.png",
    "build:x:tiles/build_gym_front.png": "tiles/build_gym_front.png",
    "build:$:tiles/build_casino_front.png": "tiles/build_casino_front.png",
    "build:M:tiles/build_palace.png": "tiles/build_palace.png",
    "build:x:tiles/build_studio_front.png": "tiles/build_studio_front.png",
    "build:y:tiles/build_bistro_front.png": "tiles/build_bistro_front.png",
    "veh:ferry": "chars/ferry.png",
    "char:schettino": "chars/schettino.png",
    // Superfici aperte spesso dal menu: evitare un primo frame con il fallback
    // mentre PixelLab decodifica la cartina o la tessera.
    "ui:world-campaign-map": "ui/world_campaign_map.png",
    "ui:candidate-card": "ui/candidate_card.png",
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

// Tutto ciò che NON serve al primo frame: frame di camminata (player+NPC),
// veicoli, item, mostri. Precaricato in sfondo, mai atteso dal boot.
function deferredSpriteEntries(): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const dir of DIRS) {
    for (let frame = 0; frame < 4; frame += 1) {
      entries[`player:${dir}:w${frame}`] = `chars/player_${dir}_w${frame}.png`;
    }
    for (const vehicle of VEHICLES) {
      entries[`veh:${vehicle}:${dir}`] = `chars/${vehicle}_${dir}.png`;
    }
    for (const npc of NPCS) {
      for (let frame = 0; frame < 4; frame += 1) {
        entries[`npc:${npc}:${dir}:w${frame}`] = `chars/npc_${npc}_${dir}_w${frame}.png`;
      }
    }
  }

  // Solo gli item con PNG (i nuovi item R39 senza icona userebbero un path 404).
  for (const itemId of BAG_ORDER) {
    if (ITEMS_WITH_PNG.has(itemId)) {
      entries[`item:${itemId}`] = `items/${itemId}.png`;
    }
  }

  // Mostri: precarica gli sprite PixelLab così la prima battaglia/Dex non mostra
  // per un frame il fallback pixmap (il "design vecchio" che lampeggia).
  for (const speciesId of MONSTERS_WITH_PNG) {
    entries[`mon:${speciesId}`] = `monsters/${speciesId}.png`;
  }

  return entries;
}

const CRITICAL_SPRITES = criticalSpriteEntries();
const DEFERRED_SPRITES = deferredSpriteEntries();

// Avvia SUBITO il fetch dei deferred (non blocca), da chiamare dopo il primo frame.
function startDeferredPreload(): void {
  preloadSprites(DEFERRED_SPRITES);
}

export function preloadCoreSprites(): Promise<void> {
  preloadSprites(CRITICAL_SPRITES);
  // Il boot aspetta solo il set critico (timeout più corto: è un decimo degli asset).
  return waitForSprites(Object.keys(CRITICAL_SPRITES), 4000).finally(() => {
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

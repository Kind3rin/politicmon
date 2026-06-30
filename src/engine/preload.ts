import { preloadSprites, waitForSprites } from "./assets";

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

function coreSpriteEntries(): Record<string, string> {
  const entries: Record<string, string> = {
    "tile:.": "tiles/grass_flat.png",
    "tile:=": "tiles/path_flat.png",
    "tile:z": "tiles/sand.png",
    "tile:w": "tiles/water.png",
    "tile:i": "tiles/snow_floor.png",
    "tile:I": "tiles/snow_drift.png",
    "tile:p": "tiles/floor_wood.png",
    "tile:A": "tiles/wall_interior.png",
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
    "char:schettino": "chars/schettino.png"
  };

  for (const dir of DIRS) {
    entries[`player:${dir}`] = `chars/player_${dir}.png`;
    for (let frame = 0; frame < 4; frame += 1) {
      entries[`player:${dir}:w${frame}`] = `chars/player_${dir}_w${frame}.png`;
    }
    for (const vehicle of VEHICLES) {
      entries[`veh:${vehicle}:${dir}`] = `chars/${vehicle}_${dir}.png`;
    }
    for (const npc of NPCS) {
      entries[`npc:${npc}:${dir}`] = `chars/npc_${npc}_${dir}.png`;
      for (let frame = 0; frame < 4; frame += 1) {
        entries[`npc:${npc}:${dir}:w${frame}`] = `chars/npc_${npc}_${dir}_w${frame}.png`;
      }
    }
  }

  return entries;
}

const CORE_SPRITES = coreSpriteEntries();

export function preloadCoreSprites(): Promise<void> {
  preloadSprites(CORE_SPRITES);
  return waitForSprites(Object.keys(CORE_SPRITES), 2200);
}

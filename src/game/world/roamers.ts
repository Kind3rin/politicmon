import type { Facing } from "../../art/characters";

/** How a wild candidate behaves while the player is near. Fixed per individual. */
export type RoamerMood = "wander" | "flee" | "chase" | "sleep";

export interface Roamer {
  id: number;
  speciesId: string;
  level: number;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  /** 0..1 while hopping between two tiles, 1 when standing. */
  t: number;
  facing: Facing;
  mood: RoamerMood;
  wait: number;
  /** Seconds left of the "!" bubble that shows a chaser noticed the player. */
  alert: number;
  noticed: boolean;
  /** A rare candidate: golden, always runs away, pays well when caught. Fixed per individual. */
  rare?: boolean;
  /** Drawn here by a rally: it comes straight at the player and the player keeps the first move. */
  lured?: boolean;
}

export interface RoamerWorld {
  width: number;
  height: number;
  /** Tall grass: the only ground a wild candidate walks on. */
  isGrass(x: number, y: number): boolean;
  /** Free for a candidate: no wall, NPC, warp or item on it. */
  isOpen(x: number, y: number): boolean;
}

export interface RoamerSpawn {
  speciesId: string;
  weight: number;
  minLv: number;
  maxLv: number;
}

export interface PlayerSpot {
  x: number;
  y: number;
  facing: Facing;
}

export type Advantage = "player" | "foe";

export interface Contact {
  roamer: Roamer;
  advantage?: Advantage;
}

const STEP: Record<Facing, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const FACINGS: Facing[] = ["up", "down", "left", "right"];
const MOODS: RoamerMood[] = ["wander", "wander", "wander", "flee", "chase", "sleep"];
/** About one candidate in twelve is rare. A function of the id, so it never disturbs the random sequence. */
export function isRareRoamer(id: number): boolean { return (Math.imul(id, 2654435761) >>> 0) % 100 < 8; }
export const CHASE_RANGE = 5;
export const FLEE_RANGE = 4;

const distance = (ax: number, ay: number, bx: number, by: number): number => Math.abs(ax - bx) + Math.abs(ay - by);

/** Number of candidates a map holds at once, from its amount of tall grass. */
export function roamerTarget(grassTiles: number): number {
  if (grassTiles < 6) return 0;
  return Math.max(2, Math.min(6, Math.round(grassTiles / 10)));
}

export function facingToward(fromX: number, fromY: number, toX: number, toY: number): Facing {
  const dx = toX - fromX, dy = toY - fromY;
  return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
}

/** Wild candidates walking in the tall grass. Pure logic: no drawing, no battles. */
export class RoamerField {
  roamers: Roamer[] = [];
  private nextId = 1;
  private respawn = 0;

  constructor(private world: RoamerWorld, private table: readonly RoamerSpawn[], private rng: () => number = Math.random) {}

  private occupied(x: number, y: number, self?: Roamer): boolean {
    return this.roamers.some(other => other !== self && ((other.x === x && other.y === y) || (other.t < 1 && other.fromX === x && other.fromY === y)));
  }

  private pickSpecies(): RoamerSpawn | undefined {
    const total = this.table.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.rng() * total;
    for (const entry of this.table) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }
    return this.table[this.table.length - 1];
  }

  /** Put one candidate on a grass tile away from the player. */
  spawnOne(player: PlayerSpot, minDistance = 6): Roamer | null {
    const entry = this.pickSpecies();
    if (!entry) return null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const x = Math.floor(this.rng() * this.world.width), y = Math.floor(this.rng() * this.world.height);
      if (!this.world.isGrass(x, y) || !this.world.isOpen(x, y) || this.occupied(x, y)) continue;
      if (distance(x, y, player.x, player.y) < minDistance) continue;
      const id = this.nextId++, rare = isRareRoamer(id);
      const roamer: Roamer = {
        id, rare, speciesId: entry.speciesId,
        level: entry.minLv + Math.floor(this.rng() * (entry.maxLv - entry.minLv + 1)),
        x, y, fromX: x, fromY: y, t: 1, facing: FACINGS[Math.floor(this.rng() * 4)],
        mood: rare ? "flee" : MOODS[Math.floor(this.rng() * MOODS.length)], wait: 0.4 + this.rng() * 1.6, alert: 0, noticed: false
      };
      this.roamers.push(roamer);
      return roamer;
    }
    return null;
  }

  /** A rally: put candidates on grass close by (`near` to `far` tiles away); they come straight over. Returns how many arrived. */
  lure(player: PlayerSpot, count: number, near = 3, far = 8): Roamer[] {
    const spots: [number, number][] = [];
    for (let y = Math.max(0, player.y - far); y <= Math.min(this.world.height - 1, player.y + far); y += 1)
      for (let x = Math.max(0, player.x - far); x <= Math.min(this.world.width - 1, player.x + far); x += 1) {
        const d = distance(x, y, player.x, player.y);
        if (d >= near && d <= far && this.world.isGrass(x, y) && this.world.isOpen(x, y) && !this.occupied(x, y)) spots.push([x, y]);
      }
    const arrived: Roamer[] = [];
    for (let i = 0; i < count && spots.length; i += 1) {
      const entry = this.pickSpecies();
      if (!entry) break;
      const [x, y] = spots.splice(Math.floor(this.rng() * spots.length), 1)[0];
      const id = this.nextId++;
      const roamer: Roamer = { id, speciesId: entry.speciesId, level: entry.minLv + Math.floor(this.rng() * (entry.maxLv - entry.minLv + 1)),
        x, y, fromX: x, fromY: y, t: 1, facing: facingToward(x, y, player.x, player.y), mood: "chase", wait: .35 + i * .3, alert: 1.1, noticed: true, lured: true };
      this.roamers.push(roamer); arrived.push(roamer);
    }
    return arrived;
  }

  fill(count: number, player: PlayerSpot): void {
    while (this.roamers.length < count && this.spawnOne(player, 5)) { /* grass may run out: stop quietly */ }
  }

  remove(roamer: Roamer): void {
    this.roamers = this.roamers.filter(other => other !== roamer);
    this.respawn = 8 + this.rng() * 8;
  }

  private tryStep(roamer: Roamer, facing: Facing, player: PlayerSpot): boolean {
    const [dx, dy] = STEP[facing], nx = roamer.x + dx, ny = roamer.y + dy;
    roamer.facing = facing;
    if (nx < 0 || ny < 0 || nx >= this.world.width || ny >= this.world.height) return false;
    if (!this.world.isGrass(nx, ny) || !this.world.isOpen(nx, ny) || this.occupied(nx, ny, roamer)) return false;
    if (nx === player.x && ny === player.y) return false;
    roamer.fromX = roamer.x; roamer.fromY = roamer.y; roamer.x = nx; roamer.y = ny; roamer.t = 0;
    return true;
  }

  private stepToward(roamer: Roamer, target: PlayerSpot, away: boolean, player: PlayerSpot): boolean {
    const dx = target.x - roamer.x, dy = target.y - roamer.y;
    const horizontal: Facing = dx < 0 ? "left" : "right", vertical: Facing = dy < 0 ? "up" : "down";
    const order: Facing[] = Math.abs(dx) >= Math.abs(dy) ? [horizontal, vertical] : [vertical, horizontal];
    const flip = (f: Facing): Facing => (f === "left" ? "right" : f === "right" ? "left" : f === "up" ? "down" : "up");
    const wanted = away ? order.map(flip) : order;
    for (const facing of wanted) if (facing && (away || (facing === horizontal ? dx !== 0 : dy !== 0)) && this.tryStep(roamer, facing, player)) return true;
    return false;
  }

  /** Advance the candidates. `scared` (repellent active) makes every one keep its distance. */
  update(dt: number, player: PlayerSpot, scared: boolean, target: number): void {
    for (const roamer of this.roamers) {
      roamer.alert = Math.max(0, roamer.alert - dt);
      if (roamer.t < 1) {
        const speed = roamer.mood === "chase" && roamer.noticed ? 5.5 : roamer.mood === "flee" ? 5 : 3;
        roamer.t = Math.min(1, roamer.t + dt * speed);
        continue;
      }
      roamer.wait -= dt;
      if (roamer.wait > 0) continue;
      const near = distance(roamer.x, roamer.y, player.x, player.y);
      if (scared && near <= FLEE_RANGE + 2) {
        this.stepToward(roamer, player, true, player);
        roamer.wait = 0.15;
        continue;
      }
      if (roamer.mood === "chase" && (near <= CHASE_RANGE || roamer.lured)) {
        if (!roamer.noticed) { roamer.noticed = true; roamer.alert = 0.9; roamer.wait = 0.5; continue; }
        this.stepToward(roamer, player, false, player);
        roamer.wait = 0.05;
        continue;
      }
      if (roamer.mood === "chase") roamer.noticed = false;
      if (roamer.mood === "flee" && near <= FLEE_RANGE) {
        this.stepToward(roamer, player, true, player);
        roamer.wait = 0.1;
        continue;
      }
      if (roamer.mood === "sleep") { roamer.wait = 1; continue; }
      if (this.rng() < 0.7) this.tryStep(roamer, FACINGS[Math.floor(this.rng() * 4)], player);
      roamer.wait = 0.7 + this.rng() * 1.8;
    }
    if (this.roamers.length < target) {
      this.respawn -= dt;
      if (this.respawn <= 0) { this.spawnOne(player, 7); this.respawn = 6 + this.rng() * 8; }
    }
  }

  /** Closest candidate touching the player, with who gets the first move. */
  contact(player: PlayerSpot, scared: boolean): Contact | null {
    if (scared) return null;
    let best: Contact | null = null;
    let bestDistance = 2;
    for (const roamer of this.roamers) {
      if (roamer.t < 1) continue;
      const d = distance(roamer.x, roamer.y, player.x, player.y);
      if (d > 1 || d >= bestDistance) continue;
      bestDistance = d;
      const towardRoamer = facingToward(player.x, player.y, roamer.x, roamer.y);
      const playerFacesIt = player.facing === towardRoamer;
      const itFacesAway = roamer.facing === towardRoamer;
      let advantage: Advantage | undefined;
      if (roamer.lured || roamer.mood === "sleep" || (playerFacesIt && itFacesAway && roamer.mood !== "chase")) advantage = "player";
      else if (roamer.mood === "chase" && roamer.noticed && !playerFacesIt) advantage = "foe";
      best = { roamer, advantage };
    }
    return best;
  }
}

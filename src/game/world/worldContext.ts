import type { GameState } from "../state";
import type { AllyId } from "../coalition";
import type { DiplomacyChoice } from "../diplomacyChapter";
import type { DistrictId } from "../election";

export type WorldSceneId = "shop" | "casino" | "box" | "mafia" | "monument";

// Porta minima per controller di dominio: niente WorldScene, Screen, Input o audio.
// La scena traduce questi comandi in effetti UI/lifecycle.
export type WorldCommand =
  | { kind: "say"; lines: string[] }
  | { kind: "setFlag"; flag: string }
  | { kind: "openScene"; scene: WorldSceneId }
  | { kind: "openCoalition"; focus: AllyId }
  | { kind: "openPhotoChoice" }
  | { kind: "openFutureChoice" }
  | { kind: "openDiplomacyChoice"; initial: DiplomacyChoice }
  | { kind: "openGenovaTechno" }
  | { kind: "openDistrict"; districtId: DistrictId }
  | { kind: "openElectionNight" }
  | { kind: "openWeeklyCampaign" }
  | { kind: "openSliceEnding" }
  | { kind: "startTrainer"; trainerId: string; rematch: boolean };

export interface WorldContext {
  readonly state: GameState;
  dispatch(command: WorldCommand): void;
}

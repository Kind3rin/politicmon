import type { GameState } from "./state";

export type Atto3EndingId = "government_cohesive" | "government_fractured" | "opposition_cohesive" | "opposition_fractured";

export interface Atto3EndingDef {
  readonly id: Atto3EndingId;
  readonly title: string;
  readonly subtitle: string;
  readonly lines: readonly string[];
  readonly cosmeticFlag: string;
}

export const ATTO3_ENDINGS: Readonly<Record<Atto3EndingId, Atto3EndingDef>> = {
  government_cohesive: {
    id: "government_cohesive", title: "GOVERNO DI COALIZIONE", subtitle: "MAGGIORANZA COESA",
    lines: ["I NUMERI REGGONO E, PER UNA VOLTA, ANCHE IL TAVOLO.", "GLI ALLEATI FIRMANO LO STESSO COMUNICATO SENZA NOTE A MARGINE."],
    cosmeticFlag: "cosmetic-fascia-governo"
  },
  government_fractured: {
    id: "government_fractured", title: "GOVERNO A TEMPO", subtitle: "MAGGIORANZA FRATTURATA",
    lines: ["HAI I SEGGI. TI MANCANO SOLTANTO LE STESSE OPINIONI.", "IL PRIMO CONSIGLIO DURA PIÙ DELLA CAMPAGNA E FINISCE CON TRE CONFERENZE."],
    cosmeticFlag: "cosmetic-campanella-crisi"
  },
  opposition_cohesive: {
    id: "opposition_cohesive", title: "OPPOSIZIONE COMPATTA", subtitle: "MINORANZA COESA",
    lines: ["NON HAI LA MAGGIORANZA, MA HAI ANCORA UNA SQUADRA.", "IL GOVERNO FESTEGGIA. VOI PRENOTATE GIÀ IL PRIMO QUESTION TIME."],
    cosmeticFlag: "cosmetic-megafono-opposizione"
  },
  opposition_fractured: {
    id: "opposition_fractured", title: "GRUPPO MISTISSIMO", subtitle: "MINORANZA FRATTURATA",
    lines: ["POCHI SEGGI, MOLTE SIGLE E UN CORRIDOIO PIENO DI NUOVI SIMBOLI.", "NON È UNA SCONFITTA: È UNA COSTELLAZIONE PARLAMENTARE."],
    cosmeticFlag: "cosmetic-tessera-gruppo-misto"
  }
};

export function deriveAtto3Ending(state: GameState): Atto3EndingDef | null {
  const result = state.election.result;
  if (!result) return null;
  const fractured = state.coalition.members.some((member) => member.status === "strained")
    || Object.keys(state.flags).some((flag) => flag.startsWith("coalition-broken:") && state.flags[flag]);
  return ATTO3_ENDINGS[`${result.ending}_${fractured ? "fractured" : "cohesive"}`];
}

export function applyAtto3EndingReward(state: GameState, ending: Atto3EndingDef): boolean {
  if (state.flags.atto3Complete) return false;
  state.flags.atto3Complete = true;
  state.flags[`endingId:${ending.id}`] = true;
  state.flags[ending.cosmeticFlag] = true;
  state.flags[ending.id.startsWith("government") ? "postgame-government" : "postgame-opposition"] = true;
  state.money += 2500;
  state.bag.schedona = (state.bag.schedona ?? 0) + 2;
  return true;
}

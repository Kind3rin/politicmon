import { ITEMS } from "../data/items";
import { TRAINERS } from "../data/trainers";
import { GYM_REMATCH_COOLDOWN_STEPS, REMATCH_COOLDOWN_STEPS } from "./rematch";
import { COPPA_FEE, COPPA_FIRST_PRIZE, COPPA_REPEAT_PRIZE } from "./tournament";
import { newWeeklyCampaignState, weeklyReward } from "./weeklyCampaign";

export interface EconomyCheck { readonly id: string; readonly ok: boolean; readonly detail: string; }

export function economyChecks(): EconomyCheck[] {
  const low = weeklyReward({ ...newWeeklyCampaignState(), phase: "complete", score: -30 });
  const high = weeklyReward({ ...newWeeklyCampaignState(), phase: "complete", score: 30 });
  const cheapestHeal = Math.min(...Object.values(ITEMS).filter((item) => item.kind === "heal" && item.price !== undefined).map((item) => item.price as number));
  const trainerPayouts = Object.values(TRAINERS).map((trainer) => trainer.money);
  return [
    { id: "coppa-repeat-sink", ok: COPPA_REPEAT_PRIZE.money < COPPA_FEE, detail: `ripetibile ${COPPA_REPEAT_PRIZE.money}-${COPPA_FEE}=${COPPA_REPEAT_PRIZE.money - COPPA_FEE}€` },
    { id: "coppa-first-bounded", ok: COPPA_FIRST_PRIZE.money <= COPPA_FEE * 2, detail: `prima vittoria ${COPPA_FIRST_PRIZE.money}€, quota ${COPPA_FEE}€` },
    { id: "weekly-bounded", ok: low.money >= 0 && high.money <= 2000 && high.money > low.money, detail: `premi ${low.money}-${high.money}€ per 9 stage` },
    { id: "starter-affordability", ok: cheapestHeal <= 100, detail: `cura base ${cheapestHeal}€, fondi iniziali 500€` },
    { id: "trainer-payouts-positive", ok: trainerPayouts.every((value) => Number.isFinite(value) && value >= 0), detail: `${trainerPayouts.length} payout non negativi` },
    { id: "rematch-time-cost", ok: REMATCH_COOLDOWN_STEPS >= 500 && GYM_REMATCH_COOLDOWN_STEPS >= 1200, detail: `cooldown ${REMATCH_COOLDOWN_STEPS}/${GYM_REMATCH_COOLDOWN_STEPS} passi` },
    { id: "boost-money-sink", ok: (ITEMS.spotprimetime.price ?? 0) >= 2500 && ITEMS.spotprimetime.boost?.battles === 10, detail: `spot ${ITEMS.spotprimetime.price}€ / ${ITEMS.spotprimetime.boost?.battles} battaglie` }
  ];
}

import { hashDate, localDateKey } from "./daily";
import type { GameState } from "./state";

export const FUEL_MAX = 40;
export const FUEL_START = 18;
/** Steps ridden on a scooter or car for each litre burnt. */
export const RIDE_STEPS_PER_LITRE = 14;
/** The blue car's trip between cities. */
export const TRIP_LITRES = 6;

export function clampFuel(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(FUEL_MAX, Math.floor(value))) : FUEL_START;
}

/** Price per litre in cents: the same for everyone on the same day, a little dearer in town. */
export function fuelPrice(dateKey: string = localDateKey(), mapId = ""): number {
  const day = hashDate(`fuel:${dateKey}`) % 101;
  const place = hashDate(`pump:${mapId}`) % 21;
  return 160 + Math.round(day * 1.1) + place;
}

export const eur = (cents: number): string => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

/** One line of commentary that tracks the price, so the number reads as news. */
export function priceLine(cents: number): string {
  if (cents < 190) return "Prezzo in calo: il comunicato parla di «svolta». Il cartello, di lunedì.";
  if (cents < 230) return "Prezzo «stabile». Stabile come il ponte.";
  if (cents < 255) return "Accise in aggiornamento: il rincaro è «temporaneo» da undici anni.";
  return "Prezzo record. Il ministero invita a «valutare la bicicletta».";
}

export interface FuelQuote { litres: number; cents: number; total: number }

/** What a request really buys: limited by tank room and by money. */
export function fuelQuote(state: Pick<GameState, "fuel" | "money">, wanted: number, cents: number): FuelQuote {
  const room = Math.max(0, FUEL_MAX - state.fuel);
  const affordable = Math.floor(state.money / cents * 100);
  const litres = Math.max(0, Math.min(wanted, room, affordable));
  return { litres, cents, total: Math.ceil(litres * cents / 100) };
}

export function buyFuel(state: GameState, quote: FuelQuote): boolean {
  if (quote.litres <= 0 || quote.total > state.money || state.fuel + quote.litres > FUEL_MAX) return false;
  state.money -= quote.total;
  state.fuel += quote.litres;
  return true;
}

export const ridesOnFuel = (vehicle: string | null): boolean => vehicle === "monopattino" || vehicle === "auto";

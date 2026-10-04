import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import type { GameState } from "../game/state";
import { FUEL_MAX, TRIP_LITRES, eur, fuelPrice } from "../game/fuel";
import { FuelScene } from "./FuelScene";
import { TRANSPORT_DESTINATIONS, resolveTransportDestination, transportRequirement, type TransportDestination } from "../game/world/transport";
import type { UiPanel } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";

export class TransportScene implements Scene {
  readonly transparent = false;
  private selected?: TransportDestination;
  private closed = false;
  constructor(private stack: SceneStack, private input: Input, private state: GameState,
    private currentMapId: string, private travel: (dest: TransportDestination) => void) {}

  private depart(destination: TransportDestination): void {
    if (this.closed || this.stack.top !== this || this.selected !== destination) return;
    const available = resolveTransportDestination(this.state, this.currentMapId, destination.mapId);
    if (!available || this.state.fuel < TRIP_LITRES) { this.selected = undefined; this.input.reset(); audio.cancel(); return; }
    this.state.fuel -= TRIP_LITRES;
    this.closed = true; this.input.reset(); audio.confirm(); this.stack.pop(); this.travel(available);
  }
  get uiPanel(): UiPanel {
    const selected = this.selected;
    const back = { label: "Indietro", run: () => {
      if (this.closed || this.stack.top !== this || this.selected !== selected) return;
      this.input.reset(); audio.cancel();
      if (selected) this.selected = undefined;
      else { this.closed = true; this.stack.pop(); }
    } };
    if (selected) return {
      title: `Viaggio a ${readableCopy(selected.label)}`,
      subtitle: "La scorta è spesata. La benzina no.",
      image: "/sprites/ui/desk/transport.png", imageHeight: 112,
      blocks: [
        { title: "Prima di partire", facts: [{ label: "Carburante", value: `${TRIP_LITRES} L` }, { label: "Serbatoio dopo", value: `${this.state.fuel} → ${Math.max(0, this.state.fuel - TRIP_LITRES)} L` }],
          body: "Arrivi vicino al Bar Sport. Il viaggio non cura la squadra." },
        { title: "Il viaggio", body: "Non consuma oggetti, fiche o scadenze delle promesse. I compagni mantengono PV, PP e status." }
      ], actions: [{ label: "Parti", hint: `Vai a ${readableCopy(selected.label)}.`,
        disabled: !resolveTransportDestination(this.state, this.currentMapId, selected.mapId) || this.state.fuel < TRIP_LITRES, run: () => this.depart(selected) }], primary: 0, back
    };
    return {
      title: "Auto blu", subtitle: "Scegli la città. Prima di partire puoi controllare il viaggio.",
      compact: true, stats: [{ label: "Serbatoio", value: this.state.fuel, max: FUEL_MAX }],
      actions: [{ label: "Fai il pieno", row: { kind: "item", right: eur(fuelPrice(undefined, this.currentMapId)), meta: "Prezzo di oggi al litro" },
        run: () => { if (this.closed || this.stack.top !== this || this.selected) return; this.input.reset(); audio.confirm(); this.stack.push(new FuelScene(this.stack, this.input, this.state, this.currentMapId)); } },
        ...TRANSPORT_DESTINATIONS.map(destination => {
        const allowed = Boolean(resolveTransportDestination(this.state, this.currentMapId, destination.mapId));
        const thirsty = allowed && this.state.fuel < TRIP_LITRES;
        return { label: readableCopy(destination.label),
          hint: thirsty ? `Servono ${TRIP_LITRES} litri: ne hai ${this.state.fuel}.` : allowed ? "Arrivo vicino al Bar Sport." : readableCopy(transportRequirement(this.state, this.currentMapId, destination)),
          facts: [{ label: "Stato", value: destination.mapId === this.currentMapId ? "Sei qui" : allowed ? "Disponibile" : "Da sbloccare" },
            { label: "Costo", value: `${TRIP_LITRES} L` }], disabled: !allowed || thirsty,
          run: () => {
            if (this.closed || this.stack.top !== this || this.selected || !resolveTransportDestination(this.state, this.currentMapId, destination.mapId) || this.state.fuel < TRIP_LITRES) return;
            this.selected = destination; this.input.reset(); audio.confirm();
          } };
      })], back
    };
  }
  update(): void {}
  draw(screen: Screen): void { screen.clear("#112037"); }
}

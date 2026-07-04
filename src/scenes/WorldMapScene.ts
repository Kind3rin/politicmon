import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { GREY, INK, PAPER } from "../ui/widgets";

// MINIMAPPA A NODI (Round 40): una mappa del mondo schematica dal menu pausa.
// Nodi = aree principali con coordinate hardcoded leggibili a 240x180, linee di
// collegamento, nodo corrente lampeggiante, aree ancora bloccate = "???".
// Nessun asset nuovo, nessuna nuova migrazione: il gating deriva da badges/flags.

interface MapNode {
  id: string; // corrisponde a un mapId (o gruppo di mappe per il "sei qui")
  label: string;
  x: number;
  y: number;
  // Alias di mapId che contano come "sei qui" su questo nodo (interni inclusi).
  maps?: string[];
  // Se presente, il nodo è nascosto ("???") finché la condizione non è vera.
  unlocked?: (s: GameState) => boolean;
}

// Layout schematico: la dorsale della storia scorre in diagonale, le aree
// opzionali si diramano. Coordinate pensate per stare comode a 240x180.
const NODES: MapNode[] = [
  { id: "borgo", label: "BORGO", x: 30, y: 40, maps: ["borgo", "home", "lab", "bar"] },
  { id: "route1", label: "PERC.1", x: 62, y: 55 },
  { id: "grotta1", label: "GROTTA", x: 40, y: 78, maps: ["grotta1"] },
  { id: "mediopoli", label: "MEDIOPOLI", x: 95, y: 62, maps: ["mediopoli", "market", "gym", "bar-medio"] },
  { id: "route2", label: "PERC.2", x: 120, y: 48 },
  { id: "eurotown", label: "EUROTOWN", x: 150, y: 40, maps: ["eurotown", "gymue", "market2", "lobbystudio", "bistrot", "bar-euro"] },
  { id: "route3", label: "PERC.3", x: 178, y: 55 },
  { id: "grotta2", label: "ARCHIVIO", x: 158, y: 78, maps: ["grotta2"] },
  { id: "capitale", label: "CAPUT MUNDI", x: 200, y: 74, maps: ["capitale", "casino", "market3", "gymca", "palazzo"] },
  {
    id: "stretto", label: "STRETTO", x: 200, y: 118, maps: ["stretto"],
    unlocked: (s) => s.badges.length >= 3
  },
  {
    id: "colle", label: "IL COLLE", x: 150, y: 108, maps: ["colle"],
    unlocked: (s) => Boolean(s.flags["boss-beaten"])
  },
  {
    id: "offshore", label: "OFFSHORE", x: 108, y: 118, maps: ["offshore"],
    unlocked: (s) => Boolean(s.flags["garante-beaten"])
  }
];

// Collegamenti tra nodi (per id). Le aree gated mostrano la linea solo se sbloccate.
const LINKS: Array<[string, string]> = [
  ["borgo", "route1"],
  ["route1", "grotta1"],
  ["route1", "mediopoli"],
  ["mediopoli", "route2"],
  ["route2", "eurotown"],
  ["eurotown", "route3"],
  ["route3", "grotta2"],
  ["route3", "capitale"],
  ["capitale", "stretto"],
  ["capitale", "colle"],
  ["capitale", "offshore"]
];

export class WorldMapScene implements Scene {
  private time = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {}

  update(dt: number): void {
    this.time += dt;
    if (this.input.wasPressed("a") || this.input.wasPressed("b") || this.input.wasPressed("start")) {
      audio.cancel();
      this.stack.pop();
    }
  }

  private isUnlocked(node: MapNode): boolean {
    return !node.unlocked || node.unlocked(this.state);
  }

  private nodeById(id: string): MapNode {
    return NODES.find((n) => n.id === id)!;
  }

  // Linea punteggiata tra due nodi (Screen non ha drawLine): campiona punti
  // lungo il segmento e disegna pixel 1x1. Passo 2px = tratteggio leggero.
  private dottedLine(screen: Screen, x0: number, y0: number, x1: number, y1: number, color: string): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(1, Math.round(Math.hypot(dx, dy) / 2));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      screen.rect(Math.round(x0 + dx * t), Math.round(y0 + dy * t), 1, 1, color);
    }
  }

  // Il nodo su cui si trova il giocatore (match mapId diretto o via alias).
  private currentNodeId(): string {
    const mapId = this.state.pos.mapId;
    for (const node of NODES) {
      if (node.id === mapId || node.maps?.includes(mapId)) {
        return node.id;
      }
    }
    return "";
  }

  draw(screen: Screen): void {
    screen.clear("#1b2436");
    screen.text("MAPPA DELL'ITALIETTA", 8, 6, PAPER);

    const current = this.currentNodeId();

    // Linee di collegamento (sotto ai nodi). Le tratte gated sbucano solo quando
    // l'area di arrivo è sbloccata.
    for (const [aId, bId] of LINKS) {
      const a = this.nodeById(aId);
      const b = this.nodeById(bId);
      if (!this.isUnlocked(a) || !this.isUnlocked(b)) {
        continue;
      }
      this.dottedLine(screen, a.x, a.y, b.x, b.y, "#4a5a73");
    }

    // Nodi.
    for (const node of NODES) {
      const unlocked = this.isUnlocked(node);
      const isHere = node.id === current;
      // Nodo corrente: lampeggia. Bloccato: pallino grigio + "???".
      const blink = isHere && Math.floor(this.time * 3) % 2 === 0;
      const fill = !unlocked ? "#555f70" : isHere ? (blink ? "#ffe98a" : "#e8c84a") : "#7ad858";
      screen.rect(node.x - 3, node.y - 3, 6, 6, fill);
      screen.frame(node.x - 3, node.y - 3, 6, 6, INK);
      const label = unlocked ? node.label : "???";
      const color = !unlocked ? GREY : isHere ? "#ffe98a" : PAPER;
      // Etichetta: sopra i nodi in basso, sotto gli altri, per non uscire dallo schermo.
      const below = node.y > VIEW_H - 30;
      const ly = below ? node.y - 12 : node.y + 6;
      const lw = label.length * 6;
      let lx = node.x - lw / 2;
      lx = Math.max(2, Math.min(VIEW_W - lw - 2, lx));
      screen.text(label, lx, ly, color);
    }

    // Legenda + "SEI QUI".
    if (current) {
      const here = this.nodeById(current);
      screen.text(`SEI QUI: ${this.isUnlocked(here) ? here.label : "???"}`, 8, VIEW_H - 20, "#ffe98a");
    }
    screen.text("??? = AREA DA SBLOCCARE   A/B: CHIUDI", 8, VIEW_H - 10, GREY);
  }
}

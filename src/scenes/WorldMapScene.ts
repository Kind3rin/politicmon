import { audio } from "../engine/audio";
import { sceneImage } from "../engine/assets";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { clipToWidth, drawScreenHeader, GREY, PAPER } from "../ui/widgets";

// Coordinate solo per i marker dinamici. La geografia, le coste e le rotte sono
// nella cartina PixelLab; non si ridisegnano più come un grafo testuale.
interface MapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  maps?: string[];
  unlocked?: (state: GameState) => boolean;
}

const NODES: readonly MapNode[] = [
  { id: "borgo", label: "BORGO", x: 51, y: 92, maps: ["borgo", "home", "lab", "bar"] },
  { id: "route1", label: "PERCORSO 1", x: 72, y: 75 },
  { id: "grotta1", label: "GROTTA", x: 83, y: 96, maps: ["grotta1"] },
  { id: "mediopoli", label: "MEDIOPOLI", x: 94, y: 57, maps: ["mediopoli", "market", "gym", "bar-medio"] },
  { id: "route2", label: "PERCORSO 2", x: 113, y: 65 },
  { id: "eurotown", label: "EUROTOWN", x: 134, y: 49, maps: ["eurotown", "gymue", "market2", "lobbystudio", "bistrot", "bar-euro"] },
  { id: "route3", label: "PERCORSO 3", x: 151, y: 62 },
  { id: "grotta2", label: "ARCHIVIO", x: 103, y: 108, maps: ["grotta2"] },
  { id: "capitale", label: "CAPUT MUNDI", x: 170, y: 78, maps: ["capitale", "casino", "market3", "gymca", "palazzo"] },
  { id: "stretto", label: "STRETTO", x: 102, y: 112, maps: ["stretto"], unlocked: (s) => s.badges.length >= 3 },
  { id: "colle", label: "IL COLLE", x: 129, y: 75, maps: ["colle"], unlocked: (s) => Boolean(s.flags["boss-beaten"]) },
  { id: "offshore", label: "OFFSHORE", x: 185, y: 101, maps: ["offshore"], unlocked: (s) => Boolean(s.flags["garante-beaten"]) }
];

export class WorldMapScene implements Scene {
  private selectedId: string;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.selectedId = this.currentNode()?.id ?? "borgo";
  }

  update(): void {
    if (this.input.wasPressed("up") || this.input.wasPressed("right")) {
      this.stepSelection(1);
      return;
    }
    if (this.input.wasPressed("down") || this.input.wasPressed("left")) {
      this.stepSelection(-1);
      return;
    }
    if (this.input.wasPressed("a") || this.input.wasPressed("b") || this.input.wasPressed("start")) {
      audio.cancel();
      this.stack.pop();
    }
  }

  private isUnlocked(node: MapNode): boolean {
    return !node.unlocked || node.unlocked(this.state);
  }

  private currentNode(): MapNode | undefined {
    const mapId = this.state.pos.mapId;
    return NODES.find((node) => node.id === mapId || node.maps?.includes(mapId));
  }

  private selectableNodes(): MapNode[] {
    return NODES.filter((node) => Boolean(node.maps) && this.isUnlocked(node));
  }

  private stepSelection(direction: 1 | -1): void {
    const nodes = this.selectableNodes();
    if (nodes.length === 0) return;
    const index = Math.max(0, nodes.findIndex((node) => node.id === this.selectedId));
    this.selectedId = nodes[(index + direction + nodes.length) % nodes.length].id;
    audio.cursor();
  }

  private drawFallback(screen: Screen): void {
    screen.rect(2, 19, VIEW_W - 4, 123, "#16243a");
    screen.frame(2, 19, VIEW_W - 4, 123, "#4d6585");
    screen.text("CARTINA IN CARICAMENTO", 53, 73, GREY);
  }

  private drawMarker(screen: Screen, node: MapNode, current: boolean, selected: boolean): void {
    if (!this.isUnlocked(node)) return;
    if (!current) {
      // Le tappe note sono puntini discreti: il landmark PixelLab resta visibile.
      screen.rect(node.x - 1, node.y - 1, 3, 3, "#69c85a");
      if (selected) screen.frame(node.x - 4, node.y - 4, 9, 9, "#62bdd4");
      return;
    }
    // Posizione attuale: un anello, non un quadrato pieno sopra il landmark.
    screen.frame(node.x - 7, node.y - 7, 15, 15, "#ffe98a");
    screen.frame(node.x - 5, node.y - 5, 11, 11, "#e6b944");
    screen.text("▼", node.x - 3, node.y - 14, "#ffe98a");
  }

  draw(screen: Screen): void {
    screen.clear("#101827");
    drawScreenHeader(screen, "CARTINA DELL'ITALIETTA", "A/B CHIUDI");
    const map = sceneImage("ui:world-campaign-map", "ui/world_campaign_map.png");
    if (map) screen.imageSprite(map, 0, 20);
    else this.drawFallback(screen);

    const current = this.currentNode();
    for (const node of NODES) this.drawMarker(screen, node, node.id === current?.id, node.id === this.selectedId);

    screen.panel(4, 145, VIEW_W - 8, 31, "dialog");
    screen.text("SEI QUI", 12, 151, "#e6b944");
    screen.text(clipToWidth(current?.label ?? "IN VIAGGIO", 132), 12, 162, PAPER);
    const selected = NODES.find((node) => node.id === this.selectedId);
    screen.textRight(clipToWidth(`TAPPA: ${selected?.label ?? "-"}`, 104), VIEW_W - 12, 151, "#62bdd4");
    screen.textRight("SU/GIU: TAPPE", VIEW_W - 12, 162, GREY);
  }
}

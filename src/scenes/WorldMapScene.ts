import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { GREY, INK } from "../ui/widgets";

interface MapNode {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  maps: readonly string[];
  unlocked?: (state: GameState) => boolean;
  optional?: boolean;
}

interface MapPage {
  id: "italietta" | "rotte" | "atto3";
  tab: string;
  nodes: readonly MapNode[];
}

const ITALIETTA_NODES: readonly MapNode[] = [
  { id: "borgo", label: "BORGO", shortLabel: "BORGO", x: 20, y: 72, maps: ["borgo", "home", "lab", "bar"] },
  { id: "route1", label: "PERCORSO 1", shortLabel: "1", x: 44, y: 72, maps: ["route1"] },
  { id: "grotta1", label: "GROTTA DELLE PROMESSE", shortLabel: "GROTTA", x: 44, y: 112, maps: ["grotta1"], optional: true },
  { id: "mediopoli", label: "MEDIOPOLI", shortLabel: "MEDIO", x: 68, y: 72, maps: ["mediopoli", "market", "gym", "bar-medio"] },
  { id: "route2", label: "PERCORSO 2", shortLabel: "2", x: 92, y: 72, maps: ["route2"] },
  { id: "eurotown", label: "EUROTOWN", shortLabel: "EURO", x: 116, y: 72, maps: ["eurotown", "gymue", "market2", "lobbystudio", "bistrot", "bar-euro"] },
  { id: "route3", label: "PERCORSO 3", shortLabel: "3", x: 140, y: 72, maps: ["route3"] },
  { id: "grotta2", label: "ARCHIVIO DI STATO", shortLabel: "ARCH.", x: 140, y: 112, maps: ["grotta2"], optional: true },
  { id: "capitale", label: "CAPUT MUNDI", shortLabel: "CAPUT", x: 164, y: 72, maps: ["capitale", "casino", "market3", "gymca", "palazzo"] },
  {
    id: "colle", label: "IL COLLE", shortLabel: "COLLE", x: 212, y: 72, maps: ["colle"],
    unlocked: (state) => Boolean(state.flags["boss-beaten"])
  }
];

const ROTTE_NODES: readonly MapNode[] = [
  {
    id: "stretto", label: "STRETTO DI MESSINA", shortLabel: "STRETTO", x: 38, y: 78,
    maps: ["stretto", "chiosco"], unlocked: (state) => state.badges.length >= 3
  },
  {
    id: "offshore", label: "PARADISO OFFSHORE", shortLabel: "OFFSHORE", x: 120, y: 78,
    maps: ["offshore", "bar-offshore"], unlocked: (state) => Boolean(state.flags["garante-beaten"])
  },
  {
    id: "bruxelles", label: "BRUXELLES", shortLabel: "BRUXELLES", x: 202, y: 78,
    maps: ["bruxelles", "commissione", "bar-bruxelles"], unlocked: (state) => Boolean(state.flags["garante-beaten"])
  }
];

const ATTO3_NODES: readonly MapNode[] = [
  {
    id: "campo", label: "CAMPO LARGO", shortLabel: "CAMPO", x: 25, y: 72,
    maps: ["campo_largo", "retropalco_campo"], unlocked: (state) => Boolean(state.flags["ue-beaten"])
  },
  {
    id: "futuro", label: "PARTITO DEL FUTURO", shortLabel: "FUTURO", x: 72, y: 72,
    maps: ["futuro_piazza", "futuro_sede", "futuro_scissione", "futuro_rebrand", "futuro_tesoreria"],
    unlocked: (state) => Boolean(state.flags["campo-photo-complete"])
  },
  {
    id: "diplomacy", label: "HOTEL DIPLOMATICO", shortLabel: "HOTEL", x: 119, y: 72,
    maps: ["diplomacy_lobby", "diplomacy_loyalty", "diplomacy_autonomy", "diplomacy_home", "diplomacy_terrace"],
    unlocked: (state) => Boolean(state.flags.futureResolved)
  },
  {
    id: "tour", label: "TOUR DEL FEED", shortLabel: "TOUR", x: 166, y: 72,
    maps: ["tour_feed", "district_nord", "district_centro", "district_sud", "district_isole", "district_feed"],
    unlocked: (state) => Boolean(state.flags["diplomacyComplete"])
  },
  {
    id: "palazzo-feed", label: "PALAZZO DEI FEED", shortLabel: "PALAZZO", x: 213, y: 72,
    maps: ["palazzo_feed", "palazzo_algoritmo", "palazzo_factcheck", "palazzo_talkshow", "palazzo_silenzio", "palazzo_feed_studio", "palazzo_feed_terrazza"],
    unlocked: (state) => Boolean(state.flags.tourComplete)
  },
  {
    id: "genova", label: "GENOVA TECHNO", shortLabel: "GENOVA", x: 72, y: 112,
    maps: ["genova_techno"], unlocked: (state) => Boolean(state.flags.diplomacyComplete), optional: true
  }
];

const PAGES: readonly MapPage[] = [
  { id: "italietta", tab: "ITALIETTA", nodes: ITALIETTA_NODES },
  { id: "rotte", tab: "ROTTE", nodes: ROTTE_NODES },
  { id: "atto3", tab: "ATTO 3", nodes: ATTO3_NODES }
];

export function worldMapPageFor(mapId: string): MapPage["id"] {
  return PAGES.find((page) => page.nodes.some((node) => node.maps.includes(mapId)))?.id ?? "italietta";
}

export class WorldMapScene implements Scene {
  private pageIndex: number;
  private selectedId: string;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    const pageId = worldMapPageFor(state.pos.mapId);
    this.pageIndex = Math.max(0, PAGES.findIndex((page) => page.id === pageId));
    this.selectedId = this.currentNode()?.id ?? this.selectableNodes()[0]?.id ?? PAGES[this.pageIndex].nodes[0].id;
  }

  update(): void {
    if (this.input.wasPressed("left")) {
      this.changePage(-1);
      return;
    }
    if (this.input.wasPressed("right")) {
      this.changePage(1);
      return;
    }
    if (this.input.wasPressed("up")) {
      this.stepSelection(-1);
      return;
    }
    if (this.input.wasPressed("down")) {
      this.stepSelection(1);
      return;
    }
    if (this.input.wasPressed("a") || this.input.wasPressed("b") || this.input.wasPressed("start")) {
      audio.cancel();
      this.stack.pop();
    }
  }

  private get page(): MapPage {
    return PAGES[this.pageIndex];
  }

  private isUnlocked(node: MapNode): boolean {
    return !node.unlocked || node.unlocked(this.state);
  }

  private currentNode(): MapNode | undefined {
    const mapId = this.state.pos.mapId;
    return PAGES.flatMap((page) => page.nodes).find((node) => node.maps.includes(mapId));
  }

  private selectableNodes(): MapNode[] {
    return this.page.nodes.filter((node) => this.isUnlocked(node));
  }

  private changePage(direction: -1 | 1): void {
    this.pageIndex = (this.pageIndex + direction + PAGES.length) % PAGES.length;
    const current = this.currentNode();
    this.selectedId = current && this.page.nodes.includes(current)
      ? current.id
      : this.selectableNodes()[0]?.id ?? this.page.nodes[0].id;
    audio.cursor();
  }

  private stepSelection(direction: -1 | 1): void {
    const nodes = this.selectableNodes();
    if (nodes.length === 0) return;
    const found = nodes.findIndex((node) => node.id === this.selectedId);
    const index = found >= 0 ? found : 0;
    this.selectedId = nodes[(index + direction + nodes.length) % nodes.length].id;
    audio.cursor();
  }

  private drawTabs(screen: Screen): void {
    const widths = [82, 66, 84];
    const labels = ["ITALIETTA", "ROTTE", "ATTO 3"];
    let x = 4;
    for (let index = 0; index < PAGES.length; index += 1) {
      const selected = index === this.pageIndex;
      const width = widths[index];
      screen.rect(x, 20, width, 12, selected ? "#f4cf49" : "#223451");
      screen.frame(x, 20, width, 12, selected ? "#fff2a0" : "#4d6585");
      const tx = Math.round(x + (width - labels[index].length * 6) / 2);
      screen.text(labels[index], tx, 23, selected ? INK : "#cfe6ff");
      x += width + 2;
    }
  }

  private drawRouteLine(screen: Screen, from: MapNode, to: MapNode): void {
    const x = Math.min(from.x, to.x) + 6;
    const width = Math.abs(to.x - from.x) - 12;
    screen.rect(x, from.y - 1, width, 3, "#7893ad");
    screen.text("►", Math.round((from.x + to.x) / 2) - 3, from.y - 4, "#ffe38a");
  }

  private drawRouteNode(screen: Screen, node: MapNode): void {
    const current = this.currentNode()?.id === node.id;
    const selected = this.selectedId === node.id;
    const unlocked = this.isUnlocked(node);
    const fill = current ? "#f4cf49" : unlocked ? "#69c85a" : "#526176";
    if (selected) screen.frame(node.x - 8, node.y - 8, 17, 17, "#62bdd4");
    screen.rect(node.x - 5, node.y - 5, 11, 11, "#17243d");
    screen.frame(node.x - 5, node.y - 5, 11, 11, fill);
    screen.rect(node.x - 2, node.y - 2, 5, 5, fill);
    if (current) screen.textCenter("TU", node.x, node.y - 18, "#ffe38a");
    screen.textCenter(unlocked ? node.shortLabel : "???", node.x, node.y + 10, unlocked ? "#fffaf0" : GREY);
    if (node.optional) screen.textCenter("OPZ.", node.x, node.y + 20, "#62bdd4");
  }

  private drawItalietta(screen: Screen): void {
    screen.rect(2, 34, VIEW_W - 4, 108, "#142137");
    screen.frame(2, 34, VIEW_W - 4, 108, "#4d6585");
    screen.text("PERCORSO PRINCIPALE", 8, 39, "#cfe6ff");
    screen.textRight("SU/GIU: TAPPE", 232, 39, GREY);
    const mainIds = ["borgo", "route1", "mediopoli", "route2", "eurotown", "route3", "capitale", "colle"];
    const main = mainIds.map((id) => this.page.nodes.find((node) => node.id === id)).filter((node): node is MapNode => Boolean(node));
    for (let index = 0; index < main.length - 1; index += 1) this.drawRouteLine(screen, main[index], main[index + 1]);
    screen.rect(42, 78, 3, 24, "#7893ad");
    screen.text("▼", 41, 94, "#62bdd4");
    screen.rect(138, 78, 3, 24, "#7893ad");
    screen.text("▼", 137, 94, "#62bdd4");
    for (const node of this.page.nodes) this.drawRouteNode(screen, node);
  }

  private drawRotte(screen: Screen): void {
    screen.rect(2, 34, VIEW_W - 4, 108, "#12263b");
    screen.frame(2, 34, VIEW_W - 4, 108, "#4d6585");
    screen.text("ROTTA DEL TRAGHETTO", 8, 39, "#cfe6ff");
    screen.textRight("SU/GIU: TAPPE", 232, 39, GREY);
    this.drawRouteLine(screen, this.page.nodes[0], this.page.nodes[1]);
    this.drawRouteLine(screen, this.page.nodes[1], this.page.nodes[2]);
    for (const node of this.page.nodes) this.drawRouteNode(screen, node);
    screen.textCenter("VARCHI SEGNALATI ANCHE NEL MONDO", VIEW_W / 2, 126, "#ffe38a");
  }

  private drawAtto3(screen: Screen): void {
    screen.rect(2, 34, VIEW_W - 4, 108, "#1b2038");
    screen.frame(2, 34, VIEW_W - 4, 108, "#4d6585");
    screen.text("CAMPAGNA NAZIONALE", 8, 39, "#cfe6ff");
    screen.textRight("SU/GIU: TAPPE", 232, 39, GREY);
    const main = this.page.nodes.slice(0, 5);
    for (let index = 0; index < main.length - 1; index += 1) this.drawRouteLine(screen, main[index], main[index + 1]);
    screen.rect(70, 78, 3, 24, "#7893ad");
    screen.text("▼", 69, 94, "#62bdd4");
    for (const node of this.page.nodes) this.drawRouteNode(screen, node);
  }

  private connectionLabel(node: MapNode | undefined): string {
    if (!node) return "NESSUNA TAPPA";
    if (this.page.id === "rotte") {
      if (node.id === "stretto") return "VERSO: PARADISO OFFSHORE";
      if (node.id === "offshore") return "COLLEGA: STRETTO E BRUXELLES";
      return "RITORNO: PARADISO OFFSHORE";
    }
    if (this.page.id === "atto3") return node.optional ? "DEVIAZIONE FACOLTATIVA" : "TAPPA DELLA CAMPAGNA";
    return node.optional ? "AREA FACOLTATIVA" : "PERCORSO PRINCIPALE";
  }

  draw(screen: Screen): void {
    screen.clear("#101827");
    if (this.page.id === "italietta") this.drawItalietta(screen);
    else if (this.page.id === "rotte") this.drawRotte(screen);
    else this.drawAtto3(screen);

    // Header e tab per ultimi: gli asset PNG possono avere un fondale opaco e
    // non devono mai coprire i controlli della cartina.
    screen.rect(0, 0, VIEW_W, 17, "#17243d");
    screen.rect(0, 15, VIEW_W, 2, "#e6b944");
    screen.text("CARTINA", 8, 5, "#fffaf0");
    screen.textRight("B: CHIUDI", VIEW_W - 8, 5, "#ffe38a");
    this.drawTabs(screen);

    const current = this.currentNode();
    const selected = this.page.nodes.find((node) => node.id === this.selectedId);
    screen.panel(4, 144, VIEW_W - 8, 32, "dialog");
    screen.text(selected?.id === current?.id ? "SEI QUI" : "TAPPA", 11, 150, "#a46b12");
    screen.textFit(selected?.label ?? "NESSUNA", 62, 150, 166, INK);
    screen.textFit(this.connectionLabel(selected), 11, 162, 218, selected && this.isUnlocked(selected) ? "#3f7f83" : GREY);
  }
}

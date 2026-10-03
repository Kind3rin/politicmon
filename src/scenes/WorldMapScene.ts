import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import type { GameState } from "../game/state";
import type { UiPanel } from "../ui/kit";
import { currentQuest } from "../data/quests";
import { MAPS } from "../data/maps";
import { MAP_NAMES } from "../data/maps/names";
import { reachableDexMaps } from "../game/dexGuide";
import { runtimeFeatures } from "../game/features";

interface MapNode {
  id: string;
  label: string;
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
  { id: "borgo", label: "BORGO", maps: ["borgo", "home", "lab", "bar"] },
  { id: "route1", label: "PERCORSO 1", maps: ["route1"] },
  { id: "grotta1", label: "GROTTA DEL CONSENSO", maps: ["grotta1"], optional: true },
  { id: "mediopoli", label: "MEDIOPOLI", maps: ["mediopoli", "market", "gymtv", "bar-medio"] },
  { id: "route2", label: "PERCORSO 2", maps: ["route2"] },
  { id: "eurotown", label: "EUROTOWN", maps: ["eurotown", "gymue", "market2", "lobbystudio", "bistrot", "bar-euro"] },
  { id: "route3", label: "PERCORSO 3", maps: ["route3"] },
  { id: "grotta2", label: "ARCHIVIO DI STATO", maps: ["grotta2"], optional: true },
  { id: "capitale", label: "CAPUT MUNDI", maps: ["capitale", "casino", "market3", "gymca", "palazzo"] },
  {
    id: "colle", label: "IL COLLE", maps: ["colle"],
    unlocked: (state) => Boolean(state.flags["boss-beaten"])
  }
];

const ROTTE_NODES: readonly MapNode[] = [
  {
    id: "stretto", label: "STRETTO DI MESSINA", maps: ["stretto", "chiosco"], unlocked: (state) => state.badges.length >= 3
  },
  {
    id: "offshore", label: "PARADISO OFFSHORE", maps: ["offshore", "bar-offshore"], unlocked: (state) => Boolean(state.flags["garante-beaten"])
  },
  {
    id: "bruxelles", label: "BRUXELLES", maps: ["bruxelles", "commissione", "bar-bruxelles"], unlocked: (state) => Boolean(state.flags["garante-beaten"])
  }
];

const ATTO3_NODES: readonly MapNode[] = [
  {
    id: "campo", label: "CAMPO LARGO", maps: ["campo_largo", "retropalco_campo"], unlocked: (state) => Boolean(state.flags["ue-beaten"])
  },
  {
    id: "futuro", label: "PARTITO DEL FUTURO", maps: ["futuro_piazza", "futuro_sede", "futuro_scissione", "futuro_rebrand", "futuro_tesoreria"],
    unlocked: (state) => Boolean(state.flags["campo-photo-complete"])
  },
  {
    id: "diplomacy", label: "HOTEL DIPLOMATICO", maps: ["diplomacy_lobby", "diplomacy_loyalty", "diplomacy_autonomy", "diplomacy_home", "diplomacy_terrace"],
    unlocked: (state) => Boolean(state.flags.futureResolved)
  },
  {
    id: "tour", label: "TOUR DEL FEED", maps: ["tour_feed", "district_nord", "district_centro", "district_sud", "district_isole", "district_feed"],
    unlocked: (state) => Boolean(state.flags["diplomacyComplete"])
  },
  {
    id: "palazzo-feed", label: "PALAZZO DEI FEED", maps: ["palazzo_feed", "palazzo_algoritmo", "palazzo_factcheck", "palazzo_talkshow", "palazzo_silenzio", "palazzo_feed_studio", "palazzo_feed_terrazza"],
    unlocked: (state) => Boolean(state.flags.tourComplete)
  },
  {
    id: "genova", label: "GENOVA TECHNO", maps: ["genova_techno"], unlocked: (state) => Boolean(state.flags.diplomacyComplete), optional: true
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
  private detail = false;
  private reachable: Set<string>;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.reachable = reachableDexMaps(state, runtimeFeatures());
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
    return (!node.unlocked || node.unlocked(this.state)) && node.maps.some(id=>this.reachable.has(id));
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

  private connections(node: MapNode): MapNode[] {
    const destinations = new Set(node.maps.flatMap(id => {
      const map = MAPS[id];
      return map ? [...map.warps.map(warp => warp.toMap), ...Object.values(map.edges ?? {}).map(edge => edge.toMap)] : [];
    }));
    return PAGES.flatMap(page=>page.nodes).filter(candidate=>candidate.id!==node.id&&candidate.maps.some(id=>destinations.has(id)));
  }

  private routeNodes(): MapNode[] {
    const main = this.page.nodes.filter(node=>!node.optional);
    return main.flatMap(node=>[node,...this.page.nodes.filter(branch=>branch.optional&&this.connections(branch).some(parent=>parent.id===node.id))]);
  }

  get uiPanel(): UiPanel {
    const page=this.page,nodes=this.routeNodes(),selected=this.page.nodes.find(node=>node.id===this.selectedId)??this.page.nodes[0],current=this.currentNode();
    const name=(value:string)=>value.charAt(0)+value.slice(1).toLocaleLowerCase("it");
    const close=()=>{if(this.stack.top!==this)return;this.input.reset();audio.cancel();if(this.detail)this.detail=false;else this.stack.pop();};
    if(this.detail)return {title:name(selected.label),subtitle:selected.id===current?.id?"Sei qui":"Tappa della campagna",
      blocks:[{title:"Collegamenti",facts:this.connections(selected).map(node=>({label:"Luogo collegato",value:name(node.label)}))},
        {title:"Passaggio",body:this.isUnlocked(selected)?selected.optional?"Deviazione facoltativa. Non serve per proseguire la storia.":"Segui i passaggi nel mondo. La cartina non consuma risorse.":"Il passaggio si apre proseguendo la campagna."},
        ...(selected.id===current?.id?[{title:"Prossimo passo",body:currentQuest(this.state)?.step??"Esplora le attività rimaste."}]:[])],
      actions:[],back:{label:"Indietro",hint:"Torna alla cartina.",run:close}};
    return {title:"Mappa",subtitle:`Sei a ${name(MAP_NAMES[this.state.pos.mapId]??current?.label??"Italietta")}.`,
      tabs:PAGES.map((region,index)=>({label:name(region.tab),run:()=>{if(this.stack.top!==this||this.detail)return;this.input.reset();this.pageIndex=index;this.selectedId=this.currentNode()?.id??region.nodes[0].id;if(!region.nodes.some(node=>node.id===this.selectedId))this.selectedId=region.nodes[0].id;audio.cursor();}})),selectedTab:this.pageIndex,
      blocks:[{title:"Prossima tappa",body:currentQuest(this.state)?.step??"La campagna continua."}],
      actions:nodes.map(node=>({label:name(node.label),group:"Percorso della campagna",route:node.optional?"branch":"main",hint:node.id===current?.id?"Sei qui":node.optional?"Deviazione facoltativa":undefined,
        facts:!this.isUnlocked(node)?[{label:"Passaggio",value:"Da sbloccare"}]:undefined,run:()=>{if(this.stack.top!==this||this.detail||this.page!==page)return;this.input.reset();this.selectedId=node.id;this.detail=true;audio.confirm();}})),
      selected:Math.max(0,nodes.findIndex(node=>node.id===this.selectedId)),back:{label:"Indietro",run:close}};
  }

  draw(screen: Screen): void { screen.clear("#101827"); }
}

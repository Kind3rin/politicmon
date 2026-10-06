import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import type { GameState } from "../game/state";
import type { UiPanel, UiAtlas } from "../ui/kit";
import { currentQuest } from "../data/quests";
import { MAPS } from "../data/maps";
import { reachableDexMaps } from "../game/dexGuide";
import { runtimeFeatures } from "../game/features";
import { currentLocalMap, type LocalMap } from "../game/world/localMap";

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

// Posizioni disegnate sulla cartina (percentuali): la geografia è satirica, l'ordine è quello del viaggio.
const ATLAS_POSITIONS: Record<string, readonly [number, number]> = {
  borgo: [24, 90], route1: [32, 77], grotta1: [72, 76], mediopoli: [46, 65], route2: [64, 53], eurotown: [34, 44], route3: [56, 34],
  grotta2: [82, 33], capitale: [36, 21], colle: [62, 8],
  stretto: [30, 74], offshore: [68, 46], bruxelles: [36, 18],
  campo: [28, 88], futuro: [68, 74], diplomacy: [30, 58], tour: [68, 42], "palazzo-feed": [34, 26], genova: [78, 10]
};

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
  /** The plan of the place you stand in comes first: it answers "where am I" before the whole country does. */
  private readonly local: LocalMap | null;
  private localView: boolean;
  private row = 0;

  constructor(private stack: SceneStack, private input: Input, private state: GameState) {
    this.local = currentLocalMap();
    this.localView = Boolean(this.local);
    this.row = Math.max(0, this.local?.rows.findIndex(row => row.goal) ?? 0);
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
    if (this.localView && this.local && this.input.wasPressed("a") && this.local.rows[this.row]) {
      this.goTo(this.row);
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

  private goTo(index: number): void {
    const row = this.local?.rows[index];
    if (!row || row.locked || !row.reachable || this.stack.top !== this) return;
    this.input.reset(); audio.confirm();
    this.local!.go(row.place);
  }

  private changePage(direction: -1 | 1): void {
    if (this.local) {
      // The plan is the tab before the first page of the atlas.
      const slot = (this.localView ? 0 : this.pageIndex + 1) + direction, total = PAGES.length + 1;
      const next = (slot + total) % total;
      this.localView = next === 0;
      if (next > 0) this.pageIndex = next - 1;
      if (!this.localView) {
        const current = this.currentNode();
        this.selectedId = current && this.page.nodes.includes(current) ? current.id : this.selectableNodes()[0]?.id ?? this.page.nodes[0].id;
      }
      audio.cursor();
      return;
    }
    this.pageIndex = (this.pageIndex + direction + PAGES.length) % PAGES.length;
    const current = this.currentNode();
    this.selectedId = current && this.page.nodes.includes(current)
      ? current.id
      : this.selectableNodes()[0]?.id ?? this.page.nodes[0].id;
    audio.cursor();
  }

  private stepSelection(direction: -1 | 1): void {
    if (this.localView && this.local) {
      if (this.local.rows.length) this.row = (this.row + direction + this.local.rows.length) % this.local.rows.length;
      audio.cursor();
      return;
    }
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

  private get localPanel(): UiPanel {
    const local = this.local!;
    const close = () => { if (this.stack.top !== this) return; this.input.reset(); audio.cancel(); this.stack.pop(); };
    const tab = (label: string, run: () => void) => ({ label, run: () => { if (this.stack.top !== this) return; this.input.reset(); run(); audio.cursor(); } });
    const tabs = [tab("Qui", () => { this.localView = true; }),
      ...PAGES.map((region, index) => tab(region.tab.charAt(0) + region.tab.slice(1).toLocaleLowerCase("it"), () => {
        this.localView = false; this.pageIndex = index;
        const current = this.currentNode();
        this.selectedId = current && region.nodes.includes(current) ? current.id : region.nodes.find(node => this.isUnlocked(node))?.id ?? region.nodes[0].id;
      }))];
    return {
      title: "Mappa", subtitle: local.zone ? `${local.name} · ${local.zone}` : local.name,
      plan: local.plan, tabs, selectedTab: 0,
      actions: local.rows.map((row, i) => ({
        label: `${row.n} · ${row.place.label}`, group: local.inside ? "Uscite" : "Dove puoi andare",
        hint: row.locked ?? [row.goal ? "Obiettivo" : undefined, row.where, row.place.detail].filter(Boolean).join(" · "),
        disabled: Boolean(row.locked) || !row.reachable,
        run: () => this.goTo(i)
      })),
      selected: Math.min(this.row, Math.max(0, local.rows.length - 1)),
      back: { label: "Indietro", run: close }
    };
  }

  get uiPanel(): UiPanel {
    if (this.localView && this.local) return this.localPanel;
    const page=this.page,nodes=this.routeNodes(),selected=this.page.nodes.find(node=>node.id===this.selectedId)??this.page.nodes[0],current=this.currentNode();
    const name=(value:string)=>value.charAt(0)+value.slice(1).toLocaleLowerCase("it");
    const close=()=>{if(this.stack.top!==this)return;this.input.reset();audio.cancel();if(this.detail)this.detail=false;else this.stack.pop();};
    if(this.detail)return {title:name(selected.label),subtitle:selected.id===current?.id?"Sei qui":"Tappa della campagna",
      blocks:[{title:"Collegamenti",facts:this.connections(selected).map(node=>({label:"Luogo collegato",value:name(node.label)}))},
        {title:"Passaggio",body:this.isUnlocked(selected)?selected.optional?"Deviazione facoltativa. Non serve per proseguire la storia.":"Segui i passaggi nel mondo. La cartina non consuma risorse.":"Il passaggio si apre proseguendo la campagna."},
        ...(selected.id===current?.id?[{title:"Prossimo passo",body:currentQuest(this.state)?.step??"Esplora le attività rimaste."}]:[])],
      actions:[],back:{label:"Indietro",hint:"Torna alla cartina.",run:close}};
    const atlas:UiAtlas={
      nodes:nodes.map(node=>{const at=ATLAS_POSITIONS[node.id]??[50,50];
        return {x:at[0],y:at[1],label:node.label,state:node.id===current?.id?"here":!this.isUnlocked(node)?"locked":node.optional?"optional":"open",
          next:node.id!==current?.id&&this.isUnlocked(node)&&!node.optional&&nodes.filter(candidate=>!candidate.optional&&this.isUnlocked(candidate)).slice(-1)[0]?.id===node.id};}),
      links:nodes.flatMap((node,index)=>{
        if(node.optional){const parent=this.connections(node).map(candidate=>nodes.indexOf(candidate)).find(i=>i>=0&&!nodes[i].optional);return parent===undefined?[]:[{from:parent,to:index,dashed:true}];}
        const before=nodes.slice(0,index).map((candidate,i)=>({candidate,i})).filter(entry=>!entry.candidate.optional).pop();
        return before?[{from:before.i,to:index}]:[];
      })};
    return {title:"Mappa",atlas,
      tabs:[...(this.local?[{label:"Qui",run:()=>{if(this.stack.top!==this||this.detail)return;this.input.reset();this.localView=true;audio.cursor();}}]:[]),...PAGES.map((region,index)=>({label:name(region.tab),run:()=>{if(this.stack.top!==this||this.detail)return;this.input.reset();this.pageIndex=index;this.selectedId=this.currentNode()?.id??region.nodes[0].id;if(!region.nodes.some(node=>node.id===this.selectedId))this.selectedId=region.nodes[0].id;audio.cursor();}}))],selectedTab:this.pageIndex+(this.local?1:0),
      blocks:undefined,
      actions:nodes.map(node=>({label:name(node.label),group:"Percorso della campagna",route:node.optional?"branch":"main",hint:node.id===current?.id?"Sei qui":node.optional?"Deviazione facoltativa":undefined,
        facts:!this.isUnlocked(node)?[{label:"Passaggio",value:"Da sbloccare"}]:undefined,run:()=>{if(this.stack.top!==this||this.detail||this.page!==page)return;this.input.reset();this.selectedId=node.id;this.detail=true;audio.confirm();}})),
      selected:Math.max(0,nodes.findIndex(node=>node.id===this.selectedId)),back:{label:"Indietro",run:close}};
  }

  draw(screen: Screen): void { screen.clear("#101827"); }
}

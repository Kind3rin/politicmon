import {lastSuccessfulSaveAt} from "../state";
import {worldLabel} from "../../ui/kit/worldLabels";
import {WorldAtmosphere, footSurface, grassBend, waterFrame} from "./worldAtmosphere";
import {TerrainRenderer, type TerrainSample, type TerrainKind, type TerrainShadow, terrainHash} from "./terrainRenderer";
import {readableCopy} from "../../ui/kit/copy";
import type {UiPanel,UiWorld,UiBlock} from "../../ui/kit";
import {FieldGuideScene} from "../../scenes/FieldGuideScene";
import {welcomeGuide, controlLesson} from "../onboarding";
import {PalaceArchiveScene} from "../../scenes/PalaceArchiveScene";
import { playerImage, ferryImage, vehicleImage, NPC_WITH_PNG, type Facing } from "../../art/characters";
import { mp } from "../../net/mp";
import { approach } from "../battle/view";
import { TILE, TILES, tileImage, terrainVariantImage, objectImage, isRoof, isFacade, buildingImage, buildingKey, buildingPath } from "../../art/tiles";
import { sceneImage, getSpriteImage, spriteAssetRevision } from "../../engine/assets";
import { CIVIC_EVENTS, CIVIC_NPCS } from "../../data/civicEvents";
import { CivicScene } from "../../scenes/CivicScene";
import { BossBriefingScene } from "../../scenes/BossBriefingScene";
import { trainerStyle } from "../battle/trainerStyle";
import { changeMorale, moraleEpilogue } from "../morale";
import { civicNpcReply } from "../civicChoices";
import { civicBridgeTile } from "./civicBridge";

// Pickup "scheda elettorale": PNG PixelLab 14px centrato nella cella.
function drawBallot(screen: Screen, dx: number, dy: number): void {
  const img = sceneImage("item:scheda", "items/scheda.png");
  if (!img) {
    return;
  }
  const b = screen.imageBounds(img);
  const s = 14 / Math.max(b.w, b.h);
  screen.imageSpriteCropped(img, dx + (TILE - b.w * s) / 2, dy + (TILE - b.h * s) / 2, { scaleX: s, scaleY: s });
}
import { ITEMS } from "../../data/items";
import { BAR_RESPAWN, MAPS, STARTER_SPOTS, type MapDef, type NpcDef } from "../../data/maps";
import { currentQuest } from "../../data/quests";
import { RIVAL_COUNTER, SPECIES, STARTERS } from "../../data/species";
import { buildRivalStageTeam, RIVAL_STAGES, rivalStageFor } from "../../data/rival";
import { TRAINERS, type TrainerDef } from "../../data/trainers";
import { audio } from "../../engine/audio";
import { haptics } from "../../engine/haptics";
import type { Input } from "../../engine/input";
import type { Scene, SceneStack } from "../../engine/scene";
import type { TouchAction } from "../../engine/touchActions";
import { Screen, VIEW_H, VIEW_W } from "../../engine/screen";
import {worldCameraAxis,followCamera,unzoomWorldPoint} from "../../engine/worldCamera";
import { Menu, MessageBox, setReduceMotion } from "../../ui/widgets";
import { BattleScene, BOSS_TRAINER_IDS, type BattleResult } from "../battle/BattleScene";
import { createMonster, healMonster, statsOf, type Monster } from "../monster";
import { beginTemporaryParty, markCaught, markSeen, saveGame, setActiveState, type GameState } from "../state";
import { addSondaggi, assignedMinisteri, bumpSondaggi, curaPassiva, hasMinistro, MINISTERI, scaricaUnMinistro } from "../governo";
import { adaptiveGymRoster, buildRematchDef, markRematchClock, rematchAvailability } from "../rematch";
import { buildDailyTrainer, dailyBoostSpeciesId, dailyRewardItem, hashDate, localDateKey, prevDateKey, DAILY_BOOST_MULT } from "../daily";
import { bumpDailyQuest, consumeDailyToast } from "../dailyquests";
import { recordHealerVisit, recordRunStep } from "../runstats";
import { MIN_FREE_STEPS, newWandererCadence, planWanderingChallenge, firstRecruitLevel } from "./explorationInterrupts";
import { RoamerField, roamerTarget, type Contact as RoamerContact } from "./roamers";
import { monsterImage } from "../../art/monsters";
import { resolveTransportDestination, type TransportDestination } from "./transport";
import { buildNpcDrawCommand, type RuntimeNpc } from "./npcRenderer";
import { recordDuelResult } from "../duelrecord";
import { gameVersion, speciesAvailable, VERSION_EXCLUSIVES } from "../version";
import { checkAchievements } from "../achievements";
import { bulldozedKey, isBulldozed, unlockVehicle, VEHICLES, type VehicleId } from "../vehicles";
import { isGuideOn } from "../../engine/controls";
import { PartyScene } from "../../scenes/PartyScene";
import { WorldMapScene } from "../../scenes/WorldMapScene";
import { PauseScene } from "../../scenes/PauseScene";
import { TradeScene } from "../../scenes/TradeScene";
import { DuelLobbyScene } from "../../scenes/DuelLobbyScene";
import { PvpBattleScene } from "../battle/PvpBattleScene";
import {
  DUEL_INVITE_TIMEOUT, TALK_INVITE_TIMEOUT, serializeTeam, validateWireTeam, type DuelMsg, type WireMon
} from "../../net/duelproto";
import { TalkScene } from "../../scenes/TalkScene";
import { loadNick } from "../../net/profile";
import { ShopScene } from "../../scenes/ShopScene";
import { CasinoScene } from "../../scenes/CasinoScene";
import { BoxScene } from "../../scenes/BoxScene";
import { MafiaScene } from "../../scenes/MafiaScene";
import { MonumentScene, monumentDecoLines } from "../../scenes/MonumentScene";
import { CoalitionScene } from "../../scenes/CoalitionScene";
import { PhotoChoiceScene } from "../../scenes/PhotoChoiceScene";
import { FutureChoiceScene } from "../../scenes/FutureChoiceScene";
import { DiplomacyChoiceScene } from "../../scenes/DiplomacyChoiceScene";
import { GenovaTechnoScene } from "../../scenes/GenovaTechnoScene";
import { DistrictScene } from "../../scenes/DistrictScene";
import { ElectionResultsScene } from "../../scenes/ElectionResultsScene";
import { Atto3EndingScene } from "../../scenes/Atto3EndingScene";
import { WeeklyCampaignScene } from "../../scenes/WeeklyCampaignScene";
import { SliceEndingScene } from "../../scenes/SliceEndingScene";
import { TransportScene } from "../../scenes/TransportScene";
import { StarterPreviewScene } from "../../scenes/StarterPreviewScene";
import { TournamentScene } from "../../scenes/TournamentScene";
import {
  advanceAfterPlayerWin, initTournament, playerOpponent, roundLabel,
  coppaOpponentDef, coppaRule, prepareCoppaParty, COPPA_FEE, COPPA_FIRST_PRIZE, COPPA_REPEAT_PRIZE, COPPA_TITLE,
  type CoppaRule, type TournamentState
} from "../tournament";
import { buildTrainerTeam, preparePractice, recordNewTrainerVictory, shouldPersistTrainerVictory } from "./battleCoordinator";
import { firstRivalReady } from "../firstCampaign";
import { routeNpcInteraction } from "./npcInteraction";
import { createAtto3Controller, type Atto3Controller } from "./atto3Controller";
import { isFeatureEnabled } from "../features";
import { photoChapterRewardPatch } from "../atto3Progress";
import { futureRewardPatch } from "../futureChapter";
import { diplomacyRewardPatch } from "../diplomacyChapter";
import { createElectionSnapshot, newElectionState, resolveAction, resolveElection, startElection, type DistrictId } from "../election";
import { coalitionBonuses } from "../coalition";
import { DISTRICT_CONTENT, districtActionCount } from "../districtCampaign";
import { electionDoctrine, type ElectionDoctrine } from "../electionDoctrine";
import { resolveWeeklyStage } from "../weeklyCampaign";
import type { WorldCommand } from "./worldContext";

const STEP_TIME = 0.18;
const RUN_FACTOR = 1.85;
const SCOOTER_FACTOR = 2.5; // il MONOPATTINO deve battere la corsa, non pareggiarla
const AUTO_FACTOR = 3.0; // l'AUTO BLU è il mezzo più rapido all'aperto

// Annunci una-tantum quando si entra in una mappa per la prima volta: servono a
// far scoprire feature che la storia principale non segnala (es. il CASINÒ).
const MAP_ENTRY_HINTS: Record<string, { flag: string; lines: string[] }> = {
  capitale: {
    flag: "hint-casino",
    lines: [
      "Sei a CAPUT MUNDI, il cuore del potere.",
      "Dietro l'angolo c'è il CASINÒ DI PALAZZO: SLOT, FICHE e un certo CLUB...",
      "Si gioca consenso a soldi. Cerca la porta tra i palazzi, verso destra."
    ]
  },
  // Il flag hint-offshore è anche l'isDone della quest ACQUE INTERNAZIONALI.
  offshore: {
    flag: "hint-offshore",
    lines: [
      "PARADISO OFFSHORE: il sole è pubblico. L'ombra ha cambiato residenza.",
      "Nuovi candidati nell'erba, LV 30-45. Il LIDO CAYMAN a nord recupera PV e PP.",
      "Tre sfide volontarie: A apre il dossier, B torna. Le boe a est portano a BRUXELLES."
    ]
  },
  // Primo sbarco a BRUXELLES: banner d'ingresso (flag hint-ue già impostato dallo
  // SHERPA UE sull'offshore, quindi qui usiamo un flag dedicato per il banner).
  bruxelles: {
    flag: "hint-brux-arrivo",
    lines: [
      "BRUXELLES: tre tavoli per un lampione. La strada aspetta la luce.",
      "Candidati LV 42-50 nell’erba. Il CAFFÈ SCHUMAN recupera PV e PP, gratis.",
      "Quattro prove volontarie sul viale: A apre il dossier, B torna. LA COMMISSIONE aspetta nel palazzo a nord."
    ]
  }
};

interface Rustle {
  x: number;
  y: number;
  t: number;
}

const DIR_DELTA: Record<Facing, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

const FACINGS: Facing[] = ["up", "down", "left", "right"];

const WORLD_OBJECT_TARGET_PX: Record<string, number> = {
  T: 30,
  s: 16,
  f: 16,
  "~": 16,
  ",": 16,
  L: 16,
  t: 16,
  b: 16,
  P: 16,
  h: 16,
  k: 16,
  J: 18,
  K: 20,
  g: 16,
  // Arredo urbano piazze: fontana grande, statua più alta, panchina larga bassa.
  W: 22,
  Y: 20,
  U: 16
  ,"1": 64
  ,"2": 40
  ,"3": 16
  ,"4": 32
  ,"5": 16
  ,"6": 48
  ,"7": 48
  ,"8": 96
};

function drawWorldObjectPng(screen: Screen, ch: string, img: HTMLImageElement, dx: number, dy: number, target = WORLD_OBJECT_TARGET_PX[ch] ?? TILE): void {
  const b = screen.imageBounds(img);
  const scale = target / Math.max(b.w, b.h);
  const dw = b.w * scale;
  const dh = b.h * scale;
  screen.imageSpriteCropped(img, dx + TILE / 2 - dw / 2, dy + TILE - dh, { scaleX: scale, scaleY: scale });
}

function drawWorldTilePng(screen: Screen, img: HTMLImageElement, dx: number, dy: number): void {
  screen.imageSprite(img, dx, dy, { scaleX: TILE / img.width, scaleY: TILE / img.height });
}

/** The first-sighting hint is shown once per session and never written to the save. */
let roamerHintShown = false;

export class WorldScene implements Scene {
  readonly expandedViewport = true;
  private viewHeight = VIEW_H;
  private readonly atto3Controller: Atto3Controller = createAtto3Controller();
  private map!: MapDef;
  private readonly terrain = new TerrainRenderer();
  private readonly atmosphere = new WorldAtmosphere();
  private npcs: RuntimeNpc[] = [];
  private msg = new MessageBox();
  private starterDeck = true;
  private afterMsg: (() => void) | null = null;

  private moving = false;
  private runToggled = false;
  private tapRoute: {x:number;y:number}[] = [];
  private tapTarget: {x:number;y:number;npcId?:string} | undefined;
  private npcTapAreas: {id:string;x:number;y:number;width:number;height:number}[] = [];
  private tapCamera = {x:0,y:0,zoom:1};
  private cameraPosition:{x:number;y:number}|null=null;
  private cameraDt=1/60;
  private dialogueFocus=false;
  private dialogueZoom=1;
  private nextBump=0;
  private tapNotice: {text:string;until:number} | undefined;

  // Offset di centratura sulla porta, INTERPOLATO. Prima l'offset saltava da ±8
  // a 0 nell'istante in cui partivi (era gated su !moving), causando lo "scatto
  // laterale" appena ti muovevi. Ora insegue il target con un lerp per-frame, così
  // il player scivola dolcemente al/dal centro invece di teletrasportarsi.
  private doorOffsetSmooth = 0;
  // True subito dopo loadMap: gli eventi "d'ingresso mappa" (hint one-shot,
  // CRISI DI GOVERNO) si valutano solo al primo frame idle dopo l'arrivo, non a
  // ogni frame in cui sei fermo (così restare sulla porta prima di un warp non
  // li innesca). Azzerato dopo la prima valutazione idle.
  private justEnteredMap = false;
  private running = false;
  private moveT = 0;
  private shake = 0; // scossone camera (es. RUSPA che abbatte un albero)
  private landVehicle: VehicleId | null = null; // mezzo terrestre messo da parte mentre sei in TRAGHETTO
  private fromX = 0;
  private fromY = 0;
  private time = 0;
  private rustles: Rustle[] = [];
  private encounterFlash = 0;
  private hop = false;
  private roamers: RoamerField | null = null;
  private roamerMap = "";
  private roamerCount = 0;
  private roamerGrace = 0;
  private roamerHinted = false;
  private fadeT = 0; // dissolvenza d'ingresso mappa
  private fadeOut = 0; // dissolvenza d'USCITA prima di un warp
  private pendingWarp: (() => void) | null = null;
  private pendingBattle: (() => void) | null = null;
  private exclaimNpc: RuntimeNpc | null = null;
  private exclaimT = 0;
  private pendingTrainer: TrainerDef | null = null;
  private wanderNpc: RuntimeNpc | null = null; // sprite temporaneo del PG vagante
  private wanderTrainer: TrainerDef | null = null; // sfida facoltativa associata
  // COPPA DELLE POLTRONE: stato del torneo in corso (SESSIONE SINGOLA, mai salvato).
  private coppa: TournamentState | null = null;
  private coppaRuleActive: CoppaRule | null = null;
  private coppaRestoreParty: (() => void) | null = null;

  // ---- Effetto di CURA (BAR SPORT, risveglio, raccomandazione mafia) ----
  private healFx = 0; // durata residua dell'animazione di cura
  private afterHeal: (() => void) | null = null; // callback a fine animazione
  private healSparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; max: number; color: string }> = [];
  // Snapshot HP pre-cura: le barre si riempiono "a vista" da `from` a `to`.
  private healSnapshot: Array<{ mon: Monster; from: number; to: number; disp: number }> = [];
  // Scintille della cura passiva (Min. Salute), in coordinate-MONDO (px mappa).
  private stepSparks: Array<{ x: number; y: number; vy: number; life: number; max: number }> = [];

  // ---- Banner "evento" (traguardo, breaking news): entra a molla + flash ----
  private banner: { text: string; sub: string; t: number; color: string } | null = null;
  private bannerFlash = 0;

  // ---- HUD sondaggi animata: il valore mostrato insegue quello reale ----
  private displaySondaggi = -1; // -1 = non inizializzato
  private sondPulse = 0; // durata residua del flash colore sulla barra
  private sondDelta: { text: string; t: number; up: boolean } | null = null;

  private askMenu: Menu | null = null;
  private askYes: (() => void) | null = null;
  private askNo: (() => void) | null = null;
  private askLabel = "";
  // Menù a scelta multipla generico (NPC guida): onPick riceve l'indice scelto,
  // askNo gestisce l'annullo (tasto B). Mutuamente esclusivo con askYes/askNo.
  private askPick: ((index: number) => void) | null = null;
  // NPC guida già salutati in questa sessione (l'intro non si ripete).
  private guideGreeted = new Set<string>();
  // Menu d'interazione su un giocatore remoto adiacente (SCAMBIA/SFIDA/ANNULLA).
  // NOTA: askLabel è CONDIVISO con remoteMenu/askMenu (stati mutuamente
  // esclusivi: mai due menu aperti insieme).
  private remoteMenu: Menu | null = null;
  private remoteMenuPeerId = "";
  // DUELLO PvP lato ricevente: mailbox riempite dal callback di rete (async),
  // consumate SOLO nell'update quando il giocatore è libero (mai push di scene
  // da dentro un callback di rete).
  private pendingDuelInvite: {
    peerId: string; duelId: string; nick: string; maxLevel: number; avg: number; at: number;
  } | null = null;
  // `team` = il wire team inviato nell'accept: la sim del guest DEVE usare
  // quello (l'host simula su quello), non una ri-serializzazione del party.
  private duelWait: { duelId: string; peerId: string; nick: string; deadline: number; team: WireMon[] } | null = null;
  private duelStartMsg: {
    duelId: string; peerId: string; nick: string; hostTeam: unknown; deadline: number; team: WireMon[];
  } | null = null;
  private duelDeclineMsg: string | null = null;
  // DIALOGO 1:1 lato ricevente: stessa disciplina mailbox del duello.
  private pendingTalkInvite: { peerId: string; talkId: string; nick: string; at: number } | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private readonly localClock:()=>Date=()=>new Date()) {
    // Registra lo stato come "attivo" per il salvataggio su chiusura/background
    // (gestito a livello globale in main.ts).
    setActiveState(this.state);
    // Accessibilità: allinea il flag globale del dialog-shake alla scelta salvata.
    setReduceMotion(this.state.reduceEffects);
    // Handler base dei messaggi duello (lobby e PvpBattleScene lo prendono in
    // consegna quando sono in cima e lo ripristinano all'uscita).
    mp.onDuel = (msg, peerId) => this.onDuelMsg(msg, peerId);
    this.loadMap(this.state.pos.mapId);
  }

  onEnter(): void {
    if (!this.state.flags["intro-done"]) {
      this.state.flags["intro-done"] = true;
      this.state.flags["controls-intro"] = true;
      saveGame(this.state);
    }
  }

  // ---- Setup ----

  get touchActions(): readonly TouchAction[] | undefined {
    if (!this.starterDeck || this.state.pos.mapId !== "lab" || this.state.flags["starter-chosen"] || this.state.party.length || this.msg.isOpen || this.askMenu || this.remoteMenu) return undefined;
    const action = (label: string, hint: string, run: () => void): TouchAction => ({ label, hint, run: () => {
      if (this.stack.top !== this || !this.starterDeck || this.state.pos.mapId !== "lab" || this.state.flags["starter-chosen"] || this.msg.isOpen || this.askMenu || this.remoteMenu) return;
      this.input.reset(); run();
    } });
    return [...STARTERS.map((id) => action(SPECIES[id].name, `${SPECIES[id].types.join(" / ")} · apri la scheda`, () => this.interactStarter(id))),
      action("GUIDA", "Mosse, Polemica e prossima meta", () => this.stack.push(new FieldGuideScene(this.stack, this.input, "PRIMA CAMPAGNA", welcomeGuide(this.state)))),
      action("ESPLORA", "Cammina e parla nel laboratorio", () => { this.starterDeck = false; })];
  }

  private canUseWorldControls(): boolean {
    return this.stack.top === this && !this.msg.isOpen && !this.askMenu && !this.remoteMenu &&
      !this.fadeOut && !this.pendingWarp && !this.encounterFlash && !this.exclaimNpc && !this.healFx;
  }

  private contextLabel(): string | undefined {
    const pos = this.state.pos, delta = DIR_DELTA[pos.facing];
    const x = pos.x + delta.dx, y = pos.y + delta.dy;
    if (this.visibleNpcs().some(n => n.x === x && n.y === y) || mp.remotePlayers().some(n => n.x === x && n.y === y)) return "Parla";
    if (this.map.id === "lab" && STARTER_SPOTS.some(n => n.x === x && n.y === y)) return "Apri scheda";
    if (this.map.signs.some(n => n.x === x && n.y === y)) return "Leggi";
    if (this.map.decoratives?.some(n => n.x === x && n.y === y)) return "Esamina";
    if (this.map.pickups.some(n => !n.hidden && n.x === x && n.y === y && !this.state.pickedItems.includes(n.id))) return "Raccogli";
    if (this.tileAt(x,y) === "T" && this.state.vehicle === "ruspa") return "Abbatti";
    if (this.map.warps.some(n => n.x === x && n.y === y && (!this.isOutdoorDoorWarp(n) || pos.facing === "up")) && !this.isBlocked(x,y)) return "Entra";
    return undefined;
  }

  get uiWorldPending(): boolean {
    return this.stack.top === this && !this.msg.isOpen && !this.askMenu && !this.remoteMenu &&
      !this.touchActions && !this.canUseWorldControls();
  }

  get uiFeedback(): readonly UiBlock[] | undefined {
    if (this.healFx > 0 && this.healSnapshot.length) return [{
      title: "Squadra curata",
      body: "PV e PP recuperati. Gli stati sono rimossi.",
      facts: this.healSnapshot.map(s => ({label: SPECIES[s.mon.speciesId].name, value: `${s.from} → ${s.to} PV`}))
    }];
    return undefined;
  }

  get uiWorld(): UiWorld | undefined {
    if (!this.canUseWorldControls() || this.touchActions) return undefined;
    const command = (label: string, run: () => void, icon?: string, preserveRoute = false): TouchAction => ({label,icon,run: () => {
      if (!this.canUseWorldControls()) return;
      if (!preserveRoute) this.stopTapRoute(); this.input.reset(); audio.confirm(); run();
    }});
    const followingRoute = this.tapRoute.length > 0 || Boolean(this.tapTarget);
    const context = followingRoute ? "Fermati" : this.contextLabel();
    const quest=currentQuest(this.state);
    const facts=[...(this.state.party.length?[{label:"Sondaggi",value:`${this.state.sondaggi}%`}]:[]),
      ...(this.state.vehicle?[{label:"Mezzo",value:VEHICLES[this.state.vehicle as VehicleId].name}]:[])];
    if(mp.isEnabled()&&mp.onlineCount>0)facts.push({label:"Online",value:String(mp.onlineCount+1)});
    if((this.map.id==="campo_largo"||this.map.id==="retropalco_campo")&&this.state.election.phase!=="inactive")facts.push({label:"Consenso locale",value:`${this.state.election.districts.find(d=>d.id==="centro")?.localConsensus??38}%`});
    return {
      saved:Date.now()-lastSuccessfulSaveAt<1800,
      notice:this.tapNotice&&this.time<this.tapNotice.until?this.tapNotice.text:this.banner?`${this.banner.text} · ${this.banner.sub}`:undefined,
      messages:mp.chat.filter(c=>performance.now()-c.t<6000).slice(-2).map(c=>`${mp.chatNick(c)}: ${c.text}`),
      lesson:controlLesson(this.state,context),
      location:this.map.name.charAt(0)+this.map.name.slice(1).toLocaleLowerCase("it"),facts,
      objective:quest?`${this.map.id==="borgo"&&quest.target?.mapId==="route1"?"Esci a nord. ":""}${quest.step}`:this.state.party.length?undefined:"Vai al laboratorio con il tetto blu.",
      actions: [command("Squadra", () => this.stack.push(new PartyScene(this.stack,this.input,this.state,{mode:"view"})),"/sprites/ui/kit/team.png"),
        command("Mappa", () => this.stack.push(new WorldMapScene(this.stack,this.input,this.state)),"/sprites/ui/kit/map.png"),
        {...command("Menu", () => this.stack.push(new PauseScene(this.stack,this.input,this.state)),"/sprites/ui/kit/more.png"),command:"start"}],
      context: {...command(context ?? "Avvicinati", () => { if (!followingRoute && !this.moving) this.interact(); }), disabled: !context || (this.moving && !followingRoute)},
      run: command(this.runToggled ? "Cammina" : "Corri", () => { this.runToggled = !this.runToggled; },undefined,true), running: this.runToggled,
      save: command("Salva", () => {
        const saved=saveGame(this.state);
        this.tapNotice={text:saved?"Partita salvata nello slot attuale.":"Salvataggio non riuscito. Riprova o esporta una copia dal menu.",until:this.time+4};
      })
    };
  }

  private stopTapRoute(): void { this.tapRoute = []; this.tapTarget = undefined; }

  /** Search uses the same collisions as a manual step. Intermediate doors
   * cannot divert the player onto another map before reaching the destination. */
  private planTapRoute(x:number,y:number,npcId?:string): void {
    this.stopTapRoute(); this.tapNotice = undefined;
    const width = this.map.tiles[0].length, height = this.map.tiles.length;
    // A road reaching the map border remains a destination. The final step
    // uses the normal zone transition, including its badge/locked-road gate.
    const exit = x>=0 && x<width && !npcId &&
      (y===-1 && this.map.edges?.north || y===height && this.map.edges?.south)
      ? {x,y} : undefined;
    if (exit) y=Math.max(0,Math.min(height-1,y));
    if (x<0 || y<0 || x>=width || y>=height) {this.tapNotice={text:"Tocca un punto dentro la mappa.",until:this.time+2.5};return;}
    const npc = this.visibleNpcs().find(n=>npcId?n.id===npcId:n.x===x&&n.y===y);
    if(npc){x=npc.x;y=npc.y;}
    const target = Boolean(npc) ||
      this.map.signs.some(n=>n.x===x&&n.y===y) || this.map.decoratives?.some(n=>n.x===x&&n.y===y) ||
      this.map.pickups.some(n=>!n.hidden&&n.x===x&&n.y===y&&!this.state.pickedItems.includes(n.id)) ||
      (this.map.id==="lab"&&STARTER_SPOTS.some(n=>n.x===x&&n.y===y)) ||
      mp.remotePlayers().some(n=>n.x===x&&n.y===y);
    const start = {x:this.state.pos.x,y:this.state.pos.y};
    const key = (point:{x:number;y:number})=>point.y*width+point.x;
    const queue = [start], parents = new Map<number,{x:number;y:number}>();
    const visited = new Set([key(start)]);
    let found: {x:number;y:number} | undefined;
    for (let i=0;i<queue.length;i++) {
      const point = queue[i];
      if (target ? Math.abs(point.x-x)+Math.abs(point.y-y)===1 : point.x===x&&point.y===y) {found=point;break;}
      for (const direction of FACINGS) {
        const delta=DIR_DELTA[direction], next={x:point.x+delta.dx,y:point.y+delta.dy};
        if(next.x<0||next.y<0||next.x>=width||next.y>=height||visited.has(key(next))||this.isBlocked(next.x,next.y))continue;
        const warp=this.map.warps.find(w=>w.x===next.x&&w.y===next.y);
        if(warp&&(target||next.x!==x||next.y!==y||(this.isOutdoorDoorWarp(warp)&&direction!=="up")))continue;
        visited.add(key(next));parents.set(key(next),point);queue.push(next);
      }
    }
    if (!found) {this.tapNotice={text:"Non c’è un percorso libero verso quel punto.",until:this.time+2.5};return;}
    const route:{x:number;y:number}[]=[];
    for(let point=found;key(point)!==key(start);point=parents.get(key(point))!)route.push(point);
    this.tapRoute=route.reverse();
    if(exit)this.tapRoute.push(exit);
    if(target)this.tapTarget={x,y,npcId:npc?.id};
  }

  private tapDirection(): Facing | undefined {
    if(this.tapTarget?.npcId){
      const target=this.tapTarget,npc=this.visibleNpcs().find(n=>n.id===target.npcId);
      if(!npc){this.stopTapRoute();return;}
      if(npc.x!==target.x||npc.y!==target.y)this.planTapRoute(npc.x,npc.y,npc.id);
    }
    if(this.tapRoute.length){
      const next=this.tapRoute[0], pos=this.state.pos;
      const edgeStep=next.x>=0&&next.x<this.map.tiles[0].length&&
        (next.y===-1&&this.map.edges?.north || next.y===this.map.tiles.length&&this.map.edges?.south);
      if(!edgeStep&&this.isBlocked(next.x,next.y)){this.stopTapRoute();this.tapNotice={text:"Passaggio occupato. Tocca una nuova destinazione.",until:this.time+2.5};return;}
      const dir=FACINGS.find(f=>pos.x+DIR_DELTA[f].dx===next.x&&pos.y+DIR_DELTA[f].dy===next.y);
      if(!dir){this.stopTapRoute();return;}
      this.tapRoute.shift();return dir;
    }
    if(this.tapTarget){
      const target=this.tapTarget;this.tapTarget=undefined;
      const pos=this.state.pos;
      const facing=FACINGS.find(f=>pos.x+DIR_DELTA[f].dx===target.x&&pos.y+DIR_DELTA[f].dy===target.y);
      if(facing){pos.facing=facing;this.interact();}
    }
    return undefined;
  }

  private chooseRemote(index?: number): void {
    if(!this.remoteMenu || this.stack.top!==this)return;
    const peerId=this.remoteMenuPeerId;
    this.remoteMenu=null;this.input.reset();
    if(index===0)this.talkWithRemote(peerId);
    else if(index===1)this.inspectRemote(peerId);
    else if(index===2)this.startTradeWithRemote(peerId);
    else if(index===3)this.challengeRemote(peerId);
  }

  private chooseAsk(index?: number): void {
    const menu = this.askMenu;
    if (!menu || this.stack.top !== this || (index !== undefined && menu.items[index]?.disabled)) return;
    const pick = this.askPick, handler = index === 0 ? this.askYes : this.askNo;
    this.askMenu = null; this.askPick = null; this.askYes = null; this.askNo = null;
    this.input.reset();
    if (index !== undefined && pick) pick(index); else handler?.();
  }

  get uiPanel():UiPanel|undefined {
    if (this.remoteMenu) {
      const menu=this.remoteMenu;
      return {conversation:{speaker:"Giocatore online"},title:"Giocatore online",subtitle:readableCopy(this.askLabel),selected:menu.index,
        actions:menu.items.slice(0,4).map((item,i)=>({label:item.label.charAt(0)+item.label.slice(1).toLocaleLowerCase("it"),run:()=>{if(this.remoteMenu===menu)this.chooseRemote(i);}})),
        back:{label:"Indietro",run:()=>{if(this.remoteMenu===menu)this.chooseRemote();}}};
    }
    if (this.askMenu) {
      const menu = this.askMenu;
      return {conversation:{speaker:this.msg.speaker,portrait:this.msg.portrait},title:"Scegli",subtitle:readableCopy(this.askLabel),selected:menu.index,
        actions:menu.items.map((item,i) => ({label:item.label.charAt(0)+item.label.slice(1).toLocaleLowerCase("it"),disabled:item.disabled,run:() => {if(this.askMenu===menu)this.chooseAsk(i);}})),
        back:{label:"Indietro",run:() => {if(this.askMenu===menu)this.chooseAsk();}}};
    }
    const commands=this.touchActions;
    if(!commands)return undefined;
    return {title:'Il primo compagno',subtitle:'Quirino: le promesse si somigliano. Le mosse no.',tiles:true,
      actions:commands.slice(0,3).map((action,i)=>({...action,hint:undefined,facts:undefined,row:{kind:'tile' as const,icon:`/sprites/monsters/${STARTERS[i]}.png`,types:SPECIES[STARTERS[i]].types,meta:'Apri la scheda'}})),selected:0,
      back:{...commands[4],label:'Indietro',hint:'Esplora il laboratorio. Potrai scegliere parlando con Quirino.'}};
  }

  private loadMap(mapId: string): void {
    this.stopTapRoute();
    // Hardening: un save importato/manomesso con un mapId inesistente farebbe
    // crashare qui (this.map.npcs su undefined). Ricadi su "borgo" (mappa iniziale,
    // sempre presente) invece di brickare lo slot.
    if (!MAPS[mapId]) {
      console.warn(`[loadMap] mapId sconosciuto "${mapId}", ricado su borgo`);
      mapId = "borgo";
      this.state.pos.mapId = "borgo";
    }
    this.map = MAPS[mapId];
    this.terrain.invalidate();
    this.atmosphere.reset();
    this.cameraPosition=null;this.dialogueZoom=1;
    this.starterDeck = true;
    this.justEnteredMap = true;
    // ENCORE di BERLUSCONIX: il flag che mostra l'NPC magnate-encore va
    // RICALCOLATO a ogni ingresso al casinò (se nel frattempo l'hai eletto
    // altrove, l'encore sparisce; visibleNpcs è flag-driven).
    if (mapId === "casino") {
      this.state.flags["berlu-encore-ready"] = Boolean(
        this.state.flags["garante-beaten"] && this.state.dex["berlusconix"] !== "caught"
      );
    }
    this.npcs = this.map.npcs.map((npc) => this.makeRuntimeNpc(npc));
    if (mapId === "route1" && this.state.flags["opening-v2"] && !this.state.flags["rival1-beaten"]) {
      this.npcs.push(this.makeRuntimeNpc({ id: "opening-rival", pal: "rival", wander: false, x: 15, y: 5, facing: "down", nameplate: "GIANNI", lines: [] }));
    }
    // Cambiando mappa la vecchia lista NPC viene sostituita: scarta il ref allo
    // sprite del PG vagante (altrimenti puntereebbe a un NPC non più disegnato).
    this.wanderNpc = null;
    this.wanderTrainer = null;
    this.exclaimNpc = null;
    // RIVALE GIANNI ricorrente: se la tappa corrente è su questa mappa e non
    // l'hai ancora battuta, aggiungi il suo NPC (con linea di vista).
    const stage = rivalStageFor(this.state.rivalWins);
    if (stage && stage.mapId === mapId && !this.state.defeatedTrainers.includes(stage.id)) {
      this.npcs.push(this.makeRuntimeNpc({
        id: stage.id, pal: "rival", x: stage.x, y: stage.y, facing: stage.facing,
        trainerId: stage.id, sightRange: stage.sightRange,
        lines: ["GIANNI: ehi! Sì, dico a te."]
      }));
    }
    this.rustles = [];
    // Cambio mappa = cambio room: qualunque handshake duello in corso muore.
    if (this.duelWait) {
      mp.duelBusy = false; // eravamo "occupati" in attesa dello start
    }
    this.pendingDuelInvite = null;
    this.duelWait = null;
    this.duelStartMsg = null;
    this.duelDeclineMsg = null;
    audio.playMusic(this.map.music ?? "borgo");
    if (mapId === "campo_largo" && this.state.flags["ue-beaten"] && !this.state.flags["atto3Started"]) {
      this.state.flags["atto3Started"] = true;
      saveGame(this.state);
      this.say([
        "CAPO CAMPAGNA: benvenuto a CAMPO LARGO.",
        "TRE CANDIDATI, DUE POSTI: parla con ciascuno e leggi VANTAGGIO, COSTO e LINEA ROSSA.",
        "Il RETROPALCO a est ospita il CIRCOLO. Quando hai due alleati, torna dal FOTOGRAFO a nord: il dossier precede la conferma."
      ]);
    }
    this.fadeT = 0.35; // breve dissolvenza d'ingresso nella nuova mappa
    // Memorizza l'ultima città-con-bar visitata: è lì che si respawna al KO.
    // ECCEZIONE Stretto: finché IL CAPITANO non è battuto (ponte-beaten), NON
    // impostare qui il respawn — il bar dello Stretto (14,5) è a NORD del gate del
    // ponte, quindi perdere contro il Capitano ti farebbe rinascere OLTRE di lui,
    // saltando il boss. Restando su Caput Mundi come respawn, una sconfitta ti
    // riporta prima del gate e devi riaffrontarlo.
    const gatedStretto = mapId === "stretto" && !this.state.flags["ponte-beaten"];
    if (this.map.outdoor && BAR_RESPAWN[mapId] && !gatedStretto) {
      this.state.lastBar = mapId;
    }
    // Multiplayer: entra nella room di questa mappa (vedi solo chi è qui).
    // Il record duelli va nel profilo broadcast (targhetta sopra l'avatar).
    mp.setDuelWins(this.state.duelWins);
    // ISPEZIONA: espongo agli altri l'anteprima della mia squadra (solo specie).
    mp.setPartyPreview(this.state.party.map((mon) => mon.speciesId));
    const p = this.state.pos;
    mp.joinMap(mapId, p.x, p.y, p.facing);
    // Se lo spawn è su ACQUA (arrivo navale allo Stretto), attiva subito il
    // TRAGHETTO: prima syncFerryVehicle girava solo in onStepComplete, quindi
    // il player appariva "a piedi sull'acqua" finché non muoveva il primo passo.
    this.syncFerryVehicle();
    // Autosave a ogni cambio mappa: warp e bordi nord/sud aggiornano state.pos e
    // chiamano loadMap, ma prima nessuno salvava — chiudendo l'app si tornava a
    // un punto vecchio, spesso su un'altra mappa. saveGame è try/catch: sicuro.
    saveGame(this.state);
    // SFIDA DEL GIORNO disponibile: BREAKING NEWS all'arrivo a Caput Mundi
    // (toast non bloccante, una volta al giorno per sessione).
    const today = localDateKey();
    if (
      mapId === "capitale" &&
      this.state.party.length > 0 &&
      this.state.lastDailyDate !== today &&
      this.dailyBannerDay !== today
    ) {
      this.dailyBannerDay = today;
      this.showBanner("BREAKING NEWS!", "SFIDA DEL GIORNO IN PIAZZA", "#e8c84a");
    }
    // MOSTRO DEL GIORNO: annuncio all'ingresso in una zona con incontri, la
    // prima volta nel giorno (flag di SESSIONE, deterministico, zero save).
    // Il toast della SFIDA DEL GIORNO (sopra) ha priorità.
    if (this.map.encounters && this.state.party.length > 0 && !this.banner) {
      const boost = this.todaysBoostId();
      if (boost && this.spawnBannerShown.get(mapId) !== today) {
        this.spawnBannerShown.set(mapId, today);
        this.showBanner("AVVISTAMENTI!", `OGGI TANTI ${SPECIES[boost].name}!`, "#7ad858");
      }
    }
  }

  // Giorno (locale) in cui il toast della SFIDA DEL GIORNO è già stato mostrato.
  private dailyBannerDay = "";
  // mapId -> giorno in cui l'annuncio del MOSTRO DEL GIORNO è già uscito (sessione).
  private spawnBannerShown = new Map<string, string>();

  // Respect chapter gates and early version exclusives. An explicitly earned
  // cross-version recruitment is available to both browser versions.
  private effectiveEncounters() {
    return (this.map.encounters ?? []).filter((e) => (!e.requiresFlag || this.state.flags[e.requiresFlag]) && (e.anyVersion || speciesAvailable(e.speciesId, this.state.browserSeed)));
  }

  // Specie "avvistata" oggi in questa zona (weight x4), null se non ci sono incontri.
  private todaysBoostId(): string | null {
    return dailyBoostSpeciesId(this.map.id, this.effectiveEncounters());
  }

  // Crea lo stato runtime di un NPC. Decide se può vagare: esplicito via
  // `wander`, oppure di default per gli NPC "ambientali" (niente trainer, ruolo
  // funzionale o linea di vista — quelli devono restare al loro posto).
  private makeRuntimeNpc(npc: NpcDef): RuntimeNpc {
    const ambient =
      !npc.trainerId && !npc.sightRange && !npc.shop && !npc.healer && !npc.casino &&
      !npc.box && !npc.mafia && !npc.transport && !npc.gift && !npc.vehicleGift &&
      !npc.legendary && !npc.daily && !npc.coppa && !npc.monument;
    const canWander = npc.wander ?? (ambient && this.map.outdoor);
    return {
      ...npc,
      currentFacing: npc.facing,
      turnTimer: 2 + Math.random() * 4,
      homeX: npc.x,
      homeY: npc.y,
      dispX: npc.x * TILE,
      dispY: npc.y * TILE,
      walkTimer: 2 + Math.random() * 4,
      stepFrom: null,
      stepT: 0,
      canWander
    };
  }

  // Aggiorna la camminata di un NPC vagante: interpola il passo in corso o, se
  // fermo, ogni tanto ne avvia uno nuovo verso una cella libera vicino a casa.
  private updateNpcWalk(npc: RuntimeNpc, dt: number): void {
    if (npc.stepFrom) {
      npc.stepT += dt / 0.3; // ~0.3s per cella, andatura tranquilla
      if (npc.stepT >= 1) {
        npc.stepT = 0;
        npc.stepFrom = null;
        npc.dispX = npc.x * TILE;
        npc.dispY = npc.y * TILE;
        npc.walkTimer = 1.5 + Math.random() * 4; // pausa prima del prossimo passo
      } else {
        npc.dispX = (npc.stepFrom.x + (npc.x - npc.stepFrom.x) * npc.stepT) * TILE;
        npc.dispY = (npc.stepFrom.y + (npc.y - npc.stepFrom.y) * npc.stepT) * TILE;
      }
      return;
    }
    npc.walkTimer -= dt;
    if (npc.walkTimer > 0) {
      return;
    }
    npc.walkTimer = 1.5 + Math.random() * 3;
    // Prova una direzione a caso; resta entro 2 celle dalla posizione iniziale.
    const dir = FACINGS[Math.floor(Math.random() * FACINGS.length)];
    npc.currentFacing = dir;
    const d = DIR_DELTA[dir];
    const nx = npc.x + d.dx;
    const ny = npc.y + d.dy;
    if (Math.abs(nx - npc.homeX) > 2 || Math.abs(ny - npc.homeY) > 2) {
      return; // troppo lontano da casa: questo giro gira solo la testa
    }
    if (!this.npcCanEnter(nx, ny, npc)) {
      return;
    }
    npc.stepFrom = { x: npc.x, y: npc.y };
    npc.stepT = 0;
    npc.x = nx;
    npc.y = ny;
  }

  // Una cella è agibile per un NPC se: tile calpestabile, non c'è il player, né
  // un altro NPC, né un warp o un pickup visibile (per non bloccare il giocatore).
  private npcCanEnter(x: number, y: number, self: RuntimeNpc): boolean {
    const tile = TILES[this.tileAt(x, y)];
    if (!tile || tile.solid || tile.encounter || tile.ledge) {
      return false; // niente erba alta: eviterebbe trigger strani e sembra più sensato
    }
    if (this.state.pos.x === x && this.state.pos.y === y) {
      return false;
    }
    if (this.npcs.some((n) => n !== self && n.x === x && n.y === y)) {
      return false;
    }
    if (this.map.warps.some((w) => w.x === x && w.y === y)) {
      return false;
    }
    if (this.map.pickups.some((p) => !p.hidden && p.x === x && p.y === y && !this.state.pickedItems.includes(p.id))) {
      return false;
    }
    return true;
  }

  private visibleNpcs(): RuntimeNpc[] {
    return this.npcs.filter((npc) => {
      if (npc.showIfFlag && !this.state.flags[npc.showIfFlag]) {
        return false;
      }
      if (npc.hideIfFlag && this.state.flags[npc.hideIfFlag]) {
        return false;
      }
      return true;
    });
  }

  private tileAt(x: number, y: number): string {
    const ch = this.map.tiles[y]?.[x] ?? (this.map.outdoor ? "T" : "A");
    // Un albero abbattuto dalla RUSPA diventa erba calpestabile.
    if (ch === "T" && isBulldozed(this.state, this.map.id, x, y)) {
      return this.map.outdoor ? "." : "p";
    }
    return civicBridgeTile(this.state, this.map.id, x, y, ch);
  }

  /** Extend visible road mouths beyond the map, without changing collision/warp tiles. */
  private terrainTileAt(x:number,y:number):string {
    const rows=this.map.tiles;
    const edgeY=y<0&&this.map.edges?.north?0:y>=rows.length&&this.map.edges?.south?rows.length-1:null;
    if(edgeY!==null){
      const boundary=this.tileAt(x,edgeY),def=TILES[boundary];
      if(def&&!def.solid&&!def.water)return boundary;
    }
    return this.tileAt(x,y);
  }

  private terrainShadows():TerrainShadow[] {
    const shadows:TerrainShadow[]=[];
    this.map.tiles.forEach((row,y)=>[...row].forEach((_,x)=>{
      const ch=this.tileAt(x,y),group=buildingKey(ch);
      if(group) {
        if(buildingKey(this.tileAt(x-1,y))===group||buildingKey(this.tileAt(x,y-1))===group)return;
        const fp=this.buildingFootprint(x,y,ch);
        shadows.push({x:x*TILE,y:(y+fp.h)*TILE-3,width:fp.w*TILE,height:fp.h*TILE});
      } else if(TILES[ch]?.overlay&&!this.buildingCovering(x,y)&&!['f',',','~'].includes(ch)) {
        const h=this.map.objectSizes?.[ch]??WORLD_OBJECT_TARGET_PX[ch]??TILE;
        shadows.push({x:x*TILE+3,y:(y+1)*TILE-2,width:ch==='T'?12:10,height:h});
      }
    }));
    for(const lamp of this.map.lamps??[])shadows.push({x:lamp.x*TILE+6,y:(lamp.y+1)*TILE-2,width:4,height:30});
    return shadows;
  }

  private terrainSample(x:number,y:number):TerrainSample {
    let ch=this.terrainTileAt(x,y);
    const def=TILES[ch];
    const base=this.map.outdoor?'.':'p';
    if(def?.ledge)ch=base;
    const covering=this.buildingCovering(x,y);
    const obj=this.objectPng(ch);
    const special='ORSN'.includes(ch);
    if(covering)ch=base;
    else if(def?.overlay)ch=def.overWater?'w':base;
    else if(obj)ch=base;
    else if(special)ch=ch==='N'||this.map.tileOverrides?.['=']==='tiles/snow_path.png'?'i':base;
    const material=this.map.groundMaterials?.[ch];
    const kind:TerrainKind=material??(ch==='w'?'water':ch==='='?'path':ch==='z'?'sand':ch==='.'?'grass':ch==='j'?'asphalt':'floor');
    if(!covering&&!def?.overlay&&def?.overWater) return {kind:'water',image:this.tilePng('w'),layers:[this.tilePng(ch)],decorate:false};
    const authored=!this.map.tileOverrides?.[ch]&&'.=zpw'.includes(ch);
    return {kind,image:authored?terrainVariantImage(ch,ch==='w'?0:terrainHash(this.map.id,x,y)%4,material):this.tilePng(ch),decorate:!covering&&!this.map.tileOverrides?.[ch]&&'.=zw'.includes(ch)};
  }

  // Terreni PixelLab cartoon: erba/sentiero/sabbia/acqua restano tile top-down
  // pieni. I Wang grass/path provati sembravano rilievi attraversabili.
  // Offset di disegno (px) per centrare il player DAVANTI a una PORTA larga 2 tile.
  // Le porte (doormat interni `cc`, portoni edifici `dd`/`DD`, porta dorata `gg`)
  // sono 2 celle, ma il player ne occupa 1 e si ferma sulla colonna SINISTRA o
  // DESTRA → appare spostato a lato. Da FERMO, se la cella SOTTO di lui è metà di
  // una porta 2 tile, spostiamo SOLO lo sprite di mezzo tile verso il centro della
  // coppia (la camera non si muove). Vale sia dentro (davanti al doormat) sia fuori
  // (davanti al portone). Appena cammina via, l'offset sparisce da sé.
  private doorCenteringOffset(): number {
    if (this.moving || this.state.vehicle) {
      return 0;
    }
    const { x, y } = this.state.pos;
    const isDoor = (ch: string): boolean =>
      this.map.outdoor ? ch === "d" || ch === "D" || ch === "g" : ch === "c";
    // La porta può stare SOTTO il player (interni: davanti al doormat d'uscita in
    // basso) o SOPRA (esterni: davanti al portone in fondo all'edificio). Controlla
    // entrambe le righe adiacenti e centra sulla coppia trovata.
    for (const dy of [1, -1]) {
      if (!isDoor(this.tileAt(x, y + dy))) {
        continue;
      }
      if (isDoor(this.tileAt(x + 1, y + dy))) {
        return 8; // colonna sinistra della porta → sposta verso destra (centro)
      }
      if (isDoor(this.tileAt(x - 1, y + dy))) {
        return -8; // colonna destra della porta → sposta verso sinistra (centro)
      }
    }
    return 0;
  }

  // Texture PNG di un tile per la mappa corrente: prima l'override di mappa
  // (es. roccia in grotta), poi il PNG di default (`tileImage`). null = pixmap.
  private tilePng(ch: string): HTMLImageElement | null {
    const ov = this.map.tileOverrides?.[ch];
    if (ov) {
      return getSpriteImage(`tile:ov:${this.map.id}:${ch}`, ov);
    }
    return tileImage(ch);
  }
  private objectPng(ch: string): HTMLImageElement | null {
    const path = this.map.objectOverrides?.[ch];
    return path ? getSpriteImage(`obj:ov:${this.map.id}:${ch}`, path) : objectImage(ch);
  }

  // Footprint di un EDIFICIO a partire dall'angolo alto-sx (atx,aty) di un blocco
  // tetto: misura larghezza/altezza in tile inglobando le righe di FACCIATA
  // (muro/porta/finestra) contigue sotto il tetto. Così il building-PNG si scala
  // ESATTAMENTE sull'impronta disegnata nella mappa ASCII, qualunque sia la sua
  // dimensione (4x3 casa, 6x3 palestra/casinò, 10x4 palazzo) — niente overflow,
  // niente celle-tetto scoperte, niente edifici che galleggiano o si tagliano.
  private buildingFootprint(atx: number, aty: number, roofCh: string): { w: number; h: number } {
    const groupKey = buildingKey(roofCh);
    // Stessa "famiglia" di tetto = stesso file PNG (es. e/Q bar, y/B/x palestra).
    const sameGroup = (x: number, y: number): boolean => buildingKey(this.tileAt(x, y)) === groupKey;
    // Larghezza: celle tetto dello stesso GRUPPO contigue verso destra.
    let w = 0;
    while (sameGroup(atx + w, aty)) {
      w += 1;
    }
    // Altezza: righe di tetto (stesso gruppo) + righe di facciata sotto, larghe
    // almeno quanto il tetto (centrate). Mi fermo alla prima riga senza facciata.
    let roofRows = 0;
    while (sameGroup(atx, aty + roofRows)) {
      roofRows += 1;
    }
    let facadeRows = 0;
    for (let r = aty + roofRows; ; r += 1) {
      // La riga conta come facciata se almeno una cella nella fascia [atx, atx+w)
      // è un char-facciata. (Il muro può essere più largo del tetto: `mmdnmm`.)
      let any = false;
      for (let c = atx - 1; c < atx + w + 1; c += 1) {
        if (isFacade(this.tileAt(c, r))) {
          any = true;
          break;
        }
      }
      if (!any) {
        break;
      }
      facadeRows += 1;
      if (facadeRows > 2) {
        break; // le facciate sono 1 riga (case) o eccezione; cap di sicurezza
      }
    }
    return { w, h: roofRows + facadeRows };
  }

  // Se la cella (tx,ty) cade dentro la footprint di un edificio col building-PNG
  // pronto, ritorna il char-tetto di quell'edificio (così il 1° passo sa che il
  // terreno sotto va lasciato libero e il PNG ci penserà). Altrimenti null.
  // Cerca l'angolo alto-sx del blocco-tetto scorrendo su/sinistra dalla cella, su
  // entrambi i char tetto E facciata, poi verifica che (tx,ty) sia nella footprint.
  private buildingCovering(tx: number, ty: number): string | null {
    const here = this.tileAt(tx, ty);
    if (!isRoof(here) && !isFacade(here)) {
      return null;
    }
    // Trova un char-tetto risalendo: se sono su una facciata salgo finché trovo
    // il tetto; se sono già su un tetto resto. Poi vado all'angolo alto-sx.
    let rx = tx;
    let ry = ty;
    if (isFacade(here)) {
      // sali finché trovi un tetto (max poche righe)
      let steps = 0;
      while (steps < 4 && !isRoof(this.tileAt(rx, ry))) {
        ry -= 1;
        steps += 1;
      }
      if (!isRoof(this.tileAt(rx, ry))) {
        return null;
      }
    }
    const roofCh = this.tileAt(rx, ry);
    const groupKey = buildingKey(roofCh);
    // angolo alto-sx del blocco tetto (stesso GRUPPO, non stesso char)
    let atx = rx;
    let aty = ry;
    while (buildingKey(this.tileAt(atx - 1, aty)) === groupKey) atx -= 1;
    while (buildingKey(this.tileAt(atx, aty - 1)) === groupKey) aty -= 1;
    const fp = this.buildingFootprint(atx, aty, roofCh);
    if (!buildingPath(roofCh, fp)) {
      return null;
    }
    // (tx,ty) dentro la footprint? La facciata può sbordare di 1 col per lato.
    if (tx >= atx - 1 && tx < atx + fp.w + 1 && ty >= aty && ty < aty + fp.h) {
      // ma solo se è davvero tetto o facciata (non erba a fianco)
      if (isRoof(here) || isFacade(here)) {
        return roofCh;
      }
    }
    return null;
  }

  private isBlocked(x: number, y: number): boolean {
    const tile = TILES[this.tileAt(x, y)];
    if (!tile || tile.ledge) {
      return true;
    }
    // MN TRAGHETTO: con la mossa macchina sbloccata, l'acqua diventa
    // attraversabile (come SURF). Senza, resta un muro liquido.
    if (tile.water) {
      if (!this.canFerry()) {
        return true;
      }
    } else if (tile.solid) {
      return true;
    }
    if (this.visibleNpcs().some((npc) => npc.x === x && npc.y === y)) {
      return true;
    }
    if (
      this.map.pickups.some(
        (p) => p.x === x && p.y === y && !p.hidden && !this.state.pickedItems.includes(p.id)
      )
    ) {
      return true; // i tesori nascosti NON bloccano: niente muri invisibili
    }
    if (this.map.id === "lab" && STARTER_SPOTS.some((s) => s.x === x && s.y === y)) {
      return true;
    }
    return false;
  }

  // L'acqua è navigabile solo se POSSIEDI il TRAGHETTO (al timone il CAPITANO
  // SCHETTINO). L'imbarco è automatico: niente menu, niente soft-lock.
  private canFerry(): boolean {
    return Boolean(this.state.flags["veh-traghetto"]);
  }

  private isOutdoorDoorWarp(warp: MapDef["warps"][number]): boolean {
    const target = MAPS[warp.toMap];
    const ch = this.tileAt(warp.x, warp.y);
    return Boolean(this.map.outdoor && target && !target.outdoor && (ch === "d" || ch === "D" || ch === "g"));
  }

  private enteredDoorFromFront(warp: MapDef["warps"][number]): boolean {
    return this.state.pos.facing === "up" && this.fromX === warp.x && this.fromY === warp.y + 1;
  }

  // Imbarco/sbarco automatico: se sei su acqua col traghetto posseduto, il
  // veicolo "traghetto" è attivo (scafo+Schettino); appena torni a terra,
  // ripristina il veicolo terrestre precedente. Chiamato dopo ogni passo.
  private syncFerryVehicle(): void {
    if (!this.canFerry()) {
      return;
    }
    const onWater = Boolean(TILES[this.tileAt(this.state.pos.x, this.state.pos.y)]?.water);
    if (onWater && this.state.vehicle !== "traghetto") {
      this.landVehicle = (this.state.vehicle as VehicleId | null) ?? null; // ricorda il mezzo terrestre
      this.state.vehicle = "traghetto";
    } else if (!onWater && this.state.vehicle === "traghetto") {
      this.state.vehicle = this.landVehicle ?? null;
    }
  }

  private say(lines: string[], after?: () => void, auto = false): void {
    this.stopTapRoute();
    const facing = DIR_DELTA[this.state.pos.facing];
    const speaker = this.visibleNpcs().find(npc => npc.x === this.state.pos.x + facing.dx && npc.y === this.state.pos.y + facing.dy);
    this.dialogueFocus=Boolean(!auto&&speaker&&(speaker.trainerId||speaker.gift||speaker.legendary||speaker.id==='professor'||speaker.id==='opening-rival'));
    const name = auto ? "Notifica" : speaker?.id === "professor" ? "Prof. Quirino" : speaker?.id === "opening-rival" ? "Gianni" : speaker?.dialogueName ?? (speaker?.trainerId ? TRAINERS[speaker.trainerId]?.name : speaker?.nameplate);
    const prefix = speaker && !auto ? lines[0]?.match(/^([A-ZÀÈÉÌÒÙ][A-ZÀÈÉÌÒÙ .'-]{1,28}):\s*/) : undefined;
    const caption = name ?? (prefix ? prefix[1].charAt(0) + prefix[1].slice(1).toLocaleLowerCase("it") : speaker ? "Abitante" : "Politicmon");
    const stripped = prefix ? lines[0].slice(prefix[0].length) : "";
    const text = prefix ? [stripped.charAt(0).toLocaleUpperCase("it") + stripped.slice(1), ...lines.slice(1)].filter(Boolean) : lines;
    this.afterMsg = after ?? null;
    this.msg.show(text, () => {
      const callback = this.afterMsg;
      this.afterMsg = null;
      callback?.();
    }, auto, caption, !auto&&speaker&&NPC_WITH_PNG.has(speaker.pal)?`/sprites/chars/npc_${speaker.pal}_south.png`:undefined);
  }

  // Prompt SÌ/NO riusabile (inviti scambio/duello, rivincite...). Usa il
  // plumbing askMenu/askYes/askNo/askLabel: il draw esiste già, e il tasto B
  // chiama onNo (ramo cancel del blocco askMenu in update).
  private askYesNo(label: string, onYes: () => void, onNo?: () => void): void {
    this.stopTapRoute();
    this.askLabel = label;
    this.askMenu = new Menu([{ label: "SÌ" }, { label: "NO" }]);
    this.askYes = onYes;
    this.askNo = onNo ?? null;
  }

  // Menù a scelta multipla: onPick(index) sulla voce scelta, onCancel sul B.
  private askChoice(
    label: string,
    options: string[],
    onPick: (index: number) => void,
    onCancel?: () => void
  ): void {
    this.stopTapRoute();
    this.askLabel = label;
    this.askMenu = new Menu(options.map((label) => ({ label })));
    this.askPick = onPick;
    this.askNo = onCancel ?? null;
  }

  // NPC GUIDA (Luca): intro una tantum, poi menù di domande in loop finché non
  // esci. Riapre il menù dopo ogni risposta per un'esperienza da "sportello".
  private openGuide(npc: RuntimeNpc): void {
    const guide = npc.guide;
    if (!guide) {
      return;
    }
    const showMenu = () => {
      const options = [...guide.topics.map((t) => t.label), "NIENTE, GRAZIE"];
      this.askChoice(guide.prompt, options, (index) => {
        if (index >= guide.topics.length) {
          this.say(["A presto! Torna quando vuoi."]);
          return;
        }
        this.say(guide.topics[index].lines, showMenu);
      });
    };
    // Intro solo al primo contatto della sessione; poi dritti al menù.
    if (!this.guideGreeted.has(npc.id)) {
      this.guideGreeted.add(npc.id);
      this.say(guide.intro, showMenu);
    } else {
      showMenu();
    }
  }


  // ---- Battles ----

  private queueBattle(start: () => void): void {
    this.stopTapRoute();
    // Lampeggio in stile Game Boy prima della battaglia.
    audio.encounterSting();
    this.encounterFlash = 0.55;
    if(!this.state.reduceEffects)this.shake=.18;
    this.pendingBattle = start;
    // In lotta = occupato: inviti scambio/duello ricevono auto-decline.
    mp.duelBusy = true;
  }

  // Sapore casuale dell'incontro selvatico: ~22% delle volte applica un
  // modificatore di livello con un annuncio, modulato dai SONDAGGI. Restituisce
  // null per un incontro "normale".
  private rollEncounterFlavor(): { dLevel: number; line: string } | null {
    if (Math.random() > 0.22) {
      return null;
    }
    const sond = this.state.sondaggi;
    const pool: Array<{ dLevel: number; line: string }> = [
      { dLevel: 3, line: "COMIZIO PIENO.\nL'AVVERSARIO ARRIVA CARICO." },
      { dLevel: -2, line: "ASTENSIONISTA.\nNON HA PRESO IL CAFFÈ." },
      { dLevel: 1, line: "CAMPAGNA ELETTORALE:\nUN CAFFÈ IN PIÙ." }
    ];
    // SONDAGGI alti -> più probabile il "VIP" tosto; bassi -> più astensionisti.
    if (sond >= 70 && Math.random() < 0.6) {
      return pool[0];
    }
    if (sond < 40 && Math.random() < 0.6) {
      return pool[1];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ---- Candidati selvatici visibili nell'erba alta ----

  private roamerEligible(): boolean {
    const tutorial = Boolean(this.state.flags["opening-v2"]) && !this.state.flags["opening-encountered"];
    return this.map.outdoor && Boolean(this.map.encounters?.length) && !tutorial && (this.map.encounterRate ?? 0.18) > 0
      && this.state.party.some(mon => mon.hp > 0);
  }

  private roamerOpen(x: number, y: number): boolean {
    return !this.isBlocked(x, y) && !this.map.warps.some(warp => warp.x === x && warp.y === y);
  }

  private syncRoamers(dt: number): void {
    if (!this.roamerEligible()) { this.roamers = null; this.roamerMap = ""; return; }
    const pos = this.state.pos, player = { x: pos.x, y: pos.y, facing: pos.facing };
    if (!this.roamers || this.roamerMap !== this.map.id) {
      const table = this.effectiveEncounters(), boost = this.todaysBoostId();
      const rows = this.map.tiles, height = rows.length, width = rows[0]?.length ?? 0;
      let grass = 0;
      for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (TILES[this.tileAt(x, y)]?.encounter) grass += 1;
      this.roamerCount = roamerTarget(grass);
      this.roamers = new RoamerField({ width, height, isGrass: (x, y) => Boolean(TILES[this.tileAt(x, y)]?.encounter), isOpen: (x, y) => this.roamerOpen(x, y) },
        table.map(entry => ({ speciesId: entry.speciesId, minLv: entry.minLv, maxLv: entry.maxLv, weight: entry.speciesId === boost ? entry.weight * DAILY_BOOST_MULT : entry.weight })));
      this.roamers.fill(this.roamerCount, player);
      this.roamerMap = this.map.id;
      this.roamerHinted = false;
    }
    const scared = this.state.repellentSteps > 0;
    this.roamers.update(dt, player, scared, this.roamerCount);
    this.roamerGrace = Math.max(0, this.roamerGrace - dt);
    if (this.roamerGrace > 0) return;
    const contact = this.roamers.contact(player, scared);
    if (contact) { this.startRoamerBattle(contact); return; }
    if (!this.roamerHinted && !roamerHintShown && this.roamers.roamers.some(r => Math.abs(r.x - pos.x) + Math.abs(r.y - pos.y) <= 8)) {
      this.roamerHinted = true; roamerHintShown = true;
      this.tapNotice = { text: "Sorprendilo alle spalle!", until: this.time + 5 };
    }
  }

  private startRoamerBattle(contact: RoamerContact): void {
    const { roamer, advantage } = contact;
    this.roamers?.remove(roamer);
    this.stopTapRoute();
    const mod = advantage ? null : this.rollEncounterFlavor();
    const level = firstRecruitLevel(this.state, Math.max(2, roamer.level + (mod?.dLevel ?? 0)));
    const name = SPECIES[roamer.speciesId]?.name ?? "Il candidato";
    const intro = advantage === "player" ? (roamer.mood === "sleep" ? `${name} dorme: agisci per primo!` : "Colto di spalle: agisci per primo!")
      : advantage === "foe" ? `${name} ti ha preso alle spalle!` : mod?.line.replace("\n", " ");
    this.state.flags["opening-encountered"] = true;
    this.roamerGrace = 3;
    this.startWildBattle(roamer.speciesId, level, undefined, undefined, false, intro, advantage);
  }

  private startWildBattle(
    speciesId: string,
    level: number,
    after?: (result: BattleResult) => void,
    music?: string,
    legendary = false,
    encounterIntro?: string,
    advantage?: "player" | "foe"
  ): void {
    this.queueBattle(() => {
      const foe = createMonster(speciesId, level);
      this.stack.push(
        new BattleScene(this.stack, this.input, {
          state: this.state,
          foeTeam: [foe],
          music,
          legendary,
          encounterIntro,
          advantage,
          onEnd: (result) => {
            this.onBattleEnd(result);
            after?.(result);
          }
        })
      );
    });
  }

  private startTrainerBattle(def: TrainerDef, after?: (result: BattleResult) => void, isRematch = false, doctrine?: ElectionDoctrine, maxHealingItems?: number | null): void {
    this.queueBattle(() => {
      const practice = preparePractice(this.state, def.id);
      const firstRival = def.id === "rival1" && Boolean(this.state.flags["opening-v2"]) && !this.state.flags["rival1-beaten"];
      if (firstRival) this.state.party.forEach(healMonster);
      const team = buildTrainerTeam(this.state, def, {
        fallbackTeam: () => this.buildRivalTeam(),
        bossTrainerIds: BOSS_TRAINER_IDS
      });
      const begin = () => this.stack.push(
        new BattleScene(this.stack, this.input, {
          state: this.state,
          foeTeam: team,
          trainer: practice ? { ...def, intro: ["TIROCINIO GRATIS.\nALMENO QUI TI CURANO."] } : def,
          isRematch,
          electionDoctrine: doctrine,
          maxBattleHealingItems: maxHealingItems,
          onEnd: (result) => {
            let promiseNotices: string[] = [];
            // I PG vaganti ("wander:*"), la SFIDA DEL GIORNO ("daily:*") e i
            // match della COPPA ("coppa:*") restano ripetibili: mai in
            // defeatedTrainers. La guardia includes() evita duplicati alla
            // vittoria di una RIVINCITA; markRematchClock riavvia il cooldown.
            if (shouldPersistTrainerVictory(def.id, result)) {
              promiseNotices = recordNewTrainerVictory(this.state, def.id, result);
              markRematchClock(this.state, def.id);
            }
            // Collegio sandbox R1: il primo dibattito produce un outcome one-shot
            // anche se perso. Un retry successivo non duplica mai il consenso.
            if (def.id === "campo-debate" && !this.state.flags["campo-debate-resolved"] && (result === "win" || result === "loss")) {
              const districtResult = resolveAction(this.state.election, {
                districtId: "centro",
                action: "debate",
                variant: result,
                baseDelta: result === "win" ? 8 : -4
              });
              if (districtResult.ok) {
                this.state.election = districtResult.state;
                this.state.flags["campo-debate-resolved"] = true;
                if (result === "win") audio.districtGain();
                else audio.districtLoss();
              }
            }
            if (def.id === "futuro-anteriore" && result === "win") {
              const reward = futureRewardPatch(this.state.flags);
              if (reward) {
                Object.assign(this.state.flags, reward);
                audio.catchJingle();
                saveGame(this.state);
              }
            }
            if (def.id === "partner-perfetto" && result === "win") {
              const reward = diplomacyRewardPatch(this.state.flags);
              if (reward) {
                Object.assign(this.state.flags, reward);
                this.state.election = newElectionState(true);
                audio.catchJingle();
                saveGame(this.state);
              }
            }
            if (def.id === "campo-photographer" && result === "win") {
              const reward = photoChapterRewardPatch(this.state.flags);
              if (reward) {
                Object.assign(this.state.flags, reward);
                audio.catchJingle();
                saveGame(this.state);
              }
            }
            // Rimuovi lo sprite temporaneo del PG vagante a fine lotta (qualsiasi
            // esito): la vittoria su un "wander:*" non ricarica la mappa, quindi
            // senza questo l'NPC resterebbe sullo schermo per sempre.
            if (this.wanderNpc) {
              const gone = this.wanderNpc;
              this.npcs = this.npcs.filter((n) => n !== gone);
              this.wanderNpc = null;
              this.wanderTrainer = null;
            }
            if ((practice || firstRival) && result === "loss") {
              this.state.party.forEach(healMonster);
              this.showBanner("PRATICA", "SQUADRA CURATA: RIPROVA.", "#79ddba");
            }
            this.onBattleEnd(result, practice || firstRival || def.id.startsWith("coppa:"));
            if (promiseNotices.length) this.say(promiseNotices, () => after?.(result));
            else after?.(result);
          }
        })
      );
      if (trainerStyle(def.id).art) this.stack.push(new BossBriefingScene(this.stack, this.input, this.state, def, team, begin, () => { mp.duelBusy = false; audio.playMusic(this.map.music ?? "borgo"); }));
      else begin();
    });
  }

  private buildRivalTeam(): Monster[] {
    const counter = RIVAL_COUNTER[this.state.starterId] ?? "renzino";
    const evolved = SPECIES[counter].evolutions?.find((rule) => rule.level !== undefined)?.id ?? counter;
    return [createMonster("grillix", 16), createMonster(evolved, 18)];
  }

  // Restituisce il TrainerDef per un id: se è una tappa del RIVALE ricorrente
  // (id "rival-*"), lo costruisce al volo dallo stage con squadra scalata e
  // battute che ricordano gli scontri precedenti; altrimenti dai TRAINERS fissi.
  private trainerForId(trainerId: string): TrainerDef {
    if (trainerId.startsWith("rival-")) {
      const stage = RIVAL_STAGES.find((s) => s.id === trainerId);
      if (stage) {
        return {
          id: stage.id,
          name: "RIVALE GIANNI",
          pal: "rival",
          team: buildRivalStageTeam(this.state, stage),
          intro: stage.intro,
          defeat: stage.defeat,
          money: 400 + stage.level * 40,
          reward: stage.reward
        };
      }
    }
    return TRAINERS[trainerId];
  }

  private onBattleEnd(result: BattleResult, exhibition = false): void {
    this.stack.pop();
    mp.duelBusy = false;
    audio.playMusic(this.map.music ?? "borgo");
    // Missioni giornaliere: vittorie e catture avanzano i contatori del giorno
    // (il toast di completamento esce nel mondo, drenato in update()).
    if (result === "win") {
      bumpDailyQuest(this.state, "win2");
    } else if (result === "caught") {
      bumpDailyQuest(this.state, "catch1");
    }
    saveGame(this.state);
    if (result === "loss" && !exhibition) {
      if (!this.state.flags["dex-received"]) {
        for (const mon of this.state.party) {
          healMonster(mon);
        }
        this.state.pos = { mapId: "lab", x: 5, y: 6, facing: "up" };
        this.loadMap("lab");
        saveGame(this.state);
        this.say([
          "PROF. QUIRINO: stop tecnico!",
          "Ti rimetto in piedi la squadra. Il primo dibattito serve a imparare, non a rovinarsi la carriera.",
          "Riprova: usa anche le mosse di stato, non solo COMIZIO."
        ]);
        return;
      }
      // Sconfitta meno punitiva: perdi un quarto dei fondi (max 600€) invece
      // della metà, così una sconfitta non azzera la campagna né demotiva. Il
      // cap a 250 rendeva la sconfitta irrilevante a metà gioco (3-8% dei fondi);
      // 600 mantiene una conseguenza reale senza essere devastante.
      const lost = Math.min(Math.floor(this.state.money / 4), 600);
      this.state.money -= lost;
      const sondaggi = addSondaggi(this.state, -5);
      for (const mon of this.state.party) {
        healMonster(mon);
      }
      // Risveglio davanti al BAR SPORT dell'ULTIMA città visitata (non sempre
      // BORGO). Lo spot è la cella calpestabile davanti alla porta del bar.
      const city = this.state.lastBar && BAR_RESPAWN[this.state.lastBar] ? this.state.lastBar : "borgo";
      const spot = BAR_RESPAWN[city];
      const cityName = MAPS[city]?.name ?? "BORGO URNE";
      this.state.pos = { mapId: city, x: spot.x, y: spot.y, facing: "down" };
      this.loadMap(city);
      this.say([
        "Hai perso il consenso e anche i sensi...",
        `Ti risvegli davanti al BAR SPORT di ${cityName}, più leggero di ${lost}€.`,
        `I SONDAGGI crollano al ${sondaggi}%. I retroscenisti parlano già di rimpasto.`,
        "Il barista ha rimesso in sesto la squadra. Si riparte!"
      ]);
    }
  }

  // ---- Interactions ----

  private interact(): void {
    const pos = this.state.pos;
    const delta = DIR_DELTA[pos.facing];
    const tx = pos.x + delta.dx;
    const ty = pos.y + delta.dy;

    const npc = this.visibleNpcs().find((n) => n.x === tx && n.y === ty);
    if (npc) {
      this.interactNpc(npc);
      return;
    }

    // Giocatore ONLINE adiacente: menu unico ISPEZIONA / SCAMBIA / SFIDA / ANNULLA.
    const remote = mp.remotePlayers().find((r) => r.x === tx && r.y === ty);
    if (remote) {
      this.remoteMenu = new Menu([
        { label: "PARLA" }, { label: "ISPEZIONA" }, { label: "SCAMBIA" }, { label: "SFIDA" }, { label: "ANNULLA" }
      ]);
      this.remoteMenuPeerId = remote.id;
      this.askLabel = `${remote.nick}: Cosa vuoi fare?`;
      return;
    }

    // RUSPA: abbatte l'albero davanti (apre scorciatoie). Solo se attiva.
    const raw = this.map.tiles[ty]?.[tx];
    if (raw === "T" && this.state.vehicle === "ruspa" && !isBulldozed(this.state, this.map.id, tx, ty)) {
      this.state.bulldozed.push(bulldozedKey(this.map.id, tx, ty));
      audio.hitSuper(); // tonfo più corposo dell'hit normale
      this.shake = 0.45; // scossone: l'albero crolla, si sente
      saveGame(this.state);
      this.say(["VRRRRR... la RUSPA fa il suo dovere.", "L'albero è stato 'riqualificato'. Passaggio libero!"]);
      return;
    }

    if (this.map.id === "lab") {
      const spot = STARTER_SPOTS.find((s) => s.x === tx && s.y === ty);
      if (spot) {
        this.interactStarter(spot.speciesId);
        return;
      }
    }

    const sign = this.map.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      this.say(sign.lines);
      return;
    }

    // Arredo urbano esaminabile (fontane/statue/panchine): testo satirico.
    const deco = this.map.decoratives?.find((d) => d.x === tx && d.y === ty);
    if (deco) {
      // R42: la STATUA EQUESTRE della capitale (20,13) diventa il MONUMENTO AL
      // CANDIDATO man mano che lo finanzi (state.monumentLevel). È il modo in cui
      // il money-sink terminale è VISIBILE nel mondo, senza nuovi asset grafici.
      if (this.map.id === "capitale" && tx === 20 && ty === 13 && this.state.monumentLevel > 0) {
        this.say(monumentDecoLines(this.state.monumentLevel));
        return;
      }
      this.say(deco.lines);
      return;
    }

    const pickup = this.map.pickups.find(
      (p) => p.x === tx && p.y === ty && !this.state.pickedItems.includes(p.id)
    );
    if (pickup) {
      this.state.pickedItems.push(pickup.id);
      this.state.bag[pickup.itemId] = (this.state.bag[pickup.itemId] ?? 0) + pickup.qty;
      saveGame(this.state);
      if (pickup.hidden) {
        // Tesoro segreto: ricompensa la curiosità con una piccola celebrazione.
        audio.catchJingle();
        haptics.event();
        this.say([
          "Ehi! Qui c'era qualcosa di nascosto...",
          `TESORO SEGRETO! ${ITEMS[pickup.itemId].name} x${pickup.qty}!`
        ]);
      } else {
        audio.confirm();
        this.say([`Trovi ${ITEMS[pickup.itemId].name} x${pickup.qty}!`]);
      }
      return;
    }
    const warp = this.map.warps.find(w => w.x === tx && w.y === ty);
    if (warp && !this.isBlocked(tx,ty) && (!this.isOutdoorDoorWarp(warp) || pos.facing === "up")) {
      this.fromX = pos.x; this.fromY = pos.y;
      pos.x = tx; pos.y = ty; this.moving = true; this.moveT = 0;
      this.running = false;
    }
  }

  private interactNpc(npc: RuntimeNpc): void {
    if(this.state.flags["controls-intro"])this.state.flags["controls-interacted"]=true;
    if (npc.id === "opening-rival") {
      if (!firstRivalReady(this.state)) {
        this.say(["GIANNI: DUE VOCI E UN SIMBOLO NUOVO.\nPRIMA ALLENATI, POI MI TAGGHI."]);
        return;
      }
      this.startFirstDebate();
      return;
    }
    if(npc.id==="professor" && this.state.flags["starter-chosen"] && !this.state.flags["dex-received"]){
      if(this.state.flags["rival1-beaten"])this.giveDex();
      else this.askYesNo("RIPROVI GIANNI?",()=>this.startFirstDebate());
      return;
    }
    const pos = this.state.pos;
    npc.currentFacing =
      npc.x > pos.x ? "left" : npc.x < pos.x ? "right" : npc.y > pos.y ? "up" : "down";
    // I PG vaganti sono opportunità visibili, non agguati: il combattimento
    // parte solo dopo interazione e conferma esplicita del giocatore.
    if (npc === this.wanderNpc && this.wanderTrainer) {
      const trainer = this.wanderTrainer;
      this.askYesNo(`${trainer.name}: ACCETTI?`, () => this.startTrainerFight(trainer));
      return;
    }
    const civicId = CIVIC_NPCS[npc.id];
    if (civicId && this.state.party.length > 0 && !this.state.morale.decisions.includes(civicId)) {
      this.stack.push(new CivicScene(this.stack, this.input, this.state, CIVIC_EVENTS[civicId]));
      return;
    }
    if (this.atto3Controller.interactNpc(npc.id, {
      state: this.state,
      dispatch: (command) => this.dispatchWorldCommand(command)
    })) {
      return;
    }
    const route = routeNpcInteraction(this.state, npc);

    // SONDAGGISTA delle versioni: spiega GOVERNO/OPPOSIZIONE con testo dinamico
    // (dipende dal browserSeed, quindi non può stare nelle lines statiche).
    if (route.kind === "versionSurvey") {
      const ver = gameVersion(this.state.browserSeed);
      const mine = Object.keys(VERSION_EXCLUSIVES).filter((id) => VERSION_EXCLUSIVES[id] === ver);
      const theirs = Object.keys(VERSION_EXCLUSIVES).filter((id) => VERSION_EXCLUSIVES[id] !== ver);
      this.say([
        `SONDAGGISTA: questa è la versione ${ver.toLocaleLowerCase("it")}.`,
        `Da queste parti circolano ${mine.map((id) => SPECIES[id].name).join(" e ")}.`,
        `${theirs.map((id) => SPECIES[id].name).join(" e ")}? Sono nell’altra versione.`,
        "Per completare il Politicdex, scambia online. Il mercato delle vacche non dorme mai."
      ]);
      return;
    }

    if (route.kind === "trainer") {
      const trainerId = npc.trainerId!;
      const avail = route.availability;
      if (avail === "first") {
        // Primo scontro: flusso invariato bit-per-bit.
        if (this.state.party.length === 0) {
          this.say(["Torna quando avrai un POLITICMON.", "Qui si combatte, mica si dialoga."]);
          return;
        }
        this.startTrainerFight(this.trainerForId(trainerId));
        return;
      }
      if (avail === "ready") {
        // RIVINCITA pronta: prompt SÌ/NO, mai re-aggro a vista.
        if (this.state.party.length === 0) {
          this.say(["Torna quando avrai un POLITICMON.", "Qui si combatte, mica si dialoga."]);
          return;
        }
        const def = this.trainerForId(trainerId);
        const adaptive = adaptiveGymRoster(this.state, trainerId);
        const prompt = adaptive ? `${adaptive.label}. ACCETTI?` : `${def.name}: RIVINCITA?`;
        this.askYesNo(prompt, () => {
          // isRematch=true: lo SPOT bonus è escluso (R42 economia, faucet).
          this.startTrainerFight(buildRematchDef(this.state, def), true);
        });
        return;
      }
      if (avail === "cooldown") {
        this.say([...(npc.lines ?? []), "Ripassa tra un po': la RIVINCITA si prepara camminando."]);
        return;
      }
      // "never": fall-through al dialogo post-sconfitta esistente.
    }

    if (route.kind === "guide") {
      this.openGuide(npc);
      return;
    }

    if (route.kind === "transport") {
      this.openTransport();
      return;
    }

    if (route.kind === "daily") {
      this.runDailyChallenge();
      return;
    }

    if (route.kind === "tournament") {
      this.openTournament();
      return;
    }

    if (route.kind === "openScene" && route.scene === "shop") {
      // Product cards explain effects and reusable directives in context.
      this.state.flags["tm-hint"] = true;
      this.input.reset();
      this.stack.push(new ShopScene(this.stack, this.input, this.state, npc.lines?.[0]));
      return;
    }

    if (route.kind === "openScene" && route.scene === "casino") {
      this.say(npc.lines ?? [], () => {
        this.stack.push(new CasinoScene(this.stack, this.input, this.state));
      });
      return;
    }

    if (route.kind === "openScene" && route.scene === "box") {
      this.input.reset();
      this.stack.push(new BoxScene(this.stack, this.input, this.state));
      return;
    }

    if (route.kind === "openScene" && route.scene === "mafia") {
      this.say(npc.lines ?? [], () => {
        this.stack.push(new MafiaScene(this.stack, this.input, this.state));
      });
      return;
    }

    if (route.kind === "openScene" && route.scene === "monument") {
      this.say(npc.lines ?? [], () => {
        this.stack.push(new MonumentScene(this.stack, this.input, this.state));
      });
      return;
    }

    if (route.kind === "healer") {
      recordHealerVisit(this.state);
      this.state.flags["heal-hint"] = true;
      this.playHealFx(() => {
        this.showBanner("Squadra pronta", "Cure gratuite: PV e PP pieni, stati rimossi e compagni KO rianimati.", "#79ddba");
      });
      // La cura è immediata anche nei dati: un reload durante l'effetto
      // conserva PV, PP e visite, senza una ricevuta da confermare.
      saveGame(this.state);
      return;
    }

    if (route.kind === "legendary") {
      this.interactLegendary(npc);
      return;
    }

    if (route.kind === "gift") {
      const gift = npc.gift!;
      this.say(gift.lines, () => {
        this.state.flags[gift.flag] = true;
        this.state.bag[gift.itemId] = (this.state.bag[gift.itemId] ?? 0) + gift.qty;
        audio.confirm();
        this.say([`Ricevi ${ITEMS[gift.itemId].name} x${gift.qty}!`]);
        saveGame(this.state);
      });
      return;
    }

    if (route.kind === "vehicleGift") {
      const vg = npc.vehicleGift!;
      // Gating opzionale (es. il TRAGHETTO serve 3 medaglie).
      if (vg.requiresBadges && this.state.badges.length < vg.requiresBadges) {
        this.say(vg.lockedLines ?? ["Non sei ancora pronto."]);
        return;
      }
      this.say(vg.lines, () => {
        this.state.flags[vg.flag] = true;
        unlockVehicle(this.state, vg.vehicle);
        audio.catchJingle();
        // Il TRAGHETTO si imbarca da solo sull'acqua; gli altri si attivano dal menu.
        const howto = vg.vehicle === "traghetto"
          ? "Cammina verso il mare: t'imbarchi da solo, SCHETTINO al timone."
          : "Attivalo dal menu (START) alla voce VEICOLO.";
        this.say([`Hai ottenuto: ${VEHICLES[vg.vehicle].name}!`, howto]);
        saveGame(this.state);
      });
      return;
    }

    // Flag "hai parlato con..." per le quest secondarie (es. GIRO DI PORTE).
    if (route.kind === "dialog" && route.setFlag) {
      this.state.flags[route.setFlag] = true;
      saveGame(this.state);
    }

    if (route.kind === "dialog" && npc.lines && npc.lines.length > 0) {
      this.say(civicNpcReply(this.state, npc.id) ?? npc.lines);
    }
  }

  private dispatchWorldCommand(command: WorldCommand): void {
    if (command.kind === "say") {
      this.say(command.lines);
      return;
    }
    if (command.kind === "setFlag") {
      this.state.flags[command.flag] = true;
      saveGame(this.state);
      return;
    }
    if (command.kind === "startTrainer") {
      const def = this.trainerForId(command.trainerId);
      this.startTrainerFight(command.rematch ? buildRematchDef(this.state, def) : def, command.rematch);
      return;
    }
    if (command.kind === "openCoalition") {
      const open = () => this.stack.push(new CoalitionScene(this.stack, this.input, this.state, command.focus));
      if (command.intro) this.say(command.intro, open);
      else open();
      return;
    }
    if (command.kind === "openPhotoChoice") {
      this.stack.push(new PhotoChoiceScene(this.stack, this.input, this.state));
      return;
    }
    if (command.kind === "openFutureChoice") {
      this.stack.push(new FutureChoiceScene(this.stack, this.input, this.state));
      return;
    }
    if (command.kind === "openDiplomacyChoice") {
      this.stack.push(new DiplomacyChoiceScene(this.stack, this.input, this.state, command.initial));
      return;
    }
    if (command.kind === "openGenovaTechno") {
      this.stack.push(new GenovaTechnoScene(this.stack, this.input, this.state));
      return;
    }
    if (command.kind === "openDistrict") {
      this.openDistrict(command.districtId);
      return;
    }
    if(command.kind==="openPalaceArchive"){
      this.stack.push(new PalaceArchiveScene(this.stack,this.input,this.state,command.module,command.terminal));return;
    }
    if (command.kind === "openElectionNight") {
      this.openElectionNight();
      return;
    }
    if (command.kind === "openWeeklyCampaign") {
      this.openWeeklyCampaign();
      return;
    }
    if (command.kind === "openSliceEnding") {
      this.stack.push(new SliceEndingScene(this.stack, this.input, this.state, () => {
        this.state.pos = { mapId: "bruxelles", x: 19, y: 13, facing: "down" };
        this.loadMap("bruxelles");
      }));
      return;
    }
    const scene = command.scene;
    if (scene === "shop") this.stack.push(new ShopScene(this.stack, this.input, this.state));
    else if (scene === "casino") this.stack.push(new CasinoScene(this.stack, this.input, this.state));
    else if (scene === "box") this.stack.push(new BoxScene(this.stack, this.input, this.state));
    else if (scene === "mafia") this.stack.push(new MafiaScene(this.stack, this.input, this.state));
    else this.stack.push(new MonumentScene(this.stack, this.input, this.state));
  }

  private openDistrict(districtId: DistrictId): void {
    if (this.state.election.phase === "inactive") this.state.election = newElectionState(true);
    const beginDebate = () => {
      const content = DISTRICT_CONTENT[districtId];
      this.startTrainerBattle(this.trainerForId(content.trainerId), (result) => {
        const bonuses = coalitionBonuses(this.state.coalition);
        const action = resolveAction(this.state.election, {
          districtId, action: "debate", variant: result,
          baseDelta: result === "win" ? 8 : -4,
          modifier: { bonusPercent: bonuses.bonus.territoryGain, malusPercent: bonuses.malus.territoryGain }
        });
        if (action.ok) {
          this.state.election = action.state;
          this.markDistrictProgress(districtId);
          result === "win" ? audio.districtGain() : audio.districtLoss();
          saveGame(this.state);
        }
      });
    };
    this.stack.push(new DistrictScene(this.stack, this.input, this.state, districtId, beginDebate));
  }

  private markDistrictProgress(districtId: DistrictId): void {
    if (districtActionCount(this.state.election, districtId) >= 2) {
      this.state.flags[`district-complete:${districtId}`] = true;
      this.state.flags[`district-dossier:${districtId}`] = true;
    }
    if (this.state.election.phase === "ready") this.state.flags["tourComplete"] = true;
  }

  private openElectionNight(): void {
    if (!this.state.flags.palaceRoomsComplete) {
      this.say(["LO STUDIO NON È PRONTO.", "COMPLETA I QUATTRO ARCHIVI DEL PALAZZO."]);
      return;
    }
    if (this.state.election.phase === "resolved" && this.state.election.result) {
      this.stack.push(new ElectionResultsScene(this.stack, this.input, this.state.election.result, () => {
        if (!this.state.flags.atto3Complete) this.openAtto3Ending();
      }));
      return;
    }
    if (this.state.election.phase !== "ready" && this.state.election.phase !== "locked") {
      this.say(["I CINQUE DOSSIER NON SONO PRONTI.", "SERVONO ESATTAMENTE DUE AZIONI PER COLLEGIO."]);
      return;
    }
    const begin = async () => {
      if (this.state.election.phase === "ready") {
        const runId = `atto3-${Date.now().toString(36)}-${this.state.election.revision}`;
        const snapshot = await createElectionSnapshot(this.state.election, this.state.coalition, this.state.sondaggi, this.state.flags, runId);
        const started = startElection(this.state.election, runId, snapshot);
        if (!started.ok) return;
        this.state.election = started.state;
        this.state.coalition = { ...this.state.coalition, locked: true };
        this.state.flags["election-snapshot-saved"] = true;
        saveGame(this.state);
      }
      const runId = this.state.election.runId;
      if (!runId) return;
      const doctrine = this.state.election.snapshot?.doctrine ?? electionDoctrine(this.state.coalition, this.state.flags);
      this.startTrainerBattle(this.trainerForId("algoritmo-sovrano"), (battleResult) => {
        if (battleResult !== "win" && battleResult !== "loss") return;
        const resolved = resolveElection(this.state.election, runId, battleResult === "win");
        if (!resolved.ok || !resolved.state.result) return;
        this.state.election = resolved.state;
        this.state.coalition = { ...this.state.coalition, locked: false };
        this.state.flags["election-night-complete"] = true;
        this.state.flags[`election-ending:${resolved.state.result.ending}`] = true;
        saveGame(this.state);
        this.stack.push(new ElectionResultsScene(this.stack, this.input, resolved.state.result, () => this.openAtto3Ending()));
      }, false, doctrine);
    };
    if (this.state.election.phase === "locked") begin();
    else this.say([
      "PUNTO DI NON RITORNO: INIZIA ELECTION NIGHT.",
      "COALIZIONE E CINQUE COLLEGI VERRANNO CONGELATI.",
      "IL GIOCO SALVA PRIMA DELLA DIRETTA. A PER CONTINUARE."
    ], () => this.askChoice("INIZIA LA DIRETTA?", ["RIVEDI I VERBALI", "CONGELA E SFIDA"], index => { if(index===1)void begin(); }));
  }

  private openAtto3Ending(): void {
    this.stack.push(new Atto3EndingScene(this.stack, this.input, this.state, () => {
      this.state.pos = { mapId: "palazzo_feed_terrazza", x: 10, y: 10, facing: "up" };
      this.loadMap("palazzo_feed_terrazza");
    }));
  }

  private openWeeklyCampaign(): void {
    const openScene = () => this.stack.push(new WeeklyCampaignScene(this.stack, this.input, this.state, startDebate));
    const startDebate = (index: number) => {
      const pools = [
        ["mediocrate", "telecrate", "contemorfo"],
        ["referendodo", "salisound", "campocorno"],
        ["pontimax", "futurorso", "telecrate"]
      ];
      const top = Math.max(42, Math.min(55, this.state.party.reduce((value, mon) => Math.max(value, mon.level), 42) + 1));
      const species = pools[Math.max(0, Math.min(2, index - 1))];
      const def: TrainerDef = {
        id: `weekly:${this.state.weeklyCampaign.weekKey}:${index}`,
        name: `MODERATORE SETTIMANALE ${index}`,
        pal: "journalist", team: species.map((id, slot) => [id, top - 2 + slot] as [string, number]),
        intro: ["STESSA SETTIMANA, NUOVO PANEL.", "IL VERDETTO NON SI PUÒ FARMARE."],
        defeat: ["DIBATTITO ARCHIVIATO."], money: 0
      };
      this.startTrainerBattle(def, (result) => {
        if (result === "win" || result === "loss") {
          this.state.weeklyCampaign = resolveWeeklyStage(this.state.weeklyCampaign, result, result === "win" ? 4 : -2);
          saveGame(this.state); openScene();
        }
      });
    };
    openScene();
  }

  // ---- SFIDA DEL GIORNO (OPINIONISTA PERPETUA a Caput Mundi) ----
  // Una sfida al giorno reale: team deterministico dalla data (daily.ts),
  // lastDailyDate scritta SOLO alla vittoria (data locale, mai UTC) — la
  // sconfitta lascia il retry libero in giornata. Il dateKey è catturato
  // ALL'AVVIO: la mezzanotte durante la battaglia non regala un secondo win.
  private runDailyChallenge(): void {
    const key = localDateKey();
    if (this.state.lastDailyDate === key) {
      this.say([
        "OPINIONISTA PERPETUA: per oggi ho già chiuso la rassegna.",
        `STREAK: ${Math.max(1, this.state.dailyStreak)} GIORNI. Torna domani per allungarla.`,
        "Domani nuovo giorno, nuovo panel, nuovo premio."
      ]);
      return;
    }
    if (this.state.party.length === 0) {
      this.say(["Torna quando avrai un POLITICMON.", "Il panel non ammette sedie vuote."]);
      return;
    }
    this.say(
      [
        "OPINIONISTA PERPETUA: ogni giorno un dibattito, ogni giorno un vincitore.",
        "Oggi il tema è: TU. Panel di 3 ospiti, livello da prima serata."
      ],
      () => {
        this.askYesNo("ACCETTI LA SFIDA DEL GIORNO?", () => {
          const def = buildDailyTrainer(this.state, key);
          this.startTrainerBattle(def, (result) => {
            if (result !== "win") {
              return;
            }
            // STREAK: +1 se ieri (data locale) avevi vinto, altrimenti riparte
            // da 1. Bonus fondi +100€/giorno di streak, cap +500€.
            this.state.dailyStreak = this.state.lastDailyDate === prevDateKey(key) ? this.state.dailyStreak + 1 : 1;
            const streakBonus = Math.min(500, this.state.dailyStreak * 100);
            this.state.money += streakBonus;
            this.state.lastDailyDate = key;
            const reward = dailyRewardItem(key);
            this.state.bag[reward.itemId] = (this.state.bag[reward.itemId] ?? 0) + reward.qty;
            const { value, milestone } = bumpSondaggi(this.state, 4);
            saveGame(this.state);
            this.say([
              `PREMIO DEL GIORNO: ${ITEMS[reward.itemId].name} x${reward.qty}!`,
              `STREAK: ${this.state.dailyStreak} GIORNI! BONUS FEDELTÀ AL PALINSESTO: +${streakBonus}€.`,
              `SONDAGGI al ${value}%.`,
              ...(milestone ? [milestone] : [])
            ]);
          });
        });
      }
    );
  }

  // ---- COPPA DELLE POLTRONE (torneo post-garante) ----

  // Il BANDITORE apre il torneo: spiega, incassa la TASSA (money-SINK) e avvia
  // il bracket del giorno. Il torneo è una sessione singola (non salvata).
  private openTournament(): void {
    if (!this.state.flags["garante-beaten"]) {
      this.say(["Torneo riservato ai CAMPIONI COSTITUZIONALI.", "Torna quando avrai battuto il GARANTE SUPREMO."]);
      return;
    }
    if (this.state.party.length === 0) {
      this.say(["Servono POLITICMON per salire sul ring delle poltrone."]);
      return;
    }
    const rule = coppaRule();
    const prepared = prepareCoppaParty(this.state.party, rule);
    const titled = this.state.coppaWins > 0
      ? [`Bentornato, ${COPPA_TITLE}. Un altro giro di giostra?`]
      : ["Otto sfidanti, sette FANTASMI di vecchie glorie e TU.", "Un tabellone, tre round, una sola poltrona in palio."];
    this.say(
      [
        "BANDITORE: benvenuto alla COPPA DELLE POLTRONE!",
        ...titled,
        `REGOLA DI OGGI: ${rule.name}.`,
        rule.description,
        `Iscrizione: ${COPPA_FEE}€. Si vince o si torna a casa.`
      ],
      () => {
        if (!prepared.ok) {
          this.say(["SQUADRA NON IDONEA ALLA REGOLA DI OGGI.", prepared.reason, "CAMBIA SQUADRA PRIMA DI PAGARE."]);
          return;
        }
        if (this.state.money < COPPA_FEE) {
          this.say(["Fondi insufficienti per l'iscrizione.", `Servono ${COPPA_FEE}€. Il torneo dei ricchi non fa credito.`]);
          return;
        }
        this.askYesNo(`PAGHI ${COPPA_FEE}€ E ENTRI?`, () => {
          this.state.money -= COPPA_FEE;
          saveGame(this.state); // la tassa è definitiva anche se poi esci
          this.coppa = initTournament();
          this.coppaRuleActive = rule;
          this.showBracketThen(() => this.runTournamentRound());
        });
      }
    );
  }

  // Mostra il tabellone corrente (TournamentScene) e prosegue alla chiusura.
  private showBracketThen(next: () => void): void {
    if (!this.coppa) {
      return;
    }
    this.stack.push(new TournamentScene(this.stack, this.input, this.state, this.coppa, next, () => {
      this.coppa = null; this.coppaRuleActive = null;
    }, this.coppaRuleActive ?? undefined));
  }

  // Fa combattere il giocatore contro il suo avversario del round corrente.
  // Se vince, risolve gli altri match (duelsim) e passa al round successivo o
  // proclama il trionfo. Se perde, il torneo finisce (progresso perso).
  private runTournamentRound(): void {
    const t = this.coppa;
    if (!t) {
      return;
    }
    const opp = playerOpponent(t);
    if (!opp) {
      this.coppa = null;
      return;
    }
    const rule = this.coppaRuleActive ?? coppaRule(t.dateKey);
    const def = coppaOpponentDef(t,rule)!;
    const prepared = prepareCoppaParty(this.state.party, rule);
    if (!prepared.ok) { this.say([prepared.reason]); this.coppa = null; this.coppaRuleActive = null; return; }
    this.say([`${roundLabel(t)}: contro ${opp.name}!`, `REGOLA ${rule.name}.`], () => {
      this.coppaRestoreParty = beginTemporaryParty(this.state, prepared.party);
      this.startTrainerBattle(def, (result) => {
        this.coppaRestoreParty?.();
        this.coppaRestoreParty = null;
        saveGame(this.state);
        if (result !== "win") {
          // Tournament losses cost the entry fee, with no campaign respawn or fine.
          this.coppa = null;
          this.coppaRuleActive = null;
          this.say(["ELIMINATO DALLA COPPA. LA QUOTA RESTA AL BANCO.", "NESSUNA ALTRA MULTA. LA SQUADRA DELLA CAMPAGNA È CONSERVATA.", "IL BANDITORE CHIEDE UN APPLAUSO. È L'UNICO PREMIO CHE NON DEVE PAGARE."]);
          return;
        }
        const { champion, results } = advanceAfterPlayerWin(t,rule);
        const lines = results.length > 0 ? ["Intanto negli altri match:", ...results] : [];
        if (champion) {
          this.awardTournament();
          return;
        }
        this.say([...lines, "Passi il turno! Il tabellone si stringe."], () => {
          this.showBracketThen(() => this.runTournamentRound());
        });
      }, false, undefined, rule.maxHealingItems);
    });
  }

  // Trionfo: titolo permanente (coppaWins++), premio una-tantum al 1° trionfo.
  private awardTournament(): void {
    const first = this.state.coppaWins === 0;
    this.state.coppaWins += 1;
    this.state.flags["coppa-vinta"] = true;
    const lines = [
      "TRIONFO! Sollevi la COPPA DELLE POLTRONE!",
      `Da oggi sei ${COPPA_TITLE} (titolo permanente sulla TESSERA).`
    ];
    if (first) {
      this.state.money += COPPA_FIRST_PRIZE.money;
      this.state.bag[COPPA_FIRST_PRIZE.itemId] =
        (this.state.bag[COPPA_FIRST_PRIZE.itemId] ?? 0) + COPPA_FIRST_PRIZE.qty;
      lines.push(
        `PREMIO DEL PRIMO TRIONFO: ${ITEMS[COPPA_FIRST_PRIZE.itemId].name} x${COPPA_FIRST_PRIZE.qty} e ${COPPA_FIRST_PRIZE.money}€!`
      );
    } else {
      // R42: premio ripetibile dal 2° trionfo (700€ + 2 SCHEDE BLINDATE). La
      // tassa (1500€) resta più alta: la COPPA è un SINK netto, ma non più
      // cosmetica al 100%.
      this.state.money += COPPA_REPEAT_PRIZE.money;
      this.state.bag[COPPA_REPEAT_PRIZE.itemId] =
        (this.state.bag[COPPA_REPEAT_PRIZE.itemId] ?? 0) + COPPA_REPEAT_PRIZE.qty;
      lines.push(
        `Trionfi totali: ${this.state.coppaWins}. La leggenda continua.`,
        `GETTONE DI PRESENZA: ${ITEMS[COPPA_REPEAT_PRIZE.itemId].name} x${COPPA_REPEAT_PRIZE.qty} e ${COPPA_REPEAT_PRIZE.money}€.`
      );
    }
    this.coppa = null;
    this.coppaRuleActive = null;
    saveGame(this.state);
    audio.badgeFanfare();
    this.say(lines);
  }

  // ---- Multiplayer: scambio e duello con un giocatore remoto ----

  // Il remoto è ancora abbastanza vicino? (Manhattan ≤2: tolleranza per il lag
  // di posizione). Ritorna il RemotePlayer o null con messaggio già mostrato.
  private remoteIfNearby(peerId: string) {
    const r = mp.remotes.get(peerId);
    const p = this.state.pos;
    if (!r || Math.abs(r.x - p.x) + Math.abs(r.y - p.y) > 2) {
      this.say(["SI È ALLONTANATO. IL MERCATO DELLE VACCHE NON ASPETTA."]);
      return null;
    }
    return r;
  }

  // ISPEZIONA: mostra l'anteprima squadra dichiarata dal remoto (specie + record
  // duelli). partyPreview è già validato contro SPECIES in ricezione (mp.ts).
  private inspectRemote(peerId: string): void {
    const r = this.remoteIfNearby(peerId);
    if (!r) {
      return;
    }
    const nick = r.nick.slice(0, 12);
    const lines: string[] = [`SQUADRA DI ${nick}:`];
    if (r.partyPreview.length === 0) {
      lines.push("Nessun POLITICMON dichiarato. Un mistero, o un bluff.");
    } else {
      const names = r.partyPreview.map((id) => SPECIES[id]?.name ?? "???");
      // Due specie per riga: sta comodo nella finestra di dialogo.
      for (let i = 0; i < names.length; i += 2) {
        lines.push(names.slice(i, i + 2).join(", "));
      }
    }
    const tag = r.duelWins >= 10 ? " (PORTAVOCE)" : "";
    lines.push(`DUELLI PVP VINTI: ${r.duelWins}${tag}`);
    this.say(lines);
  }

  private startTradeWithRemote(peerId: string): void {
    const r = this.remoteIfNearby(peerId);
    if (!r) {
      return;
    }
    if (this.state.party.length === 0) {
      this.say(["TI SERVE ALMENO UN POLITICMON DA OFFRIRE."]);
      return;
    }
    mp.trade.invite(r.id, loadNick() || "ANONIMO");
    this.stack.push(new TradeScene(this.stack, this.input, this.state, { peerId: r.id, peerNick: r.nick }));
  }

  // PARLA sul remoto adiacente: apre subito la TalkScene (host) che invia
  // l'invito e attende talk-accept. Il dialogo blocca entrambi i giocatori
  // (la scena copre il mondo: niente movimento finché uno non chiude).
  private talkWithRemote(peerId: string): void {
    const r = this.remoteIfNearby(peerId);
    if (!r) {
      return;
    }
    const talkId = `talk-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    this.stack.push(new TalkScene(this.stack, this.input, {
      peerId: r.id, peerNick: r.nick, talkId, role: "host"
    }));
  }

  // SFIDA sul remoto adiacente: stesso code path della lobby (invito
  // immediato via DuelLobbyScene con invitePeerId). Chi invita è HOST.
  private challengeRemote(peerId: string): void {
    const r = this.remoteIfNearby(peerId);
    if (!r) {
      return;
    }
    if (this.state.party.length === 0) {
      this.say(["TI SERVE ALMENO UN POLITICMON PER DUELLARE."]);
      return;
    }
    this.stack.push(new DuelLobbyScene(this.stack, this.input, this.state, { invitePeerId: r.id }));
  }

  // Handler base dei DuelMsg: riempie SOLO mailbox (consumate nell'update).
  private onDuelMsg(msg: DuelMsg, peerId: string): void {
    // DIALOGO 1:1: l'invito va in mailbox; end/decline ritirano un invito non
    // ancora consumato (l'invitante è andato in timeout o ha annullato). Gli
    // altri talk-* appartengono alla TalkScene (che prende in consegna onDuel):
    // se arrivano qui la conversazione è già chiusa, si ignorano.
    if (msg.type === "talk-invite") {
      if (mp.duelBusy || this.pendingTalkInvite) {
        mp.sendDuel({ v: 1, duelId: msg.duelId, type: "talk-decline", reason: "OCCUPATO" }, peerId);
        return;
      }
      const nick = mp.remotes.get(peerId)?.nick ?? String(msg.nick ?? "ANONIMO");
      this.pendingTalkInvite = { peerId, talkId: msg.duelId, nick: nick.slice(0, 12), at: Date.now() };
      return;
    }
    if (msg.type === "talk-end" || msg.type === "talk-decline") {
      if (this.pendingTalkInvite?.talkId === msg.duelId) {
        this.pendingTalkInvite = null;
      }
      return;
    }
    if (msg.type === "talk-accept" || msg.type === "talk-line") {
      return;
    }
    if (msg.type === "invite") {
      if (mp.duelBusy || this.duelWait || this.pendingDuelInvite) {
        mp.sendDuel({ v: 1, duelId: msg.duelId, type: "decline", reason: "OCCUPATO" }, peerId);
        return;
      }
      const nick = mp.remotes.get(peerId)?.nick ?? String(msg.nick ?? "ANONIMO");
      this.pendingDuelInvite = {
        peerId,
        duelId: msg.duelId,
        nick: nick.slice(0, 12),
        maxLevel: Math.max(1, Math.floor(Number(msg.maxLevel)) || 1),
        avg: Math.max(1, Math.floor(Number(msg.avg)) || 1),
        at: Date.now()
      };
      return;
    }
    const wait = this.duelWait;
    if (!wait || peerId !== wait.peerId || msg.duelId !== wait.duelId) {
      return;
    }
    if (msg.type === "start") {
      // Start oltre la deadline dell'attesa: l'host è già andato in timeout,
      // accodarlo creerebbe un duello fantasma (ri-check al consumo in pollDuel).
      if (Date.now() > wait.deadline) {
        mp.sendDuel({ v: 1, duelId: wait.duelId, type: "decline", reason: "TROPPO TARDI" }, peerId);
        return;
      }
      this.duelStartMsg = {
        duelId: wait.duelId, peerId, nick: wait.nick, hostTeam: msg.hostTeam,
        deadline: wait.deadline, team: wait.team
      };
    } else if (msg.type === "decline") {
      this.duelDeclineMsg = msg.reason ?? "";
    }
  }

  // Poll degli eventi duello (invito in arrivo, start/decline atteso, timeout).
  // Ritorna true se ha consumato il frame (prompt aperto o messaggio).
  private pollDuel(): boolean {
    // Esito dell'attesa post-accept.
    if (this.duelDeclineMsg !== null) {
      const reason = this.duelDeclineMsg;
      this.duelDeclineMsg = null;
      this.duelWait = null;
      mp.duelBusy = false;
      this.say([reason ? `DUELLO ANNULLATO: ${reason}.` : "DUELLO ANNULLATO DALL'ALTRO CANDIDATO."]);
      return true;
    }
    if (this.duelStartMsg) {
      const start = this.duelStartMsg;
      this.duelStartMsg = null;
      this.duelWait = null;
      // Start stantio (consumato oltre la deadline: eravamo in lotta/menu):
      // l'host è già in timeout, entrare ora sarebbe un duello fantasma.
      if (Date.now() > start.deadline) {
        mp.sendDuel({ v: 1, duelId: start.duelId, type: "decline", reason: "TROPPO TARDI" }, start.peerId);
        mp.duelBusy = false;
        this.say(["IL DUELLO NON PARTE. L'ALTRO SI È PERSO NEI CORRIDOI."]);
        return true;
      }
      const hostTeam = validateWireTeam(start.hostTeam);
      if (!hostTeam) {
        mp.sendDuel({ v: 1, duelId: start.duelId, type: "decline", reason: "SQUADRA NON VALIDA" }, start.peerId);
        mp.duelBusy = false;
        this.say(["SQUADRA NON VALIDA: LA COMMISSIONE DI GARANZIA ANNULLA IL DUELLO."]);
        return true;
      }
      // Il team del guest è QUELLO inviato nell'accept: l'host ha costruito la
      // sim autoritativa su quello. Ri-serializzare il party corrente (magari
      // cambiato da una lotta selvatica) farebbe divergere le due sim.
      const guestWire = start.team;
      this.queueBattle(() => {
        this.stack.push(
          new PvpBattleScene(this.stack, this.input, {
            state: this.state,
            role: "guest",
            peerId: start.peerId,
            opponentNick: start.nick,
            hostWire: start.hostTeam as WireMon[], // già validato qui sopra
            guestWire,
            duelId: start.duelId,
            onEnd: (result) => {
              this.stack.pop();
              mp.duelBusy = false;
              // Duello CHIUSO: record duelli scritto SOLO ora (invariante C9).
              recordDuelResult(this.state, result);
            }
          })
        );
      });
      return true;
    }
    if (this.duelWait && Date.now() > this.duelWait.deadline) {
      this.duelWait = null;
      mp.duelBusy = false;
      this.say(["IL DUELLO NON PARTE. L'ALTRO SI È PERSO NEI CORRIDOI."]);
      return true;
    }
    // Invito in arrivo: prompt SÌ/NO con il livello massimo dichiarato (C11).
    const inv = this.pendingDuelInvite;
    if (inv && !this.duelWait) {
      this.pendingDuelInvite = null;
      if (Date.now() - inv.at > DUEL_INVITE_TIMEOUT * 1000) {
        return false; // scaduto mentre eravamo altrove: l'invitante è già in timeout
      }
      if (this.state.party.length === 0 || mp.duelBusy) {
        mp.sendDuel({ v: 1, duelId: inv.duelId, type: "decline", reason: "OCCUPATO" }, inv.peerId);
        return false;
      }
      this.askYesNo(
        `${inv.nick} TI SFIDA! SQUADRA FINO AL LV.${inv.maxLevel}. ACCETTI?`,
        () => {
          mp.duelBusy = true; // in attesa dello start: altri inviti declinati
          const team = serializeTeam(this.state.party);
          this.duelWait = { duelId: inv.duelId, peerId: inv.peerId, nick: inv.nick, deadline: Date.now() + 12000, team };
          mp.sendDuel(
            { v: 1, duelId: inv.duelId, type: "accept", nick: loadNick() || "ANONIMO", team },
            inv.peerId
          );
        },
        () => mp.sendDuel({ v: 1, duelId: inv.duelId, type: "decline" }, inv.peerId)
      );
      return true;
    }
    return false;
  }

  // Poll dell'invito a parlare in arrivo: prompt SÌ/NO. L'invitante attende
  // TALK_INVITE_TIMEOUT: un invito più vecchio è stantio (l'altro ha già
  // chiuso), si scarta senza prompt.
  private pollTalkInvite(): boolean {
    const inv = this.pendingTalkInvite;
    if (!inv) {
      return false;
    }
    this.pendingTalkInvite = null;
    if (Date.now() - inv.at > TALK_INVITE_TIMEOUT * 1000) {
      return false;
    }
    if (mp.duelBusy) {
      mp.sendDuel({ v: 1, duelId: inv.talkId, type: "talk-decline", reason: "OCCUPATO" }, inv.peerId);
      return false;
    }
    this.askYesNo(
      `${inv.nick} VUOLE PARLARTI. ACCETTI?`,
      () => {
        this.stack.push(new TalkScene(this.stack, this.input, {
          peerId: inv.peerId, peerNick: inv.nick, talkId: inv.talkId, role: "guest"
        }));
      },
      () => mp.sendDuel({ v: 1, duelId: inv.talkId, type: "talk-decline" }, inv.peerId)
    );
    return true;
  }

  // Poll dell'invito di scambio in arrivo: gira solo quando WorldScene è in
  // cima e il giocatore è libero (fermo, niente dialoghi/menu). Se il
  // destinatario è occupato altrove l'invito scade da solo (wall-clock).
  private pollTradeInvite(): boolean {
    const s = mp.trade;
    const inv = s.pendingInvite;
    if (!inv || s.phase !== "idle") {
      return false;
    }
    if (this.state.party.length === 0 || mp.duelBusy) {
      s.declineInvite();
      return false;
    }
    this.askYesNo(
      `${inv.nick} PROPONE UNO SCAMBIO. ACCETTI?`,
      () => {
        const peerId = inv.peerId;
        const nick = inv.nick;
        mp.trade.acceptInvite(loadNick() || "ANONIMO");
        if (mp.trade.phase === "negotiating") {
          this.stack.push(new TradeScene(this.stack, this.input, this.state, { peerId, peerNick: nick }));
        }
      },
      () => mp.trade.declineInvite()
    );
    return true;
  }

  private openTransport(): void {
    if (!this.state.flags["dex-received"]) {
      this.say([
        "SCORTA AUTO BLU: la macchina elettorale è pronta.",
        "Ma senza POLITICDEX non possiamo scarrozzare candidati non registrati."
      ]);
      return;
    }
    this.stack.push(new TransportScene(this.stack,this.input,this.state,this.map.id,(dest)=>this.travelToDestination(dest)));
  }

  private travelToDestination(dest: TransportDestination): void {
    if(!resolveTransportDestination(this.state,this.map.id,dest.mapId))return;
    this.state.pos={mapId:dest.mapId,x:dest.x,y:dest.y,facing:dest.facing};
    this.loadMap(dest.mapId);audio.confirm();saveGame(this.state);
    this.say([`AUTISTA: ${dest.label}. IL CONTO LO VEDE IL CONTRIBUENTE.`,"TU PAGHI 0€. LA SQUADRA NON È STATA CURATA. IL BAR SPORT È QUI VICINO."]);
  }

  private interactLegendary(npc: RuntimeNpc): void {
    const legendary = npc.legendary;
    if (!legendary) {
      return;
    }
    if (this.state.flags[legendary.flag]) {
      this.say(legendary.afterGoneLines ?? npc.lines ?? ["La leggenda è già stata registrata."]);
      return;
    }
    if (this.state.party.length === 0) {
      this.say(["Ti serve almeno un POLITICMON.", "Anche le leggende vogliono un minimo di contraddittorio."]);
      return;
    }

    markSeen(this.state, legendary.speciesId);
    // Conferma esplicita: un leggendario è un'occasione UNICA (se scappa o lo
    // metti KO senza catturarlo lo lasci lì, ma è meglio non avviare lo scontro
    // per sbaglio). Prompt WOW prima delle battute + battaglia.
    const legendName = SPECIES[legendary.speciesId].name;
    this.say(
      [
        `!!! POLITICMON LEGGENDARIO !!!`,
        `Davanti a te c'è ${legendName}, una leggenda vivente.`,
        "Preparati: un'occasione così non capita spesso."
      ],
      () => {
        this.askYesNo(`Sfidi ${legendName}? (LEGGENDARIO)`, () => {
          this.beginLegendaryBattle(legendary);
        });
      }
    );
  }

  private beginLegendaryBattle(legendary: NonNullable<RuntimeNpc["legendary"]>): void {
    this.say(legendary.lines, () => {
      this.startWildBattle(legendary.speciesId, legendary.level, (result) => {
        // SOLO la CATTURA consuma il leggendario. Mandarlo KO ("win") NON lo
        // brucia: come nei Pokémon classici, un leggendario sconfitto ricompare
        // (evita di perderlo per sempre + autosave, se lo battevi senza catturarlo).
        if (result === "caught") {
          this.state.flags[legendary.flag] = true;
          saveGame(this.state);
          this.say(legendary.afterGoneLines ?? [`${SPECIES[legendary.speciesId].name} entra nella leggenda.`]);
          return;
        }
        // KO ("win") o fuga ("run"): il leggendario resta disponibile.
        if (result === "win" || result === "run") {
          this.say(legendary.afterRunLines ?? [`${SPECIES[legendary.speciesId].name} resta nei paraggi.`]);
        }
      }, "battle-legend", true);
    });
  }

  private startTrainerFight(def: TrainerDef, isRematch = false): void {
    const isBoss = def.id === "boss";
    this.say(isBoss ? [`${def.name}: ti stavo aspettando.`] : [`${def.name} ti ha notato!`], () => {
      this.startTrainerBattle(def, (result) => {
        if (result !== "win") {
          return;
        }
        // RIVALE ricorrente: ogni vittoria sblocca la prossima tappa (memoria).
        if (def.id.startsWith("rival-")) {
          this.state.rivalWins += 1;
          saveGame(this.state);
          this.loadMap(this.state.pos.mapId); // rimuove l'NPC battuto dalla mappa
          return;
        }
        if (
          def.id === "emittenza" &&
          !this.state.flags["legend-berlusconix-gone"] &&
          // La RIVINCITA non deve rideclamare l'evento leggendario già annunciato.
          !this.state.flags["legend-berlusconix-ready"]
        ) {
          this.state.flags["legend-berlusconix-ready"] = true;
          saveGame(this.state);
          this.say([
            "Le luci dello STUDIO 5 cambiano colore.",
            "Dal maxischermo arriva una sigla impossibile da mandare in pensione.",
            "Qualcosa di leggendario ti aspetta accanto alla regia."
          ]);
          return;
        }
        if (def.id === "tesoriere" && !this.state.flags["offshore-beaten"]) {
          this.state.flags["offshore-beaten"] = true;
          addSondaggi(this.state, 8);
          saveGame(this.state);
          this.say([
            "Il TESORIERE apre l'ultimo caveau: una ricevuta per la custodia degli altri due.",
            "Il lido torna in vista. Le promesse aperte restano nel verbale.",
            ...moraleEpilogue(this.state.morale),
            `SONDAGGI al ${this.state.sondaggi}%.`
          ]);
          return;
        }
        if (def.id === "commissione" && !this.state.flags["ue-beaten"]) {
          this.state.flags["ue-beaten"] = true;
          this.state.flags["atto3-invited"] = true;
          addSondaggi(this.state, 10);
          saveGame(this.state);
          this.say([
            "LA COMMISSIONE posa il timbro. Sul verbale scrive chi deve cambiare la lampadina.",
            "La vittoria assegna il lavoro. Non lo dichiara già fatto.",
            ...moraleEpilogue(this.state.morale),
            `SONDAGGI al ${this.state.sondaggi}%. Premio: TESSERA DORATA.`,
            "A sud-est di BRUXELLES ti aspettano al CAMPO LARGO. Consulta l’ATTO 3 in EXTRA > CONTENUTI.",
            "Vogliono una coalizione che entri nella foto. Vedremo chi resta quando si spegne il flash."
          ]);
          return;
        }
        if (isBoss) {
          this.state.flags["boss-beaten"] = true;
          saveGame(this.state);
          this.say([
            "Il PRESIDENTE OMBRA consegna la chiave. Il fotografo consegna già la foto: non era interessato al risultato.",
            "La PORTA DORATA apre il COLLE. Tre prove facoltative, poi il GARANTE. Puoi scendere al bar fra le lotte.",
            "Fuori dalla stanza, il verbale delle tue scelte resta aperto.",
            ...moraleEpilogue(this.state.morale)
          ]);
          return;
        }
        if (def.id === "ilcapitano") {
          this.state.flags["ponte-beaten"] = true;
          addSondaggi(this.state, 6);
          saveGame(this.state);
          this.say([
            "Il CAPITANO taglia il nastro della foto. Il geometra apre il passaggio vero e segna il collaudo sul verbale.",
            "A nord trovi il bar per PV e PP e quattro prove facoltative. La darsena a sudovest riporta a Capitale.",
            `I meme su questa vittoria fanno il giro dei social: SONDAGGI al ${this.state.sondaggi}%.`,
            "TESSERA DORATA ricevuta. BORSA > TESSERA: scegli un candidato compatibile, confronta e conferma la carriera. Il morale conserva le tue promesse."
          ]);
          return;
        }
        if (def.id === "garante") {
          this.state.flags["garante-beaten"] = true;
          addSondaggi(this.state, 10);
          saveGame(this.state);
          this.say([
            "GARANTE: firmo il mandato. Non firmo una ricevuta in bianco per tutto quello che farai.",
            `SONDAGGI ${this.state.sondaggi}%. Le telecamere contano gli applausi. Il quartiere conta le corse del bus.`,
            ...moraleEpilogue(this.state.morale),
            "START > MORALE: puoi ancora finanziare o riparare i servizi. Il ritardo resta nel registro.",
            "Nella sala accanto, un DRAGO DEI MERCATI ha sentito la parola stabilità e ha aperto un grafico."
          ]);
        }
      }, isRematch);
    }, def.id === "praticante");
  }

  private interactStarter(speciesId: string): void {
    if (this.state.flags["starter-chosen"]) {
      this.say(["Le altre schede? Sequestrate dalla commissione di garanzia."]);
      return;
    }
    markSeen(this.state, speciesId);
    // Anteprima animata con stats e descrizione prima di confermare.
    this.stack.push(
      new StarterPreviewScene(this.stack, this.input, speciesId, () => this.chooseStarter(speciesId), this.state.reduceEffects)
    );
  }

  private chooseStarter(speciesId: string): void {
    if (this.state.flags["starter-chosen"]) return;
    const starter = createMonster(speciesId, 5);
    this.state.party.push(starter);
    this.state.starterId = speciesId;
    this.state.flags["starter-chosen"] = true;
    markCaught(this.state, speciesId);
    audio.catchJingle();
    saveGame(this.state);

    this.state.flags["opening-v2"] = true;
    this.giveDex();
  }

  private startFirstDebate(): void {
    const id=this.state.starterId,rivalStarterId=RIVAL_COUNTER[id];
    if(!rivalStarterId || this.state.flags["rival1-beaten"]) return;
    const def:TrainerDef={id:"rival1",name:"RIVALE GIANNI",pal:"rival",team:[[rivalStarterId,this.state.flags["opening-v2"] ? 9 : 4,this.tutorialRivalMoves(rivalStarterId)]],intro:[this.state.flags["opening-v2"] ? "IL COPIONE MI PROTEGGE.\nLE DOMANDE NON ERANO PREVISTE." : "SQUADRE CURATE. TELEFONO AL 2%.\nIL MIO PROGRAMMA È LÌ DENTRO."],defeat:["IL CONSULENTE DICE CHE DEVO CAMBIARE TONO. HO SOLO IL VIVAVOCE."],money:150};
      this.startTrainerBattle(def,(result)=>{
        if(result!=="win"){
          this.say([this.state.flags["opening-v2"] ? "GIANNI: LA DIRETTA ERA SPENTA.\nRIPROVIAMO QUANDO VUOI." : "QUIRINO: RIPROVA DAL LABORATORIO.\nLA SQUADRA È CURATA."]);
          return;
        }
        this.state.flags["rival1-beaten"]=true;this.state.rivalWins=Math.max(1,this.state.rivalWins);saveGame(this.state);if(this.state.flags["opening-v2"])this.loadMap(this.state.pos.mapId);else this.giveDex();
      });
  }

  private tutorialRivalMoves(speciesId: string): string[] {
    if (speciesId === "giorgetta") {
      return ["comizio", "slogan"];
    }
    if (speciesId === "ellyna") {
      return ["comizio", "ztl"];
    }
    return ["comizio", "promessa"];
  }

  private giveDex(): void {
    if(this.state.flags["dex-received"])return;
    this.state.flags["dex-received"] = true;
    this.state.bag.scheda = (this.state.bag.scheda ?? 0) + 5;
    saveGame(this.state);
    audio.catchJingle();
    this.say([
      "QUIRINO: DEX E CINQUE SCHEDE.\nIL PROGRAMMA LO TROVI NELL’ERBA.",
      this.state.flags["opening-v2"] ? "RECLUTA, CRESCI. GIANNI TI ASPETTA\nSULLA STRADA DEL PERCORSO 1." : "ADESSO RECLUTA.\nGLI ALLEATI NON CADONO DAL CIELO."
    ], undefined, true);
  }

  // ---- Trainer line-of-sight ----

  private checkTrainerSight(): boolean {
    const pos = this.state.pos;
    for (const npc of this.visibleNpcs()) {
      if (!npc.trainerId || !npc.sightRange) {
        continue;
      }
      if (this.state.defeatedTrainers.includes(npc.trainerId)) {
        continue;
      }
      if (this.state.party.length === 0) {
        continue;
      }
      const delta = DIR_DELTA[npc.facing];
      for (let step = 1; step <= npc.sightRange; step += 1) {
        const sx = npc.x + delta.dx * step;
        const sy = npc.y + delta.dy * step;
        if (sx === pos.x && sy === pos.y) {
          this.exclaimNpc = npc;
          this.exclaimT = 0.7;
          this.pendingTrainer = this.trainerForId(npc.trainerId);
          audio.encounterSting();
          return true;
        }
        const tile = TILES[this.tileAt(sx, sy)];
        if (!tile || tile.solid) {
          break;
        }
      }
    }
    return false;
  }

  // ---- Incontri PG casuali su strada ----

  private wanderCadence = newWandererCadence();

  private checkWanderingChallenger(): boolean {
    const plan = planWanderingChallenge(
      this.state,
      this.wanderCadence,
      this.map.outdoor && this.map.allowWanderers !== false && Boolean(this.state.flags["dex-received"]),
      Boolean(this.wanderNpc),
      () => this.freeAdjacentSpot()
    );
    if (!plan) return false;
    // Crea uno sfidante visibile e fermo. Niente dialogo o lotta automatica:
    // la targhetta invita a interagire quando il giocatore vuole.
    const npc = this.makeRuntimeNpc({
      id: `wanderer-${plan.def.id}`,
      pal: plan.def.pal,
      x: plan.spot.x,
      y: plan.spot.y,
      facing: plan.spot.facing,
      wander: false,
      nameplate: "SFIDA A"
    });
    this.npcs.push(npc);
    this.wanderNpc = npc;
    this.wanderTrainer = plan.trainer;
    audio.confirm();
    return true;
  }

  // Cella calpestabile e libera adiacente al player, col facing rivolto verso
  // di lui. Usata per far "spuntare" un PG vagante accanto al giocatore.
  private freeAdjacentSpot(): { x: number; y: number; facing: Facing } | null {
    const pos = this.state.pos;
    // facing dell'NPC = opposto della direzione in cui sta rispetto al player.
    const opp: Record<Facing, Facing> = { up: "down", down: "up", left: "right", right: "left" };
    for (const dir of FACINGS) {
      const d = DIR_DELTA[dir];
      const nx = pos.x + d.dx;
      const ny = pos.y + d.dy;
      const tile = TILES[this.tileAt(nx, ny)];
      if (!tile || tile.water || this.isBlocked(nx, ny)) {
        continue;
      }
      // Keep the door approach and its lateral escape cells free of challengers.
      if (this.map.warps.some(w => (w.x === nx && w.y === ny) || (this.isOutdoorDoorWarp(w) && w.y + 1 === ny && Math.abs(w.x - nx) <= 1))) {
        continue;
      }
      if (this.cutsOffRoute(nx, ny)) continue;
      return { x: nx, y: ny, facing: opp[dir] };
    }
    return null;
  }

  // An optional challenger must not become a locked door. Check connectivity
  // beyond the immediate doorway too (a pickup can close the other escape).
  private cutsOffRoute(x: number, y: number): boolean {
    const key = (px: number, py: number) => `${px},${py}`;
    const queue = [{ x: this.state.pos.x, y: this.state.pos.y }];
    const seen = new Set([key(queue[0].x, queue[0].y)]);
    for (let i = 0; i < queue.length; i++) for (const d of Object.values(DIR_DELTA)) {
      const nx = queue[i].x + d.dx, ny = queue[i].y + d.dy, id = key(nx, ny);
      if (seen.has(id) || (nx === x && ny === y) || this.isBlocked(nx, ny)) continue;
      seen.add(id); queue.push({ x: nx, y: ny });
    }
    return Object.values(DIR_DELTA).some(d => !this.isBlocked(x + d.dx, y + d.dy) && !seen.has(key(x + d.dx, y + d.dy)));
  }

  // Direzione approssimata (in pixel mondo) verso un'altra mappa, per la guida
  // quando il bersaglio non è sulla mappa corrente. La progressione è quasi
  // sempre verso nord; le mappe interne si raggiungono dalla città relativa.
  private mapHintDir(targetMap: string): { dx: number; dy: number } | null {
    if (targetMap === this.map.id) {
      return null;
    }
    // Mappa città -> direzione cardinale verso la prossima tappa a nord
    // (route incluse: senza, la freccia GUIDA spariva sui percorsi).
    const northChain = ["borgo", "route1", "mediopoli", "route2", "eurotown", "route3", "capitale"];
    const here = northChain.indexOf(this.map.id);
    const there = northChain.indexOf(targetMap);
    if (here !== -1 && there !== -1) {
      return there > here ? { dx: 0, dy: -1 } : { dx: 0, dy: 1 };
    }
    // Catena marittima post-game: stretto/offshore/bruxelles si raggiungono
    // SALPANDO dalla capitale (hub degli imbarchi). Se il bersaglio è oltremare
    // e non siamo ancora alla capitale, guida prima verso la capitale (che è la
    // cima della northChain, quindi a nord). Dalla capitale il fallback warp-based
    // sotto punta all'imbarco giusto.
    const maritime = ["stretto", "offshore", "bruxelles"];
    if (maritime.includes(targetMap) && this.map.id !== "capitale") {
      if (here !== -1) {
        return { dx: 0, dy: -1 }; // risali la northChain verso la capitale
      }
    }
    // Interni (lab/palazzo/colle): se sono il bersaglio e siamo nella città
    // giusta, punta verso il warp d'ingresso corrispondente sulla mappa.
    const warp = this.map.warps.find((w) => w.toMap === targetMap);
    if (warp) {
      return { dx: Math.sign(warp.x - this.state.pos.x), dy: Math.sign(warp.y - this.state.pos.y) };
    }
    return null;
  }

  private drawGuideArrow(
    screen: Screen,
    target: { mapId: string; x: number; y: number },
    playerPx: number,
    playerPy: number,
    camX: number,
    camY: number
  ): void {
    let dx: number;
    let dy: number;
    if (target.mapId === this.map.id) {
      dx = target.x - this.state.pos.x;
      dy = target.y - this.state.pos.y;
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        return; // già arrivato: niente freccia
      }
    } else {
      const hint = this.mapHintDir(target.mapId);
      if (!hint) {
        return;
      }
      dx = hint.dx;
      dy = hint.dy;
    }
    const ang = Math.atan2(dy, dx);
    // Centro del giocatore sullo schermo.
    const cx = playerPx - camX + TILE / 2;
    const cy = playerPy - camY + TILE / 2 - 18; // sopra la testa
    // Pulsazione: la freccia "spinge" verso l'obiettivo.
    const pulse = this.state.reduceEffects ? 1 : 1 + Math.sin(this.time * 6) * 0.75;
    const r = 9 + pulse;
    const tipX = cx + Math.cos(ang) * r;
    const tipY = cy + Math.sin(ang) * r;
    // Triangolo pieno orientato verso l'obiettivo.
    const ctx = screen.ctx;
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(ang);
    ctx.fillStyle = "#f4d34a";
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-4, -3);
    ctx.lineTo(-4, 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#10141f";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // ---- Eventi morale casuali su strada ----

  // Eventi morale di strada DISABILITATI: comparivano come nuvolette di testo dal
  // nulla (nessun personaggio in scena), ovunque all'aperto e troppo spesso. Non
  // divertenti. La chiamata in onStepComplete è stata rimossa. Il pool
  // STREET_EVENTS resta in src/data/streetevents.ts se si volesse riattivare.

  // ---- Step resolution ----

  private stepCount = 0;
  // Cooldown globale fra interruzioni (incontri, PG vaganti, eventi morale):
  // dopo una qualsiasi, si concede una "tregua" di pochi passi prima che possa
  // scattarne un'altra. Evita la raffica di interruzioni ravvicinate.
  // Passi liberi garantiti dopo una vera interruzione. Vale anche per gli
  // incontri selvatici: il giocatore non deve uscire da una scena e ricadere
  // immediatamente in un'altra.
  private interruptCooldown = 0;

  // CRISI DI GOVERNO (Round 40): evento narrativo con scelta SECCA senza stato
  // nuovo. Due inneschi:
  //  - una-tantum alla 2ª medaglia (primo ingresso a EUROTOWN con 2 badge),
  //    flag "crisi-governo-1";
  //  - post-game (garante-beaten), ripetibile ma raro/deterministico: a ogni
  //    ingresso a CAPUT MUNDI, ~1 volta ogni 3 giorni (hashDate del giorno),
  //    al massimo una volta al giorno (flag "crisi-gov-day:<data>").
  // Scelta: SOSTIENI il ministro (SONDAGGI -8) oppure SCARICALO (SONDAGGI +5 e
  // si libera UN incarico, che il giocatore potrà riassegnare dal GOVERNO).
  private maybeGovernmentCrisis(): boolean {
    const oneShot =
      this.map.id === "eurotown" &&
      this.state.badges.length >= 2 &&
      !this.state.flags["crisi-governo-1"];
    let postGame = false;
    let dayFlag = "";
    if (!oneShot && this.map.id === "capitale" && this.state.flags["garante-beaten"]) {
      const day = localDateKey();
      dayFlag = `crisi-gov-day:${day}`;
      // ~1 giorno su 3, deterministico: stessa risposta per tutti nello stesso giorno.
      postGame = hashDate(`crisi:${day}`) % 3 === 0 && !this.state.flags[dayFlag];
    }
    if (!oneShot && !postGame) {
      return false;
    }
    // Segna subito il flag anti-ripetizione (prima della scelta: l'evento è
    // "consumato" all'apertura, non alla risposta).
    if (oneShot) {
      this.state.flags["crisi-governo-1"] = true;
    } else if (dayFlag) {
      this.state.flags[dayFlag] = true;
    }
    saveGame(this.state);

    const assigned = assignedMinisteri(this.state);
    const hasMinistro = assigned.length > 0;
    const ministeroNome = hasMinistro ? MINISTERI[assigned[0]].name : "un tuo fedelissimo";
    audio.crisis(); // sirena istituzionale, non il jingle di festa
    this.showBanner("BREAKING NEWS!", "CRISI DI GOVERNO", "#d04848");
    this.say([
      "BREAKING NEWS! Scoppia una CRISI DI GOVERNO!",
      hasMinistro
        ? `${ministeroNome} è finito nella bufera: i giornali chiedono la testa.`
        : "La stampa reclama un colpevole, ma il tuo Governo Ombra è ancora vuoto.",
      "Puoi chiedere documenti o offrire una testa al titolo. Una verifica non è un'assoluzione.",
      "SÌ: verifica, SOND -8, FID +6, COE +8. NO: scarica, SOND +5, FID -6, COE -10."
    ], () => {
      this.askYesNo(
        "CHIEDI UNA VERIFICA?",
        () => {
          // SOSTIENI: lealtà che costa consenso.
          const { value } = bumpSondaggi(this.state, -8);
          changeMorale(this.state, "VERIFICA PUBBLICA", 6, 8);
          saveGame(this.state);
          this.say([
            "Pubblichi i documenti, anche quelli che ti danno torto. La regia taglia: mancano urla.",
            `SOND ${value}%. Fiducia +6, coesione +8: i tuoi sanno che esiste una procedura.`
          ]);
        },
        () => {
          // SCARICA: un incarico si libera, l'opinione pubblica applaude.
          const removed = scaricaUnMinistro(this.state);
          const { value } = bumpSondaggi(this.state, 5);
          changeMorale(this.state, "CAPRO ESPIATORIO IN DIRETTA", -6, -10);
          saveGame(this.state);
          const lines = [
            "Lo scarichi prima dei documenti. Il titolo è pronto, la verifica ancora no.",
            `SOND ${value}%. Fiducia -6, coesione -10: la squadra sa chi sarà il prossimo.`
          ];
          if (removed) {
            lines.push(`${MINISTERI[removed].name} resta vacante: riassegnalo dal GOVERNO.`);
          }
          this.say(lines);
        }
      );
    });
    return true;
  }

  // Annunci one-shot all'arrivo in una mappa: segnalano feature che altrimenti
  // resterebbero invisibili a chi segue solo la storia. Flag per non ripetere.
  private showMapEntryHint(): boolean {
    const hint = MAP_ENTRY_HINTS[this.map.id];
    if (!hint || this.state.flags[hint.flag]) {
      return false;
    }
    this.state.flags[hint.flag] = true;
    saveGame(this.state);
    this.say(hint.lines);
    return true;
  }

  private onStepComplete(): void {
    const pos = this.state.pos;
    const stepTile=this.tileAt(pos.x,pos.y);
    const floorOverride=this.map.tileOverrides?.[stepTile];
    const material=floorOverride?.includes('cave_')?'stone':this.map.groundMaterials?.[stepTile];
    const surface=footSurface(stepTile,this.map.outdoor?(this.map.weather??'sereno'):'sereno',material);
    if(!this.state.vehicle){
      this.atmosphere.step(pos.x*TILE+8,pos.y*TILE+14,surface,this.state.stepsTotal,this.state.reduceEffects);
      audio.footstep(surface);
    }

    // Imbarco/sbarco automatico sul TRAGHETTO (su acqua) prima di tutto il resto.
    this.syncFerryVehicle();

    // Multiplayer: comunica la nuova posizione agli altri sulla mappa.
    mp.sendMove(pos.x, pos.y, pos.facing);

    // Contatore passi PERSISTENTE: orologio dei cooldown di RIVINCITA. NON
    // sostituisce stepCount (privato, la cura del Min. Salute usa il suo %6).
    this.state.stepsTotal += 1;
    recordRunStep(this.state);
    // Missione giornaliera "CAMMINA 300 PASSI": conteggio in dailyQuestsDone
    // ("steps300:N"), niente save per passo (salvano warp/battaglie/completamento).
    bumpDailyQuest(this.state, "steps300");

    // SPRAY ANTI-COMIZIO: scala a ogni passo; finché è attivo (anche in questo
    // passo, l'ultimo compreso) gli incontri WILD sono soppressi più sotto.
    // I PG VAGANTI e i trainer NON sono bloccati: lo spray respinge i selvatici,
    // non i professionisti della politica.
    const repellentActive = this.state.repellentSteps > 0;
    if (repellentActive) {
      this.state.repellentSteps -= 1;
      if (this.state.repellentSteps === 0) {
        saveGame(this.state);
        this.say(["L'EFFETTO DELLO SPRAY È SVANITO.", "I comizi selvatici possono ricominciare."]);
        return;
      }
    }

    // Sanità di prossimità: il Min. Salute fa recuperare 1 PV ogni 6 passi.
    this.stepCount += 1;
    if (this.stepCount % 6 === 0 && hasMinistro(this.state, "salute") && curaPassiva(this.state)) {
      // Feedback leggero: 2 scintille verdi salgono dal player (cura del ministero).
      const px = this.state.pos.x * TILE + 8;
      const py = this.state.pos.y * TILE;
      for (let i = 0; i < 2; i += 1) {
        this.stepSparks.push({
          x: px + (Math.random() - 0.5) * 10,
          y: py + (Math.random() - 0.5) * 6,
          vy: -22 - Math.random() * 14,
          life: 0,
          max: 0.5
        });
      }
    }

    const warp = this.map.warps.find((w) => w.x === pos.x && w.y === pos.y);
    if (warp) {
      if (this.isOutdoorDoorWarp(warp) && !this.enteredDoorFromFront(warp)) {
        pos.x = this.fromX;
        pos.y = this.fromY;
        return;
      }
      if (warp.requiresBadges && this.state.badges.length < warp.requiresBadges) {
        pos.x = this.fromX;
        pos.y = this.fromY;
        this.say(warp.lockedLines ?? ["È chiuso."]);
        return;
      }
      if (warp.requiresFlag && !this.state.flags[warp.requiresFlag]) {
        pos.x = this.fromX;
        pos.y = this.fromY;
        this.say(warp.lockedLines ?? ["È chiuso."]);
        return;
      }
      if (warp.requiresFeature && !isFeatureEnabled(warp.requiresFeature)) {
        pos.x = this.fromX;
        pos.y = this.fromY;
        this.say(warp.lockedLines ?? ["CONTENUTO IN SVILUPPO."]);
        return;
      }
      const doWarp = () => {
        // Transizione morbida: dissolvenza in uscita, poi carica la mappa nuova
        // (che fa il suo fade-in). Niente più stacco secco a ogni porta/scala.
        audio.confirm();
        haptics.warp();
        this.fadeOut = 0.22;
        this.pendingWarp = () => {
          this.state.pos = { mapId: warp.toMap, x: warp.toX, y: warp.toY, facing: warp.facing };
          this.loadMap(warp.toMap);
        };
      };
      // Warp con conferma (es. la DARSENA di ritorno dallo Stretto): chiedi SÌ/NO
      // così non riparti per sbaglio e capisci dove porta. Se dici NO, torni sulla
      // cella da cui venivi senza cambiare mappa.
      if (warp.confirm) {
        const backX = this.fromX;
        const backY = this.fromY;
        this.askYesNo(
          warp.confirm,
          doWarp,
          () => {
            pos.x = backX;
            pos.y = backY;
          }
        );
        return;
      }
      doWarp();
      return;
    }

    // Tesori nascosti: si scoprono calpestandoli (non hanno sprite a terra).
    const buried = this.map.pickups.find(
      (p) => p.hidden && p.x === pos.x && p.y === pos.y && !this.state.pickedItems.includes(p.id)
    );
    if (buried) {
      this.state.pickedItems.push(buried.id);
      this.state.bag[buried.itemId] = (this.state.bag[buried.itemId] ?? 0) + buried.qty;
      saveGame(this.state);
      audio.catchJingle();
      haptics.event();
      this.say([
        "Un attimo... il terreno qui suona strano.",
        `TESORO SEGRETO! ${ITEMS[buried.itemId].name} x${buried.qty}!`
      ]);
      return;
    }

    // Le sfide a vista degli allenatori NON passano dal cooldown: sono fisse,
    // non casuali, e vanno innescate sempre.
    if (this.checkTrainerSight()) {
      this.interruptCooldown = MIN_FREE_STEPS;
      return;
    }

    // Tregua globale: dopo una qualsiasi interruzione si saltano i PG VAGANTI
    // per qualche passo, così non si accavallano in raffica. Gli sfidanti
    // vaganti restano proposte visibili e facoltative; i selvatici rispettano
    // la stessa tregua quando il giocatore rientra dall'ultima scena.
    const onCooldown = this.interruptCooldown > 0;
    if (onCooldown) this.interruptCooldown -= 1;
    if (!onCooldown && this.checkWanderingChallenger()) {
      // La comparsa non apre scene, ma lasciamo comunque respiro prima che
      // l'erba possa interrompere l'esplorazione.
      this.interruptCooldown = MIN_FREE_STEPS;
      return;
    }


    const tile = TILES[this.tileAt(pos.x, pos.y)];
    if (tile?.encounter) {
      this.rustles.push({ x: pos.x, y: pos.y, t: 0.4 });
      // Fuori dal tutorial i selvatici si vedono sulla mappa: niente tiro invisibile nell'erba all'aperto.
      if (this.map.outdoor && (this.map.encounterRate ?? 0.18) > 0 && !(this.state.flags["opening-v2"] && !this.state.flags["opening-encountered"])) return;
      if (repellentActive || onCooldown) {
        return; // SPRAY ANTI-COMIZIO: niente incontri wild finché dura
      }
      const baseRate = this.map.encounterRate ?? 0.18;
      // Ministero dell'Interno e PROTEZIONE della famiglia diradano gli incontri.
      const rate =
        baseRate *
        (hasMinistro(this.state, "interno") ? 0.65 : 1) *
        (this.state.flags["mafia-protezione"] ? 0.6 : 1);
      if (
        this.map.encounters &&
        this.state.party.some((m) => m.hp > 0) &&
        (this.state.flags["opening-v2"] && !this.state.flags["opening-encountered"] || Math.random() < rate)
      ) {
        // Tabella filtrata per versione + MOSTRO DEL GIORNO con weight x4.
        const table = this.effectiveEncounters();
        const boost = this.todaysBoostId();
        const weightOf = (e: (typeof table)[number]) =>
          e.speciesId === boost ? e.weight * DAILY_BOOST_MULT : e.weight;
        const total = table.reduce((sum, e) => sum + weightOf(e), 0);
        let roll = Math.random() * total;
        for (const entry of table) {
          roll -= weightOf(entry);
          if (roll <= 0) {
            this.interruptCooldown = MIN_FREE_STEPS;
            this.state.flags["opening-encountered"] = true;
            let level = entry.minLv + Math.floor(Math.random() * (entry.maxLv - entry.minLv + 1));
            // Modificatore d'incontro (~22%): rompe la monotonia dei selvatici.
            // A SONDAGGI alti compaiono più "VIP" (tosti); a SONDAGGI bassi più
            // astensionisti deboli. Un annuncio dà colore al momento.
            const mod = this.rollEncounterFlavor();
            level = firstRecruitLevel(this.state, Math.max(2, level + (mod?.dLevel ?? 0)));
            this.startWildBattle(entry.speciesId, level, undefined, undefined, false, mod?.line);
            return;
          }
        }
      }
    }
  }

  // ---- Update ----

  // Avvia l'animazione di cura sull'intero party: snapshot HP, scintille,
  // velo verde, anelli e barre che si riempiono a vista. La cura dei DATI è
  // immediata (sotto il velo); a fine effetto scatta `done`. Riusato da BAR
  // SPORT, risveglio post-KO e raccomandazione mafia.
  private playHealFx(done: () => void): void {
    this.healSnapshot = this.state.party.map((m) => ({
      mon: m, from: m.hp, to: statsOf(m).hp, disp: m.hp
    }));
    this.healFx = 1.6;
    this.afterHeal = done;
    audio.heal();
    this.spawnHealSparks(18);
    for (const mon of this.state.party) {
      healMonster(mon);
    }
  }

  private spawnHealSparks(n: number): void {
    const colors = ["#7ad858", "#bdf0a0", "#fff6c8"];
    for (let i = 0; i < n; i += 1) {
      this.healSparks.push({
        x: VIEW_W / 2 + (Math.random() - 0.5) * 28,
        y: this.viewHeight / 2 + 6 + (Math.random() - 0.5) * 18,
        vx: (Math.random() - 0.5) * 24,
        vy: -30 - Math.random() * 40, // salgono verso l'alto
        life: 0,
        max: 0.7 + Math.random() * 0.6,
        color: colors[i % colors.length]
      });
    }
  }

  private updateHealSparks(dt: number): void {
    for (const s of this.healSparks) {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 18 * dt; // gravità lieve: rallentano salendo
    }
    this.healSparks = this.healSparks.filter((s) => s.life < s.max);
  }

  // Mostra un banner "evento" (traguardo, breaking news) con entrata a molla.
  private showBanner(text: string, sub: string, color: string): void {
    this.banner = { text:readableCopy(text), sub:readableCopy(sub), t: 0, color };
    this.bannerFlash = 0.4;
    // Buzz breve sui banner rilevanti (BREAKING NEWS, traguardi, avvistamenti).
    haptics.event();
  }

  // Ombra ellittica ai piedi di un attore del mondo (player/NPC/remoto): dà
  // "peso" e ancoraggio a terra agli sprite. `fx` = coordinate schermo del
  // centro-piedi. Semitrasparente, disegnata PRIMA dello sprite.
  private drawShadow(screen: Screen, footX: number, footY: number, rx = 6): void {
    const ctx = screen.ctx;
    ctx.save();
    if(this.map.outdoor){
      ctx.fillStyle='rgba(20,30,37,.18)';ctx.beginPath();
      ctx.moveTo(Math.round(footX-rx),Math.round(footY));ctx.lineTo(Math.round(footX+rx),Math.round(footY));
      ctx.lineTo(Math.round(footX+rx+9),Math.round(footY+6));ctx.lineTo(Math.round(footX-rx+9),Math.round(footY+6));ctx.closePath();ctx.fill();
    }
    ctx.globalAlpha = 0.4;
    // Ellisse scura schiacciata: rx orizzontale, ry ~40% (prospettiva 3/4).
    for (let dy = -3; dy <= 3; dy += 1) {
      const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / 3) * (dy / 3))));
      if (span > 0) {
        ctx.fillStyle = "#101018";
        ctx.fillRect(Math.round(footX - span), Math.round(footY + dy), span * 2, 1);
      }
    }
    ctx.restore();
  }

  update(dt: number): void {
    // Riconciliazione mappa: se qualcuno ha spostato state.pos su un'altra
    // mappa mentre eravamo sotto un menu (TESSERA RIMBORSO SPESE dalla BORSA),
    // al ritorno in cima si ricarica la destinazione.
    if (this.map.id !== this.state.pos.mapId && MAPS[this.state.pos.mapId]) {
      this.loadMap(this.state.pos.mapId);
      this.say(["TESSERA RIMBORSO SPESE: viaggio spesato dai contribuenti!", "Eccoti al BAR SPORT più vicino al cuore."]);
      return;
    }
    this.time += dt;
    this.cameraDt=dt;
    this.atmosphere.update(dt,this.state.reduceEffects);
    // Insegue l'offset di centratura porta con un lerp esponenziale (indipendente
    // dal frame rate): da fermo tende a ±8, appena parti il target è 0 e lo smooth
    // rientra dolcemente invece di scattare di lato. ~12/s = quasi completo in un passo.
    {
      const target = this.doorCenteringOffset();
      const k = 1 - Math.exp(-16 * dt);
      this.doorOffsetSmooth += (target - this.doorOffsetSmooth) * k;
      if (Math.abs(this.doorOffsetSmooth - target) < 0.3) {
        this.doorOffsetSmooth = target;
      }
    }
    this.shake = Math.max(0, this.shake - dt);
    this.fadeT = Math.max(0, this.fadeT - dt);
    this.bannerFlash = Math.max(0, this.bannerFlash - dt);
    this.sondPulse = Math.max(0, this.sondPulse - dt);
    // Scintille cura passiva: salgono e svaniscono (sempre, non bloccano nulla).
    for (const s of this.stepSparks) {
      s.life += dt;
      s.y += s.vy * dt;
    }
    this.stepSparks = this.stepSparks.filter((s) => s.life < s.max);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > 2.4) this.banner = null;
    } else {
      // Toast MISSIONE COMPLETATA in coda (accumulati anche in battaglia/casinò).
      const toast = consumeDailyToast();
      if (toast) {
        audio.catchJingle();
        this.showBanner(toast.title, toast.sub, "#7ad858");
      }
    }
    if (this.sondDelta) {
      this.sondDelta.t -= dt;
      if (this.sondDelta.t <= 0) {
        this.sondDelta = null;
      }
    }
    mp.update(dt); // interpolazione avatar remoti + decadimento emote
    mp.trade.tick(dt); // timeout inviti/negoziazioni scambio
    this.rustles = this.rustles.filter((r) => (r.t -= dt) > 0);

    // NPC vivi: i "vaganti" camminano attorno a casa, gli altri si guardano
    // intorno girando la testa. (I trainer/healer restano immobili al loro posto.)
    // Durante un DIALOGO (messaggio o menù aperto) gli NPC si CONGELANO: senza
    // questo, l'NPC con cui parli si rigira random ogni 2-5s (turnTimer) o
    // continua a vagare, "spostandosi" mentre gli parli. Freeze = mondo in pausa.
    const talking = this.msg.isOpen || Boolean(this.askMenu) || Boolean(this.remoteMenu);
    if (!talking) {
      for (const npc of this.npcs) {
        if (npc.trainerId || npc.healer) {
          continue;
        }
        if (npc.canWander) {
          this.updateNpcWalk(npc, dt);
        } else {
          npc.turnTimer -= dt;
          if (npc.turnTimer <= 0) {
            npc.turnTimer = 2 + Math.random() * 5;
            npc.currentFacing = FACINGS[Math.floor(Math.random() * FACINGS.length)];
          }
        }
      }
    }

    // Sondaggi: il valore mostrato insegue quello reale (barra che ticchetta).
    // Al primo giro si allinea senza animare; poi un cambio fa flash + delta.
    if (this.displaySondaggi < 0) {
      this.displaySondaggi = this.state.sondaggi;
    } else if (Math.round(this.displaySondaggi) !== this.state.sondaggi) {
      const diff = this.state.sondaggi - Math.round(this.displaySondaggi);
      // Segnala il delta solo se non c'è già un tooltip in corso (evita spam).
      if (!this.sondDelta || this.sondPulse <= 0) {
        this.sondDelta = { text: `${diff > 0 ? "+" : ""}${diff}`, t: 1.4, up: diff > 0 };
        this.sondPulse = 0.5;
      }
      this.displaySondaggi = approach(this.displaySondaggi, this.state.sondaggi, dt * 28);
    }

    // Dissolvenza d'uscita prima di un warp: a nero completo esegue il cambio
    // mappa. Blocca l'input nel frattempo (come encounterFlash).
    if (this.fadeOut > 0) {
      this.fadeOut = Math.max(0, this.fadeOut - dt);
      if (this.fadeOut === 0 && this.pendingWarp) {
        const w = this.pendingWarp;
        this.pendingWarp = null;
        w();
      }
      return;
    }

    // Animazione di cura: blocca movimento/input finché finisce (come encounterFlash).
    if (this.healFx > 0) {
      this.healFx = Math.max(0, this.healFx - dt);
      this.updateHealSparks(dt);
      for (const s of this.healSnapshot) {
        s.disp = approach(s.disp, s.to, dt * 60);
      }
      if (this.healFx === 0 && this.afterHeal) {
        const f = this.afterHeal;
        this.afterHeal = null;
        this.healSnapshot = [];
        this.healSparks = [];
        f();
      }
      return;
    }

    if (this.encounterFlash > 0) {
      this.encounterFlash = Math.max(0, this.encounterFlash - dt);
      if (this.encounterFlash <= 0 && this.pendingBattle) {
        const start = this.pendingBattle;
        this.pendingBattle = null;
        start();
      }
      return;
    }

    if (this.exclaimT > 0) {
      this.exclaimT = Math.max(0, this.exclaimT - dt);
      if (this.exclaimT <= 0 && this.pendingTrainer) {
        const def = this.pendingTrainer;
        this.pendingTrainer = null;
        this.exclaimNpc = null;
        this.startTrainerFight(def);
      }
      return;
    }

    if (this.remoteMenu) {
      const action = this.remoteMenu.update(this.input);
      if (action === "select") this.chooseRemote(this.remoteMenu.index);
      else if (action === "cancel") this.chooseRemote();
      return;
    }

    if (this.askMenu) {
      const action = this.askMenu.update(this.input);
      if (action === "select") this.chooseAsk(this.askMenu.index);
      else if (action === "cancel") this.chooseAsk();
      return;
    }

    if (!this.msg.isOpen) this.syncRoamers(dt);
    if (this.encounterFlash > 0 || this.pendingBattle) return;
    let dir = this.input.heldDirection() ?? (["up", "down", "left", "right"] as const).find(key => this.input.wasPressed(key));
    if (this.msg.isOpen) {
      if (!dir || !this.msg.dismissNotification()) {
        this.msg.update(dt, this.input, this.viewHeight);
        return;
      }
      // A notification callback may start a scene or a manual conversation.
      if (this.stack.top !== this || this.msg.isOpen || this.askMenu || this.remoteMenu) return;
    }

    // Traguardi: valutati quando il giocatore ha il controllo libero (così
    // scattano dopo battaglie, catture, sblocchi senza agganci sparsi). La
    // notifica appare come BREAKING NEWS dei traguardi.
    if (!this.moving) {
      // Eventi online in arrivo (duello/scambio): prompt SÌ/NO via askYesNo.
      if (this.pollDuel()) {
        return;
      }
      if (this.pollTalkInvite()) {
        return;
      }
      if (this.pollTradeInvite()) {
        return;
      }
      const fresh = checkAchievements(this.state);
      if (fresh.length > 0) {
        saveGame(this.state);
        // Banner dorato + fanfara di "evento" (non più il jingle riciclato della
        // cattura): un traguardo si DEVE sentire come un traguardo.
        audio.victory();
        this.showBanner(fresh[0].name, `+${fresh.reduce((sum, a) => sum + a.reward, 0)}€`, "#e8c84a");
      }
      // Eventi d'ingresso mappa: valutati SOLO al primo frame idle dopo loadMap
      // in cui il giocatore NON sta già premendo una direzione (chi arriva sulla
      // porta e continua verso un warp non deve vederli scattare al posto del
      // passo). Hint one-shot + CRISI DI GOVERNO.
      if (this.justEnteredMap && !dir) {
        this.justEnteredMap = false;
        if (this.showMapEntryHint()) {
          return;
        }
        if (this.maybeGovernmentCrisis()) {
          return;
        }
      }
    }

    const pos = this.state.pos;

    const rawTap = this.input.consumeTap();
    const tap=rawTap?unzoomWorldPoint(rawTap.x,rawTap.y,VIEW_W,this.viewHeight,this.tapCamera.zoom):undefined;
    if (dir || this.input.wasPressed("b")) this.stopTapRoute();
    else if (tap) {
      this.input.clearTap();
      const hit=this.npcTapAreas.filter(area=>tap.x>=area.x&&tap.x<area.x+area.width&&tap.y>=area.y&&tap.y<area.y+area.height).sort((a,b)=>b.y-a.y)[0];
      const npc=hit?this.visibleNpcs().find(n=>n.id===hit.id):undefined;
      if(npc)this.planTapRoute(npc.x,npc.y,npc.id);
      else this.planTapRoute(Math.floor((tap.x+this.tapCamera.x)/TILE),Math.floor((tap.y+this.tapCamera.y)/TILE));
    }

    if (this.moving) {
      // Monopattino e auto sono più veloci della semplice corsa (B): si sente.
      const fast = this.map.outdoor ? this.state.vehicle : null;
      const factor =
        fast === "auto"
          ? AUTO_FACTOR
          : fast === "monopattino"
            ? SCOOTER_FACTOR
            : this.running
              ? RUN_FACTOR
              : 1;
      this.moveT += (dt / STEP_TIME) * (this.hop ? 0.6 : factor);
      if (this.moveT >= 1) {
        this.moving = false;
        this.hop = false;
        this.moveT = 0;
        this.onStepComplete();
        if (!this.canUseWorldControls()) this.stopTapRoute();
      }
      return;
    }

    if (this.input.wasPressed("start")) {
      this.stopTapRoute();
      audio.confirm();
      this.stack.push(new PauseScene(this.stack, this.input, this.state));
      return;
    }
    if (this.input.wasPressed("a")) {
      this.stopTapRoute();
      this.interact();
      return;
    }

    if (!dir) dir = this.tapDirection();
    if (!dir || !this.canUseWorldControls()) return;
    const facing = dir as Facing;
    pos.facing = facing;
    const delta = DIR_DELTA[facing];
    const nx = pos.x + delta.dx;
    const ny = pos.y + delta.dy;

    // Passaggio tra zone ai bordi della mappa.
    const mapH = this.map.tiles.length;
    if (ny < 0 && this.map.edges?.north) {
      const edge = this.map.edges.north;
      // Confine gated da medaglie: ogni palestra apre la regione successiva.
      if (edge.requiresBadges && this.state.badges.length < edge.requiresBadges) {
        this.say(edge.lockedLines ?? ["La strada è ancora chiusa."]);
        return;
      }
      const target = MAPS[edge.toMap];
      this.state.pos = {
        mapId: edge.toMap, x: nx + edge.offsetX, y: target.tiles.length - 1, facing
      };
      this.loadMap(edge.toMap);
      return;
    }
    if (ny >= mapH && this.map.edges?.south) {
      const edge = this.map.edges.south;
      if (edge.requiresBadges && this.state.badges.length < edge.requiresBadges) {
        this.say(edge.lockedLines ?? ["La strada è ancora chiusa."]);
        return;
      }
      this.state.pos = { mapId: edge.toMap, x: nx + edge.offsetX, y: 0, facing };
      this.loadMap(edge.toMap);
      return;
    }

    if (TILES[this.tileAt(nx, ny)]?.ledge) {
      const landing = { x: nx, y: ny + 1 };
      if (facing === "down" && !this.isBlocked(landing.x, landing.y) && !this.map.warps.some(warp => warp.x === landing.x && warp.y === landing.y)) {
        this.running = false;
        this.hop = true;
        this.fromX = pos.x; this.fromY = pos.y;
        pos.x = landing.x; pos.y = landing.y;
        this.moving = true; this.moveT = 0;
        haptics.tap();
        return;
      }
      if(!this.state.reduceEffects&&this.time>=this.nextBump){this.shake=.18;this.nextBump=this.time+.3;}
      return;
    }
    if (this.isBlocked(nx, ny)) {
      if(!this.state.reduceEffects&&this.time>=this.nextBump){this.shake=.18;this.nextBump=this.time+.3;}
      return;
    }
    // Con MONOPATTINO o AUTO si va sempre veloci all'aperto; B resta la corsa.
    const onVehicle =
      (this.state.vehicle === "monopattino" || this.state.vehicle === "auto") && this.map.outdoor;
    this.running = this.runToggled || this.input.isHeld("b") || onVehicle;
    this.fromX = pos.x;
    this.fromY = pos.y;
    pos.x = nx;
    pos.y = ny;
    this.moving = true;
    this.moveT = 0;
  }

  // ---- Draw ----

  draw(screen: Screen): void {
    this.viewHeight = screen.height;
    const pos = this.state.pos;
    const mapW = this.map.tiles[0].length * TILE;
    const mapH = this.map.tiles.length * TILE;

    const t = this.moving ? this.moveT : 1;
    const px = (this.fromX + (pos.x - this.fromX) * t) * TILE;
    const py = (this.fromY + (pos.y - this.fromY) * t) * TILE;
    const playerPx = this.moving ? px : pos.x * TILE;
    const playerPy = this.moving ? py : pos.y * TILE;

    // The HUD no longer reserves map space. Only keep the player clear of
    // the short top strip when entering from a northern edge.
    const topClearance=Math.ceil(116*VIEW_W/Math.max(1,screen.ctx.canvas.clientWidth||VIEW_W));
    const facing=DIR_DELTA[pos.facing],lead=this.moving&&!this.state.reduceEffects?5:0;
    const targetX=worldCameraAxis(playerPx+TILE/2+facing.dx*lead,mapW,VIEW_W);
    const targetY=Math.min(worldCameraAxis(playerPy+TILE/2+facing.dy*lead,mapH,this.viewHeight),playerPy-topClearance);
    if(!this.cameraPosition)this.cameraPosition={x:targetX,y:targetY};
    this.cameraPosition.x=followCamera(this.cameraPosition.x,targetX,this.cameraDt,this.state.reduceEffects);
    this.cameraPosition.y=followCamera(this.cameraPosition.y,targetY,this.cameraDt,this.state.reduceEffects);
    let camX=Math.round(this.cameraPosition.x),camY=Math.round(this.cameraPosition.y);
    const zoomTarget=this.dialogueFocus&&this.msg.isOpen&&!this.state.reduceEffects?1.1:1;
    this.dialogueZoom=followCamera(this.dialogueZoom,zoomTarget,this.cameraDt,this.state.reduceEffects);
    // Scossone (RUSPA): sposta la camera di qualche pixel, dà peso all'impatto.
    if (this.shake > 0 && !this.state.reduceEffects) {
      const amp = Math.max(1.5,this.shake * 5);
      camX += Math.round((Math.random() - 0.5) * amp);
      camY += Math.round((Math.random() - 0.5) * amp);
    }

    this.tapCamera = {x:camX,y:camY,zoom:this.dialogueZoom};
    this.npcTapAreas = [];
    screen.clear("#10141f");
    screen.ctx.save();
    screen.ctx.translate(VIEW_W/2,this.viewHeight/2);screen.ctx.scale(this.dialogueZoom,this.dialogueZoom);screen.ctx.translate(-VIEW_W/2,-this.viewHeight/2);

    // The substrate is baked once per map and invalidated by visible world edits.
    // UI migration remains gated separately by DESIGN-UI.
    this.terrain.draw(screen.ctx,{
      map:this.map,
      assetRevision:spriteAssetRevision(),
      revision:this.state.bulldozed.join('|')+':'+this.state.morale.decisions.join('|'),
      sample:(x,y)=>this.terrainSample(x,y),
      shadows:()=>this.map.outdoor?this.terrainShadows():[]
    },camX,camY);

    if(this.map.outdoor)this.terrain.drawWater(screen.ctx,terrainVariantImage('w',waterFrame(this.time,this.state.reduceEffects)),camX,camY,VIEW_W,this.viewHeight,this.time,this.state.reduceEffects);
    const windowLights:Array<{x:number;y:number;lamp?:boolean}>=(this.map.lamps??[]).map(p=>({x:p.x*TILE+6,y:p.y*TILE-12,lamp:true}));
    this.atmosphere.drawSteps(screen.ctx,camX,camY,this.state.reduceEffects);
    const treeTrunks:Array<{baseY:number;draw:()=>void}>=[];
    const canopies:Array<()=>void>=[];
    const x0 = Math.floor(camX / TILE);
    const y0 = Math.floor(camY / TILE);
    for (let ty = y0; ty <= y0 + Math.ceil(this.viewHeight / TILE); ty += 1) {
      for (let tx = x0; tx <= x0 + Math.ceil(VIEW_W / TILE); tx += 1) {
        const ch = this.terrainTileAt(tx, ty);
        const def = TILES[ch];
        if (!def) {
          continue;
        }
        const dx = tx * TILE - camX;
        const dy = ty * TILE - camY;
        if(ch!==this.tileAt(tx,ty)){
          const image=this.terrainSample(tx,ty).image;
          if(image)screen.ctx.drawImage(image,dx,dy,TILE,TILE);
          continue;
        }
        if(tx>=0 && ty>=0 && ty<this.map.tiles.length && tx<this.map.tiles[ty].length) {
          if(!this.buildingCovering(tx,ty)) {
            const obj=this.objectPng(ch);
            if(obj && ch==='T') {
              const bounds=screen.imageBounds(obj),target=this.map.objectSizes?.[ch]??WORLD_OBJECT_TARGET_PX.T;
              const scale=target/Math.max(bounds.w,bounds.h),cut=Math.floor(bounds.h*.72);
              const left=Math.round(dx+TILE/2-bounds.w*scale/2),top=Math.round(dy+TILE-bounds.h*scale);
              const width=Math.round(bounds.w*scale),crownHeight=Math.round(cut*scale);
              treeTrunks.push({baseY:(ty+1)*TILE,draw:()=>screen.ctx.drawImage(obj,bounds.x,bounds.y+cut,bounds.w,bounds.h-cut,left,top+crownHeight,width,Math.round((bounds.h-cut)*scale))});
              canopies.push(()=>{
                const ctx=screen.ctx;ctx.save();
                const px=playerPx-camX,py=playerPy-camY;
                if(px+12>left&&px+4<left+width&&py+16>top&&py-12<top+crownHeight)ctx.globalAlpha=.45;
                ctx.drawImage(obj,bounds.x,bounds.y,bounds.w,cut,left,top,width,crownHeight);ctx.restore();
              });
            } else if(obj && ch==='~') {
              const b=screen.imageBounds(obj),scale=16/Math.max(b.w,b.h),cut=Math.floor(b.h*.55);
              const offset=grassBend(this.time,terrainHash(this.map.id,tx,ty),this.state.reduceEffects,Math.abs(tx*TILE-playerPx)<14&&Math.abs(ty*TILE-playerPy)<14,tx*TILE-playerPx);
              const left=Math.round(dx+8-b.w*scale/2),top=Math.round(dy+16-b.h*scale),width=Math.round(b.w*scale),upper=Math.round(cut*scale);
              screen.ctx.drawImage(obj,b.x,b.y,b.w,cut,left+offset,top,width,upper);
              screen.ctx.drawImage(obj,b.x,b.y+cut,b.w,b.h-cut,left,top+upper,width,Math.round((b.h-cut)*scale));
            } else if(obj)drawWorldObjectPng(screen,ch,obj,dx,dy,this.map.objectSizes?.[ch]);
            else if('ORSN'.includes(ch)) {
              const img=this.tilePng(ch);if(img)drawWorldTilePng(screen,img,dx,dy);
            }
          }
          continue;
        }
        // EDIFICI: se questo tile è un tetto/facciata di un edificio con asset
        // PixelLab, disegno solo il terreno base qui (l'edificio intero
        // è disegnato in un secondo passo, scalato sulla footprint, così copre
        // tetto+muro+porta senza overflow).
        const coveringRoof = this.buildingCovering(tx, ty);
        if (coveringRoof) {
          // Terreno per ancorare l'edificio: erba/sentiero (esterno) o pavimento
          // (interno). Per i tile-facciata usiamo il terreno della cella sopra il
          // tetto così la base resta coerente col contorno.
          const baseCh2 = this.map.outdoor ? "." : "p";
          const bImg = this.tilePng(baseCh2);
          if (bImg) drawWorldTilePng(screen, bImg, dx, dy);
          continue;
        }
        if (def.overlay) {
          // Terreno di base sotto l'overlay. Le strutture del ponte (overWater)
          // stanno sull'acqua: base ACQUA, non erba (altrimenti "sospese sul mare").
          const baseCh = def.overWater ? "w" : this.map.outdoor ? "." : "p";
          const baseImg = this.tilePng(baseCh);
          if (baseImg) {
            drawWorldTilePng(screen, baseImg, dx, dy);
          }
        }
        if (def.water) {
          const waterImg = this.tilePng(ch);
          if (waterImg) {
            drawWorldTilePng(screen, waterImg, dx, dy);
          }
        } else if (def.overlay) {
          // Oggetto overlay (albero/segnale/...): PNG 32px ancorato in basso al
          // tile (la chioma sborda verso l'alto).
          const obj = this.objectPng(ch);
          if (obj) {
            drawWorldObjectPng(screen, ch, obj, dx, dy, this.map.objectSizes?.[ch]);
          }
        } else {
          const objImg = this.objectPng(ch);
          if (objImg) {
            // Tile non-overlay con oggetto PNG (es. erba alta `~`): prima il
            // terreno base (erba/pavimento), poi i ciuffi PNG ancorati in basso.
            const baseCh = this.map.outdoor ? "." : "p";
            const baseImg2 = this.tilePng(baseCh);
            if (baseImg2) {
              drawWorldTilePng(screen, baseImg2, dx, dy);
            }
            drawWorldObjectPng(screen, ch, objImg, dx, dy, this.map.objectSizes?.[ch]);
          } else {
            // Terreno del ponte (impalcato `j`) sopra l'acqua: prima l'acqua,
            // poi l'impalcato — così i bordi trasparenti del deck mostrano il mare.
            if (def.overWater) {
              const waterBase = this.tilePng("w");
              if (waterBase) {
                drawWorldTilePng(screen, waterBase, dx, dy);
              }
            }
            // I piccoli arredi trasparenti poggiano sul terreno della zona,
            // mai sul nero del clear (neve per il pino, suolo/pavimento per la grotta).
            if ("ORSN".includes(ch)) {
              const snowy = ch === "N" || this.map.tileOverrides?.["="] === "tiles/snow_path.png";
              const ground = this.tilePng(snowy ? "i" : this.map.outdoor ? "." : "p");
              if (ground) drawWorldTilePng(screen, ground, dx, dy);
            }
            // Texture Higgsfield del terreno (override mappa o default).
            const img = this.tilePng(ch);
            if (img) {
              drawWorldTilePng(screen, img, dx, dy);
            }
          }
        }
      }
    }

    // EDIFICI (secondo passo): disegna il building-PNG sull'angolo ALTO-SX di
    // ogni blocco-tetto, SCALATO sulla footprint reale (tetto + righe facciata).
    // Così un PNG 64x48 nativo copre esattamente un blocco 4x3 in tile, e un
    // 96x48 un blocco 6x3, qualunque mappa — niente overflow né tagli. Il PNG si
    // ancora in alto-sx e si stira/comprime per combaciare con l'impronta ASCII.
    // Disegnato in un range esteso a sinistra/sopra così gli edifici a cavallo
    // del bordo schermo entrano comunque.
    // Z-ORDER per profondità: edifici, NPC, remoti e player vengono raccolti in
    // una lista con la loro Y di base (bordo inferiore in px-mondo) e disegnati
    // ordinati per Y crescente. Così chi è più in ALTO (Y minore) finisce DIETRO
    // (es. il player dietro la casa quando è sopra di essa), risolvendo il
    // "personaggio sopra il tetto". Gli edifici di mappa ora passano solo dai PNG
    // PixelLab caricati dal preload: niente vecchie pixmap di recupero in world.
    const tall: Array<{ baseY: number; draw: () => void }> = [...treeTrunks];
    for (const roamer of this.roamers?.roamers ?? []) {
      const ease = roamer.t < 1 ? roamer.t : 1;
      const px = (roamer.fromX + (roamer.x - roamer.fromX) * ease) * TILE, py = (roamer.fromY + (roamer.y - roamer.fromY) * ease) * TILE;
      const rx = Math.round(px - camX), ry = Math.round(py - camY);
      if (rx < -24 || rx > VIEW_W + 24 || ry < -24 || ry > this.viewHeight + 24) continue;
      tall.push({ baseY: py + TILE, draw: () => {
        const hop = roamer.t < 1 ? Math.abs(Math.sin(roamer.t * Math.PI)) * 3 : roamer.mood === "sleep" || this.state.reduceEffects ? 0 : (Math.floor(this.time * 3 + roamer.id) % 4 === 0 ? 1 : 0);
        this.drawShadow(screen, rx + 8, ry + 14, 5);
        const image = monsterImage(roamer.speciesId);
        if (image) {
          const bounds = screen.imageBounds(image), scale = 20 / bounds.h, dw = bounds.w * scale;
          screen.imageSpriteCropped(image, rx + 8 - dw / 2, ry + 15 - bounds.h * scale - hop, { scaleX: scale, scaleY: scale });
        }
        if (roamer.alert > 0) { screen.rect(rx + 4, ry - 20, 9, 11, "#d7263d"); screen.text("!", rx + 7, ry - 18, "#fffaf0"); }
        else if (roamer.mood === "sleep") screen.text("z", rx + 12, ry - 8 - (Math.floor(this.time * 2) % 2), "#fffaf0");
      } });
    }
    for(const lamp of this.map.lamps??[]){
      const x=Math.round(lamp.x*TILE+8-camX),y=Math.round((lamp.y+1)*TILE-camY);
      if(x < -8 || x > VIEW_W+8 || y < 0 || y > this.viewHeight+34)continue;
      tall.push({baseY:(lamp.y+1)*TILE,draw:()=>{
        const ctx=screen.ctx;
        ctx.fillStyle='#202d32';ctx.fillRect(x-3,y-3,6,3);ctx.fillRect(x-1,y-28,2,27);
        ctx.fillRect(x-4,y-31,8,2);ctx.fillRect(x-3,y-29,6,7);ctx.fillRect(x-4,y-23,8,2);
        ctx.fillStyle='#8b997e';ctx.fillRect(x,y-21,1,17);
        ctx.fillStyle='#bdc5a6';ctx.fillRect(x-2,y-28,4,5);
        ctx.fillStyle='#202d32';ctx.fillRect(x-1,y-33,2,2);
      }});
    }


    for (let ty = y0 - 4; ty <= y0 + Math.ceil(this.viewHeight / TILE) + 1; ty += 1) {
      for (let tx = x0 - 10; tx <= x0 + Math.ceil(VIEW_W / TILE); tx += 1) {
        const ch = this.tileAt(tx, ty);
        if (!isRoof(ch)) {
          continue;
        }
        // È l'angolo alto-sx del blocco? (gruppo PNG, non char: e/Q, y/B/x)
        const groupKey = buildingKey(ch);
        if (buildingKey(this.tileAt(tx - 1, ty)) === groupKey || buildingKey(this.tileAt(tx, ty - 1)) === groupKey) {
          continue;
        }
        const fp = this.buildingFootprint(tx, ty, ch);
        const override = this.map.buildingOverrides?.[ch];
        const build = override ? getSpriteImage(`build:ov:${this.map.id}:${ch}`, override) : buildingImage(ch, fp);
        if (!build) {
          continue;
        }
        const dx = tx * TILE - camX;
        const dy = ty * TILE - camY;
        const dw = fp.w * TILE;
        const dh = fp.h * TILE;
        if(['r','H','v','o','e','Q','!','?'].includes(ch)&&!override){
          windowLights.push({x:tx*TILE+Math.round(dw*.2),y:ty*TILE+Math.round(dh*.7)});
          windowLights.push({x:tx*TILE+Math.round(dw*.75),y:ty*TILE+Math.round(dh*.7)});
        }
        const bImg = build;
        const bScaleX = dw / bImg.width;
        const bScaleY = dh / bImg.height;
        // baseY = bordo inferiore dell'edificio in px-mondo.
        const baseYb = (ty + fp.h) * TILE;
        // Soglia: ridisegna il sentiero davanti a OGNI tile-porta della facciata
        // (le porte sono i 2 tile centrali della footprint, vedi maps.ts).
        const doorRow = ty + fp.h - 1;
        const stepY = ty + fp.h;
        const drawThreshold = (): void => {
          for (let xx = tx; xx < tx + fp.w; xx += 1) {
            const fc = this.tileAt(xx, doorRow);
            if ((fc === "d" || fc === "D" || fc === "g") && this.tileAt(xx, stepY) === "=") {
              const pathImg=this.map.tileOverrides?.['=']?this.tilePng('='):terrainVariantImage('=',terrainHash(this.map.id,xx,stepY)%4,this.map.groundMaterials?.['=']);
              if(pathImg)drawWorldTilePng(screen, pathImg, xx * TILE - camX, stepY * TILE - camY);
            }
          }
        };
        // +0.5: a parità di baseY (player/NPC in piedi SUL tile-porta) l'edificio
        // vince e copre lo sprite → entrando si viene "inghiottiti" dalla porta
        // stile Pokémon invece di restare disegnati sopra la facciata. Chi sta
        // sulla riga davanti (baseY +16) resta comunque davanti all'edificio.
        tall.push({
          baseY: baseYb + 0.5,
          draw: () => {
            screen.imageSprite(bImg, dx, dy, { scaleX: bScaleX, scaleY: bScaleY });
            drawThreshold();
          }
        });
      }
    }

    for (const pickup of this.map.pickups) {
      if (this.state.pickedItems.includes(pickup.id) || pickup.hidden) {
        continue; // i tesori nascosti non si disegnano: vanno scovati esaminando
      }
      drawBallot(screen, pickup.x * TILE - camX, pickup.y * TILE - camY);
    }

    if (this.map.id === "lab" && !this.state.flags["starter-chosen"]) {
      for (const spot of STARTER_SPOTS) {
        drawBallot(screen, spot.x * TILE - camX, spot.y * TILE - camY);
      }
    }

    // MARKER USCITA: SOLO nelle grotte, dove la cella d'uscita (`c`) è mascherata
    // da un tileOverride roccia e diventa INVISIBILE. Negli altri interni (case,
    // bar, palestre) la porta è un doormat rosso ben visibile → niente marker,
    // che lì risultava anche mal posizionato (a mezzo tile sopra la porta).
    if (!this.map.outdoor && this.map.tileOverrides?.c) {
      const exits = this.map.warps.filter((w) => MAPS[w.toMap]?.outdoor);
      for (const w of exits) {
        // Uscite doppie (2 celle affiancate): un solo cartello, centrato tra le
        // due. Salta la cella di destra se ce n'è una adiacente a sinistra.
        if (exits.some((o) => o.y === w.y && o.x === w.x - 1)) {
          continue;
        }
        const doubleWide = exits.some((o) => o.y === w.y && o.x === w.x + 1);
        // Centro X: metà tile se singola, tile intero se porta doppia.
        const cxPx = w.x * TILE - camX + (doubleWide ? TILE : TILE / 2);
        const ey = w.y * TILE - camY;
        const blink = this.state.reduceEffects || Math.floor(this.time * 2) % 2 === 0;
        const label = "USCITA";
        worldLabel(label,cxPx,ey-2,screen.height);
        if (blink) {
          worldLabel("▼",cxPx,ey+12,screen.height);
        }
      }
    }

    for (const npc of this.visibleNpcs()) {
      const exclaim = this.exclaimNpc === npc;
      // RIVINCITA pronta: "!" dorato sopra il trainer (scopribilità, audit C12).
      const rematchReady =
        !exclaim &&
        Boolean(npc.trainerId) &&
        rematchAvailability(this.state, npc.trainerId!) === "ready";
      // LEGGENDARIO ancora disponibile: aura + cartello per renderlo SPECIALE e
      // inconfondibile (evita di sfidarlo per sbaglio, vedi conferma SÌ/NO).
      const legendaryReady = Boolean(npc.legendary) && !this.state.flags[npc.legendary!.flag];
      const command=buildNpcDrawCommand({
        screen,
        npc,
        camX,
        camY,
        time: this.time,
        reduceEffects: this.state.reduceEffects,
        exclaim,
        rematchReady,
        legendaryReady,
        drawShadow: (x, y) => this.drawShadow(screen, x, y)
      });
      if(command.hitBox)this.npcTapAreas.push({id:npc.id,...command.hitBox});
      tall.push(command);
    }

    // Altri giocatori online sulla mia stessa mappa (interpolati).
    for (const r of mp.remotePlayers()) {
      const sx = Math.round(r.dispX) - camX;
      const sy = Math.round(r.dispY) - camY - 1;
      // Salta chi è troppo fuori schermo (perf + pulizia).
      if (sx < -20 || sx > VIEW_W + 20 || sy < -20 || sy > this.viewHeight + 20) {
        continue;
      }
      // Avatar remoto: stesso PNG del player (4 viste + walk); il nickname sopra
      // la testa li distingue.
      const rWalk = r.moving ? Math.floor(this.time * 8) % 4 : 0;
      const rImg = playerImage(r.facing, rWalk, r.moving);
      const rEmote = r.emote;
      const rNick = r.nick.slice(0, 10);
      // INDICATORE REMOTI (Round 40): se il remoto è ADIACENTE (a 1 tile) puoi
      // premere A per aprire ISPEZIONA/SCAMBIA/SFIDA. Doppia freccia blu
      // lampeggiante che invita all'interazione.
      const adjacent = Math.abs(r.x - pos.x) + Math.abs(r.y - pos.y) === 1;
      tall.push({
        baseY: r.dispY + TILE,
        draw: () => {
          // Ombra ai piedi del remoto (prima dello sprite).
          this.drawShadow(screen, sx + 8, sy + 14);
          if (rImg) {
            const rb = screen.imageBounds(rImg);
            const rs = 22 / rb.h;
            const rdw = rb.w * rs;
            screen.imageSpriteCropped(rImg, sx + 8 - rdw / 2, sy + 15 - rb.h * rs, { scaleX: rs, scaleY: rs });
          }
          // Targhetta col nickname sopra la testa (+ record duelli dichiarato).
          worldLabel(rNick,sx+8,sy-5,screen.height);
          // Tag duelli: ★N (oro); a 10+ vittorie diventa "PORTAVOCE".
          if (r.duelWins > 0 && !rEmote) {
            const tag = r.duelWins >= 10 ? "PORTAVOCE" : `★${r.duelWins}`;
            worldLabel(tag,sx+8,sy-16,screen.height);
          }
          // Bolla emote.
          if (rEmote) {
            // Bolla adattata a 1-2 caratteri (emote tipo "GG"/"OK").
            const e = rEmote.slice(0, 2);
            worldLabel(e,sx+8,sy-18,screen.height);
          } else if (adjacent) {
            // Doppia freccia "!!" lampeggiante: premi A per interagire.
            const blink = this.state.reduceEffects || Math.floor(this.time * 2) % 2 === 0;
            if (blink) {
              worldLabel("!!",sx+8,sy-18,screen.height);
            }
          }
        }
      });
    }

    const frame = this.moving ? (Math.floor(this.moveT * 2) % 2 === 0 ? 1 : 0) : 0;
    // Centratura sulla PORTA degli interni: la porta è un doormat largo 2 tile
    // (`cc`), ma il player occupa 1 tile e vi atterra sulla cella di sinistra →
    // appare spostato a lato. Quando è FERMO su una di quelle 2 celle, spostiamo
    // SOLO il disegno di mezzo tile verso il centro della coppia (la camera non si
    // muove). Appena cammina via, l'offset sparisce da sé (la cella non è più `c+c`).
    // Offset di centratura porta INTERPOLATO (vedi doorOffsetSmooth in update):
    // niente più scatto laterale al primo passo, il player scivola dolce.
    const doorOffset = this.doorOffsetSmooth;
    const baseX = Math.round(playerPx - camX + doorOffset);
    const hopLift = this.hop && this.moving ? Math.round(Math.sin(this.moveT * Math.PI) * 9) : 0;
    const baseY = Math.round(playerPy) - camY - 2 - hopLift;
    screen.ctx.canvas.dataset.worldReady=String(this.fadeT<=0);
    screen.ctx.canvas.dataset.worldPlayerBounds=JSON.stringify({x:baseX,y:baseY-6,w:16,h:24,viewHeight:screen.height});
    // Se sei su un veicolo, lo disegniamo SOTTO e ti alziamo "in sella":
    // così si vede chiaramente che ci sei sopra.
    const vehicle = this.state.vehicle as VehicleId | null;
    // Disegna il player: PNG PixelLab (4 dir native, scalato ai 16px del mondo,
    // ancorato in basso).
    // Frame di camminata: alterna i fotogrammi walk mentre il player si muove,
    // così non "scivola". `walkCycle` è un indice 0..3 derivato dal tempo di passo.
    const walkCycle = this.moving ? Math.floor(this.moveT * 8) % 4 : 0;
    const playerImg = playerImage(pos.facing, walkCycle, this.moving);
    const drawPlayer = (px: number, py: number): void => {
      // Ombra ai piedi del player (prima dello sprite).
      this.drawShadow(screen, px + 8, py + 15);
      if (playerImg) {
        const pb = screen.imageBounds(playerImg);
        const ps = 22 / pb.h; // altezza visibile target ~22px
        const dw = pb.w * ps;
        // Centra sul riquadro 16px e ancora i piedi a py+16.
        screen.imageSpriteCropped(playerImg, px + 8 - dw / 2, py + 16 - pb.h * ps, { scaleX: ps, scaleY: ps });
      }
    };
    const drawPlayerAndVehicle = (): void => {
      if (vehicle === "traghetto") {
        // TRAGHETTO: scafo che ondeggia, al timone il CAPITANO SCHETTINO (satira),
        // e il giocatore a bordo. Lo scafo si vede su acqua e a terra (è il mezzo).
        const bob = this.state.reduceEffects ? 0 : this.moving ? (frame === 0 ? 0 : 1) : (Math.floor(this.time * 2) % 2);
        const ferryImg = ferryImage();
        if (ferryImg) {
          const fb = screen.imageBounds(ferryImg);
          screen.imageSpriteCropped(ferryImg, baseX + 8 - fb.w / 2, baseY + 12 + bob - fb.h / 2);
        }
        // Schettino al timone (PNG PixelLab).
        const schImg = sceneImage("char:schettino", "chars/schettino.png");
        if (schImg) {
          const sb = screen.imageBounds(schImg);
          const ss = 18 / sb.h;
          screen.imageSpriteCropped(schImg, baseX + 10 - (sb.w * ss) / 2, baseY - 2 + bob, { scaleX: ss, scaleY: ss });
        }
        drawPlayer(baseX - 4, baseY + bob);
      } else if (vehicle) {
        // Sobbalzo del mezzo in movimento (vibra un pelo, fa "motore").
        const motor = vehicle === "ruspa" || vehicle === "auto";
        const jitter = !this.state.reduceEffects && this.moving && motor ? (frame === 0 ? 0 : 1) : 0;
        const vehImg = vehicleImage(vehicle, pos.facing);
        if (vehImg) {
          // Mezzi CHIUSI (auto, ruspa): vista dall'alto, il player è DENTRO →
          // si disegna solo il veicolo (più grande, riempie la cella). I mezzi
          // APERTI (monopattino): il player sta SOPRA, visibile in sella.
          const enclosed = vehicle === "auto" || vehicle === "ruspa";
          // Scala sul lato MAGGIORE così le viste laterali (east/west, più larghe
          // che alte) non si deformano né sbordano. Target più grande dei 26px
          // precedenti: il mezzo deve "riempire" la cella ed essere chiaramente
          // più grosso di un pedone (l'utente lo voleva ben visibile).
          const target = enclosed ? 30 : 24;
          const vb = screen.imageBounds(vehImg);
          const vs = target / Math.max(vb.w, vb.h);
          const vw = vb.w * vs;
          const vh = vb.h * vs;
          if (enclosed) {
            // Solo l'auto/ruspa, centrata sulla cella, ancorata in basso.
            screen.imageSpriteCropped(vehImg, baseX + 8 - vw / 2, baseY + 16 - vh + jitter, { scaleX: vs, scaleY: vs });
          } else {
            // Monopattino sotto, player in sella sopra.
            screen.imageSpriteCropped(vehImg, baseX + 8 - vw / 2, baseY + 16 - vh + jitter, { scaleX: vs, scaleY: vs });
            drawPlayer(baseX, baseY - 5 + jitter);
          }
        }
      } else {
        drawPlayer(baseX, baseY);
      }
    };
    // Il player entra nello z-order: baseY = piedi in px-mondo.
    tall.push({ baseY: playerPy + TILE, draw: drawPlayerAndVehicle });

    // Disegna tutti gli oggetti "alti" ordinati per Y (chi è più in alto va dietro).
    tall.sort((a, b) => a.baseY - b.baseY);
    for (const e of tall) {
      e.draw();
    }

    for(const drawCanopy of canopies)drawCanopy();

    // USCITE DI VIAGGIO: alcune rotte sono su acqua e non hanno una porta o un
    // molo distinguibile. Il marker resta ancorato alla casella che attiva il
    // warp, così destinazione e punto d'imbarco sono leggibili senza tentativi.
    for (const warp of this.map.warps) {
      if (!warp.markerLabel) {
        continue;
      }
      const wx = warp.x * TILE - camX;
      const wy = warp.y * TILE - camY;
      if (wx < -TILE || wx > VIEW_W || wy < -TILE || wy > this.viewHeight) {
        continue;
      }
      const pulse = this.state.reduceEffects || Math.floor(this.time * 3) % 2 === 0;
      const color = pulse ? "#fff0a0" : "#e8c84a";
      worldLabel(warp.markerLabel,wx+TILE/2,wy-6,screen.height);
      screen.rect(wx + 1, wy + 1, TILE - 2, 1, color);
      screen.rect(wx + 1, wy + TILE - 2, TILE - 2, 1, color);
      screen.rect(wx + 1, wy + 1, 1, TILE - 2, color);
      screen.rect(wx + TILE - 2, wy + 1, 1, TILE - 2, color);
    }

    // Scintille della cura passiva (Min. Salute): in coordinate-mondo.
    for (const s of this.state.reduceEffects ? [] : this.stepSparks) {
      const a = 1 - s.life / s.max;
      if (a <= 0) {
        continue;
      }
      const col = a > 0.5 ? "#bdf0a0" : "#7ad858";
      screen.rect(Math.round(s.x - camX), Math.round(s.y - camY), 2, 2, col);
    }

    // Fruscio dell'erba alta.
    for (const rustle of this.state.reduceEffects ? [] : this.rustles) {
      const rx = rustle.x * TILE - camX;
      const ry = rustle.y * TILE - camY;
      const phase = rustle.t > 0.2 ? 0 : 1;
      screen.rect(rx + 1 + phase * 2, ry + 11, 3, 2, "#2c6a1a");
      screen.rect(rx + 12 - phase * 2, ry + 12, 3, 2, "#2c6a1a");
      screen.rect(rx + 6, ry + 13 + phase, 3, 2, "#3f8a2a");
    }

    const now=this.localClock();
    this.atmosphere.draw(screen.ctx,this.map,camX,camY,VIEW_W,this.viewHeight,this.time,this.state.reduceEffects,now.getHours()+now.getMinutes()/60,windowLights);
    const quest = currentQuest(this.state);

    // Modalità guidata: freccia gialla che punta verso l'obiettivo. La
    // nascondiamo quando siamo in un INTERNO (es. il LAB) ma il target è la
    // porta su un'altra mappa: la freccia ti direbbe di USCIRE proprio dal posto
    // in cui devi restare per completare l'obiettivo. In quel caso sei arrivato.
    const guideMisleading = quest?.target && !this.map.outdoor && quest.target.mapId !== this.map.id;
    if (
      quest?.target &&
      !guideMisleading &&
      isGuideOn() &&
      !this.msg.isOpen &&
      !this.askMenu &&
      !this.remoteMenu
    ) {
      this.drawGuideArrow(screen, quest.target, playerPx, playerPy, camX, camY);
    }

    screen.ctx.restore();
    this.msg.draw(screen);

    if (this.encounterFlash > 0 && !this.state.reduceEffects) {
      const phase = Math.floor(this.encounterFlash * 12) % 2;
      if (phase === 0) {
        screen.dim(0.85);
      }
    }

    // Dissolvenza d'ingresso nella nuova mappa (più dolce dei cambi secchi).
    if (this.fadeT > 0) {
      screen.dim(this.fadeT / 0.35 * 0.9);
    }
    // Dissolvenza d'uscita prima del warp: oscura crescente fino al nero.
    if (this.fadeOut > 0) {
      screen.dim((1 - this.fadeOut / 0.22) * 0.95);
    }

    // Effetto di cura sopra tutto (velo verde, anelli, scintille, barre HP).
    if (this.healFx > 0) {
      this.drawHealOverlay(screen);
    }

    // Banner "evento" (traguardo, breaking news) sopra tutto.
    if (this.banner) {
      this.drawBanner(screen);
    }
  }

  private drawHealOverlay(screen: Screen): void {
    if (this.state.reduceEffects) return;
    const ctx = screen.ctx;
    const prog = this.healFx / 1.6; // 1 -> 0 mentre l'effetto svanisce
    const cx = VIEW_W / 2;
    const cy = this.viewHeight / 2 + 6;

    // 1) Velo verde che si accende e svanisce.
    ctx.fillStyle = `rgba(122,216,88,${0.26 * prog})`;
    ctx.fillRect(0, 0, VIEW_W, this.viewHeight);

    // 2) Anelli curativi che si stringono verso il centro.
    ctx.save();
    ctx.globalAlpha = 0.55 * prog;
    ctx.strokeStyle = "#9aff7a";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      const r = 8 + ((1 - prog) * 18 + i * 9) % 30;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 3) Scintille verdi/bianche che salgono.
    for (const s of this.healSparks) {
      const a = 1 - s.life / s.max;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    }
    ctx.globalAlpha = 1;

  }

  private drawBanner(screen: Screen): void {
    const b = this.banner;
    if (!b) {
      return;
    }
    // Flash schermo all'apparizione.
    if (this.bannerFlash > 0 && !this.state.reduceEffects) {
      const ctx = screen.ctx;
      ctx.fillStyle = `rgba(255,240,180,${0.5 * (this.bannerFlash / 0.4)})`;
      ctx.fillRect(0, 0, VIEW_W, this.viewHeight);
    }
  }
}

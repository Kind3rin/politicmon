import {beginWorldLabels,endWorldLabels} from "./worldLabels";
import { keepPlayerClear } from "./clearOfPlayer";
import { renderArena, leaveArena, type UiArena } from "./arena";
import { renderPlan, type UiPlan } from "./plan";
export type { UiPlan } from "./plan";
import {TYPE_COLORS,typeLabelColor,type PolType} from "../../data/poltypes";
import type { TouchAction, UiRow } from "../../engine/touchActions";
import type {Input} from "../../engine/input";
import {audio} from "../../engine/audio";
import { commandHint } from "../../engine/inputDevice";
import { enableRowDrag } from "./reorder";
import { haptics } from "../../engine/haptics";

export interface UiBlock {
  title: string;
  body?: string;
  facts?: readonly { label: string; value: string }[];
}
export interface UiWorld {
  saved?:boolean;
  location: string;
  notice?: string;
  messages?: readonly string[];
  facts: readonly {label:string;value:string}[];
  objective?: string;
  lesson?: {title:string;body:string;at?:"top"|"bottom";/** Called when the player closes the card: a tip that is gone for good. */dismiss?:()=>void};
  actions: readonly TouchAction[];
  context: TouchAction;
  run: TouchAction;
  /** The clock of the day's schedule, once it is open; tapping it opens the schedule. */
  clock?: TouchAction & {slot:string;text:string};
  /** The list of field powers, once there is one. */
  power?: TouchAction;
  save?: TouchAction;
  running: boolean;
}
export interface UiTextField {
  label: string;
  value: string;
  readOnly?: boolean;
  autofocus?: boolean;
  placeholder?: string;
  singleLine?: boolean;
  maxLength?: number;
  onSubmit?: () => void;
  onChange?: (value:string)=>void;
}
export interface UiTiming {
  label:string;
  progress:number;
  windowStart:number;
  windowEnd:number;
}
export interface UiAtlas {
  nodes: readonly { x: number; y: number; label: string; state: "here" | "open" | "locked" | "optional"; next?: boolean }[];
  links: readonly { from: number; to: number; dashed?: boolean }[];
}
export interface UiHero {
  src: string;
  title: string;
  level?: string;
  types?: readonly string[];
  bar?: { now: number; max: number; text: string; from?: number };
  stamp?: string;
  meta?: string;
  /** Keep the panel title above the hero (a receipt says what happened before who it happened to). */
  titled?: boolean;
}
export interface UiPanel {
  directInput?:boolean;
  conversation?: {speaker:string;portrait?:string};
  pause?: {money:number;polls:number;grid:boolean;fuel?:number};
  timing?:UiTiming;
  arena?: UiArena;
  title: string;
  subtitle?: string;
  image?: string;
  imageHeight?: number;
  positioned?: boolean;
  portrait?: {src:string;label:string};
  portraits?: readonly { src: string; label: string }[];
  blocks?: readonly UiBlock[];
  field?: UiTextField;
  /** Large sprite header: companion sheet, item sheet. */
  hero?: UiHero;
  /** Rows share the free height instead of scrolling. */
  fit?: boolean;
  /** Rows become large tiles side by side: a few candidates to choose among. */
  tiles?: boolean;
  /** Turns card-like actions (icon, hint, facts) into compact rows. */
  compact?: boolean;
  /** Full-bleed opening screen: art, logo, tagline and the choices at the bottom. */
  splash?: { art: string; tagline: string; sprites?: readonly string[]; compact?: boolean };
  /** Drawn map: actions[i] is the node i; positions are percentages. */
  atlas?: UiAtlas;
  /** Plan of the place you are in: tiles drawn from the map itself. */
  plan?: UiPlan;
  /** Labelled values drawn as bars. */
  stats?: readonly { label: string; value: number; max: number }[];
  /** Rows can be dragged to another place; `move(from, to)` receives action indices. */
  drag?: { move: (from: number, to: number) => void };
  tabs?: readonly TouchAction[];
  selectedTab?: number;
  actions: readonly TouchAction[];
  selected?: number;
  back?: TouchAction;
  primary?: number;
  columns?: 1 | 2;
}

/** A card-like action condensed to one row: icon, name, first sentence, the one value that matters. */
const STAMPED = /^(ko|indagat|scandal|gaff|raggiunt|sbloccat|completat)/i;
export function deriveRow(action: TouchAction): UiRow {
  const facts = action.facts ?? [];
  const fact = (pattern: RegExp) => facts.find(entry => pattern.test(entry.label));
  const number = fact(/^numero$/i), price = fact(/prezzo|costo|spesa/i), level = fact(/^livello$/i), hp = fact(/^pv$/i), types = fact(/^tipo$/i), state = fact(/^stato$/i);
  const numbers = hp?.value.match(/\d+/g)?.map(Number);
  const first = (action.hint ?? "").split(/(?<=[.!?])\s/)[0].replace(/\s+/g, " ");
  const kind = action.icon?.includes("/monsters/") ? "companion" : "item";
  const spare = facts.find(entry => entry !== number && entry !== price && entry !== level && entry !== hp && entry !== types && entry !== state && entry.value.length <= 12);
  return {
    kind, icon: action.icon, level: level ? `Lv${level.value}` : undefined,
    types: types?.value.split(" · ").filter(type => type in TYPE_COLORS),
    bar: numbers && numbers.length >= 2 ? { now: numbers[0], max: numbers[1], text: `${numbers[0]}/${numbers[1]}` } : undefined,
    right: price?.value ?? (number ? `n. ${number.value}` : kind === "item" ? spare?.value : undefined),
    meta: first || (state && !/^(forma|ok|disponibile)$/i.test(state.value) && !STAMPED.test(state.value) ? state.value : undefined),
    stamp: state && STAMPED.test(state.value) ? state.value : undefined
  };
}

/** Paragraph pages for the shared dialogue: wrap at words, keep up to three
 * lines, and never cut a long name in half. CSS supplies the final line wrap. */
export function dialoguePages(messages: readonly string[], width=36): string[][] {
  const pages: string[][] = [];
  for (const message of messages) {
    const lines: string[] = [];
    let line = "";
    for (const word of message.trim().split(/\s+/)) {
      if (!word) continue;
      if (line && `${line} ${word}`.length > width) { lines.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
  }
  return pages;
}

/** Paragraph breaks follow sentences before falling back to word pages for
 * long copy. Abbreviated titles stay attached to their names. */
function prosePages(text:string):string[] {
  const result:string[]=[];
  for(const paragraph of text.split(/\n\n+/)){
    const sentences:string[]=[];
    for(const fragment of paragraph.split(/(?<=[.!?])\s+(?=[A-ZÀÈÉÌÒÙ])/)){
      if(sentences.length&&/\b(?:Prof|Sig|Dott|On|Sen|Avv|ecc)\.$/i.test(sentences[sentences.length-1]))sentences[sentences.length-1]+=' '+fragment;
      else sentences.push(fragment);
    }
    for(const sentence of sentences){
      if(/^(?:Compagno|Scelta)\s+\d+\s+di\s+\d+\.?$/.test(sentence.trim()))continue;
      if(sentence.length<=84)result.push(sentence);
      else result.push(...dialoguePages([sentence],28).map(page=>page.join(' ')));
    }
  }
  return result;
}

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Shared native components. The game canvas keeps the pixel artwork only. */
export const kit = {
  header(title: string, subtitle?: string, portrait?:UiPanel["portrait"], close?:HTMLElement): HTMLElement {
    const header = element("header", "ui-header");
    if(portrait){const avatar=element("img","ui-avatar");avatar.src=portrait.src;avatar.alt=portrait.label;header.append(avatar);}
    const heading=element("h1", "ui-title", title);
    if(close){const row=element("div","ui-title-row");row.append(heading,close);header.append(row);}else header.append(heading);
    if (subtitle) for(const paragraph of prosePages(subtitle)) header.append(element("p", "ui-body", paragraph));
    return header;
  },
  tag(type:PolType):HTMLElement {
    const badge=element('span','ui-type');badge.style.background=TYPE_COLORS[type];badge.style.color=typeLabelColor(type);
    const icon=element('img','ui-type-icon');icon.src=`/sprites/ui/type_${type.toLowerCase()}.png`;icon.alt='';badge.append(icon,document.createTextNode(type));return badge;
  },
  facts(facts: NonNullable<UiBlock["facts"]>): HTMLElement {
    const list = element("dl", "ui-facts");
    for (const fact of facts) {
      const row = element("div", "ui-fact");
      if(facts.length===1||fact.value.length>18)row.classList.add("ui-fact-wide");
      const label=element("dt","ui-note"),value=element("dd","ui-value");
      if(fact.label in TYPE_COLORS)label.append(kit.tag(fact.label as PolType));else label.textContent=fact.label;
      const types=fact.value.split(' · ');
      if(types.every(type=>Object.hasOwn(TYPE_COLORS,type)))for(const type of types)value.append(kit.tag(type as PolType));else value.textContent=fact.value;
      row.append(label,value);
      list.append(row);
    }
    return list;
  },
  card(block: UiBlock): HTMLElement {
    const card = element("section", "ui-card");
    card.append(element("h2", "ui-subtitle", block.title));
    if (block.body) for (const paragraph of prosePages(block.body)) card.append(element("p", "ui-body", paragraph));
    if (block.facts) card.append(kit.facts(block.facts));
    return card;
  },
  bar(bar:{now:number;max:number;text:string;from?:number}):HTMLElement {
    const wrap=element("div","ui-meter");
    const track=element("div","ui-bar");track.setAttribute("role","progressbar");
    track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax",String(bar.max));track.setAttribute("aria-valuenow",String(bar.now));
    const fill=element("div","ui-bar-fill");const ratio=bar.max>0?Math.max(0,Math.min(1,bar.now/bar.max)):0;
    const colour=(value:number)=>value<.25?"#D7263D":value<.5?"#FFD23F":"#1B998B";
    fill.style.width=`${ratio*100}%`;fill.style.background=colour(ratio);
    // A reward fills from where the bar stood before: the gain is seen, not read.
    if(bar.from!==undefined&&bar.max>0&&bar.from<bar.now&&!document.body.classList.contains('ui-reduce-effects')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const start=Math.max(0,Math.min(1,bar.from/bar.max));fill.style.width=`${start*100}%`;fill.style.background=colour(start);
      setTimeout(()=>{fill.style.transition="width .85s cubic-bezier(.2,.8,.2,1)";fill.style.width=`${ratio*100}%`;fill.style.background=colour(ratio);},220);
    }
    track.append(fill);wrap.append(track,element("span","ui-meter-text",bar.text));return wrap;
  },
  types(types:readonly string[]):HTMLElement {
    const list=element("span","ui-glyphs");
    for(const type of types){
      const glyph=element("span","ui-glyph");glyph.title=type;glyph.setAttribute("role","img");glyph.setAttribute("aria-label",type);
      if(type in TYPE_COLORS)glyph.style.background=TYPE_COLORS[type as PolType];
      const icon=element("img","");icon.src=`/sprites/ui/type_${type.toLowerCase()}.png`;icon.alt="";glyph.append(icon);list.append(glyph);
    }
    return list;
  },
  hero(hero:UiHero):HTMLElement {
    const box=element("section","ui-hero-card");if(hero.titled)box.classList.add("ui-hero-titled");
    const art=element("div","ui-hero-art");const image=element("img","");image.src=hero.src;image.alt="";art.append(image);
    const text=element("div","ui-hero-text");text.append(element("h2","ui-hero-name",hero.title));
    if(hero.level)text.append(element("span","ui-hero-level",hero.level));
    if(hero.types?.length)text.append(kit.types(hero.types));
    if(hero.bar)text.append(kit.bar(hero.bar));
    if(hero.meta)text.append(element("span","ui-note",hero.meta));
    box.append(art,text);
    if(hero.stamp)box.append(element("span","ui-stamp",hero.stamp));
    return box;
  },
  row(action:TouchAction, run:()=>void):HTMLButtonElement {
    const row=action.row as UiRow;
    const button=element("button","ui-row");button.type="button";
    button.classList.add(`ui-row-${row.kind??"companion"}`);
    if(row.tone&&row.tone in TYPE_COLORS){button.style.setProperty("--tone",TYPE_COLORS[row.tone as PolType]);button.style.setProperty("--tone-ink",typeLabelColor(row.tone as PolType));}
    if(row.stamp)button.classList.add("ui-row-stamped");
    button.disabled=Boolean(action.disabled&&!action.onInspect);
    if(action.disabled)button.setAttribute("aria-disabled","true");
    button.setAttribute("aria-label",[action.label,row.level,row.bar?.text,row.right,row.meta,row.stamp,action.hint,...(action.facts?.map(f=>`${f.label}: ${f.value}`)??[])].filter(Boolean).join(". "));
    if(row.star){const star=element("span","ui-row-star","★");star.setAttribute("aria-hidden","true");button.append(star);}
    if(row.held){button.classList.add("ui-row-held");button.setAttribute("aria-pressed","true");}
    if(row.slot){const slot=element("span","ui-row-slot",row.slot);slot.setAttribute("aria-hidden","true");button.append(slot);}
    if(row.icon){const art=element("span","ui-row-art");const image=element("img","");image.src=row.icon;image.alt="";art.append(image);button.append(art);}
    const main=element("span","ui-row-main");
    const head=element("span","ui-row-head");head.append(element("strong","ui-row-name",action.label));
    if(row.level)head.append(element("span","ui-row-level",row.level));
    main.append(head);
    if(row.bar)main.append(kit.bar(row.bar));
    if(row.meta)main.append(element("span","ui-row-meta",row.meta));
    button.append(main);
    if(row.types?.length)button.append(kit.types(row.types));
    if(row.right||row.arrow){const side=element("span","ui-row-side");if(row.right)side.append(element("span","ui-row-right",row.right));if(row.arrow)side.append(element("span","ui-row-arrow",row.arrow==="up"?"▲":"▼"));button.append(side);}
    if(row.stamp)button.append(element("span","ui-stamp",row.stamp));
    let holdTimer:ReturnType<typeof setTimeout>|undefined,inspected=false,downX=0,downY=0;
    const cancelHold=()=>{if(holdTimer)clearTimeout(holdTimer);holdTimer=undefined;};
    if(action.onInspect){
      button.addEventListener("contextmenu",event=>event.preventDefault());
      button.addEventListener("pointerdown",event=>{cancelHold();inspected=false;downX=event.clientX;downY=event.clientY;holdTimer=setTimeout(()=>{inspected=true;haptics.tap();action.onInspect?.();},450);});
      button.addEventListener("pointermove",event=>{if(Math.hypot(event.clientX-downX,event.clientY-downY)>10)cancelHold();});
      for(const type of ["pointerup","pointercancel","pointerleave"])button.addEventListener(type,cancelHold);
    }
    button.onclick=()=>{cancelHold();if(inspected){inspected=false;return;}if(!button.disabled&&!action.disabled){haptics.tap();run();button.closest<HTMLElement>("#game-ui")?.focus({preventScroll:true});}};
    return button;
  },
  button(action: TouchAction, run: () => void, primary = false, isDisabled = () => Boolean(action.disabled)): HTMLButtonElement {
    const button = element("button", primary ? "ui-button ui-primary" : "ui-button");
    if (action.route) button.classList.add(`ui-route-${action.route}`);
    button.type = "button";
    button.disabled = Boolean(action.disabled && !action.onInspect);
    if(action.disabled)button.setAttribute("aria-disabled","true");
    if(action.pressed!==undefined)button.setAttribute("aria-pressed",String(action.pressed));
    const heading = element("span", "ui-button-heading");
    if (action.icon) {
      const icon = element("img", "ui-button-icon");
      icon.src = action.icon;
      icon.alt = "";
      heading.append(icon);
    }
    heading.append(element("strong", "ui-subtitle", action.label));
    const command = action.label === "Indietro" ? "b" : action.command ?? "a";
    const key = element("kbd", "ui-command-key", commandHint(command));
    key.dataset.commandHint = command; key.setAttribute("aria-hidden", "true");
    if (command === "b" || command === "start") key.classList.add("ui-command-fixed");
    const keys = element("span", "ui-command-group"); keys.append(key); heading.append(keys);
    if (action.onInspect) {
      const detail = element("kbd", "ui-command-key ui-inspect-key", commandHint("inspect"));
      detail.setAttribute("aria-hidden", "true"); detail.dataset.commandHint = "inspect"; detail.title = "Dettaglio della mossa"; keys.append(detail);
    }
    if(action.order)heading.append(element("span","ui-note ui-order",action.order==="AGISCI PRIMA"?"Agisci prima":action.order==="AGISCI DOPO"?"Agisci dopo":"Parità: 50%"));
    button.append(heading);
    if (action.hint) for(const paragraph of prosePages(action.hint)) button.append(element("span", "ui-body", paragraph));
    if (action.facts) button.append(kit.facts(action.facts));
    let holdTimer:ReturnType<typeof setTimeout>|undefined, inspected=false, downX=0, downY=0;
    const cancelHold=()=>{if(holdTimer)clearTimeout(holdTimer);holdTimer=undefined;};
    if(action.onInspect){
      button.addEventListener('contextmenu',event=>event.preventDefault());
      button.addEventListener('pointerdown',event=>{cancelHold();inspected=false;downX=event.clientX;downY=event.clientY;holdTimer=setTimeout(()=>{inspected=true;haptics.tap();action.onInspect?.();},450);});
      button.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-downX,event.clientY-downY)>10)cancelHold();});
      button.addEventListener('pointerup',cancelHold);button.addEventListener('pointercancel',cancelHold);button.addEventListener('pointerleave',cancelHold);
    }
    button.onclick = () => {
      cancelHold();if(inspected){inspected=false;return;}
      if (!button.disabled && !isDisabled()) {
        haptics.tap(); run();
        button.closest<HTMLElement>("#game-ui, #game-dialog, #world-ui, .ui-world-hud")?.focus({ preventScroll: true });
      }
    };
    return button;
  }
};

let root: HTMLElement | undefined;
let signature = "";
let scrollIdentity = "";
let panelGeneration = 0;
let current: UiPanel | undefined;
let navigationKey="";
let navigationIndex=-1;
let scrollSelection=false;
let dialog: HTMLElement | undefined;
let dialogSeen = false;
let continueDialog: (() => void) | undefined;

export function beginUiFrame(): void { dialogSeen = false; beginWorldLabels(); }
export function endUiFrame(): void {
  endWorldLabels();
  keepPlayerClear();
  if (dialog && !dialogSeen) dialog.hidden = true;
  document.body.classList.toggle("ui-dialog-open", dialogSeen);
}

/** A crisp text layer above pixel artwork; the continue button stays mounted
 * while text is revealing, so a finger press cannot lose its click target. */
export function renderUiDialog(text: string, advance: () => void, complete: boolean, speaker = "Politicmon", portrait?:string, fullText=text): void {
  if (typeof document === "undefined") return;
  const stage = document.querySelector("#screen-stage");
  if (!stage) return;
  dialogSeen = true;
  continueDialog = advance;
  if (!dialog) {
    dialog = element("section", "ui-dialog");
    dialog.id = "game-dialog";
    dialog.tabIndex = -1;
    dialog.setAttribute("aria-label", "Dialogo");
    const picture=element("img","ui-dialog-portrait");picture.alt="";
    const body=element("p","ui-dialog-text");body.setAttribute("aria-hidden","true");
    const announcement=element("p","ui-sr-only");announcement.setAttribute("role","status");announcement.setAttribute("aria-live","polite");
    const next=element("button","ui-dialog-next");next.type="button";next.textContent="▸";
    next.addEventListener("click",()=>{continueDialog?.();dialog?.focus({preventScroll:true});});
    // The whole box is the target: a 44px arrow in the corner is a bad thing to hunt for on every line.
    dialog.addEventListener("click",event=>{if(!(event.target as Element).closest(".ui-dialog-next")){continueDialog?.();dialog?.focus({preventScroll:true});}});
    dialog.append(element("h2", "ui-dialog-speaker"),picture,body,announcement,next);
    stage.append(dialog);
  }
  dialog.hidden = false;
  dialog.querySelector("h2")!.textContent = speaker;
  dialog.querySelector(".ui-dialog-text")!.textContent = text;
  const announcement=dialog.querySelector(".ui-sr-only")!;
  if(announcement.textContent!==fullText)announcement.textContent=fullText;
  const picture=dialog.querySelector("img")!;picture.hidden=!portrait;
  if(portrait&&picture.getAttribute("src")!==portrait)picture.src=portrait;
  dialog.classList.toggle("has-portrait",Boolean(portrait));
  dialog.classList.toggle("has-bust",Boolean(portrait?.includes("/portraits/")));
  dialog.querySelector("button")!.setAttribute("aria-label",complete?"Continua":"Mostra tutto");
}

/** One keyboard/controller contract for every native panel. Scene updates still
 * run for timers; consumed navigation never reaches the legacy menu beneath. */
export function updateUiInput(panel:UiPanel|undefined,input:Input):void {
  const sheet=document.querySelector<HTMLDialogElement>('#tribuna-sheet[open]');
  if(sheet){
    if(input.wasPressed('b')||input.wasPressed('start'))sheet.close();
    else if(input.wasPressed('a'))(document.activeElement as HTMLButtonElement)?.click?.();
    else if(input.wasPressed('down')||input.wasPressed('up')||input.wasPressed('left')||input.wasPressed('right')){
      const buttons=[...sheet.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
      const direction=input.wasPressed('up')||input.wasPressed('left')?-1:1;
      buttons[(index+direction+buttons.length)%buttons.length]?.focus();
    }
    input.reset();return;
  }
  if(!panel||panel.directInput){navigationKey='';navigationIndex=-1;return;}
  const key=JSON.stringify([panel.title,panel.subtitle,panel.tabs?.map(action=>[action.label,action.disabled]),panel.actions.map(action=>[action.label,action.disabled]),panel.back?.label]);
  const tabCount=panel.tabs?.length??0;
  const entries=[...(panel.tabs??[]),...panel.actions,...(panel.back?[panel.back]:[])];
  if(key!==navigationKey){navigationKey=key;navigationIndex=(panel.selected??panel.primary??0)+tabCount;if(!entries[navigationIndex]||entries[navigationIndex].disabled){const activeTab=panel.selectedTab;navigationIndex=activeTab!==undefined&&activeTab<tabCount&&!entries[activeTab]?.disabled?activeTab:entries.findIndex(action=>!action.disabled);}}
  const reading=Boolean(panel.blocks?.length)&&panel.actions.every((_,index)=>index===panel.primary);
  if(reading&&(input.wasPressed('down')||input.wasPressed('up'))){
    const content=root?.querySelector<HTMLElement>('.ui-content,.ui-pause-content');
    if(content)content.scrollBy({top:(input.wasPressed('down')?1:-1)*Math.max(80,Math.floor(content.clientHeight*.65)),behavior:'instant'});
    input.reset();return;
  }
  const focused=document.activeElement instanceof HTMLElement&&root?.contains(document.activeElement)?document.activeElement.closest<HTMLElement>('[data-ui-index]'):null;
  const focusedIndex=focused?Number(focused.dataset.uiIndex):-1;
  const commandIndex=Number.isInteger(focusedIndex)&&entries[focusedIndex]?focusedIndex:navigationIndex;
  const stride=panel.pause?.grid?3:1;
  const delta=input.wasPressed('down')?stride:input.wasPressed('up')?-stride:input.wasPressed('right')?1:input.wasPressed('left')?-1:0;
  if(delta&&entries.length){
    const count=panel.pause?.grid?panel.actions.length:entries.length;
    navigationIndex=(commandIndex+delta+count)%count;
    for(let i=0;i<count&&entries[navigationIndex].disabled;i++)navigationIndex=(navigationIndex+Math.sign(delta)+count)%count;
    audio.cursor();scrollSelection=true;input.reset();
  }else if(input.wasPressed('b')||input.wasPressed('start')){
    input.reset();if(panel.back&&!panel.back.disabled){audio.cancel();panel.back.run();}
  }else if(input.wasPressed('inspect')){
    const action=entries[commandIndex];input.reset();if(action?.onInspect)action.onInspect();
  }else if(input.wasPressed('a')){
    const action=entries[commandIndex];input.reset();if(action&&!action.disabled)action.run();
  }
}

/** Reconcile visible content only; callbacks refresh without rebuilding each frame. */
export function renderUiPanel(panel?: UiPanel): boolean {
  const enteringPause=Boolean(panel?.pause)&&!current?.pause;
  current = panel;
  document.body.classList.toggle("ui-arena-open",Boolean(panel?.arena));
  document.body.classList.toggle("ui-conversation-open",Boolean(panel?.conversation));
  document.body.classList.toggle("ui-pause-open",Boolean(panel?.pause));
  document.body.classList.toggle("ui-splash-open",Boolean(panel?.splash));
  if(!panel?.arena)leaveArena(root);
  document.body.classList.toggle("ui-panel-open", Boolean(panel));
  if (!panel) {
    if (root) root.hidden = true;
    signature = "";scrollIdentity="";
    return false;
  }
  if (!root) {
    root = element("section", "ui-panel");
    root.id = "game-ui";
    root.tabIndex = -1;
    root.setAttribute("aria-label", "Menu di gioco");
    document.querySelector("#screen-stage")?.append(root);
  }
  root.hidden = false;
  root.setAttribute("aria-label",panel.title);
  root.setAttribute("role",panel.pause?"dialog":"region");
  if(panel.pause)root.setAttribute("aria-modal","true");else root.removeAttribute("aria-modal");
  if(panel.arena){signature="";renderArena(root,panel,navigationIndex<0?(panel.selected??0):navigationIndex);return true;}
  const tabCount=panel.tabs?.length??0;
  const displayedIndex=navigationIndex<0?(panel.selected??0)+tabCount:navigationIndex;
  const next = JSON.stringify({...panel,timing:panel.timing?{...panel.timing,progress:0}:undefined,field:panel.field?{...panel.field,value:panel.field.readOnly?panel.field.value:""}:undefined,selected:displayedIndex}, (_key, value) => typeof value === "function" ? undefined : value);
  if (next === signature) {if(panel.timing)updateTiming(root,panel.timing);return true;}
  signature = next;
  if(!panel.splash&&root.classList.contains('ui-splash'))root.className='ui-panel';
  root.classList.toggle('ui-conversation',Boolean(panel.conversation));
  root.classList.toggle('ui-pause',Boolean(panel.pause));
  root.onclick=panel.pause?event=>{if(event.target===root)current?.back?.run();}:null;
  if(panel.conversation){
    const choices=element('div','ui-dialog-choices');
    panel.actions.forEach((action,i)=>{const button=kit.button(action,()=>current?.actions[i]?.run());button.dataset.uiIndex=String(i);button.setAttribute('aria-current',String(i===displayedIndex));choices.append(button);});
    const box=element('section','ui-dialog');
    box.append(element('h2','ui-dialog-speaker',panel.conversation.speaker));
    if(panel.conversation.portrait){const image=element('img','ui-dialog-portrait');image.src=panel.conversation.portrait;image.alt='';box.append(image);box.classList.add('has-portrait');if(panel.conversation.portrait.includes('/portraits/'))box.classList.add('has-bust');}
    box.append(element('p','ui-dialog-text',panel.subtitle??panel.title));
    if(panel.back){const close=element('button','ui-dialog-next','×');close.type='button';close.dataset.uiIndex=String(panel.actions.length);close.setAttribute('aria-label','Chiudi dialogo');close.onclick=()=>current?.back?.run();box.append(close);}
    root.replaceChildren(choices,box);return true;
  }
  if(panel.pause){
    const oldScroll=root.querySelector('.ui-pause-content')?.scrollTop??0;
    const sheet=element('section','ui-pause-sheet');
    const header=element('header','ui-pause-header');header.append(element('h1','ui-pause-title',panel.title));
    const close=element('button','ui-pause-close','×');close.type='button';close.dataset.uiIndex=String(panel.actions.length);close.setAttribute('aria-label',panel.pause.grid?'Torna al gioco':'Indietro');close.onclick=()=>current?.back?.run();header.append(close);
    const strip=element('div','ui-pause-stats');
    for(const [icon,label,value] of [['€','Fondi',panel.pause.money.toLocaleString('it-IT')],...(panel.pause.fuel!==undefined?[['⛽','Carburante',`${panel.pause.fuel} L`]]:[]),['↗','Sondaggi',`${panel.pause.polls}%`]]){
      const stat=element('span','');stat.setAttribute('aria-label',`${label}: ${value}`);const mark=element('b','',icon);mark.setAttribute('aria-hidden','true');stat.append(mark,element('span','',value));strip.append(stat);
    }
    const content=element('div','ui-pause-content');content.classList.toggle('ui-pause-grid',panel.pause.grid);
    if(!panel.pause.grid)for(const block of panel.blocks??[]){const section=element('section','ui-pause-summary');section.append(element('h2','',block.title));if(block.body)section.append(element('p','',block.body));if(block.facts)section.append(element('p','',block.facts.map(f=>`${f.label}: ${f.value}`).join(' · ')));content.append(section);}
    let group='';
    panel.actions.forEach((action,i)=>{
      if(!panel.pause!.grid&&action.group&&action.group!==group){group=action.group;content.append(element('h2','ui-pause-group',group));}
      const button=element('button','ui-pause-entry');button.type='button';button.dataset.uiIndex=String(i);button.disabled=Boolean(action.disabled);
      button.setAttribute('aria-current',String(i===displayedIndex));button.setAttribute('aria-label',[action.label,action.hint,...(action.facts?.map(f=>`${f.label}: ${f.value}`)??[])].filter(Boolean).join('. '));
      if(action.icon){const image=element('img','');image.src=action.icon;image.alt='';button.append(image);}
      button.append(element('strong','',action.label));
      if(!panel.pause!.grid&&action.facts?.length){const value=element('span','ui-pause-value');for(const fact of action.facts)value.append(element('span','ui-pause-fact',action.facts.length>1?`${fact.label} ${fact.value}`:fact.value));button.append(value);}
      button.onclick=()=>{if(!current?.actions[i]?.disabled){current?.actions[i]?.run();root?.focus({preventScroll:true});}};
      content.append(button);
    });
    sheet.append(header,strip,content);root.replaceChildren(sheet);content.scrollTop=oldScroll;
    if(enteringPause){root.focus({preventScroll:true});if(!document.body.classList.contains('ui-reduce-effects')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)sheet.animate([{transform:'translateY(24px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:160,easing:'ease-out'});}
    if(scrollSelection){content.querySelector('[aria-current=true]')?.scrollIntoView({block:'nearest'});scrollSelection=false;}
    return true;
  }
  if(panel.splash){
    signature=next;
    root.className="ui-panel ui-splash";
    const art=element("div","ui-splash-art");art.style.backgroundImage=`url(${panel.splash.art})`;
    const logo=element("h1","ui-splash-logo",panel.title);
    const tape=element("p","ui-splash-tape",panel.splash.tagline);
    const cast=element("div","ui-splash-cast");
    for(const src of panel.splash.sprites??[]){const image=element("img","");image.src=src;image.alt="";cast.append(image);}
    const choices=element("nav","ui-splash-actions");choices.setAttribute("aria-label",panel.title);
    const more=element("div",`ui-splash-more${panel.splash.compact?" ui-splash-compact":""}`);
    panel.actions.forEach((action,i)=>{
      const button=kit.button(action,()=>{if(!current?.actions[i]?.disabled)current?.actions[i]?.run();},i===panel.primary);
      button.dataset.uiIndex=String(i);if(i===displayedIndex)button.setAttribute("aria-current","true");(i===panel.primary?choices:more).append(button);
    });
    choices.append(more);
    if(panel.back){const button=kit.button(panel.back,()=>current?.back?.run());button.dataset.uiIndex=String(panel.actions.length);if(displayedIndex===panel.actions.length)button.setAttribute("aria-current","true");choices.append(button);}
    root.replaceChildren(art,logo,tape,cast,choices);
    return true;
  }
  const scrollKey=JSON.stringify([panel.title,panel.selectedTab,panel.actions.map(action=>action.label),panel.field?.label]);
  const retainedScroll=scrollIdentity===scrollKey?root.querySelector<HTMLElement>('.ui-content')?.scrollTop:undefined;
  scrollIdentity=scrollKey;
  const editing=root.querySelector<HTMLInputElement|HTMLTextAreaElement>('.ui-field input, .ui-field textarea');
  const retainedField=editing&&panel.field&&!panel.field.readOnly&&!editing.readOnly
    &&editing.tagName===(panel.field.singleLine?'INPUT':'TEXTAREA')
    &&root.querySelector('.ui-title')?.textContent===panel.title
    &&editing.closest('.ui-field')?.querySelector('.ui-subtitle')?.textContent===panel.field.label
    ?editing.closest<HTMLElement>('.ui-field'):undefined;
  const fieldFocused=Boolean(editing&&document.activeElement===editing);
  const selection=fieldFocused&&editing?[editing.selectionStart,editing.selectionEnd] as const:undefined;
  const generation=++panelGeneration;
  const live=()=>generation===panelGeneration;
  const body = element("div", "ui-content");
  if(panel.primary===0&&panel.actions.length===1&&panel.blocks?.length&&!panel.tabs&&!panel.hero)body.classList.add("ui-receipt");
  if (panel.tabs?.length) {
    const tabs=element("nav","ui-tabs");
    tabs.setAttribute("aria-label",`${panel.title}: sezioni`);
    panel.tabs.forEach((action,i)=>{
      const button=kit.button(action,()=>{if(live()&&!current?.tabs?.[i]?.disabled)current?.tabs?.[i]?.run();});
      button.dataset.uiIndex=String(i);
      if(i===panel.selectedTab)button.classList.add("ui-tab-selected");
      if(i===displayedIndex)button.setAttribute("aria-current","true");
      tabs.append(button);
    });
    body.append(tabs);
  }
  if (panel.image||panel.portraits?.length) {
    const artwork = element("div", "ui-artwork");
    if(panel.image){
    const image = element("img", "ui-hero");
    image.src = panel.image;
    if(panel.imageHeight)image.style.maxHeight=`${Math.max(32,Math.min(160,panel.imageHeight))}px`;
    image.alt = "";
    artwork.append(image);
    }
    if (panel.portraits) {
      const portraits = element("div", "ui-portraits");
      for (const portrait of panel.portraits) {
        const sprite = element("img", "ui-portrait");
        sprite.src = portrait.src;
        sprite.alt = portrait.label;
        portraits.append(sprite);
      }
      artwork.append(portraits);
    }
    body.append(artwork);
  }
  if(panel.timing){
    const timing=element('section','ui-card ui-timing');
    timing.append(element('h2','ui-subtitle',panel.timing.label));
    const track=element('div','ui-timing-track');track.setAttribute('role','progressbar');track.setAttribute('aria-label',panel.timing.label);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
    track.append(element('span','ui-timing-window'),element('span','ui-timing-cursor'));timing.append(track);body.append(timing);
  }
  if(panel.stats){
    const box=element("section","ui-stats");
    for(const stat of panel.stats){
      const row=element("div","ui-stat");row.append(element("span","",stat.label));
      const track=element("div","ui-bar");const fill=element("div","ui-bar-fill");fill.style.width=`${Math.min(100,stat.value/stat.max*100)}%`;track.append(fill);
      row.append(track,element("b","",String(stat.value)));box.append(row);
    }
    body.append(box);
  }
  for (const block of panel.blocks ?? []) body.append(kit.card(block));
  let fieldMarker:HTMLElement|undefined;
  if(panel.field){
    const field=element("label","ui-field ui-card");
    field.append(element("span","ui-subtitle",panel.field.label));
    const textarea=retainedField&&editing?editing:panel.field.singleLine?element("input","ui-body"):element("textarea","ui-body");
    if(textarea instanceof HTMLInputElement)textarea.type="text";
    if(panel.field.maxLength!==undefined)textarea.maxLength=panel.field.maxLength;
    if(textarea.value!==panel.field.value)textarea.value=panel.field.value;textarea.readOnly=Boolean(panel.field.readOnly);
    textarea.placeholder=panel.field.placeholder??"";textarea.spellcheck=false;textarea.autocapitalize="off";textarea.setAttribute("autocomplete","off");
    textarea.oninput=()=>{if(live())current?.field?.onChange?.(textarea.value);};
    textarea.onkeydown=event=>{if(event.key==="Enter"&&panel.field?.singleLine){event.preventDefault();event.stopPropagation();if(live())current?.field?.onSubmit?.();}else if(event.key==="Escape"){event.preventDefault();event.stopPropagation();if(live())current?.back?.run();}};
    if(!retainedField)field.append(textarea);
    fieldMarker=field;body.append(field);
  }
  if(panel.atlas){
    const atlas=element("div","ui-atlas");atlas.setAttribute("aria-label",panel.title);
    const NS="http://www.w3.org/2000/svg";
    // Two drawings of the same map: upright (the stops follow the country) and on its side (three lanes, names to the right of the pins, so that nothing covers anything in a short, wide box).
    const lane=[3,34,65],count=panel.atlas.nodes.length;
    const wide=(i:number)=>({x:lane[i%3],y:count>1?90-i*74/(count-1):50});
    const draw=(className:string,at:(i:number)=>{x:number;y:number})=>{
      const svg=document.createElementNS(NS,"svg");svg.setAttribute("viewBox","0 0 100 100");svg.setAttribute("preserveAspectRatio","none");svg.setAttribute("aria-hidden","true");svg.classList.add("ui-atlas-lines",className);
      for(const link of panel.atlas!.links){
        const a=panel.atlas!.nodes[link.from],b=panel.atlas!.nodes[link.to];if(!a||!b)continue;
        const from=at(link.from),to=at(link.to);
        const line=document.createElementNS(NS,"line");line.setAttribute("x1",String(from.x));line.setAttribute("y1",String(from.y));line.setAttribute("x2",String(to.x));line.setAttribute("y2",String(to.y));
        if(link.dashed)line.setAttribute("class","ui-dashed");svg.append(line);
      }
      atlas.append(svg);
    };
    draw("ui-atlas-upright",i=>panel.atlas!.nodes[i]);draw("ui-atlas-sideways",wide);
    panel.atlas.nodes.forEach((node,i)=>{
      const button=element("button",`ui-atlas-node ui-atlas-${node.state}`);button.type="button";button.style.setProperty("--x",`${node.x}%`);button.style.setProperty("--y",`${node.y}%`);button.style.setProperty("--wx",`${wide(i).x}%`);button.style.setProperty("--wy",`${wide(i).y}%`);
      button.dataset.uiIndex=String(i+tabCount);
      button.setAttribute("aria-label",[panel.actions[i]?.label,node.state==="here"?"Sei qui":node.state==="locked"?"Da sbloccare":node.state==="optional"?"Deviazione":"",node.next?"Prossima tappa":""].filter(Boolean).join(". "));
      if(i+tabCount===displayedIndex)button.setAttribute("aria-current","true");
      button.append(element("span","ui-atlas-pin"));
      const label=element("span","ui-atlas-label",node.state==="locked"?"???":panel.actions[i]?.label??"");button.append(label);
      if(node.state==="here")button.append(element("span","ui-atlas-tag","Sei qui"));
      else if(node.next)button.append(element("span","ui-atlas-tag ui-atlas-next","Prossima"));
      button.onclick=()=>{if(live()&&!current?.actions[i]?.disabled){haptics.tap();current?.actions[i]?.run();}};
      atlas.append(button);
    });
    body.append(atlas);
  }
  if(panel.plan)body.append(renderPlan(panel.plan,panel.title));
  const list = element("nav", "ui-actions");
  if(panel.atlas)list.hidden=true;
  if (panel.columns === 2) list.classList.add("ui-grid");
  if (panel.actions.some(action=>action.route)) list.classList.add("ui-route");
  list.setAttribute("aria-label", panel.title);
  if(panel.compact||panel.actions.some(action=>action.row)){list.classList.add("ui-rows");if(panel.fit)list.classList.add("ui-fit");if(panel.tiles)list.classList.add("ui-tiles");}
  let group="";
  panel.actions.forEach((action, i) => {
    if(i===panel.primary)return;
    if(action.group&&action.group!==group){
      group=action.group;list.append(element("h2","ui-subtitle",group));
      if(action.groupHint)for(const paragraph of prosePages(action.groupHint))list.append(element("p","ui-body",paragraph));
      if(action.groupFacts)list.append(kit.facts(action.groupFacts));
    }
    const shown = !action.row&&panel.compact&&i!==panel.primary ? {...action,row:deriveRow(action)} : action;
    const button = shown.row?kit.row(shown,()=>{if(live()&&!current?.actions[i]?.disabled)current?.actions[i]?.run();})
      :kit.button(action, () => { if (live()&&!current?.actions[i]?.disabled) current?.actions[i]?.run(); }, i === panel.primary);
    button.dataset.uiIndex=String(i+tabCount);
    if (i+tabCount === displayedIndex) button.setAttribute("aria-current", "true");
    list.append(button);
  });
  body.append(list);
  if(panel.drag){
    const rows=[...list.querySelectorAll<HTMLElement>(":scope > .ui-row")];
    enableRowDrag(list,rows,(from,to)=>{if(live())current?.drag?.move(from,to);});
  }
  const footer = element("footer", "ui-footer");
  if(panel.primary!==undefined&&panel.actions[panel.primary]){
    const index=panel.primary;
    const button=kit.button(panel.actions[index],()=>{if(live()&&!current?.actions[index]?.disabled)current?.actions[index]?.run();},true);
    button.dataset.uiIndex=String(index+tabCount);
    if(index+tabCount===displayedIndex)button.setAttribute("aria-current","true");
    footer.append(button);
  }
  let closeButton:HTMLButtonElement|undefined;
  if (panel.back) {const button=element("button","ui-close","✕");button.type="button";button.setAttribute("aria-label",panel.back.label==="Indietro"?"Indietro":panel.back.label);button.onclick=()=>{if(live()){haptics.tap();current?.back?.run();}};closeButton=button;button.dataset.uiIndex=String(panel.actions.length+tabCount);if(displayedIndex===panel.actions.length+tabCount)button.setAttribute("aria-current","true");}
  footer.hidden=footer.childElementCount===0;
  const header=kit.header(panel.title,panel.subtitle,panel.portrait,closeButton);
  if(panel.hero)header.append(kit.hero(panel.hero));
  const mountedBody=root.querySelector<HTMLElement>('.ui-content');
  if(retainedField&&fieldMarker&&mountedBody){
    // The editable node stays connected, preserving focus, caret and IME.
    for(const child of [...mountedBody.children])if(child!==retainedField)child.remove();
    let after=false;
    for(const child of [...body.children]){
      if(child===fieldMarker){after=true;continue;}
      if(after)mountedBody.append(child);else mountedBody.insertBefore(child,retainedField);
    }
    root.querySelector('.ui-header')?.replaceWith(header);
    root.querySelector('.ui-footer')?.replaceWith(footer);
  }else root.replaceChildren(header,body,footer);
  if(retainedScroll!==undefined)root.querySelector<HTMLElement>('.ui-content')!.scrollTop=retainedScroll;
  if(panel.timing)updateTiming(root,panel.timing);
  if(panel.field&&(panel.field.autofocus||fieldFocused)){
    const textarea=root.querySelector<HTMLInputElement|HTMLTextAreaElement>('.ui-field input, .ui-field textarea');
    textarea?.focus({preventScroll:true});
    if(panel.field.readOnly)textarea?.select();
    else if(selection&&textarea)textarea.setSelectionRange(selection[0]??0,selection[1]??0);
  }
  if(scrollSelection){root.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({block:"nearest"});scrollSelection=false;}
  return true;
}


let feedbackRoot: HTMLElement | undefined;
let feedbackSignature = "";
/** Brief world receipts use the same typography and facts as every menu. */
export function renderUiFeedback(blocks?: readonly UiBlock[]): void {
  document.body.classList.toggle("ui-feedback-open", Boolean(blocks?.length));
  if (!blocks?.length) { if (feedbackRoot) feedbackRoot.hidden = true; feedbackSignature = ""; return; }
  if (!feedbackRoot) {
    feedbackRoot = element("aside", "ui-feedback");
    feedbackRoot.setAttribute("aria-label", "Avviso di gioco");
    feedbackRoot.setAttribute("role", "status");
    feedbackRoot.setAttribute("aria-live", "polite");
    document.querySelector("#screen-stage")?.append(feedbackRoot);
  }
  feedbackRoot.hidden = false;
  const next = JSON.stringify(blocks);
  if (next === feedbackSignature) return;
  feedbackSignature = next;
  feedbackRoot.replaceChildren(...blocks.map(block => kit.card(block)));
}

let worldRoot: HTMLElement | undefined;
let worldHud: HTMLElement | undefined;
let worldHudSignature = "";
let worldSignature = "";
let worldContext: HTMLButtonElement | undefined;
let worldRun: HTMLButtonElement | undefined;
let worldCurrent: UiWorld | undefined;
/** A coach card is closed for the session once the player dismisses it. */
let lessonDismissed = "";
/** Four small pictures for the four slots: sunrise, sun, sunset, moon. */
const SLOT_ICONS: Record<string,string>={
  mattina:'<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 5v4M5 10l2 2M19 10l-2 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/>',
  giorno:'<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/>',
  sera:'<path d="M3 19h18M6 19a6 6 0 0 1 12 0M12 8v3M4 13l2 1M20 13l-2 1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/><path d="M7 9h10" stroke="currentColor" stroke-width="2.4"/>',
  notte:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor"/>'
};
/** World commands share the panel buttons, while leaving the map interactive. */
export function renderUiWorld(world?: UiWorld, pending = false): void {
  worldCurrent = world;
  document.body.classList.toggle("ui-world-open", Boolean(world) || pending);
  document.body.classList.toggle("ui-world-pending", pending);
  if (!world) { if (worldRoot) worldRoot.hidden = true; if(worldHud)worldHud.hidden=true; worldSignature = ""; return; }
  const host = document.querySelector("#touch-ui");
  if (!host) return;
  if (!worldRoot) {
    worldRoot = element("section", "ui-world"); worldRoot.id = "world-ui"; worldRoot.tabIndex = -1;
    worldRoot.setAttribute("aria-label", "Esplorazione"); host.append(worldRoot);
  }
  worldRoot.hidden = false;
  if(!worldHud){worldHud=element("aside","ui-world ui-world-hud");worldHud.setAttribute("aria-label","La tua campagna");worldHud.tabIndex=-1;document.querySelector("#screen-stage")?.append(worldHud);}
  worldHud.hidden=false;
  // The HUD is one column from the top (see world.css): the top row with the place name or notice and the menu, the objective, the status row
  // with the clock and the save flash, then a lesson pinned to the top. The rows keep their nodes between frames; only the text changes them.
  let hudStack=worldHud.querySelector<HTMLElement>(':scope > .ui-world-stack');
  if(!hudStack){hudStack=element('div','ui-world-stack');worldHud.append(hudStack);}
  let topRow=hudStack.querySelector<HTMLElement>(':scope > .ui-world-top');
  if(!topRow){topRow=element('div','ui-world-top');hudStack.append(topRow);}
  let statusRow=hudStack.querySelector<HTMLElement>(':scope > .ui-world-status');
  if(!statusRow){statusRow=element('div','ui-world-status');hudStack.append(statusRow);}
  // Location and notices have independent lifetimes: a changing quest must not
  // restart them, nor should a still-present server notice flash every frame.
  const lesson=world.lesson&&world.lesson.title!==lessonDismissed?world.lesson:undefined;
  const hudKey=JSON.stringify([world.location,world.objective,world.notice,world.messages,lesson]);
  if(hudKey!==worldHudSignature){
    worldHudSignature=hudKey;
    worldHud.querySelector('.ui-world-lesson')?.remove();
    if(lesson){
      const card=element('aside','ui-world-lesson');card.setAttribute('role','status');card.dataset.at=lesson.at??'bottom';
      const close=element('button','',"✕");close.type='button';close.setAttribute('aria-label','Nascondi il suggerimento');
      close.onclick=()=>{lessonDismissed=lesson.title;lesson.dismiss?.();worldHudSignature="";card.remove();};
      card.append(element('strong','',lesson.title),element('p','',lesson.body),close);hudStack.append(card);
    }
    let location=topRow.querySelector<HTMLElement>('.ui-world-location');
    if(!location || location.textContent!==world.location){
      location?.remove();location=element('div','ui-world-location',world.location);topRow.prepend(location);
    }
    let objective=worldHud.querySelector<HTMLButtonElement>('.ui-world-objective');
    if(world.objective){
      if(!objective){
        objective=element('button','ui-world-objective');objective.type='button';
        objective.setAttribute('aria-expanded','true');
        objective.onclick=()=>{const open=objective!.getAttribute('aria-expanded')!=='true';objective!.setAttribute('aria-expanded',String(open));};
        statusRow.before(objective);
      }
      objective.textContent=world.objective;objective.setAttribute('aria-label',`Obiettivo: ${world.objective}`);
    }else objective?.remove();
    const noticeText=[world.notice,...world.messages??[]].filter(Boolean).join(' · ');
    const oldNotice=worldHud.querySelector('.ui-world-notice');
    if(oldNotice?.textContent!==noticeText){oldNotice?.remove();if(noticeText){const notice=element('p','ui-world-notice',noticeText);notice.setAttribute('role','status');topRow.prepend(notice);}}
  }
  // The day's schedule: a small clock under the objective, tapped to read the schedule and change channel.
  let clock=worldHud.querySelector<HTMLButtonElement>('.ui-world-clock');
  if(world.clock){
    if(!clock){clock=element('button','ui-world-clock');clock.type='button';clock.onclick=()=>worldCurrent?.clock?.run();statusRow.prepend(clock);}
    if(clock.dataset.text!==world.clock.text){
      clock.dataset.text=world.clock.text;clock.dataset.slot=world.clock.slot;
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('width','22');icon.setAttribute('height','22');icon.setAttribute('aria-hidden','true');
      icon.innerHTML=SLOT_ICONS[world.clock.slot]??SLOT_ICONS.giorno;
      clock.replaceChildren(icon,element('span','',world.clock.text));
      clock.setAttribute('aria-label',`${world.clock.label}. Tocca per leggere il palinsesto`);
    }
  }else clock?.remove();
  let saved=worldHud.querySelector<HTMLElement>('.ui-save-flash');
  if(!saved){saved=element('span','ui-save-flash','✓ Salvato');saved.setAttribute('role','status');statusRow.append(saved);}
  saved.hidden=!world.saved;
  // An empty status row takes no room: it is hidden, so the gap above it closes too.
  statusRow.hidden=!statusRow.querySelector(':scope > :not([hidden])');
  const next=JSON.stringify([world.actions.map(a=>[a.label,a.icon,a.disabled]),Boolean(world.power)]);
  if(next!==worldSignature){
    worldSignature=next;
    const nav=element('nav','ui-world-nav');nav.setAttribute('aria-label','Accessi rapidi');
    world.actions.forEach((action,i)=>{
      const button=kit.button(action,()=>worldCurrent?.actions[i]?.run());
      button.setAttribute('aria-label',action.label);button.title=action.label;nav.append(button);
    });
    const controls=element('div','ui-world-controls');
    worldContext=kit.button(world.context,()=>worldCurrent?.context.run(),true,()=>!worldCurrent||Boolean(worldCurrent.context.disabled));
    worldRun=kit.button(world.run,()=>worldCurrent?.run.run());
    if(world.power){
      const power=kit.button(world.power,()=>worldCurrent?.power?.run());power.classList.add('ui-world-power');power.setAttribute('aria-label','Poteri');
      const row=element('div','ui-world-row');row.append(power,worldRun);controls.append(worldContext,row);
    }else controls.append(worldContext,worldRun);
    // The menu sits in the top row, beside the place name, so a bigger text narrows the name instead of running under the buttons.
    topRow.querySelector(':scope > .ui-world-nav')?.remove();topRow.append(nav);
    worldRoot.replaceChildren(controls);
  }
  if(worldContext&&worldRun){
    worldContext.hidden=Boolean(world.context.disabled);
    worldContext.disabled=Boolean(world.context.disabled);
    if(world.context.disabled)worldContext.setAttribute("aria-disabled","true");else worldContext.removeAttribute("aria-disabled");
    worldContext.querySelector('strong')!.textContent=world.context.label;
    worldContext.setAttribute('aria-label',world.context.label);
    worldRun.querySelector('strong')!.textContent='Corri';
    worldRun.setAttribute('aria-label','Corri');
    worldRun.setAttribute('aria-pressed',String(world.running));
  }
}

/** Update only the native cursor while a timed action is running. */
function updateTiming(root:HTMLElement,timing:UiTiming):void {
 const track=root.querySelector<HTMLElement>('.ui-timing-track');if(!track)return;
 const progress=Math.max(0,Math.min(1,timing.progress));
 track.setAttribute('aria-valuenow',String(Math.round(progress*100)));
 const window=track.querySelector<HTMLElement>('.ui-timing-window')!,cursor=track.querySelector<HTMLElement>('.ui-timing-cursor')!;
 window.style.left=`${timing.windowStart*100}%`;window.style.width=`${(timing.windowEnd-timing.windowStart)*100}%`;cursor.style.left=`${progress*100}%`;
}

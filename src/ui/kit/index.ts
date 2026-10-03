import { renderArena, leaveArena, type UiArena } from "./arena";
import {TYPE_COLORS,typeLabelColor,type PolType} from "../../data/poltypes";
import type { TouchAction } from "../../engine/touchActions";
import type {Input} from "../../engine/input";
import {audio} from "../../engine/audio";
import { commandHint } from "../../engine/inputDevice";
import { haptics } from "../../engine/haptics";

export interface UiBlock {
  title: string;
  body?: string;
  facts?: readonly { label: string; value: string }[];
}
export interface UiWorld {
  location: string;
  notice?: string;
  messages?: readonly string[];
  facts: readonly {label:string;value:string}[];
  objective?: string;
  lesson?: {title:string;body:string};
  actions: readonly TouchAction[];
  context: TouchAction;
  run: TouchAction;
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
export interface UiPanel {
  directInput?:boolean;
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
  tabs?: readonly TouchAction[];
  selectedTab?: number;
  actions: readonly TouchAction[];
  selected?: number;
  back?: TouchAction;
  primary?: number;
  columns?: 1 | 2;
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
  header(title: string, subtitle?: string, portrait?:UiPanel["portrait"]): HTMLElement {
    const header = element("header", "ui-header");
    if(portrait){const avatar=element("img","ui-avatar");avatar.src=portrait.src;avatar.alt=portrait.label;header.append(avatar);}
    header.append(element("h1", "ui-title", title));
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
  button(action: TouchAction, run: () => void, primary = false, isDisabled = () => Boolean(action.disabled)): HTMLButtonElement {
    const button = element("button", primary ? "ui-button ui-primary" : "ui-button");
    if (action.route) button.classList.add(`ui-route-${action.route}`);
    button.type = "button";
    button.disabled = Boolean(action.disabled && !action.onInspect);
    if(action.disabled)button.setAttribute("aria-disabled","true");
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
      button.addEventListener('pointerdown',event=>{cancelHold();inspected=false;downX=event.clientX;downY=event.clientY;holdTimer=setTimeout(()=>{inspected=true;haptics.tap();action.onInspect?.();},450);});
      button.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-downX,event.clientY-downY)>10)cancelHold();});
      button.addEventListener('pointerup',cancelHold);button.addEventListener('pointercancel',cancelHold);button.addEventListener('pointerleave',cancelHold);
    }
    button.onclick = () => {
      cancelHold();if(inspected){inspected=false;return;}
      if (!button.disabled && !isDisabled()) {
        haptics.tap(); run();
        button.closest<HTMLElement>("#game-ui, #game-dialog, #world-ui")?.focus({ preventScroll: true });
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

export function beginUiFrame(): void { dialogSeen = false; }
export function endUiFrame(): void {
  if (dialog && !dialogSeen) dialog.hidden = true;
  document.body.classList.toggle("ui-dialog-open", dialogSeen);
}

/** A crisp text layer above pixel artwork; the continue button stays mounted
 * while text is revealing, so a finger press cannot lose its click target. */
export function renderUiDialog(text: string, advance: () => void, complete: boolean, speaker = "Politicmon"): void {
  if (typeof document === "undefined") return;
  const stage = document.querySelector("#touch-ui");
  if (!stage) return;
  dialogSeen = true;
  continueDialog = advance;
  if (!dialog) {
    dialog = element("section", "ui-dialog");
    dialog.id = "game-dialog";
    dialog.tabIndex = -1;
    dialog.setAttribute("aria-label", "Dialogo");
    dialog.append(element("h2", "ui-subtitle"), element("p", "ui-body"), kit.button({ label: "Continua", run: advance }, () => continueDialog?.(), true));
    stage.append(dialog);
  }
  dialog.hidden = false;
  dialog.querySelector("h2")!.textContent = speaker;
  dialog.querySelector("p")!.textContent = text;
  dialog.querySelector("strong")!.textContent = complete ? "Continua" : "Mostra tutto";
}

/** One keyboard/controller contract for every native panel. Scene updates still
 * run for timers; consumed navigation never reaches the legacy menu beneath. */
export function updateUiInput(panel:UiPanel|undefined,input:Input):void {
  if(!panel||panel.directInput){navigationKey='';navigationIndex=-1;return;}
  const key=JSON.stringify([panel.title,panel.subtitle,panel.tabs?.map(action=>[action.label,action.disabled]),panel.actions.map(action=>[action.label,action.disabled]),panel.back?.label]);
  const tabCount=panel.tabs?.length??0;
  const entries=[...(panel.tabs??[]),...panel.actions,...(panel.back?[panel.back]:[])];
  if(key!==navigationKey){navigationKey=key;navigationIndex=(panel.selected??panel.primary??0)+tabCount;if(!entries[navigationIndex]||entries[navigationIndex].disabled){const activeTab=panel.selectedTab;navigationIndex=activeTab!==undefined&&activeTab<tabCount&&!entries[activeTab]?.disabled?activeTab:entries.findIndex(action=>!action.disabled);}}
  const reading=Boolean(panel.blocks?.length)&&panel.actions.every((_,index)=>index===panel.primary);
  if(reading&&(input.wasPressed('down')||input.wasPressed('up'))){
    const content=root?.querySelector<HTMLElement>('.ui-content');
    if(content)content.scrollBy({top:(input.wasPressed('down')?1:-1)*Math.max(80,Math.floor(content.clientHeight*.65)),behavior:'instant'});
    input.reset();return;
  }
  const focused=document.activeElement instanceof HTMLElement&&root?.contains(document.activeElement)?document.activeElement.closest<HTMLElement>('[data-ui-index]'):null;
  const focusedIndex=focused?Number(focused.dataset.uiIndex):-1;
  const commandIndex=Number.isInteger(focusedIndex)&&entries[focusedIndex]?focusedIndex:navigationIndex;
  const delta=input.wasPressed('down')||input.wasPressed('right')?1:input.wasPressed('up')||input.wasPressed('left')?-1:0;
  if(delta&&entries.length){
    navigationIndex=commandIndex;
    for(let i=0;i<entries.length;i++){navigationIndex=(navigationIndex+delta+entries.length)%entries.length;if(!entries[navigationIndex].disabled)break;}
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
  current = panel;
  document.body.classList.toggle("ui-arena-open",Boolean(panel?.arena));
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
  if(panel.arena){signature="";renderArena(root,panel,navigationIndex<0?(panel.selected??0):navigationIndex);return true;}
  const tabCount=panel.tabs?.length??0;
  const displayedIndex=navigationIndex<0?(panel.selected??0)+tabCount:navigationIndex;
  const next = JSON.stringify({...panel,timing:panel.timing?{...panel.timing,progress:0}:undefined,field:panel.field?{...panel.field,value:panel.field.readOnly?panel.field.value:""}:undefined,selected:displayedIndex}, (_key, value) => typeof value === "function" ? undefined : value);
  if (next === signature) {if(panel.timing)updateTiming(root,panel.timing);return true;}
  signature = next;
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
  const list = element("nav", "ui-actions");
  if (panel.columns === 2) list.classList.add("ui-grid");
  if (panel.actions.some(action=>action.route)) list.classList.add("ui-route");
  list.setAttribute("aria-label", panel.title);
  let group="";
  panel.actions.forEach((action, i) => {
    if(i===panel.primary)return;
    if(action.group&&action.group!==group){
      group=action.group;list.append(element("h2","ui-subtitle",group));
      if(action.groupHint)for(const paragraph of prosePages(action.groupHint))list.append(element("p","ui-body",paragraph));
      if(action.groupFacts)list.append(kit.facts(action.groupFacts));
    }
    const button = kit.button(action, () => { if (live()&&!current?.actions[i]?.disabled) current?.actions[i]?.run(); }, i === panel.primary);
    button.dataset.uiIndex=String(i+tabCount);
    if (panel.actions.length > 7 || (panel.positioned && panel.actions.length > 1)) button.append(element("span", "ui-note", `Scelta ${i + 1} di ${panel.actions.length}`));
    if (i+tabCount === displayedIndex) button.setAttribute("aria-current", "true");
    list.append(button);
  });
  body.append(list);
  const footer = element("footer", "ui-footer");
  if(panel.primary!==undefined&&panel.actions[panel.primary]){
    const index=panel.primary;
    const button=kit.button(panel.actions[index],()=>{if(live()&&!current?.actions[index]?.disabled)current?.actions[index]?.run();},true);
    button.dataset.uiIndex=String(index+tabCount);
    if(index+tabCount===displayedIndex)button.setAttribute("aria-current","true");
    footer.append(button);
  }
  if (panel.back) {const button=kit.button(panel.back, () => {if(live())current?.back?.run();});button.dataset.uiIndex=String(panel.actions.length+tabCount);if(displayedIndex===panel.actions.length+tabCount)button.setAttribute("aria-current","true");footer.append(button);}
  const header=kit.header(panel.title,panel.subtitle,panel.portrait);
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
  if(!worldHud){worldHud=element("aside","ui-world-hud");worldHud.setAttribute("aria-label","La tua campagna");document.querySelector("#screen-stage")?.append(worldHud);}
  worldHud.hidden=false;
  const hudKey=JSON.stringify([world.location,world.facts,world.objective,world.messages,world.notice,world.lesson]);
  if(hudKey!==worldHudSignature){
    worldHudSignature=hudKey;
    const heading=element("div","ui-world-status");heading.append(element("h2","ui-subtitle",world.location),kit.facts(world.facts));
    worldHud.replaceChildren(heading);
    if(world.lesson){
      const lesson=element("section","ui-world-lesson");lesson.setAttribute("aria-label","Apprendi i comandi");
      lesson.append(element("h2","ui-subtitle",world.lesson.title));
      for(const paragraph of prosePages(world.lesson.body))lesson.append(element("p","ui-body",paragraph));
      worldHud.append(lesson);
    }
    if(world.notice){const notice=element("p","ui-world-notice ui-body",world.notice);notice.setAttribute("role","status");worldHud.append(notice);}
    for(const message of world.messages??[])worldHud.append(element("p","ui-world-chat ui-body",message));
    if(world.objective){const objective=element("section","ui-world-objective");objective.append(element("h2","ui-note","Prossima tappa"));for(const paragraph of prosePages(world.objective))objective.append(element("p","ui-body",paragraph));worldHud.append(objective);}
  }
  const next = JSON.stringify([world.actions.map(a => [a.label,a.disabled]),world.save?.label]);
  if (worldContext && worldRun) {
    worldContext.querySelector("strong")!.textContent = world.context.label;
    worldContext.disabled = Boolean(world.context.disabled);
    if (world.context.disabled) worldContext.setAttribute("aria-disabled", "true");
    else worldContext.removeAttribute("aria-disabled");
    worldRun.querySelector("strong")!.textContent = world.run.label;
    worldRun.setAttribute("aria-pressed",String(world.running));
  }
  if (next === worldSignature) return;
  worldSignature = next;
  const nav = element("nav", "ui-world-nav"); nav.setAttribute("aria-label", "Accessi rapidi");
  world.actions.forEach((action,i) => nav.append(kit.button(action, () => worldCurrent?.actions[i]?.run())));
  const controls = element("div", "ui-world-controls");
  worldContext = kit.button(world.context, () => worldCurrent?.context.run(),true,
    () => !worldCurrent || Boolean(worldCurrent.context.disabled));
  controls.append(worldContext);
  const run = worldRun = kit.button(world.run, () => worldCurrent?.run.run());
  run.setAttribute("aria-pressed", String(world.running)); controls.append(run);
  if(world.save) controls.append(kit.button(world.save, () => worldCurrent?.save?.run()));
  worldRoot.replaceChildren(nav,controls);
}

/** Update only the native cursor while a timed action is running. */
function updateTiming(root:HTMLElement,timing:UiTiming):void {
 const track=root.querySelector<HTMLElement>('.ui-timing-track');if(!track)return;
 const progress=Math.max(0,Math.min(1,timing.progress));
 track.setAttribute('aria-valuenow',String(Math.round(progress*100)));
 const window=track.querySelector<HTMLElement>('.ui-timing-window')!,cursor=track.querySelector<HTMLElement>('.ui-timing-cursor')!;
 window.style.left=`${timing.windowStart*100}%`;window.style.width=`${(timing.windowEnd-timing.windowStart)*100}%`;cursor.style.left=`${progress*100}%`;
}

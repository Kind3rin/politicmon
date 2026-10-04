import {openUiSheet} from "./sheet";
import {TYPE_COLORS, typeLabelColor, type PolType} from "../../data/poltypes";
import type {TouchAction} from "../../engine/touchActions";
import { kit, type UiPanel } from './index';

export interface UiArenaCombatant { name:string; level:number; hp:number; maxHp:number; status?:string; form?:string; exp?:number }
export interface UiArena {
  polemica?:number;
  intent?:{label:string;kind:"attack"|"status";posture?:{label:string;rule:string}};
  finisher?:TouchAction;
  player:UiArenaCombatant;
  foe:UiArenaCombatant;
  message?:{title:string;body:string};
  notice?:string;
  moveCount:number;
  /** Posture toggles that follow the moves in actions[]. */
  postureCount?:number;
  impacts?:readonly {label:string;x:number;y:number;opacity:number;kind:"normal"|"super"|"crit"}[];
}
let owner:HTMLElement|undefined;
let controlSignature='';
let live:UiPanel|undefined;
let generation=0;
const node=(tag:string,cls:string)=>{const el=document.createElement(tag);el.className=cls;return el;};
function combatant(label:string):HTMLElement {
  const card=node('section','ui-combatant');card.setAttribute('aria-label',label);
  const heading=node('div','ui-combatant-heading');heading.append(node('h2','ui-subtitle'),node('span','ui-note'));
  const values=node('div','ui-combatant-values');values.append(node('span','ui-body'),node('span','ui-note'));
  const bar=node('div','ui-bar');bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',`PV ${label}`);bar.append(node('div','ui-bar-fill'));
  card.append(heading,values,bar,node('p','ui-note ui-form'));return card;
}
function refreshCombatant(card:HTMLElement,data:UiArenaCombatant):void {
  const set=(selector:string,text:string)=>{const el=card.querySelector(selector)!;if(el.textContent!==text)el.textContent=text;};
  set('h2',data.name);set('.ui-combatant-heading .ui-note',`LV ${data.level}`);
  set('.ui-combatant-values .ui-body',`${Math.max(0,Math.round(data.hp))}/${data.maxHp}`);
  set('.ui-combatant-values .ui-note',data.status??'');
  const form=card.querySelector<HTMLElement>('.ui-form')!;form.hidden=!data.form;form.textContent=data.form?`Forma: ${data.form}`:'';
  const bar=card.querySelector<HTMLElement>('.ui-bar')!;bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(data.maxHp));bar.setAttribute('aria-valuenow',String(Math.max(0,Math.round(data.hp))));
  bar.querySelector<HTMLElement>('.ui-bar-fill')!.style.background=data.hp/data.maxHp<.25?'#D7263D':data.hp/data.maxHp<.5?'#FFD23F':'#1B998B';
  bar.querySelector<HTMLElement>('.ui-bar-fill')!.style.width=`${Math.max(0,Math.min(100,data.hp/data.maxHp*100))}%`;
}
/** The art surface stays mounted while counters and callbacks change. */
export function renderArena(root:HTMLElement,panel:UiPanel,selected:number):void {
  live=panel;const arena=panel.arena!;
  if(owner!==root||!root.classList.contains('ui-arena')){
    owner=root;controlSignature='';root.className='ui-panel ui-arena';
    const hud=node('header','ui-arena-hud');hud.append(combatant('Avversario'),combatant('Il tuo compagno'));
    const view=node('div','ui-arena-view');const frame=document.querySelector('#screen-frame');if(frame)view.append(frame);
    const notice=node('div','ui-arena-notice ui-note');
    const impacts=node('div','ui-arena-impacts');impacts.setAttribute("aria-hidden","true");view.append(impacts,notice);
    const caption=node('section','ui-arena-caption');caption.append(node('h2','ui-subtitle'),node('p','ui-body'));
    const deck=node('div','ui-arena-deck');deck.append(node('div','ui-arena-moves'),node('div','ui-arena-postures'),node('div','ui-arena-secondary'));
    view.append(hud);root.replaceChildren(view,caption,deck);
  }
  root.setAttribute('aria-label',panel.title);
  const cards=root.querySelectorAll<HTMLElement>('.ui-combatant');refreshCombatant(cards[0],arena.foe);refreshCombatant(cards[1],arena.player);
  const caption=root.querySelector<HTMLElement>('.ui-arena-caption')!;caption.hidden=false;
  const captionKey=JSON.stringify([arena.finisher?.label,arena.message,arena.notice]);
  if(caption.dataset.content!==captionKey){caption.dataset.content=captionKey;caption.replaceChildren();
  if(arena.finisher){const button=kit.button(arena.finisher,()=>live?.arena?.finisher?.run());button.classList.add('ui-finisher');caption.append(button);}
  else if(arena.message){const text=node('p','ui-body');text.textContent=arena.notice||(['In lotta','Duello','Esito del duello','Scelta inviata'].includes(arena.message.title)?arena.message.body:arena.message.title);caption.append(text);}}
  let dots=cards[1].querySelector<HTMLElement>('.ui-polemica');
  if(!dots){dots=node('span','ui-polemica');cards[1].append(dots);}
  dots.hidden=arena.polemica===undefined;
  dots.textContent=[0,1,2].map(i=>i<(arena.polemica??0)?'●':'○').join(' ');dots.setAttribute('aria-label',`Polemica ${arena.polemica??0} su 3`);
  let intent=root.querySelector<HTMLElement>('.ui-intent');
  if(!intent){intent=node('button','ui-intent');intent.onclick=()=>{const now=live?.arena?.intent;openUiSheet('Intenzione avversaria',[now?.label??'',now?.posture?`Postura: ${now.posture.label}. ${now.posture.rule}`:''].filter(Boolean).join('\n\n'));};root.querySelector('.ui-arena-view')!.append(intent);}
  intent.hidden=!arena.intent;
  const kind=arena.intent?.kind??'status';
  if(intent.dataset.kind!==kind){intent.dataset.kind=kind;intent.innerHTML=`<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">${kind==='attack'?'<path d="M5 19 19 5V2h-3L5 13M3 11l10 10M3 21l4-4"/>':'<path d="m4 10 15-6v16L4 14zM4 10H1v4h3m3 1 2 7h4l-3-6"/>'}</svg>`;}
  intent.setAttribute('aria-label',`Intenzione: ${arena.intent?.label??''}${arena.intent?.posture?`, postura ${arena.intent.posture.label}`:''}`);intent.title=arena.intent?.label??'';
  let tag=root.querySelector<HTMLElement>('.ui-intent-posture');
  if(!tag){tag=node('span','ui-intent-posture');tag.setAttribute('aria-hidden','true');root.querySelector('.ui-arena-view')!.append(tag);}
  tag.hidden=!arena.intent?.posture;tag.textContent=arena.intent?.posture?.label??'';
  const notice=root.querySelector<HTMLElement>('.ui-arena-notice')!;notice.hidden=true;notice.textContent='';
  const layer=root.querySelector<HTMLElement>('.ui-arena-impacts')!;
  const impacts=arena.impacts??[];
  while(layer.children.length>impacts.length)layer.lastElementChild?.remove();
  impacts.forEach((impact,index)=>{
    let el=layer.children[index] as HTMLElement|undefined;
    if(!el){el=node('span','ui-arena-impact ui-title');layer.append(el);}
    el.textContent=impact.label;el.dataset.kind=impact.kind;el.style.left=`${impact.x}%`;el.style.top=`${impact.y}%`;el.style.opacity=String(impact.opacity);
  });
  const sig=JSON.stringify([panel.actions,selected],(_key,value)=>typeof value==='function'?undefined:value);
  if(sig===controlSignature)return;
  controlSignature=sig;const version=++generation;
  const invoke=(index:number,inspect=false)=>()=>{const action=live?.actions[index];if(version!==generation||!action)return;if(inspect)action.onInspect?.();else if(!action.disabled)action.run();};
  const buttons=panel.actions.map((action,index)=>{
    const isMove=index<arena.moveCount;
    const button=kit.button({...action,hint:undefined,facts:undefined,order:undefined,onInspect:action.onInspect?invoke(index,true):undefined},invoke(index));
    if(isMove){
      const type=action.facts?.find(f=>f.label==='Tipo')?.value as PolType|undefined;
      const pp=action.facts?.find(f=>f.label==='PP')?.value??'—';
      const efficacy=Number(action.facts?.find(f=>f.label==='Efficacia')?.value.replace('×',''));
      const meta=node('span','ui-move-meta');
      if(type&&type in TYPE_COLORS){button.style.background=TYPE_COLORS[type];button.style.color=typeLabelColor(type);const icon=document.createElement('img');icon.src=`/sprites/ui/type_${type.toLowerCase()}.png`;icon.alt=type;meta.append(icon);}
      const count=node('span','ui-move-pp');count.textContent=pp;meta.append(count);if(/^0\s*[/d]/.test(pp))button.dataset.empty='true';
      const arrow=node('span','ui-efficacy');arrow.textContent=efficacy>1?'▲':efficacy<1?'▼':'';meta.append(arrow);button.append(meta);
      button.setAttribute('aria-label',`${action.label}, ${type??''}, PP ${pp}${efficacy>1?', superefficace':efficacy<1?', poco efficace':''}`);
    }
    button.dataset.uiIndex=String(index+(panel.tabs?.length??0));
    button.classList.add(index<arena.moveCount?'ui-move-card':index<arena.moveCount+(arena.postureCount??0)?'ui-posture':'ui-secondary-action');
    button.setAttribute('aria-current',String(index===selected));return button;
  });
  const postureEnd=arena.moveCount+(arena.postureCount??0);
  root.querySelector('.ui-arena-moves')!.replaceChildren(...buttons.slice(0,arena.moveCount));
  const postures=root.querySelector<HTMLElement>('.ui-arena-postures')!;
  postures.replaceChildren(...buttons.slice(arena.moveCount,postureEnd));postures.hidden=postureEnd===arena.moveCount;
  root.querySelector('.ui-arena-deck')!.classList.toggle('ui-has-postures',!postures.hidden);
  root.querySelector('.ui-arena-secondary')!.replaceChildren(...buttons.slice(postureEnd));
}
/** Keep the canvas outside a menu before removing an arena subtree. */
export function leaveArena(root?:HTMLElement):void {
  if(!root?.classList.contains('ui-arena'))return;
  const frame=root.querySelector('#screen-frame');if(frame)document.querySelector('#screen-stage')?.prepend(frame);
  root.className='ui-panel';owner=undefined;controlSignature='';generation++;
}

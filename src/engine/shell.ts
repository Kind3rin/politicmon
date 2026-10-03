import type {Input} from './input';
import {loadControlMode,toggleControlMode} from './controls';
import {setInputDevice} from './inputDevice';

export function initShell(input:Input):()=>boolean{
 const guide=document.querySelector<HTMLDialogElement>('#shell-guide');
 const help=document.querySelector<HTMLButtonElement>('#shell-help');
 const full=document.querySelector<HTMLButtonElement>('#shell-fullscreen');
 const canvas=document.querySelector<HTMLCanvasElement>('#game-canvas');
 const mode=document.querySelector<HTMLButtonElement>('#shell-control-mode');
 if(mode){
  const visible=()=>{mode.hidden=!document.body.classList.contains('touch');};
  visible();window.addEventListener('resize',visible);
  const label=()=>mode.setAttribute('aria-label',loadControlMode()==='stick'?'Usa la croce direzionale':'Usa la levetta direzionale');
  label();mode.addEventListener('focus',label);
  mode.addEventListener('click',()=>{input.reset();toggleControlMode();label();canvas?.focus({preventScroll:true});});
 }

 help?.addEventListener('click',()=>{input.reset();guide?.showModal();guide?.querySelector<HTMLButtonElement>('[autofocus]')?.focus();});
 // Safari can skip native buttons when its keyboard-navigation preference is
 // off. Keep both exits reachable, with the same focus loop in either browser.
 document.addEventListener('keydown',event=>{
  if(!guide?.open)return;
  setInputDevice('keyboard');
  if(['ArrowUp','ArrowDown','KeyW','KeyS'].includes(event.code)){
   event.preventDefault();event.stopPropagation();
   guide.scrollBy({top:(['ArrowDown','KeyS'].includes(event.code)?1:-1)*guide.clientHeight*.6,behavior:'instant'});return;
  }
  if(['KeyX','Escape','KeyP'].includes(event.code)){event.preventDefault();event.stopPropagation();guide.close();return;}
  if(event.code==='KeyZ'){
   event.preventDefault();event.stopPropagation();
   const focused=document.activeElement;
   if(focused instanceof HTMLButtonElement&&guide.contains(focused))focused.click();
   return;
  }
  if(event.key!=='Tab')return;
  const buttons=[...guide.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
  event.preventDefault();const i=buttons.indexOf(document.activeElement as HTMLButtonElement);
  buttons[i<0?(event.shiftKey?buttons.length-1:0):(i+(event.shiftKey?buttons.length-1:1))%buttons.length]?.focus();
 },true);
 const close=()=>guide?.close();
 document.querySelector('#shell-guide-close')?.addEventListener('click',close);
 document.querySelector('#shell-guide-resume')?.addEventListener('click',close);
 guide?.addEventListener('close',()=>{input.reset();canvas?.focus({preventScroll:true});});
 if(full&&document.documentElement.requestFullscreen){
  full.hidden=false;
  full.setAttribute('aria-pressed','false');
  full.addEventListener('click',async()=>{
   input.reset();
   try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    canvas?.focus({preventScroll:true});
   }catch{full.setAttribute('aria-label','Schermo intero non disponibile in questo browser');}
  });
  document.addEventListener('fullscreenchange',()=>{full.setAttribute('aria-label',document.fullscreenElement?'Esci dallo schermo intero':'Apri a schermo intero');full.setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));});
 }
 return ()=>{
  if(!guide?.open)return false;
  if(input.wasPressed('b')||input.wasPressed('start'))guide.close();
  else if(input.wasPressed('a')){
   const focused=document.activeElement;
   if(focused instanceof HTMLButtonElement&&guide.contains(focused))focused.click();
  }else if(input.wasPressed('down')||input.wasPressed('up')){
   guide.scrollBy({top:(input.wasPressed('down')?1:-1)*guide.clientHeight*.6,behavior:'instant'});
  }else if(input.wasPressed('right')||input.wasPressed('left')){
   const buttons=[...guide.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
   const delta=input.wasPressed('right')?1:-1;
   const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   buttons[(Math.max(0,index)+delta+buttons.length)%buttons.length]?.focus();
  }
  input.reset();
  // The press which closes the guide must not also reach the world below it.
  return true;
 };
}

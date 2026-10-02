import type {Input} from './input';

export function initShell(input:Input):()=>boolean{
 const guide=document.querySelector<HTMLDialogElement>('#shell-guide');
 const help=document.querySelector<HTMLButtonElement>('#shell-help');
 const full=document.querySelector<HTMLButtonElement>('#shell-fullscreen');
 const canvas=document.querySelector<HTMLCanvasElement>('#game-canvas');
 help?.addEventListener('click',()=>{input.reset();guide?.showModal();guide?.querySelector<HTMLButtonElement>('[autofocus]')?.focus();});
 // Safari can skip native buttons when its keyboard-navigation preference is
 // off. Keep both exits reachable, with the same focus loop in either browser.
 document.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||!guide?.open)return;
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
 return ()=>Boolean(guide?.open);
}

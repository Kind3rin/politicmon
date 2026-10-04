import type {TouchAction} from '../../engine/touchActions';
/** One modal sheet; native dialog traps focus and suspends game key routing. */
export function openUiSheet(title:string,description:string,actions:readonly TouchAction[]=[]):void {
 const previous=document.querySelector<HTMLDialogElement>('#tribuna-sheet');previous?.close();previous?.remove();
 const dialog=document.createElement('dialog');dialog.id='tribuna-sheet';dialog.className='tribuna-sheet';
 const heading=document.createElement('h2');heading.textContent=title;heading.id='tribuna-sheet-title';dialog.setAttribute('aria-labelledby',heading.id);
 const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Chiudi dettaglio');close.onclick=()=>dialog.close();
 const header=document.createElement('header');header.append(heading,close);dialog.append(header);
 if(description){const text=document.createElement('p');text.textContent=description;dialog.append(text);}
 for(const action of actions){const button=document.createElement('button');button.textContent=action.label;button.disabled=Boolean(action.disabled);button.onclick=()=>{dialog.close();action.run();};dialog.append(button);}
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)dialog.close();}});
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}

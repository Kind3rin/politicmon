let layer:HTMLElement|undefined;
let count=0;
let zoom=1;
/** The world is drawn scaled around the screen centre; labels follow it. */
export function setWorldLabelZoom(value:number):void {zoom=value;}
export function beginWorldLabels():void {count=0;}
export function worldLabel(text:string,x:number,y:number,viewHeight:number):void {
 const frame=document.querySelector<HTMLElement>('#screen-frame');if(!frame)return;
 if(zoom!==1){x=120+(x-120)*zoom;y=viewHeight/2+(y-viewHeight/2)*zoom;}
 if(!layer){layer=document.createElement('div');layer.className='ui-world-labels';}
 if(layer.parentElement!==frame)frame.append(layer);
 let label=layer.children[count++] as HTMLElement|undefined;
 if(!label){label=document.createElement('span');layer.append(label);}
 if(label.textContent!==text)label.textContent=text;label.style.left=`${Math.max(4,Math.min(96,x/240*100))}%`;label.style.top=`${y/viewHeight*100}%`;
 label.hidden=x<0||x>240||y<0||y>viewHeight;
}
export function endWorldLabels():void {if(!layer)return;while(layer.children.length>count)layer.lastElementChild?.remove();}

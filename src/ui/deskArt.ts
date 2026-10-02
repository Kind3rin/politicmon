import {sceneImage} from '../engine/assets';
import type {Screen} from '../engine/screen';
export function drawDeskBackdrop(screen:Screen,id:string):void{
 screen.clear('#17243d');const image=sceneImage(`desk:${id}`,`ui/desk/${id}.png`);
 if(image)screen.image(image,0,17,240,163);screen.dim(.2);screen.rect(0,161,240,19,'#17243d');
}

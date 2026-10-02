import { sceneImage } from "../engine/assets";
import type { Screen } from "../engine/screen";
export function drawArenaBackdrop(screen:Screen,kind:string):void {
 screen.clear("#17243d");const image=sceneImage(`arena:${kind}`,`ui/arena/${kind}.png`);
 if(image)screen.image(image,0,17,240,163);screen.dim(.2);screen.rect(0,161,240,19,"#17243d");
}
export function drawArenaIcon(screen:Screen,id:string,x:number,y:number,w=24,h=w):void {
 const image=sceneImage(`arena:${id}`,`ui/arena/${id}.png`);if(image)screen.image(image,x,y,w,h);
}

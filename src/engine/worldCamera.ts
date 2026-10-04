// World pixels stay integral. Narrow rooms have one fixed, centred camera;
// larger maps track the player and clamp at their existing boundaries.
export function worldCameraAxis(center:number,span:number,view:number):number{
  const extent=span-view;
  return Math.max(Math.min(0,Math.round(extent/2)),Math.min(extent,Math.round(center-view/2)));
}

// Preserve the 240-pixel width and sprite scale; portrait exploration reveals
// more map instead of stretching a 4:3 picture into the available stage.
export function worldViewportHeight(width:number,height:number,expanded:boolean):number{
  if(!expanded||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 180;
  return Math.max(180,Math.min(480,Math.round(height*240/width)));
}

/** Exponential follow is independent of refresh rate; keep subpixel state internally. */
export function followCamera(current:number,target:number,dt:number,reduced=false):number {
  if(reduced||!Number.isFinite(current))return target;
  const next=current+(target-current)*(1-Math.exp(-14*Math.max(0,Math.min(.1,dt))));
  return Math.abs(next-target)<.001?target:next;
}
export function unzoomWorldPoint(x:number,y:number,width:number,height:number,zoom:number):{x:number;y:number} {
  return {x:(x-width/2)/zoom+width/2,y:(y-height/2)/zoom+height/2};
}

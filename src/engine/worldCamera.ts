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

/**
 * Phones in portrait show 15 tiles across at 1x: characters are 24 px tall and a
 * tile is smaller than a fingertip. Zoom in so a tile is about 36 CSS pixels.
 * Steps of a quarter keep every art pixel an integer number of backing pixels.
 */
export function phoneWorldZoom(stageWidth:number,touch:boolean,portrait:boolean):number{
  if(!touch||!portrait||!Number.isFinite(stageWidth)||stageWidth<=0||stageWidth>560)return 1;
  return Math.max(1,Math.min(1.75,Math.round(36/(stageWidth/15)*4)/4));
}

/**
 * Camera for a view that is scaled about its own centre. The visible window is
 * `view/zoom` wide, so it must be clamped to the map as such; the returned origin
 * is the one the 240-pixel drawing space expects before the zoom is applied.
 */
export function zoomedCameraAxis(center:number,span:number,view:number,zoom:number):number{
  const window=view/zoom;
  return worldCameraAxis(center,span,window)-(view-window)/2;
}

/** Highest camera origin that still leaves `clearance` screen pixels above the player. */
export function clearanceCeiling(playerAxis:number,view:number,zoom:number,clearance:number):number{
  const middle=view/2;
  return playerAxis-middle-(clearance-middle)/zoom;
}

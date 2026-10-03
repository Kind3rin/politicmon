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

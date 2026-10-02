// World pixels stay integral. Narrow rooms have one fixed, centred camera;
// larger maps track the player and clamp at their existing boundaries.
export function worldCameraAxis(center:number,span:number,view:number):number{
  const extent=span-view;
  return Math.max(Math.min(0,Math.round(extent/2)),Math.min(extent,Math.round(center-view/2)));
}

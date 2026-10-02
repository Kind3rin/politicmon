export interface SafeInsets { top:number; bottom:number; left:number; right:number }

export function readSafeInsets():SafeInsets {
 const css=getComputedStyle(document.documentElement);
 const side=(name:string)=>parseFloat(css.getPropertyValue('--safe-'+name))||0;
 return {top:side('top'),bottom:side('bottom'),left:side('left'),right:side('right')};
}

// Keep the synchronous first-paint formula in index.html identical.
export function gameCanvasSize(width:number,height:number,touch:boolean,safe:SafeInsets={top:0,bottom:0,left:0,right:0}):{width:number;height:number}{
 const landscape=touch&&width>height&&height<=500;
 const padW=touch?Math.max(12,safe.left)+Math.max(12,safe.right):24;
 const padH=touch?Math.max(landscape?6:8,safe.top)+Math.max(landscape?6:12,safe.bottom):24;
 const scale=Math.min(Math.max(1,width-padW-(touch?(landscape?304:0):8))/240,Math.max(1,height-padH-(touch?(landscape?60:216):92))/180,4);
 return {width:240*scale,height:180*scale};
}

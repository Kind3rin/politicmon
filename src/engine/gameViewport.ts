// Keep the synchronous first-paint formula in index.html identical.
export function gameCanvasSize(width:number,height:number,touch:boolean):{width:number;height:number}{
 const landscape=touch&&width>height&&height<=500;
 const scale=Math.min(Math.max(1,width-(landscape?312:32))/240,Math.max(1,height-(touch?(landscape?100:246):116))/180,4);
 return {width:240*scale,height:180*scale};
}

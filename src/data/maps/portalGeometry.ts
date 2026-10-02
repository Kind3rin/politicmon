// An indoor return portal can face any side of a lobby. The arrival must
// touch its paired exit, rather than being required to lie north of it.
export function arrivesBesideExit(arrival:{toX:number;toY:number},exit:{x:number;y:number}):boolean{
  return Math.abs(arrival.toX-exit.x)+Math.abs(arrival.toY-exit.y)===1;
}

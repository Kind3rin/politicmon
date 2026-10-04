import { TILE } from '../../art/tiles';
import type { MapDef } from '../../data/maps/types';

export type TerrainKind = 'grass' | 'sand' | 'path' | 'asphalt' | 'floor' | 'water';
export type TerrainSample = { kind: TerrainKind; image: CanvasImageSource | null; layers?: (CanvasImageSource | null)[]; decorate?: boolean };
export type TerrainCell = {
  x: number; y: number; kind: TerrainKind; variant: number;
  /** N E S W bits. Corners: NE SE SW NW, only where both sides match. */
  edges: number; corners: number;
  scatter?: string;
};
export type TerrainShadow = { x:number; y:number; width:number; height:number };
export type TerrainSource = {
  map: Pick<MapDef, 'id' | 'tiles' | 'scatter'>;
  /** Change when bridges, bulldozed trees or graphics change. Never use save identity alone. */
  revision: string;
  assetRevision?: number;
  sample(x: number, y: number): TerrainSample;
  shadows?: () => TerrainShadow[];
};

/** Coordinate seed: stable through camera movement, reloads and negative coordinates. */
export function terrainHash(mapId: string, x: number, y: number, salt = 0): number {
  let h = 2166136261;
  for (const c of `${mapId}:${x}:${y}:${salt}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return h >>> 0;
}
const directions = [[0,-1],[1,0],[0,1],[-1,0]] as const;
const diagonals = [[1,-1],[1,1],[-1,1],[-1,-1]] as const;
export function terrainCell(source: TerrainSource, x: number, y: number): TerrainCell {
  const kind = source.sample(x,y).kind;
  let edges = 0, corners = 0;
  directions.forEach(([dx,dy],i) => { if(source.sample(x+dx,y+dy).kind !== kind) edges |= 1<<i; });
  diagonals.forEach(([dx,dy],i) => {
    if (!(edges & ((1<<i)|(1<<((i+1)%4)))) && source.sample(x+dx,y+dy).kind !== kind) corners |= 1<<i;
  });
  const seed = terrainHash(source.map.id,x,y);
  const cell: TerrainCell = { x,y,kind,variant: seed%4,edges,corners };
  if(kind !== 'water') {
    const candidates = source.map.scatter ?? [];
    let threshold = 0;
    const roll = terrainHash(source.map.id,x,y,1)/0x100000000;
    for(const item of candidates) {
      threshold += Math.max(0,Math.min(1,item.density));
      if(roll < threshold) { cell.scatter=item.kind; break; }
    }
  }
  return cell;
}

/** One map's static substrate. Objects/canopies remain separate Y-sorted layers.
 * Incomplete assets never become a permanent cached frame. Camera motion does
 * not rebuild the bitmap. Caller supplies dynamic tile resolution and revision.
 */
export class TerrainRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private complete = false;
  private builds = 0;
  private lastBuildMs=0;
  private maxBuildMs=0;
  private assetRevision: number | undefined;
  private waterCells:TerrainCell[]=[];
  constructor(private makeCanvas = () => document.createElement('canvas')) {}
  invalidate(): void { this.key=''; this.complete=false; }
  stats(): { builds: number; pixels: number; complete: boolean; lastBuildMs:number; maxBuildMs:number } {
    return { builds:this.builds,lastBuildMs:this.lastBuildMs,maxBuildMs:this.maxBuildMs, pixels:(this.canvas?.width??0)*(this.canvas?.height??0), complete:this.complete };
  }
  prepare(source: TerrainSource): HTMLCanvasElement {
    const rows=source.map.tiles;
    const w=Math.max(1,...rows.map(row=>row.length))*TILE, h=Math.max(1,rows.length)*TILE;
    const key=`${source.map.id}:${source.revision}:${w}:${h}`;
    if(this.canvas && key===this.key && (this.complete || (source.assetRevision!==undefined && source.assetRevision===this.assetRevision))) return this.canvas;
    const started=performance.now();
    // Snapshot each coordinate once, including the one-cell halo used by autotiles.
    // Asset availability stays consistent throughout this synchronous build.
    const samples=new Map<string,TerrainSample>();
    const snapshot:TerrainSource={...source,sample:(x,y)=>{
      const key=`${x}:${y}`;
      let sample=samples.get(key);
      if(!sample){sample=source.sample(x,y);samples.set(key,sample);}
      return sample;
    }};
    const cells:TerrainCell[][]=rows.map((row,y)=>[...row].map((_,x)=>terrainCell(snapshot,x,y)));
    const canvas=this.canvas??this.makeCanvas(); this.canvas=canvas;
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d');
    if(!ctx) throw new Error('Canvas 2D non disponibile per il terreno');
    ctx.imageSmoothingEnabled=false;
    this.waterCells=[];
    this.complete=true; this.key=key; this.assetRevision=source.assetRevision; this.builds++;
    for(let y=0;y<rows.length;y++) for(let x=0;x<rows[y].length;x++) {
      const sample=snapshot.sample(x,y), cell=cells[y][x];
      if(cell.kind==='water'&&sample.decorate!==false)this.waterCells.push(cell);
      if(!sample.image) { this.complete=false; continue; }
      const px=x*TILE,py=y*TILE;
      ctx.drawImage(sample.image,px,py,TILE,TILE);
      if(sample.decorate!==false) this.drawVariation(ctx,cell,px,py);
      for(const layer of sample.layers??[]) { if(layer)ctx.drawImage(layer,px,py,TILE,TILE);else this.complete=false; }
    }
    // Borders are a second pass: every base tile is already opaque.
    for(let y=0;y<rows.length;y++) for(let x=0;x<rows[y].length;x++) {
      const sample=snapshot.sample(x,y); if(sample.decorate===false)continue;
      const cell=cells[y][x];
      this.drawEdges(ctx,snapshot,cell);
      if(cell.scatter) this.drawScatter(ctx,cell);
    }
    ctx.save();ctx.fillStyle='rgba(20,30,37,.19)';
    for(const shadow of source.shadows?.()??[]) {
      const {x,y,width,height}=shadow,reach=Math.max(3,Math.round(height*.45));
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width,y);
      ctx.lineTo(x+width+reach,y+reach*.65);ctx.lineTo(x+reach,y+reach*.65);ctx.closePath();ctx.fill();
    }
    ctx.restore();
    this.lastBuildMs=performance.now()-started;
    this.maxBuildMs=Math.max(this.maxBuildMs,this.lastBuildMs);
    return canvas;
  }
  draw(ctx: CanvasRenderingContext2D, source: TerrainSource, cameraX: number, cameraY: number): void {
    ctx.drawImage(this.prepare(source),-Math.round(cameraX),-Math.round(cameraY));
  }
  drawWater(ctx:CanvasRenderingContext2D,image:CanvasImageSource|null,camX:number,camY:number,width:number,height:number,time:number,reduced:boolean):void {
    if(!image||reduced)return;
    ctx.save();
    for(const cell of this.waterCells){
      const x=cell.x*TILE-camX,y=cell.y*TILE-camY;
      if(x < -TILE||y < -TILE||x>width||y>height)continue;
      const top=cell.edges&1?3:0,right=cell.edges&2?3:0,bottom=cell.edges&4?3:0,left=cell.edges&8?3:0;
      ctx.save();ctx.beginPath();ctx.rect(Math.round(x+left),Math.round(y+top),TILE-left-right,TILE-top-bottom);ctx.clip();
      ctx.drawImage(image,Math.round(x),Math.round(y),TILE,TILE);
      // Shaded shore reflection and sparse, slowly shifting foam stay at the bank.
      if(top){ctx.fillStyle='rgba(27,74,61,.25)';ctx.fillRect(Math.round(x),Math.round(y+3),TILE,2);}
      ctx.fillStyle='rgba(189,220,194,.5)';
      const offset=(Math.floor(time*2)+cell.variant*3)%10+3;
      if(top)ctx.fillRect(Math.round(x+offset),Math.round(y+4),3,1);
      if(bottom)ctx.fillRect(Math.round(x+offset),Math.round(y+12),3,1);
      if(left)ctx.fillRect(Math.round(x+3),Math.round(y+offset),1,3);
      if(right)ctx.fillRect(Math.round(x+12),Math.round(y+offset),1,3);
      ctx.restore();
    }
    ctx.restore();
  }
  private drawEdges(ctx:CanvasRenderingContext2D,source:TerrainSource,cell:TerrainCell):void {
    if(cell.kind==='asphalt'){this.drawCurb(ctx,source,cell);return;}
    if(!['path','sand','water'].includes(cell.kind))return;
    const px=cell.x*TILE,py=cell.y*TILE;
    directions.forEach(([dx,dy],side)=>{
      const neighbor=source.sample(cell.x+dx,cell.y+dy);
      if(neighbor.kind!=='grass'||!neighbor.image)return;
      ctx.save();ctx.beginPath();
      // A continuous, seeded fringe, cut from the adjoining grass texture.
      for(let i=0;i<TILE;i++) {
        const n=1+terrainHash(source.map.id,side%2?cell.y*TILE+i:cell.x*TILE+i,side%2?cell.x:cell.y,7)%3;
        if(side===0)ctx.rect(px+i,py,1,n);
        if(side===1)ctx.rect(px+TILE-n,py+i,n,1);
        if(side===2)ctx.rect(px+i,py+TILE-n,1,n);
        if(side===3)ctx.rect(px,py+i,n,1);
      }
      ctx.clip();ctx.drawImage(neighbor.image,px,py,TILE,TILE);ctx.restore();
    });
    diagonals.forEach(([dx,dy],corner)=>{
      const neighbor=source.sample(cell.x+dx,cell.y+dy);
      if(!(cell.corners&(1<<corner))||neighbor.kind!=='grass'||!neighbor.image)return;
      ctx.save();ctx.beginPath();
      for(let i=0;i<3;i++)ctx.rect(px+(dx>0?TILE-1-i:i),py+(dy>0?TILE-3+i:0),1,3-i);
      ctx.clip();ctx.drawImage(neighbor.image,px,py,TILE,TILE);ctx.restore();
    });
  }
  private drawCurb(ctx:CanvasRenderingContext2D,source:TerrainSource,cell:TerrainCell):void {
    const px=cell.x*TILE,py=cell.y*TILE;
    // A narrow paved shoulder stays inside the road cell: no topology changes.
    // Cardinal masks join continuous strips; diagonal cut-ins close inside bends.
    let curbEdges=0;
    ctx.fillStyle='#c6c0ab';
    directions.forEach(([dx,dy],side)=>{
      const neighbor=source.sample(cell.x+dx,cell.y+dy);
      if(!(cell.edges&(1<<side))||neighbor.kind==='water')return;
      curbEdges|=1<<side;
      if(side===0)ctx.fillRect(px,py,TILE,3);
      if(side===1)ctx.fillRect(px+13,py,3,TILE);
      if(side===2)ctx.fillRect(px,py+13,TILE,3);
      if(side===3)ctx.fillRect(px,py,3,TILE);
    });
    diagonals.forEach(([dx,dy],corner)=>{
      if(!(cell.corners&(1<<corner))||source.sample(cell.x+dx,cell.y+dy).kind==='water')return;
      for(let i=0;i<3;i++)ctx.fillRect(px+(dx>0?15-i:i),py+(dy>0?13+i:0),1,3-i);
    });
    ctx.fillStyle='#827e73';
    if(curbEdges&1)ctx.fillRect(px+7,py,1,3);
    if(curbEdges&2)ctx.fillRect(px+13,py+7,3,1);
    if(curbEdges&4)ctx.fillRect(px+7,py+13,1,3);
    if(curbEdges&8)ctx.fillRect(px,py+7,3,1);
  }
  private drawScatter(ctx:CanvasRenderingContext2D,cell:TerrainCell):void {
    const x=cell.x*TILE+4+cell.variant*2,y=cell.y*TILE+6+cell.variant;
    switch(cell.scatter){
      case 'flowers':
        if(cell.kind!=='grass')return;
        ctx.fillStyle='#42633e';ctx.fillRect(x,y,1,3);
        ctx.fillStyle=cell.variant%2?'#eed789':'#e9b8b8';ctx.fillRect(x-1,y-1,3,2);break;
      case 'stones':ctx.fillStyle='#747971';ctx.fillRect(x,y,3,2);ctx.fillStyle='#a4aa95';ctx.fillRect(x,y,2,1);break;
      case 'leaflets':ctx.fillStyle='#e8dfb9';ctx.fillRect(x,y,3,4);ctx.fillStyle='#aa4e48';ctx.fillRect(x,y+1,2,1);break;
      case 'tufts':
        if(cell.kind!=='grass')return;
        ctx.fillStyle='#456941';ctx.fillRect(x,y,1,3);ctx.fillRect(x-2,y-1,1,3);ctx.fillRect(x+2,y,1,2);break;
    }
  }
  private drawVariation(ctx: CanvasRenderingContext2D,cell:TerrainCell,px:number,py:number):void {
    // Lightweight fallback variations while the authored tile sheets are reviewed.
    // These marks are baked once; no per-frame random noise or new collisions.
    if(cell.kind==='water') return;
    const colors:Record<Exclude<TerrainKind,'water'>,string[]>={
      grass:['#73996d','#87a775','#5c825d','#a4b580'],
      sand:['#ceac77','#ddbc83','#bda075','#eed2a0'],
      path:['#b69a6c','#c9ab79','#a9916b','#d9bd8f'],
      asphalt:['#646773','#555967','#787b83','#484e5c'],
      floor:['#b19672','#967d61','#c1a27d','#7e6f5f']
    };
    ctx.fillStyle=colors[cell.kind][cell.variant];
    const ox=2+cell.variant*3,oy=3+((cell.variant*5)%10);
    ctx.fillRect(px+ox,py+oy,cell.kind==='grass'?2:1,1);
    ctx.fillRect(px+(ox+7)%14,py+(oy+5)%14,1,1);
  }
}

import type { MapDef } from '../../data/maps/types';
import { terrainHash } from './terrainRenderer';

export type Weather = NonNullable<MapDef['weather']>;
export type Daylight = { period:'alba'|'giorno'|'tramonto'|'notte'; color:string; alpha:number; lamps:boolean };
export function daylightAt(hour:number):Daylight {
  const h=((hour%24)+24)%24;
  if(h>=5&&h<8)return {period:'alba',color:'#e8bd8d',alpha:.13,lamps:h<6};
  if(h>=8&&h<17)return {period:'giorno',color:'#fff2c4',alpha:0,lamps:false};
  if(h>=17&&h<20)return {period:'tramonto',color:'#cc705f',alpha:.13,lamps:h>=19};
  return {period:'notte',color:'#172a53',alpha:.36,lamps:true};
}
export function waterFrame(time:number,reduced:boolean):number { return reduced?0:Math.floor(Math.max(0,time)*4)%4; }
export function grassBend(time:number,seed:number,reduced:boolean,nearPlayer=false,direction=1):number {
  if(reduced)return 0;
  return nearPlayer?2*Math.sign(direction||1):Math.round(Math.sin(time*1.8+(seed%31)));
}
export type FootSurface='dirt'|'sand'|'wet'|'grass'|'wood'|'stone';
export function footSurface(tile:string,weather:Weather):FootSurface {
  if(tile==='w'||weather==='pioggia')return 'wet';
  return tile==='z'?'sand':tile==='='?'dirt':tile==='p'||tile==='q'?'wood':tile==='.'||tile==='~'?'grass':'stone';
}
type Footmark={x:number;y:number;surface:FootSurface;age:number;life:number;side:number};
export class WorldAtmosphere {
  private steps:Footmark[]=[];
  reset():void {this.steps=[];}
  update(dt:number,reduced:boolean):void {
    if(reduced){this.reset();return;}
    for(const step of this.steps)step.age+=Math.max(0,dt);
    this.steps=this.steps.filter(step=>step.age<step.life);
  }
  step(x:number,y:number,surface:FootSurface,side:number,reduced:boolean):void {
    if(reduced||!['dirt','sand','wet'].includes(surface))return;
    this.steps.push({x,y,surface,side,age:0,life:surface==='sand'?3.5:.65});
    if(this.steps.length>32)this.steps.shift();
  }
  drawSteps(ctx:CanvasRenderingContext2D,camX:number,camY:number,reduced:boolean):void {
    if(reduced)return;
    ctx.save();
    for(const s of this.steps){
      const p=s.age/s.life,x=Math.round(s.x-camX),y=Math.round(s.y-camY);
      ctx.globalAlpha=(1-p)*.55;
      if(s.surface==='sand') {ctx.fillStyle='#927950';ctx.fillRect(x+(s.side%2?2:-2),y,2,3);}
      else {
        ctx.fillStyle=s.surface==='wet'?'#c2ddd0':'#ddc091';
        const d=Math.round(p*5);
        ctx.fillRect(x-d,y-d,2,1);ctx.fillRect(x+d,y-1-d,2,1);ctx.fillRect(x,y+1-d,1,1);
      }
    }
    ctx.restore();
  }
  draw(ctx:CanvasRenderingContext2D,map:MapDef,camX:number,camY:number,width:number,height:number,time:number,reduced:boolean,hour:number,lights:readonly {x:number;y:number}[]):void {
    if(!map.outdoor)return;
    const light=daylightAt(hour);
    ctx.save();
    if(light.alpha){ctx.fillStyle=light.color;ctx.globalAlpha=light.alpha;ctx.fillRect(0,0,width,height);}
    ctx.globalAlpha=1;
    if(light.lamps){
      for(const lamp of lights){
        const x=Math.round(lamp.x-camX),y=Math.round(lamp.y-camY);
        ctx.fillStyle='rgba(255,211,113,.1)';ctx.fillRect(x-4,y-3,12,11);
        ctx.fillStyle='#edc570';ctx.fillRect(x,y,4,4);
      }
    }
    if(!reduced){
      // Three ambient motifs, anchored to map coordinates; bounded draw cost.
      const spanX=Math.max(width,map.tiles[0].length*16),spanY=Math.max(height,map.tiles.length*16);
      const coastal=map.tiles.some(row=>row.includes('w'));
      for(let i=0;i<24;i++){
        const seed=terrainHash(map.id,i,0,15),kind=i%3;
        const x=Math.round(((seed%spanX+time*(kind===2?9:3))%spanX)-camX);
        const y=Math.round((((seed>>>12)%spanY+time*(kind===0?2:1))%spanY)-camY);
        if(x<0||y<0||x>width||y>height)continue;
        if(kind===0){ctx.fillStyle='#aab774';ctx.fillRect(x,y,2,1);ctx.fillRect(x+1,y+1,1,1);}
        else if(kind===1){ctx.fillStyle='rgba(225,204,156,.45)';ctx.fillRect(x,y,1,1);}
        else if(coastal){ctx.fillStyle='rgba(17,35,40,.28)';const wing=Math.floor(time*3+i)%2;ctx.fillRect(x-3,y+wing,3,1);ctx.fillRect(x+1,y+wing,3,1);ctx.fillRect(x,y+1,1,1);}
        else {ctx.fillStyle='#d8cfb3';ctx.fillRect(x,y,2,3);ctx.fillStyle='#aa6353';ctx.fillRect(x,y+1,1,1);}
      }
      const weather=map.weather??'sereno';
      if(weather==='pioggia'){
        ctx.strokeStyle='rgba(179,210,220,.45)';ctx.lineWidth=1;ctx.beginPath();
        for(let i=0;i<30;i++){
          const seed=terrainHash(map.id,i,1),x=Math.round((seed%width+time*22)%width),y=Math.round(((seed>>>10)%height+time*85)%height);
          ctx.moveTo(x,y);ctx.lineTo(x-2,y+6);
        }ctx.stroke();
      } else if(weather==='nebbia'){
        ctx.fillStyle='rgba(194,207,201,.10)';ctx.fillRect(0,0,width,height);
        for(let i=0;i<3;i++){const y=Math.round(i*height/3+Math.sin(time*.15+i)*10);for(let band=-5;band<=5;band++){ctx.fillStyle=`rgba(194,207,201,${.035*(1-Math.abs(band)/6)})`;ctx.fillRect(0,y+band*3,width,3);}}
      } else if(weather==='afa'){
        ctx.fillStyle='rgba(233,203,140,.06)';ctx.fillRect(0,0,width,height);
        for(let i=0;i<3;i++)ctx.fillRect(0,Math.round(height*(i+1)/4+Math.sin(time*1.4+i)*2),width,2);
      }
    }
    ctx.restore();
  }
}

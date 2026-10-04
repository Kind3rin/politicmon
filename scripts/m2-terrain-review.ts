import '../src/ui/kit/kit.css';
import {beginUiFrame,endUiFrame,renderUiPanel,updateUiInput} from '../src/ui/kit';
import {Screen} from '../src/engine/screen';
import {SceneStack} from '../src/engine/scene';
import {Input} from '../src/engine/input';
import {WorldScene} from '../src/game/world/WorldScene';
import {newGameState} from '../src/game/state';
import {createMonster} from '../src/game/monster';
import {coreTerrainEntries,TILES} from '../src/art/tiles';
import {preloadSprites,waitForSprites} from '../src/engine/assets';
import {MAPS} from '../src/data/maps';
import {audio} from '../src/engine/audio';
import {mp} from '../src/net/mp';
import type {FootSurface} from '../src/game/world/worldAtmosphere';
audio.enabled=false;mp.setEnabled(false);
// WorldScene auto-saves on construction: isolate writes in this fixture realm.
Storage.prototype.setItem=()=>{};Storage.prototype.removeItem=()=>{};
const entries=coreTerrainEntries();preloadSprites(entries);await waitForSprites(Object.keys(entries),10000);
const screen=new Screen(document.querySelector('canvas')!),input=new Input();
let state=newGameState(),world:WorldScene,stack=new SceneStack();
function select(mapId:string){
 state=newGameState();state.flags['intro-done']=true;state.party=[createMonster('giorgetta',12)];
 const map=MAPS[mapId];const aims=mapId==='route1'?{x:7,y:8}:{x:12,y:10};
 const open=map.tiles.flatMap((row,y)=>[...row].flatMap((ch,x)=>TILES[ch]&&!TILES[ch].solid&&!TILES[ch].water?[{x,y}]:[]));
 open.sort((a,b)=>Math.abs(a.x-aims.x)+Math.abs(a.y-aims.y)-Math.abs(b.x-aims.x)-Math.abs(b.y-aims.y));
 state.pos={mapId,...open[0],facing:'down'};
 state.reduceEffects=(document.querySelector('#reduce') as HTMLInputElement).checked;
 stack=new SceneStack();
 world=new WorldScene(stack,input,state,()=>new Date(2026,9,4,Number((document.querySelector('#hour') as HTMLSelectElement).value)));
 stack.push(world);input.reset();
 applyWeather();
 (world as unknown as {fadeT:number;bannerFlash:number;banner:unknown}).fadeT=0;
 (world as unknown as {bannerFlash:number;banner:unknown}).bannerFlash=0;
 (world as unknown as {banner:unknown}).banner=null;
 document.querySelector('#status')!.textContent=map.name+' · dati di prova, nessun salvataggio modificato';
}
function applyWeather(){(world as unknown as {map:typeof MAPS[string]}).map={...MAPS[state.pos.mapId],weather:(document.querySelector('#weather') as HTMLSelectElement).value as 'sereno'|'pioggia'|'nebbia'|'afa'};}
document.querySelector('#audio')!.addEventListener('change',()=>{
 audio.enabled=(document.querySelector('#audio') as HTMLInputElement).checked;
 if(audio.enabled){audio.setVolume('music',0);audio.setVolume('effects',70);audio.unlock();}
});
document.querySelector('#audition')!.addEventListener('click',()=>{
 (document.querySelector('#audio') as HTMLInputElement).checked=true;
 audio.enabled=true;audio.setVolume('music',0);audio.setVolume('effects',70);audio.unlock();
 audio.footstep((document.querySelector('#surface') as HTMLSelectElement).value as FootSurface);
});
document.querySelector('#weather')!.addEventListener('change',applyWeather);
document.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(b=>b.onclick=()=>select(b.dataset.map!));
document.querySelector('#reduce')!.addEventListener('change',()=>state.reduceEffects=(document.querySelector('#reduce') as HTMLInputElement).checked);
document.querySelector('#lamps')!.addEventListener('click',()=>{select('borgo');state.pos.x=14;state.pos.y=8;});
document.querySelector('#houses')!.addEventListener('click',()=>{select('borgo');state.pos.x=22;state.pos.y=14;});
document.querySelector('#trees')!.addEventListener('click',()=>{
 select('route1');const map=MAPS.route1;
 for(let y=1;y<map.tiles.length-1;y++)for(let x=1;x<map.tiles[y].length-1;x++){
   const tile=TILES[map.tiles[y][x]];
   if(tile&&!tile.solid&&!tile.water&&map.tiles[y+1][x]==='T') {state.pos.x=x;state.pos.y=y;return;}
 }
});
select('borgo');
// Explicit opt-in drives the production input/update loop; writes/network remain isolated.
let previous=performance.now();
function frame(){
 const now=performance.now(),dt=Math.min(.05,(now-previous)/1000);previous=now;
 const playing=(document.querySelector('#play') as HTMLInputElement).checked;
 if(playing){input.pollGamepads();updateUiInput(stack.top?.uiPanel,input);stack.update(dt);input.endFrame();}
 else {
  const visual=world as unknown as {time:number;atmosphere:{update(dt:number,reduced:boolean):void}};
  const frameChoice=(document.querySelector('#water-frame') as HTMLSelectElement).value;
  visual.time=frameChoice==='auto'?visual.time+dt:Number(frameChoice)/4;
  visual.atmosphere.update(dt,state.reduceEffects);
 }
 beginUiFrame();
 const nativePanel=renderUiPanel(playing?stack.top?.uiPanel:undefined);
 if(!nativePanel||stack.top?.uiPanel?.arena)stack.draw(screen);
 endUiFrame();
 const cache=(world as unknown as {terrain?:{stats():{builds:number;complete:boolean;pixels:number}}}).terrain?.stats()??{builds:0,complete:true,pixels:0};
 document.querySelector('#status')!.textContent=MAPS[state.pos.mapId].name+` · Posizione ${state.pos.x},${state.pos.y} · Passi ${state.stepsTotal} · Cache: ${cache.builds} costruzioni, ${cache.complete?'pronta':'asset in attesa'}, ${cache.pixels} pixel · Nessun salvataggio modificato`;
 requestAnimationFrame(frame);
}frame();

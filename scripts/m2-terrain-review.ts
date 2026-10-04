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
audio.enabled=false;mp.setEnabled(false);
// WorldScene auto-saves on construction: isolate writes in this fixture realm.
Storage.prototype.setItem=()=>{};Storage.prototype.removeItem=()=>{};
const entries=coreTerrainEntries();preloadSprites(entries);await waitForSprites(Object.keys(entries),10000);
const screen=new Screen(document.querySelector('canvas')!),input=new Input();
let state=newGameState(),world:WorldScene;
function select(mapId:string){
 state=newGameState();state.flags['intro-done']=true;state.party=[createMonster('giorgetta',12)];
 const map=MAPS[mapId];const aims=mapId==='route1'?{x:7,y:8}:{x:12,y:10};
 const open=map.tiles.flatMap((row,y)=>[...row].flatMap((ch,x)=>TILES[ch]&&!TILES[ch].solid&&!TILES[ch].water?[{x,y}]:[]));
 open.sort((a,b)=>Math.abs(a.x-aims.x)+Math.abs(a.y-aims.y)-Math.abs(b.x-aims.x)-Math.abs(b.y-aims.y));
 state.pos={mapId,...open[0],facing:'down'};
 state.reduceEffects=(document.querySelector('#reduce') as HTMLInputElement).checked;
 world=new WorldScene(new SceneStack(),input,state);
 (world as unknown as {fadeT:number;bannerFlash:number;banner:unknown}).fadeT=0;
 (world as unknown as {bannerFlash:number;banner:unknown}).bannerFlash=0;
 (world as unknown as {banner:unknown}).banner=null;
 document.querySelector('#status')!.textContent=map.name+' · dati di prova, nessun salvataggio modificato';
}
document.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(b=>b.onclick=()=>select(b.dataset.map!));
document.querySelector('#reduce')!.addEventListener('change',()=>state.reduceEffects=(document.querySelector('#reduce') as HTMLInputElement).checked);
document.querySelector('#trees')!.addEventListener('click',()=>{
 select('route1');const map=MAPS.route1;
 for(let y=1;y<map.tiles.length-1;y++)for(let x=1;x<map.tiles[y].length-1;x++){
   const tile=TILES[map.tiles[y][x]];
   if(tile&&!tile.solid&&!tile.water&&map.tiles[y+1][x]==='T') {state.pos.x=x;state.pos.y=y;return;}
 }
});
select('borgo');
// Draw only: this review fixture never calls update or touches persistent saves.
function frame(){world.draw(screen);const cache=(world as unknown as {terrain?:{stats():{builds:number;complete:boolean;pixels:number}}}).terrain?.stats()??{builds:0,complete:true,pixels:0};document.querySelector("#status")!.textContent=MAPS[state.pos.mapId].name+` · Cache: ${cache.builds} costruzioni, ${cache.complete?"pronta":"asset in attesa"}, ${cache.pixels} pixel · Nessun salvataggio modificato`;requestAnimationFrame(frame)}frame();

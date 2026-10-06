import '../src/styles.css';
import '../src/ui/kit/kit.css';
import {beginUiFrame,endUiFrame,renderUiWorld,renderUiPanel,renderUiFeedback,updateUiInput} from '../src/ui/kit';
import {Screen} from '../src/engine/screen';
import {SceneStack} from '../src/engine/scene';
import {Input} from '../src/engine/input';
import {WorldScene} from '../src/game/world/WorldScene';
import {BattleScene} from '../src/game/battle/BattleScene';
import {newGameState} from '../src/game/state';
import {createMonster} from '../src/game/monster';
import {coreTerrainEntries} from '../src/art/tiles';
import {preloadSprites,waitForSprites} from '../src/engine/assets';
import {audio} from '../src/engine/audio';
import {mp} from '../src/net/mp';
import {PauseScene} from '../src/scenes/PauseScene';
import {PartyScene} from '../src/scenes/PartyScene';
import {BagScene} from '../src/scenes/BagScene';
import {TeachScene} from '../src/scenes/TeachScene';
import {WorldMapScene} from '../src/scenes/WorldMapScene';
import {registerLocalMap} from '../src/game/world/localMap';
import {BAG_ORDER} from '../src/data/items';
import {TRAINERS} from '../src/data/trainers';
import {QuestScene} from '../src/scenes/QuestScene';
import {ShopScene} from '../src/scenes/ShopScene';
import {DexScene} from '../src/scenes/DexScene';
import {AchievementsScene} from '../src/scenes/AchievementsScene';
import {AudioScene} from '../src/scenes/AudioScene';
import {BoxScene} from '../src/scenes/BoxScene';
import {EvolutionScene} from '../src/scenes/EvolutionScene';
import {StarterPreviewScene} from '../src/scenes/StarterPreviewScene';
import {RecallScene} from '../src/scenes/RecallScene';
import {TypesScene} from '../src/scenes/TypesScene';
import {MoraleScene} from '../src/scenes/MoraleScene';
import {SourcesScene} from '../src/scenes/SourcesScene';
import {BackupScene} from '../src/scenes/BackupScene';
import {GovScene} from '../src/scenes/GovScene';
import {TitleScene} from '../src/scenes/TitleScene';
import {FuelScene} from '../src/scenes/FuelScene';
import {TransportScene} from '../src/scenes/TransportScene';
import {MessageBox} from '../src/ui/widgets';
import type {UiPanel} from '../src/ui/kit';
// Isolated realm: production constructors may autosave, but no fixture may write.
Storage.prototype.setItem=()=>{};Storage.prototype.removeItem=()=>{};
audio.enabled=false;mp.setEnabled(false);
const entries=coreTerrainEntries();preloadSprites(entries);await waitForSprites(Object.keys(entries),10000);
const screen=new Screen(document.querySelector('canvas')!),input=new Input(),stack=new SceneStack();
const state=newGameState();state.flags['intro-done']=true;state.flags['opening-v2']=true;
state.party=['berlusconix','giorgetta','ellyna','salvinator','draghimon','movimenton'].map(id=>createMonster(id,26));
const params=new URLSearchParams(location.search);
const routeReview=params.has('routeReview');
if(params.has('roamers'))state.flags['opening-encountered']=true;
if(params.has('souvenirs')){state.flags['cosmetic-fascia-governo']=true;state.flags['cosmetic-megafono-opposizione']=true;}
if(params.has('lesson')){state.flags['controls-intro']=true;state.stepsTotal=0;}
state.pos=routeReview?{mapId:'borgo',x:14,y:8,facing:'up'}:{mapId:params.get('map')??'route1',x:Number(params.get('x')??7),y:Number(params.get('y')??8),facing:(params.get('face')??'down') as 'down'};state.reduceEffects=!params.has('fx');
const routeStatus=document.createElement('output');
if(routeReview){routeStatus.style.cssText='position:fixed;top:64px;right:12px;padding:6px;background:#f4eedc;color:#14161f;z-index:60;font:16px system-ui;pointer-events:none';document.body.append(routeStatus);}
const requested=new URLSearchParams(location.search).get('screen')??'esplorazione';
for(const id of BAG_ORDER)state.bag[id]=state.bag[id]??(id==='caffe'?11:3);
state.money=9320;state.sondaggi=100;state.fuel=14;state.flags['dex-received']=true;state.badges=['auditel','spread'];state.flags['dex-received']=true;
state.party[2].hp=0;state.party[0].hp=64;state.party[3].hp=40;state.party[4].hp=20;
if(requested.startsWith('lotta')){
 if(requested==='lotta-esaurita')state.party[0].moves[0].pp=0;
 const battle=new BattleScene(stack,input,{state,foeTeam:[createMonster('mediocrate',24)],trainer:requested==='lotta-allenatore'?TRAINERS.tycoon:undefined,onEnd:()=>{stack.pop();stack.push(new WorldScene(stack,input,state));}});
 if(requested==='lotta-finale')(battle as unknown as {polemica:{value:number}}).polemica.value=3;
 if(requested==='lotta-crescita'){const b=battle as unknown as {growthReceipt:unknown;stepTimer:number;player:{mon:{exp:number}};state:{party:{exp:number;level:number}[]}};
  const lead=state.party[0];lead.exp+=30;b.growthReceipt={elapsed:0,previousLevel:lead.level,previousExp:lead.exp-80,gained:80,shared:'Divisa 2 alleati +40',modifiers:[]};b.stepTimer=30;}
 stack.push(battle);
}else if(['squadra','squadra-riordina','compagno','borsa','impara','mappa','pianta','missioni','negozio','dex','traguardi','audio','circolo','evoluzione','starter','archivio','tipi','morale','fonti','backup','governo','titolo','carburante','viaggio'].includes(requested)){
 stack.push(new WorldScene(stack,input,state));
 const scene=requested==='squadra'||requested==='compagno'||requested==='squadra-riordina'?new PartyScene(stack,input,state,{mode:'view',startReordering:requested==='squadra-riordina'})
  :requested==='borsa'?new BagScene(stack,input,state,{inBattle:false,fromWorld:true})
  :requested==='impara'?new TeachScene(stack,input,state.party[0],'promessa',()=>{},{party:state.party,source:'level'})
  :requested==='missioni'?new QuestScene(stack,input,state)
  :requested==='negozio'?new ShopScene(stack,input,state,'Benvenuto al discount.')
  :requested==='dex'?new DexScene(stack,input,state)
  :requested==='traguardi'?new AchievementsScene(stack,input,state)
  :requested==='audio'?new AudioScene(stack,input)
  :requested==='circolo'?new BoxScene(stack,input,state)
  :requested==='evoluzione'?new EvolutionScene(stack,input,'giorgetta','giorgiagon',()=>{},{mon:state.party[1],reduceEffects:true})
  :requested==='starter'?new StarterPreviewScene(stack,input,'ellyna',()=>{})
  :requested==='archivio'?new RecallScene(stack,input,state,state.party[0])
  :requested==='tipi'?new TypesScene(stack,input)
  :requested==='morale'?new MoraleScene(stack,input,state)
  :requested==='fonti'?new SourcesScene(stack,input)
  :requested==='backup'?new BackupScene(stack,input,state)
  :requested==='governo'?new GovScene(stack,input,state)
  :requested==='titolo'?new TitleScene(stack,input)
  :requested==='carburante'?new FuelScene(stack,input,state,'route1')
  :requested==='viaggio'?new TransportScene(stack,input,state,'borgo',()=>{})
  :(requested==='mappa'&&registerLocalMap(null),new WorldMapScene(stack,input,state));
 if(requested==='squadra-riordina')(scene as unknown as {moveFrom:number}).moveFrom=2;
 if(requested==='compagno'){(scene as unknown as {summary:unknown;summaryPage:number}).summary=state.party[0];(scene as unknown as {summaryPage:number}).summaryPage=0;}
 stack.push(scene);
}else stack.push(new WorldScene(stack,input,state));
const conversation=new MessageBox();
let choosing=false;
const speaker='Mara · cronista',portrait='/sprites/portraits/journalist.png';
const startConversation=()=>{if(requested==='menu')stack.push(new PauseScene(stack,input,state));if(requested==='tessera'){const pause=new PauseScene(stack,input,state);(pause as unknown as {showCard:boolean}).showCard=true;stack.push(pause);}if(requested==='dialogo-scelte')choosing=true;if(requested==='dialogo')conversation.show(['Una promessa in tre parole. La quarta la paghiamo noi.','Il programma è lungo. La memoria degli elettori, dice il consulente, no.'],undefined,false,speaker,portrait);};
setTimeout(startConversation,600);
const choicePanel=():UiPanel=>({title:'Scegli',subtitle:'Una promessa in tre parole. La quarta la paghiamo noi.',conversation:{speaker,portrait},actions:[{label:'Fammi una domanda.',run:()=>{choosing=false;conversation.show(['Chi paga le promesse quando scade la garanzia?'],undefined,false,speaker,portrait);}},{label:'Passo oltre.',run:()=>{choosing=false;}}],back:{label:'Indietro',run:()=>{choosing=false;}}});
let previous=performance.now();
function frame(){
 const now=performance.now(),dt=Math.min(.05,(now-previous)/1000);previous=now;
 input.pollGamepads();updateUiInput(choosing?choicePanel():stack.top?.uiPanel,input);
 if(conversation.isOpen)conversation.update(dt,input,screen.viewHeight);else if(!choosing)stack.update(dt);beginUiFrame();
 const panel=choosing?choicePanel():stack.top?.uiPanel,native=renderUiPanel(panel);
 renderUiWorld(native||conversation.isOpen?undefined:stack.top?.uiWorld,!native&&Boolean(stack.top?.uiWorldPending));
 renderUiFeedback(native?undefined:stack.top?.uiFeedback);
 screen.configureViewport(Boolean(stack.top?.expandedViewport));
 if(!native||panel?.arena||panel?.conversation||panel?.pause)stack.draw(screen);
 conversation.draw(screen);
 if(routeReview)routeStatus.textContent=`${state.pos.mapId} · ${state.pos.x},${state.pos.y} · ${state.stepsTotal} passi`;
 endUiFrame();input.endFrame();requestAnimationFrame(frame);
}frame();

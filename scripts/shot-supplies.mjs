import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5179'}/scripts/perf-harness.html`,{waitUntil:'networkidle'});
 const result=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts');const {SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState,loadGame}=await import('/src/game/state.ts');const {createMonster,statsOf}=await import('/src/game/monster.ts');
  const {BAG_ORDER,ITEMS}=await import('/src/data/items.ts');const {MOVES}=await import('/src/data/moves.ts');
  const {BagScene}=await import('/src/scenes/BagScene.ts');const {ShopScene}=await import('/src/scenes/ShopScene.ts');
  const {TeachScene}=await import('/src/scenes/TeachScene.ts');const {BattleScene}=await import('/src/game/battle/BattleScene.ts');
  const {shopPrice}=await import('/src/game/governo.ts');const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  const {audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  const entries=Object.fromEntries(BAG_ORDER.map(id=>[`item:${id}`,`items/${id}.png`]));
  for(const id of ['bag','shop','teach'])entries[`ui:${id}`]=`ui/${id}.png`;
  preloadSprites(entries);await waitForSprites(Object.keys(entries),8000);
  const stack=new SceneStack();let pressed='';let tap=null;
  const input={wasPressed:b=>b===pressed,isDown:()=>false,tapInRect:()=>false,consumeTap:()=>tap,clearTap:()=>{tap=null;}};
  const press=(scene,key)=>{pressed=key;scene.update(.1);pressed='';};
  const screen=new Screen(document.createElement('canvas'));const issues=[],shots={};let boxes=[],name='',checked=0;
  const text=screen.text.bind(screen);screen.text=(value,x,y,color,scale=1)=>{
   const m=screen.ctx.getTransform(),base=screen.ctx.canvas.width/240;
   const box={value,x:(m.a*x+m.e)/base,y:(m.d*y+m.f)/base,w:Math.max(0,value.length*6-1)*scale*m.a/base,h:7*scale*m.d/base};
   if(box.x<0||box.y<0||box.x+box.w>240||box.y+box.h>180)issues.push({name,kind:'bounds',...box});
   for(const old of boxes)if(box.w&&old.w&&box.x<old.x+old.w&&box.x+box.w>old.x&&box.y<old.y+old.h&&box.y+box.h>old.y)issues.push({name,kind:'overlap',value,other:old.value});
   boxes.push(box);text(value,x,y,color,scale);
  };
  const draw=(key,scene,capture=false)=>{name=key;boxes=[];scene.draw(screen);checked++;if(capture)shots[key]=screen.ctx.canvas.toDataURL('image/png');};
  const state=newGameState();state.money=50000;state.flags['garante-beaten']=true;
  state.party=['salvinott','ellyna','berlusconix','giorgetta','contemorfo','renzino'].map(id=>createMonster(id,30));
  state.party[0].hp=0;state.party[1].hp=1;state.party[2].status='scandalo';state.party[3].heldItem='caffettiera';
  state.bag=Object.fromEntries(BAG_ORDER.map(id=>[id,9]));
  for(const shop of [false,true])for(const inBattle of shop?[false]:[false,true]){
   const scene=shop?new ShopScene(stack,input,state):new BagScene(stack,input,state,{inBattle});const v=scene.view;
   const before=JSON.stringify(state);
   for(let filter=0;filter<5;filter++){
    v.filter=filter;scene.refresh();
    for(let item=0;item<v.ids.length;item++){
     v.menu.index=item;v.inspect=false;
     draw(`list-${shop}-${inBattle}-${filter}-${v.selected}`,scene,filter===0&&item===0&&!inBattle);
     v.inspect=true;
     for(let p=0;p<3;p++){
      v.page=p;
      for(let scroll=0;scroll<=Math.max(0,v.lines().length-8);scroll++){
       v.scroll=scroll;draw(`guide-${shop}-${inBattle}-${v.selected}-${p}-${scroll}`,scene,v.selected==='caffe'&&p===1&&scroll===0&&!shop&&!inBattle);
      }
     }
    }
   }
   if(JSON.stringify(state)!==before)throw Error('Reading supplies changed state');
  }
  // Empty filter and touch selection keep the same action contract as the pad.
  const empty=newGameState();const bagEmpty=new BagScene(stack,input,empty,{inBattle:false});
  for(let i=0;i<5;i++){bagEmpty.view.filter=i;draw(`empty-${i}`,bagEmpty);}
  const shopState=newGameState();shopState.money=10000;shopState.party=[createMonster('ellyna',20)];
  const shop=new ShopScene(stack,input,shopState);stack.replace(shop);shop.view.menu.index=shop.view.ids.indexOf('caffe');
  shop.view.menu.index=0;draw('shop-touch',shop);tap={x:70,y:96};
  shop.update(.1);tap=null;if(shop.quote||shop.view.menu.index!==2)throw Error('First touch should only select');
  draw('shop-touch-selected',shop);tap={x:70,y:96};shop.update(.1);tap=null;if(shop.quote?.id!=='caffe')throw Error('Second touch should open quote');
  const before=JSON.stringify(shopState),beforeBag=shopState.bag.caffe??0;press(shop,'up');draw('quote',shop,true);press(shop,'b');if(JSON.stringify(shopState)!==before)throw Error('Cancel quote mutated money');
  press(shop,'a');press(shop,'right');const cost=shopPrice(shopState,ITEMS.caffe)*2;press(shop,'a');
  if(shopState.money!==10000-cost||loadGame().money!==shopState.money||shopState.bag.caffe!==(beforeBag+2))throw Error('Quantity purchase or persistence failed');
  shop.msg.close();shop.view.menu.index=shop.view.ids.indexOf('dirPiazza');press(shop,'a');press(shop,'up');
  if(shop.quote?.quantity!==1)throw Error('Reusable directive quantity exceeded one');press(shop,'a');shop.msg.close();press(shop,'a');
  if(shop.quote)throw Error('Owned directive allowed a duplicate quote');shop.msg.close();
  // Quotes do not create funds if the context changes before confirmation.
  shop.view.menu.index=shop.view.ids.indexOf('tessera');press(shop,'a');shopState.money=0;press(shop,'a');
  if(shopState.money||shopState.bag.tessera)throw Error('Stale quote bypassed funds');
  // Bag rebuild preserves selection, saves use, and blocks field kits during battle.
  const healState=newGameState();healState.party=[createMonster('ellyna',20)];healState.party[0].hp=1;healState.bag={caffe:2,spritz:1};
  const bag=new BagScene(stack,input,healState,{inBattle:false});stack.replace(bag);press(bag,'a');press(stack.top,'a');
  if(loadGame().party[0].hp!==healState.party[0].hp||healState.bag.caffe!==1||bag.view.selected!=='caffe')throw Error('Heal save or cursor continuity failed');
  const blockedState=newGameState();blockedState.bag={gilet:1};let used=0;
  const blocked=new BagScene(stack,input,blockedState,{inBattle:true,onUse:()=>used++});stack.replace(blocked);press(blocked,'a');
  if(used||stack.top!==blocked||blockedState.bag.gilet!==1)throw Error('Blocked battle kit escaped bag');
  // Actual held-item swap and Bag -> Party -> Teach, with cancel/commit saves.
  const holdState=newGameState();holdState.party=[createMonster('ellyna',20)];holdState.party[0].heldItem='agendarossa';holdState.bag={gilet:1};
  const heldBag=new BagScene(stack,input,holdState,{inBattle:false});stack.replace(heldBag);const holdBefore=JSON.stringify(holdState);
  press(heldBag,'a');press(stack.top,'a');draw('hold-swap',heldBag);press(heldBag,'b');
  if(JSON.stringify(holdState)!==holdBefore)throw Error('Canceled hold swap changed stock');
  press(heldBag,'a');press(stack.top,'a');draw('hold-swap-confirm',heldBag);press(heldBag,'a');
  if(holdState.party[0].heldItem!=='gilet'||holdState.bag.gilet||holdState.bag.agendarossa!==1||loadGame().party[0].heldItem!=='gilet')throw Error('Hold swap failed to return and persist old item');
  const tmState=newGameState();tmState.party=[createMonster('ellyna',20)];tmState.party[0].moves=[{id:'comizio',pp:7}];tmState.bag={dirPiazza:1};
  const tmBag=new BagScene(stack,input,tmState,{inBattle:false});stack.replace(tmBag);const tmBefore=JSON.stringify(tmState);
  press(tmBag,'a');press(stack.top,'a');if(stack.top.constructor.name!=='TeachScene')throw Error('Directive flow missing');press(stack.top,'b');
  if(JSON.stringify(tmState)!==tmBefore)throw Error('Declining directive changed candidate');
  press(tmBag,'a');press(stack.top,'a');const lesson=stack.top;press(lesson,'a');press(lesson,'a');
  if(tmState.bag.dirPiazza!==1||tmState.party[0].moves.length!==2||loadGame().party[0].moves[1].id!=='piazza'||!tmState.flags['used-directive'])throw Error('Reusable directive commit or save failed');
  // Every move, full and free slots, all comparison pages/scrolls, and commit/cancel.
  for(const id of Object.keys(MOVES))for(const full of [false,true]){
   const mon=createMonster('ellyna',30);if(full)mon.moves=[{id:'comizio',pp:7},{id:'slogan',pp:3},{id:'ruspa',pp:1},{id:'promessa',pp:0}];else mon.moves=[{id:'comizio',pp:7}];
   const scene=new TeachScene(stack,input,mon,id,()=>{});const snapshot=JSON.stringify(mon);
   for(let slot=0;slot<(full?4:1);slot++){
    scene.menu.index=slot;scene.inspect=false;scene.confirm=false;draw(`teach-list-${id}-${full}-${slot}`,scene,id==='piazza'&&full&&slot===0);
    scene.inspect=true;
    for(let p=0;p<3;p++){
     scene.page=p;
     for(let scroll=0;scroll<=Math.max(0,scene.lines().length-9);scroll++){scene.scroll=scroll;draw(`teach-detail-${id}-${full}-${slot}-${p}-${scroll}`,scene,id==='piazza'&&full&&slot===0&&p===0&&scroll===0);}
    }
    scene.inspect=false;scene.confirm=true;draw(`teach-confirm-${id}-${full}-${slot}`,scene,id==='piazza'&&full&&slot===0);
   }
   if(JSON.stringify(mon)!==snapshot)throw Error('Reading moves changed monster');
  }
  for(const full of [false,true]){
   const mon=createMonster('ellyna',20);mon.moves=[{id:'comizio',pp:7},...(full?[{id:'slogan',pp:3},{id:'ruspa',pp:1},{id:'promessa',pp:0}]:[])];mon.hp=1;mon.status='scandalo';mon.heldItem='gilet';
   let learned=0;const teach=new TeachScene(stack,input,mon,'piazza',()=>learned++);stack.replace(teach);const before=JSON.stringify(mon);
   press(teach,'a');press(teach,'b');if(JSON.stringify(mon)!==before||learned)throw Error('Canceled replacement changed monster');
   press(teach,'a');press(teach,'a');press(teach,'a');
   if(learned!==1||mon.hp!==1||mon.status!=='scandalo'||mon.heldItem!=='gilet'||mon.moves.filter(s=>s.id==='piazza').length!==1)throw Error('Move commit corruption');
   if(full&&mon.moves[1].pp!==3)throw Error('Unrelated PP reset');
   teach.msg.close();press(teach,'a');if(learned!==1)throw Error('Duplicate learn callback');
  }
  const bstate=newGameState();bstate.party=[createMonster('ellyna',20)];
  const battle=new BattleScene(stack,input,{state:bstate,foeTeam:[createMonster('salvinott',20)],onEnd:()=>{}});
  // The real level-up entry point now uses the same comparison, with a pure decline.
  stack.replace(battle);const snapshot=JSON.stringify(bstate.party[0]);battle.learnMoveSteps('piazza')[0].run();
  if(stack.top?.constructor.name!=='TeachScene'||stack.top.options.source!=='level')throw Error('Level learning still uses legacy picker');
  press(stack.top,'b');if(stack.top!==battle||JSON.stringify(bstate.party[0])!==snapshot)throw Error('Level learning decline changed PP');
  return{issues,shots,checked};
 });
 mkdirSync('artifacts/screens/supplies',{recursive:true});mkdirSync('artifacts/supplies',{recursive:true});
 writeFileSync('artifacts/supplies/layout.json',JSON.stringify(result.issues,null,2));assert.deepEqual(errors,[]);assert.deepEqual(result.issues,[]);
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/supplies/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS: ${result.checked} supplies/teaching layouts; read purity, live quotes, quantities, touch, persisted healing, battle kit guard, canceled replacements and level-up routing.`);
}finally{await browser.close();}

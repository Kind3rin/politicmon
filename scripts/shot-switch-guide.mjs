import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5179'}/scripts/perf-harness.html`,{waitUntil:'networkidle'});
 const result=await page.evaluate(async()=> {
  const {Screen}=await import('/src/engine/screen.ts');
  const {SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState}=await import('/src/game/state.ts');
  const {createMonster}=await import('/src/game/monster.ts');
  const {DEX_ORDER}=await import('/src/data/species.ts');
  const {PartyScene}=await import('/src/scenes/PartyScene.ts');
  const {BattleScene}=await import('/src/game/battle/BattleScene.ts');
  const {TRAINERS}=await import('/src/data/trainers.ts');
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  const {audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  const entries=Object.fromEntries(DEX_ORDER.map(id=>[`mon:${id}`,`monsters/${id}.png`]));
  preloadSprites(entries);await waitForSprites(Object.keys(entries),5000);
  const stack=new SceneStack();let pressed='';
  const input={wasPressed:b=>b===pressed,isDown:()=>false,tapInRect:()=>false,consumeTap:()=>null};
  const press=(scene,key)=>{pressed=key;scene.update(.1);pressed='';};
  const screen=new Screen(document.createElement('canvas')),issues=[],shots={};let name='',boxes=[],checked=0;
  const text=screen.text.bind(screen);
  screen.text=(value,x,y,color,scale=1)=>{
   const m=screen.ctx.getTransform(),base=screen.ctx.canvas.width/240;
   const b={value,x:(m.a*x+m.e)/base,y:(m.d*y+m.f)/base,w:Math.max(0,value.length*6-1)*scale*m.a/base,h:7*scale*m.d/base};
   if(b.x<0||b.y<0||b.x+b.w>240||b.y+b.h>180)issues.push({name,kind:'bounds',...b});
   for(const old of boxes)if(b.w&&old.w&&b.x<old.x+old.w&&b.x+b.w>old.x&&b.y<old.y+old.h&&b.y+b.h>old.y)issues.push({name,kind:'overlap',value,other:old.value});
   boxes.push(b);text(value,x,y,color,scale);
  };
  const draw=(key,scene,capture=false)=>{name=key;boxes=[];scene.draw(screen);checked++;if(capture)shots[key]=screen.ctx.canvas.toDataURL('image/png');};
  for(let offset=0;offset<DEX_ORDER.length;offset+=6)for(const mode of ['battle-switch','forced-switch'])for(const freeSwitch of [false,true]) {
   const state=newGameState();state.party=DEX_ORDER.slice(offset,offset+6).map(id=>createMonster(id,55));
   state.party[0].status='indagato';if(state.party[1])state.party[1].hp=0;
   const party=new PartyScene(stack,input,state,{mode,freeSwitch,currentUid:state.party[0].uid,onInspect:()=>{}});
   for(let i=0;i<state.party.length;i++){party.index=i;draw(`party-${offset}-${mode}-${freeSwitch}-${i}`,party);}
  }
  const prepare=()=>{
   const state=newGameState();state.party=[createMonster('giorgiagon',45),createMonster('futurorso',45),createMonster('berlusconix',45)];
   state.party[2].hp=0;state.party[1].status='scandalo';state.party[1].heldItem='caffettiera';
   const battle=new BattleScene(stack,input,{state,foeTeam:[createMonster('renzino',5),createMonster('renzino',5)],trainer:TRAINERS.boss,onEnd:()=>{}});
   battle.msg={isOpen:false,update:()=>{},show:()=>{},draw:()=>{}};battle.introT=1.2;battle.queue=[];battle.mode='menu';
   battle.foe.stages.atk=4;battle.foe.stages.spd=-2;battle.foe.mon.moves=[{id:'comizio',pp:35}];
   stack.replace(battle);return{state,battle};
  };
  for(const kind of ['paid','rimpasto','forced']) {
   const {state,battle}=prepare();
   if(kind==='paid'){battle.mainMenu.index=2;press(battle,'a');}
   else if(kind==='forced'){battle.player.mon.hp=0;battle.playerFaintedSteps().at(-1).run();}
   else {
    battle.ask=(_question,yes)=>yes();battle.foe.mon.hp=0;battle.afterFoeDown();battle.mode='queue';
    for(let i=0;i<60&&stack.top===battle;i++)battle.update(.1);
   }
   const party=stack.top;if(party.constructor.name!=='PartyScene')throw Error(`No party: ${kind}`);
   if(kind==='forced'){press(party,'b');if(stack.top!==party)throw Error('Forced switch escaped');}
   press(party,'start');if(stack.top!==party)throw Error('Current or KO candidate inspection accepted');
   press(party,'down');draw(`switch-${kind}`,party,true);
   const before=JSON.stringify([state,battle.player,battle.foe]);
   const random=Math.random;Math.random=()=>{throw Error('Inspection consumed live RNG');};
   try {
    press(party,'start');const intel=stack.top;
    if(intel.constructor.name!=='BattleIntelScene')throw Error('START does not inspect candidate');
    for(let p=0;p<2;p++){
     intel.page=p;
     for(let scroll=0;scroll<=Math.max(0,intel.lines().length-9);scroll++){
      intel.scroll=scroll;draw(`dossier-${kind}-${p}-${scroll}`,intel,scroll===0);
     }
    }
    intel.page=1;
    if(!intel.lines().join(' ').includes(kind==='paid'?'IL NEMICO ATTACCA':'RIMPASTO GRATIS'))throw Error('Incorrect cost in dossier');
    if(intel.defender.stages.atk!==0||intel.defender.stages.spd!==0)throw Error('TABULA RASA forecast incorrect');
    press(intel,'right');press(intel,'b');
   }finally{Math.random=random;}
   if(stack.top!==party||JSON.stringify([state,battle.player,battle.foe])!==before)throw Error('Inspection mutated live battle');
   press(party,'down');press(party,'start');if(stack.top!==party)throw Error('KO candidate inspected');press(party,'up');
   const pp=battle.foe.mon.moves[0].pp;
   press(party,'a');if(stack.top!==battle||battle.player.mon.uid!==state.party[1].uid)throw Error('Candidate not switched');
   if(battle.foe.stages.atk!==0||battle.foe.stages.spd!==0)throw Error('Actual entry differs from preview');
   for(let i=0;i<180&&battle.mode==='queue';i++)battle.update(.1);
   if(battle.foe.mon.moves[0].pp!==pp-(kind==='paid'?1:0))throw Error(`Counterattack cost wrong: ${kind}`);
  }
  return{issues,shots,checked};
 });
 mkdirSync('artifacts/screens/switch-guide',{recursive:true});
 mkdirSync('artifacts/premium-next',{recursive:true});
 writeFileSync('artifacts/premium-next/switch-layout.json',JSON.stringify(result.issues,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(result.issues,[]);
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/switch-guide/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS: ${result.checked} switch layouts; real paid, free and forced switches; no inspection RNG/PP/flags/save mutation; entry and counterattack parity.`);
}finally{await browser.close();}

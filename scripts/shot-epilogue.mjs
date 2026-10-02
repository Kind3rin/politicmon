import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const engine=process.env.TEST_BROWSER??'chromium';
const browser=await ({chromium,webkit})[engine].launch();
try {
 const page=await browser.newPage({viewport:{width:960,height:720}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5187'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState,importSaveCode,exportSaveCode}=await import('/src/game/state.ts');
  const {newElectionState,calculateElectionResult}=await import('/src/game/election.ts');
  const {addAlly}=await import('/src/game/coalition.ts');
  const {Atto3EndingScene}=await import('/src/scenes/Atto3EndingScene.ts'),{SliceEndingScene}=await import('/src/scenes/SliceEndingScene.ts');
  const {MonumentScene}=await import('/src/scenes/MonumentScene.ts'),{MafiaScene}=await import('/src/scenes/MafiaScene.ts');
  const {GenovaTechnoScene}=await import('/src/scenes/GenovaTechnoScene.ts'),{PauseScene}=await import('/src/scenes/PauseScene.ts');
  const {TECHNO_SEQUENCE}=await import('/src/game/genovaTechno.ts');
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts'),{audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  const ids=['government_cohesive','government_fractured','opposition_cohesive','opposition_fractured','mafia','techno','monument','sash','bell','megaphone','membership','monument_0','monument_1','monument_2','monument_3'];
  preloadSprites(Object.fromEntries(ids.map(id=>[`epilogue:${id}`,`ui/epilogue/${id}.png`])));await waitForSprites(ids.map(id=>`epilogue:${id}`));
  preloadSprites({'campaign:photo':'ui/campaign/photo.png','ui:candidate-avatar':'chars/player_south.png'});await waitForSprites(['campaign:photo','ui:candidate-avatar']);
  const canvas=document.createElement('canvas'),screen=new Screen(canvas),input=new Input();
  let key='',name='',views=0;input.wasPressed=b=>key===b;
  const press=(scene,b)=>{key=b;scene.update(.01);key='';};
  const shots={},overflow=[],text=[];const original=screen.text.bind(screen);
  screen.text=(s,x,y,color,scale=1)=>{text.push(s);if(s&&(x<0||y<0||x+(s.length*6-1)*scale>240||y+7*scale>180))overflow.push({name,s,x,y});original(s,x,y,color,scale);};
  const capture=(id,scene,keep=true)=>{name=id;text.length=0;scene.draw(screen);views++;if(keep)shots[id]=canvas.toDataURL('image/png');};
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  for(const government of [false,true])for(const fractured of [false,true])for(const morale of [5,60,95]){
   const s=newGameState(),base=newElectionState(true),local=government?[60,60,60,40,40]:[60,60,40,40,40];
   s.election={...base,phase:'resolved',result:calculateElectionResult(base.districts.map((d,i)=>({...d,localConsensus:local[i]})),true)};
   s.coalition=addAlly(s.coalition,'campo_secretary').state;
   s.coalition={...s.coalition,members:s.coalition.members.map(m=>({...m,status:fractured?'strained':'reconciled'}))};
   if(fractured)s.flags['coalition-broken:generorso']=true;
   s.flags['a3.future.ally']=true;s.flags['a3.diplomacy.autonomy']=true;s.flags['atto3-photo-choice:panoramica']=true;
   s.morale.trust=morale;s.morale.cohesion=morale;s.morale.promises=[{id:'bus',status:'repaired',dueAt:3},{id:'sportello',status:'broken',dueAt:3},{id:'traghetto',status:'kept',dueAt:3}];
   const stack=new SceneStack();let done=0;const scene=new Atto3EndingScene(stack,input,s,()=>done++);stack.push(scene);
   const before=JSON.stringify(s);press(scene,'b');check(JSON.stringify(s)===before&&stack.top===scene,'first page B committed');
   for(let i=0;i<scene.pages.length;i++){capture(`ending-${government}-${fractured}-${morale}-${i}`,scene,morale===60);press(scene,'a');if(i<scene.pages.length-1)check(JSON.stringify(s)===before,'page navigation mutated state');}
   check(done===1&&!stack.top&&s.money===JSON.parse(before).money+2500,'ending claim wrong');press(scene,'a');check(done===1,'ending duplicate callback');
   const restored=importSaveCode(exportSaveCode(s));check(restored.flags.atto3Complete,'ending save lost');
   const card=new PauseScene(new SceneStack(),input,restored);card.showCard=true;capture(`card-${government}-${fractured}`,card);press(card,'start');capture(`card-${government}-${fractured}-awards`,card);
  }
  for(let level=0;level<4;level++){
   const s=newGameState();s.monumentLevel=level;s.money=100000;const stack=new SceneStack(),scene=new MonumentScene(stack,input,s);stack.push(scene);
   capture(`monument-${level}`,scene);press(scene,'start');for(let i=0;i<scene.pages.length;i++){capture(`monument-${level}-story-${i}`,scene);press(scene,'a');}
   if(level<3){const before=JSON.stringify(s);press(scene,'a');capture(`monument-${level}-preview`,scene);press(scene,'b');check(JSON.stringify(s)===before,'monument B paid');press(scene,'a');while(scene.mode==='review'){capture(`monument-${level}-review-${scene.page}`,scene);press(scene,'a');}check(s.monumentLevel===level+1,'monument not built');capture(`monument-${level}-built`,scene);}
   else {const card=new PauseScene(new SceneStack(),input,s);card.showCard=true;press(card,'start');capture('monument-title-in-card',card);check(text.join(' ').includes('AUTOPROCLAMATO'),'title missing');}
  }
  for(const reduced of [false,true]){
   const s=newGameState();s.reduceEffects=reduced;s.sondaggi=99;const stack=new SceneStack(),scene=new GenovaTechnoScene(stack,input,s);stack.push(scene);
   const before=JSON.stringify(s);scene.update(100);capture(`techno-${reduced}-ready`,scene);check(scene.run.index===0,'intro timer ran');
   press(scene,'a');press(scene,'b');capture(`techno-${reduced}-pause`,scene);const remaining=scene.run.remaining;scene.update(100);check(scene.run.remaining===remaining,'pause timer ran');press(scene,'a');
   if(!reduced){press(scene,'left');check(scene.run.index===0,'early input hit');}
   for(let i=0;i<6;i++){if(!reduced)while(scene.run.remaining>.68)scene.update(.01);capture(`techno-${reduced}-cue-${i}`,scene);press(scene,TECHNO_SEQUENCE[i]);}
   capture(`techno-${reduced}-result`,scene);check(scene.run.hits===6&&s.money===JSON.parse(before).money+1200&&s.sondaggi===100,'techno exact reward');
   const practice=new GenovaTechnoScene(new SceneStack(),input,s);practice.run={...practice.run,reducedMotion:true};press(practice,'a');for(const key of TECHNO_SEQUENCE)press(practice,key);capture(`techno-${reduced}-practice`,practice);check(practice.paid.money===0,'practice paid twice');
  }
  {const s=newGameState(),stack=new SceneStack(),scene=new GenovaTechnoScene(stack,input,s);stack.push(scene);const before=JSON.stringify(s);press(scene,'a');press(scene,'b');press(scene,'b');check(!stack.top&&JSON.stringify(s)===before,'rhythm cancel changed save');}
  for(const index of [1,2,3]){
   const s=newGameState();s.money=5000;const scene=new MafiaScene(new SceneStack(),input,s);scene.menu.index=index;
   const before=JSON.stringify(s),random=Math.random;let rolls=0;Math.random=()=>{rolls++;return .1;};
   try{capture(`mafia-${index}`,scene);press(scene,'a');capture(`mafia-${index}-review`,scene);press(scene,'b');check(JSON.stringify(s)===before&&rolls===0,'mafia cancellation spent/RNG');press(scene,'a');while(scene.pending){capture(`mafia-${index}-dossier-${scene.page}`,scene);press(scene,'a');}check(index===3?rolls===1:rolls===0,'random consumed outside bet');check(s.money===5000+({1:-400,2:-1200,3:400})[index],'mafia wrong transaction');}
   finally{Math.random=random;}
  }
  for(const index of [0,1,2]){
   const s=newGameState();s.money=5000;const scene=new MafiaScene(new SceneStack(),input,s);scene.mode='market';scene.marketMenu.index=index;const before=JSON.stringify(s);
   press(scene,'a');capture(`market-${index}-preview`,scene);press(scene,'b');check(JSON.stringify(s)===before,'market B spent');press(scene,'a');while(scene.pending){capture(`market-${index}-page-${scene.page}`,scene);press(scene,'a');}check(s.money===5000-[900,1500,1100][index],'market exact price');
  }
  for(const index of [1,2,3]){
   const s=newGameState();s.money=0;const scene=new MafiaScene(new SceneStack(),input,s);scene.menu.index=index;const before=JSON.stringify(s);
   press(scene,'a');while(scene.pending)press(scene,'a');check(JSON.stringify(s)===before,'unfunded backroom transaction mutated state');
  }
  {const s=newGameState(),scene=new GenovaTechnoScene(new SceneStack(),input,s);press(scene,'right');check(scene.run.reducedMotion,'accessible mode unavailable');press(scene,'left');check(!scene.run.reducedMotion,'timed mode unavailable');press(scene,'a');while(scene.phase==='play')scene.update(.25);capture('techno-timeout-result',scene);check(scene.run.hits===0&&scene.run.misses===6&&scene.paid.money===200,'timeouts did not produce exact result');}
  for(const broken of [false,true]){const s=newGameState();if(broken)s.flags['coalition-broken:generorso']=true;const scene=new SliceEndingScene(new SceneStack(),input,s,()=>{});capture(`photo-ending-${broken}`,scene);}
  return {shots,overflow,views};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.overflow,[]);
 mkdirSync(`artifacts/screens/epilogue/${engine}`,{recursive:true});for(const [name,data] of Object.entries(result.shots))writeFileSync(`artifacts/screens/epilogue/${engine}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS: ${result.views} native views; four endings at three morale levels, persisted souvenirs, monuments preview/cancel/pay, timed and accessible rhythm, one-time rewards, all six clientelist transactions, zero overflow.`);
}finally{await browser.close();}

import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5186'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState}=await import('/src/game/state.ts'),{newElectionState}=await import('/src/game/election.ts');
  const {CAMPAIGN_CHOICES,previewCampaignDecision}=await import('/src/game/campaignDecisions.ts');
  const {addAlly,applyLineRedEvent}=await import('/src/game/coalition.ts');
  const {PhotoChoiceScene}=await import('/src/scenes/PhotoChoiceScene.ts'),{FutureChoiceScene}=await import('/src/scenes/FutureChoiceScene.ts');
  const {DiplomacyChoiceScene}=await import('/src/scenes/DiplomacyChoiceScene.ts'),{CoalitionScene}=await import('/src/scenes/CoalitionScene.ts');
  const {ElectionResultsScene}=await import('/src/scenes/ElectionResultsScene.ts');
  const {DistrictScene}=await import('/src/scenes/DistrictScene.ts');
  const {resolveDistrictPromise}=await import('/src/game/districtCampaign.ts');
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts'),{audio}=await import('/src/engine/audio.ts'); audio.enabled=false;
  const ids=['photo','future','diplomacy','coalition','election'];preloadSprites(Object.fromEntries(ids.map(id=>[`campaign:${id}`,`ui/campaign/${id}.png`])));
  await waitForSprites(ids.map(id=>`campaign:${id}`));
  const canvas=document.createElement('canvas'),screen=new Screen(canvas),input=new Input();
  let key='',name='',views=0;input.wasPressed=b=>key===b; const press=(scene,b)=>{key=b;scene.update(.01);key='';};
  const shots={},overflow=[],text=[]; const original=screen.text.bind(screen);
  screen.text=(s,x,y,color,scale=1)=>{text.push(s);if(s&&(x<0||y<0||x+(s.length*6-1)*scale>240||y+7*scale>180))overflow.push({name,s,x,y});original(s,x,y,color,scale);};
  const capture=(id,scene,keep=true)=>{name=id;text.length=0;scene.draw(screen);views++;if(keep)shots[id]=canvas.toDataURL('image/png');};
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  function ready(){const s=newGameState();s.money=2000;s.sondaggi=99;s.election=newElectionState(true);
   for(const id of ['campo_secretary','quantum_centrist'])s.coalition=addAlly(s.coalition,id).state;
   for(const id of ['campo_secretary','quantum_centrist','civic_mayor'])s.flags[`coalition-candidate-seen:${id}`]=true;return s;}
  let cases=0;
  for(const kind of ['photo','future','diplomacy'])for(let index=0;index<CAMPAIGN_CHOICES[kind].keys.length;index++)for(const strained of [false,true]){
   cases++;const s=ready();if(strained)s.coalition=applyLineRedEvent(s.coalition,kind==='photo'?13:10).state;
   const stack=new SceneStack(),scene=kind==='photo'?new PhotoChoiceScene(stack,input,s):kind==='future'?new FutureChoiceScene(stack,input,s):new DiplomacyChoiceScene(stack,input,s,'loyalty');
   stack.push(scene); for(let i=0;i<index;i++)press(scene,'down');const label=`${kind}-${index}-${strained?'strained':'healthy'}`,before=JSON.stringify(s);
   capture(label,scene);const preview=previewCampaignDecision(s,kind,index);check(preview.ok,`${label}: unavailable`);
   press(scene,'a');capture(`${label}-review`,scene);check(JSON.stringify(s)===before,'review mutated state');
   press(scene,'b');check(JSON.stringify(s)===before&&stack.top===scene,'B did not cancel safely');
   press(scene,'a');let guard=0;while(!scene.result&&guard++<8){capture(`${label}-page-${scene.page}`,scene);press(scene,'a');}
   check(scene.result?.ok,'commit did not complete');check(s.money===preview.patch.money&&s.morale.cohesion===JSON.parse(before).morale.cohesion+preview.cohesionDelta,'preview differs from state');
   const committed=JSON.stringify(s);capture(`${label}-result`,scene);
   press(scene,'b');check(!stack.top&&JSON.stringify(s)===committed,'result exit mutated state');
  }
  for(const kind of ['photo','future','diplomacy']){
   const s=ready();s.money=0;s.coalition=applyLineRedEvent(s.coalition,10).state;
   const stack=new SceneStack(),scene=kind==='photo'?new PhotoChoiceScene(stack,input,s):kind==='future'?new FutureChoiceScene(stack,input,s):new DiplomacyChoiceScene(stack,input,s,'autonomy');
   if(kind==='photo')press(scene,'down');stack.push(scene);const before=JSON.stringify(s);press(scene,'a');capture(`${kind}-no-funds`,scene);check(JSON.stringify(s)===before,'denied choice mutated state');
  }
  for(const id of ['campo_secretary','quantum_centrist','civic_mayor','steel_governor','generorso'])for(const status of ['candidate','allied','strained','reconciled']){
   const s=ready();s.flags[`coalition-candidate-seen:${id}`]=true;s.coalition={...s.coalition,members:status==='candidate'?[]:[{allyId:id,status,reconciliationSpent:status==='reconciled',violationCount:status==='allied'?0:1}]};
   const scene=new CoalitionScene(new SceneStack(),input,s,id);capture(`coalition-${id}-${status}`,scene);
   if(status!=='candidate')check(text.includes(({allied:'PATTO ATTIVO',strained:'PATTO TESO',reconciled:'PATTO RIPARATO'})[status]),'missing pact status');
   press(scene,'start');capture(`coalition-${id}-${status}-net`,scene,false);press(scene,'b');
  }
  const s=ready(),stack=new SceneStack(),coalition=new CoalitionScene(stack,input,s,'campo_secretary');stack.push(coalition);
  const before=JSON.stringify(s);press(coalition,'a');capture('coalition-remove-confirm',coalition);press(coalition,'b');check(stack.top===coalition&&JSON.stringify(s)===before&&coalition.pendingRemove===null,'B removal cancelled incorrectly');
  const old=ready();old.coalition=applyLineRedEvent(old.coalition,10).state;old.flags['reconcile-token:campo_secretary:v1']=true;
  const repair=new CoalitionScene(new SceneStack(),input,old,'campo_secretary');capture('coalition-old-token',repair);press(repair,'a');capture('coalition-old-token-redeemed',repair);
  check(old.money===2000&&old.coalition.members[0].status==='reconciled','historic repair inaccessible');
  for(const id of ['nord','centro','sud','isole','feed']) {
   const state=ready(),stack=new SceneStack(); let debate=0;
   const district=new DistrictScene(stack,input,state,id,()=>debate++);stack.push(district);
   for(let i=0;i<4;i++){capture(`district-${id}-${i}`,district);press(district,'down');}
   const before=JSON.stringify(state);press(district,'b');check(JSON.stringify(state)===before&&!stack.top&&debate===0,'district B changed state');
   if(id==='centro'){
    const strained=ready();strained.coalition=applyLineRedEvent(strained.coalition,10).state;
    const scene=new DistrictScene(new SceneStack(),input,strained,id,()=>{});press(scene,'down');press(scene,'down');
    const expected=resolveDistrictPromise(strained.election,strained.coalition,strained.money,id,true),oldCohesion=strained.morale.cohesion;
    capture('district-centro-risk-after-strain',scene);press(scene,'a');
    check(expected.ok&&JSON.stringify(strained.election)===JSON.stringify(expected.election),'district preview used wrong coalition');
    check(strained.morale.cohesion===Math.max(0,oldCohesion-expected.strained.length*8-expected.broken.length*16),'district morality missing');
    const after=JSON.stringify(strained);press(scene,'a');check(JSON.stringify(strained)===after,'district committed twice');
   }
  }
  for(const bossWon of [false,true]){
   let done=0;const result={bossWon,seats:bossWon?3:2,ending:bossWon?'government':'opposition',districts:['nord','centro','sud','isole','feed'].map((id,i)=>({id,beforeRecount:i<3?50:55,afterRecount:i<3?(bossWon?51:49):55,seat:i<3?(bossWon?1:0):1,recounted:i<3}))};
   // Seats reflect all winning districts, independent of the boss result.
   result.seats=result.districts.reduce((n,d)=>n+d.seat,0);result.ending=result.seats>=3?'government':'opposition';
   const stack=new SceneStack(),scene=new ElectionResultsScene(stack,input,result,()=>done++);stack.push(scene);
   capture(`election-${bossWon}-sealed`,scene);press(scene,'a');capture(`election-${bossWon}-revealed`,scene);
   check(done===0&&stack.top===scene,'reveal skipped result');press(scene,'b');check(done===1&&!stack.top,'result callback missing');
  }
  return {shots,overflow,views,cases};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.overflow,[]);
 mkdirSync('artifacts/screens/campaign-ui',{recursive:true});
 for(const [name,data] of Object.entries(result.shots))writeFileSync(`artifacts/screens/campaign-ui/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS: ${result.views} rendered views, ${result.cases} decisions, pure preview/B cancellation/exact commit, 20 ally states/net effects, historic repair, five districts, two election endings, zero overflow.`);
}finally{await browser.close();}

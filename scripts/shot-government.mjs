import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const base=process.env.BASE_URL??'http://127.0.0.1:5188';
const earned=JSON.parse(readFileSync('docs/controls-campaign-proof.json','utf8')).campaigns.find(c=>c.starter==='giorgetta'&&c.earnedEndingCode).earnedEndingCode;
const reports=[];mkdirSync('artifacts/screens/government',{recursive:true});
for(const [engine,type]of[['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{
  const page=await browser.newPage({viewport:{width:960,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/scripts/perf-harness.html');
  const r=await page.evaluate(async earned=>{
   const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
   const {importSaveCode,newGameState,loadGame}=await import('/src/game/state.ts'),{GovScene}=await import('/src/scenes/GovScene.ts');
   const {ContentScene,CONTENT_CATALOG}=await import('/src/scenes/ContentScene.ts');
   const {MINISTERI,MINISTERO_ORDER,shopPrice,expMalus,moneyMalus,hasMinistro,curaPassiva}=await import('/src/game/governo.ts');
   const {statsOf}=await import('/src/game/monster.ts'),{ITEMS}=await import('/src/data/items.ts');
   const {audio}=await import('/src/engine/audio.ts');audio.enabled=false;
   const {preloadSprites,waitForSprites,spriteStatus}=await import('/src/engine/assets.ts');preloadSprites({'campaign:government':'ui/campaign/government.png'});await waitForSprites(['campaign:government'],10000);if(spriteStatus('campaign:government')!=='ready')throw Error('Government art not decoded');
   const state=importSaveCode(earned),canvas=document.createElement('canvas');document.body.append(canvas);const screen=new Screen(canvas),input=new Input(),stack=new SceneStack();
   const baseline=JSON.stringify(state),saved=localStorage.getItem('politicmon-save-v18__s0');const scene=new GovScene(stack,input,state);stack.push(scene);
   const check=(ok,msg)=>{if(!ok)throw Error(msg);};
   const codes={a:'KeyZ',b:'KeyX',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
   const press=b=>{document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[b],bubbles:true,cancelable:true}));stack.update(.1);input.endFrame();document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[b],bubbles:true,cancelable:true}));};
   const shots={},text=[],bounds=[];let view='';const original=screen.text.bind(screen);
   screen.text=(value,x,y,color,scale=1)=>{text.push(value);if(value&&(x<0||y<0||x+(value.length*6-1)*scale>240.1||y+7*scale>180.1))bounds.push({view,value,x,y});original(value,x,y,color,scale);};
   const shot=name=>{view=name;text.length=0;stack.draw(screen);shots[name]=canvas.toDataURL('image/png');return [...text];};
   const expectPure=()=>{check(JSON.stringify(state)===baseline,'Reading or cancellation mutated campaign');check(localStorage.getItem('politicmon-save-v18__s0')===saved,'Reading or cancellation wrote save');};
   for(const id of MINISTERO_ORDER){
    shot(id+'-list');press('a');const rendered=[];
    for(let p=0;p<scene.pages().length;p++){rendered.push(...shot(id+'-dossier-'+p));if(p<scene.pages().length-1)press('a');}
    const body=rendered.join(' ').replace(/\s+/g,' ');
    for(const key of ['desc','malus'])check(body.includes(MINISTERI[id][key].toUpperCase().replace(/\s+/g,' ')),id+': truncated '+key);
    press('b');expectPure();press('down');
   }
   check(scene.index===0,'Ministry navigation did not wrap');
   const choose=(index=0)=>{press('a');for(let n=0;n<20&&stack.top===scene;n++)press('a');check(stack.top.constructor.name==='PartyScene','Dossier did not open real party');for(let i=0;i<index;i++)press('down');press('a');check(scene.pending===state.party[index],'Candidate differs from actual selection');};
   choose();shot('nomination-cancel');expectPure();press('b');expectPure();
   const sign=()=>{for(let n=0;n<20&&scene.page>=0;n++)press('a');check(scene.page===-1,'Signature did not return to list');};
   choose();sign();check(state.ministri.economia===state.party[0].uid,'Nomination not assigned');check(loadGame().ministri.economia===state.party[0].uid,'Nomination not saved');shot('economia-active');
   const effects={price:shopPrice(state,ITEMS.caffe),exp:expMalus(state),money:moneyMalus(state)};check(effects.exp===.92,'Economy training cost inactive');
   const confirmed=JSON.stringify(state);choose();check(JSON.stringify(state)===confirmed,'Choosing incumbent removed them before signature');shot('dismissal-review');press('b');check(JSON.stringify(state)===confirmed,'Cancelled dismissal changed government');
   choose();sign();check(!state.ministri.economia,'Confirmed dismissal retained assignment');check(expMalus(state)===1,'Dismissal retained downside');
   choose();sign();press('down');press('down');choose();const transfer=shot('transfer-review');check(transfer.join(' ').includes('LASCIA MIN. ECONOMIA.'),'Transfer does not disclose previous office');sign();check(!state.ministri.economia&&state.ministri.esteri===state.party[0].uid,'Transfer left duplicate offices');check(shopPrice(state,ITEMS.caffe)<effects.price,'Foreign ministry price benefit missing');check(moneyMalus(state)===.92,'Foreign ministry payout cost missing');shot('esteri-active');
   state.party[0].hp=0;check(!hasMinistro(state,'esteri')&&moneyMalus(state)===1,'KO did not suspend benefits and costs');shot('minister-ko');
   const orphan=state.party.shift();state.boxed.push(orphan);check(!hasMinistro(state,'esteri'),'Reserve retained active ministry');check(scene.status()==='FUORI SQUADRA','Reserve status is misleading');shot('minister-reserve');
   const healthy=state.party[0];healthy.hp=1;const expected=Math.min(statsOf(healthy).hp,1+Math.max(1,Math.round(statsOf(healthy).hp*.03)));check(curaPassiva(state)&&healthy.hp===expected&&orphan.hp===0,'Passive recovery differs from description');
   state.party=[];scene.index=4;press('a');for(let n=0;n<20&&scene.page>=0;n++)press('a');check(stack.top===scene&&scene.page===-1,'Empty party became stuck');shot('empty-party');press('b');check(stack.top===undefined,'B did not close government');
   for(const [label,catalogState]of[['fresh',newGameState()],['earned',importSaveCode(earned)]]){
    const before=JSON.stringify(catalogState),catalog=new ContentScene(stack,input,catalogState);stack.push(catalog);
    for(const entry of CONTENT_CATALOG){
     const rendered=[];for(let p=0;p<catalog.pages().length;p++){rendered.push(...shot(`content-${label}-${catalog.index}-${p}`));press('a');}
     check(rendered.join(' ').includes(entry.description),'Catalog truncated description');
     if(!entry.unlocked(catalogState))check(rendered.join(' ').includes(entry.requirement),'Catalog truncated unlock requirement');
     press('down');check(catalog.page===0,'Chapter selection retained previous page');
    }
    check(catalog.index===0&&JSON.stringify(catalogState)===before,'Catalog consultation mutated state or failed wrap');press('b');
   }
   return {shots,bounds,initial:JSON.parse(baseline),effects,completeDossiers:6,catalogStates:20,cancellationPure:true,signatureRequired:true,transferSaved:true,koAndReserveSuspension:true,passiveRecoveryVerified:true};
  },earned);
  assert.deepEqual(errors,[]);assert.deepEqual(r.bounds,[]);for(const [name,data]of Object.entries(r.shots))writeFileSync(`artifacts/screens/government/${engine}-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  const {shots,...proof}=r;reports.push({engine,base,views:Object.keys(shots).length,...proof,physicalDevice:false});console.log(`PASS ${engine}: ${Object.keys(shots).length} views, six complete dossiers, cancel/confirm/transfer, KO/reserve and passive recovery`);
 }finally{await browser.close();}
}
writeFileSync('artifacts/reports/government.json',JSON.stringify(reports,null,2)+'\n');

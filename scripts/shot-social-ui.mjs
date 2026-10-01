import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5179'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts');
  const {Input}=await import('/src/engine/input.ts');
  const {SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState}=await import('/src/game/state.ts');
  const {createMonster}=await import('/src/game/monster.ts');
  const {SPECIES}=await import('/src/data/species.ts');
  const {MOVES}=await import('/src/data/moves.ts');
  const {DuelLobbyScene}=await import('/src/scenes/DuelLobbyScene.ts');
  const {TalkScene}=await import('/src/scenes/TalkScene.ts');
  const {TradeScene}=await import('/src/scenes/TradeScene.ts');
  // Reuse the scene module graph's singleton, including Vite HMR versions.
  const mp=globalThis.__mp;
  const {preloadCoreSprites}=await import('/src/engine/preload.ts');
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  const {audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  await preloadCoreSprites();preloadSprites({'social:network':'ui/social/network.png'});await waitForSprites(['social:network']);
  const canvas=document.createElement('canvas'),screen=new Screen(canvas),input=new Input();
  const state=newGameState();state.party=Object.keys(SPECIES).slice(0,6).map(id=>createMonster(id,60));
  let key='',view='';input.wasPressed=b=>b===key;
  const press=(scene,b,dt=.02)=>{key=b;scene.update(dt);key='';};
  const shots={},texts={},overflow=[],original=screen.text.bind(screen);
  screen.text=(value,x,y,color,scale=1)=>{(texts[view]??=[]).push({value,x,y});if(value&&(x<0||y<0||x+(value.length*6-1)*scale>240||y+7*scale>180))overflow.push({view,value,x,y});original(value,x,y,color,scale);};
  const capture=(name,scene)=>{view=name;scene.draw(screen);shots[name]=canvas.toDataURL('image/png');};
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  const sent=[];mp.sendDuel=(...args)=>sent.push(args);mp.remotes.clear();
  for(let i=0;i<12;i++)mp.remotes.set('peer-'+i,{id:'peer-'+i,nick:`SFIDANTE ${String(i).padStart(2,'0')}`,partyPreview:[],speciesId:'renzino'});
  const lobby=new DuelLobbyScene(new SceneStack(),input,state);
  for(let i=0;i<12;i++){
   capture('lobby-'+i,lobby);check(texts['lobby-'+i].some(t=>t.value===`► SFIDANTE ${String(i).padStart(2,'0')}`),`focused challenger invisible ${i} at ${lobby.index}: ${texts['lobby-'+i].map(t=>t.value).join('|')}`);press(lobby,'down');
  }
  check(lobby.index===0,'lobby did not wrap');press(lobby,'up');check(lobby.index===11,'lobby reverse wrap failed');
  press(lobby,'a');check(sent.at(-1)[1]==='peer-11','invited wrong peer');capture('lobby-invite',lobby);
  const timer=lobby.timer;lobby.update(.25);check(Math.abs(lobby.timer-(timer-.25))<1e-6,'invitation timer stalled');press(lobby,'b');check(!lobby.waiting,'invitation cancel failed');
  mp.remotes.clear();capture('lobby-empty',lobby);
  const stack=new SceneStack(),talk=new TalkScene(stack,input,{peerId:'qa-peer',peerNick:'INTERLOCUTOR',talkId:'social-qa',role:'guest'});
  stack.push(talk);talk.composer.text='BOZZA IN CORSO';
  talk.lines=Array.from({length:40},(_,i)=>({me:i%2===0,text:`RIGA ${i}: il programma promette un allegato leggibile e finisce con FINALE ${i}.`}));
  capture('talk-compose',talk);const sentBefore=sent.length;press(talk,'start');
  check(talk.history,'START did not open history');
  while(talk.historyPage>0)press(talk,'left');
  const count=Math.max(1,Math.ceil(talk.historyLines().length/12));
  for(let p=0;p<count;p++){capture(`talk-history-${p}`,talk);press(talk,'right');}
  const rendered=Array.from({length:count},(_,p)=>texts[`talk-history-${p}`].filter(t=>t.x===10&&t.y>=31&&t.y<=130).map(t=>t.value).join(' ')).join(' ').replace(/\s+/g,' ');
  for(const line of talk.lines)check(rendered.includes(line.text),'history truncated message '+line.text);
  check(sent.length===sentBefore,'history sent network messages');press(talk,'b');
  check(!talk.history&&talk.composer.text==='BOZZA IN CORSO','history changed composer draft');
  for(const tab of ['frasi','keys','emote']){talk.composer.tab=tab;capture('talk-'+tab,talk);}
  const host=new TalkScene(new SceneStack(),input,{peerId:'qa-peer',peerNick:'INTERLOCUTOR',talkId:'host-qa',role:'host'});capture('talk-waiting',host);
  const wait=host.waitT;host.update(.25);check(Math.abs(host.waitT-(wait-.25))<1e-6,'chat wait timer stalled');
  const trade=new TradeScene(new SceneStack(),input,state,{peerId:'qa-peer',peerNick:'INTERLOCUTOR'});
  mp.trade.phase='negotiating';mp.trade.peerNick='INTERLOCUTOR';mp.trade.mySeq=1;mp.trade.myOfferUid=state.party[0].uid;
  const before=JSON.stringify(state);
  for(const id of Object.keys(SPECIES)){
   const offer=createMonster(id,60);mp.trade.peerOffer=offer;capture('trade-'+id,trade);
   check(texts['trade-'+id].some(t=>t.value===SPECIES[id].name),'offer name truncated');
   for(const type of SPECIES[id].types)check(texts['trade-'+id].some(t=>t.value===type),'offer type absent');
   for(const move of offer.moves)check(texts['trade-'+id].some(t=>t.value===MOVES[move.id].name),'offer move absent');
  }
  mp.trade.peerOffer=null;capture('trade-empty',trade);
  mp.trade.phase='inviting';capture('trade-invite',trade);
  check(JSON.stringify(state)===before,'trade consultation changed campaign');
  mp.trade.reset();mp.remotes.clear();
  return {shots,overflow,pages:count,lines:talk.lines.length};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.overflow,[]);
 mkdirSync('artifacts/screens/social-ui',{recursive:true});
 for(const [name,data] of Object.entries(result.shots))writeFileSync(`artifacts/screens/social-ui/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 writeFileSync('artifacts/screens/social-ui/coverage.json',JSON.stringify({views:Object.keys(result.shots).length,pages:result.pages,lines:result.lines,overflow:result.overflow,errors},null,2));
 console.log(`PASS: 12 visible/selectable challengers, targeted invitation/cancel/timers; ${result.lines} complete chat messages (${result.pages} pages), preserved draft; 52 complete trade offers; ${Object.keys(result.shots).length} views, zero overflow.`);
}finally{await browser.close();}

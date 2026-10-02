import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5188'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts');
  const {AudioScene}=await import('/src/scenes/AudioScene.ts'),{TitleScene}=await import('/src/scenes/TitleScene.ts'),{PauseScene}=await import('/src/scenes/PauseScene.ts');
  const {audio}=await import('/src/engine/audio.ts'),{AUDIO_PREF_KEY}=await import('/src/engine/audioPreferences.ts');
  const {newGameState}=await import('/src/game/state.ts'),{createMonster}=await import('/src/game/monster.ts');
  const {preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  preloadSprites({'ui:audio':'ui/audio.png'});await waitForSprites(['ui:audio']);
  const canvas=document.createElement('canvas');canvas.id='game-canvas';document.body.append(canvas);const screen=new Screen(canvas),input=new Input(),stack=new SceneStack(),issues=[],shots={};
  const codes={a:'KeyZ',b:'KeyX',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  const press=key=>{document.dispatchEvent(new KeyboardEvent('keydown',{code:codes[key],bubbles:true}));stack.update(.1);input.endFrame();document.dispatchEvent(new KeyboardEvent('keyup',{code:codes[key],bubbles:true}));};
  let name='',boxes=[],checked=0;const text=screen.text.bind(screen);
  screen.text=(value,x,y,color,scale=1)=>{const m=screen.ctx.getTransform(),base=canvas.width/240,b={value,x:(m.a*x+m.e)/base,y:(m.d*y+m.f)/base,w:(value.length*6-1)*scale*m.a/base,h:7*scale*m.d/base};if(b.x<0||b.y<0||b.x+b.w>240||b.y+b.h>180)issues.push({name,kind:'bounds',...b});for(const old of boxes)if(b.w&&old.w&&b.x<old.x+old.w&&b.x+b.w>old.x&&b.y<old.y+old.h&&b.y+b.h>old.y)issues.push({name,kind:'overlap',value,old:old.value});boxes.push(b);text(value,x,y,color,scale);};
  const scene=new AudioScene(stack,input);stack.push(scene);
  for(const enabled of [false,true])for(const volume of [0,50,100])for(let i=0;i<5;i++){
   audio.enabled=enabled;audio.setVolume('music',volume);audio.setVolume('effects',100-volume);audio.trackTitle='IL CORRIDOIO E UNA PARTITURA';scene.index=i;
   name=`mix-${enabled}-${volume}-${i}`;boxes=[];scene.draw(screen);checked++;
   if(enabled&&volume===50&&i===1){const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').drawImage(canvas,0,0,240,180);shots.mix=c.toDataURL();}
  }
  const title=new TitleScene(stack,input);stack.replace(title);title.menu.index=title.menu.items.findIndex(i=>i.label==='AUDIO');press('a');
  if(stack.top.constructor.name!=='AudioScene')throw Error('Title audio opens no mixer');
  const old=audio.enabled;press('a');if(audio.enabled===old)throw Error('Mute input failed');press('down');const previous=audio.mix.music;press('left');if(audio.mix.music!==Math.max(0,previous-10))throw Error('Volume input failed');press('b');
  if(stack.top!==title||title.menu.items.find(i=>i.label==='AUDIO').rightLabel!==(audio.enabled?'SÌ':'NO'))throw Error('Title return has stale mute label');
  const state=newGameState();state.flags['intro-done']=true;state.party=[createMonster('ellyna',20)];const before=JSON.stringify(state),pause=new PauseScene(stack,input,state);stack.replace(pause);
  pause.sub=pause.buildOptionsMenu();pause.sub.menu.index=pause.sub.entries.findIndex(e=>e.startsWith('AUDIO'));press('a');
  if(stack.top.constructor.name!=='AudioScene')throw Error('Pause mixer missing');
  const rect=canvas.getBoundingClientRect();
  for(const type of ['pointerdown','pointerup'])canvas.dispatchEvent(new PointerEvent(type,{pointerId:7,clientX:rect.left+162.4*rect.width/240,clientY:rect.top+103*rect.height/180,bubbles:true}));
  stack.update(.1);input.endFrame();if(audio.mix.music!==70)throw Error('Touch slider did not select volume');press('b');
  if(stack.top!==pause||JSON.stringify(state)!==before)throw Error('Audio options mutated campaign or did not return');
  const stored=JSON.parse(localStorage.getItem(AUDIO_PREF_KEY));if(stored.music!==audio.mix.music||stored.enabled!==audio.enabled)throw Error('Mix not saved');
  // Codec and loop metrics use the actual compressed runtime files, not WAV masters.
  const catalog=await (await fetch('/audio/catalog.json')).json(),ctx=new OfflineAudioContext(2,1,22050),tracks=[];
  for(const [id,track]of Object.entries(catalog)){
   const buffer=await ctx.decodeAudioData(await (await fetch('/'+track.file)).arrayBuffer());
   let energy=0,peak=0,seam=0;for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);seam=Math.max(seam,Math.abs(data[0]-data[Math.min(data.length-1,Math.round(track.seconds*buffer.sampleRate)-1)]));for(const v of data){peak=Math.max(peak,Math.abs(v));energy+=v*v;}}
   const rms=Math.sqrt(energy/buffer.length/buffer.numberOfChannels);
   if(buffer.numberOfChannels!==2||Math.abs(buffer.duration-track.seconds)>.08||rms<.025||rms>.35||peak>.98||seam>.1)throw Error('Codec/loop quality failed '+id+' '+JSON.stringify({duration:buffer.duration,seconds:track.seconds,peak,rms,seam}));
   tracks.push({id,duration:buffer.duration,peak,rms,seam});
  }
  audio.destroy();return {issues,shots,checked,tracks};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.issues,[]);mkdirSync('artifacts/screens/audio',{recursive:true});
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/audio/${engine.name()}-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 delete result.shots;writeFileSync(`artifacts/audio-layout-${engine.name()}.json`,JSON.stringify(result,null,2));
 console.log(`PASS ${engine.name()}: ${result.checked} mixer layouts, native title/pause controls, saved preferences; ${result.tracks.length} stereo AAC loops decoded with signal/headroom/seam checks.`);
}finally{await browser.close();}

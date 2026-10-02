import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto((process.env.BASE_URL??'http://127.0.0.1:5190')+'/scripts/perf-harness.html');
 const report=JSON.parse(readFileSync(existsSync('artifacts/campaign-native/palace-final-ellyna-direct-20261002.json')?'artifacts/campaign-native/palace-final-ellyna-direct-20261002.json':'docs/palace-proof.json','utf8'));
 const code=(report.codes??report.earnedCampaign.codes)['palace-earned-resume'];
 const result=await page.evaluate(async code=>{
  const {PalaceArchiveScene}=await import('/src/scenes/PalaceArchiveScene.ts'),{Screen}=await import('/src/engine/screen.ts'),{Input}=await import('/src/engine/input.ts'),{SceneStack}=await import('/src/engine/scene.ts'),{importSaveCode}=await import('/src/game/state.ts'),{audio}=await import('/src/engine/audio.ts'),{waitForSprites}=await import('/src/engine/assets.ts');audio.enabled=false;
  const c=document.createElement('canvas');document.body.append(c);const screen=new Screen(c),input=new Input(),stack=new SceneStack(),shots={},overflow=[];let name='',key='';input.wasPressed=b=>b===key;
  const text=screen.text.bind(screen);screen.text=(v,x,y,color,scale=1)=>{if(v&&(x<0||y<0||x+(v.length*6-1)*scale>240||y+7*scale>180))overflow.push({name,v,x,y});text(v,x,y,color,scale);};
  const press=(scene,k)=>{key=k;scene.update();key='';};
  const capture=async(label,scene)=>{name=label;scene.draw(screen);await waitForSprites(['campaign:palace-'+label.split('-')[0]]);scene.draw(screen);const out=document.createElement('canvas');out.width=240;out.height=180;out.getContext('2d').drawImage(c,0,0,240,180);shots[label]=out.toDataURL();};
  for(const module of ['algoritmo','factcheck','talkshow','silenzio']){
   const state=importSaveCode(code),before=JSON.stringify(state),scene=new PalaceArchiveScene(stack,input,state,module,'b');stack.push(scene);
   await capture(module+'-facts',scene);press(scene,'b');if(JSON.stringify(state)!==before)throw Error('Reading cancellation changed campaign');
   const verify=new PalaceArchiveScene(stack,input,state,module,'b');stack.push(verify);while(verify.mode==='study')press(verify,'a');await capture(module+'-quiz',verify);
   while(verify.data.options[verify.menu.index]===verify.data.answer)press(verify,'down');const read=JSON.stringify(state);press(verify,'a');if(JSON.stringify(state)!==read)throw Error('Wrong answer changed campaign');await capture(module+'-wrong',verify);
   while(verify.mode!=='quiz')press(verify,'a');while(verify.data.options[verify.menu.index]!==verify.data.answer)press(verify,'down');press(verify,'a');if(!state.flags['palace-module:'+module])throw Error('Correct answer not registered');await capture(module+'-validated',verify);
  }
  return{shots,overflow};
 },code);
 assert.deepEqual(result.overflow,[]);mkdirSync('artifacts/screens/palace',{recursive:true});
 for(const [name,data]of Object.entries(result.shots))writeFileSync(`artifacts/screens/palace/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS ${Object.keys(result.shots).length} PalaceArchiveScene views, wrong/cancel resource preservation, zero text overflow`);
}finally{await browser.close();}

import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:960,height:720}});
 await page.goto(`${process.env.BASE_URL??'http://127.0.0.1:5179'}/scripts/perf-harness.html`);
 const result=await page.evaluate(async()=>{
  const {Screen}=await import('/src/engine/screen.ts');
  const {Input}=await import('/src/engine/input.ts');
  const {SceneStack}=await import('/src/engine/scene.ts');
  const {newGameState}=await import('/src/game/state.ts');
  const {TypesScene}=await import('/src/scenes/TypesScene.ts');
  const {BackupScene}=await import('/src/scenes/BackupScene.ts');
  const {NicknameScene}=await import('/src/scenes/NicknameScene.ts');
  const {TYPE_ORDER,typeRelations,setTypeIconLoader}=await import('/src/data/poltypes.ts');
  const {getSpriteImage,preloadSprites,waitForSprites}=await import('/src/engine/assets.ts');
  const {audio}=await import('/src/engine/audio.ts');audio.enabled=false;
  setTypeIconLoader(getSpriteImage);
  preloadSprites(Object.fromEntries(TYPE_ORDER.map(t=>[`type:${t}`,`ui/type_${t.toLowerCase()}.png`])));
  await waitForSprites(TYPE_ORDER.map(t=>`type:${t}`));
  const canvas=document.createElement('canvas'),screen=new Screen(canvas),input=new Input(),stack=new SceneStack();
  let key='',name='';input.wasPressed=b=>b===key;
  const press=(scene,b)=>{key=b;scene.update(.02);key='';};
  const shots={},text=[],overflow=[];
  const original=screen.text.bind(screen);
  screen.text=(value,x,y,color,scale=1)=>{text.push(value);if(value&&(x<0||y<0||x+(value.length*6-1)*scale>240||y+7*scale>180))overflow.push({name,value,x,y});original(value,x,y,color,scale);};
  const capture=(id,scene)=>{name=id;text.length=0;screen.clear('#112037');scene.draw(screen);shots[id]=canvas.toDataURL('image/png');};
  const guide=new TypesScene(stack,input);
  for(const type of TYPE_ORDER){
   capture(`type-${type}`,guide);
   for(const other of [...typeRelations(type).strong,...typeRelations(type).weak])if(!text.includes(other))throw Error(`${type}: missing relation ${other}`);
   press(guide,'down');
  }
  if(guide.index!==0)throw Error('type navigation did not wrap');
  const before=JSON.stringify(newGameState()),state=JSON.parse(before);
  const backup=new BackupScene(stack,input,state);capture('backup',backup);
  backup.pendingImport=newGameState();capture('backup-confirm',backup);press(backup,'b');
  if(backup.pendingImport!==null||JSON.stringify(state)!==before)throw Error('backup cancellation changed state');
  capture('nickname',new NicknameScene(stack,input,()=>{}));
  return {shots,overflow};
 });
 assert.deepEqual(result.overflow,[]);
 mkdirSync('artifacts/screens/native-ui',{recursive:true});
 for(const [name,data] of Object.entries(result.shots))writeFileSync(`artifacts/screens/native-ui/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 console.log(`PASS: ${Object.keys(result.shots).length} UI views, complete type relations, navigation wrap, backup cancellation, zero text overflow.`);
}finally{await browser.close();}

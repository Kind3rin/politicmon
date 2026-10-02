import { drawMonsterSprite } from "../art/monsters";
import { MOVES } from "../data/moves";
import { SPECIES } from "../data/species";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { movesAtLevel, speciesOf } from "../game/monster";
import { saveGame, type GameState } from "../game/state";
import { coppaOpponentDef, coppaRule, COPPA_FIRST_PRIZE, COPPA_REPEAT_PRIZE, playerOpponent, prepareCoppaParty, roundLabel, type CoppaRule, type TournamentState } from "../game/tournament";
import { drawScreenHeader } from "../ui/widgets";
import { drawEpiloguePage, epiloguePages } from "../ui/epilogueArt";
import { drawArenaBackdrop, drawArenaIcon } from "../ui/arenaArt";

export class TournamentScene implements Scene {
 readonly transparent=false;
 private tab=0;
 private index=0;
 private detail=0;
 private dossierPage=0;
 private closed=false;
 private modal:"abort"|"start"|null=null;
 private page=0;
 private rule:CoppaRule;
 constructor(private stack:SceneStack,private input:Input,private state:GameState,private tourney:TournamentState,private next:()=>void,private abort:()=>void,rule?:CoppaRule){this.rule=rule??coppaRule(tourney.dateKey);}
 private close(abort:boolean):void {if(this.closed)return;this.closed=true;this.stack.pop();abort?this.abort():this.next();}
 update():void {
  if(this.closed)return;
  if(this.modal){
   if(this.input.wasPressed("b")){this.modal=null;this.page=0;return;}
   if(!this.input.wasPressed("a"))return;
   if(this.modal==="start"&&!prepareCoppaParty(this.state.party,this.rule).ok){this.modal=null;return;}
   if(this.page<this.modalPages().length-1){this.page++;return;}
   this.close(this.modal==="abort");return;
  }
  if(this.input.wasPressed("b")){if(this.tab){this.tab=0;this.index=0;this.dossierPage=0;}else this.modal="abort";return;}
  if(this.input.wasPressed("left")||this.input.wasPressed("right")){this.tab=(this.tab+(this.input.wasPressed("left")?2:1))%3;this.index=0;this.detail=0;this.dossierPage=0;return;}
  const prepared=prepareCoppaParty(this.state.party,this.rule);
  const count=this.tab===1?3:this.tab===2&&prepared.ok?prepared.party.length:1;
  const delta=this.input.wasPressed("down")?1:this.input.wasPressed("up")?-1:0;
  if(delta){this.index=(this.index+delta+count)%count;this.dossierPage=0;}
  if(this.input.wasPressed("start")){if(this.tab===1)this.dossierPage=(this.dossierPage+1)%this.dossierPages().length;else {this.tab=1;this.index=0;this.dossierPage=0;}return;}
  if(!this.input.wasPressed("a"))return;
  if(this.tab===2&&prepared.ok){
   const leader=prepared.party[this.index],index=this.state.party.findIndex(m=>m.uid===leader.uid);
   if(index>=0){const [mon]=this.state.party.splice(index,1);this.state.party.unshift(mon);saveGame(this.state);audio.confirm();}
   this.index=0;this.tab=0;return;
  }
  if(this.tab===1){this.detail=1-this.detail;this.dossierPage=0;return;}
  this.modal="start";this.page=0;
 }
 private dossierPages():string[][] {
  const opp=playerOpponent(this.tourney),def=coppaOpponentDef(this.tourney,this.rule);
  if(!opp||!def)return [["NESSUN AVVERSARIO."]];
  const [id,level]=def.team[this.index];
  return epiloguePages(this.detail?[SPECIES[id].name.toUpperCase(),...movesAtLevel(id,level).map(m=>MOVES[m.id].name.toUpperCase())]:[SPECIES[id].name.toUpperCase(),SPECIES[id].types.join(" / "),...opp.intro],25,4);
 }
 private modalPages():string[][] {
  if(this.modal==="abort")return epiloguePages(["RINUNCI ALLA COPPA?", "LA QUOTA DI 1500€ È GIÀ PAGATA E NON VIENE RESTITUITA. IL TABELLONE DI QUESTA SESSIONE VA PERSO.", "LA SQUADRA DELLA STORIA RESTA TUA. B TI RIPORTA AL TORNEO."]);
  const prepared=prepareCoppaParty(this.state.party,this.rule),prize=this.state.coppaWins?COPPA_REPEAT_PRIZE:COPPA_FIRST_PRIZE;
  return epiloguePages([this.rule.description,prepared.ok?`APERTURA: ${speciesOf(prepared.party[0]).name}. ${prepared.party.length} IDONEI, CURATI PER QUESTO MATCH.`:prepared.reason,"LIVELLI, EXP E PP DELLA SQUADRA ORIGINALE SONO CONSERVATI. GLI OGGETTI DI CURA USATI IN MATCH RESTANO SPESI.","SE PERDI, SEI ELIMINATO. NESSUNA MULTA O TELETRASPORTO NELLA CAMPAGNA.",`PREMIO FINALE: ${prize.money}€ E ${prize.qty} ${prize.itemId==="tessera"?"TESSERA DORATA":"SCHEDE BLINDATE"}. LA QUOTA È GIÀ PAGATA.`,"A AVVIA IL MATCH. B TORNA A PREPARARTI."]);
 }
 draw(screen:Screen):void {
  drawArenaBackdrop(screen,"tournament");
  drawScreenHeader(screen,"COPPA DELLE POLTRONE",["QUARTI","SEMI","FINALE"][this.tourney.round]??"COPPA");
  if(this.modal){drawEpiloguePage(screen,this.modalPages()[this.page]);screen.text(this.page<this.modalPages().length-1?"A: AVANTI   B: ANNULLA":this.modal==="abort"?"A: RINUNCIA   B: RESTA":"A: COMBATTI   B: ANNULLA",12,167,"#fffaf0");return;}
  screen.rect(0,17,240,14,"#17243d");screen.text(["► TABELLONE / DOSSIER / LEADER","TABELLONE / ► DOSSIER / LEADER","TABELLONE / DOSSIER / ► LEADER"][this.tab],8,21,"#fffaf0");
  if(this.tab===0){
   for(let i=0;i<this.tourney.alive.length;i+=2){
    const y=36+i/2*25;screen.panel(8,y,224,23,"card");
    screen.text(this.tourney.alive[i].isPlayer?"TU":this.tourney.alive[i].ghost!.name,16,y+8,"#17243d");
    screen.text("VS",113,y+8,"#68758a");screen.text(this.tourney.alive[i+1]?.ghost?.name??"BYE",135,y+8,"#17243d");
   }
   screen.rect(0,140,240,20,"#17243d");screen.text(`${roundLabel(this.tourney)} / ${this.state.coppaWins} TRIONFI`,12,149,"#fffaf0");
   screen.text("SIN/DES: PAGINA  A: VIA  B: RINUNCIA",12,167,"#fffaf0");return;
  }
  const prepared=prepareCoppaParty(this.state.party,this.rule);
  if(this.tab===2){
   if(!prepared.ok){drawEpiloguePage(screen,epiloguePages([prepared.reason])[0]);screen.text("SIN/DES: PAGINA  B: TABELLONE",12,167,"#fffaf0");return;}
   prepared.party.forEach((mon,i)=>{
    const y=35+i*18;screen.rect(8,y,224,16,i===this.index?"#fff0bd":"#fffaf0");screen.text(i===this.index?"►":"",12,y+5,"#17243d");screen.text(speciesOf(mon).name,24,y+5,"#17243d");screen.textRight(`LV${mon.level}`,224,y+5,"#68758a");
   });
   screen.rect(0,146,240,14,"#17243d");screen.text("A SCEGLIE IL LEADER, POI TORNI.",12,150,"#fffaf0");screen.text("SU/GIU: LEADER  A: SCEGLI",12,163,"#fffaf0");screen.text("SIN/DES: PAGINA  B: TABELLONE",12,173,"#fffaf0");return;
  }
  const opp=playerOpponent(this.tourney),def=coppaOpponentDef(this.tourney,this.rule);
  if(!opp||!def)return;
  const [species,level]=def.team[this.index];
  drawArenaIcon(screen,opp.id,8,34,48,56);drawArenaIcon(screen,this.rule.id,27,92);
  screen.panel(63,34,169,122,"card");
  screen.text(opp.name,71,43,"#17243d");screen.text(this.rule.name,71,56,"#68758a");
  drawMonsterSprite(screen,species,72,68,48,32);screen.text(`LV ${level}`,130,72,"#17243d");screen.text(`${this.index+1}/3`,130,84,"#68758a");
  this.dossierPages()[this.dossierPage].forEach((line,i)=>screen.text(line,71,106+i*10,"#17243d"));
  screen.text("SU/GIU: MON  A: MOSSE",12,163,"#fffaf0");screen.text("START: TESTO  B: TABELLONE",12,173,"#fffaf0");
 }
}

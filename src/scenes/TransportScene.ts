import type {Input} from '../engine/input';
import type {Scene,SceneStack} from '../engine/scene';
import type {Screen} from '../engine/screen';
import type {GameState} from '../game/state';
import {TRANSPORT_DESTINATIONS,resolveTransportDestination,transportRequirement,type TransportDestination} from '../game/world/transport';
import {drawDeskBackdrop} from '../ui/deskArt';
import {drawEpiloguePage,epiloguePages} from '../ui/epilogueArt';
import {drawScreenHeader,Menu} from '../ui/widgets';
export class TransportScene implements Scene{
 readonly transparent=false;
 private menu:Menu;
 private reviewing=false;
 private page=0;
 private closed=false;
 constructor(private stack:SceneStack,private input:Input,private state:GameState,private currentMapId:string,private travel:(dest:TransportDestination)=>void){
  this.menu=new Menu(TRANSPORT_DESTINATIONS.map(d=>({label:d.label,rightLabel:d.mapId===currentMapId?'QUI':resolveTransportDestination(state,currentMapId,d.mapId)?'0€':'CHIUSA'})));
 }
 private pages():string[][]{
  const dest=TRANSPORT_DESTINATIONS[this.menu.index],allowed=resolveTransportDestination(this.state,this.currentMapId,dest.mapId);
  return epiloguePages([`DESTINAZIONE: ${dest.label}.`,allowed?'COSTO PER TE: 0€. LA SCORTA È GIÀ SPESATA. NON CONSUMI FONDI, FICHE, OGGETTI O TURNI DI MORALE.':transportRequirement(this.state,this.currentMapId,dest), 'LA DESTINAZIONE PORTA VICINO AL BAR SPORT DELLA CITTÀ. LA SQUADRA RESTA COM’È: IL VIAGGIO NON CURA.', 'AUTISTA: LO SCONTO SUL GASOLIO SI DIMEZZA. IL ROTOLO DELLO SCONTRINO, STRANAMENTE, RADDOPPIA.',allowed?'A PARTE. B TORNA ALLE TRATTE.':'A TORNA ALLE TRATTE. B ANNULLA.']);
 }
 update():void{
  if(this.closed)return;
  if(this.reviewing){
   if(this.input.wasPressed('b')){this.reviewing=false;this.page=0;return;}
   if(!this.input.wasPressed('a'))return;
   if(this.page<this.pages().length-1){this.page++;return;}
   const dest=resolveTransportDestination(this.state,this.currentMapId,TRANSPORT_DESTINATIONS[this.menu.index].mapId);
   if(!dest){this.reviewing=false;this.page=0;return;}
   this.closed=true;this.stack.pop();this.travel(dest);return;
  }
  const action=this.menu.update(this.input);
  if(action==='cancel'){this.closed=true;this.stack.pop();return;}
  if(action==='select'){this.reviewing=true;this.page=0;}
 }
 draw(screen:Screen):void{
  drawDeskBackdrop(screen,'transport');drawScreenHeader(screen,'MACCHINA ELETTORALE','0€');
  if(this.reviewing){drawEpiloguePage(screen,this.pages()[this.page]);screen.text(this.page<this.pages().length-1?'A: AVANTI  B: ANNULLA':'A: CONFERMA  B: ANNULLA',12,167,'#fffaf0');return;}
  this.menu.draw(screen,64,34,168,14,4);
  screen.panel(8,112,224,44,'card');epiloguePages([transportRequirement(this.state,this.currentMapId,TRANSPORT_DESTINATIONS[this.menu.index])],34,3)[0].forEach((line,i)=>screen.text(line,16,120+i*10,'#17243d'));
  screen.text('SU/GIU: META  A: DOSSIER  B: ESCI',12,167,'#fffaf0');
 }
}

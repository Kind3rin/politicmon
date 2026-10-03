import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { exportSaveCode, importSaveCode, saveGame, setActiveState, type GameState } from "../game/state";
import { getActiveSlot } from "../game/state";
import { MAP_NAMES } from "../data/maps/names";
import type { UiPanel } from "../ui/kit";

/** Export and import share the game's native form and back contract. */
export class BackupScene implements Scene {
  private mode:"main"|"guide"|"copy"|"paste"="main";
  private draft="";
  private exported="";
  private notice="";
  private pendingImport:GameState|null=null;
  private request=0;
  constructor(private stack:SceneStack,private input:Input,private state:GameState) {}

  private back():void {
    if(this.stack.top!==this)return;
    this.request++;this.input.reset();audio.cancel();this.notice="";
    if(this.pendingImport)this.pendingImport=null;
    else if(this.mode!=="main")this.mode="main";
    else this.stack.pop();
  }

  private async copy():Promise<void> {
    if(this.stack.top!==this)return;
    const request=++this.request;
    this.exported=exportSaveCode(this.state);this.mode="copy";this.notice="";
    this.input.reset();audio.confirm();
    try {
      if(!navigator.clipboard?.writeText)throw new Error("Copia manuale");
      await navigator.clipboard.writeText(this.exported);
      if(this.stack.top===this&&request===this.request)this.notice="Codice copiato negli appunti.";
    } catch {
      if(this.stack.top===this&&request===this.request)this.notice="Seleziona tutto il codice e copialo.";
    }
  }

  private review():void {
    if(this.stack.top!==this||this.mode!=="paste"||this.pendingImport)return;
    const imported=importSaveCode(this.draft);
    this.input.reset();
    if(!imported){audio.cancel();this.notice="Codice non valido. Controlla di averlo incollato per intero.";return;}
    this.notice="";this.pendingImport=imported;audio.confirm();
  }

  private import(imported:GameState):void {
    if(this.stack.top!==this||this.pendingImport!==imported)return;
    this.input.reset();
    if(!saveGame(imported)){this.pendingImport=null;this.notice="Non è stato possibile salvare. Libera spazio e riprova.";return;}
    // pagehide saves the active world. Point it at the imported campaign before
    // reloading, so lifecycle persistence cannot put the old campaign back.
    setActiveState(imported);this.pendingImport=null;location.reload();
  }

  get uiPanel():UiPanel {
    const back={label:"Indietro",run:()=>this.back()};
    const imported=this.pendingImport;
    if(imported)return {title:"Sostituisci la campagna?",subtitle:`Il codice sostituirà la campagna ${getActiveSlot()+1}.`,
      blocks:[{title:"Prima e dopo",facts:[
        {label:"Luogo",value:`${MAP_NAMES[this.state.pos.mapId]??this.state.pos.mapId} → ${MAP_NAMES[imported.pos.mapId]??imported.pos.mapId}`},
        {label:"Compagni",value:`${this.state.party.length} → ${imported.party.length}`},
        {label:"Medaglie",value:`${this.state.badges.length} → ${imported.badges.length}`},
        {label:"Fondi",value:`${this.state.money} → ${imported.money} €`}]},
        {title:"Ripresa",body:"Il gioco si ricarica e riparte dalla campagna importata. Indietro conserva la partita attuale."}],
      actions:[{label:"Importa e riprendi",run:()=>this.import(imported)}],selected:0,primary:0,back:back};
    if(this.mode==="guide")return {title:"Spostare la campagna",blocks:[
      {title:"Dove resta la partita",body:"I progressi restano nel browser o nell’app da cui giochi. Un altro browser può avere salvataggi diversi."},
      {title:"Da qui",body:"Usa Copia codice. Conserva il codice completo: una parte sola non basta."},
      {title:"Sul nuovo dispositivo",body:"Apri Politicmon e usa Incolla codice. Controlla il confronto prima di importare."}],actions:[],selected:0,back:back};
    if(this.mode==="copy")return {title:"Copia la campagna",subtitle:this.notice||"Il codice contiene i tuoi progressi.",
      field:{label:"Codice salvataggio",value:this.exported,readOnly:true,autofocus:true},
      actions:[{label:"Copia di nuovo",run:()=>{void this.copy();}}],selected:0,back:back};
    if(this.mode==="paste")return {title:"Incolla la campagna",subtitle:"Incolla tutto il codice. Prima di sostituire la partita vedrai un confronto.",
      blocks:this.notice?[{title:"Controlla il codice",body:this.notice}]:[],
      field:{label:"Codice salvataggio",value:this.draft,placeholder:"Incolla qui il codice completo",autofocus:true,onChange:value=>{if(this.stack.top===this&&this.mode==="paste")this.draft=value;}},
      actions:[{label:"Controlla il codice",run:()=>this.review()}],selected:0,primary:0,back:back};
    return {title:"Salvataggi",subtitle:`Campagna ${getActiveSlot()+1}. Copia i progressi per conservarli o spostarli.`,
      actions:[{label:"Copia codice",hint:"Copia questa campagna negli appunti.",run:()=>{void this.copy();}},
        {label:"Incolla codice",hint:"Controlla una campagna prima di importarla.",run:()=>{if(this.stack.top!==this)return;this.input.reset();this.mode="paste";this.notice="";}},
        {label:"Come funziona",hint:"Salvataggi, browser e altri dispositivi.",run:()=>{if(this.stack.top===this)this.mode="guide";}}],selected:0,back:back};
  }
  onExit():void {this.request++;}
  update(_dt:number):void {}
  draw(screen:Screen):void {screen.clear("#101c30");}
}

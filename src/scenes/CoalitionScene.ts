import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { ALLY_CATALOG, ALLY_NAMES, addAlly, coalitionBonuses, removeAlly, type AllyId } from "../game/coalition";
import { redeemCoalitionRepair, signed } from "../game/campaignDecisions";
import { saveGame, type GameState } from "../game/state";
import type { UiPanel, UiBlock } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";
const CHANNELS=["funds","sondaggiGain","territoryGain","shopPrice"] as const;
const CHANNEL_LABELS={funds:"Fondi",sondaggiGain:"Guadagno nei sondaggi",territoryGain:"Guadagno nei collegi",shopPrice:"Prezzi dei negozi"};

const R1_CANDIDATES: readonly AllyId[] = ["campo_secretary", "quantum_centrist", "civic_mayor"];
const LABELS: Readonly<Record<AllyId, { lineRed: string }>> = {
  campo_secretary: { lineRed: "AUTONOMIA" },
  quantum_centrist: { lineRed: "POLARIZZAZIONE" },
  steel_governor: { lineRed: "CAMPO LARGO" },
  civic_mayor: { lineRed: "PARTITI NAZIONALI" },
  generorso: { lineRed: "RIASSORBIMENTO" }
};

export class CoalitionScene implements Scene {
  readonly transparent = false;
  private index: number;
  private candidates: readonly AllyId[];
  private totals = false;
  private notice = "";
  private pendingRemove: AllyId | null = null;

  constructor(private stack: SceneStack, private input: Input, private state: GameState, focus: AllyId) {
    this.candidates = [...new Set([...R1_CANDIDATES, focus, ...state.coalition.members.map(m => m.allyId)])];
    this.index = Math.max(0, this.candidates.indexOf(focus));
  }

  private live(allyId:AllyId):boolean {return this.stack.top===this&&this.candidates[this.index]===allyId;}
  private repairAvailable(allyId:AllyId):boolean {
    const m=this.state.coalition.members.find(member=>member.allyId===allyId);
    const key=m?`${allyId}:v${m.violationCount}`:'';
    return Boolean(m?.status==='strained'&&!m.reconciliationSpent&&this.state.flags[`reconcile-token:${key}`]&&!this.state.flags[`reconcile-used:${key}`]);
  }
  private apply(allyId:AllyId,operation:'add'|'remove'|'repair'):void {
    if(!this.live(allyId)||this.totals)return;
    this.input.reset();
    if(operation==='repair'){
      if(!this.repairAvailable(allyId)||!redeemCoalitionRepair(this.state,allyId))return;
      saveGame(this.state);audio.confirm();this.notice='Buono usato: patto riparato.';return;
    }
    if(operation==='remove'&&this.pendingRemove!==allyId){this.pendingRemove=allyId;audio.cursor();return;}
    if(operation==='add'&&(!this.state.flags[`coalition-candidate-seen:${allyId}`]||this.state.coalition.members.length>=2))return;
    const result=operation==='remove'?removeAlly(this.state.coalition,allyId):addAlly(this.state.coalition,allyId);
    this.pendingRemove=null;
    if(!result.ok){this.notice=result.error==='locked'?'La coalizione è bloccata.':result.error==='full'?'Non ci sono posti liberi.':'La composizione è cambiata. Rileggi il patto.';audio.cancel();return;}
    this.state.coalition=result.state;saveGame(this.state);audio.confirm();this.notice=operation==='remove'?'Candidato rimosso.':'Candidato inserito.';
  }
  private back():void {
    if(this.stack.top!==this)return;
    this.input.reset();audio.cancel();
    if(this.totals){this.totals=false;return;}
    if(this.pendingRemove){this.pendingRemove=null;this.notice='Rimozione annullata.';return;}
    this.stack.pop();
  }
  get uiPanel():UiPanel {
    const allyId=this.candidates[this.index],definition=ALLY_CATALOG[allyId];
    const member=this.state.coalition.members.find(m=>m.allyId===allyId);
    const seen=Boolean(member||this.state.flags[`coalition-candidate-seen:${allyId}`]);
    const repair=this.repairAvailable(allyId);
    const back={label:'Indietro',run:()=>this.back()};
    if(this.totals){
      const values=coalitionBonuses(this.state.coalition);
      return {title:'Effetti della coalizione',blocks:[{title:'Effetti netti',facts:CHANNELS.map(channel=>({label:CHANNEL_LABELS[channel],value:`${signed(channel==='shopPrice'?-(values.bonus[channel]+values.malus[channel]):values.bonus[channel]+values.malus[channel])}%`}))},
        {title:'Come si applicano',body:'I valori includono il bonus dell’assetto. I fondi e i guadagni di consenso cambiano quando una regola li assegna: non sono accrediti immediati.'},
        {title:'Coesione ed esperienza',body:'Da 70 di coesione: esperienza +8%. Sotto 30: esperienza −8%.',facts:[{label:'Coesione attuale',value:`${this.state.morale.cohesion} di 100`}]}],actions:[],back};
    }
    const power=member?.status==='strained'?5:member?.status==='reconciled'?7.5:10;
    const blocks:UiBlock[]=[{title:seen?readableCopy(ALLY_NAMES[allyId]):'Candidato non incontrato',body:!seen?'Parlaci prima nel Campo.':!member?'Candidato libero.':member.status==='strained'?'Patto teso. Il contributo positivo è dimezzato.':member.status==='reconciled'?'Patto riparato. Un altro strappo lo esclude.':'Patto attivo.',facts:[{label:'Alleati',value:`${this.state.coalition.members.length} di 2`}]}];
    if(seen)blocks.push({title:'Contributo personale',facts:[{label:CHANNEL_LABELS[definition.bonus],value:`${definition.bonus==='shopPrice'?'-':'+'}${power}%`},{label:CHANNEL_LABELS[definition.malus],value:`${definition.malus==='shopPrice'?'+':'-'}6%`}],body:`Non accetta: ${readableCopy(LABELS[allyId].lineRed).toLocaleLowerCase('it')}.`});
    if(this.notice)blocks.push({title:'Registro',body:this.notice});
    const pending=this.pendingRemove===allyId;
    if(pending)blocks.push({title:'Rimuovere l’alleato?',body:`${readableCopy(ALLY_NAMES[allyId])} uscirà dalla coalizione. Il suo bonus e il suo malus smetteranno di applicarsi. Indietro annulla.`});
    const operation=pending?'remove':repair?'repair':member?'remove':'add';
    const disabled=this.state.coalition.locked&&!repair||!member&&(!seen||this.state.coalition.members.length>=2);
    return {title:'Tavolo delle alleanze',subtitle:this.state.coalition.locked?'Composizione bloccata.':'Leggi il contributo e la linea rossa prima di scegliere.',blocks,
      tabs:pending?undefined:this.candidates.map((id,index)=>({label:readableCopy(ALLY_NAMES[id]),run:()=>{if(this.stack.top!==this||this.pendingRemove||this.totals)return;this.index=index;this.notice='';this.input.reset();audio.cursor();}})),selectedTab:this.index,
      actions:[{label:pending?'Conferma la rimozione':repair?'Usa il buono di riparazione':member?'Rimuovi dalla coalizione':'Aggiungi alla coalizione',disabled,run:()=>{if((this.pendingRemove===allyId)!==pending)return;this.apply(allyId,operation);}},
        ...(pending?[]:[{label:'Effetti complessivi',hint:'Leggi i bonus netti e l’effetto della coesione.',run:()=>{if(!this.live(allyId)||this.pendingRemove)return;this.totals=true;this.input.reset();audio.cursor();}}])],primary:0,back};
  }
  update():void {}
  draw(screen:Screen):void {screen.clear('#17243d');}
}

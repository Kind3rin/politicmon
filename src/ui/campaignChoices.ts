import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { CAMPAIGN_CHOICES, commitCampaignDecision, previewCampaignDecision, type CampaignKind, type DecisionPreview } from "../game/campaignDecisions";
import { saveGame, type GameState } from "../game/state";
import { ALLY_NAMES } from "../game/coalition";
import type { UiPanel, UiBlock } from "./kit";
import { readableCopy } from "./kit/copy";

const copy=(text:string)=>readableCopy(text).replace(/\bCOE\b/gi,'coesione').replace(/\bEXP\b/gi,'esperienza');

export class CampaignChoiceScene implements Scene {
  readonly transparent = false;
  private index: number;
  private reviewing = false;
  private committing = false;
  private result: DecisionPreview | null = null;
  private before: {money:number;polls:number;cohesion:number}|null=null;
  private error = "";

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private kind: CampaignKind, initial = 0) {
    this.index=Math.max(0,Math.min(CAMPAIGN_CHOICES[kind].keys.length-1,initial));
  }
  private leave():void {
    if(this.stack.top!==this||this.committing)return;
    this.input.reset();audio.cancel();
    if(this.reviewing&&!this.result){this.reviewing=false;this.error='';}
    else this.stack.pop();
  }
  private commit(index:number):void {
    if(this.stack.top!==this||!this.reviewing||this.result||this.committing||this.index!==index)return;
    this.committing=true;this.input.reset();
    const before={money:this.state.money,polls:this.state.sondaggi,cohesion:this.state.morale.cohesion};
    const result=commitCampaignDecision(this.state,this.kind,index);
    if(result.ok){this.result=result;this.before=before;saveGame(this.state);audio.confirm();}
    else {this.error=copy(result.error);audio.cancel();}
    this.committing=false;
  }
  get uiPanel():UiPanel {
    const chapter=CAMPAIGN_CHOICES[this.kind];
    const preview=this.result??previewCampaignDecision(this.state,this.kind,this.index);
    const index=this.index;
    const back={label:'Indietro',hint:this.reviewing&&!this.result?'Torna alle scelte.':'Torna alla campagna.',run:()=>this.leave()};
    if(!this.reviewing&&!this.result)return {
      title:copy(chapter.title),subtitle:'Leggi le conseguenze prima di scegliere.',image:`/sprites/ui/campaign/${this.kind}.png`,
      blocks:this.error?[{title:'Scelta non disponibile',body:this.error}]:undefined,
      actions:chapter.labels.map((label,i)=>({label:copy(label),hint:chapter.stories[i],run:()=>{
        if(this.stack.top!==this||this.reviewing||this.result||this.committing)return;
        this.index=i;this.reviewing=true;this.error='';this.input.reset();audio.cursor();
      }})),selected:index,back
    };
    const blocks:UiBlock[]=[{title:copy(chapter.labels[index]),body:chapter.stories[index]}];
    if(preview.ok){
      const before=this.before??{money:this.state.money,polls:this.state.sondaggi,cohesion:this.state.morale.cohesion};
      blocks.push({title:this.result?'Variazioni registrate':'Conseguenze previste',facts:[
        {label:'Fondi',value:`${before.money} → ${before.money+preview.moneyDelta} €`},
        {label:'Sondaggi',value:`${before.polls} → ${before.polls+preview.pollsDelta}%`},
        {label:'Coesione',value:`${before.cohesion} → ${before.cohesion+preview.cohesionDelta} di 100`},
        ...(this.kind==='photo'?[{label:'Voto nel Centro',value:`${preview.localDelta>0?'+':''}${preview.localDelta} punti`}]:[])
      ]});
      const pacts=[...preview.patch.strained.map(id=>`${ALLY_NAMES[id]}: patto teso. Bonus dimezzato.`),...preview.patch.broken.map(id=>`${ALLY_NAMES[id]}: patto rotto. Esce dalla coalizione.`)];
      if(preview.repairTarget)pacts.push(`${ALLY_NAMES[preview.repairTarget]}: patto riparato, bonus al 75%. Un altro strappo lo esclude.`);
      blocks.push({title:'Patti',body:pacts.join('\n\n')||'Nessun patto violato.'});
      const details=preview.lines.filter(line=>!line.startsWith('FONDI ')&&!line.startsWith('CONSENSO CENTRO ')&&!line.startsWith('COESIONE ')&&!line.includes('PATTO TESO.')&&!line.includes('PATTO ROTTO.')&&!line.includes('RIPARATO ORA.')&&line!=='NESSUN PATTO VIOLATO.').slice(1);
      if(details.length)blocks.push({title:'Registro',body:details.map(copy).join('\n\n')});
    }else blocks.push({title:'Scelta non disponibile',body:copy(preview.error)});
    if(this.error)blocks.push({title:'La scelta non è stata registrata',body:this.error});
    if(this.result)blocks.push({title:'Dopo la decisione',body:chapter.closing});
    return {title:this.result?'Scelta registrata':copy(chapter.title),blocks,actions:[{
      label:this.result?'Continua':'Conferma la scelta',disabled:!preview.ok||this.committing,
      hint:this.result?'Torna alla campagna.':'Applica le conseguenze mostrate.',run:()=>{if(this.result)this.leave();else this.commit(index);}
    }],primary:0,back};
  }
  update():void {}
  draw(screen:Screen):void {screen.clear('#17243d');}
}

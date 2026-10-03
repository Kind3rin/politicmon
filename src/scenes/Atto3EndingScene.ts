import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { applyAtto3EndingReward, deriveAtto3Ending, type Atto3EndingDef } from "../game/atto3Ending";
import { campaignEpilogue } from "../game/campaignEpilogue";
import { saveGame, type GameState } from "../game/state";
import type { UiPanel } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";


export class Atto3EndingScene implements Scene {
  readonly transparent = false;
  private page = 0;
  private finished = false;
  private ending: Atto3EndingDef;
  private pages: { title: string; paragraphs: string[] }[];

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private onFinish: () => void) {
    const ending = deriveAtto3Ending(state);
    if (!ending) throw new Error("Atto3EndingScene richiede un risultato elettorale");
    this.ending = ending;
    this.pages = campaignEpilogue(state, ending);
  }

  private advance(page:number):void {
    if(this.finished||this.stack.top!==this||this.page!==page)return;
    this.input.reset();
    if(this.page<this.pages.length-1){this.page++;audio.confirm();return;}
    this.finished=true;
    if(applyAtto3EndingReward(this.state,this.ending))audio.catchJingle();
    saveGame(this.state);this.stack.pop();this.onFinish();
  }
  get uiPanel():UiPanel {
    const page=this.page,section=this.pages[page];
    return {title:readableCopy(section.title),subtitle:`${page+1} di ${this.pages.length}`,
      image:`/sprites/ui/epilogue/${this.ending.id}.png`,
      blocks:[{title:'Il tuo mandato',body:section.paragraphs.map(readableCopy).join('\n\n')}],
      actions:[{label:page<this.pages.length-1?'Continua':'Torna alla campagna',run:()=>this.advance(page)}],primary:0,
      back:{label:'Indietro',hint:'Torna al capitolo precedente.',disabled:page===0,run:()=>{if(this.finished||this.stack.top!==this||this.page!==page||page===0)return;this.input.reset();this.page--;audio.cancel();}}
    };
  }
  update():void {}
  draw(screen:Screen):void {screen.clear('#17243d');}
}

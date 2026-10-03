import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import { audio } from "../engine/audio";
import { saveGame, type GameState } from "../game/state";
import type { UiPanel } from "../ui/kit";
import { readableCopy } from "../ui/kit/copy";



export type SliceEnding = "stable" | "fractured";

export function deriveSliceEnding(state: GameState): SliceEnding {
  return state.coalition.members.some((member) => member.status === "strained") || Object.keys(state.flags).some(key => key.startsWith("coalition-broken:") && state.flags[key]) ? "fractured" : "stable";
}

export class SliceEndingScene implements Scene {
  readonly transparent = false;
  private ending: SliceEnding;
  private finished = false;
  private lines: string[];

  constructor(private stack: SceneStack, private input: Input, private state: GameState, private onFinish: () => void) {
    this.ending = deriveSliceEnding(state);
    this.lines = this.ending === "stable"
      ? ["FOTO DI COALIZIONE: STABILE.", "DUE POSTI, TRE PROMESSE E NESSUNA SEDIA LANCIATA.", "IL CAMPO REGGE. FINO AL PROSSIMO COMUNICATO."]
      : ["FOTO DI COALIZIONE: FRATTURATA.", "SONO TUTTI NEL FRAME, MA QUALCUNO HA GIÀ CHIESTO IL RITAGLIO.", "LA LINEA ROSSA RESTA VISIBILE ANCHE IN BIANCO E NERO."];
  }

  private finish(): void {
    if (this.finished||this.stack.top!==this) return;
    this.input.reset();
    this.finished = true;
    this.state.flags[`campo-slice-ending:${this.ending}`] = true;
    this.state.flags["campo-photo-complete"] = true;
    this.state.flags["atto3-slice-complete"] = true;
    saveGame(this.state);
    audio.catchJingle();
    this.stack.pop();
    this.onFinish();
  }

  get uiPanel():UiPanel {
    return {title:'Dopo la foto',subtitle:this.ending==='stable'?'Coalizione stabile':'Coalizione fratturata',image:'/sprites/ui/campaign/photo.png',
      blocks:[{title:'Il campo largo',body:this.lines.map(readableCopy).join('\n\n')}],
      actions:[{label:'Torna a Bruxelles',run:()=>this.finish()}],primary:0,
      back:{label:'Indietro',hint:'Torna a Bruxelles.',run:()=>this.finish()}
    };
  }
  update():void {}
  draw(screen:Screen):void {screen.clear('#17243d');}
}

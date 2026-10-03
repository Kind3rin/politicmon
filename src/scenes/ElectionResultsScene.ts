import type { Input } from '../engine/input';
import type { Scene, SceneStack } from '../engine/scene';
import type { Screen } from '../engine/screen';
import { audio } from '../engine/audio';
import type { ElectionResult } from '../game/election';
import type { UiPanel } from '../ui/kit';

const LABELS = { nord: 'Nord', centro: 'Centro', sud: 'Sud', isole: 'Isole', feed: 'Feed' } as const;

export class ElectionResultsScene implements Scene {
  readonly transparent = false;
  private revealed = 0;
  private elapsed = 0;
  private finished = false;
  constructor(private stack: SceneStack, private input: Input, private result: ElectionResult, private onDone: () => void) {}
  private advance():void {
    if(this.finished||this.stack.top!==this)return;
    this.input.reset();
    if(this.revealed<this.result.districts.length){this.revealed=this.result.districts.length;audio.confirm();return;}
    this.finished=true;this.stack.pop();this.onDone();
  }
  update(dt:number):void {
    if(this.finished||this.stack.top!==this)return;
    this.elapsed+=dt;
    if(this.revealed<this.result.districts.length&&this.elapsed>=.65){this.elapsed=0;this.revealed++;audio.confirm();}
  }
  get uiPanel():UiPanel {
    const complete=this.revealed===this.result.districts.length;
    return {title:'Notte elettorale',subtitle:complete?`${this.result.seats} seggi su ${this.result.districts.length}`:`${this.revealed} collegi scrutinati su ${this.result.districts.length}`,
      blocks:[...this.result.districts.map((district,index)=>index>=this.revealed?{title:LABELS[district.id],body:'Scrutinio in corso.'}:{title:LABELS[district.id],facts:[
        {label:'Consenso locale',value:`${district.beforeRecount} → ${district.afterRecount}%`},
        {label:'Riconteggio',value:district.recounted?`${district.afterRecount-district.beforeRecount>0?'+':''}${district.afterRecount-district.beforeRecount} punti`:'Nessun riconteggio'},
        {label:'Seggio',value:district.seat?'Conquistato':'Perso'}
      ]}),...(complete?[{title:this.result.ending==='government'?'Maggioranza conquistata':'In opposizione',body:this.result.ending==='government'?'Hai i seggi per formare il governo.':'La campagna prosegue dai banchi dell’opposizione.'}]:[])],
      actions:[{label:complete?'Continua':'Mostra tutto',run:()=>this.advance()}],primary:0,
      back:{label:'Indietro',disabled:!complete,hint:'Chiudi lo scrutinio e prosegui con il risultato.',run:()=>{if(complete)this.advance();}}};
  }
  draw(screen:Screen):void {screen.clear('#17243d');}
}

// LOBBY DEL DUELLO PvP: lista dei giocatori online sulla mappa corrente,
// invito con anteprima livelli (consenso informato, C11) e handshake
// invite -> accept -> start. Chi invita è HOST. Raggiungibile dal menu pausa
// (DUELLO PVP) o direttamente dal menu SFIDA su un giocatore adiacente
// (opts.invitePeerId): stesso code path in entrambi i casi.

import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import type { Screen } from "../engine/screen";
import type { GameState } from "../game/state";
import { PvpBattleScene } from "../game/battle/PvpBattleScene";
import { recordDuelResult } from "../game/duelrecord";
import {
  avgLevel, DUEL_INVITE_TIMEOUT, maxLevel, serializeTeam, validateWireTeam, type DuelMsg
} from "../net/duelproto";
import { mp } from "../net/mp";
import { loadNick } from "../net/profile";
import type { UiPanel, UiBlock } from "../ui/kit";
import { speciesOf } from "../game/monster";

export interface DuelLobbyOptions {
  // Invita subito questo peer (menu SFIDA sul giocatore adiacente).
  invitePeerId?: string;
}

export class DuelLobbyScene implements Scene {
  private index = 0;
  private notice = "";
  private active = false;
  private started = false;
  private waiting = false;
  private timer = 0;
  private duelId = "";
  private targetPeerId = "";
  private targetNick = "";
  private prevOnDuel: typeof mp.onDuel = null;

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: DuelLobbyOptions = {}
  ) {}

  onEnter(): void {
    this.active=true;
    mp.duelBusy = true; // inviti altrui -> auto-decline "OCCUPATO"
    this.prevOnDuel = mp.onDuel;
    mp.onDuel = (msg, peerId) => this.onDuelMsg(msg, peerId);
    if (this.opts.invitePeerId) {
      this.sendInvite(this.opts.invitePeerId);
    }
  }

  onExit(): void {
    this.active=false;
    mp.duelBusy = false;
    mp.onDuel = this.prevOnDuel;
  }

  private sendInvite(peerId: string): void {
    if(!this.active||this.started||this.stack.top!==this||this.waiting||this.notice)return;
    this.input.reset();
    const remote = mp.remotes.get(peerId);
    if (!remote) {
      this.notice="Si è già scollegato. La politica è crudele.";
      return;
    }
    if (this.state.party.length === 0) {
      this.notice="Ti serve almeno un Politicmon per duellare.";
      return;
    }
    const wire = serializeTeam(this.state.party);
    this.duelId = `${mp.myId}:${Date.now().toString(36)}`;
    this.targetPeerId = peerId;
    this.targetNick = remote.nick.slice(0, 12);
    this.waiting = true;
    this.timer = DUEL_INVITE_TIMEOUT;
    audio.confirm();
    mp.sendDuel(
      {
        v: 1,
        duelId: this.duelId,
        type: "invite",
        nick: loadNick() || "ANONIMO",
        avg: avgLevel(wire),
        maxLevel: maxLevel(wire),
        preview: wire.map((w) => ({ s: w.s, l: w.l }))
      },
      peerId
    );
  }

  private onDuelMsg(msg: DuelMsg, peerId: string): void {
    if (!this.active||this.started||msg.duelId !== this.duelId || peerId !== this.targetPeerId) {
      return;
    }
    if (!this.waiting) {
      // Accept arrivato troppo tardi (timeout già scattato): declina.
      if (msg.type === "accept") {
        mp.sendDuel({ v: 1, duelId: msg.duelId, type: "decline", reason: "TROPPO TARDI" }, peerId);
      }
      return;
    }
    if (msg.type === "decline") {
      this.waiting = false;
      audio.cancel();
      this.notice=msg.reason === "OCCUPATO"?`${this.targetNick} è occupato in un altro dibattito.`:`${this.targetNick} ha declinato la sfida. Niente diretta.`;
      return;
    }
    if (msg.type === "accept") {
      const guestTeam = validateWireTeam(msg.team);
      if (!guestTeam) {
        this.waiting = false;
        mp.sendDuel({ v: 1, duelId: this.duelId, type: "decline", reason: "SQUADRA NON VALIDA" }, peerId);
        this.notice="Squadra non valida: la commissione di garanzia annulla il duello.";
        return;
      }
      const hostWire = serializeTeam(this.state.party);
      if (!validateWireTeam(hostWire)) {
        this.waiting = false;
        mp.sendDuel({ v: 1, duelId: this.duelId, type: "decline", reason: "SQUADRA NON VALIDA" }, peerId);
        this.notice="La tua squadra non passa la commissione di garanzia.";
        return;
      }
      this.waiting = false;this.started=true;this.input.reset();
      mp.sendDuel({ v: 1, duelId: this.duelId, type: "start", hostTeam: hostWire }, peerId);
      audio.encounterSting();
      this.stack.push(
        new PvpBattleScene(this.stack, this.input, {
          state: this.state,
          role: "host",
          peerId,
          opponentNick: this.targetNick,
          hostWire,
          guestWire: msg.team,
          duelId: this.duelId,
          onEnd: (result) => {
            this.stack.pop(); // PvpBattleScene
            this.stack.pop(); // questa lobby
            // Duello CHIUSO, siamo tornati al mondo: ora (e solo ora) si
            // scrive il record duelli e si salva.
            recordDuelResult(this.state, result);
          }
        })
      );
    }
  }

  private back():void {
    if(this.stack.top!==this||this.started)return;
    this.input.reset();audio.cancel();
    if(this.notice){this.notice='';return;}
    if(this.waiting){this.waiting=false;return;}
    this.stack.pop();
  }
  update(dt:number):void {
    if(this.stack.top!==this||this.started||this.notice||!this.waiting)return;
    this.timer-=dt;
    if(this.timer<=0){this.waiting=false;this.notice='Nessuna risposta. Ritenta più tardi.';}
  }
  get uiPanel():UiPanel {
    const waiting=this.waiting,notice=this.notice;
    const live=()=>this.stack.top===this&&!this.started&&this.waiting===waiting&&this.notice===notice;
    const back={label:'Indietro',hint:notice?'Torna ai giocatori.':waiting?'Annulla l’attesa.':'Chiudi la preparazione.',run:()=>{if(live())this.back();}};
    if(notice)return {title:'Duello in diretta',blocks:[{title:'Invito',body:notice}],actions:[{label:'Continua',run:()=>{if(live()){this.notice='';this.input.reset();audio.confirm();}}}],primary:0,back};
    const wire=serializeTeam(this.state.party);
    const blocks:UiBlock[]=[{title:'La tua squadra',facts:[{label:'Livello medio',value:String(avgLevel(wire))},{label:'Livello massimo',value:String(maxLevel(wire))}],body:'PV e PP ripartono al massimo. Il duello usa una copia della squadra.'},...this.state.party.map(mon=>({title:speciesOf(mon).name,facts:[{label:'Livello',value:String(mon.level)},{label:'Tipo',value:speciesOf(mon).types.join(' · ')}]}))];
    if(waiting)return {title:'Invito inviato',subtitle:this.targetNick,blocks:[{title:'Risposta in attesa',facts:[{label:'Tempo rimasto',value:`${Math.max(0,Math.ceil(this.timer))} secondi`}]},...blocks],actions:[],back};
    const players=mp.remotePlayers();
    if(!players.length)blocks.unshift({title:'Nessun avversario qui',body:'I duelli si fanno tra presenti. Prova una mappa con più giocatori.'});
    const valid=Boolean(validateWireTeam(wire));
    if(!valid)blocks.unshift({title:'Squadra non idonea',body:'Serve una squadra valida per iniziare il duello.'});
    return {title:'Duello in diretta',subtitle:`${players.length} avversari nella mappa`,blocks,
      actions:players.map((player,index)=>({label:player.nick,hint:'Invia la sfida con l’anteprima della tua squadra.',disabled:!valid,run:()=>{if(!live())return;this.index=index;this.sendInvite(player.id);}})),selected:Math.min(this.index,Math.max(0,players.length-1)),back};
  }
  draw(screen:Screen):void {screen.clear('#17243d');}
}

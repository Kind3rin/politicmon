// LOBBY DEL DUELLO PvP: lista dei giocatori online sulla mappa corrente,
// invito con anteprima livelli (consenso informato, C11) e handshake
// invite -> accept -> start. Chi invita è HOST. Raggiungibile dal menu pausa
// (DUELLO PVP) o direttamente dal menu SFIDA su un giocatore adiacente
// (opts.invitePeerId): stesso code path in entrambi i casi.

import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import type { GameState } from "../game/state";
import { PvpBattleScene } from "../game/battle/PvpBattleScene";
import { recordDuelResult } from "../game/duelrecord";
import {
  avgLevel, DUEL_INVITE_TIMEOUT, maxLevel, serializeTeam, validateWireTeam, type DuelMsg
} from "../net/duelproto";
import { mp } from "../net/mp";
import { loadNick } from "../net/profile";
import { clipToWidth, MessageBox, GREY, PAPER } from "../ui/widgets";

export interface DuelLobbyOptions {
  // Invita subito questo peer (menu SFIDA sul giocatore adiacente).
  invitePeerId?: string;
}

export class DuelLobbyScene implements Scene {
  private index = 0;
  private msg = new MessageBox();
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
    mp.duelBusy = true; // inviti altrui -> auto-decline "OCCUPATO"
    this.prevOnDuel = mp.onDuel;
    mp.onDuel = (msg, peerId) => this.onDuelMsg(msg, peerId);
    if (this.opts.invitePeerId) {
      this.sendInvite(this.opts.invitePeerId);
    }
  }

  onExit(): void {
    mp.duelBusy = false;
    mp.onDuel = this.prevOnDuel;
  }

  private sendInvite(peerId: string): void {
    const remote = mp.remotes.get(peerId);
    if (!remote) {
      this.msg.show(["SI È GIÀ SCOLLEGATO. LA POLITICA È CRUDELE."]);
      return;
    }
    if (this.state.party.length === 0) {
      this.msg.show(["TI SERVE ALMENO UN POLITICMON PER DUELLARE."]);
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
    if (msg.duelId !== this.duelId || peerId !== this.targetPeerId) {
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
      this.msg.show([
        msg.reason === "OCCUPATO"
          ? `${this.targetNick} È OCCUPATO IN UN ALTRO DIBATTITO.`
          : `${this.targetNick} HA DECLINATO LA SFIDA. NIENTE DIRETTA.`
      ]);
      return;
    }
    if (msg.type === "accept") {
      const guestTeam = validateWireTeam(msg.team);
      if (!guestTeam) {
        this.waiting = false;
        mp.sendDuel({ v: 1, duelId: this.duelId, type: "decline", reason: "SQUADRA NON VALIDA" }, peerId);
        this.msg.show(["SQUADRA NON VALIDA: LA COMMISSIONE DI GARANZIA ANNULLA IL DUELLO."]);
        return;
      }
      const hostWire = serializeTeam(this.state.party);
      if (!validateWireTeam(hostWire)) {
        this.waiting = false;
        mp.sendDuel({ v: 1, duelId: this.duelId, type: "decline", reason: "SQUADRA NON VALIDA" }, peerId);
        this.msg.show(["LA TUA SQUADRA NON PASSA LA COMMISSIONE DI GARANZIA."]);
        return;
      }
      this.waiting = false;
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

  update(dt: number): void {
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    if (this.waiting) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.waiting = false;
        this.msg.show(["NESSUNA RISPOSTA. RITENTA PIÙ TARDI."]);
      }
      if (this.input.wasPressed("b")) {
        audio.cancel();
        this.waiting = false;
      }
      return;
    }
    const players = mp.remotePlayers();
    if (this.index >= players.length) {
      this.index = Math.max(0, players.length - 1);
    }
    if (this.input.wasPressed("b")) {
      audio.cancel();
      this.stack.pop();
      return;
    }
    if (players.length === 0) {
      return;
    }
    if (this.input.wasPressed("up")) {
      this.index = (this.index + players.length - 1) % players.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down")) {
      this.index = (this.index + 1) % players.length;
      audio.cursor();
    }
    if (this.input.wasPressed("a")) {
      this.sendInvite(players[this.index].id);
    }
  }

  draw(screen: Screen): void {
    screen.clear("#2e3e52");
    screen.text("DUELLO PVP - SFIDA IN DIRETTA", 8, 5, PAPER);
    const wire = serializeTeam(this.state.party);
    screen.text(`LA TUA SQUADRA: LV MEDIO ${avgLevel(wire)} (MAX ${maxLevel(wire)})`, 8, 16, GREY);
    screen.text("SI DUELLA A SQUADRE FRESCHE: HP E PP AL MASSIMO.", 8, 26, GREY);

    if (this.waiting) {
      screen.text(`SFIDA INVIATA A ${this.targetNick}.`, 12, 70, PAPER);
      screen.text(`RISPOSTA ENTRO ${Math.max(0, Math.ceil(this.timer))}S...`, 12, 84, GREY);
      screen.text("B: ANNULLA L'ATTESA", 12, VIEW_H - 12, GREY);
      this.msg.draw(screen);
      return;
    }

    const players = mp.remotePlayers();
    if (players.length === 0) {
      screen.text("NESSUNO IN ZONA SU QUESTA MAPPA.", 12, 70, GREY);
      screen.text("I DUELLI SI FANNO TRA PRESENTI.", 12, 80, GREY);
    } else {
      screen.text("SFIDANTI IN ZONA:", 8, 40, PAPER);
      for (let i = 0; i < Math.min(8, players.length); i += 1) {
        const y = 52 + i * 13;
        const selected = i === this.index;
        if (selected) {
          screen.rect(6, y - 2, VIEW_W - 12, 12, "#3a4c64");
          screen.text("►", 10, y, PAPER);
        }
        screen.text(clipToWidth(players[i].nick, 140), 20, y, selected ? PAPER : GREY);
      }
      screen.text("A: SFIDA  B: CHIUDI", 8, VIEW_H - 12, GREY);
    }
    this.msg.draw(screen);
  }
}

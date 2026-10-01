// SCAMBIO 1:1 con un altro giocatore online (stessa mappa, adiacenti).
// UI a due colonne stile BoxScene: a sinistra il tuo party (scegli chi
// offrire), a destra la card dell'offerta remota. Doppia conferma con
// sequence number: cambiare offerta invalida le conferme su entrambi i lati.
// Il mostro ricevuto è SEMPRE ricostruito localmente (vedi net/trade.ts).

import { drawMonsterSprite } from "../art/monsters";
import { MOVES } from "../data/moves";
import { TYPE_COLORS, typeLabelColor } from "../data/poltypes";
import { audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Scene, SceneStack } from "../engine/scene";
import { Screen, VIEW_H, VIEW_W } from "../engine/screen";
import { evolve, speciesOf, statsOf, tradeEvolution, type Monster } from "../game/monster";
import { bumpDailyQuest } from "../game/dailyquests";
import { markCaught, markSeen, saveGame, type GameState } from "../game/state";
import { drawNetworkBackdrop } from "../ui/socialArt";
import { mp } from "../net/mp";
import { EvolutionScene } from "./EvolutionScene";
import { drawScreenHeader, drawHpBar, MessageBox, INK, PAPER } from "../ui/widgets";

export interface TradeOptions {
  peerId: string;
  peerNick: string;
}

export class TradeScene implements Scene {
  private index = 0;
  private committed = false;
  private closing = false;
  private msg = new MessageBox();

  constructor(
    private stack: SceneStack,
    private input: Input,
    private state: GameState,
    private opts: TradeOptions
  ) {}

  // Mentre lo scambio è aperto siamo "occupati": inviti duello/trade in arrivo
  // ricevono auto-decline (mutua esclusione trade/duello, conflitto #5).
  onEnter(): void {
    mp.duelBusy = true;
  }

  onExit(): void {
    mp.duelBusy = false;
  }

  update(dt: number): void {
    mp.update(dt);
    mp.trade.tick(dt);
    if (this.msg.isOpen) {
      this.msg.update(dt, this.input);
      return;
    }
    const s = mp.trade;

    if (s.phase === "idle") {
      // Decline/cancel/timeout/peer sparito: notifica e chiudi.
      if (!this.closing) {
        this.closing = true;
        const n = s.noticeMsg;
        s.noticeMsg = null;
        this.msg.show([n ?? "SCAMBIO ANNULLATO."], () => this.stack.pop());
      }
      return;
    }

    if (s.phase === "committed" && !this.committed) {
      this.committed = true;
      const recv = s.peerOffer!;
      this.applyCommit(recv);
      audio.catchJingle();
      // EVOLUZIONE DA SCAMBIO: se la specie ricevuta ha una regola trade,
      // il "cambio di casacca" la evolve appena entrata in squadra.
      const evoTarget = tradeEvolution(recv);
      this.msg.show(
        [
          `SCAMBIO COMPLETATO! ${speciesOf(recv).name} CAMBIA CASACCA ED ENTRA NELLA TUA SQUADRA.`,
          "TRASFORMISMO RIUSCITO!"
        ],
        () => {
          s.reset();
          if (evoTarget) {
            const fromId = recv.speciesId;
            this.stack.push(
              new EvolutionScene(this.stack, this.input, fromId, evoTarget, () => {
                evolve(recv, evoTarget);
                // Come per applyCommit: dex globale sì, gate di zona no finché
                // non lo catturi sul campo (pattern dex-trade C10).
                if (this.state.dex[evoTarget] !== "caught") {
                  this.state.flags[`dex-trade:${evoTarget}`] = true;
                }
                markSeen(this.state, evoTarget);
                markCaught(this.state, evoTarget);
                saveGame(this.state);
                this.stack.pop(); // chiude anche la TradeScene
              }, { mon: recv, reduceEffects: this.state.reduceEffects, battleSpeed: this.state.battleSpeed, onDecline: () => this.stack.pop() })
            );
            return;
          }
          this.stack.pop();
        }
      );
      return;
    }

    if (s.phase === "inviting") {
      if (this.input.wasPressed("b")) {
        audio.cancel();
        s.cancel();
        this.stack.pop();
      }
      return;
    }

    if (s.phase !== "negotiating") {
      return;
    }

    const party = this.state.party;
    if (this.input.wasPressed("up") && party.length > 0) {
      this.index = (this.index + party.length - 1) % party.length;
      audio.cursor();
    }
    if (this.input.wasPressed("down") && party.length > 0) {
      this.index = (this.index + 1) % party.length;
      audio.cursor();
    }
    if (this.input.wasPressed("a")) {
      const mon = party[this.index];
      if (!mon) {
        return;
      }
      if (s.mySeq > 0 && s.myOfferUid === mon.uid) {
        // A sul candidato già offerto = conferma (serve l'offerta dell'altro).
        if (!s.peerOffer) {
          audio.cancel();
          this.msg.show(["ATTENDI LA SUA OFFERTA PRIMA DI CONFERMARE."]);
        } else if (!s.myConfirmed) {
          s.confirm();
          audio.confirm();
        }
        return;
      }
      // A su un altro candidato = nuova offerta (azzera le conferme di entrambi).
      s.setOffer(mon);
      audio.confirm();
      return;
    }
    if (this.input.wasPressed("b")) {
      // B annulla lo scambio (l'altro riceve "SCAMBIO ANNULLATO").
      audio.cancel();
      s.cancel();
      this.stack.pop();
    }
  }

  // Swap atomico: il tuo slot viene sostituito dal mostro ricostruito. Save
  // IMMEDIATO (anti-dupe C8). Ministeri orfani puliti. Dex: caught globale ma
  // escluso dai gate di zona finché non lo catturi davvero (C10, pattern
  // mattarellux — flag "dex-trade:<specie>").
  private applyCommit(received: Monster): void {
    const i = this.state.party.findIndex((m) => m.uid === mp.trade.myOfferUid);
    if (i < 0) {
      this.state.party.push(received);
    } else {
      const out = this.state.party[i];
      this.state.party[i] = received;
      for (const k of Object.keys(this.state.ministri)) {
        if (this.state.ministri[k] === out.uid) {
          delete this.state.ministri[k];
        }
      }
    }
    if (this.state.dex[received.speciesId] !== "caught") {
      this.state.flags[`dex-trade:${received.speciesId}`] = true;
    }
    markCaught(this.state, received.speciesId);
    this.state.flags["trade-done"] = true;
    bumpDailyQuest(this.state, "social1"); // uno scambio completato conta
    saveGame(this.state);
  }

  draw(screen: Screen): void {
    drawNetworkBackdrop(screen);
    const s = mp.trade;
    const nick = s.peerNick || this.opts.peerNick || "ANONIMO";
    drawScreenHeader(screen, "SCAMBIO", nick);

    if (s.phase === "inviting") {
      screen.textFit(`PROPOSTA INVIATA A ${nick}.`, 12, 60, 216, PAPER);
      screen.text("IN ATTESA DI RISPOSTA...", 12, 74, "#a9b9ca");
      screen.text("B: ANNULLA", 12, VIEW_H - 12, "#a9b9ca");
      this.msg.draw(screen);
      return;
    }

    this.drawPartyColumn(screen, s.myOfferUid);
    this.drawOfferColumn(screen);

    // Badge conferme + footer contestuale.
    const tu = s.myConfirmed ? "OK" : "...";
    const lui = s.peerConfirmed ? "OK" : "...";
    screen.text(`TU: ${tu}  LUI: ${lui}`, 8, 157, s.myConfirmed && s.peerConfirmed ? "#7ad858" : PAPER);
    screen.textFit(this.footerHint(), 6, 166, VIEW_W - 12, "#e8c84a");
    screen.text("B: ANNULLA  VICINI, DOPPIA CONFERMA", 6, 173, "#a9b9ca");

    this.msg.draw(screen);
  }

  private footerHint(): string {
    const s = mp.trade;
    if (s.myConfirmed) {
      return "CONFERMATO. ATTESA DELL'ALTRO...";
    }
    if (s.mySeq > 0 && s.peerOffer) {
      return "A: CONFERMA / ALTRO MON: CAMBIA";
    }
    if (s.mySeq > 0) {
      return "OFFERTA INVIATA. ATTESA DELLA SUA...";
    }
    return "SCEGLI CHI OFFRIRE (A)  B: ANNULLA";
  }

  private drawPartyColumn(screen: Screen, offeredUid: string): void {
    const x = 4;
    const w = VIEW_W / 2 - 6;
    screen.text("LA TUA SQUADRA", x + 4, 24, "#a9b9ca");
    const party = this.state.party;
    for (let i = 0; i < party.length; i += 1) {
      const mon = party[i];
      const y = 34 + i * 20;
      const selected = i === this.index;
      const offered = mon.uid === offeredUid && mp.trade.mySeq > 0;
      screen.rect(x + 2, y, w - 4, 19, selected ? "#fffaf0" : "#dce4e3");
      if (offered) {
        screen.frame(x + 2, y, w - 4, 19, "#f0c040");
      } else if (selected) {
        screen.frame(x + 2, y, w - 4, 19, INK);
      }
      drawMonsterSprite(screen, mon.speciesId, x + 3, y + 1, 18, 17);
      const ink = INK;
      screen.textFit(speciesOf(mon).name, x + 22, y + 2, w - 28, ink);
      screen.text(`L${mon.level}`, x + 22, y + 11, ink);
      drawHpBar(screen, x + 62, y + 11, w - 68, mon.hp, statsOf(mon).hp);
      if (offered) {
        screen.rect(x + w - 6, y + 3, 3, 3, "#b88628");
      }
    }
  }

  private drawOfferColumn(screen: Screen): void {
    const x = VIEW_W / 2 + 2, w = VIEW_W / 2 - 6;
    const offer = mp.trade.peerOffer;
    screen.text("OFFERTA REMOTA", x + 4, 24, "#a9b9ca");
    screen.panel(x, 32, w, 122, "card");
    if (!offer) {
      screen.text("IN ATTESA DELLA", x + 6, 69, "#526279");
      screen.text("SUA OFFERTA", x + 6, 80, "#526279");
      return;
    }
    const species = speciesOf(offer);
    screen.textFit(species.name, x + 6, 40, w - 12, INK);
    drawMonsterSprite(screen, offer.speciesId, x + 6, 51, 34, 30);
    screen.text(`LV ${offer.level}`, x + 45, 55, INK);
    screen.textFit("PV/PP PIENI", x + 45, 71, w - 50, "#23654e");
    species.types.forEach((type,i) => {
      screen.rect(x + 6, 84 + i * 12, w - 12, 10, TYPE_COLORS[type]);
      screen.text(type, x + 9, 86 + i * 12, typeLabelColor(type));
    });
    for (let i = 0; i < Math.min(4, offer.moves.length); i += 1) {
      const move = MOVES[offer.moves[i].id];
      screen.textFit(move.name, x + 6, 113 + i * 9, w - 12, INK);
    }
  }
}

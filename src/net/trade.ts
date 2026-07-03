// SCAMBI P2P: protocollo e macchina a stati del baratto 1:1 tra giocatori
// sulla stessa mappa. Nessun import da mp.ts (mp importa QUESTO modulo): il
// send è iniettato dal costruttore. Tutta la fiducia è locale: il mostro in
// arrivo viene SEMPRE ricostruito con createMonster (anti-cheat, vedi
// sanitizeTradeMon) — mai deserializzare stats/hp/exp/uid dal filo.

import { MOVES } from "../data/moves";
import { SPECIES } from "../data/species";
import { createMonster, LEVEL_CAP, type Monster } from "../game/monster";
import { legalMoveForSpecies } from "./duelproto";
import { sanitizeNick } from "./profile";

export type TradeWire = { v: 1; to: string } & (
  | { t: "invite"; nick: string }
  | { t: "accept"; nick: string }
  | { t: "decline" }
  | { t: "offer"; seq: number; mon: { speciesId: string; level: number; moves: string[] } }
  | { t: "confirm"; mySeq: number; peerSeq: number }
  | { t: "cancel" }
  | { t: "done"; mySeq: number; peerSeq: number }
);

export type TradePhase = "idle" | "inviting" | "invited" | "negotiating" | "committing" | "committed";

export const INVITE_TIMEOUT = 20; // secondi di attesa risposta all'invito
export const NEGOTIATE_TIMEOUT = 90; // secondi di inattività in negoziazione
export const DECLINE_MUTE = 10; // anti-spam: silenzia i re-inviti dopo un rifiuto

// ANTI-CHEAT (audit C7): sul filo passano SOLO {speciesId, level, moves[]}.
// Qui si ricostruisce il mostro da zero: specie validata su SPECIES, livello
// clampato 1-50 (cap di gainExp), mosse accettate solo se esistono in MOVES e
// passano legalMoveForSpecies (stesso predicato del duello: learnset o tipo
// condiviso lungo TUTTA la catena pre-evolutiva — evolve() conserva le mosse).
// hp/exp/pp/uid/stats sono rigenerati localmente da createMonster.
export function sanitizeTradeMon(p: unknown): Monster | null {
  const raw = p as { speciesId?: unknown; level?: unknown; moves?: unknown } | null;
  const species = SPECIES[String(raw?.speciesId)];
  if (!species) {
    return null;
  }
  const level = Math.max(1, Math.min(LEVEL_CAP, Math.floor(Number(raw?.level)) || 1));
  const mon = createMonster(species.id, level);
  const req = Array.isArray(raw?.moves) ? (raw.moves as unknown[]).slice(0, 8).map(String) : [];
  const valid = [...new Set<string>(req)]
    .filter((id) => MOVES[id] && legalMoveForSpecies(species.id, id))
    .slice(0, 4);
  if (valid.length > 0) {
    mon.moves = valid.map((id) => ({ id, pp: MOVES[id].pp }));
  }
  return mon;
}

export interface PendingTradeInvite {
  peerId: string;
  nick: string;
  at: number; // wall-clock (Date.now): scade anche se i tick non girano
}

// Macchina a stati dello scambio. `sendWire` invia MIRATO al peer (Trystero
// options.target) e l'envelope porta anche `to` (difesa in profondità: il
// ricevente scarta ciò che non è per lui).
export class TradeSession {
  phase: TradePhase = "idle";
  peerId = "";
  peerNick = "";
  myOfferUid = "";
  mySeq = 0;
  peerSeq = -1;
  peerOffer: Monster | null = null;
  myConfirmed = false;
  peerConfirmed = false;
  private peerDone = false;
  noticeMsg: string | null = null;
  pendingInvite: PendingTradeInvite | null = null;
  onCommit: ((received: Monster) => void) | null = null; // impostato da TradeScene

  private timer = 0;
  private declinedAt = new Map<string, number>();

  constructor(
    private selfId: string,
    private sendWire: (m: TradeWire, target: string) => void,
    private isBusy: () => boolean = () => false
  ) {}

  invite(peerId: string, myNick: string): void {
    if (this.phase !== "idle") {
      return;
    }
    this.reset();
    this.phase = "inviting";
    this.peerId = peerId;
    this.timer = INVITE_TIMEOUT;
    this.send({ v: 1, to: peerId, t: "invite", nick: myNick });
  }

  // Consuma il pendingInvite (chiamare dopo che il giocatore ha detto SÌ).
  acceptInvite(myNick: string): void {
    const inv = this.pendingInvite;
    this.pendingInvite = null;
    if (!inv || this.phase !== "idle") {
      return;
    }
    this.phase = "negotiating";
    this.peerId = inv.peerId;
    this.peerNick = inv.nick;
    this.timer = NEGOTIATE_TIMEOUT;
    this.send({ v: 1, to: inv.peerId, t: "accept", nick: myNick });
  }

  declineInvite(): void {
    const inv = this.pendingInvite;
    this.pendingInvite = null;
    if (!inv) {
      return;
    }
    this.declinedAt.set(inv.peerId, Date.now());
    this.send({ v: 1, to: inv.peerId, t: "decline" });
  }

  setOffer(mon: Monster): void {
    if (this.phase !== "negotiating") {
      return;
    }
    this.myOfferUid = mon.uid;
    this.mySeq += 1;
    this.myConfirmed = false;
    this.peerConfirmed = false;
    this.peerDone = false;
    this.timer = NEGOTIATE_TIMEOUT;
    this.send({
      v: 1,
      to: this.peerId,
      t: "offer",
      seq: this.mySeq,
      mon: { speciesId: mon.speciesId, level: mon.level, moves: mon.moves.map((s) => s.id) }
    });
  }

  confirm(): void {
    if (this.phase !== "negotiating" || this.mySeq <= 0 || !this.peerOffer || this.myConfirmed) {
      return;
    }
    this.myConfirmed = true;
    this.timer = NEGOTIATE_TIMEOUT;
    this.send({ v: 1, to: this.peerId, t: "confirm", mySeq: this.mySeq, peerSeq: this.peerSeq });
    if (this.peerConfirmed) {
      this.beginCommit();
    }
  }

  cancel(notice?: string): void {
    if (this.peerId && (this.phase === "inviting" || this.phase === "negotiating" || this.phase === "committing")) {
      this.send({ v: 1, to: this.peerId, t: "cancel" });
    }
    this.reset(notice);
  }

  tick(dt: number): void {
    // Il pendingInvite scade a orologio (i tick possono non girare nei menu).
    if (this.pendingInvite && Date.now() - this.pendingInvite.at > INVITE_TIMEOUT * 1000) {
      this.pendingInvite = null;
    }
    if (this.phase === "inviting" || this.phase === "negotiating" || this.phase === "committing") {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.cancel(
          this.phase === "inviting"
            ? "NESSUNA RISPOSTA. RIPROVA PIÙ TARDI."
            : "TEMPO SCADUTO. IL MERCATO DELLE VACCHE CHIUDE."
        );
      }
    }
  }

  peerLeft(id: string): void {
    if (this.pendingInvite?.peerId === id) {
      this.pendingInvite = null;
    }
    if (this.peerId === id && this.phase !== "idle" && this.phase !== "committed") {
      this.reset("L'ALTRO È SPARITO. SEDUTA TOLTA.");
    }
  }

  onWire(msg: TradeWire, from: string): void {
    if (!msg || msg.v !== 1 || (msg.to && msg.to !== this.selfId)) {
      return;
    }
    switch (msg.t) {
      case "invite": {
        // Invito incrociato: se stavo invitando LO STESSO peer, vale come accept.
        if (this.phase === "inviting" && from === this.peerId) {
          this.phase = "negotiating";
          this.peerNick = sanitizeNick(String(msg.nick)) || "ANONIMO";
          this.timer = NEGOTIATE_TIMEOUT;
          return;
        }
        if (this.phase !== "idle" || this.isBusy()) {
          this.send({ v: 1, to: from, t: "decline" }); // occupato
          return;
        }
        const mutedAt = this.declinedAt.get(from);
        if (mutedAt && Date.now() - mutedAt < DECLINE_MUTE * 1000) {
          return; // anti-spam post-rifiuto: ignora in silenzio
        }
        this.pendingInvite = { peerId: from, nick: sanitizeNick(String(msg.nick)) || "ANONIMO", at: Date.now() };
        return;
      }
      case "accept": {
        if (this.phase === "inviting" && from === this.peerId) {
          this.phase = "negotiating";
          this.peerNick = sanitizeNick(String(msg.nick)) || "ANONIMO";
          this.timer = NEGOTIATE_TIMEOUT;
        }
        return;
      }
      case "decline": {
        if (this.phase === "inviting" && from === this.peerId) {
          this.reset("HA DECLINATO. NIENTE INCIUCIO.");
        }
        return;
      }
      case "offer": {
        if (from !== this.peerId) {
          return;
        }
        // Nuova offerta mentre siamo in commit = revoca dopo le conferme:
        // commit invalidato per ENTRAMBI, nessuno swappa.
        if (this.phase === "committing") {
          this.cancel("SCAMBIO ANNULLATO.");
          return;
        }
        if (this.phase !== "negotiating") {
          return;
        }
        const m = sanitizeTradeMon(msg.mon);
        if (m === null) {
          this.cancel("OFFERTA IRRICEVIBILE. SCAMBIO ANNULLATO.");
          return;
        }
        this.peerOffer = m;
        this.peerSeq = Math.floor(Number(msg.seq)) || 0;
        // Nuova offerta = si riparte con le conferme (niente commit asimmetrico).
        this.myConfirmed = false;
        this.peerConfirmed = false;
        this.peerDone = false;
        this.timer = NEGOTIATE_TIMEOUT;
        return;
      }
      case "confirm": {
        if (this.phase !== "negotiating" || from !== this.peerId) {
          return;
        }
        // Conferme stantie (seq di offerte superate) vengono ignorate.
        if (msg.mySeq !== this.peerSeq || msg.peerSeq !== this.mySeq) {
          return;
        }
        this.peerConfirmed = true;
        if (this.myConfirmed) {
          this.beginCommit();
        }
        return;
      }
      case "cancel": {
        if (from === this.peerId && this.phase !== "idle" && this.phase !== "committed") {
          this.reset("SCAMBIO ANNULLATO.");
        }
        return;
      }
      case "done": {
        if (from !== this.peerId) {
          return;
        }
        const seqOk = msg.mySeq === this.peerSeq && msg.peerSeq === this.mySeq;
        if (seqOk && this.phase === "committing") {
          this.peerDone = true;
          this.commit();
          return;
        }
        if (seqOk && this.phase === "negotiating") {
          this.peerDone = true; // il nostro beginCommit lo raccoglierà
          return;
        }
        // done con seq superate (revoca in corsa dopo un confirm): il commit
        // è invalidato per ENTRAMBI, nessuno swappa.
        if (this.phase === "negotiating" || this.phase === "committing") {
          this.cancel("SCAMBIO ANNULLATO.");
        }
        return;
      }
    }
  }

  // COMMIT A DUE FASI (anti one-sided swap): con la doppia conferma si entra
  // in "committing" e si invia done{seq}; lo swap parte SOLO quando ANCHE il
  // peer ha raggiunto il commit con le stesse seq. Una revoca (cancel/offer)
  // che arriva prima del done del peer annulla tutto: nessuno dei due swappa.
  private beginCommit(): void {
    this.phase = "committing";
    this.timer = NEGOTIATE_TIMEOUT;
    this.send({ v: 1, to: this.peerId, t: "done", mySeq: this.mySeq, peerSeq: this.peerSeq });
    if (this.peerDone) {
      this.commit();
    }
  }

  // ANTI-DUPE (C8): il commit scatta SOLO con doppia conferma + doppio done
  // sulle stesse seq. Se il peer sparisce prima, peerLeft/timeout annullano
  // tutto e il party locale resta intatto. Lo swap effettivo (e il saveGame
  // IMMEDIATO) è di TradeScene via onCommit.
  private commit(): void {
    this.phase = "committed";
    this.onCommit?.(this.peerOffer!);
    // NON resetta: TradeScene legge peerOffer, applica lo swap e poi chiama reset().
  }

  reset(notice?: string): void {
    this.phase = "idle";
    this.peerId = "";
    this.peerNick = "";
    this.myOfferUid = "";
    this.mySeq = 0;
    this.peerSeq = -1;
    this.peerOffer = null;
    this.myConfirmed = false;
    this.peerConfirmed = false;
    this.peerDone = false;
    // Fine/abbandono sessione (incluso leave() al cambio room): un invito
    // pendente ricevuto prima punterebbe a un peer non più raggiungibile.
    this.pendingInvite = null;
    this.timer = 0;
    this.noticeMsg = notice ?? null;
  }

  private send(m: TradeWire): void {
    this.sendWire(m, m.to);
  }
}

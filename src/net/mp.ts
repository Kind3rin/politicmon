// Client multiplayer P2P (presence + chat) per Politicmon.
// 100% peer-to-peer via WebRTC (libreria Trystero, scoperta peer su relay Nostr
// pubblici e gratuiti): NESSUN server proprio, nessun account, nessun costo,
// nessun rischio di addebito anche superando qualunque limite. I dati di gioco
// passano direttamente tra i browser.
//
// Una "room" per ogni mappa (room id = `politicmon-<mapId>`): vedi solo i
// giocatori presenti sulla tua stessa mappa. L'interfaccia pubblica (mp.*) è
// identica alla versione precedente, così il resto del gioco non cambia.

import { joinRoom, selfId, type Room } from "trystero/nostr";
import type { Facing } from "../art/characters";
import { TradeSession, type TradeWire } from "./trade";
import type { DuelMsg } from "./duelproto";

export interface RemotePlayer {
  id: string;
  nick: string;
  speciesId: string;
  x: number;
  y: number;
  dispX: number;
  dispY: number;
  facing: Facing;
  moving: boolean;
  emote: string | null;
  emoteT: number;
}

export interface ChatLine {
  id: string;
  nick: string;
  text: string;
  t: number;
}

type Identity = { nick: string; speciesId: string };
type Profile = { nick: string; speciesId: string; x: number; y: number; facing: Facing };
type PosMsg = { x: number; y: number; facing: Facing };

// Namespace univoco dell'app (separa Politicmon da altre room sui relay).
const APP_ID = "politicmon-v1";

// Configurazione ICE per la connessione WebRTC tra peer. Senza un server TURN il
// solo STUN basta in LAN e con NAT "cone", ma fallisce con NAT simmetrico/CGNAT
// (la maggior parte delle reti mobili e molti router domestici): nessuna coppia
// di candidate riesce a collegarsi e il multiplayer "funziona solo in locale".
// Il TURN fa da relay quando il collegamento diretto è impossibile; la voce
// `turns:443?transport=tcp` salva pure le reti che bloccano l'UDP.
//
// Le credenziali di default sono il relay pubblico demo OpenRelay (quota bassa,
// ok per sbloccare subito). Per la versione pubblica registrare un TURN gratuito
// (Metered/Cloudflare/Twilio) e passarlo via env senza hardcodarlo.
const TURN_URL = import.meta.env.VITE_TURN_URL as string | undefined;
const TURN_USER = import.meta.env.VITE_TURN_USER as string | undefined;
const TURN_CRED = import.meta.env.VITE_TURN_CRED as string | undefined;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
  TURN_URL && TURN_USER && TURN_CRED
    ? { urls: TURN_URL, username: TURN_USER, credential: TURN_CRED }
    : {
        urls: [
          "turn:openrelay.metered.ca:80",
          "turn:openrelay.metered.ca:443",
          "turns:openrelay.metered.ca:443?transport=tcp",
        ],
        username: "openrelayproject",
        credential: "openrelayproject",
      },
];

const RTC_CONFIG: RTCConfiguration = { iceServers: ICE_SERVERS };

class MultiplayerClient {
  private room: Room | null = null;
  private roomMap: string | null = null;
  private identity: Identity = { nick: "ANONIMO", speciesId: "player" };
  private pos = { x: 0, y: 0, facing: "down" as Facing };
  private enabled = true;
  private chatCounter = 0;

  // Azioni Trystero (inizializzate al join della room).
  private sendProfile: ((p: Profile) => void) | null = null;
  private sendPos: ((p: PosMsg) => void) | null = null;
  private sendEmoteAction: ((e: string) => void) | null = null;
  private sendChatAction: ((m: string) => void) | null = null;
  private sendTradeWire: ((m: TradeWire, target: string) => void) | null = null;
  private sendDuelAction: ((m: DuelMsg, target: string) => void) | null = null;

  readonly remotes = new Map<string, RemotePlayer>();
  readonly chat: ChatLine[] = [];
  onlineCount = 0;
  connected = false;

  // DUELLO PvP: callback registrato dalle scene (WorldScene di base; lobby e
  // PvpBattleScene lo prendono in consegna e lo ripristinano all'uscita).
  onDuel: ((msg: DuelMsg, peerId: string) => void) | null = null;
  // Peer uscito dalla room: serve alla PvpBattleScene per la vittoria a
  // tavolino su disconnessione.
  onPeerGone: ((peerId: string) => void) | null = null;

  // Vero mentre il giocatore è impegnato (battaglia PVE/PvP, TradeScene, lobby
  // duello): gli inviti trade/duello in arrivo ricevono auto-decline "OCCUPATO".
  duelBusy = false;

  // Sessione di scambio (unica, riusata): il send è no-op senza room, la
  // sessione va comunque in timeout da sola.
  readonly trade = new TradeSession(
    selfId,
    (m, target) => this.sendTradeWire?.(m, target),
    () => this.duelBusy
  );

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.leave();
    } else if (this.roomMap) {
      this.join(this.roomMap);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setIdentity(nick: string, speciesId: string): void {
    this.identity = { nick: nick || "ANONIMO", speciesId: speciesId || "player" };
    // Se già in una room, ripresenta il profilo aggiornato.
    this.broadcastProfile();
  }

  // Entra nella room di una mappa (al cambio mappa). Lascia la room precedente.
  joinMap(mapId: string, x: number, y: number, facing: Facing): void {
    this.pos = { x, y, facing };
    if (!this.enabled) {
      return;
    }
    if (this.roomMap === mapId && this.room) {
      this.broadcastProfile();
      return;
    }
    this.join(mapId);
  }

  sendMove(x: number, y: number, facing: Facing): void {
    this.pos = { x, y, facing };
    this.sendPos?.({ x, y, facing });
  }

  sendEmote(emote: string): void {
    this.sendEmoteAction?.(emote);
  }

  sendChat(text: string): void {
    const m = text.trim().slice(0, 80);
    if (!m) {
      return;
    }
    this.sendChatAction?.(m);
    // P2P: i miei messaggi non mi tornano indietro, li aggiungo localmente.
    this.pushChat(selfId, this.identity.nick, m);
  }

  update(dt: number): void {
    for (const r of this.remotes.values()) {
      const tx = r.x * 16;
      const ty = r.y * 16;
      const k = Math.min(1, dt * 10);
      r.dispX += (tx - r.dispX) * k;
      r.dispY += (ty - r.dispY) * k;
      r.moving = Math.abs(tx - r.dispX) > 0.5 || Math.abs(ty - r.dispY) > 0.5;
      if (r.emoteT > 0) {
        r.emoteT = Math.max(0, r.emoteT - dt);
        if (r.emoteT === 0) {
          r.emote = null;
        }
      }
    }
  }

  remotePlayers(): RemotePlayer[] {
    return [...this.remotes.values()];
  }

  isMe(id: string): boolean {
    return id === selfId;
  }

  get myId(): string {
    return selfId;
  }

  // Invia un messaggio duello MIRATO al peer (aggiunge `to` per il filtro in
  // ricezione). No-op senza room: i timeout delle scene coprono il resto.
  sendDuel(msg: DuelMsg, peerId: string): void {
    this.sendDuelAction?.({ ...msg, to: peerId }, peerId);
  }

  // ---- Interno ----

  private join(mapId: string): void {
    this.leave();
    this.roomMap = mapId;
    let room: Room;
    try {
      room = joinRoom({ appId: APP_ID, rtcConfig: RTC_CONFIG }, `map-${mapId}`, {
        onJoinError: (details) => {
          // Errore in fase di join alla room (relay irraggiungibile, ecc.).
          console.warn("[mp] join error", details.error);
        },
      });
    } catch {
      // WebRTC/relay non disponibili: il gioco resta in singleplayer.
      this.connected = false;
      return;
    }
    this.room = room;
    this.connected = true;

    // Canali tipizzati. In questa versione di Trystero makeAction restituisce
    // un oggetto { send, onMessage } e i callback ricevono (data, { peerId }).
    const profAction = room.makeAction<Profile>("prof");
    const posAction = room.makeAction<PosMsg>("pos");
    const emoAction = room.makeAction<string>("emo");
    const msgAction = room.makeAction<string>("msg");
    // SCAMBI: canale dedicato, send MIRATO al peer (SendOptions.target,
    // verificato in @trystero-p2p/core/dist/types.d.mts:86-108). L'envelope
    // porta comunque `to`, scartato in ricezione se non è per noi (difesa in
    // profondità contro eventuali fallback broadcast).
    const tradeAction = room.makeAction<TradeWire>("trade");
    const duelAction = room.makeAction<DuelMsg>("duel");
    this.sendProfile = (p) => void profAction.send(p);
    this.sendPos = (p) => void posAction.send(p);
    this.sendEmoteAction = (e) => void emoAction.send(e);
    this.sendChatAction = (m) => void msgAction.send(m);
    this.sendTradeWire = (m, target) => void tradeAction.send(m, { target });
    tradeAction.onMessage = (m, ctx) => this.trade.onWire(m, ctx.peerId);
    this.sendDuelAction = (m, target) => void duelAction.send(m, { target });
    duelAction.onMessage = (m, ctx) => {
      if (!m || m.v !== 1 || (m.to && m.to !== selfId)) {
        return; // difesa in profondità sul broadcast
      }
      // Occupato (battaglia/scambio/duello in corso) o nessuna scena in
      // ascolto: gli inviti ricevono subito un decline motivato.
      if (m.type === "invite" && (this.duelBusy || !this.onDuel)) {
        this.sendDuel({ v: 1, duelId: m.duelId, type: "decline", reason: "OCCUPATO" }, ctx.peerId);
        return;
      }
      this.onDuel?.(m, ctx.peerId);
    };

    profAction.onMessage = (prof, ctx) => {
      this.upsert(ctx.peerId, {
        nick: prof.nick, speciesId: prof.speciesId,
        x: prof.x, y: prof.y, facing: prof.facing
      });
    };
    posAction.onMessage = (d, ctx) => {
      const r = this.remotes.get(ctx.peerId);
      if (r) {
        r.x = Number(d.x) || 0;
        r.y = Number(d.y) || 0;
        r.facing = d.facing ?? r.facing;
      }
    };
    emoAction.onMessage = (e, ctx) => {
      const r = this.remotes.get(ctx.peerId);
      if (r) {
        r.emote = String(e).slice(0, 2);
        r.emoteT = 2.5;
      }
    };
    msgAction.onMessage = (m, ctx) => {
      const r = this.remotes.get(ctx.peerId);
      this.pushChat(ctx.peerId, r?.nick ?? "???", String(m).slice(0, 80));
    };

    // Quando un peer entra, mi presento subito a lui (così mi vede).
    room.onPeerJoin = () => {
      this.broadcastProfile();
    };
    // UNICA assegnazione di onPeerLeave (è una property: una seconda
    // assegnazione sovrascriverebbe la prima).
    room.onPeerLeave = (peerId) => {
      this.trade.peerLeft(peerId);
      this.onPeerGone?.(peerId);
      this.remotes.delete(peerId);
      this.onlineCount = this.remotes.size;
    };

    // Annuncio iniziale del mio profilo a chi è già nella room.
    this.broadcastProfile();
  }

  private leave(): void {
    this.sendProfile = this.sendPos = this.sendEmoteAction = this.sendChatAction = null;
    this.sendTradeWire = null;
    this.sendDuelAction = null;
    // Cambio mappa/disable = la room muore: qualsiasi scambio in corso è morto.
    // (onDuel/onPeerGone restano: appartengono alle scene.)
    this.trade.reset();
    this.remotes.clear();
    this.chat.length = 0;
    this.onlineCount = 0;
    this.connected = false;
    const room = this.room;
    this.room = null;
    if (room) {
      try {
        room.leave();
      } catch {
        // ignore
      }
    }
  }

  private broadcastProfile(): void {
    this.sendProfile?.({
      nick: this.identity.nick,
      speciesId: this.identity.speciesId,
      x: this.pos.x,
      y: this.pos.y,
      facing: this.pos.facing
    });
  }

  private upsert(id: string, p: { nick: string; speciesId: string; x: number; y: number; facing: Facing }): void {
    const existing = this.remotes.get(id);
    if (existing) {
      existing.nick = p.nick;
      existing.speciesId = p.speciesId;
      existing.x = p.x;
      existing.y = p.y;
      existing.facing = p.facing;
    } else {
      this.remotes.set(id, {
        id, nick: p.nick || "ANONIMO", speciesId: p.speciesId || "player",
        x: p.x, y: p.y, dispX: p.x * 16, dispY: p.y * 16,
        facing: p.facing, moving: false, emote: null, emoteT: 0
      });
    }
    this.onlineCount = this.remotes.size;
  }

  private pushChat(id: string, nick: string, text: string): void {
    this.chatCounter += 1;
    this.chat.push({ id, nick, text, t: this.chatCounter });
    if (this.chat.length > 30) {
      this.chat.shift();
    }
  }
}

export const mp = new MultiplayerClient();

// Esposto su window: utile per debug/diagnostica del multiplayer dalla console.
(globalThis as unknown as { __mp?: MultiplayerClient }).__mp = mp;

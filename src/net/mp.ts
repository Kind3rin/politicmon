// Client multiplayer P2P (presence + chat) per Politicmon.
// 100% peer-to-peer via WebRTC (libreria Trystero): NESSUN server proprio,
// nessun account, nessun costo. I dati di gioco passano direttamente tra i
// browser.
//
// Signaling: strategia MQTT (broker pubblici emqx/hivemq/mosquitto/shiftr).
// La strategia Nostr è stata abbandonata (2026-07-08): i relay pubblici ormai
// rifiutano gli eventi effimeri di trystero da pubkey sconosciute
// (damus: "rate-limited: you are noting too much", offchain.pub: "not in our
// web of trust", altri droppano in silenzio) → i peer non si scoprivano MAI.
// I broker MQTT pubblici non hanno web-of-trust né rate limit sul topic test.
//
// Una "room" per ogni mappa (room id = `politicmon-<mapId>`): vedi solo i
// giocatori presenti sulla tua stessa mappa. L'interfaccia pubblica (mp.*) è
// identica alla versione precedente, così il resto del gioco non cambia.

import { joinRoom, selfId, type Room } from "@trystero-p2p/mqtt";
import type { Facing } from "../art/characters";
import { SPECIES } from "../data/species";
import { TradeSession, type TradeWire } from "./trade";
import type { DuelMsg } from "./duelproto";
import { sanitizeNick } from "./profile";

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
  duelWins: number; // duelli PvP vinti dichiarati nel profilo (validati 0..99999)
  partyPreview: string[]; // speciesId dichiarati (max 6, validati contro SPECIES)
}

// Coordinata di mappa dal filo MAI fidata: intero clampato 0..255 (NaN → 0).
function clampCoord(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(255, n)) : 0;
}

// Dato dal filo MAI fidato: intero clampato 0..99999 (tutto il resto → 0).
function sanitizeDuelWins(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(99999, n)) : 0;
}

// Anteprima squadra dal filo MAI fidata: max 6 id, SOLO specie note (le altre
// scartate), stringhe pure. Difesa in profondità contro payload arbitrari.
function sanitizePartyPreview(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw === "string" && SPECIES[raw] && out.length < 6) {
      out.push(raw);
    }
  }
  return out;
}

export interface ChatLine {
  id: string;
  nick: string;
  text: string;
  t: number;
}

type Identity = { nick: string; speciesId: string; duelWins: number; partyPreview: string[] };
type Profile = { nick: string; speciesId: string; x: number; y: number; facing: Facing; duelWins?: number; party?: string[] };
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
// STUN: passati in rtcConfig.iceServers. ATTENZIONE: Trystero costruisce la
// config come `{ iceServers: defaultIceServers.concat(turnConfig ?? []), ...rtcConfig }`
// (peer.mjs), quindi rtcConfig.iceServers SOSTITUISCE l'intera lista: i TURN
// NON vanno qui (verrebbero scartati dai default), ma nello slot dedicato
// `turnConfig`, che invece viene CONCATENATO ai default.
const STUN_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
];

// TURN: PIÙ provider = niente single point of failure (prima c'era solo il
// demo openrelay: se saturo/down su 4G/CGNAT nessun peer si collegava). Primo
// slot da env (VITE_TURN_* = TURN dedicato Cloudflare/Metered account/Twilio),
// poi il relay pubblico openrelay come fallback. `turns:443?transport=tcp`
// salva le reti che bloccano l'UDP.
type TurnEntry = { urls: string | string[]; username?: string; credential?: string };

const TURN_URL = import.meta.env.VITE_TURN_URL as string | undefined;
const TURN_USER = import.meta.env.VITE_TURN_USER as string | undefined;
const TURN_CRED = import.meta.env.VITE_TURN_CRED as string | undefined;

const TURN_SERVERS: TurnEntry[] = [];
if (TURN_URL && TURN_USER && TURN_CRED) {
  // VITE_TURN_URL accetta PIÙ URL separati da virgola (Metered ne fornisce 3-4:
  // porta 80, 443, e turns:443?transport=tcp per le reti che bloccano l'UDP).
  const urls = TURN_URL.split(",").map((u) => u.trim()).filter(Boolean);
  TURN_SERVERS.push({ urls, username: TURN_USER, credential: TURN_CRED });
}
// NIENTE fallback pubblico: il demo OpenRelay (openrelay.metered.ca /
// "openrelayproject") è DISMESSO — verificato: zero candidate relay, le
// credenziali non allocano più. Tenerlo in lista aggiungeva solo latenza al
// gathering ICE senza mai funzionare. SENZA un TURN configurato il multiplayer
// funziona SOLO tra reti con NAT facili (stessa LAN, NAT cone): su CGNAT/4G
// la connessione P2P fallisce. Per il multiplayer su internet reale serve un
// TURN vero via env (gratis: account su metered.ca, 0.5GB/mese):
//   VITE_TURN_URL  = turn:<sub>.metered.ca:80,turn:<sub>.metered.ca:443,turns:<sub>.metered.ca:443?transport=tcp
//   VITE_TURN_USER = <username fornito>
//   VITE_TURN_CRED = <credential fornita>
// Su Vercel: Settings → Environment Variables, poi redeploy.

const RTC_CONFIG: RTCConfiguration = { iceServers: STUN_SERVERS };

class MultiplayerClient {
  private room: Room | null = null;
  private roomMap: string | null = null;
  private identity: Identity = { nick: "ANONIMO", speciesId: "player", duelWins: 0, partyPreview: [] };
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
      // Multiplayer disattivato del tutto: ora ha senso svuotare lo storico
      // chat (il cambio zona non lo fa più, vedi leave()).
      this.chat.length = 0;
    } else if (this.roomMap) {
      this.join(this.roomMap);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setIdentity(nick: string, speciesId: string): void {
    this.identity = {
      nick: nick || "ANONIMO", speciesId: speciesId || "player",
      duelWins: this.identity.duelWins, partyPreview: this.identity.partyPreview
    };
    // Se già in una room, ripresenta il profilo aggiornato.
    this.broadcastProfile();
  }

  // Anteprima squadra da esporre agli altri (ISPEZIONA). Chiamata al ritorno al
  // mondo e al load mappa; ri-broadcast solo se cambia (max 6 speciesId).
  setPartyPreview(ids: string[]): void {
    const clean = sanitizePartyPreview(ids);
    if (clean.join(",") === this.identity.partyPreview.join(",")) {
      return;
    }
    this.identity.partyPreview = clean;
    this.broadcastProfile();
  }

  // Aggiorna il record duelli mostrato agli altri (chiamata al ritorno al mondo
  // dopo un duello e al load della mappa). Ri-broadcast se cambia.
  setDuelWins(wins: number): void {
    const clean = sanitizeDuelWins(wins);
    if (clean === this.identity.duelWins) {
      return;
    }
    this.identity.duelWins = clean;
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
    if (this.sendChatAction) {
      this.sendChatAction(m);
      // P2P: i miei messaggi non mi tornano indietro, li aggiungo localmente.
      this.pushChat(selfId, this.identity.nick, m);
    } else {
      // Nessuna room/relay: l'invio sarebbe un no-op silenzioso. Segnalo che il
      // messaggio NON è partito, invece di far credere che sia stato inviato.
      this.pushChat("system", "OFFLINE", "MESSAGGIO NON INVIATO");
    }
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

  // Nick da mostrare per una riga di chat. Il nick viene risolto AL DISEGNO dal
  // peerId (ChatLine.id), non congelato all'arrivo: se un 'msg' arriva prima del
  // 'prof' del peer, la riga non resta "???" per sempre — appena il profilo
  // arriva, la riga mostra il nick giusto. Ricade sul nick salvato (mio nick per
  // i miei messaggi, "system"/"???" per gli altri) se il peer non è (più) noto.
  chatNick(line: ChatLine): string {
    if (line.id === selfId) {
      return this.identity.nick;
    }
    return this.remotes.get(line.id)?.nick ?? line.nick;
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
      room = joinRoom(
        { appId: APP_ID, rtcConfig: RTC_CONFIG, turnConfig: TURN_SERVERS },
        `map-${mapId}`,
        {
          onJoinError: (details) => {
            // Errore in fase di join alla room (relay irraggiungibile, ecc.).
            console.warn("[mp] join error", details.error);
          },
        }
      );
    } catch {
      // WebRTC/relay non disponibili: il gioco resta in singleplayer.
      this.connected = false;
      return;
    }
    this.room = room;
    // La room (relay Nostr) è aperta, ma NESSUN peer WebRTC è ancora connesso:
    // `connected` diventa true solo quando arriva/parte un peer reale (vedi
    // onPeerJoin/onPeerLeave), così la UI distingue "in cerca di giocatori" da
    // "connesso" e non maschera un fallimento TURN come se fosse online.

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
    // send() di Trystero è async e PUÒ rigettare (peer sparito mid-send, data
    // channel in teardown → InvalidStateError, backpressure in timeout). Con
    // `void` la Promise veniva scartata → unhandled rejection: in dev l'overlay
    // di Vite la mostra come un crash a schermo (tipico all'invio di un'emote,
    // che chiude subito la scena). Uno swallow esplicito è corretto: un send
    // P2P best-effort fallito non ha rimedio lato mittente.
    this.sendProfile = (p) => void profAction.send(p).catch(() => {});
    this.sendPos = (p) => void posAction.send(p).catch(() => {});
    this.sendEmoteAction = (e) => void emoAction.send(e).catch(() => {});
    this.sendChatAction = (m) => void msgAction.send(m).catch(() => {});
    this.sendTradeWire = (m, target) => void tradeAction.send(m, { target }).catch(() => {});
    tradeAction.onMessage = (m, ctx) => this.trade.onWire(m, ctx.peerId);
    this.sendDuelAction = (m, target) => void duelAction.send(m, { target }).catch(() => {});
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
        // nick dal filo MAI fidato: un peer patchato può inviare un non-stringa
        // → i draw site chiamerebbero .slice/.length su non-stringa e crasherebbero
        // il canvas altrui. String() + sanitizeNick coerce e limita la lunghezza.
        nick: sanitizeNick(String(prof.nick ?? "")) || "ANONIMO", speciesId: prof.speciesId,
        x: prof.x, y: prof.y, facing: prof.facing,
        duelWins: sanitizeDuelWins(prof.duelWins),
        partyPreview: sanitizePartyPreview(prof.party)
      });
    };
    posAction.onMessage = (d, ctx) => {
      const r = this.remotes.get(ctx.peerId);
      if (r) {
        // Dato dal filo MAI fidato: clamp 0..255 (difesa in profondità, nessuna
        // mappa è più grande di così; NaN/valori assurdi cadono a 0).
        r.x = clampCoord(d.x);
        r.y = clampCoord(d.y);
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

    // Quando un peer entra, mi presento subito a lui (così mi vede). Ora c'è un
    // data channel WebRTC reale: siamo davvero connessi.
    room.onPeerJoin = () => {
      this.connected = true;
      this.broadcastProfile();
    };
    // UNICA assegnazione di onPeerLeave (è una property: una seconda
    // assegnazione sovrascriverebbe la prima).
    room.onPeerLeave = (peerId) => {
      this.trade.peerLeft(peerId);
      this.onPeerGone?.(peerId);
      this.remotes.delete(peerId);
      this.onlineCount = this.remotes.size;
      // Nessun peer rimasto = non più "connesso" (la room resta aperta, ma non
      // c'è nessuno da vedere).
      this.connected = this.remotes.size > 0;
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
    // NB: la chat NON viene azzerata qui. leave() scatta ad ogni cambio mappa
    // (join() la richiama), e cancellare lo storico ad ogni zona faceva
    // "sparire" la chat all'utente. Le righe decadono da sole col cap a 30 in
    // pushChat; l'azzeramento vero avviene solo in setEnabled(false).
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
      facing: this.pos.facing,
      duelWins: this.identity.duelWins,
      party: this.identity.partyPreview
    });
  }

  private upsert(
    id: string,
    p: { nick: string; speciesId: string; x: number; y: number; facing: Facing; duelWins: number; partyPreview: string[] }
  ): void {
    const existing = this.remotes.get(id);
    if (existing) {
      existing.nick = p.nick;
      existing.speciesId = p.speciesId;
      existing.x = p.x;
      existing.y = p.y;
      existing.facing = p.facing;
      existing.duelWins = p.duelWins;
      existing.partyPreview = p.partyPreview;
    } else {
      this.remotes.set(id, {
        id, nick: p.nick || "ANONIMO", speciesId: p.speciesId || "player",
        x: p.x, y: p.y, dispX: p.x * 16, dispY: p.y * 16,
        facing: p.facing, moving: false, emote: null, emoteT: 0,
        duelWins: p.duelWins, partyPreview: p.partyPreview
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

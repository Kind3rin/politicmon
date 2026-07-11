import type { WorldContext } from "./worldContext";
import type { AllyId } from "../coalition";
import { districtActionCount } from "../districtCampaign";

// Punto d'ingresso deliberatamente piccolo per R1. La logica Atto 3 vivrà qui
// e restituirà comandi dichiarativi; WorldScene resterà l'adattatore UI.
export interface Atto3Controller {
  interactNpc(npcId: string, context: WorldContext): boolean;
}

export const inactiveAtto3Controller: Atto3Controller = {
  interactNpc: () => false
};

const CANDIDATE_BY_NPC: Readonly<Record<string, AllyId>> = {
  "campo-secretary": "campo_secretary",
  "quantum-centrist": "quantum_centrist",
  "civic-mayor": "civic_mayor"
};

export function createAtto3Controller(): Atto3Controller {
  return {
    interactNpc(npcId, context) {
      const palaceTerminal = ({
        "palace-algorithm-a": ["algoritmo", "a"], "palace-algorithm-b": ["algoritmo", "b"],
        "palace-factcheck-a": ["factcheck", "a"], "palace-factcheck-b": ["factcheck", "b"],
        "palace-talkshow-a": ["talkshow", "a"], "palace-talkshow-b": ["talkshow", "b"],
        "palace-silence-a": ["silenzio", "a"], "palace-silence-b": ["silenzio", "b"]
      } as const)[npcId];
      if (palaceTerminal) {
        const [module, terminal] = palaceTerminal;
        const terminalFlag = `palace:${module}:${terminal}`;
        const otherFlag = `palace:${module}:${terminal === "a" ? "b" : "a"}`;
        const moduleFlag = `palace-module:${module}`;
        if (!context.state.flags[terminalFlag]) context.dispatch({ kind: "setFlag", flag: terminalFlag });
        const usedEndorsements = Object.keys(context.state.election.endorsementDistrictByAlly).length;
        const lines = ({
          algoritmo: terminal === "a"
            ? ["ALGORITMO: RICOSTRUZIONE DELLE PRIORITÀ.", `${usedEndorsements} ALLEATI HANNO GIÀ SPESO IL PROPRIO SOSTEGNO.`]
            : ["ALGORITMO: NESSUN VOTO NUOVO.", "IL SISTEMA RICORDA SOLO CHI HAI SCELTO DI MOSTRARE."],
          factcheck: terminal === "a"
            ? ["FACT-CHECK: LE PROMESSE SONO GIÀ NEI DOSSIER.", "COSTI E LINEE ROSSE RESTANO QUELLI ACCETTATI NEL TOUR."]
            : ["FACT-CHECK COMPLETATO.", "NESSUN BONUS NASCOSTO. NESSUNA PENALITÀ AGGIUNTA."],
          talkshow: terminal === "a"
            ? ["TALK SHOW: RIVEDIAMO I DIBATTITI TERRITORIALI.", "VITTORIE E SCONFITTE SONO GIÀ INCLUSE NEL CONSENSO LOCALE."]
            : ["REGIA: IL CONTRADDITTORIO È ARCHIVIATO.", "NON SERVE RIPETERE NESSUNA BATTAGLIA."],
          silenzio: terminal === "a"
            ? ["SILENZIO STAMPA.", "QUI NON SI CAMBIANO LE SCELTE DOPO AVERLE FATTE."]
            : ["NESSUNA DICHIARAZIONE AGGIUNTIVA.", "ANCHE IL SILENZIO È STATO REGISTRATO."]
        } as const)[module];
        if (context.state.flags[otherFlag] && !context.state.flags[moduleFlag]) {
          context.dispatch({ kind: "setFlag", flag: moduleFlag });
          lines.push(`MODULO ${module.toUpperCase()} COMPLETO.`);
        }
        const modules = ["algoritmo", "factcheck", "talkshow", "silenzio"];
        if (modules.every((id) => context.state.flags[`palace-module:${id}`]) && !context.state.flags.palaceRoomsComplete) {
          context.dispatch({ kind: "setFlag", flag: "palaceRoomsComplete" });
          lines.push("QUATTRO ARCHIVI COMPLETI. LO STUDIO ELETTORALE È APERTO.");
        }
        context.dispatch({ kind: "say", lines: [...lines] });
        return true;
      }
      if (npcId === "palace-reception") {
        const complete = ["algoritmo", "factcheck", "talkshow", "silenzio"].filter((id) => context.state.flags[`palace-module:${id}`]).length;
        context.dispatch({ kind: "say", lines: ["RECEPTION: IL PALAZZO NON CAMBIA I NUMERI.", `ARCHIVI COMPLETI: ${complete}/4. POI SI APRE LO STUDIO.`] });
        return true;
      }
      if (npcId === "palace-election-desk") {
        context.dispatch({ kind: "openElectionNight" });
        return true;
      }
      if (npcId === "weekly-campaign-host") {
        context.dispatch({ kind: "openWeeklyCampaign" });
        return true;
      }
      const districtId = ({
        "district-kiosk-nord": "nord", "district-kiosk-centro": "centro",
        "district-kiosk-sud": "sud", "district-kiosk-isole": "isole",
        "district-kiosk-feed": "feed"
      } as const)[npcId];
      if (districtId) {
        const district = context.state.election.districts.find((item) => item.id === districtId);
        if (districtActionCount(context.state.election, districtId) >= 2) {
          context.dispatch({ kind: "say", lines: [
            `DOSSIER ${districtId.toUpperCase()} COMPLETO.`,
            `CONSENSO LOCALE: ${district?.localConsensus ?? 0}%. DUE AZIONI REGISTRATE.`,
            "IL COLLEGIO È CHIUSO: IL RISULTATO RESTA NEL TOUR."
          ] });
        } else context.dispatch({ kind: "openDistrict", districtId });
        return true;
      }
      if (npcId === "genova-dj") {
        if (context.state.flags["genova-techno-complete"]) {
          context.dispatch({ kind: "say", lines: ["DJ: il set è chiuso.", "IL BEAT È STATO SCRUTINATO E IL RISULTATO È DEFINITIVO."] });
        } else {
          context.dispatch({ kind: "openGenovaTechno" });
        }
        return true;
      }
      if (npcId === "diplomacy-host") {
        if (!context.state.flags["diplomacy-checked-in"]) context.dispatch({ kind: "setFlag", flag: "diplomacy-checked-in" });
        context.dispatch({ kind: "say", lines: ["HOST: un selfie, tre sovranità.", "VISITA LE STANZE FEDELTÀ, AUTONOMIA E CONSENSO. OGNI PORTA MOSTRA IL PREZZO."] });
        return true;
      }
      const diplomacyChoice = ({
        "diplomacy-choice-loyalty": "loyalty",
        "diplomacy-choice-autonomy": "autonomy",
        "diplomacy-choice-home": "home"
      } as const)[npcId];
      if (diplomacyChoice) {
        if (context.state.flags["diplomacy-choice-complete"]) {
          context.dispatch({ kind: "say", lines: ["LA SCELTA È GIÀ IN ONDA.", "LE ALTRE DUE PORTE SONO DIVENTATE OPINIONI PERSONALI."] });
        } else {
          context.dispatch({ kind: "openDiplomacyChoice", initial: diplomacyChoice });
        }
        return true;
      }
      if (npcId === "future-reception") {
        if (!context.state.flags["future-badge-received"]) context.dispatch({ kind: "setFlag", flag: "future-badge-received" });
        context.dispatch({ kind: "say", lines: ["RECEPTION: ecco il BADGE PROVVISORIO DEFINITIVO.", "RUOTA ENTRAMBI I MANIFESTI. POI DICHIARA DA CHE PARTE STAI."] });
        return true;
      }
      if (npcId === "future-lever-a" || npcId === "future-lever-b") {
        const own = npcId === "future-lever-a" ? "future-lever-a-on" : "future-lever-b-on";
        const other = npcId === "future-lever-a" ? "future-lever-b-on" : "future-lever-a-on";
        if (!context.state.flags[own]) context.dispatch({ kind: "setFlag", flag: own });
        if (context.state.flags[other]) {
          context.dispatch({ kind: "setFlag", flag: "future-shortcut-open" });
          context.dispatch({ kind: "say", lines: ["I DUE MANIFESTI COINCIDONO.", "PER LA PRIMA VOLTA, ALMENO GRAFICAMENTE.", "IL CORRIDOIO CENTRALE È APERTO."] });
        } else {
          context.dispatch({ kind: "say", lines: ["MANIFESTO RUOTATO.", "ORA MANCA L'ALTRA VERSIONE DELLA STESSA IDEA."] });
        }
        return true;
      }
      if (npcId === "future-choice-desk") {
        if (context.state.flags["future-choice-complete"]) {
          context.dispatch({ kind: "say", lines: ["SCELTA REGISTRATA.", "IL SEGRETARIO DEL DOMANI TI ASPETTA SUL PALCO."] });
        } else {
          context.dispatch({ kind: "openFutureChoice" });
        }
        return true;
      }
      if (npcId === "campo-fotografo") {
        if (context.state.flags["campo-photo-complete"]) {
          context.dispatch({ kind: "say", lines: ["A FUOCO!", "NESSUNO È D'ACCORDO, MA TUTTI SI VEDONO BENISSIMO.", "IL DOSSIER FUTURO ANTERIORE È ORA DISPONIBILE."] });
        } else if (context.state.flags["campo-debate-resolved"]) {
          context.dispatch({ kind: "startTrainer", trainerId: "campo-photographer", rematch: false });
        } else if (context.state.flags["campo-photo-choice-complete"]) {
          context.dispatch({ kind: "say", lines: ["LA FOTO È QUASI PRONTA.", "AFFRONTA IL MODERATORE, POI TORNA QUI PER LO SCATTO UFFICIALE."] });
        } else {
          context.dispatch({ kind: "openPhotoChoice" });
        }
        return true;
      }
      const allyId = CANDIDATE_BY_NPC[npcId];
      if (!allyId) return false;
      const seenFlag = `coalition-candidate-seen:${allyId}`;
      if (!context.state.flags[seenFlag]) context.dispatch({ kind: "setFlag", flag: seenFlag });
      context.dispatch({ kind: "openCoalition", focus: allyId });
      return true;
    }
  };
}

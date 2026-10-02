import type { WorldContext } from "./worldContext";
import type { AllyId } from "../coalition";
import { districtActionCount } from "../districtCampaign";
import { CAMPO_VOICES } from "../../data/campo";
import { futureAccountLines } from "../futureChapter";
import { diplomacyAccountLines } from "../campaignDecisions";

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
        context.dispatch({ kind: "openGenovaTechno" });
        return true;
      }
      if (npcId === "genova-accountant") {
        context.dispatch({ kind: "say", lines: ["ORE 23: BEAT DA GOVERNO. ORE 8: FATTURA DA PAGARE.", ...diplomacyAccountLines(context.state), context.state.flags["genova-techno-complete"] ? "PREMIO A BILANCIO. DAL DJ PUOI ALLENARTI." : "IL DJ PAGA UNA PROVA: 200-1200 EURO. LE PROMESSE RESTANO."] });
        return true;
      }
      if (npcId === "partner-after" || (npcId === "diplomacy-host" && context.state.flags.diplomacyComplete)) {
        context.dispatch({ kind: "say", lines: ["IL VERTICE HA FIRMATO TRE COPIE. IL CAMERIERE HA TENUTO L'ORIGINALE DEL CONTO.", ...diplomacyAccountLines(context.state), "CINQUE COLLEGI NUOVI. LE PROMESSE E I PATTI RESTANO TUOI.", "TOUR A SINISTRA, GENOVA A DESTRA. CURE AL CAMPO VIA FUTURO."] });
        return true;
      }
      if (npcId === "diplomacy-host") {
        if (!context.state.flags["diplomacy-checked-in"]) context.dispatch({ kind: "setFlag", flag: "diplomacy-checked-in" });
        context.dispatch({ kind: "say", lines: ["TRE CAMERE COMUNICANTI. LE TRE VERSIONI DEI FATTI, MENO.", "FEDELTÀ IN ALTO A SINISTRA, AUTONOMIA A DESTRA, CONSENSO IN BASSO A SINISTRA. A APRE IL DOSSIER, B RINVIA.", "DOPO LA SCELTA, PARTNER IN TERRAZZA A DESTRA. CURE AL CAMPO VIA FUTURO."] });
        return true;
      }
      const diplomacyChoice = ({
        "diplomacy-choice-loyalty": "loyalty",
        "diplomacy-choice-autonomy": "autonomy",
        "diplomacy-choice-home": "home"
      } as const)[npcId];
      if (diplomacyChoice) {
        if (context.state.flags["diplomacy-choice-complete"]) {
          context.dispatch({ kind: "say", lines: ["SCELTA REGISTRATA. I TAVOLI SONO SEPARATI; IL VERBALE È UNICO.", ...diplomacyAccountLines(context.state), "PARTNER IN TERRAZZA: A APRE IL DOSSIER, B RINVIA. CURE AL CAMPO VIA FUTURO."] });
        } else {
          context.dispatch({ kind: "openDiplomacyChoice", initial: diplomacyChoice });
        }
        return true;
      }
      if (npcId === "future-reception") {
        if (!context.state.flags["future-badge-received"]) context.dispatch({ kind: "setFlag", flag: "future-badge-received" });
        context.dispatch({ kind: "say", lines: ["ACCREDITO VALIDO FINO AL PROSSIMO NOME. ABBIAMO LASCIATO SPAZIO SUL BADGE.", "IN SEDE: SCISSIONE A SINISTRA, REBRANDING A DESTRA. LEGGI I VERBALI, POI RUOTA LE DUE LEVE.", "TESORERIA IN FONDO A DESTRA: PORTA I CONTI DEL CAMPO. IL TAVOLO CENTRALE MOSTRA TRE SCELTE PRIMA DI FIRMARE.", "IL SEGRETARIO HA UN DOSSIER: A LO APRE, B RINVIA. PER PV E PP TORNA DAL MEDICO AL CAMPO."] });
        return true;
      }
      if (npcId === "future-split-clerk" || npcId === "future-brand-clerk") {
        const split = npcId === "future-split-clerk";
        context.dispatch({ kind: "setFlag", flag: split ? "future-split-reviewed" : "future-brand-reviewed" });
        context.dispatch({ kind: "say", lines: split
          ? ["ABBIAMO DIVISO LE SCRIVANIE. IL MUTUO È RIMASTO SU UN UNICO PIEDISTALLO.", "NEL VERBALE SCRIVIAMO CHI SI SEPARA. I PATTI DEL CAMPO RESTANO FINCHÉ UNA SCELTA NON LI VIOLA.", "TORNA ALLA LEVA DI SINISTRA: ORA PUOI AUTORIZZARE IL TRASLOCO, NON LA CANCELLAZIONE DEGLI IMPEGNI."]
          : ["DUE LOGHI UGUALI. UNO COSTA DI PIÙ: HA GIÀ VINTO IL BANDO PER LA NOVITÀ.", "POSSIAMO RUOTARE LA SEDIA SUL MANIFESTO. CHI ASPETTA UN AUTOBUS CONTINUA A STARE IN PIEDI.", "TORNA ALLA LEVA DI DESTRA. LA GRAFICA È APPROVATA; AL CENTRO DECIDI CHI NE PAGA LE CONSEGUENZE."] });
        return true;
      }
      if (npcId === "future-treasurer" || npcId === "future-money-clerk") {
        context.dispatch({ kind: "say", lines: ["IL BILANCIO È PREVISIONALE. LE USCITE HANNO UN OTTIMO SENSO DEL PRESENTE.", ...futureAccountLines(context.state)] });
        return true;
      }
      if (npcId === "future-lever-a" || npcId === "future-lever-b") {
        const own = npcId === "future-lever-a" ? "future-lever-a-on" : "future-lever-b-on";
        const other = npcId === "future-lever-a" ? "future-lever-b-on" : "future-lever-a-on";
        const reviewed = npcId === "future-lever-a" ? "future-split-reviewed" : "future-brand-reviewed";
        if (!context.state.flags[own] && !context.state.flags[reviewed]) {
          context.dispatch({ kind: "say", lines: ["PRIMA LEGGI IL VERBALE.", npcId === "future-lever-a" ? "SALA SCISSIONE, PORTA A SINISTRA. IL TRASLOCO NON ESTINGUE I DEBITI." : "SALA REBRANDING, PRIMA PORTA A DESTRA. APPROVARE UN LOGO NON È SCEGLIERE UN ALLEATO."] });
          return true;
        }
        if (!context.state.flags[own]) context.dispatch({ kind: "setFlag", flag: own });
        if (context.state.flags[other]) {
          context.dispatch({ kind: "setFlag", flag: "future-shortcut-open" });
          context.dispatch({ kind: "say", lines: ["VERBALI LETTI, MANIFESTI ALLINEATI. LA SEDIA È SEMPRE QUELLA.", "AL TAVOLO CENTRALE: ALLEANZA, DISTANZA O CONTRASTO. LEGGI EFFETTI E PATTI PRIMA DI CONFERMARE."] });
        } else {
          context.dispatch({ kind: "say", lines: ["MANIFESTO RUOTATO.", "ORA MANCA L'ALTRA VERSIONE DELLA STESSA IDEA."] });
        }
        return true;
      }
      if (npcId === "future-choice-desk") {
        if (context.state.flags.futureResolved) {
          context.dispatch({ kind: "say", lines: ["ASSEMBLEA CHIUSA. IL VERBALE NON HA UNA GOMMA.", ...futureAccountLines(context.state), "IL PRATO A EST ORA RECLUTA VANNACCIX LV43-46. IL CIRCOLO NEL RETROPALCO LIBERA UN POSTO.", "USA SUBITO TESSERA FUTURO SU VANNACCIX: RAMO FUTURORSO. AL PROSSIMO LIVELLO DIVENTA GENERORSO.", "DALLA PIAZZA, NAVETTA A OVEST PER IL VERTICE. LE CURE AL CAMPO RESTANO DISPONIBILI."] });
        } else if (context.state.flags["future-choice-complete"]) {
          context.dispatch({ kind: "say", lines: ["SCELTA REGISTRATA.", "IL SEGRETARIO DEL DOMANI TI ASPETTA SUL PALCO."] });
        } else {
          context.dispatch({ kind: "openFutureChoice" });
        }
        return true;
      }
      if (npcId === "campo-fotografo") {
        if (context.state.flags["campo-photo-complete"]) {
          const tense = context.state.coalition.members.filter(m => m.status === "strained").length;
          context.dispatch({ kind: "say", lines: [
            context.state.flags["atto3-photo-choice:panoramica"] ? "OBIETTIVO LARGO: 800 FONDI. IL PROGRAMMA È ANCORA SUL TAVOLO." : "FOTO STRETTA: IL PROGRAMMA È RIMASTO FUORI. RISPARMIO PERFETTAMENTE A FUOCO.",
            `${tense} PATTI IN TENSIONE. COESIONE: ${context.state.morale.cohesion}. LA CORNICE NON RIPARA ACCORDI.`,
            "FUTURO ANTERIORE È APERTO. PORTA ANCHE CIÒ CHE NON SI VEDE IN FOTO."
          ] });
        } else if (context.state.flags["campo-debate-resolved"]) {
          context.dispatch({ kind: "startTrainer", trainerId: "campo-photographer", rematch: false });
        } else if (context.state.flags["campo-photo-choice-complete"]) {
          context.dispatch({ kind: "say", lines: ["ABBIAMO NEGOZIATO IL MARGINE SINISTRO PER TRE ORE.", "IL PROGRAMMA NON ENTRAVA. LO ABBIAMO RITAGLIATO.", "AFFRONTA IL MODERATORE, POI TORNA QUI PER LO SCATTO UFFICIALE."] });
        } else {
          context.dispatch({ kind: "openPhotoChoice" });
        }
        return true;
      }
      const allyId = CANDIDATE_BY_NPC[npcId];
      if (!allyId) return false;
      const seenFlag = `coalition-candidate-seen:${allyId}`;
      const first = !context.state.flags[seenFlag];
      if (first) context.dispatch({ kind: "setFlag", flag: seenFlag });
      context.dispatch({ kind: "openCoalition", focus: allyId, ...(first ? { intro: CAMPO_VOICES[allyId] } : {}) });
      return true;
    }
  };
}

import type { GameState } from "../game/state";

// Incontri PG casuali su strada (stile Pokémon: ti fermano allenatori vaganti).
// A differenza dei trainer fissi, il loro team scala col progresso del
// giocatore. Pool satirico di personaggi "social/da bar".

export interface WanderingDef {
  id: string;
  name: string;
  pal: string;
  intro: string[];
  defeat: string[];
  species: string[]; // specie del team (livello calcolato a runtime)
  size: number; // quanti membri
  money: number; // base, scalata col livello
  minBadges: number; // sblocco
  reward?: { itemId: string; qty: number };
}

export const WANDERERS: WanderingDef[] = [
  {
    id: "w-tiktoker", name: "TIKTOKER VIRALE", pal: "influencer",
    intro: ["Aspetta, ti riprendo!", "Questo duello fa numeri pazzeschi, fidati."],
    defeat: ["Taglio quella parte in montaggio."],
    species: ["bojoon", "muskrat"], size: 1, money: 240, minBadges: 0,
    reward: { itemId: "spritz", qty: 1 }
  },
  {
    id: "w-novax", name: "COMPLOTTISTA SEM", pal: "aide",
    intro: ["Lo sai chi c'è dietro tutto questo?", "Te lo spiego con uno scontro. SVEGLIA!"],
    defeat: ["Coincidenze? Io non credo. Ma hai vinto."],
    species: ["vannaccix", "contemorfo"], size: 1, money: 300, minBadges: 0
  },
  {
    id: "w-portaborse", name: "PORTABORSE ZELANTE", pal: "aide",
    intro: ["Il Capo è impegnato, mi manda lui.", "Difendo la sua agenda a oltranza!"],
    defeat: ["Lo metto a verbale. Con rammarico."],
    species: ["tajanide", "calendauro"], size: 2, money: 420, minBadges: 1,
    reward: { itemId: "scheda", qty: 2 }
  },
  {
    id: "w-influencer", name: "OPINIONISTA TV", pal: "journalist",
    intro: ["In studio avrei già vinto a tavolino.", "Ma qui si combatte. Va bene, ci sto."],
    defeat: ["Ne riparliamo stasera in seconda serata."],
    species: ["contemorfo", "macronfox", "bojoon"], size: 2, money: 560, minBadges: 2
  },
  {
    id: "w-lobbista", name: "LOBBISTA RAMPANTE", pal: "guard",
    intro: ["Rappresento interessi che non immagini.", "Mettiti comodo: parlano i miei POLITICMON."],
    defeat: ["Posso offrirti una consulenza? No? Peccato."],
    species: ["zelenskir", "ursulax", "muskrat"], size: 3, money: 900, minBadges: 3,
    reward: { itemId: "schedona", qty: 1 }
  },
  {
    id: "w-troll", name: "TROLL DA TASTIERA", pal: "kid",
    intro: ["LOL ti distruggo nei commenti.", "Anzi no, qui di persona. PREPARATI."],
    defeat: ["Era ironico. Ovviamente. Bloccato."],
    species: ["grillix", "salvinott", "muskrat"], size: 2, money: 480, minBadges: 2
  },
  {
    id: "w-rider", name: "RIDER IN SCIOPERO", pal: "kid",
    intro: ["Consegno volantini, non consensi.", "Ma oggi sciopero pure contro di te!"],
    defeat: ["Ricomincio a pedalare. Verso il nulla."],
    species: ["grillix", "muskrat"], size: 1, money: 260, minBadges: 0
  },
  {
    id: "w-prof", name: "PROF UNIVERSITARIO", pal: "granny",
    intro: ["In aula questa tesi la demolivo in dieci minuti.", "Vediamo se regge alla prova dei fatti."],
    defeat: ["Interessante. Ci scrivo un paper."],
    species: ["calendauro", "ursulax"], size: 2, money: 480, minBadges: 1
  },
  {
    id: "w-sindaco", name: "SINDACO DI PROVINCIA", pal: "guard",
    intro: ["Nel mio comune comando io.", "Le buche le ho promesse, mica asfaltate!"],
    defeat: ["Metto la sconfitta a bilancio. Pareggio creativo."],
    species: ["salvinott", "tajanide", "contemorfo"], size: 2, money: 520, minBadges: 2,
    reward: { itemId: "scheda", qty: 2 }
  },
  {
    id: "w-sovranista", name: "SOVRANISTA DA BAR", pal: "aide",
    intro: ["Ce lo chiede l'Europa? E io dico no!", "Lo dimostro coi miei POLITICMON, non con le slide."],
    defeat: ["Complotto di Bruxelles. Ovvio."],
    species: ["vannaccix", "salvinott", "grillix"], size: 2, money: 540, minBadges: 2
  },
  {
    id: "w-eurocrate", name: "EUROCRATE GRIGIO", pal: "journalist",
    intro: ["Allegato A, comma 4, paragrafo 7.", "La sfida è conforme. Proceda pure a perdere."],
    defeat: ["Verbalizzo l'anomalia in 24 lingue."],
    species: ["ursulax", "macronfox", "calendauro"], size: 3, money: 880, minBadges: 3,
    reward: { itemId: "schedona", qty: 1 }
  },
  {
    id: "w-startupparo", name: "STARTUPPARO SERIALE", pal: "influencer",
    intro: ["Ho una app che disrompe la democrazia.", "Round di finanziamento: il tuo consenso. Pitch time!"],
    defeat: ["Pivotiamo. La sconfitta era nel business plan."],
    species: ["muskrat", "macronfox"], size: 2, money: 600, minBadges: 3
  },
  {
    id: "w-pensionato", name: "PENSIONATO ARRABBIATO", pal: "granny",
    intro: ["Ai miei tempi la politica era seria!", "Adesso ve lo dimostro coi POLITICMON, non col bastone."],
    defeat: ["Mah. Scrivo al direttore."],
    species: ["tajanide", "contemorfo"], size: 1, money: 300, minBadges: 0
  },
  {
    id: "w-influencer2", name: "VIRGINIA DA REELS", pal: "influencer",
    intro: ["Sto in diretta, salutate tutti!", "Questo scontro sblocca il prossimo livello di engagement."],
    defeat: ["Va be', taglio in post-produzione."],
    species: ["bojoon", "macronfox"], size: 1, money: 320, minBadges: 1,
    reward: { itemId: "spritz", qty: 1 }
  }
];

// Livello-obiettivo dell'incontro: segue la squadra del giocatore (un filo
// sotto il massimo, mai banale, con un minimo che cresce con le medaglie).
export function wandererLevel(state: GameState): number {
  const partyMax = state.party.reduce((m, mon) => Math.max(m, mon.level), 5);
  const floor = 4 + state.badges.length * 6;
  return Math.max(floor, partyMax - 1);
}

// Sceglie un PG vagante ammesso dal progresso, escludendo quelli già battuti
// di recente (passati in `recent`). Restituisce null se nessuno disponibile.
export function pickWanderer(state: GameState, recent: string[], roll: number): WanderingDef | null {
  const pool = WANDERERS.filter((w) => state.badges.length >= w.minBadges && !recent.includes(w.id));
  if (pool.length === 0) {
    return null;
  }
  const idx = Math.floor(roll * pool.length) % pool.length;
  return pool[idx];
}

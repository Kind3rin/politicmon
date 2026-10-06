import type { MapDef, NpcDef } from "./types";
import { insideEntry } from "./factories";

/** The four sacrari: the places where the legends wait once their rite is done (src/game/legends.ts).
 * Each is a small room with its own floor, walls, music and a keeper who knows what you went through. */
const ROOM = (shelf: string, mid: string, side: string) => [
  "AAAAAAAAAAA",
  shelf,
  "ApppppppppA",
  mid,
  "ApppppppppA",
  side,
  "ApppppppppA",
  "AppppccpppA",
  "AAAAAAAAAAA"
];

export const REGIA_TILES = ROOM("AkkkpppkkkA", "ApYpppppYpA", "AUpppppppUA");
export const ARCHIVIO_TILES = ROOM("AbbbbbbbbbA", "AppppttpppA", "ApPpppppPpA");
export const STUDIO_TILES = ROOM("AbbpppppbbA", "ApYpptppYpA", "ApPpppppPpA");
export const BUNKER_TILES = ROOM("AbbkpppkbbA", "AppUpppUppA", "AkpppppppkA");

export const SACRARIO_ENTRY = insideEntry(REGIA_TILES);

const keeper = (id: string, pal: string, x: number, y: number, facing: NpcDef["facing"], nameplate: string, lines: string[]): NpcDef => ({ id, pal, x, y, facing, nameplate, lines, wander: false });

const sacrario = (id: string, name: string, tiles: string[], music: string, overrides: Pick<MapDef, "tileOverrides" | "objectOverrides">, back: { map: string; x: number; y: number }, npcs: NpcDef[], signs: MapDef["signs"]): MapDef => ({
  id, name, tiles, outdoor: false, music, ...overrides,
  warps: [5, 6].map(x => ({ x, y: 7, toMap: back.map, toX: back.x, toY: back.y, facing: "down" as const })),
  signs, pickups: [], npcs
});

export const LEGEND_MAPS: Record<string, MapDef> = {
  regia: sacrario("regia", "LA REGIA SEGRETA", REGIA_TILES, "mediopoli",
    { tileOverrides: { p: "tiles/palace_studio_floor.png", A: "tiles/palace_wall.png" } }, { map: "gymtv", x: 2, y: 2 }, [
      {
        id: "berlusconix-legend", pal: "boss", x: 5, y: 2, facing: "down", hideIfFlag: "legend-berlusconix-gone",
        legendary: {
          speciesId: "berlusconix", level: 20, flag: "legend-berlusconix-gone", relic: "telecomando",
          lines: [
            "Tutti i monitor si accendono insieme. Sul più grande, una sigla anni novanta.",
            "BERLUSCONIX: «Non ho mai perso un confronto. Ho solo cambiato canale.»",
            "Il telecomando d'oro è sul tavolo. Per averlo devi convincere chi lo tiene in mano."
          ],
          afterRunLines: ["BERLUSCONIX riabbassa il volume. «Ritorna: il pubblico non si stanca mai.»"],
          afterGoneLines: ["I monitor mostrano la neve. In regia resta il TELECOMANDO D'ORO.", "BERLUSCONIX è nella tua squadra e nel tuo POLITICDEX."]
        },
        lines: ["La regia è silenziosa. Sul monitor più grande resta una sigla."]
      },
      keeper("regia-tecnico", "aide", 2, 4, "right", "TECNICO", ["Qui il pubblico non ha mai visto la porta.", "Chi entra ha ascoltato la tifosa, chiuso il Ritornello e ricevuto il retroscena. Sei dei pochi."])
    ], [{ x: 4, y: 1, lines: ["REGIA — SOLO PERSONALE.", "In basso a destra, scritto a penna: «Il pubblico non esiste, il canale sì.»"] }]),
  archivio: sacrario("archivio", "L'ARCHIVIO DEI BILANCI", ARCHIVIO_TILES, "bruxelles",
    { tileOverrides: { p: "tiles/commissione_floor.png", A: "tiles/commissione_wall.png" }, objectOverrides: { t: "tiles/commissione_table.png" } }, { map: "colle", x: 2, y: 8 }, [
      {
        id: "draghimon-legend", pal: "guard", x: 5, y: 2, facing: "down", hideIfFlag: "legend-draghimon-gone",
        legendary: {
          speciesId: "draghimon", level: 32, flag: "legend-draghimon-gone", relic: "agendadoro",
          lines: [
            "L'archivio si accende. Sullo scaffale più alto, un grafico con una sola linea.",
            "DRAGHIMON: «Avete aperto uno sportello e onorato una data. Ora vediamo cosa serve davvero.»",
            "Non applaude. Vuole conoscere la copertura delle sedie."
          ],
          afterRunLines: ["DRAGHIMON richiude la cartella. «La copertura c'è. Il confronto, a richiesta.»"],
          afterGoneLines: ["Lo spread riposa. Nell'archivio resta l'AGENDA D'ORO, già compilata.", "DRAGHIMON è nella tua squadra e nel tuo POLITICDEX."]
        },
        lines: ["L'archivio è in ordine. Il grafico ha una sola linea e nessun commento."]
      },
      keeper("archivio-usciere", "guard", 7, 5, "left", "USCIERE", ["Qui si entra con una promessa mantenuta in tasca.", "Non siamo severi. Siamo puntuali."])
    ], [{ x: 3, y: 1, lines: ["ARCHIVIO DEI BILANCI.", "Ogni fascicolo ha una voce di spesa. Tranne uno, intestato «Quello che serve»."] }]),
  studio: sacrario("studio", "LO STUDIO PRESIDENZIALE", STUDIO_TILES, "palazzo",
    { tileOverrides: { p: "tiles/palace_lobby_floor.png", A: "tiles/palace_wall.png" } }, { map: "colle", x: 9, y: 8 }, [
      {
        id: "mattarellux-legend", pal: "boss", x: 5, y: 2, facing: "down", hideIfFlag: "legend-mattarellux-gone",
        legendary: {
          speciesId: "mattarellux", level: 49, flag: "legend-mattarellux-gone", relic: "penna",
          lines: [
            "Lo studio ha un solo ospite e una sola penna, appoggiata su una pratica urgente.",
            "MATTARELLUX: «Sette anni sono lunghi. Mi hanno insegnato a firmare poco e a ascoltare molto.»",
            "Vuole un confronto prima di dare la penna. Il livello 49 spiega l'attesa."
          ],
          afterRunLines: ["MATTARELLUX rimette la pratica sulla penna. Puoi tornare a sfidarlo."],
          afterGoneLines: ["Lo studio è silenzioso e ordinato. La PENNA DEL GARANTE è con te.", "MATTARELLUX è nella tua squadra e nel tuo POLITICDEX. Con tutti gli onori."]
        },
        lines: ["Questo studio si apre solo per chi ha la fiducia della gente."]
      },
      keeper("studio-corazziere", "guard", 3, 5, "right", "CORAZZIERE", ["Ho aperto la porta per tre persone in sette anni.", "Fiducia, cinque dossier e una benedizione. Lei li ha."])
    ], [{ x: 6, y: 1, lines: ["STUDIO DEL PRESIDENTE.", "Sulla scrivania: una pratica urgente e una penna."] }]),
  bunker: sacrario("bunker", "IL BUNKER", BUNKER_TILES, "interior",
    { tileOverrides: { p: "tiles/cave_floor.png", A: "tiles/cave_rock.png" } }, { map: "oblast-meme", x: 18, y: 11 }, [
      {
        id: "legend-bunkerput", pal: "boss", x: 5, y: 2, facing: "down", hideIfFlag: "legend-bunkerput-gone",
        legendary: {
          speciesId: "bunkerput", level: 14, flag: "legend-bunkerput-gone", relic: "bunkerkit",
          lines: [
            "Il portone si apre con un sospiro di cemento. Dentro: radio, scorte e un lungo tavolo.",
            "BUNKERPUT: «Qui sotto i sondaggi non sono mai calati. Non scendeva nessuno a misurarli.»",
            "Chiude la porta dietro di te. Il confronto è a porte chiuse."
          ],
          afterRunLines: ["BUNKERPUT si rinchiude tra le scorte. «Ritorna pure. Il bunker è sempre aperto, per chi sa la parola.»"],
          afterGoneLines: ["Il bunker è vuoto. Resta il KIT DEL BUNKER, con le scorte per l'inverno.", "BUNKERPUT è nella tua squadra e nel tuo POLITICDEX."]
        },
        lines: ["Il bunker è silenzioso. Sul tavolo, una radio accesa su una frequenza vuota."]
      },
      keeper("bunker-sentinella", "guard", 8, 5, "left", "SENTINELLA", ["Nessuno scende da quando hanno chiuso il citofono.", "Tu sei sceso. Dopo il Bunkerista e il medico, ti aspettavo."])
    ], [{ x: 4, y: 1, lines: ["BUNKER. ACCESSO RISERVATO.", "Un adesivo sbiadito: «Qui sotto il consenso è sempre al 100%.»"] }])
};

# GLOSSARIO — Politicmon

Lessico del gioco (termini satirici) e termini tecnici del codice. Serve a una
nuova sessione per capire i nomi senza dover dedurre tutto dal codice.

## Termini di gioco (satira → equivalente Pokémon)

| Termine Politicmon | Significato / equivalente |
|--------------------|---------------------------|
| **POLITICMON** | Il "mostro" catturabile (un politico caricaturale). |
| **SONDAGGI** | Gradimento del giocatore 0-100%. Stat narrativa unica: muove prezzi, EXP, rami evolutivi, dialoghi. |
| **GOVERNO OMBRA** | Sistema dei 6 ministeri: assegni un POLITICMON a un incarico per un bonus passivo. |
| **SCHEDA ELETTORALE / BLINDATA** | Le "ball" per catturare (la blindata = ball migliore). |
| **DIRETTIVA DI PARTITO** | Le "MT": insegnano una mossa a chi ha il tipo giusto, riutilizzabili. |
| **TESSERA DORATA** | Pietra evolutiva: fa evolvere certe specie. Loot raro / reward finale rivale. |
| **DIVISA EQUA** | Oggetto "Condividi Esperienza": spartisce EXP con la squadra in panchina. |
| **MEDAGLIA** (AUDITEL / SPREAD / DAZIO) | I 3 badge da capipalestra, gate verso il PALAZZO. |
| **BAR SPORT** | Il "Centro Pokémon": cura la squadra (NPC `healer`). |
| **DISCOUNT ELETTORALE** | Il negozio (NPC `shop`). |
| **AUTO BLU** | Il "Volo/teletrasporto" tra città (NPC `transport`). |
| **MONOPATTINO / RUSPA** | Veicoli: il primo accelera in città, la seconda abbatte gli alberi (taglio scorciatoie). |
| **CASINÒ DI PALAZZO** | Slot del consenso + Bunga Bunga Club (eventi morale satirici). |
| **PALAZZO / COLLE / CONSULTA / GARANTE** | Endgame Atto 2: boss finale, gauntlet costituzionale, super-boss. |
| **PONTE SULLO STRETTO** | Area opzionale meme; boss IL CAPITANO. |
| **ONDA DEL CONSENSO** | Bonus EXP quando i sondaggi sono alti (≥70%); malus se bassi (<40%). |
| **BREAKING NEWS** | Notifica gamificata quando superi una soglia sondaggi (25/40/55/70/85%). |
| **BUSTA A SORPRESA** | Loot extra ~30% post-vittoria allenatore (tabella pesata, jackpot = TESSERA DORATA). |
| **RIVALE GIANNI** | Rivale ricorrente: 5 scontri scalati con battute che ricordano i precedenti. |
| **PROF. QUIRINO** | Il "Professor Oak": consegna starter e Politicdex. |
| **POLITICDEX** | Il Pokédex (specie viste / "elette" = catturate). |

## Tipi politici (sostituiscono i tipi Pokémon)

`POPULISMO`, `TECNO`, `DESTRA`, `SINISTRA`, `CENTRO`, `MEDIA`, `ISTITUZIONE`, `VERDE`.
Tabella efficacie in `src/data/poltypes.ts` (con qualche scelta satirica, es. SINISTRA super-efficace su SINISTRA).

## Statistiche (nomi a schermo)

| Stat interna | Nome a schermo | Equivalente |
|--------------|----------------|-------------|
| `hp` | PV | HP |
| `atk` | GRINTA | Attacco |
| `def` | FACCIA TOSTA | Difesa |
| `spc` | RETORICA | Speciale |
| `spd` | OPPORTUN. | Velocità |

## Termini tecnici del codice

| Termine | Significato |
|---------|-------------|
| **Scene stack** | `engine/scene.ts`: le scene si impilano; `transparent:true` lascia visibile quella sotto (es. PauseScene). |
| **Pixmap** | `{ art: string[], pal: Record<char,color> }`: ogni carattere mappa a un colore. Rasterizzata con cache da `Screen.sprite`. |
| **caricature()** | Generatore parametrico degli sprite POLITICMON (`art/monsters.ts`). |
| **charSprite()** | Sprite dei personaggi 16×16 (`art/characters.ts`); `CHAR_PALETTES` per le tinte. |
| **Step** | Unità della coda di battaglia in `BattleScene`: `{ text?, run?, waitHp?, pause? }`. `pushFront` inserisce in testa. |
| **EvolutionRule** | Regola evolutiva: `{ id, level?, item?, minSondaggi?, maxSondaggi? }`; la prima soddisfatta vince (ordine conta). |
| **MapDef / NpcDef / WarpDef** | Strutture mappa in `data/maps.ts`. Le mappe sono ASCII: 1 char = 1 tile di `art/tiles.ts`. |
| **room (Trystero)** | Stanza P2P del multiplayer = `map-<mapId>`; vedi solo chi è sulla tua mappa. |
| **rivalWins** | Contatore vittorie sul rivale; determina la prossima tappa di GIANNI. |
| **LEGACY_KEYS** | Vecchie chiavi di salvataggio per la migrazione automatica. |
| **VIEW_W / VIEW_H** | 240 × 180, risoluzione interna. `CHAR_W = 6` (larghezza di un carattere). |

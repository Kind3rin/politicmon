# PixelLab Reboot

Obiettivo: rifare tutta la grafica da zero in PixelLab, mantenendo le logiche di
gameplay esistenti. Non cambiare salvataggi, formule di battaglia, mappe, quest,
multiplayer o progressione mentre si sostituisce la presentazione.

## Stato MCP

PixelLab MCP e configurato nel Codex globale come server `pixellab`.
Dopo il restart della sessione devono comparire tool tipo:

- `create_character`
- `animate_character`
- `create_topdown_tileset`
- `create_map_object`
- `create_ui_asset`
- `get_*`
- `get_balance`

Docs: https://api.pixellab.ai/mcp/docs

## Regole

- Usa i tool MCP PixelLab direttamente. Non creare asset via REST; HTTP diretto
  solo per scaricare URL pubblici restituiti dai tool MCP.
- Asset che si muove e cambia verso: 4 viste cardinali piu walk.
- Asset statico: una vista trasparente, ancorata e provata nel gioco.
- Terreno: preferisci Wang tilesets per transizioni, non texture isolate rumorose.
- Mantieni fallback Pixmap solo durante la migrazione; ogni fallback deve avere
  asset PixelLab equivalente nel manifest.
- Verifica sempre in game: `npm run typecheck`, screenshot/playtest mirato, poi
  `npm run build`.
- A fine blocco completato: commit e push sul branch corrente, cosi il device
  puo testare subito la versione aggiornata.

## Source Of Truth

- Manifest reboot: `scripts/pixellab-reboot-assets.json`
- Check copertura: `npm run pixellab:coverage`
- Check rigoroso: `npm run pixellab:coverage:strict`
- Vecchi manifest utili: `scripts/pixellab-monsters.json`,
  `scripts/pixellab-assets.json`

## Ordine

1. Rigenera stile base: terreno Wang, player, 2 NPC, una casa, un panel UI.
2. Applica al gioco e fai screenshot mondo/battaglia/menu.
3. Se lo stile e coerente, batch completo: mostri, NPC, veicoli, edifici,
   oggetti, item, UI.
4. Solo dopo copertura completa, rimuovi/ignora i fallback visibili.

## Blocchi completati

- `style-foundation-2026-06-28`: Wang grass/path, Wang water/sand, house, tree,
  dialog frame, player walk, professor walk, guard walk.

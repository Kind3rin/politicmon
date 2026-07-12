# P7-T08 — Release candidate 1.0.0-rc.2

## Contenuto candidato

- Branch: `master`.
- Base rollback: tag `v1.0.0-rc.1`, commit `68dcf12`.
- Save corrente: v18; migrazione verificata da fixture completa v13 post-UE.
- Portable: `releases/politicmon-portable-web.zip`.

## Procedura rollback

1. In Vercel aprire Deployments e promuovere nuovamente il deployment associato
   al tag `v1.0.0-rc.1`, senza cancellare il deployment RC2.
2. In alternativa creare un branch dal tag: `git switch -c rollback/rc1 v1.0.0-rc.1`
   e pubblicarlo come deployment di produzione.
3. Non cancellare localStorage o cache manualmente: RC1 legge i salvataggi storici;
   il save v18 resta intatto e può essere riaperto tornando alla RC2.
4. Verificare HTTP 200 per `/`, `/sw.js` e un asset con hash; poi provare CONTINUA.

## Evidenze automatiche

- Suite: 197/197.
- Chromium mobile: installazione, update, migrazione save, riavvio offline,
  campagna precacheata, sprite PixelLab e background/foreground.
- WebKit mobile simulato: installazione, update, migrazione save, cache offline
  completa e background/foreground.
- Il cambio rete offline di Playwright WebKit su Windows genera un errore interno
  del browser; il riavvio offline su dispositivo iOS reale resta un gate esterno.
- Portable avviato da `portable-build/server.ps1`: pagina 200, canvas presente e
  chunk `WorldScene` 200.

## Gate ancora aperti per la stabile

- Riavvio offline su iPhone/iPad fisico.
- Dieci run complete reali con telemetria esportata.
- Playtest esterni richiesti dal piano qualità.
- Nessun altro gate automatico aperto.

## Candidate build

| Candidato | Commit | Suite | Build | Chromium | WebKit | Esito |
|---|---|---:|---:|---:|---:|---|
| RC2-A | `1508c49` | 197/197 | OK | OK | cache OK | VERDE |
| RC2-B | `1508c49` | 197/197 | OK | OK | cache OK | VERDE |

Le due esecuzioni sono state consecutive, senza modifiche intermedie, e hanno
completato con exit code 0. Bundle invariato: entry 212,90 KiB gzip, campagna
114,85 KiB gzip.

## Artefatti congelati

- `politicmon-1.0.0-rc.2-portable.zip` — SHA-256
  `E9003116771E11B4D47824DEB25AFA8EFCFE0B44CF190A7166EAA2B04B538684`.
- `politicmon-1.0.0-rc.2-web.zip` — SHA-256
  `D5819AB2F7D099BFA7F375A89CED6AC8F677A438B364AA40DA6ADE825EAD686E`.
- Checksum machine-readable: `releases/SHA256SUMS-rc2.txt`.

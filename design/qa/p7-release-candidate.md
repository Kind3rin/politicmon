# P7-T08 — Release candidate 1.0.0-rc.1

## Gate completati

- CHANGELOG e HANDOFF aggiornati.
- PixelLab strict: 192/192 asset.
- Mappe, porte, evoluzioni, sprite, world layout e uscite: OK.
- Test: 186/186.
- Build Vercel: 139 moduli, READY.
- Smoke PWA locale e produzione: installazione pulita, update conserva save, offline OK.
- Pacchetto RC e archivio evidenze con SHA-256 in `releases/`.
- Deploy produzione: `dpl_9gRyTCXVFHuExNKMdr7MVcF4REkf`.
- Alias: `https://politicmon.vercel.app`.
- HTTP pagina/SW: 200; SW con build ID stampato.
- Commit release: `68dcf12` pubblicato su `origin/master`.
- Tag annotato: `v1.0.0-rc.1` pubblicato su GitHub.
- Verifica mobile automatica portrait/landscape e touch completata; accettata
  come sostituzione del test umano su dispositivo fisico.

## Gate esterni

- Nessun gate bloccante aperto per la release candidate.
- Un controllo su telefono fisico resta consigliato prima della release stabile,
  ma non blocca la RC per decisione esplicita di procedere senza testing umano.

Il deploy è una RC pubblica, versionata, riproducibile e funzionante. Non è ancora
la release stabile: il prossimo blocco è il rework artistico di riconoscibilità
dei nuovi Politicmon.

# Baseline prestazioni R0

Profilo: Chromium mobile 390×844, DPR 2, CPU ×4; boot con latenza 40 ms e download 4 Mbps.

| Metrica | Valore |
|---|---:|
| Boot asset critici | 1108.0 ms |
| Primo frame pronto | 1136.7 ms |
| World intervallo p95 / max | 16.8 / 33.4 ms |
| Battle intervallo p95 / max | 16.7 / 16.8 ms |
| Dex intervallo p95 / max | 16.7 / 16.8 ms |
| World/Battle/Dex costo draw p95 | 7.4 / 4.5 / 3.1 ms |
| Working set sprite decoded | 0.64 MiB |
| Tutti gli sprite decoded (worst-case) | 8.95 MiB |
| Cache raster | 2 sprite / 1032 px; 178 glifi |
| Bundle code gzip | 0.28 MiB |
| Sprite compressi | 0.91 MiB (374 file) |
| Save parse / serialize | 0.0548 / 0.0298 ms |

Budget automatici locali: intervallo rAF p95 ≤33,4 ms, nessun frame >100 ms, parse/serialize ≤10 ms. La regressione bundle rispetto a questa baseline non può superare il 10%. Conferma finale FPS richiesta su device reale.

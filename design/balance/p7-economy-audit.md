# P7-T02 — Audit economia

| Invariante | Esito | Evidenza |
|---|---|---|
| coppa-repeat-sink | OK | ripetibile 700-1500=-800€ |
| coppa-first-bounded | OK | prima vittoria 3000€, quota 1500€ |
| weekly-bounded | OK | premi 800-1800€ per 9 stage |
| starter-affordability | OK | cura base 50€, fondi iniziali 500€ |
| trainer-payouts-positive | OK | 48 payout non negativi |
| rematch-time-cost | OK | cooldown 600/1500 passi |
| boost-money-sink | OK | spot 3000€ / 10 battaglie |

Le rivincite richiedono passi e battaglia; la sconfitta cura la squadra e limita la perdita a 600€, quindi non esiste soft-lock economico.

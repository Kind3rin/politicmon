# Satira, promesse e morale

Aggiornamento del 1 ottobre 2026. La campagna mette a confronto la visibilità
del candidato con il lavoro che resta quando le telecamere se ne vanno.
Il percorso delle medaglie e degli atti continua come prima; sette incontri
opzionali aggiungono decisioni con costi, vantaggi e conseguenze visibili.

Il settimo incontro è il benzinaio del Percorso 3: cartello, annuncio o corse
finanziate. La vignetta, le fonti e le conseguenze sono in
[EVOLUZIONI-SCHEDE.md](EVOLUZIONI-SCHEDE.md).

![Scelte e conseguenze nel gioco](img/morale-satira.png)

## Cosa cambia nella storia

Quirino distingue attenzione e fiducia. Gianni passa dal sondaggio sui propri
follower al rimborso dei volontari e agli impegni scritti. I capi palestra
hanno motivazioni differenti: lo studio vende conflitto, Lady Direttiva
chiede coperture e diritti di ricorso, il Tycoon privatizza persino il costo
della propria sconfitta. Il Palazzo custodisce pratiche arretrate; il Garante
difende anche chi non ha votato il vincitore. L'Algoritmo non riesce a contare
il lavoro svolto fuori campo.

Le nuove battute sono originali. Il riferimento riconoscibile dà il punto di
partenza; la scena mostra chi sostiene il costo della trovata mediatica.

## Tre misure diverse

| Valore | Significato | Conseguenza |
|---|---|---|
| Sondaggi | Attenzione e consenso immediato | Mantiene i sistemi esistenti |
| Fiducia | Rispetto dei cittadini e degli impegni | Da 70: prezzi -5%; sotto 30: +5% |
| Coesione | Come viene trattata la squadra | Da 70: crescita PVE +8%; sotto 30: -8% |

Gli aggiustamenti dei prezzi si sommano agli altri modificatori prima
dell'arrotondamento del negozio. La crescita modifica i Punti Consenso,
non i danni. Il morale non introduce penalità nei duelli PvP.

Dal menu **MORALE** puoi leggere gli effetti attuali, finanziare gli impegni
e aprire la guida con START. I vecchi salvataggi iniziano con fiducia 50 e
coesione 60, senza cambiare sondaggi, squadra o progressione.

## Incontri di quartiere

| Luogo / personaggio | Dilemma |
|---|---|
| Borgo / pensionato vicino al laboratorio | Finanziare il bus, prendere una data o eliminare la fermata dalla foto |
| Mediopoli / fan del talk show | Usare solo il ritornello, pagare i tecnici o rispondere alla domanda |
| Eurotown / pensionato | Aprire lo sportello, prendere un impegno o nascondere i giorni chiusi nel grafico |
| Capitale / influencer | Diretta senza consenso, ascolto senza camera o ricostruzione dichiarata |
| Stretto / ingegnere | Riparare la rampa, prendere una data o inaugurare il plastico |
| Campo Largo / capo campagna | Restare a sistemare, pagare gli straordinari o limitarsi a un post |

Sono interazioni esplicite con NPC già presenti, disponibili dopo lo starter.
Puoi uscire senza scegliere e tornare. Ogni scelta vale una volta; il verbale
salva anche l'alternativa scelta e i dialoghi successivi la ricordano.
Regali e progressione degli NPC restano accessibili alle interazioni seguenti.

## Promesse con una scadenza

Bus: **180€**. Sportello: **260€**. Rampa del traghetto: **450€**.
Puoi finanziare subito oppure promettere e pagare dal menu MORALE entro tre
nuove vittorie contro allenatori. Le sconfitte, i selvatici, le rivincite,
la sfida del giorno, i vaganti, la Coppa e la campagna settimanale non fanno avanzare la scadenza.

- Mantenere: fiducia +12, coesione +6.
- Scadere: fiducia -12, coesione -6, una sola volta.
- Riparare: costo +50%, fiducia +7, coesione +3. Lo stato resta «riparata».

Non ci sono premi duplicati per pagamenti o dialoghi ripetuti. La scadenza
si conserva al reload. Il finale aggiunge un bilancio di fiducia, coesione,
promesse mantenute, riparate e aperte, indipendente dal risultato elettorale.

Anche le scelte precedenti hanno conseguenze: i favori del retrobottega
consumano fiducia e coesione; la crisi distingue verifica pubblica e capro
espiatorio; una foto che viola la linea rossa di un alleato costa coesione.
Gli effetti sono mostrati prima di confermare.

## Ricerca dei meme

Quattro eventi permanenti entrano nella campagna settimanale e nell'elenco
FONTI del gioco. Le risposte narrative vengono ora mostrate dopo la scelta,
insieme agli effetti su denaro, sondaggi, fiducia e coesione.

Fonti consultate il **1 ottobre 2026**, con video dell'episodio o delle clip:

- [Sky TG24: remix «Io sono Giorgia», 12/11/2019](https://tg24.sky.it/politica/2019/11/12/meloni-canta-io-sono-giorgia): riconoscibilità del nome e appropriazione di un remix satirico.
- [La7: esordi politici su TikTok, 01/09/2022](https://www.la7.it/intanto/video/ciao-ragazzi-eccomi-qua-first-reaction-shock-berlusconi-renzi-e-il-pd-sbarcano-su-tiktok-01-09-2022-449903): linguaggio dei trend e durata delle procedure.
- [Sky TG24: citofono a Bologna, 22/01/2020](https://tg24.sky.it/politica/2020/01/21/salvini-bologna-citofono): una porta privata trasformata in una scena pubblica. Il residente del gioco è fittizio; le accuse pronunciate nel video non vengono trattate come fatti.
- [La7: intervento di Renzi al Senato, 20/08/2019](https://www.la7.it/speciali-mentana/video/matteo-renzi-un-nuovo-governo-non-e-un-colpo-di-stato-aprire-la-crisi-un-colpo-di-sole-20-08-2019-279456): il riferimento al Papeete durante la crisi ispira il contrasto tra spettacolo e lavoro degli alleati.

Metadati, fatto documentato e situazione fittizia sono conservati nel pack
`src/data/meme-events/classics.ts`; la verifica editoriale è in
`design/editorial/satire-review.json`.

## Higgsfield e verifica

Quattro nuove vignette: fermata, studio, molo, lavoro a camere spente.
Costo: **6 crediti**; saldo osservato **873,97 → 867,97**. Insieme al primo
blocco di ambienti e titolo, sono **18 crediti** e dodici immagini integrate.
Prompt, job, sorgenti e lavorazione: [registro degli asset](HIGGSFIELD-ASSETS.md).

```sh
npm test
npm run build
npm run validate:meme-packs
npm run audit:satire
npm run audit:text-legibility
# Con dev Vite sulla porta 5179:
npm run shot:morale-satire
# Con preview produzione sulla porta 4180:
npm run smoke:pwa:release
```

Verificati 225 test, build TypeScript/Vite, 22 schermate, percorso NPC → scelta
→ scadenza → riparazione → reload, guida e premio del finale. I controlli
visivi verificano limiti e sovrapposizione del testo; verificati anche premi
PVE, prezzi, raccomandazione e foto con linea rossa. La prova PWA passa su
Chromium/Pixel 7, incluso il primo caricamento offline di tutte le dodici
immagini Higgsfield. Restano tre avvisi editoriali preesistenti: due righe
lunghe gestite dal wrap e un evento stagionale scaduto, filtrato dal calendario.

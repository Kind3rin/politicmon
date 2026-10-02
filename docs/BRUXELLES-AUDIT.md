# Bruxelles: cosa resta da ridisegnare

Audit del 2 ottobre 2026, sulla base di `817fbb2`. Questo documento descrive
il lavoro aperto dopo Offshore; non certifica un round Bruxelles concluso.
La matrice `artifacts/screens/world-redesign/offshore/` mostra il palazzo
istituzionale generico, il bar standard e un interno composto da corridoio
centrale e due piante. Il cast e i PNG condivisi sono già rinnovati, ma
l'ambiente non racconta ancora un capitolo distinto.

## Evidenza nel gioco

In `src/data/maps/postgame.ts` i quattro allenatori `eu-*` hanno
`sightRange: 3`; la Commissione ha `sightRange: 5`. Il primo tratto dal
molo verso il bar può quindi diventare una lotta prima di consultare un
dossier. Mancano i quattro panorami delle prove. La Commissione ha già
un'illustrazione, ma la scrittura conserva cliché e il finale tratta una
lotta come un'elezione europea senza leggere le promesse del giocatore.

Il palazzo occupa dieci tile per quattro (160×64), con porte ai tile
12/13,4. Il bar occupa quattro per due (64×32), porte 10/11,11. Una nuova
facciata deve rendere visibili questi ingressi; il renderer aggiunto nel
round Offshore supporta un edificio specifico senza cambiare collisioni.
Il ritorno verso l'isola è ai tile 14/15,14. Il passaggio al Campo Largo
richiede `ue-beaten` e la feature dell'Atto 3: questi requisiti vanno
verificati tramite input dopo la vittoria.

La squadra finale è Macronfox 52, Putingrad 53, Xipanda 53 e Ursulax 55
con Gilet. Le quattro prove crescono da 44/45 a 48/49/50; incontri
selvatici 42–50. Prima di cambiare questi numeri servono campagne reali
riprese dai salvataggi del Tesoriere, con documentazione di acquisti,
mosse, PP, equipaggiamento, sconfitte e ritorni al bar.

## Direzione narrativa e visiva

La [procedura ufficiale di nomina della Commissione](https://commission.europa.eu/about/organisation/how-commission-appointed_en)
comprende proposta del Consiglio europeo, elezione del Presidente e
approvazione del collegio da parte del Parlamento. La vecchia battuta
«non rispondo a nessuno» sostituisce questa tensione con un luogo comune.
La nuova satira deve colpire il modo in cui una responsabilità chiara
viene diluita tra riunioni, allegati e firme: chi può approvare una
cosa, chi la deve fare e chi compare nella foto.

[As Per My Last Email](https://knowyourmeme.com/memes/as-per-my-last-email)
e il motivo della [riunione che poteva essere un'email](https://knowyourmeme.com/photos/1467557-dogs)
offrono una grammatica comica per il Relatore: allegati che generano altri
allegati, una sedia riservata alla risposta che nessuno ha letto. Il
Commissario misura la concorrenza con una bilancia a cui il concorrente
più grande ha comprato il tavolo; il Lobbista offre un corridoio pieno di
porte, senza dire chi possiede le chiavi; l'Eurodeputato manda il cartonato
alla foto mentre la sedia in aula chiede una presenza. Sono direzioni
originali da sviluppare, senza riprodurre immagini o battute dei meme.

Gli interventi aperti sono: palazzo e caffè riconoscibili, interno con
materiali e oggetti propri, Commissione con silhouette direzionale distinta,
quattro prove illustrate e consultabili su A, ritorni liberi e cure
raggiungibili, dialoghi e finale legati al verbale del morale. Le risorse
vanno generate, revisionate alla risoluzione nativa e verificate nel gioco;
nessuna è dichiarata pronta in questo audit. Il margine di bundle è solo
484 byte: occorre separare altro codice prima di aggiungere questo capitolo,
senza alzare i limiti di prestazioni.

## Implementazione successiva

Il round [BRUXELLES-VERBALE.md](BRUXELLES-VERBALE.md) implementa e verifica ambienti, cast, prove e scrittura descritti sopra. Questo audit resta la fotografia precedente; prove, credito e limiti aggiornati sono nel documento del round e nel relativo registro JSON.

# PWA installata: controlli al bordo sicuro

Rifinitura del 2 ottobre 2026 dopo la conferma dell'utente: Politicmon viene usato come PWA installata sul POCO. [Proof](mobile-pwa-final-proof.json). Il dispositivo fisico non è collegato; orientamento e margini vengono emulati.

Il precedente layout centrava un blocco compatto: a 412×915, il controller terminava a y=719 lasciando 172 px prima della barra sicura inferiore. Ora la console usa tutta l'altezza disponibile: strumenti in alto, canvas 4:3 centrato nello spazio restante e controller vicino al bordo inferiore. Il verificatore richiede esplicitamente strumenti entro 12 px dal margine superiore e controlli entro 32 px dal bordo inferiore sicuro. Nessun controllo copre il gioco. In orizzontale rimangono le tre colonne e i margini asimmetrici.

Viene eliminata la piastra dei comandi. Pulsanti e levetta hanno superfici piatte, senza rilievi o gradienti; il feedback del comando premuto resta visibile. A/B, croce, MENU e strumenti mantengono dimensioni e nomi accessibili, cambio immediato croce/levetta e preferenza salvata. La cornice del canvas è sottile. La guida usa un fondo oscurato senza filtro blur, meno costoso sul telefono.

Passano 20 layout e sei transizioni nei due motori, prima sul sorgente e poi nella build compilata. Le dieci prove compilate della cornice verificano guida, focus, blocco del titolo, trascinamento, cattura, centro neutro, tasto indipendente e ripresa. Passano anche i 46 casi dell'introduzione e i 24 passaggi di Governo/catalogo con nomina, annullamento, trasferimento e riapertura del salvataggio.

L'audit degli input viene corretto dopo il fallimento CI di `dc4db98`: rileva apici singoli e doppi e riconosce il focus del dossier. Il pager starter richiede sia il nome della scheda corrente sia il contatore della pagina. Cinque nuove prove controllano anche gli esiti negativi; passano 325 test e 41 contratti. La correzione non aggiunge un cursore artificiale al gioco.

La prima misura pubblica del Governo era 358564/358400 byte gzip. Il deploy comprende la configurazione TURN dedicata, assente dalla build locale iniziale: il limite non viene alzato né la configurazione rimossa. La rifinitura riduce il CSS decorativo e aumenta da cinque a dieci le passate del minificatore. La misura locale con la configurazione di produzione è **358352/358400 byte gzip**, mondo incluso, 48 byte di margine. L'inventario mantiene 830 risorse esatte. Lo scarto e le prove fallite rimangono documentati nel proof Governo; il margine resta stretto.

Nessun credito viene consumato per questa rifinitura. Il precedente round Governo ha speso 0,25 crediti; ultimo saldo verificato 352,97. Il redesign complessivo resta aperto. La pubblicazione e le verifiche sul dominio sono aggiornate nel proof dopo il commit. Chiudere e riaprire la PWA online consente al sistema di aggiornamento di ricevere la nuova versione conservando i salvataggi.

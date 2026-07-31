# Riordino Fornitori

Webapp per generare proposte d'ordine per fornitore a partire da un file Excel di magazzino, usando Claude (Anthropic) per calcolare le quantità consigliate.

## Flusso

1. **Carica** il file Excel con gli articoli. Colonne attese (intestazioni in italiano, case-insensitive): `Codice Articolo`, `Giacenza Attuale`, `Impegnato`, `Ordinato`, `Qta Scarico`, `Qta Carico`. `Qta Scarico`/`Qta Carico` sono i totali movimentati da inizio anno a oggi.
2. **Configura i fornitori**: nome, prefissi del codice articolo (es. `CAL`, `S`, `3M`) e frequenza ordini (settimanale / quindicinale / mensile / personalizzata). Salvati nel database del server.
3. **Catalogo articoli**: incolla codici articolo e usa la ricerca AI (con accesso al web) per trovare descrizione prodotto e se/come va ordinato a confezione (es. bancale, cartone) con quanti pezzi — utile per articoli come i nastri 3M che vanno ordinati a bancale. Modificabile a mano.
4. **Rivedi l'assegnazione automatica** articolo → fornitore (basata sul prefisso più lungo che corrisponde) e assegna manualmente eventuali articoli non riconosciuti (restano comunque inclusi nella proposta, raggruppati come "Non assegnato").
5. **Genera la proposta ordini**: l'app calcola il consumo medio giornaliero e la copertura di magazzino per articolo, poi chiede a Claude di proporre le quantità da ordinare per ciascun fornitore. Se un articolo nel catalogo è segnato "a confezione", la quantità viene arrotondata per eccesso al multiplo della confezione.
6. **Scarica** il file Excel finale, con un foglio per fornitore.

Fornitori e catalogo articoli sono salvati in un database **SQLite** locale sul server (file `data/restock.db`, percorso configurabile via `DATABASE_PATH`). I dati di magazzino (giacenza/impegnato/ordinato/consumo) restano legati al file Excel caricato di volta in volta, non vengono salvati storicamente.

## Setup

```bash
npm install
cp .env.example .env.local
# imposta ANTHROPIC_API_KEY in .env.local
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

`ANTHROPIC_API_KEY` è obbligatoria per generare le proposte d'ordine e per la ricerca AI nel catalogo articoli (chiamate server-side a Claude, quest'ultima usa anche lo strumento nativo di ricerca web di Claude).

Richiede **Node.js 22.5+** (usa il modulo sperimentale `node:sqlite` incluso in Node, nessuna dipendenza nativa aggiuntiva da compilare/installare).

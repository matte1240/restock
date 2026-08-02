# OrdinaAI — Piano Ordini

Webapp per generare proposte d'ordine per fornitore a partire da un file Excel di magazzino, usando Claude (Anthropic) per calcolare le quantità consigliate. Tema visivo scuro "Nocturne".

## Sezioni

- **Piano Ordini** (`/`): carica il file Excel, rivedi l'anteprima, genera il piano con l'AI, riassegna fornitori riga per riga se serve, approva ed esporta in Excel.
- **Articoli** (`/articoli`): catalogo prodotti — cerca info prodotto con l'AI (accesso al web) o inseriscile a mano, con confezionamento (bancale/cartone) e descrizione.
- **Produttori** (`/produttori`): anagrafica fornitori (nome, prefissi codice articolo, frequenza ordini) e Impostazioni AI (modello e livello di ragionamento).
- **Storico** (`/storico`): ordini approvati in passato, con possibilità di riscaricare l'Excel di ciascuno.

## Flusso Piano Ordini

1. **Carica** il file Excel con gli articoli. Colonne attese (intestazioni in italiano, case-insensitive): `Codice Articolo`, `Giacenza Attuale`, `Impegnato`, `Ordinato`, `Qta Scarico`, `Qta Carico`. `Qta Scarico`/`Qta Carico` sono i totali movimentati da inizio anno a oggi (`Ordinato`/`Qta Carico` sono opzionali, 0 se assenti). Colonne opzionali: `Lotto Riordino` (multiplo minimo d'ordine, ha priorità sul confezionamento del catalogo) e `Scorta Minima` (soglia sotto cui non si dovrebbe scendere).
2. **Anteprima**: articoli assegnati automaticamente al fornitore in base al prefisso del codice (configurato in Produttori); stato "Da riordinare" se sotto scorta minima.
3. **Genera piano con AI**: Claude calcola, per ogni articolo sotto copertura, la quantità consigliata tenendo conto di consumo, scorta minima e lotto di riordino. Il piano è una tabella unica con fornitore riassegnabile per riga.
4. **Approva**: il piano viene salvato nello Storico ed è scaricabile in Excel (un foglio per fornitore).

Fornitori, catalogo articoli, impostazioni AI e storico ordini sono salvati in un database **SQLite** locale sul server (file `data/restock.db`, percorso configurabile via `DATABASE_PATH`). I dati di magazzino (giacenza/impegnato/ordinato/consumo) restano legati al file Excel caricato di volta in volta, non vengono salvati storicamente — solo il piano generato viene conservato, come snapshot, quando approvato.

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

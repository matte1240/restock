# Riordino Fornitori

Webapp per generare proposte d'ordine per fornitore a partire da un file Excel di magazzino, usando Claude (Anthropic) per calcolare le quantità consigliate.

## Flusso

1. **Carica** il file Excel con gli articoli. Colonne attese (intestazioni in italiano, case-insensitive): `Codice Articolo`, `Giacenza Attuale`, `Impegnato`, `Ordinato`, `Qta Scarico`, `Qta Carico`. `Qta Scarico`/`Qta Carico` sono i totali movimentati da inizio anno a oggi.
2. **Configura i fornitori**: nome, prefissi del codice articolo (es. `CAL`, `S`, `3M`) e frequenza ordini (settimanale / quindicinale / mensile / personalizzata). Salvati in localStorage nel browser.
3. **Rivedi l'assegnazione automatica** articolo → fornitore (basata sul prefisso più lungo che corrisponde) e assegna manualmente eventuali articoli non riconosciuti.
4. **Genera la proposta ordini**: l'app calcola il consumo medio giornaliero e la copertura di magazzino per articolo, poi chiede a Claude di proporre le quantità da ordinare per ciascun fornitore.
5. **Scarica** il file Excel finale, con un foglio per fornitore.

Nessun database: l'app è stateless lato server.

## Setup

```bash
npm install
cp .env.example .env.local
# imposta ANTHROPIC_API_KEY in .env.local
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

`ANTHROPIC_API_KEY` è obbligatoria per il passo di generazione della proposta ordini (chiamata server-side a Claude).

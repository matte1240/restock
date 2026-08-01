import { NextResponse } from "next/server";
import { createAnthropicClient, enrichArticleWithWebSearch } from "@/lib/ai";
import { getAiSettings, getCatalogEntries, listSuppliers, upsertCatalogEntry } from "@/lib/db";
import { matchArticleToSupplier, stripMatchedPrefix } from "@/lib/supplier-match";
import type { CatalogEntry } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { codici?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const codici = (body.codici ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (codici.length === 0) {
    return NextResponse.json({ error: "Nessun codice articolo fornito." }, { status: 400 });
  }

  let client;
  try {
    client = createAnthropicClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configurazione AI non valida." },
      { status: 500 }
    );
  }

  const existingByCode = new Map(getCatalogEntries(codici).map((e) => [e.codice, e]));
  const aiSettings = getAiSettings();
  const suppliers = listSuppliers();

  const entries: CatalogEntry[] = [];
  for (const codice of codici) {
    const match = matchArticleToSupplier(codice, suppliers);
    const fornitoreId = existingByCode.get(codice)?.fornitoreId ?? match.fornitoreId;
    const context =
      match.fornitoreNome && !match.ambiguo
        ? { produttore: match.fornitoreNome, codicePulito: stripMatchedPrefix(codice, match.prefissoUsato) }
        : {};

    try {
      const result = await enrichArticleWithWebSearch(
        client,
        codice,
        aiSettings.model,
        aiSettings.reasoning,
        context
      );
      const entry: CatalogEntry = {
        codice,
        fornitoreId,
        descrizione: result.descrizione,
        ordinaAConfezione: result.ordinaAConfezione,
        unitaConfezione: result.unitaConfezione,
        quantitaPerConfezione: result.quantitaPerConfezione,
        note: result.note,
        fonte: result.fonte,
        aggiornatoIl: new Date().toISOString(),
      };
      entries.push(upsertCatalogEntry(entry));
    } catch (error) {
      console.error(`Errore nella ricerca AI per il codice ${codice}:`, error);
      entries.push({
        codice,
        fornitoreId,
        descrizione: null,
        ordinaAConfezione: false,
        unitaConfezione: null,
        quantitaPerConfezione: null,
        note: `Ricerca fallita: ${error instanceof Error ? error.message : "errore sconosciuto"}`,
        fonte: null,
        aggiornatoIl: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ entries });
}

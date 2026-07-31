import { NextResponse } from "next/server";
import { getCatalogEntries, upsertCatalogEntry } from "@/lib/db";
import type { CatalogEntry } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codiciParam = searchParams.get("codici");
  const codici = codiciParam
    ? codiciParam
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : undefined;

  return NextResponse.json({ entries: getCatalogEntries(codici) });
}

export async function PATCH(request: Request) {
  let body: Partial<CatalogEntry>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  if (typeof body.codice !== "string" || !body.codice) {
    return NextResponse.json({ error: "Codice articolo mancante." }, { status: 400 });
  }

  const existing = getCatalogEntries([body.codice])[0];
  const entry: CatalogEntry = {
    codice: body.codice,
    fornitoreId: body.fornitoreId ?? existing?.fornitoreId ?? null,
    descrizione: body.descrizione ?? existing?.descrizione ?? null,
    ordinaAConfezione: body.ordinaAConfezione ?? existing?.ordinaAConfezione ?? false,
    unitaConfezione: body.unitaConfezione ?? existing?.unitaConfezione ?? null,
    quantitaPerConfezione: body.quantitaPerConfezione ?? existing?.quantitaPerConfezione ?? null,
    note: body.note ?? existing?.note ?? null,
    fonte: body.fonte ?? existing?.fonte ?? null,
    aggiornatoIl: new Date().toISOString(),
  };

  return NextResponse.json({ entry: upsertCatalogEntry(entry) });
}

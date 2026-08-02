import { NextResponse } from "next/server";
import { insertStoricoOrdine, listStoricoOrdini } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { StoricoOrdine, SupplierOrderProposal } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ordini: listStoricoOrdini() });
}

export async function POST(request: Request) {
  let body: { proposals?: SupplierOrderProposal[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const proposals = body.proposals;
  if (!Array.isArray(proposals) || proposals.length === 0) {
    return NextResponse.json({ error: "Nessuna proposta d'ordine da salvare." }, { status: 400 });
  }

  const numeroArticoli = proposals.reduce((sum, p) => sum + p.righe.length, 0);
  const fornitori = proposals.map((p) => p.fornitoreNome).join(", ");

  const entry: StoricoOrdine = {
    id: generateId(),
    creatoIl: new Date().toISOString(),
    fornitori,
    numeroArticoli,
    stato: "Generato",
    piano: proposals,
  };

  return NextResponse.json({ ordine: insertStoricoOrdine(entry) }, { status: 201 });
}

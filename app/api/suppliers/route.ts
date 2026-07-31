import { NextResponse } from "next/server";
import { listSuppliers, upsertSupplier } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { Supplier } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ suppliers: listSuppliers() });
}

export async function POST(request: Request) {
  let body: Partial<Supplier>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  if (typeof body.nome !== "string" || !Array.isArray(body.prefissi) || typeof body.frequenzaGiorni !== "number") {
    return NextResponse.json({ error: "Dati fornitore incompleti." }, { status: 400 });
  }

  const supplier: Supplier = {
    id: typeof body.id === "string" && body.id ? body.id : generateId(),
    nome: body.nome,
    prefissi: body.prefissi,
    frequenza: body.frequenza ?? "personalizzata",
    frequenzaGiorni: body.frequenzaGiorni,
  };

  return NextResponse.json({ supplier: upsertSupplier(supplier) }, { status: 201 });
}

import { NextResponse } from "next/server";
import { deleteSupplier, listSuppliers, upsertSupplier } from "@/lib/db";
import type { Supplier } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Partial<Supplier>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const existing = listSuppliers().find((s) => s.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Fornitore non trovato." }, { status: 404 });
  }

  const updated: Supplier = {
    id,
    nome: body.nome ?? existing.nome,
    prefissi: body.prefissi ?? existing.prefissi,
    frequenza: body.frequenza ?? existing.frequenza,
    frequenzaGiorni: body.frequenzaGiorni ?? existing.frequenzaGiorni,
  };

  return NextResponse.json({ supplier: upsertSupplier(updated) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteSupplier(id);
  return NextResponse.json({ ok: true });
}

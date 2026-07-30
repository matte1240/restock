import { NextResponse } from "next/server";
import { buildOrdersWorkbook } from "@/lib/excel-export";
import type { SupplierOrderProposal } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { proposals?: SupplierOrderProposal[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const proposals = body.proposals;
  if (!Array.isArray(proposals) || proposals.length === 0) {
    return NextResponse.json({ error: "Nessuna proposta d'ordine da esportare." }, { status: 400 });
  }

  const buffer = await buildOrdersWorkbook(proposals);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="proposta-ordini.xlsx"`,
    },
  });
}

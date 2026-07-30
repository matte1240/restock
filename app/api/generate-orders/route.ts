import { NextResponse } from "next/server";
import { createAnthropicClient, generateOrderProposalForSupplier } from "@/lib/ai";
import { computeArticleMetrics } from "@/lib/metrics";
import { matchArticleToSupplier, UNASSIGNED_SUPPLIER, UNASSIGNED_SUPPLIER_ID } from "@/lib/supplier-match";
import type {
  AssignedArticle,
  GenerateOrdersRequest,
  GenerateOrdersResponse,
  Supplier,
  SupplierOrderProposal,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: GenerateOrdersRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const { articles, suppliers, assignments } = body;

  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ error: "Nessun articolo fornito." }, { status: 400 });
  }
  if (!Array.isArray(suppliers) || suppliers.length === 0) {
    return NextResponse.json({ error: "Nessun fornitore configurato." }, { status: 400 });
  }

  let anthropicClient;
  try {
    anthropicClient = createAnthropicClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configurazione AI non valida." },
      { status: 500 }
    );
  }

  const supplierById = new Map<string, Supplier>(suppliers.map((s) => [s.id, s]));
  supplierById.set(UNASSIGNED_SUPPLIER.id, UNASSIGNED_SUPPLIER);
  const assignedBySupplier = new Map<string, AssignedArticle[]>();

  for (const article of articles) {
    const overrideId = assignments?.[article.codice];
    const auto = matchArticleToSupplier(article.codice, suppliers);
    const fornitoreId = overrideId !== undefined ? overrideId : auto.fornitoreId;
    // Articles with no (or an ambiguous) supplier match still get a proposal,
    // grouped under the virtual "Non assegnato" supplier instead of being dropped.
    const supplier = (fornitoreId ? supplierById.get(fornitoreId) : undefined) ?? UNASSIGNED_SUPPLIER;

    const metrics = computeArticleMetrics(article);
    const assigned: AssignedArticle = {
      ...metrics,
      fornitoreId: supplier.id,
      fornitoreNome: supplier.nome,
    };

    const bucket = assignedBySupplier.get(supplier.id) ?? [];
    bucket.push(assigned);
    assignedBySupplier.set(supplier.id, bucket);
  }

  const supplierIdsInOrder = [...assignedBySupplier.keys()].sort((a, b) =>
    a === UNASSIGNED_SUPPLIER_ID ? 1 : b === UNASSIGNED_SUPPLIER_ID ? -1 : 0
  );

  const proposals: SupplierOrderProposal[] = [];
  try {
    for (const supplierId of supplierIdsInOrder) {
      const supplier = supplierById.get(supplierId)!;
      const supplierArticles = assignedBySupplier.get(supplierId)!;
      const righe = await generateOrderProposalForSupplier(anthropicClient, supplier, supplierArticles);
      proposals.push({ fornitoreId: supplier.id, fornitoreNome: supplier.nome, righe });
    }
  } catch (error) {
    console.error("Errore nella generazione delle proposte AI:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore durante la generazione AI." },
      { status: 502 }
    );
  }

  const response: GenerateOrdersResponse = { proposals };
  return NextResponse.json(response);
}

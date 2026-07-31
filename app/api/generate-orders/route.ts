import { NextResponse } from "next/server";
import { createAnthropicClient, generateOrderProposalForSupplier } from "@/lib/ai";
import { getCatalogEntries, listSuppliers } from "@/lib/db";
import { computeArticleMetrics } from "@/lib/metrics";
import { roundUpToPackaging } from "@/lib/packaging";
import { matchArticleToSupplier, UNASSIGNED_SUPPLIER, UNASSIGNED_SUPPLIER_ID } from "@/lib/supplier-match";
import type {
  AssignedArticle,
  CatalogEntry,
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

  const { articles, assignments } = body;

  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ error: "Nessun articolo fornito." }, { status: 400 });
  }

  const suppliers = listSuppliers();
  if (suppliers.length === 0) {
    return NextResponse.json({ error: "Nessun fornitore configurato." }, { status: 400 });
  }

  const catalogByCode = new Map<string, CatalogEntry>(
    getCatalogEntries(articles.map((a) => a.codice.trim().toUpperCase())).map((e) => [e.codice, e])
  );

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
      const righeGrezze = await generateOrderProposalForSupplier(
        anthropicClient,
        supplier,
        supplierArticles,
        catalogByCode
      );
      const righe = righeGrezze.map((riga) => {
        if (!riga.quantitaPerConfezione) return riga;
        const quantitaConsigliata = roundUpToPackaging(riga.quantitaConsigliata, riga.quantitaPerConfezione);
        return {
          ...riga,
          quantitaConsigliata,
          quantitaConfezioni: quantitaConsigliata / riga.quantitaPerConfezione,
        };
      });
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

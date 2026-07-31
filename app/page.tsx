"use client";

import { useState } from "react";
import { ArticleCatalog } from "@/components/ArticleCatalog";
import { AssignmentReview } from "@/components/AssignmentReview";
import { FileUpload } from "@/components/FileUpload";
import { OrderProposalTable } from "@/components/OrderProposalTable";
import { SupplierManager } from "@/components/SupplierManager";
import type { Article, GenerateOrdersResponse, Supplier, SupplierOrderProposal } from "@/lib/types";

export default function Home() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [proposals, setProposals] = useState<SupplierOrderProposal[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const readyToGenerate = !!articles && articles.length > 0 && suppliers.length > 0;

  function handleArticlesParsed(parsed: Article[]) {
    setArticles(parsed);
    setOverrides({});
    setProposals(null);
    setGenerateError(null);
  }

  async function handleGenerate() {
    if (!articles) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/generate-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles, assignments: overrides }),
      });
      const data = (await res.json()) as GenerateOrdersResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore durante la generazione della proposta.");
      setProposals(data.proposals);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setGenerating(false);
    }
  }

  function handleQuantityChange(fornitoreId: string, codice: string, quantita: number) {
    setProposals((prev) =>
      prev
        ? prev.map((proposal) =>
            proposal.fornitoreId !== fornitoreId
              ? proposal
              : {
                  ...proposal,
                  righe: proposal.righe.map((riga) =>
                    riga.codice === codice
                      ? {
                          ...riga,
                          quantitaConsigliata: quantita,
                          quantitaConfezioni: riga.quantitaPerConfezione
                            ? quantita / riga.quantitaPerConfezione
                            : null,
                        }
                      : riga
                  ),
                }
          )
        : prev
    );
  }

  async function handleDownload() {
    if (!proposals) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposals }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Errore durante l'esportazione del file.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "proposta-ordini.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Errore imprevisto durante il download.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-8">
        <header>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Riordino fornitori</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Carica il file articoli, configura i fornitori e genera la proposta d&apos;ordine con l&apos;AI.
          </p>
        </header>

        <FileUpload onParsed={handleArticlesParsed} />

        <SupplierManager suppliers={suppliers} onChange={setSuppliers} />

        <ArticleCatalog />

        {articles && articles.length > 0 && suppliers.length > 0 && (
          <AssignmentReview
            articles={articles}
            suppliers={suppliers}
            overrides={overrides}
            onOverridesChange={setOverrides}
          />
        )}

        {readyToGenerate && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">4. Genera proposta ordini</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  L&apos;AI calcola le quantità consigliate da ordinare per ciascun fornitore. Gli articoli
                  senza fornitore assegnato vengono comunque inclusi, raggruppati sotto &quot;Non assegnato&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {generating ? "Generazione in corso..." : "Genera proposta ordini"}
              </button>
            </div>
            {generateError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{generateError}</p>}
          </div>
        )}

        {proposals && proposals.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">5. Proposta ordini</h2>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {downloading ? "Preparazione file..." : "Scarica Excel"}
              </button>
            </div>
            <OrderProposalTable proposals={proposals} onQuantityChange={handleQuantityChange} />
          </div>
        )}
      </main>
    </div>
  );
}

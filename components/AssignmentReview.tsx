"use client";

import { useMemo } from "react";
import { matchArticleToSupplier } from "@/lib/supplier-match";
import type { Article, Supplier } from "@/lib/types";

interface AssignmentReviewProps {
  articles: Article[];
  suppliers: Supplier[];
  overrides: Record<string, string | null>;
  onOverridesChange: (overrides: Record<string, string | null>) => void;
}

export function AssignmentReview({ articles, suppliers, overrides, onOverridesChange }: AssignmentReviewProps) {
  const rows = useMemo(
    () =>
      articles.map((article) => {
        const auto = matchArticleToSupplier(article.codice, suppliers);
        const overrideId = overrides[article.codice];
        const fornitoreId = overrideId !== undefined ? overrideId : auto.fornitoreId;
        const supplier = suppliers.find((s) => s.id === fornitoreId) ?? null;
        return { article, auto, supplier };
      }),
    [articles, suppliers, overrides]
  );

  const bySupplier = new Map<string, number>();
  for (const row of rows) {
    if (row.supplier) {
      bySupplier.set(row.supplier.nome || "(senza nome)", (bySupplier.get(row.supplier.nome) ?? 0) + 1);
    }
  }
  const unassigned = rows.filter((r) => !r.supplier);

  function setOverride(codice: string, fornitoreId: string | null) {
    onOverridesChange({ ...overrides, [codice]: fornitoreId });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">3. Revisione assegnazione</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Articoli assegnati automaticamente in base al prefisso del codice. Assegna manualmente quelli mancanti.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[...bySupplier.entries()].map(([nome, count]) => (
          <span
            key={nome}
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {nome}: {count} articoli
          </span>
        ))}
      </div>

      {unassigned.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            {unassigned.length} articoli senza fornitore assegnato:
          </p>
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-1.5 pr-3">Codice</th>
                <th className="py-1.5 pr-3">Stato</th>
                <th className="py-1.5">Assegna fornitore</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map(({ article, auto }) => (
                <tr key={article.codice} className="border-b border-zinc-100 dark:border-zinc-800/60">
                  <td className="py-1.5 pr-3 font-mono">{article.codice}</td>
                  <td className="py-1.5 pr-3 text-zinc-500 dark:text-zinc-400">
                    {auto.ambiguo ? "Prefisso ambiguo" : "Nessun prefisso corrispondente"}
                  </td>
                  <td className="py-1.5">
                    <select
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      value={overrides[article.codice] ?? ""}
                      onChange={(e) => setOverride(article.codice, e.target.value || null)}
                    >
                      <option value="">-- seleziona --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome || "(senza nome)"}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">
          Tutti gli articoli sono stati assegnati a un fornitore.
        </p>
      )}
    </div>
  );
}

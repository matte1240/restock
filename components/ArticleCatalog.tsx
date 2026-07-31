"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogEntry } from "@/lib/types";

const SAVE_DEBOUNCE_MS = 500;

function parseCodici(input: string): string[] {
  return [...new Set(input.split(/[\n,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean))];
}

export function ArticleCatalog() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data: { entries?: CatalogEntry[] }) => setEntries(data.entries ?? []))
      .catch(() => setError("Errore nel caricamento del catalogo articoli."))
      .finally(() => setLoading(false));
  }, []);

  function mergeEntries(updated: CatalogEntry[]) {
    setEntries((prev) => {
      const byCode = new Map(prev.map((e) => [e.codice, e]));
      for (const entry of updated) byCode.set(entry.codice, entry);
      return [...byCode.values()].sort((a, b) => a.codice.localeCompare(b.codice));
    });
  }

  async function handleSearch() {
    const codici = parseCodici(searchInput);
    if (codici.length === 0) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codici }),
      });
      const data = (await res.json()) as { entries?: CatalogEntry[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore durante la ricerca AI.");
      mergeEntries(data.entries ?? []);
      setSearchInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto durante la ricerca.");
    } finally {
      setSearching(false);
    }
  }

  function updateEntry(codice: string, patch: Partial<CatalogEntry>) {
    mergeEntries([{ ...entries.find((e) => e.codice === codice)!, ...patch }]);

    clearTimeout(saveTimers.current[codice]);
    saveTimers.current[codice] = setTimeout(async () => {
      try {
        const res = await fetch("/api/catalog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codice, ...patch }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Errore nel salvataggio della voce di catalogo.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore imprevisto durante il salvataggio.");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Catalogo articoli</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Incolla uno o più codici articolo (uno per riga o separati da virgola) e cerca online le info prodotto
        con l&apos;AI — es. se si ordina a bancale/cartone e quanti pezzi contiene. I risultati si salvano nel
        catalogo e vengono riusati nella generazione delle proposte d&apos;ordine.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <textarea
          className="w-full flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-800"
          rows={2}
          placeholder={"3M-TAPE-19\n3M-TAPE-25"}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || parseCodici(searchInput).length === 0}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {searching ? "Ricerca in corso..." : "Cerca info prodotto (AI)"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-zinc-400">Caricamento catalogo...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-400">Nessun articolo ancora arricchito.</p>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-1.5 pr-3">Codice</th>
                <th className="py-1.5 pr-3">Descrizione</th>
                <th className="py-1.5 pr-3">A confezione</th>
                <th className="py-1.5 pr-3">Unità</th>
                <th className="py-1.5 pr-3">Pezzi/confezione</th>
                <th className="py-1.5">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.codice} className="border-b border-zinc-100 dark:border-zinc-800/60">
                  <td className="py-1.5 pr-3 font-mono">{entry.codice}</td>
                  <td className="py-1.5 pr-3">
                    <input
                      className="w-full min-w-[180px] rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
                      value={entry.descrizione ?? ""}
                      onChange={(e) => updateEntry(entry.codice, { descrizione: e.target.value || null })}
                    />
                  </td>
                  <td className="py-1.5 pr-3 text-center">
                    <input
                      type="checkbox"
                      checked={entry.ordinaAConfezione}
                      onChange={(e) => updateEntry(entry.codice, { ordinaAConfezione: e.target.checked })}
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      className="w-24 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
                      placeholder="bancale"
                      value={entry.unitaConfezione ?? ""}
                      onChange={(e) => updateEntry(entry.codice, { unitaConfezione: e.target.value || null })}
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
                      value={entry.quantitaPerConfezione ?? ""}
                      onChange={(e) =>
                        updateEntry(entry.codice, {
                          quantitaPerConfezione: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                  <td className="py-1.5 text-zinc-500 dark:text-zinc-400">{entry.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

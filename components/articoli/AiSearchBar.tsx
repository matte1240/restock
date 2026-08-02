"use client";

import { useState } from "react";
import type { CatalogEntry } from "@/lib/types";

function parseCodici(input: string): string[] {
  return [...new Set(input.split(/[\n,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean))];
}

interface AiSearchBarProps {
  onResults: (entries: CatalogEntry[]) => void;
}

export function AiSearchBar({ onResults }: AiSearchBarProps) {
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const codici = parseCodici(input);
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
      onResults(data.entries ?? []);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto durante la ricerca.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="card elev-sm" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)" }}>
      <div className="card-title" style={{ fontSize: 14, marginBottom: 6 }}>
        Cerca info prodotto (AI)
      </div>
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
        <textarea
          className="input"
          rows={2}
          placeholder={"Incolla uno o più codici articolo, uno per riga o separati da virgola"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, fontFamily: "ui-monospace, monospace" }}
        />
        <button type="button" className="btn btn-primary" onClick={handleSearch} disabled={searching || parseCodici(input).length === 0}>
          {searching ? "Ricerca…" : "Cerca con AI"}
        </button>
      </div>
      {error && <p style={{ marginTop: 8, fontSize: 12.5, color: "#e08a8a" }}>{error}</p>}
    </div>
  );
}

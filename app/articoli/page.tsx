"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArticleFormDialog,
  emptyArticleDraft,
  entryToDraft,
  type ArticleDraft,
} from "@/components/articoli/ArticleFormDialog";
import { AiSearchBar } from "@/components/articoli/AiSearchBar";
import { ProductDetailDialog } from "@/components/articoli/ProductDetailDialog";
import type { CatalogEntry, Supplier } from "@/lib/types";

const ALL_FILTER = "__tutti__";
const UNASSIGNED_FILTER = "__non_assegnato__";

export default function ArticoliPage() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(ALL_FILTER);
  const [detailEntry, setDetailEntry] = useState<CatalogEntry | null>(null);
  const [formDraft, setFormDraft] = useState<ArticleDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog").then((res) => res.json()),
      fetch("/api/suppliers").then((res) => res.json()),
    ])
      .then(([catalogData, suppliersData]: [{ entries?: CatalogEntry[] }, { suppliers?: Supplier[] }]) => {
        setEntries(catalogData.entries ?? []);
        setSuppliers(suppliersData.suppliers ?? []);
      })
      .catch(() => setError("Errore nel caricamento del catalogo."))
      .finally(() => setLoading(false));
  }, []);

  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const fornitoreNome = (id: string | null) => (id ? supplierById.get(id)?.nome ?? "Fornitore rimosso" : "Non assegnato");

  function mergeEntries(updated: CatalogEntry[]) {
    setEntries((prev) => {
      const byCode = new Map(prev.map((e) => [e.codice, e]));
      for (const entry of updated) byCode.set(entry.codice, entry);
      return [...byCode.values()].sort((a, b) => a.codice.localeCompare(b.codice));
    });
  }

  const q = query.trim().toLowerCase();
  const filtered = entries.filter((e) => {
    if (filter === UNASSIGNED_FILTER && e.fornitoreId) return false;
    if (filter !== ALL_FILTER && filter !== UNASSIGNED_FILTER && e.fornitoreId !== filter) return false;
    if (!q) return true;
    return e.codice.toLowerCase().includes(q) || (e.descrizione ?? "").toLowerCase().includes(q);
  });

  async function handleSaveDraft(d: ArticleDraft) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codice: d.codice.trim().toUpperCase(),
          descrizione: d.descrizione || null,
          fornitoreId: d.fornitoreId || null,
          ordinaAConfezione: d.ordinaAConfezione,
          unitaConfezione: d.unitaConfezione || null,
          quantitaPerConfezione: d.quantitaPerConfezione ? Number(d.quantitaPerConfezione) : null,
          note: d.note || null,
        }),
      });
      const data = (await res.json()) as { entry?: CatalogEntry; error?: string };
      if (!res.ok || !data.entry) throw new Error(data.error ?? "Errore nel salvataggio.");
      mergeEntries([data.entry]);
      setFormDraft(null);
      setDetailEntry(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1080 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Articoli</h2>
          <p style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", fontSize: 13.5, margin: 0 }}>
            Catalogo prodotti con schede e fornitori associati.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormDraft(emptyArticleDraft())}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuovo articolo
        </button>
      </div>

      <AiSearchBar onResults={mergeEntries} />

      {error && <p style={{ fontSize: 12.5, color: "#e08a8a", marginBottom: "var(--space-3)" }}>{error}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: 10, opacity: 0.55 }}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className="input"
            placeholder="Cerca articolo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div className="seg">
          <label className="seg-opt">
            <input type="radio" name="fornitore-filter" checked={filter === ALL_FILTER} onChange={() => setFilter(ALL_FILTER)} />
            Tutti
          </label>
          {suppliers.map((s) => (
            <label className="seg-opt" key={s.id}>
              <input type="radio" name="fornitore-filter" checked={filter === s.id} onChange={() => setFilter(s.id)} />
              {s.nome}
            </label>
          ))}
          <label className="seg-opt">
            <input
              type="radio"
              name="fornitore-filter"
              checked={filter === UNASSIGNED_FILTER}
              onChange={() => setFilter(UNASSIGNED_FILTER)}
            />
            Non assegnato
          </label>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13.5, opacity: 0.7 }}>Caricamento…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 13.5, opacity: 0.7 }}>Nessun articolo nel catalogo. Cerca un codice con l&apos;AI o creane uno a mano.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
          {filtered.map((entry) => (
            <div
              key={entry.codice}
              className="card elev-sm"
              style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
              onClick={() => setDetailEntry(entry)}
            >
              <div
                style={{
                  height: 110,
                  position: "relative",
                  background:
                    "repeating-linear-gradient(135deg, var(--color-neutral-800), var(--color-neutral-800) 8px, var(--color-neutral-900) 8px, var(--color-neutral-900) 16px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ font: "11px ui-monospace,monospace", color: "color-mix(in srgb, var(--color-text) 45%, transparent)", background: "var(--color-bg)", padding: "3px 8px", borderRadius: 4 }}>
                  foto prodotto
                </span>
              </div>
              <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="tag tag-outline" style={{ alignSelf: "flex-start" }}>
                  {fornitoreNome(entry.fornitoreId)}
                </div>
                <div className="card-title" style={{ fontSize: 15, fontFamily: "ui-monospace, monospace" }}>
                  {entry.codice}
                </div>
                <p
                  className="card-body"
                  style={{ WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  {entry.descrizione ?? "Nessuna descrizione — usa la ricerca AI o modifica a mano."}
                </p>
                <div className="card-meta" style={{ justifyContent: "space-between", marginTop: 2 }}>
                  <span>
                    {entry.ordinaAConfezione && entry.quantitaPerConfezione
                      ? `${entry.unitaConfezione ?? "confezione"} da ${entry.quantitaPerConfezione} pz`
                      : "A pezzo singolo"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailEntry && (
        <ProductDetailDialog
          entry={detailEntry}
          fornitoreNome={fornitoreNome(detailEntry.fornitoreId)}
          onClose={() => setDetailEntry(null)}
          onEdit={() => {
            setFormDraft(entryToDraft(detailEntry));
            setDetailEntry(null);
          }}
        />
      )}

      {formDraft && (
        <ArticleFormDialog
          draft={formDraft}
          suppliers={suppliers}
          onClose={() => setFormDraft(null)}
          onSave={handleSaveDraft}
          saving={saving}
        />
      )}
    </div>
  );
}

"use client";

import { matchArticleToSupplier } from "@/lib/supplier-match";
import type { Article, Supplier } from "@/lib/types";

interface UploadedStageProps {
  fileName: string;
  articles: Article[];
  suppliers: Supplier[];
  sottoScortaCount: number;
  onReset: () => void;
  onGenerate: () => void;
  generating: boolean;
  generateError: string | null;
}

export function UploadedStage({
  fileName,
  articles,
  suppliers,
  sottoScortaCount,
  onReset,
  onGenerate,
  generating,
  generateError,
}: UploadedStageProps) {
  const rows = articles.map((a) => {
    const match = matchArticleToSupplier(a.codice, suppliers);
    const sottoScorta = a.scortaMinima !== null && a.giacenzaAttuale < a.scortaMinima;
    return {
      ...a,
      fornitoreNome: match.fornitoreNome ?? "Non assegnato",
      statoLabel: a.scortaMinima === null ? "n/d" : sottoScorta ? "Da riordinare" : "OK",
      statoClass: sottoScorta ? "tag tag-accent" : "tag tag-neutral",
    };
  });

  return (
    <div className="card elev-sm" style={{ padding: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div>
          <div className="card-kicker">File caricato</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{fileName}</div>
          <div style={{ fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginTop: 2 }}>
            {articles.length} articoli
            {sottoScortaCount > 0 && (
              <>
                {" · "}
                <span style={{ color: "var(--color-accent-300)" }}>{sottoScortaCount} sotto scorta minima</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Carica altro file
          </button>
          <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={generating}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            </svg>
            {generating ? "Generazione in corso…" : "Genera piano con AI"}
          </button>
        </div>
      </div>
      {generateError && <p style={{ fontSize: 12.5, color: "#e08a8a", marginBottom: "var(--space-3)" }}>{generateError}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Prodotto</th>
            <th>Fornitore</th>
            <th>Scorta</th>
            <th>Scorta min.</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.codice}>
              <td>{r.codice}</td>
              <td style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>{r.fornitoreNome}</td>
              <td>{r.giacenzaAttuale}</td>
              <td style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                {r.scortaMinima ?? "—"}
              </td>
              <td>
                <span className={r.statoClass}>{r.statoLabel}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

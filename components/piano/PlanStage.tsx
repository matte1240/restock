"use client";

import { UNASSIGNED_SUPPLIER } from "@/lib/supplier-match";
import type { OrderLine, Supplier } from "@/lib/types";

export interface PlanRow extends OrderLine {
  fornitoreId: string;
  fornitoreNome: string;
}

interface PlanStageProps {
  rows: PlanRow[];
  suppliers: Supplier[];
  aiSummary: string;
  onQuantityChange: (index: number, value: number) => void;
  onFornitoreChange: (index: number, fornitoreId: string) => void;
  onRemove: (index: number) => void;
  onCancel: () => void;
  onApprove: () => void;
  approving: boolean;
  approveError: string | null;
}

export function PlanStage({
  rows,
  suppliers,
  aiSummary,
  onQuantityChange,
  onFornitoreChange,
  onRemove,
  onCancel,
  onApprove,
  approving,
  approveError,
}: PlanStageProps) {
  const fornitoriOptions = [...suppliers, UNASSIGNED_SUPPLIER];
  const fornitoriCount = new Set(rows.map((r) => r.fornitoreId)).size;

  return (
    <div className="card elev-sm" style={{ padding: "var(--space-4)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: "var(--space-4)",
          padding: "var(--space-3)",
          background: "var(--color-accent-900)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-accent-300)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flex: "none", marginTop: 2 }}
        >
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        </svg>
        <div>
          <div className="card-kicker" style={{ marginBottom: 3 }}>
            Piano generato dall&apos;AI
          </div>
          <div style={{ fontSize: 13.5, color: "var(--color-accent-100)" }}>{aiSummary}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Nessun articolo richiede riordino in base ai dati caricati.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Scorta</th>
              <th>Qtà consigliata</th>
              <th>Confezione</th>
              <th>Fornitore</th>
              <th>Nota AI</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.fornitoreId}-${row.codice}`}>
                <td>{row.codice}</td>
                <td style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  {row.giacenzaAttuale}
                  {row.scortaMinima !== null ? ` / ${row.scortaMinima}` : ""}
                </td>
                <td style={{ width: 90 }}>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={row.quantitaConsigliata}
                    onChange={(e) => onQuantityChange(i, Number(e.target.value) || 0)}
                    style={{ padding: "5px 8px", minHeight: 30 }}
                  />
                </td>
                <td style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                  {row.quantitaPerConfezione
                    ? `${row.unitaConfezione ?? "confezione"} da ${row.quantitaPerConfezione} pz${
                        row.quantitaConfezioni !== null ? ` — ${row.quantitaConfezioni.toFixed(1)}` : ""
                      }`
                    : "—"}
                </td>
                <td style={{ width: 190 }}>
                  <select
                    className="input"
                    value={row.fornitoreId}
                    onChange={(e) => onFornitoreChange(i, e.target.value)}
                    style={{ padding: "5px 8px", minHeight: 30 }}
                  >
                    {fornitoriOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", maxWidth: 220 }}>
                  {row.nota}
                </td>
                <td>
                  <button type="button" className="btn btn-icon" onClick={() => onRemove(i)} title="Rimuovi riga">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {approveError && (
        <p style={{ fontSize: 12.5, color: "#e08a8a", marginTop: "var(--space-3)" }}>{approveError}</p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "var(--space-4)",
          paddingTop: "var(--space-3)",
          borderTop: "1px solid var(--color-divider)",
        }}
      >
        <div style={{ fontSize: 13.5 }}>
          {rows.length} articoli da {fornitoriCount} fornitori
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="btn btn-primary" onClick={onApprove} disabled={approving || rows.length === 0}>
            {approving ? "Salvataggio…" : "Approva piano"}
          </button>
        </div>
      </div>
    </div>
  );
}

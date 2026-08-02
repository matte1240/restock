"use client";

import { Dialog } from "@/components/Dialog";
import type { CatalogEntry } from "@/lib/types";

interface ProductDetailDialogProps {
  entry: CatalogEntry;
  fornitoreNome: string;
  onClose: () => void;
  onEdit: () => void;
}

export function ProductDetailDialog({ entry, fornitoreNome, onClose, onEdit }: ProductDetailDialogProps) {
  return (
    <Dialog onClose={onClose}>
      {entry.fornitoreId && (
        <div className="tag tag-outline" style={{ alignSelf: "flex-start" }}>
          {fornitoreNome}
        </div>
      )}
      <div className="dialog-title">{entry.codice}</div>
      <div className="dialog-body">{entry.descrizione ?? "Nessuna descrizione disponibile."}</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 13,
          padding: "var(--space-3)",
          background: "var(--color-bg)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Fornitore</span>
          <span>{fornitoreNome}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Confezione</span>
          <span>
            {entry.ordinaAConfezione && entry.quantitaPerConfezione
              ? `${entry.unitaConfezione ?? "confezione"} da ${entry.quantitaPerConfezione} pz`
              : "A pezzo singolo"}
          </span>
        </div>
        {entry.note && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Note</span>
            <span style={{ textAlign: "right" }}>{entry.note}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Aggiornato il</span>
          <span>{new Date(entry.aggiornatoIl).toLocaleDateString("it-IT")}</span>
        </div>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Chiudi
        </button>
        <button type="button" className="btn btn-primary" onClick={onEdit}>
          Modifica
        </button>
      </div>
    </Dialog>
  );
}

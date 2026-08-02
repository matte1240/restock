"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import type { CatalogEntry, Supplier } from "@/lib/types";

export interface ArticleDraft {
  codice: string;
  descrizione: string;
  fornitoreId: string;
  ordinaAConfezione: boolean;
  unitaConfezione: string;
  quantitaPerConfezione: string;
  note: string;
  isNew: boolean;
}

export function entryToDraft(entry: CatalogEntry): ArticleDraft {
  return {
    codice: entry.codice,
    descrizione: entry.descrizione ?? "",
    fornitoreId: entry.fornitoreId ?? "",
    ordinaAConfezione: entry.ordinaAConfezione,
    unitaConfezione: entry.unitaConfezione ?? "",
    quantitaPerConfezione: entry.quantitaPerConfezione?.toString() ?? "",
    note: entry.note ?? "",
    isNew: false,
  };
}

export function emptyArticleDraft(): ArticleDraft {
  return {
    codice: "",
    descrizione: "",
    fornitoreId: "",
    ordinaAConfezione: false,
    unitaConfezione: "",
    quantitaPerConfezione: "",
    note: "",
    isNew: true,
  };
}

interface ArticleFormDialogProps {
  draft: ArticleDraft;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (draft: ArticleDraft) => void;
  saving: boolean;
}

export function ArticleFormDialog({ draft, suppliers, onClose, onSave, saving }: ArticleFormDialogProps) {
  const [d, setD] = useState(draft);

  return (
    <Dialog onClose={onClose} width="min(480px, 100%)">
      <div className="dialog-title">{d.isNew ? "Nuovo articolo" : "Modifica articolo"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Codice articolo</label>
          <input
            className="input"
            value={d.codice}
            disabled={!d.isNew}
            onChange={(e) => setD({ ...d, codice: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="field">
          <label>Fornitore</label>
          <select className="input" value={d.fornitoreId} onChange={(e) => setD({ ...d, fornitoreId: e.target.value })}>
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Unità confezione</label>
          <input
            className="input"
            placeholder="bancale, cartone…"
            value={d.unitaConfezione}
            onChange={(e) => setD({ ...d, unitaConfezione: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Pezzi per confezione</label>
          <input
            className="input"
            type="number"
            min={1}
            value={d.quantitaPerConfezione}
            onChange={(e) => setD({ ...d, quantitaPerConfezione: e.target.value })}
          />
        </div>
        <label className="radio" style={{ alignSelf: "center" }}>
          <input
            type="checkbox"
            checked={d.ordinaAConfezione}
            onChange={(e) => setD({ ...d, ordinaAConfezione: e.target.checked })}
            style={{ position: "static", opacity: 1, width: "auto", height: "auto" }}
          />
          Si ordina a confezione
        </label>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Descrizione</label>
          <textarea className="input" value={d.descrizione} onChange={(e) => setD({ ...d, descrizione: e.target.value })} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Note</label>
          <textarea className="input" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
        </div>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annulla
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onSave(d)} disabled={saving || !d.codice.trim()}>
          {saving ? "Salvataggio…" : "Salva articolo"}
        </button>
      </div>
    </Dialog>
  );
}

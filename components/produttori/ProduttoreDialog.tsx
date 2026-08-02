"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import type { OrderFrequency, Supplier } from "@/lib/types";

const FREQUENCY_DAYS: Record<Exclude<OrderFrequency, "personalizzata">, number> = {
  settimanale: 7,
  quindicinale: 14,
  mensile: 30,
};

export interface ProduttoreDraft {
  id?: string;
  nome: string;
  prefissi: string;
  frequenza: OrderFrequency;
  frequenzaGiorni: number;
}

interface ProduttoreDialogProps {
  draft: ProduttoreDraft;
  onClose: () => void;
  onSave: (draft: ProduttoreDraft) => void;
  saving: boolean;
}

export function supplierToDraft(s: Supplier): ProduttoreDraft {
  return { id: s.id, nome: s.nome, prefissi: s.prefissi.join(", "), frequenza: s.frequenza, frequenzaGiorni: s.frequenzaGiorni };
}

export function emptyDraft(): ProduttoreDraft {
  return { nome: "", prefissi: "", frequenza: "settimanale", frequenzaGiorni: 7 };
}

export function ProduttoreDialog({ draft, onClose, onSave, saving }: ProduttoreDialogProps) {
  const [d, setD] = useState(draft);

  return (
    <Dialog onClose={onClose} width="min(440px, 100%)">
      <div className="dialog-title">{d.id ? "Modifica produttore" : "Nuovo produttore"}</div>
      <div className="field">
        <label>Nome azienda</label>
        <input className="input" value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
      </div>
      <div className="field">
        <label>Prefissi codice articolo</label>
        <input
          className="input"
          placeholder="es. CAL, S, 3M"
          value={d.prefissi}
          onChange={(e) => setD({ ...d, prefissi: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Frequenza ordini</label>
        <select
          className="input"
          value={d.frequenza}
          onChange={(e) => {
            const frequenza = e.target.value as OrderFrequency;
            setD({
              ...d,
              frequenza,
              frequenzaGiorni: frequenza === "personalizzata" ? d.frequenzaGiorni : FREQUENCY_DAYS[frequenza],
            });
          }}
        >
          <option value="settimanale">Settimanale</option>
          <option value="quindicinale">Quindicinale</option>
          <option value="mensile">Mensile</option>
          <option value="personalizzata">Personalizzata</option>
        </select>
      </div>
      {d.frequenza === "personalizzata" && (
        <div className="field">
          <label>Ogni quanti giorni</label>
          <input
            className="input"
            type="number"
            min={1}
            value={d.frequenzaGiorni}
            onChange={(e) => setD({ ...d, frequenzaGiorni: Number(e.target.value) || 1 })}
          />
        </div>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annulla
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onSave(d)} disabled={saving || !d.nome.trim()}>
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </div>
    </Dialog>
  );
}

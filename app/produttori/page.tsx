"use client";

import { useEffect, useState } from "react";
import { AiSettingsPanel } from "@/components/AiSettingsPanel";
import {
  emptyDraft,
  ProduttoreDialog,
  supplierToDraft,
  type ProduttoreDraft,
} from "@/components/produttori/ProduttoreDialog";
import type { Supplier } from "@/lib/types";

export default function ProduttoriPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProduttoreDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((res) => res.json())
      .then((data: { suppliers?: Supplier[] }) => setSuppliers(data.suppliers ?? []))
      .catch(() => setError("Errore nel caricamento dei fornitori."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(d: ProduttoreDraft) {
    setSaving(true);
    setError(null);
    const prefissi = d.prefissi
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    try {
      if (d.id) {
        const res = await fetch(`/api/suppliers/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: d.nome, prefissi, frequenza: d.frequenza, frequenzaGiorni: d.frequenzaGiorni }),
        });
        const data = (await res.json()) as { supplier?: Supplier; error?: string };
        if (!res.ok || !data.supplier) throw new Error(data.error ?? "Errore nel salvataggio.");
        setSuppliers((prev) => prev.map((s) => (s.id === d.id ? data.supplier! : s)));
      } else {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: d.nome, prefissi, frequenza: d.frequenza, frequenzaGiorni: d.frequenzaGiorni }),
        });
        const data = (await res.json()) as { supplier?: Supplier; error?: string };
        if (!res.ok || !data.supplier) throw new Error(data.error ?? "Errore nella creazione.");
        setSuppliers((prev) => [...prev, data.supplier!]);
      }
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    } catch {
      // best-effort; the list already reflects the removal locally
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Produttori</h2>
          <p style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", fontSize: 13.5, margin: 0 }}>
            Anagrafica fornitori usata nei piani d&apos;ordine.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDraft(emptyDraft())}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuovo produttore
        </button>
      </div>

      <AiSettingsPanel />

      {error && <p style={{ fontSize: 12.5, color: "#e08a8a", marginBottom: "var(--space-3)" }}>{error}</p>}

      <div className="card elev-sm" style={{ padding: "var(--space-4)" }}>
        {loading ? (
          <p style={{ fontSize: 13.5, opacity: 0.7 }}>Caricamento…</p>
        ) : suppliers.length === 0 ? (
          <p style={{ fontSize: 13.5, opacity: 0.7 }}>Nessun fornitore configurato.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Produttore</th>
                <th>Prefissi</th>
                <th>Frequenza ordini</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "var(--font-heading)" }}>{s.nome}</td>
                  <td style={{ fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                    {s.prefissi.join(", ") || "—"}
                  </td>
                  <td>
                    {s.frequenza === "personalizzata" ? `ogni ${s.frequenzaGiorni} giorni` : s.frequenza}
                  </td>
                  <td style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-icon"
                      onClick={() => setDraft(supplierToDraft(s))}
                      title="Modifica"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
                      </svg>
                    </button>
                    <button type="button" className="btn btn-icon" onClick={() => handleDelete(s.id)} title="Rimuovi">
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
      </div>

      {draft && <ProduttoreDialog draft={draft} onClose={() => setDraft(null)} onSave={handleSave} saving={saving} />}
    </div>
  );
}

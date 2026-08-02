"use client";

import { useEffect, useState } from "react";
import type { StoricoOrdine } from "@/lib/types";

export default function StoricoPage() {
  const [ordini, setOrdini] = useState<StoricoOrdine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/storico")
      .then((res) => res.json())
      .then((data: { ordini?: StoricoOrdine[] }) => setOrdini(data.ordini ?? []))
      .catch(() => setError("Errore nel caricamento dello storico."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDownload(ordine: StoricoOrdine) {
    setDownloadingId(ordine.id);
    try {
      const res = await fetch("/api/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposals: ordine.piano }),
      });
      if (!res.ok) throw new Error("Errore durante l'esportazione del file.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ordine.id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto durante il download.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 2 }}>Storico ordini</h2>
      <p style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", fontSize: 13.5, marginBottom: "var(--space-5)" }}>
        Ordini generati e approvati in passato.
      </p>

      {error && <p style={{ fontSize: 12.5, color: "#e08a8a", marginBottom: "var(--space-3)" }}>{error}</p>}

      <div className="card elev-sm" style={{ padding: "var(--space-4)" }}>
        {loading ? (
          <p style={{ fontSize: 13.5, opacity: 0.7 }}>Caricamento…</p>
        ) : ordini.length === 0 ? (
          <p style={{ fontSize: 13.5, opacity: 0.7 }}>Nessun ordine approvato finora.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ordine</th>
                <th>Data</th>
                <th>Produttori</th>
                <th>Articoli</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ordini.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>{o.id}</td>
                  <td>{new Date(o.creatoIl).toLocaleDateString("it-IT")}</td>
                  <td style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
                    {o.fornitori}
                  </td>
                  <td>{o.numeroArticoli}</td>
                  <td>
                    <span className="tag tag-accent">{o.stato}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-icon"
                      title="Scarica"
                      onClick={() => handleDownload(o)}
                      disabled={downloadingId === o.id}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 4v12M12 16l-4-4M12 16l4-4" />
                        <path d="M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

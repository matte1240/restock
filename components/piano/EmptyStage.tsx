"use client";

import { useRef, useState } from "react";
import type { Article } from "@/lib/types";

interface EmptyStageProps {
  onParsed: (articles: Article[], fileName: string) => void;
}

export function EmptyStage({ onParsed }: EmptyStageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    const name = file.name.toLowerCase();
    if (!(name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv"))) {
      setParseError("Formato non supportato. Carica un file .xlsx, .xls o .csv.");
      return;
    }
    setParsing(true);
    setParseError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-excel", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore durante il caricamento.");
      onParsed(data.articles as Article[], file.name);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      style={{
        border: `1.5px dashed ${dragOver ? "var(--color-accent)" : "var(--color-divider)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "56px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-3)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--color-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, marginBottom: 4 }}>
          Trascina qui il file Excel dei prodotti
        </div>
        <div style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          .xlsx, .xls o .csv — colonne attese: codice articolo, giacenza, impegnato, ordinato, qta scarico, qta
          carico
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
        <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={parsing}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          {parsing ? "Lettura in corso…" : "Seleziona file"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {parsing && <div style={{ fontSize: 12.5, color: "var(--color-accent)" }}>Lettura file in corso…</div>}
      {parseError && <div style={{ fontSize: 12.5, color: "#e08a8a" }}>{parseError}</div>}
    </div>
  );
}

"use client";

interface ApprovedStageProps {
  count: number;
  fornitoriCount: number;
  onDownload: () => void;
  downloading: boolean;
  onNewPlan: () => void;
}

export function ApprovedStage({ count, fornitoriCount, onDownload, downloading, onNewPlan }: ApprovedStageProps) {
  return (
    <div className="card elev-sm" style={{ padding: 40, alignItems: "center", textAlign: "center", gap: "var(--space-3)" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--color-accent-900)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l3 3 5-6" />
        </svg>
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Piano approvato</div>
      <div style={{ fontSize: 13.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
        {count} articoli da {fornitoriCount} fornitori · aggiunto allo storico ordini
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)", justifyContent: "center" }}>
        <button type="button" className="btn btn-secondary" onClick={onDownload} disabled={downloading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v12M12 16l-4-4M12 16l4-4" />
            <path d="M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
          </svg>
          {downloading ? "Preparazione…" : "Esporta Excel"}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNewPlan}>
          Nuovo piano
        </button>
      </div>
    </div>
  );
}

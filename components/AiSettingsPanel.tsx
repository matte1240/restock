"use client";

import { useEffect, useRef, useState } from "react";
import { AI_MODELS, type AiReasoningLevel, type AiSettings } from "@/lib/types";

const SAVE_DEBOUNCE_MS = 400;

const REASONING_OPTIONS: { value: AiReasoningLevel; label: string; help: string }[] = [
  { value: "none", label: "Nessuno (più veloce)", help: "Risposta diretta, senza ragionamento esteso." },
  {
    value: "adaptive",
    label: "Adattivo",
    help: "Il modello decide da sé quanto ragionare in base alla complessità del caso.",
  },
  {
    value: "deep",
    label: "Approfondito",
    help: "Budget di ragionamento esteso fisso: più lento e costoso, utile per casi complessi.",
  },
];

export function AiSettingsPanel() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetch("/api/ai-settings")
      .then((res) => res.json())
      .then((data: { settings?: AiSettings }) => {
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => setError("Errore nel caricamento delle impostazioni AI."));
  }, []);

  function updateSettings(patch: Partial<AiSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Errore nel salvataggio delle impostazioni AI.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore imprevisto.");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  if (!settings) return null;

  return (
    <div className="card elev-sm" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)" }}>
      <div className="card-title">Impostazioni AI</div>
      <p style={{ fontSize: 13, opacity: 0.8, marginTop: 2, marginBottom: "var(--space-3)" }}>
        Modello e livello di ragionamento usati sia per generare le proposte d&apos;ordine sia per la ricerca
        prodotto nel catalogo articoli.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", maxWidth: 480 }}>
        <div className="field">
          <label>Modello</label>
          <select className="input" value={settings.model} onChange={(e) => updateSettings({ model: e.target.value })}>
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Ragionamento</label>
          <select
            className="input"
            value={settings.reasoning}
            onChange={(e) => updateSettings({ reasoning: e.target.value as AiReasoningLevel })}
          >
            {REASONING_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ marginTop: 8, fontSize: 11.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
        {REASONING_OPTIONS.find((r) => r.value === settings.reasoning)?.help}
      </p>

      {error && <p style={{ marginTop: 8, fontSize: 12.5, color: "#e08a8a" }}>{error}</p>}
    </div>
  );
}

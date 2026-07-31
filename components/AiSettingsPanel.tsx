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
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Impostazioni AI</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Modello e livello di ragionamento usati sia per generare le proposte d&apos;ordine sia per la ricerca
        prodotto nel catalogo articoli.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Modello</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            value={settings.model}
            onChange={(e) => updateSettings({ model: e.target.value })}
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ragionamento</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            value={settings.reasoning}
            onChange={(e) => updateSettings({ reasoning: e.target.value as AiReasoningLevel })}
          >
            {REASONING_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-xs text-zinc-400">
        {REASONING_OPTIONS.find((r) => r.value === settings.reasoning)?.help}
      </p>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

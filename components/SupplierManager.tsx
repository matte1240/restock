"use client";

import { useEffect, useRef } from "react";
import type { OrderFrequency, Supplier } from "@/lib/types";

const STORAGE_KEY = "restock-suppliers-v1";

const FREQUENCY_DAYS: Record<Exclude<OrderFrequency, "personalizzata">, number> = {
  settimanale: 7,
  quindicinale: 14,
  mensile: 30,
};

interface SupplierManagerProps {
  suppliers: Supplier[];
  onChange: (suppliers: Supplier[]) => void;
}

export function SupplierManager({ suppliers, onChange }: SupplierManagerProps) {
  const hydrated = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Supplier[];
        if (Array.isArray(parsed) && parsed.length > 0) onChange(parsed);
      } catch {
        // ignore corrupted storage
      }
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
  }, [suppliers]);

  function addSupplier() {
    const newSupplier: Supplier = {
      id: crypto.randomUUID(),
      nome: "",
      prefissi: [],
      frequenza: "settimanale",
      frequenzaGiorni: 7,
    };
    onChange([...suppliers, newSupplier]);
  }

  function updateSupplier(id: string, patch: Partial<Supplier>) {
    onChange(suppliers.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSupplier(id: string) {
    onChange(suppliers.filter((s) => s.id !== id));
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">2. Fornitori</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Prefisso codice articolo (es. CAL, S, 3M) e frequenza ordini per ciascun fornitore.
          </p>
        </div>
        <button
          type="button"
          onClick={addSupplier}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          + Aggiungi fornitore
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {suppliers.length === 0 && <p className="text-sm text-zinc-400">Nessun fornitore configurato.</p>}
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="grid grid-cols-1 gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-12 sm:items-center"
          >
            <input
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 sm:col-span-3"
              placeholder="Nome fornitore"
              value={supplier.nome}
              onChange={(e) => updateSupplier(supplier.id, { nome: e.target.value })}
            />
            <input
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 sm:col-span-3"
              placeholder="Prefissi (es. CAL, S)"
              value={supplier.prefissi.join(", ")}
              onChange={(e) =>
                updateSupplier(supplier.id, {
                  prefissi: e.target.value
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean),
                })
              }
            />
            <select
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 sm:col-span-3"
              value={supplier.frequenza}
              onChange={(e) => {
                const frequenza = e.target.value as OrderFrequency;
                updateSupplier(supplier.id, {
                  frequenza,
                  frequenzaGiorni:
                    frequenza === "personalizzata" ? supplier.frequenzaGiorni : FREQUENCY_DAYS[frequenza],
                });
              }}
            >
              <option value="settimanale">Settimanale</option>
              <option value="quindicinale">Quindicinale</option>
              <option value="mensile">Mensile</option>
              <option value="personalizzata">Personalizzata</option>
            </select>
            {supplier.frequenza === "personalizzata" ? (
              <input
                type="number"
                min={1}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 sm:col-span-2"
                placeholder="Giorni"
                value={supplier.frequenzaGiorni}
                onChange={(e) => updateSupplier(supplier.id, { frequenzaGiorni: Number(e.target.value) || 1 })}
              />
            ) : (
              <span className="text-sm text-zinc-500 dark:text-zinc-400 sm:col-span-2">
                ogni {supplier.frequenzaGiorni} giorni
              </span>
            )}
            <button
              type="button"
              onClick={() => removeSupplier(supplier.id)}
              className="text-sm font-medium text-red-600 hover:underline dark:text-red-400 sm:col-span-1"
            >
              Rimuovi
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

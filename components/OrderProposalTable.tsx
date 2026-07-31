"use client";

import type { SupplierOrderProposal } from "@/lib/types";

interface OrderProposalTableProps {
  proposals: SupplierOrderProposal[];
  onQuantityChange: (fornitoreId: string, codice: string, quantita: number) => void;
}

export function OrderProposalTable({ proposals, onQuantityChange }: OrderProposalTableProps) {
  return (
    <div className="space-y-6">
      {proposals.map((proposal) => (
        <div
          key={proposal.fornitoreId}
          className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
        >
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-50">
            {proposal.fornitoreNome}
          </div>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-2">Codice</th>
                <th className="px-4 py-2">Giacenza</th>
                <th className="px-4 py-2">Impegnato</th>
                <th className="px-4 py-2">Ordinato</th>
                <th className="px-4 py-2">Consumo medio/gg</th>
                <th className="px-4 py-2">Copertura (gg)</th>
                <th className="px-4 py-2">Qtà da ordinare</th>
                <th className="px-4 py-2">Confezione</th>
                <th className="px-4 py-2">Nota AI</th>
              </tr>
            </thead>
            <tbody>
              {proposal.righe.map((riga) => (
                <tr key={riga.codice} className="border-b border-zinc-100 dark:border-zinc-800/60">
                  <td className="px-4 py-2 font-mono">{riga.codice}</td>
                  <td className="px-4 py-2">{riga.giacenzaAttuale}</td>
                  <td className="px-4 py-2">{riga.impegnato}</td>
                  <td className="px-4 py-2">{riga.ordinato}</td>
                  <td className="px-4 py-2">{riga.consumoMedioGiornaliero.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    {riga.coperturaGiorniAttuale !== null ? riga.coperturaGiorniAttuale.toFixed(1) : "n/d"}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
                      value={riga.quantitaConsigliata}
                      onChange={(e) =>
                        onQuantityChange(proposal.fornitoreId, riga.codice, Number(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                    {riga.quantitaPerConfezione
                      ? `${riga.unitaConfezione ?? "confezione"} da ${riga.quantitaPerConfezione} pz — ${
                          riga.quantitaConfezioni !== null ? riga.quantitaConfezioni.toFixed(1) : "?"
                        }`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{riga.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

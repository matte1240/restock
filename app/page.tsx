"use client";

import { useEffect, useMemo, useState } from "react";
import { ApprovedStage } from "@/components/piano/ApprovedStage";
import { EmptyStage } from "@/components/piano/EmptyStage";
import type { PlanRow } from "@/components/piano/PlanStage";
import { PlanStage } from "@/components/piano/PlanStage";
import { UploadedStage } from "@/components/piano/UploadedStage";
import { usePianoBadge } from "@/components/PianoBadgeContext";
import type { Article, GenerateOrdersResponse, Supplier, SupplierOrderProposal } from "@/lib/types";

type Stage = "empty" | "uploaded" | "plan" | "approved";

function groupByFornitore(rows: PlanRow[]): SupplierOrderProposal[] {
  const map = new Map<string, SupplierOrderProposal>();
  for (const row of rows) {
    const existing = map.get(row.fornitoreId);
    if (existing) {
      existing.righe.push(row);
    } else {
      map.set(row.fornitoreId, { fornitoreId: row.fornitoreId, fornitoreNome: row.fornitoreNome, righe: [row] });
    }
  }
  return [...map.values()];
}

export default function PianoOrdiniPage() {
  const { setCount } = usePianoBadge();

  const [stage, setStage] = useState<Stage>("empty");
  const [fileName, setFileName] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [aiSummary, setAiSummary] = useState("");

  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approvedProposals, setApprovedProposals] = useState<SupplierOrderProposal[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((res) => res.json())
      .then((data: { suppliers?: Supplier[] }) => setSuppliers(data.suppliers ?? []))
      .catch(() => {});
  }, []);

  const sottoScortaCount = useMemo(
    () => articles.filter((a) => a.scortaMinima !== null && a.giacenzaAttuale < a.scortaMinima).length,
    [articles]
  );

  useEffect(() => {
    setCount(stage === "uploaded" || stage === "plan" ? sottoScortaCount : 0);
  }, [stage, sottoScortaCount, setCount]);

  function resetToUpload() {
    setStage("empty");
    setFileName(null);
    setArticles([]);
    setPlanRows([]);
    setGenerateError(null);
    setApproveError(null);
  }

  function handleParsed(parsed: Article[], name: string) {
    setArticles(parsed);
    setFileName(name);
    setStage("uploaded");
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/generate-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles, assignments: {} }),
      });
      const data = (await res.json()) as GenerateOrdersResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore durante la generazione del piano.");

      const rows: PlanRow[] = data.proposals.flatMap((p) =>
        p.righe
          .filter((r) => r.quantitaConsigliata > 0)
          .map((r) => ({ ...r, fornitoreId: p.fornitoreId, fornitoreNome: p.fornitoreNome }))
      );
      const fornitoriCount = new Set(rows.map((r) => r.fornitoreId)).size;
      setAiSummary(
        `Ho analizzato ${articles.length} articoli: ${rows.length} richiedono riordino. Ho raggruppato le righe per ${fornitoriCount} fornitori in base a giacenza, consumo e scorta minima.`
      );
      setPlanRows(rows);
      setStage("plan");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setGenerating(false);
    }
  }

  function handleQuantityChange(index: number, value: number) {
    setPlanRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              quantitaConsigliata: value,
              quantitaConfezioni: row.quantitaPerConfezione ? value / row.quantitaPerConfezione : null,
            }
          : row
      )
    );
  }

  function handleFornitoreChange(index: number, fornitoreId: string) {
    const fornitore = [...suppliers].find((s) => s.id === fornitoreId);
    setPlanRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, fornitoreId, fornitoreNome: fornitore?.nome ?? "Non assegnato" } : row
      )
    );
  }

  function handleRemoveRow(index: number) {
    setPlanRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleApprove() {
    setApproving(true);
    setApproveError(null);
    try {
      const proposals = groupByFornitore(planRows);
      const res = await fetch("/api/storico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposals }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore durante il salvataggio del piano.");
      setApprovedProposals(proposals);
      setStage("approved");
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Errore imprevisto.");
    } finally {
      setApproving(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposals: approvedProposals }),
      });
      if (!res.ok) throw new Error("Errore durante l'esportazione del file.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "proposta-ordini.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // download failure is non-critical here; the plan is already saved in Storico
    } finally {
      setDownloading(false);
    }
  }

  const approvedFornitoriCount = new Set(approvedProposals.map((p) => p.fornitoreId)).size;
  const approvedCount = approvedProposals.reduce((sum, p) => sum + p.righe.length, 0);

  return (
    <div style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 2 }}>Piano Ordini</h2>
      <p style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", fontSize: 13.5, marginBottom: "var(--space-6)" }}>
        Carica il file Excel dei prodotti e genera un piano di riordino con l&apos;AI.
      </p>

      {stage === "empty" && <EmptyStage onParsed={handleParsed} />}

      {stage === "uploaded" && fileName && (
        <UploadedStage
          fileName={fileName}
          articles={articles}
          suppliers={suppliers}
          sottoScortaCount={sottoScortaCount}
          onReset={resetToUpload}
          onGenerate={handleGenerate}
          generating={generating}
          generateError={generateError}
        />
      )}

      {stage === "plan" && (
        <PlanStage
          rows={planRows}
          suppliers={suppliers}
          aiSummary={aiSummary}
          onQuantityChange={handleQuantityChange}
          onFornitoreChange={handleFornitoreChange}
          onRemove={handleRemoveRow}
          onCancel={resetToUpload}
          onApprove={handleApprove}
          approving={approving}
          approveError={approveError}
        />
      )}

      {stage === "approved" && (
        <ApprovedStage
          count={approvedCount}
          fornitoriCount={approvedFornitoriCount}
          onDownload={handleDownload}
          downloading={downloading}
          onNewPlan={resetToUpload}
        />
      )}
    </div>
  );
}

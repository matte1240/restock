import ExcelJS from "exceljs";
import type { SupplierOrderProposal } from "./types";

const HEADERS = [
  "Codice",
  "Giacenza Attuale",
  "Impegnato",
  "Ordinato",
  "Scorta Minima",
  "Consumo Medio Giornaliero",
  "Copertura Attuale (gg)",
  "Quantità da Ordinare",
  "Confezione",
  "Nota AI",
];

/** Excel sheet names are capped at 31 chars and can't contain: \ / * ? : [ ] */
function sanitizeSheetName(name: string, usedNames: Set<string>): string {
  const sanitized = name.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || "Fornitore";
  let candidate = sanitized;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffixStr = ` (${suffix})`;
    candidate = `${sanitized.slice(0, 31 - suffixStr.length)}${suffixStr}`;
    suffix += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export async function buildOrdersWorkbook(proposals: SupplierOrderProposal[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Restock";
  workbook.created = new Date();

  const usedNames = new Set<string>();

  for (const proposal of proposals) {
    const sheet = workbook.addWorksheet(sanitizeSheetName(proposal.fornitoreNome, usedNames));
    sheet.addRow(HEADERS).font = { bold: true };
    sheet.columns = HEADERS.map((header) => ({
      header,
      width: header === "Codice" ? 16 : header === "Nota AI" ? 40 : 20,
    }));

    for (const riga of proposal.righe) {
      sheet.addRow([
        riga.codice,
        riga.giacenzaAttuale,
        riga.impegnato,
        riga.ordinato,
        riga.scortaMinima ?? "",
        Number(riga.consumoMedioGiornaliero.toFixed(2)),
        riga.coperturaGiorniAttuale !== null ? Number(riga.coperturaGiorniAttuale.toFixed(1)) : "",
        riga.quantitaConsigliata,
        riga.quantitaPerConfezione
          ? `${riga.unitaConfezione ?? "confezione"} da ${riga.quantitaPerConfezione} pz — ${
              riga.quantitaConfezioni !== null ? riga.quantitaConfezioni.toFixed(1) : "?"
            }`
          : "",
        riga.nota,
      ]);
    }

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    });
  }

  return workbook.xlsx.writeBuffer();
}

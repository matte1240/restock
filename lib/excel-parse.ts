import ExcelJS from "exceljs";
import type { Article } from "./types";

const COLUMN_ALIASES: Record<keyof Article, string[]> = {
  codice: ["codice articolo", "codice", "cod articolo", "cod. articolo"],
  giacenzaAttuale: ["giacenza attuale", "giacenza"],
  impegnato: ["impegnato"],
  ordinato: ["ordinato"],
  qtaScarico: ["qta scarico", "quantita scarico", "q.ta scarico", "qta' scarico"],
  qtaCarico: ["qta carico", "quantita carico", "q.ta carico", "qta' carico"],
};

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export class ExcelParseError extends Error {}

export async function parseArticlesExcel(buffer: ArrayBuffer): Promise<Article[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new ExcelParseError("Il file Excel non contiene fogli di lavoro.");
  }

  const headerRow = sheet.getRow(1);
  const columnIndexByField = new Map<keyof Article, number>();

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const normalized = normalizeHeader(String(cell.value ?? ""));
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof Article, string[]][]) {
      if (aliases.includes(normalized) && !columnIndexByField.has(field)) {
        columnIndexByField.set(field, colNumber);
      }
    }
  });

  const missing = (Object.keys(COLUMN_ALIASES) as (keyof Article)[]).filter(
    (field) => !columnIndexByField.has(field)
  );
  if (missing.length > 0) {
    throw new ExcelParseError(
      `Colonne mancanti nel file Excel: ${missing.join(", ")}. Intestazioni attese: Codice Articolo, Giacenza Attuale, Impegnato, Ordinato, Qta Scarico, Qta Carico.`
    );
  }

  const articles: Article[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const codiceCell = row.getCell(columnIndexByField.get("codice")!);
    const codice = String(codiceCell.value ?? "").trim();
    if (!codice) return;

    const readNumber = (field: keyof Article) => {
      const cell = row.getCell(columnIndexByField.get(field)!);
      const raw = cell.value;
      if (typeof raw === "number") return raw;
      if (raw && typeof raw === "object" && "result" in raw) {
        const result = (raw as { result?: unknown }).result;
        return typeof result === "number" ? result : Number(result ?? 0);
      }
      const parsed = Number(String(raw ?? "0").replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    articles.push({
      codice,
      giacenzaAttuale: readNumber("giacenzaAttuale"),
      impegnato: readNumber("impegnato"),
      ordinato: readNumber("ordinato"),
      qtaScarico: readNumber("qtaScarico"),
      qtaCarico: readNumber("qtaCarico"),
    });
  });

  if (articles.length === 0) {
    throw new ExcelParseError("Nessun articolo trovato nel file Excel.");
  }

  return articles;
}

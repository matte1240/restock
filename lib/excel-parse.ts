import ExcelJS from "exceljs";
import type { Article } from "./types";

type RequiredField = "codice" | "giacenzaAttuale" | "impegnato" | "ordinato" | "qtaScarico" | "qtaCarico";
type OptionalField = "lottoRiordino" | "scortaMinima";

const REQUIRED_COLUMN_ALIASES: Record<RequiredField, string[]> = {
  codice: ["codice articolo", "codice", "cod articolo", "cod. articolo"],
  giacenzaAttuale: ["giacenza attuale", "giacenza"],
  impegnato: ["impegnato"],
  ordinato: ["ordinato"],
  qtaScarico: ["qta scarico", "quantita scarico", "q.ta scarico", "qta' scarico"],
  qtaCarico: ["qta carico", "quantita carico", "q.ta carico", "qta' carico"],
};

const OPTIONAL_COLUMN_ALIASES: Record<OptionalField, string[]> = {
  lottoRiordino: ["lotto riordino", "lotto di riordino", "lotto"],
  scortaMinima: ["scorta minima", "scorta min", "giacenza minima", "scorta di sicurezza"],
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
  const requiredColumnIndex = new Map<RequiredField, number>();
  const optionalColumnIndex = new Map<OptionalField, number>();

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const normalized = normalizeHeader(String(cell.value ?? ""));
    for (const [field, aliases] of Object.entries(REQUIRED_COLUMN_ALIASES) as [RequiredField, string[]][]) {
      if (aliases.includes(normalized) && !requiredColumnIndex.has(field)) {
        requiredColumnIndex.set(field, colNumber);
      }
    }
    for (const [field, aliases] of Object.entries(OPTIONAL_COLUMN_ALIASES) as [OptionalField, string[]][]) {
      if (aliases.includes(normalized) && !optionalColumnIndex.has(field)) {
        optionalColumnIndex.set(field, colNumber);
      }
    }
  });

  const missing = (Object.keys(REQUIRED_COLUMN_ALIASES) as RequiredField[]).filter(
    (field) => !requiredColumnIndex.has(field)
  );
  if (missing.length > 0) {
    throw new ExcelParseError(
      `Colonne mancanti nel file Excel: ${missing.join(", ")}. Intestazioni attese: Codice Articolo, Giacenza Attuale, Impegnato, Ordinato, Qta Scarico, Qta Carico.`
    );
  }

  function cellNumericValue(cell: ExcelJS.Cell): number | null {
    const raw = cell.value;
    if (typeof raw === "number") return raw;
    if (raw && typeof raw === "object" && "result" in raw) {
      const result = (raw as { result?: unknown }).result;
      return typeof result === "number" ? result : Number(result ?? NaN);
    }
    if (raw === null || raw === undefined || raw === "") return null;
    const parsed = Number(String(raw).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const articles: Article[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const codiceCell = row.getCell(requiredColumnIndex.get("codice")!);
    const codice = String(codiceCell.value ?? "").trim();
    if (!codice) return;

    const readNumber = (field: RequiredField) => cellNumericValue(row.getCell(requiredColumnIndex.get(field)!)) ?? 0;

    const readOptionalNumber = (field: OptionalField) => {
      const colNumber = optionalColumnIndex.get(field);
      if (colNumber === undefined) return null;
      return cellNumericValue(row.getCell(colNumber));
    };

    articles.push({
      codice,
      giacenzaAttuale: readNumber("giacenzaAttuale"),
      impegnato: readNumber("impegnato"),
      ordinato: readNumber("ordinato"),
      qtaScarico: readNumber("qtaScarico"),
      qtaCarico: readNumber("qtaCarico"),
      lottoRiordino: readOptionalNumber("lottoRiordino"),
      scortaMinima: readOptionalNumber("scortaMinima"),
    });
  });

  if (articles.length === 0) {
    throw new ExcelParseError("Nessun articolo trovato nel file Excel.");
  }

  return articles;
}

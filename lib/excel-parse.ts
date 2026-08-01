import ExcelJS from "exceljs";
import type { Article } from "./types";

type RequiredField = "codice" | "giacenzaAttuale" | "impegnato" | "qtaScarico";
type ZeroDefaultField = "ordinato" | "qtaCarico";
type NullableOptionalField = "lottoRiordino" | "scortaMinima";

const REQUIRED_COLUMN_ALIASES: Record<RequiredField, string[]> = {
  codice: ["codice articolo", "codice", "cod articolo"],
  giacenzaAttuale: ["giacenza attuale", "giacenza"],
  impegnato: ["impegnato"],
  qtaScarico: ["qta scarico", "quantita scarico", "q ta scarico"],
};

/** Not every ERP export tracks these (e.g. no incoming-order data); default to 0 when absent. */
const ZERO_DEFAULT_COLUMN_ALIASES: Record<ZeroDefaultField, string[]> = {
  ordinato: ["ordinato"],
  qtaCarico: ["qta carico", "quantita carico", "q ta carico"],
};

const NULLABLE_OPTIONAL_COLUMN_ALIASES: Record<NullableOptionalField, string[]> = {
  lottoRiordino: ["lotto riordino", "lotto di riordino", "lotto", "lt riord"],
  scortaMinima: ["scorta minima", "scorta min", "sc min", "giacenza minima", "scorta di sicurezza"],
};

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.*']/g, " ")
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
  const zeroDefaultColumnIndex = new Map<ZeroDefaultField, number>();
  const nullableColumnIndex = new Map<NullableOptionalField, number>();

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const normalized = normalizeHeader(String(cell.value ?? ""));
    for (const [field, aliases] of Object.entries(REQUIRED_COLUMN_ALIASES) as [RequiredField, string[]][]) {
      if (aliases.includes(normalized) && !requiredColumnIndex.has(field)) {
        requiredColumnIndex.set(field, colNumber);
      }
    }
    for (const [field, aliases] of Object.entries(ZERO_DEFAULT_COLUMN_ALIASES) as [ZeroDefaultField, string[]][]) {
      if (aliases.includes(normalized) && !zeroDefaultColumnIndex.has(field)) {
        zeroDefaultColumnIndex.set(field, colNumber);
      }
    }
    for (const [field, aliases] of Object.entries(NULLABLE_OPTIONAL_COLUMN_ALIASES) as [
      NullableOptionalField,
      string[],
    ][]) {
      if (aliases.includes(normalized) && !nullableColumnIndex.has(field)) {
        nullableColumnIndex.set(field, colNumber);
      }
    }
  });

  const missing = (Object.keys(REQUIRED_COLUMN_ALIASES) as RequiredField[]).filter(
    (field) => !requiredColumnIndex.has(field)
  );
  if (missing.length > 0) {
    throw new ExcelParseError(
      `Colonne mancanti nel file Excel: ${missing.join(", ")}. Intestazioni richieste: Codice Articolo, Giacenza (Attuale), Impegnato, Qta Scarico.`
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

    const readRequiredNumber = (field: RequiredField) =>
      cellNumericValue(row.getCell(requiredColumnIndex.get(field)!)) ?? 0;

    const readZeroDefaultNumber = (field: ZeroDefaultField) => {
      const colNumber = zeroDefaultColumnIndex.get(field);
      if (colNumber === undefined) return 0;
      return cellNumericValue(row.getCell(colNumber)) ?? 0;
    };

    const readNullableNumber = (field: NullableOptionalField) => {
      const colNumber = nullableColumnIndex.get(field);
      if (colNumber === undefined) return null;
      return cellNumericValue(row.getCell(colNumber));
    };

    articles.push({
      codice,
      giacenzaAttuale: readRequiredNumber("giacenzaAttuale"),
      impegnato: readRequiredNumber("impegnato"),
      qtaScarico: readRequiredNumber("qtaScarico"),
      ordinato: readZeroDefaultNumber("ordinato"),
      qtaCarico: readZeroDefaultNumber("qtaCarico"),
      lottoRiordino: readNullableNumber("lottoRiordino"),
      scortaMinima: readNullableNumber("scortaMinima"),
    });
  });

  if (articles.length === 0) {
    throw new ExcelParseError("Nessun articolo trovato nel file Excel.");
  }

  return articles;
}

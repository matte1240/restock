import type { Article, Supplier } from "./types";

export const UNASSIGNED_SUPPLIER_ID = "non-assegnato";

/** Virtual bucket for articles with no (or an ambiguous) supplier prefix match, so the
 * AI still proposes quantities for them instead of silently excluding them. */
export const UNASSIGNED_SUPPLIER: Supplier = {
  id: UNASSIGNED_SUPPLIER_ID,
  nome: "Non assegnato",
  prefissi: [],
  frequenza: "mensile",
  frequenzaGiorni: 30,
};

export interface MatchResult {
  fornitoreId: string | null;
  fornitoreNome: string | null;
  /** The configured prefix that matched (original casing), so callers can strip it from the code. */
  prefissoUsato: string | null;
  ambiguo: boolean;
}

/**
 * Assigns an article code to a supplier using longest-prefix match.
 * Ties (same prefix length, different suppliers) are flagged as ambiguous
 * and left unassigned so the user can resolve them manually.
 */
export function matchArticleToSupplier(codice: string, suppliers: Supplier[]): MatchResult {
  const normalizedCode = codice.trim().toUpperCase();

  let bestLength = -1;
  let bestMatches: { supplier: Supplier; prefix: string }[] = [];

  for (const supplier of suppliers) {
    for (const rawPrefix of supplier.prefissi) {
      const prefix = rawPrefix.trim();
      if (!prefix) continue;
      if (normalizedCode.startsWith(prefix.toUpperCase())) {
        if (prefix.length > bestLength) {
          bestLength = prefix.length;
          bestMatches = [{ supplier, prefix }];
        } else if (prefix.length === bestLength && !bestMatches.some((m) => m.supplier === supplier)) {
          bestMatches.push({ supplier, prefix });
        }
      }
    }
  }

  if (bestMatches.length === 0) {
    return { fornitoreId: null, fornitoreNome: null, prefissoUsato: null, ambiguo: false };
  }
  if (bestMatches.length > 1) {
    return { fornitoreId: null, fornitoreNome: null, prefissoUsato: null, ambiguo: true };
  }
  return {
    fornitoreId: bestMatches[0].supplier.id,
    fornitoreNome: bestMatches[0].supplier.nome,
    prefissoUsato: bestMatches[0].prefix,
    ambiguo: false,
  };
}

/** Strips a matched prefix (and any immediate separator like "-", "_", ".", space) from
 * a code, so the remainder is closer to the manufacturer's own product code. */
export function stripMatchedPrefix(codice: string, prefissoUsato: string | null): string {
  if (!prefissoUsato) return codice;
  const trimmed = codice.trim();
  if (!trimmed.toUpperCase().startsWith(prefissoUsato.toUpperCase())) return trimmed;
  return trimmed.slice(prefissoUsato.length).replace(/^[-_.\s]+/, "");
}

export function matchArticles(articles: Article[], suppliers: Supplier[]) {
  return articles.map((article) => ({
    article,
    match: matchArticleToSupplier(article.codice, suppliers),
  }));
}

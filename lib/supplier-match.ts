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
  let bestMatches: Supplier[] = [];

  for (const supplier of suppliers) {
    for (const rawPrefix of supplier.prefissi) {
      const prefix = rawPrefix.trim().toUpperCase();
      if (!prefix) continue;
      if (normalizedCode.startsWith(prefix)) {
        if (prefix.length > bestLength) {
          bestLength = prefix.length;
          bestMatches = [supplier];
        } else if (prefix.length === bestLength && !bestMatches.includes(supplier)) {
          bestMatches.push(supplier);
        }
      }
    }
  }

  if (bestMatches.length === 0) {
    return { fornitoreId: null, fornitoreNome: null, ambiguo: false };
  }
  if (bestMatches.length > 1) {
    return { fornitoreId: null, fornitoreNome: null, ambiguo: true };
  }
  return { fornitoreId: bestMatches[0].id, fornitoreNome: bestMatches[0].nome, ambiguo: false };
}

export function matchArticles(articles: Article[], suppliers: Supplier[]) {
  return articles.map((article) => ({
    article,
    match: matchArticleToSupplier(article.codice, suppliers),
  }));
}

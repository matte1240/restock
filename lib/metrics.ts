import type { Article, ArticleMetrics } from "./types";

/** Days elapsed from Jan 1st of `referenceDate`'s year up to and including `referenceDate`. */
export function daysElapsedThisYear(referenceDate: Date = new Date()): number {
  const startOfYear = Date.UTC(referenceDate.getUTCFullYear(), 0, 1);
  const today = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((today - startOfYear) / msPerDay) + 1);
}

export function computeArticleMetrics(article: Article, referenceDate: Date = new Date()): ArticleMetrics {
  const daysElapsed = daysElapsedThisYear(referenceDate);
  const consumoMedioGiornaliero = article.qtaScarico / daysElapsed;
  const disponibilitaNetta = article.giacenzaAttuale + article.ordinato - article.impegnato;
  const coperturaGiorniAttuale =
    consumoMedioGiornaliero > 0 ? disponibilitaNetta / consumoMedioGiornaliero : null;

  return {
    ...article,
    consumoMedioGiornaliero,
    disponibilitaNetta,
    coperturaGiorniAttuale,
  };
}

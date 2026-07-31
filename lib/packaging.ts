/** Rounds a suggested order quantity up to the nearest multiple of a packaging size (e.g. pallet/carton). */
export function roundUpToPackaging(quantity: number, quantitaPerConfezione: number | null | undefined): number {
  if (!quantitaPerConfezione || quantitaPerConfezione <= 0) return quantity;
  if (quantity <= 0) return 0;
  return Math.ceil(quantity / quantitaPerConfezione) * quantitaPerConfezione;
}

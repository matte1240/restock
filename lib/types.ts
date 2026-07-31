export interface Article {
  codice: string;
  giacenzaAttuale: number;
  impegnato: number;
  ordinato: number;
  qtaScarico: number;
  qtaCarico: number;
  /** Multiplo di riordino da Excel (colonna opzionale), se presente ha priorità sul confezionamento del catalogo. */
  lottoRiordino: number | null;
  /** Scorta minima da Excel (colonna opzionale): soglia sotto cui la giacenza non dovrebbe scendere. */
  scortaMinima: number | null;
}

export type OrderFrequency = "settimanale" | "quindicinale" | "mensile" | "personalizzata";

export interface Supplier {
  id: string;
  nome: string;
  prefissi: string[];
  frequenza: OrderFrequency;
  frequenzaGiorni: number;
}

export interface ArticleMetrics extends Article {
  consumoMedioGiornaliero: number;
  disponibilitaNetta: number;
  coperturaGiorniAttuale: number | null;
}

export interface AssignedArticle extends ArticleMetrics {
  fornitoreId: string | null;
  fornitoreNome: string | null;
}

export interface OrderLine extends AssignedArticle {
  quantitaConsigliata: number;
  nota: string;
  quantitaPerConfezione: number | null;
  unitaConfezione: string | null;
  quantitaConfezioni: number | null;
}

export interface CatalogEntry {
  codice: string;
  fornitoreId: string | null;
  descrizione: string | null;
  ordinaAConfezione: boolean;
  unitaConfezione: string | null;
  quantitaPerConfezione: number | null;
  note: string | null;
  fonte: string | null;
  aggiornatoIl: string;
}

export interface SupplierOrderProposal {
  fornitoreId: string;
  fornitoreNome: string;
  righe: OrderLine[];
}

export interface GenerateOrdersRequest {
  articles: Article[];
  assignments: Record<string, string | null>;
}

export interface GenerateOrdersResponse {
  proposals: SupplierOrderProposal[];
}

export const AI_MODELS = [
  { id: "claude-sonnet-5", label: "Sonnet 5 (bilanciato)" },
  { id: "claude-opus-5", label: "Opus 5 (più capace, più lento/costoso)" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (più veloce/economico)" },
] as const;

export type AiReasoningLevel = "none" | "adaptive" | "deep";

export interface AiSettings {
  model: string;
  reasoning: AiReasoningLevel;
}

export interface Article {
  codice: string;
  giacenzaAttuale: number;
  impegnato: number;
  ordinato: number;
  qtaScarico: number;
  qtaCarico: number;
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
}

export interface SupplierOrderProposal {
  fornitoreId: string;
  fornitoreNome: string;
  righe: OrderLine[];
}

export interface GenerateOrdersRequest {
  articles: Article[];
  suppliers: Supplier[];
  assignments: Record<string, string | null>;
}

export interface GenerateOrdersResponse {
  proposals: SupplierOrderProposal[];
  nonAssegnati: Article[];
}

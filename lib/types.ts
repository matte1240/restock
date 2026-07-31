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

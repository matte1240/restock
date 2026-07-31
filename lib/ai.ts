import Anthropic from "@anthropic-ai/sdk";
import { UNASSIGNED_SUPPLIER_ID } from "./supplier-match";
import type { AssignedArticle, CatalogEntry, OrderLine, Supplier } from "./types";

const BATCH_SIZE = 45;
const DEFAULT_MODEL = "claude-sonnet-5";

const PROPOSE_ORDERS_TOOL = {
  name: "propose_orders",
  description:
    "Restituisce, per ogni articolo fornito, la quantità consigliata da ordinare e una breve nota che ne spiega la motivazione.",
  input_schema: {
    type: "object" as const,
    properties: {
      articoli: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            codice: { type: "string" as const },
            quantitaConsigliata: {
              type: "integer" as const,
              description: "Quantità intera consigliata da ordinare, >= 0.",
            },
            nota: {
              type: "string" as const,
              description: "Breve nota (max 1 frase) sulla motivazione della quantità scelta.",
            },
          },
          required: ["codice", "quantitaConsigliata", "nota"],
        },
      },
    },
    required: ["articoli"],
  },
};

interface ProposeOrdersResult {
  codice: string;
  quantitaConsigliata: number;
  nota: string;
}

const SAVE_PRODUCT_INFO_TOOL = {
  name: "save_product_info",
  description: "Salva le informazioni trovate sul prodotto corrispondente al codice articolo richiesto.",
  input_schema: {
    type: "object" as const,
    properties: {
      descrizione: {
        type: ["string", "null"] as const,
        description: "Breve descrizione/nome del prodotto (es. 'Nastro adesivo 3M Scotch 19mm x 66m').",
      },
      ordinaAConfezione: {
        type: "boolean" as const,
        description: "true se il prodotto si vende/ordina tipicamente in confezioni multiple (bancale, cartone, ecc.) invece che a pezzo singolo.",
      },
      unitaConfezione: {
        type: ["string", "null"] as const,
        description: "Etichetta dell'unità di confezionamento se ordinaAConfezione è true (es. 'bancale', 'cartone', 'scatola da 24').",
      },
      quantitaPerConfezione: {
        type: ["integer", "null"] as const,
        description: "Numero di pezzi contenuti in una confezione/bancale, se noto.",
      },
      note: {
        type: ["string", "null"] as const,
        description: "Eventuali note utili trovate durante la ricerca (es. incertezza sul dato, varianti del prodotto).",
      },
      fonte: {
        type: ["string", "null"] as const,
        description: "URL (o elenco separato da virgola) delle pagine usate come fonte, se la ricerca ha prodotto risultati.",
      },
    },
    required: ["descrizione", "ordinaAConfezione", "unitaConfezione", "quantitaPerConfezione", "note", "fonte"],
  },
};

export interface EnrichArticleResult {
  descrizione: string | null;
  ordinaAConfezione: boolean;
  unitaConfezione: string | null;
  quantitaPerConfezione: number | null;
  note: string | null;
  fonte: string | null;
}

/** The reorder lot from the uploaded Excel (fresh, per-upload ERP data) takes priority
 * over the catalog's AI-researched packaging size when both are present. */
function effectivePackaging(
  article: AssignedArticle,
  catalog: CatalogEntry | undefined
): { multiplo: number | null; unita: string | null } {
  if (article.lottoRiordino && article.lottoRiordino > 1) {
    return { multiplo: article.lottoRiordino, unita: catalog?.unitaConfezione ?? "lotto" };
  }
  if (catalog?.ordinaAConfezione && catalog.quantitaPerConfezione) {
    return { multiplo: catalog.quantitaPerConfezione, unita: catalog.unitaConfezione };
  }
  return { multiplo: null, unita: null };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildPrompt(
  supplier: Supplier,
  articles: AssignedArticle[],
  catalogByCode: Map<string, CatalogEntry>
): string {
  const rows = articles
    .map((a) => {
      const catalog = catalogByCode.get(a.codice.trim().toUpperCase());
      const { multiplo, unita } = effectivePackaging(a, catalog);
      const fields = [
        `codice=${a.codice}`,
        `giacenzaAttuale=${a.giacenzaAttuale}`,
        `impegnato=${a.impegnato}`,
        `ordinato=${a.ordinato}`,
        `consumoMedioGiornaliero=${a.consumoMedioGiornaliero.toFixed(3)}`,
        `disponibilitaNetta=${a.disponibilitaNetta}`,
        `coperturaGiorniAttuale=${a.coperturaGiorniAttuale !== null ? a.coperturaGiorniAttuale.toFixed(1) : "n/d"}`,
      ];
      if (a.scortaMinima !== null) {
        fields.push(`scortaMinima=${a.scortaMinima}`);
      }
      if (multiplo) {
        fields.push(`confezionamento=venduto a ${unita ?? "confezioni"} da ${multiplo} pezzi`);
      }
      return fields.join(", ");
    })
    .join("\n");

  const contextLine =
    supplier.id === UNASSIGNED_SUPPLIER_ID
      ? `Sei un assistente per la gestione del magazzino. Questi articoli non sono ancora stati assegnati a un fornitore specifico: proponi comunque le quantità da ordinare assumendo un ciclo di riordino generico di ${supplier.frequenzaGiorni} giorni.`
      : `Sei un assistente per la gestione del magazzino. Devi proporre le quantità da ordinare per il fornitore "${supplier.nome}", che riceve ordini ogni ${supplier.frequenzaGiorni} giorni.`;

  return `${contextLine}

Per ogni articolo hai a disposizione:
- giacenzaAttuale: unità fisicamente in magazzino
- impegnato: unità già riservate per ordini clienti (non disponibili)
- ordinato: unità già ordinate al fornitore ma non ancora arrivate
- consumoMedioGiornaliero: consumo medio giornaliero stimato dall'inizio dell'anno
- disponibilitaNetta: giacenzaAttuale + ordinato - impegnato
- coperturaGiorniAttuale: quanti giorni durerebbe la disponibilitaNetta al ritmo di consumo attuale ("n/d" se il consumo è zero)
- scortaMinima (se presente, dal file Excel): soglia minima di giacenza sotto cui non si dovrebbe mai scendere prima del prossimo riordino; trattala come vincolo prioritario rispetto al semplice calcolo di copertura
- confezionamento (se presente, da lotto di riordino Excel o dal catalogo articoli): l'articolo si ordina solo in multipli di questa confezione; la quantità finale verrà comunque arrotondata per eccesso al multiplo più vicino, ma proponi già una quantità coerente con questo vincolo quando possibile

Obiettivo: la quantità ordinata deve coprire il consumo previsto fino al prossimo ordine (tra ${supplier.frequenzaGiorni} giorni) più un margine di sicurezza ragionevole, mantenendo la disponibilità sopra la scortaMinima quando specificata, evitando sia rotture di stock sia sovra-scorte eccessive. Se un articolo ha consumo pari a zero, copertura già ampiamente sufficiente e disponibilità sopra la scorta minima, la quantità consigliata può essere 0.

Articoli:
${rows}

Rispondi chiamando lo strumento "propose_orders" con una riga per ciascun codice articolo elencato sopra.`;
}

export interface AiClientOptions {
  apiKey?: string;
  model?: string;
}

export function createAnthropicClient(options: AiClientOptions = {}) {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY non configurata. Impostala come variabile d'ambiente per generare le proposte d'ordine."
    );
  }
  return new Anthropic({ apiKey });
}

async function proposeOrdersForBatch(
  client: Anthropic,
  model: string,
  supplier: Supplier,
  batch: AssignedArticle[],
  catalogByCode: Map<string, CatalogEntry>
): Promise<ProposeOrdersResult[]> {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    tools: [PROPOSE_ORDERS_TOOL],
    tool_choice: { type: "tool", name: "propose_orders" },
    messages: [{ role: "user", content: buildPrompt(supplier, batch, catalogByCode) }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error(`Risposta AI senza risultati strutturati per il fornitore ${supplier.nome}.`);
  }

  const input = toolUse.input as { articoli?: ProposeOrdersResult[] };
  return input.articoli ?? [];
}

export async function generateOrderProposalForSupplier(
  client: Anthropic,
  supplier: Supplier,
  articles: AssignedArticle[],
  catalogByCode: Map<string, CatalogEntry> = new Map(),
  model: string = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
): Promise<OrderLine[]> {
  const batches = chunk(articles, BATCH_SIZE);
  const results: ProposeOrdersResult[] = [];

  for (const batch of batches) {
    const batchResults = await proposeOrdersForBatch(client, model, supplier, batch, catalogByCode);
    results.push(...batchResults);
  }

  const resultByCode = new Map(results.map((r) => [r.codice.trim().toUpperCase(), r]));

  return articles.map((article) => {
    const result = resultByCode.get(article.codice.trim().toUpperCase());
    const catalog = catalogByCode.get(article.codice.trim().toUpperCase());
    const { multiplo, unita } = effectivePackaging(article, catalog);
    return {
      ...article,
      quantitaConsigliata: result ? Math.max(0, Math.round(result.quantitaConsigliata)) : 0,
      nota: result?.nota ?? "Nessuna raccomandazione ricevuta dall'AI.",
      quantitaPerConfezione: multiplo,
      unitaConfezione: unita,
      quantitaConfezioni: null,
    };
  });
}

/** Uses Claude's server-side web search to look up product info for an article code and
 * extract structured data (description, whether it's ordered by pallet/carton, etc.). */
export async function enrichArticleWithWebSearch(
  client: Anthropic,
  codice: string,
  model: string = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
): Promise<EnrichArticleResult> {
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    tools: [
      { type: "web_search_20260318", name: "web_search", max_uses: 3 },
      SAVE_PRODUCT_INFO_TOOL,
    ],
    messages: [
      {
        role: "user",
        content: `Cerca sul web informazioni sul prodotto con codice articolo "${codice}" (potrebbe essere un codice interno di magazzino che include il nome del produttore/fornitore, es. un codice che inizia con "3M" per prodotti 3M). Cerca di capire di che prodotto si tratta, e soprattutto se viene tipicamente venduto/ordinato in confezioni multiple (bancale, cartone, scatola) invece che a pezzo singolo, e quante unità contiene una confezione.

Quando hai finito di cercare (anche se non trovi nulla di utile), chiama SEMPRE lo strumento "save_product_info" con i risultati, usando null per i campi che non sei riuscito a determinare.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "save_product_info"
  );
  if (!toolUse) {
    return {
      descrizione: null,
      ordinaAConfezione: false,
      unitaConfezione: null,
      quantitaPerConfezione: null,
      note: "L'AI non ha restituito risultati strutturati per questo codice.",
      fonte: null,
    };
  }

  const input = toolUse.input as Partial<EnrichArticleResult>;
  return {
    descrizione: input.descrizione ?? null,
    ordinaAConfezione: input.ordinaAConfezione ?? false,
    unitaConfezione: input.unitaConfezione ?? null,
    quantitaPerConfezione: input.quantitaPerConfezione ?? null,
    note: input.note ?? null,
    fonte: input.fonte ?? null,
  };
}

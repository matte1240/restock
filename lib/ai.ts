import Anthropic from "@anthropic-ai/sdk";
import { UNASSIGNED_SUPPLIER_ID } from "./supplier-match";
import type { AssignedArticle, OrderLine, Supplier } from "./types";

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

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildPrompt(supplier: Supplier, articles: AssignedArticle[]): string {
  const rows = articles
    .map((a) =>
      [
        `codice=${a.codice}`,
        `giacenzaAttuale=${a.giacenzaAttuale}`,
        `impegnato=${a.impegnato}`,
        `ordinato=${a.ordinato}`,
        `consumoMedioGiornaliero=${a.consumoMedioGiornaliero.toFixed(3)}`,
        `disponibilitaNetta=${a.disponibilitaNetta}`,
        `coperturaGiorniAttuale=${a.coperturaGiorniAttuale !== null ? a.coperturaGiorniAttuale.toFixed(1) : "n/d"}`,
      ].join(", ")
    )
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

Obiettivo: la quantità ordinata deve coprire il consumo previsto fino al prossimo ordine (tra ${supplier.frequenzaGiorni} giorni) più un margine di sicurezza ragionevole, evitando sia rotture di stock sia sovra-scorte eccessive. Se un articolo ha consumo pari a zero o copertura già ampiamente sufficiente, la quantità consigliata può essere 0.

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
  batch: AssignedArticle[]
): Promise<ProposeOrdersResult[]> {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    tools: [PROPOSE_ORDERS_TOOL],
    tool_choice: { type: "tool", name: "propose_orders" },
    messages: [{ role: "user", content: buildPrompt(supplier, batch) }],
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
  model: string = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
): Promise<OrderLine[]> {
  const batches = chunk(articles, BATCH_SIZE);
  const results: ProposeOrdersResult[] = [];

  for (const batch of batches) {
    const batchResults = await proposeOrdersForBatch(client, model, supplier, batch);
    results.push(...batchResults);
  }

  const resultByCode = new Map(results.map((r) => [r.codice.trim().toUpperCase(), r]));

  return articles.map((article) => {
    const result = resultByCode.get(article.codice.trim().toUpperCase());
    return {
      ...article,
      quantitaConsigliata: result ? Math.max(0, Math.round(result.quantitaConsigliata)) : 0,
      nota: result?.nota ?? "Nessuna raccomandazione ricevuta dall'AI.",
    };
  });
}

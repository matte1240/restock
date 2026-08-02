import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  AiReasoningLevel,
  AiSettings,
  CatalogEntry,
  OrderFrequency,
  StoricoOrdine,
  Supplier,
  SupplierOrderProposal,
} from "./types";

const DEFAULT_AI_SETTINGS: AiSettings = {
  model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  reasoning: "none",
};

const DB_PATH = process.env.DATABASE_PATH ?? "./data/restock.db";

let db: DatabaseSync | undefined;

function getDb(): DatabaseSync {
  if (db) return db;

  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      prefissi TEXT NOT NULL,
      frequenza TEXT NOT NULL,
      frequenza_giorni INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS articoli_catalogo (
      codice TEXT PRIMARY KEY,
      fornitore_id TEXT REFERENCES suppliers(id),
      descrizione TEXT,
      ordina_a_confezione INTEGER NOT NULL DEFAULT 0,
      unita_confezione TEXT,
      quantita_per_confezione INTEGER,
      note TEXT,
      fonte TEXT,
      aggiornato_il TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      model TEXT NOT NULL,
      reasoning TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS storico_ordini (
      id TEXT PRIMARY KEY,
      creato_il TEXT NOT NULL,
      fornitori TEXT NOT NULL,
      numero_articoli INTEGER NOT NULL,
      stato TEXT NOT NULL,
      piano_json TEXT NOT NULL
    );
  `);
  return db;
}

interface SupplierRow {
  id: string;
  nome: string;
  prefissi: string;
  frequenza: OrderFrequency;
  frequenza_giorni: number;
}

function rowToSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    nome: row.nome,
    prefissi: JSON.parse(row.prefissi) as string[],
    frequenza: row.frequenza,
    frequenzaGiorni: row.frequenza_giorni,
  };
}

export function listSuppliers(): Supplier[] {
  const rows = getDb().prepare("SELECT * FROM suppliers ORDER BY nome").all() as unknown as SupplierRow[];
  return rows.map(rowToSupplier);
}

export function upsertSupplier(supplier: Supplier): Supplier {
  getDb()
    .prepare(
      `INSERT INTO suppliers (id, nome, prefissi, frequenza, frequenza_giorni)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome,
         prefissi = excluded.prefissi,
         frequenza = excluded.frequenza,
         frequenza_giorni = excluded.frequenza_giorni`
    )
    .run(
      supplier.id,
      supplier.nome,
      JSON.stringify(supplier.prefissi),
      supplier.frequenza,
      supplier.frequenzaGiorni
    );
  return supplier;
}

export function deleteSupplier(id: string): void {
  getDb().prepare("DELETE FROM suppliers WHERE id = ?").run(id);
}

interface CatalogRow {
  codice: string;
  fornitore_id: string | null;
  descrizione: string | null;
  ordina_a_confezione: number;
  unita_confezione: string | null;
  quantita_per_confezione: number | null;
  note: string | null;
  fonte: string | null;
  aggiornato_il: string;
}

function rowToCatalogEntry(row: CatalogRow): CatalogEntry {
  return {
    codice: row.codice,
    fornitoreId: row.fornitore_id,
    descrizione: row.descrizione,
    ordinaAConfezione: row.ordina_a_confezione === 1,
    unitaConfezione: row.unita_confezione,
    quantitaPerConfezione: row.quantita_per_confezione,
    note: row.note,
    fonte: row.fonte,
    aggiornatoIl: row.aggiornato_il,
  };
}

export function getCatalogEntries(codici?: string[]): CatalogEntry[] {
  if (codici && codici.length === 0) return [];
  if (!codici) {
    const rows = getDb().prepare("SELECT * FROM articoli_catalogo").all() as unknown as CatalogRow[];
    return rows.map(rowToCatalogEntry);
  }
  const placeholders = codici.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`SELECT * FROM articoli_catalogo WHERE codice IN (${placeholders})`)
    .all(...codici) as unknown as CatalogRow[];
  return rows.map(rowToCatalogEntry);
}

export function upsertCatalogEntry(entry: CatalogEntry): CatalogEntry {
  getDb()
    .prepare(
      `INSERT INTO articoli_catalogo
         (codice, fornitore_id, descrizione, ordina_a_confezione, unita_confezione, quantita_per_confezione, note, fonte, aggiornato_il)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(codice) DO UPDATE SET
         fornitore_id = excluded.fornitore_id,
         descrizione = excluded.descrizione,
         ordina_a_confezione = excluded.ordina_a_confezione,
         unita_confezione = excluded.unita_confezione,
         quantita_per_confezione = excluded.quantita_per_confezione,
         note = excluded.note,
         fonte = excluded.fonte,
         aggiornato_il = excluded.aggiornato_il`
    )
    .run(
      entry.codice,
      entry.fornitoreId,
      entry.descrizione,
      entry.ordinaAConfezione ? 1 : 0,
      entry.unitaConfezione,
      entry.quantitaPerConfezione,
      entry.note,
      entry.fonte,
      entry.aggiornatoIl
    );
  return entry;
}

interface AiSettingsRow {
  model: string;
  reasoning: AiReasoningLevel;
}

export function getAiSettings(): AiSettings {
  const row = getDb().prepare("SELECT model, reasoning FROM ai_settings WHERE id = 1").get() as
    | AiSettingsRow
    | undefined;
  return row ? { model: row.model, reasoning: row.reasoning } : DEFAULT_AI_SETTINGS;
}

export function saveAiSettings(settings: AiSettings): AiSettings {
  getDb()
    .prepare(
      `INSERT INTO ai_settings (id, model, reasoning)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET model = excluded.model, reasoning = excluded.reasoning`
    )
    .run(settings.model, settings.reasoning);
  return settings;
}

interface StoricoRow {
  id: string;
  creato_il: string;
  fornitori: string;
  numero_articoli: number;
  stato: string;
  piano_json: string;
}

function rowToStorico(row: StoricoRow): StoricoOrdine {
  return {
    id: row.id,
    creatoIl: row.creato_il,
    fornitori: row.fornitori,
    numeroArticoli: row.numero_articoli,
    stato: row.stato,
    piano: JSON.parse(row.piano_json) as SupplierOrderProposal[],
  };
}

export function listStoricoOrdini(): StoricoOrdine[] {
  const rows = getDb()
    .prepare("SELECT * FROM storico_ordini ORDER BY creato_il DESC")
    .all() as unknown as StoricoRow[];
  return rows.map(rowToStorico);
}

export function insertStoricoOrdine(entry: StoricoOrdine): StoricoOrdine {
  getDb()
    .prepare(
      `INSERT INTO storico_ordini (id, creato_il, fornitori, numero_articoli, stato, piano_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(entry.id, entry.creatoIl, entry.fornitori, entry.numeroArticoli, entry.stato, JSON.stringify(entry.piano));
  return entry;
}

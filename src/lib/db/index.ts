import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL ?? './data/arbitrage.db';

function resolveDbUrl(): string {
  if (DB_PATH.startsWith('file:') || DB_PATH.startsWith('libsql:')) return DB_PATH;
  const resolved = path.isAbsolute(DB_PATH) ? DB_PATH : path.resolve(process.cwd(), DB_PATH);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return `file:${resolved}`;
}

let _client: Client | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getClient(): Client {
  if (!_client) {
    _client = createClient({ url: resolveDbUrl() });
  }
  return _client;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

export function persistDb() {
  // libsql file client persists automatically
}

export async function initDb() {
  const db = getDb();
  await runMigrations();
  return db;
}

async function runMigrations() {
  const client = getClient();

  const statements = [
    `CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      event_title TEXT NOT NULL,
      market_title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      yes_bid REAL, yes_ask REAL, no_bid REAL, no_ask REAL,
      last_price REAL, volume REAL, liquidity REAL,
      expiration TEXT, resolution_rules TEXT, resolution_source TEXT,
      market_id TEXT NOT NULL, url TEXT,
      status TEXT NOT NULL DEFAULT 'unknown',
      orderbook TEXT, raw_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS markets_platform_idx ON markets(platform)`,
    `CREATE INDEX IF NOT EXISTS markets_status_idx ON markets(status)`,
    `CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT,
      duration_ms INTEGER,
      kalshi_markets_count INTEGER NOT NULL DEFAULT 0,
      polymarket_markets_count INTEGER NOT NULL DEFAULT 0,
      matches_count INTEGER NOT NULL DEFAULT 0,
      opportunities_count INTEGER NOT NULL DEFAULT 0,
      net_profitable_count INTEGER NOT NULL DEFAULT 0,
      best_opportunity_id TEXT, best_adjusted_return REAL,
      errors TEXT NOT NULL DEFAULT '[]', warnings TEXT NOT NULL DEFAULT '[]',
      data_source_mode TEXT NOT NULL DEFAULT 'mock',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS market_matches (
      id TEXT PRIMARY KEY, scan_id TEXT NOT NULL REFERENCES scans(id),
      kalshi_market_id TEXT NOT NULL, polymarket_market_id TEXT NOT NULL,
      match_score REAL NOT NULL, title_similarity REAL NOT NULL,
      description_similarity REAL NOT NULL, date_similarity REAL NOT NULL,
      resolution_similarity REAL NOT NULL, semantic_similarity REAL,
      match_explanation TEXT NOT NULL, warnings TEXT NOT NULL DEFAULT '[]',
      manual_review_required INTEGER NOT NULL DEFAULT 0,
      outcome_relationship TEXT NOT NULL, kalshi_side TEXT NOT NULL,
      polymarket_side TEXT NOT NULL, kalshi_market_title TEXT NOT NULL,
      polymarket_market_title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS market_matches_scan_idx ON market_matches(scan_id)`,
    `CREATE INDEX IF NOT EXISTS market_matches_score_idx ON market_matches(match_score)`,
    `CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY, scan_id TEXT NOT NULL REFERENCES scans(id),
      match_id TEXT NOT NULL REFERENCES market_matches(id),
      kalshi_market_id TEXT NOT NULL, polymarket_market_id TEXT NOT NULL,
      kalshi_market_title TEXT NOT NULL, polymarket_market_title TEXT NOT NULL,
      kalshi_price REAL NOT NULL, polymarket_price REAL NOT NULL,
      kalshi_side TEXT NOT NULL, polymarket_side TEXT NOT NULL,
      total_cost REAL NOT NULL, gross_profit_per_pair REAL NOT NULL,
      gross_return_pct REAL NOT NULL, gross_arbitrage INTEGER NOT NULL,
      total_fees REAL NOT NULL, adjusted_cost REAL NOT NULL,
      adjusted_profit_per_pair REAL NOT NULL, adjusted_return_pct REAL NOT NULL,
      net_profitable INTEGER NOT NULL, max_matched_pairs REAL NOT NULL,
      max_capital_deployable REAL NOT NULL, estimated_total_profit REAL NOT NULL,
      liquidity_source TEXT NOT NULL, opportunity_score REAL NOT NULL,
      match_confidence REAL NOT NULL, liquidity_score REAL NOT NULL,
      risk_score REAL NOT NULL, risk_flags TEXT NOT NULL DEFAULT '[]',
      risk_flags_detail TEXT NOT NULL DEFAULT '[]', expiration_date TEXT,
      status TEXT NOT NULL DEFAULT 'new', first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL, kalshi_snapshot TEXT NOT NULL,
      polymarket_snapshot TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS opportunities_scan_idx ON opportunities(scan_id)`,
    `CREATE INDEX IF NOT EXISTS opportunities_score_idx ON opportunities(opportunity_score)`,
    `CREATE INDEX IF NOT EXISTS opportunities_profitable_idx ON opportunities(net_profitable)`,
    `CREATE TABLE IF NOT EXISTS opportunity_snapshots (
      id TEXT PRIMARY KEY, opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
      scan_id TEXT NOT NULL REFERENCES scans(id),
      kalshi_price REAL NOT NULL, polymarket_price REAL NOT NULL,
      gross_return_pct REAL NOT NULL, adjusted_return_pct REAL NOT NULL,
      max_matched_pairs REAL NOT NULL, risk_flags TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY, opportunity_id TEXT, action_type TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '', kalshi_stake REAL, polymarket_stake REAL,
      kalshi_price REAL, polymarket_price REAL, result TEXT, profit_loss REAL,
      mistakes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS api_errors (
      id TEXT PRIMARY KEY, scan_id TEXT, platform TEXT NOT NULL,
      endpoint TEXT NOT NULL, error_message TEXT NOT NULL,
      status_code INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }
}

export { schema };

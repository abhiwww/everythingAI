/**
 * Database access layer.
 *
 * Two modes:
 * 1. PostgreSQL (production / real pilot) — uses pg Pool.
 * 2. In-memory store (development / demo when no DB available) — same interface.
 *
 * The in-memory store is explicitly labelled as demo/dev only and never used
 * to claim real provider availability in production.
 */

import { Pool, type PoolClient, type QueryResult } from 'pg';
import { logger } from '../logger.js';

interface MemoryQueryResult extends QueryResult<any> {
  oid: never;
}

let pool: Pool | null = null;

export interface DbClient {
  query(text: string, params?: unknown[]): Promise<QueryResult<any>>;
  connect(): Promise<PoolClient>;
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new Pool({ connectionString });
    pool.on('error', (err) => {
      logger.error(err, 'Unexpected PostgreSQL pool error');
    });
  }
  return pool;
}

export function db(): DbClient {
  if (!isPostgresConfigured()) {
    return memoryDb();
  }
  return getPool();
}

export function isPostgresConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * In-memory fallback store for local development / demo.
 * NOT for production use. Data is lost on restart.
 */
const MEMORY: Record<string, any[]> = {};

function collection(name: string): any[] {
  if (!MEMORY[name]) MEMORY[name] = [];
  return MEMORY[name];
}

export function memoryDb(): DbClient {
  return {
    async query(text, params = []): Promise<QueryResult<any>> {
      const sql = text.trim().toUpperCase();
      const now = new Date().toISOString();

      // Very small subset of SQL needed for the demo. This is intentional and
      // clearly scoped — production must use PostgreSQL.
      if (sql.startsWith('SELECT')) {
        return querySelect(text, params);
      }
      if (sql.startsWith('INSERT')) {
        return queryInsert(text, params);
      }
      if (sql.startsWith('UPDATE')) {
        return queryUpdate(text, params);
      }
      if (sql.startsWith('DELETE')) {
        return queryDelete(text, params);
      }
      return { rows: [], rowCount: 0, command: text, fields: [] as any[], oid: 0 };
    },
    async connect() {
      return {
        query: this.query,
        release: () => {},
        commit: async () => {},
        rollback: async () => {},
      } as unknown as PoolClient;
    },
  };
}

function tableFromSql(text: string): string | null {
  // Handle SELECT ... FROM table, INSERT INTO table (...), UPDATE table SET ...
  const m =
    text.match(/FROM\s+([a-z_]+)/i) ??
    text.match(/INSERT INTO\s+([a-z_]+)/i) ??
    text.match(/UPDATE\s+([a-z_]+)/i);
  return m ? m[1] : null;
}

function querySelect(text: string, params: unknown[]) {
  const table = tableFromSql(text);
  if (!table) return { rows: [], rowCount: 0, command: 'SELECT', fields: [], oid: 0 };
  const rows = collection(table);

  // Handle WHERE id = $1 style
  let filtered = rows;
  const whereMatch = text.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);
  if (whereMatch) {
    const where = whereMatch[1];
    const parts = where.split(' AND ');
    for (const part of parts) {
      const [col, , paramRef] = part.trim().split(/\s+/);
      const idx = parseInt(paramRef.replace('$', ''), 10) - 1;
      const val = params[idx];
      if (val !== undefined) {
        filtered = filtered.filter((r: any) => r[col] === val);
      }
    }
  }

  // Handle ORDER BY created_at DESC
  if (text.match(/ORDER BY created_at DESC/i)) {
    filtered = [...filtered].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const limitMatch = text.match(/LIMIT\s+(\d+)/i);
  let limit = limitMatch ? parseInt(limitMatch[1], 10) : filtered.length;
  const offsetMatch = text.match(/OFFSET\s+(\d+)/i);
  const offset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;

  const paginated = filtered.slice(offset, offset + limit);
  return { rows: paginated, rowCount: paginated.length, command: 'SELECT', fields: [], oid: 0 };
}

function queryInsert(text: string, params: unknown[]) {
  const table = tableFromSql(text);
  if (!table) return { rows: [], rowCount: 0, command: 'INSERT', fields: [], oid: 0 };
  const rows = collection(table);
  const id = require('crypto').randomUUID();
  const now = new Date().toISOString();

  // Parse column names from INSERT INTO table (col1, col2, ...) VALUES (...)
  // so the in-memory store retains inserted values (demo only).
  const colMatch = text.match(/INSERT INTO \w+\s*\(([^)]+)\)/i);
  const record: any = { id, created_at: now, updated_at: now };
  if (colMatch) {
    const cols = colMatch[1].split(',').map((c) => c.trim());

    // Extract the VALUES clause and split into individual value tokens.
    // Handles $n param references and simple literals (NULL, strings, now()).
    const valuesMatch = text.match(/VALUES\s*\((.*)\)\s*$/i);
    if (valuesMatch) {
      const rawValues = valuesMatch[1];
      const tokens = splitInsertValues(rawValues);
      cols.forEach((col, colIdx) => {
        const token = tokens[colIdx];
        if (!token) {
          // Missing token — leave column unset
          return;
        }
        if (token.startsWith('$')) {
          const pIdx = parseInt(token.slice(1), 10) - 1;
          record[col] = params[pIdx];
        } else if (token === 'NULL') {
          record[col] = null;
        } else if (token === "now()") {
          record[col] = now;
        } else {
          // Strip surrounding single quotes from string literals
          const m = token.match(/^'(.*)'$/s);
          record[col] = m ? m[1] : token;
        }
      });
    } else {
      // Fallback: positional mapping
      cols.forEach((col, i) => {
        if (params[i] !== undefined) record[col] = params[i];
      });
    }
  }

  rows.push(record);
  return { rows: [record], rowCount: 1, command: 'INSERT', fields: [], oid: 0 };
}

/**
 * Split an INSERT VALUES clause into top-level tokens, respecting
 * single-quoted strings and parenthesised expressions.
 */
function splitInsertValues(raw: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inSingleQuote) {
      current += ch;
      if (ch === "'" && raw[i + 1] !== "'") {
        inSingleQuote = false;
      } else if (ch === "'" && raw[i + 1] === "'") {
        current += "'";
        i++; // skip escaped quote
      }
      continue;
    }
    if (ch === "'") {
      inSingleQuote = true;
      current += ch;
      continue;
    }
    if (ch === '(') {
      parenDepth++;
      current += ch;
      continue;
    }
    if (ch === ')') {
      parenDepth--;
      current += ch;
      continue;
    }
    if (ch === ',' && parenDepth === 0) {
      tokens.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

function queryUpdate(text: string, params: unknown[]) {
  const table = tableFromSql(text);
  if (!table) return { rows: [], rowCount: 0, command: 'UPDATE', fields: [], oid: 0 };
  const rows = collection(table);
  let count = 0;
  const updated: any[] = [];
  const now = new Date().toISOString();

  // Apply simple `col = $n | now() | literal` assignments (demo store only).
  const setClause = text.match(/SET\s+([\s\S]+?)\s+WHERE/i)?.[1] ?? '';
  const assignments: { col: string; value: unknown }[] = [];
  const assignRe = /([a-z_]+)\s*=\s*(\$(\d+)|now\(\)|'([^']*)'|(true|false)|null)/gi;
  for (const m of setClause.matchAll(assignRe)) {
    const [, col, raw, paramIdx, literal, boolLiteral] = m;
    if (raw === 'now()') assignments.push({ col, value: now });
    else if (paramIdx) assignments.push({ col, value: params[parseInt(paramIdx, 10) - 1] });
    else if (literal !== undefined) assignments.push({ col, value: literal });
    else if (boolLiteral) assignments.push({ col, value: boolLiteral === 'true' });
    else assignments.push({ col, value: null });
  }

  const whereMatch = text.match(/WHERE\s+(.+)/i);
  if (whereMatch) {
    const where = whereMatch[1];
    const [col, , paramRef] = where.trim().split(/\s+/);
    const idx = parseInt(paramRef.replace('$', ''), 10) - 1;
    const val = params[idx];
    for (const r of rows) {
      if (r[col] === val) {
        for (const a of assignments) r[a.col] = a.value;
        r.updated_at = now;
        count++;
        updated.push(r);
      }
    }
  }
  return { rows: updated, rowCount: count, command: 'UPDATE', fields: [], oid: 0 };
}

function queryDelete(text: string, params: unknown[]) {
  const table = tableFromSql(text);
  if (!table) return { rows: [], rowCount: 0, command: 'DELETE', fields: [], oid: 0 };
  const rows = collection(table);
  const before = rows.length;
  const whereMatch = text.match(/WHERE\s+(.+)/i);
  if (whereMatch) {
    const where = whereMatch[1];
    const [col, , paramRef] = where.trim().split(/\s+/);
    const idx = parseInt(paramRef.replace('$', ''), 10) - 1;
    const val = params[idx];
    const kept = rows.filter((r) => r[col] !== val);
    MEMORY[table] = kept;
    return { rows: [], rowCount: before - kept.length, command: 'DELETE', fields: [], oid: 0 };
  }
  return { rows: [], rowCount: 0, command: 'DELETE', fields: [], oid: 0 };
}

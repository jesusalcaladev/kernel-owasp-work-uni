// src/db.js
// Capa de persistencia SQLite usando `node:sqlite` (módulo nativo estable
// de Node 22+). Cero instalación de bindings nativos — viene con Node.
//
// API usada: idéntica a better-sqlite3 para que el resto del código
// (`db.prepare(...).get/.all/.run`) siga funcionando sin cambios.
//
// Mejoras aplicadas tras code review:
//   1) Cache de prepared statements (`getPrepared()`) — evita el leak de
//      StatementSync nativos cuando se llama una misma query miles de
//      veces (caso del brute-force de A07 con ~30k `.prepare` calls).
//   2) Sin WAL — single-process CLI/demo no lo necesita y evita los
//      problemas de "database is locked" cuando varios procesos
//      comparten el mismo test.db durante el runner.
//   3) FOREIGN keys quedan habilitados (default en node:sqlite). El
//      resto del código debe respetar el orden de borrado.
//
// Las vulns PLANTADAS en este proyecto son OTRAS (A02 en auth.js,
// A07 en auth.js, A10 en fetch.js) — NO inyección SQL.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const TEST_MODE = process.env.TEST_MODE === '1';
const DB_PATH = TEST_MODE
  ? resolve(DATA_DIR, 'test.db')
  : resolve(DATA_DIR, 'owasp.db');

let _db = null;
const _stmtCache = new Map();

/**
 * Devuelve una instancia singleton de la base de datos.
 */
export function getDb() {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  initSchema(_db);
  return _db;
}

/**
 * Devuelve un prepared statement cacheado por SQL. Reutiliza el handle
 * nativo entre llamadas y evita el leak típico de node:sqlite cuando
 * ejecutás la misma query miles de veces.
 *
 * Nota: el cache vive en este módulo; si cerrás la BD con closeDb()
 * también se descarta el cache.
 */
export function getPrepared(sql) {
  let stmt = _stmtCache.get(sql);
  if (!stmt) {
    stmt = getDb().prepare(sql);
    _stmtCache.set(sql, stmt);
  }
  return stmt;
}

/**
 * Cierra la conexión y descarta el cache de statements.
 */
export function closeDb() {
  if (_db) {
    try {
      _db.close();
    } catch {
      /* ya cerrada */
    }
    _db = null;
    _stmtCache.clear();
  }
}

/**
 * Esquema. A03-prevención: usamos IF NOT EXISTS y FK constraints.
 */
function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,            -- A02: hash débil (VULNERABLE)
      email       TEXT,
      role        TEXT    NOT NULL DEFAULT 'user',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      last_login  TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT PRIMARY KEY,             -- A07: token predecible (VULNERABLE)
      user_id     INTEGER NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      role        TEXT    NOT NULL,             -- 'user' / 'assistant' / 'system'
      content     TEXT    NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

/** Path físico de la BD (útil para mensajes y logs de exploits). */
export const dbPath = DB_PATH;

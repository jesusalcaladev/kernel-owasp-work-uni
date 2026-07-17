// src/profile.js
// Helpers para listar historial y datos del usuario autenticado.
// NOTA: intencionalmente NO chequea que el userId solicitado sea del
// usuario logueado. Es otra vulnerabilidad (A01 IDOR) que mantenemos
// plantada para futuras demos, aunque no entra en las 3 destacadas.
//
// Usa getPrepared() (cache de statements) para evitar leaks nativos en
// lecturas repetidas.

import { getPrepared } from './db.js';

const SQL_HISTORY = `SELECT id, role, content, created_at
                     FROM chat_history
                     WHERE user_id = ?
                     ORDER BY id ASC`;

const SQL_INSERT = `INSERT INTO chat_history (user_id, role, content)
                    VALUES (?, ?, ?)`;

export function getMyHistory(userId) {
  return getPrepared(SQL_HISTORY).all(userId);
}

export function getHistoryOf(userId) {
  // ⚠️ VULNERABLE: A01 IDOR — no chequea propiedad. Mantenido para demo.
  return getMyHistory(userId);
}

export function appendHistory(userId, role, content) {
  getPrepared(SQL_INSERT).run(userId, role, content);
}

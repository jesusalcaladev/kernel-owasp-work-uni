// src/auth.js
// Módulo de autenticación. CONTIENE DOS VULNERABILIDADES OWASP PLANTADAS:
//
//   * A02:2021 — Cryptographic Failures
//       Las contraseñas se hashean con MD5 sin salt. Esto produce colisiones
//       (dos usuarios con la misma contraseña → mismo hash) y permite
//       ataques de rainbow table.
//
//   * A07:2021 — Identification and Authentication Failures
//       1) No hay política de contraseñas (se acepta "1").
//       2) El login devuelve errores DIFERENCIADOS ("usuario no existe" vs
//          "contraseña incorrecta") → habilita user enumeration.
//       3) No hay rate-limiting ni lockout → brute force trivial.
//       4) El token de sesión es predecible: tok_<userId>_<epoch/10>.
//          Cualquiera puede adivinarlo si conoce el id de usuario y la hora.
//
// Las queries usan `getPrepared()` (cached StatementSync). Esto evita
// el leak nativo de node:sqlite cuando una misma query se ejecuta
// miles de veces (caso del brute-force de A07 con ~30k login() calls).
//
// Las queries SQL usan SIEMPRE prepared statements — A03 NO está plantada
// aquí intencionalmente.

import { createHash } from 'node:crypto';
import { getPrepared } from './db.js';

// ────────────────────────────────────────────────────────────────────────────
//  A02 — HASH DE CONTRASEÑA (MD5 SIN SALT)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve un hash VULNERABLE de la contraseña.
 * A02: MD5 sin salt = colisiones + rainbow tables.
 */
export function hashPassword(password) {
  // A02 — vulnerable por defecto: MD5 SIN salt.
  return createHash('md5').update(String(password)).digest('hex');

  // Descomentar las 2 líneas de abajo en vivo hace que los 3 usuarios
  // con la misma contraseña produzcan hashes distintos: el ataque de
  // rainbow table deja de funcionar de un plumazo.
  // (MD5 + salt sigue siendo débil: ideal bcrypt. Pero es un paso que
  // el presentador puede demostrar SIN instalar dependencias.)
  // const SALT = 'owasp-demo-pepper';
  // return createHash('md5').update(SALT + String(password)).digest('hex');
}

// ────────────────────────────────────────────────────────────────────────────
//  A07 — POLÍTICA DE CONTRASEÑA (INEXISTENTE)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Valida la contraseña. A07: acepta cualquier cosa con al menos 1 carácter.
 * No impone longitud mínima, ni tipos de caracteres.
 *
 * MITIGACIÓN:
 *   if (password.length < 12) return 'Muy corta (mínimo 12)';
 *   if (!/[A-Z]/.test(password)) return 'Falta mayúscula';
 *   if (!/[a-z]/.test(password)) return 'Falta minúscula';
 *   if (!/\d/.test(password))     return 'Falta dígito';
 *   if (!/[^A-Za-z0-9]/.test(password)) return 'Falta símbolo';
 *   // Mejor: usar zxcvbn para estimación real de entropía.
 */
export function validatePassword(password) {
  if (!password || password.length < 1) {
    return 'La contraseña no puede estar vacía';
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
//  SIGNUP
// ────────────────────────────────────────────────────────────────────────────

/**
 * Registra un usuario nuevo.
 *  - A02: guarda `hashPassword(password)` (MD5) en la columna password.
 *  - A07: usa `validatePassword` permisivo.
 *
 * MITIGACIÓN completa sería: bcrypt/argon2 + política de contraseña
 * estricta + email verification + rate-limit en el endpoint.
 */
export function signup({ username, password, email }) {
  if (!username || !password) {
    return { ok: false, error: 'Faltan username o password' };
  }
  const policyErr = validatePassword(password);
  if (policyErr) return { ok: false, error: policyErr };

  const exists = getPrepared('SELECT id FROM users WHERE username = ?')
    .get(username);
  if (exists) {
    return { ok: false, error: `El usuario '${username}' ya existe` };
  }

  const hash = hashPassword(password);
  const result = getPrepared(
    `INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, 'user')`
  ).run(username, hash, email || null);

  // node:sqlite devuelve lastInsertRowid como number | bigint.
  // Lo normalizamos a number (los IDs de demo jamás exceden 2³¹).
  return {
    ok: true,
    user: {
      id: Number(result.lastInsertRowid),
      username,
      role: 'user',
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  A07 — LOGIN (USER ENUMERATION + SIN RATE-LIMIT)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Autentica un usuario.
 *  - A07 #1: devuelve errores distintos según exista o no el usuario.
 *  - A07 #2: nadie cuenta los intentos. 10.000 PINs se prueban sin freno.
 *
 * MITIGACIÓN:
 *   - Mensaje genérico: "Credenciales inválidas" para ambos casos.
 *   - Contador por IP/usuario y bloquear tras N intentos.
 *   - O captcha / exponential backoff.
 */
export function login({ username, password }) {
  const user = getPrepared(
    'SELECT id, username, password, role FROM users WHERE username = ?'
  ).get(username);

  // A07 user enumeration: dos paths con mensajes diferentes.
  if (!user) {
    return { ok: false, error: `El usuario '${username}' no existe` };
  }
  if (user.password !== hashPassword(password)) {
    return { ok: false, error: 'Contraseña incorrecta' };
  }

  getPrepared("UPDATE users SET last_login = datetime('now') WHERE id = ?")
    .run(user.id);

  const token = createSession(user.id);
  return {
    ok: true,
    user: { id: user.id, username: user.username, role: user.role || 'user' },
    token,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  A07 — TOKEN DE SESIÓN PREDECIBLE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Genera un token VULNERABLE. A07: predecible si conozco userId y la hora.
 *   token = `tok_<id>_<epoch_segundos / 10>`  → ventana de 10 segundos.
 *
 * MITIGACIÓN:
 *   import { randomBytes } from 'node:crypto';
 *   return randomBytes(32).toString('hex'); // 256 bits de entropía
 *   O usar JWT firmado con secreto fuerte y expiración corta.
 */
export function createSession(userId) {
  const epoch10s = Math.floor(Date.now() / 10_000); // ventana de 10s
  const token = `tok_${userId}_${epoch10s}`;
  getPrepared('INSERT INTO sessions (token, user_id) VALUES (?, ?)')
    .run(token, userId);
  return token;
}

// ────────────────────────────────────────────────────────────────────────────
//  HELPERS USADOS POR EXPLOITS Y CLI
// ────────────────────────────────────────────────────────────────────────────

export function getUserById(id) {
  return getPrepared('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserByUsername(username) {
  return getPrepared('SELECT * FROM users WHERE username = ?').get(username);
}

export function listAllUsers() {
  return getPrepared(
    `SELECT id, username, password, email, role, created_at, last_login
     FROM users ORDER BY id`
  ).all();
}

// ────────────────────────────────────────────────────────────────────────────
//  SESIÓN — DESTRUIR / LISTAR (Linux: logout, who)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Destruye una sesión (logout).
 * Equivale a cerrar la sesión en Linux (exit de shell, pkill -u).
 */
export function destroySession(token) {
  getPrepared('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Valida un token de sesión y devuelve la info del usuario.
 * Útil para restaurar sesión persistida entre reinicios de la CLI.
 * Devuelve null si el token no existe o el usuario fue eliminado.
 */
export function getSessionByToken(token) {
  if (!token) return null;
  const row = getPrepared(`
    SELECT s.token, s.user_id, u.username, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);
  if (!row) return null;
  return {
    user: { id: row.user_id, username: row.username, role: row.role },
    token: row.token,
  };
}

/**
 * Lista todas las sesiones activas con información del usuario.
 * Equivale a `w` o `who` en Linux.
 */
export function listSessions() {
  return getPrepared(`
    SELECT s.token, s.user_id, s.created_at, u.username, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.created_at DESC
  `).all();
}

// ────────────────────────────────────────────────────────────────────────────
//  ADMIN — CAMBIAR ROL / CONTRASEÑA (Linux: chmod, passwd)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Cambia el rol de un usuario (admin only).
 * Equivale a `chmod` en Linux — solo root puede cambiar permisos.
 */
export function changeUserRole(username, newRole) {
  const validRoles = ['user', 'admin'];
  if (!validRoles.includes(newRole)) {
    return { ok: false, error: `Rol inválido: "${newRole}". Usá "user" o "admin".` };
  }
  const user = getUserByUsername(username);
  if (!user) {
    return { ok: false, error: `El usuario '${username}' no existe` };
  }
  getPrepared('UPDATE users SET role = ? WHERE username = ?').run(newRole, username);
  return { ok: true, user: { id: user.id, username, role: newRole } };
}

/**
 * Cambia la contraseña de un usuario (verifica la actual).
 * Equivale a `passwd` en Linux.
 */
export function changePassword(userId, currentPassword, newPassword) {
  const user = getPrepared('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return { ok: false, error: 'Usuario no encontrado' };
  }
  if (user.password !== hashPassword(currentPassword)) {
    return { ok: false, error: 'Contraseña actual incorrecta' };
  }
  if (!newPassword || newPassword.length < 1) {
    return { ok: false, error: 'La nueva contraseña no puede estar vacía' };
  }
  const newHash = hashPassword(newPassword);
  getPrepared('UPDATE users SET password = ? WHERE id = ?').run(newHash, userId);
  return { ok: true };
}

/**
 * Obtiene el conteo total de usuarios y sesiones (para el admin panel).
 */
export function getSystemStats() {
  const userCount = getPrepared('SELECT COUNT(*) as count FROM users').get();
  const sessionCount = getPrepared('SELECT COUNT(*) as count FROM sessions').get();
  return {
    users: userCount.count,
    sessions: sessionCount.count,
  };
}

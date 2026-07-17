// src/fetch.js
// Módulo "fetchUrl". Usado por la CLI con el comando `/fetch <url>` para
// traer contenido extra que se pasa como contexto al LLM.
//
// CONTIENE UNA VULNERABILIDAD OWASP PLANTADA:
//
//   * A10:2021 — Server-Side Request Forgery (SSRF)
//       No valida ni el esquema ni el host. Acepta http://localhost,
//       http://127.0.0.1, http://169.254.169.254 (metadata de AWS),
//       file://, etc. Un atacante puede apuntar a recursos internos que
//       el servidor alcanzaría pero el cliente navegador NO.
//
// En el CLI el comando es: `/fetch http://ejemplo.com` y devuelve el body.

const DEFAULT_MAX_BYTES = 50_000;

/**
 * Hace fetch a la URL y devuelve el contenido (texto) limitado.
 * VULNERABLE: sin allowlist, sin validar host ni protocolo.
 *
 * MITIGACIÓN (multi-capa):
 *   1) Forzar scheme: solo http(s).
 *      if (!/^https?:\/\//i.test(url)) throw new Error('scheme no permitido');
 *   2) Parsear el host y rechazar rangos privados / loopback / link-local:
 *      - 127.0.0.0/8, ::1, localhost
 *      - 10.0.0.0/8, 172.16/12, 192.168/16
 *      - 169.254.0.0/16 (metadata AWS / GCP)
 *      - 0.0.0.0, *.internal
 *   3) Resolver DNS y volver a chequear la IP resultante (anti DNS rebinding).
 *   4) Allowlist explícita de hosts permitidos.
 *   5) Timeouts agresivos + límite de tamaño.
 *   6) Proxy de salida que NO pueda alcanzar la red interna.
 */
export async function fetchUrl(url, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  // ⚠️ VULNERABLE: validación trivial sólo chequea que sea string.
  if (typeof url !== 'string' || url.length < 4) {
    throw new Error('URL inválida');
  }

  // MITIGACIÓN:
  // const parsed = new URL(url);
  // if (!['http:', 'https:'].includes(parsed.protocol))
  //   throw new Error('Scheme no permitido');
  // if (isPrivateHost(parsed.hostname))
  //   throw new Error('Host bloqueado por la allowlist');

  const res = await fetch(url, {
    redirect: 'follow', // ⚠️ VULNERABLE: también permite redirects a intranet
    // MITIGACIÓN: redirect: 'manual' y validar Location de cada hop.
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al hacer fetch a ${url}`);
  }

  const text = await res.text();
  return text.slice(0, maxBytes);
}

/**
 * Helper usado por los exploits. Verifica si el módulo es llamable de forma
 * segura — útil cuando el presentador comente/descomente la mitigación.
 */
export const isVulnerable = true;

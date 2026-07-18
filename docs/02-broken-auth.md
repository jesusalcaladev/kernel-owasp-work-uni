# A07:2021 — Identification and Authentication Failures

## ¿Qué es?
Fallas en cómo se identifica a un usuario. Las más comunes:
- Permite contraseñas triviales (`"1"`, `"1234"`).
- Mensajes de error diferenciados → **user enumeration**.
- Sin rate-limit ni lockout → brute force.
- Tokens de sesión predecibles o sin expiración.
- No hay MFA.

## ¿Dónde está en este proyecto?
Archivo: `src/auth.js`

```js
// A07: mensaje dividido = enumeration
if (!user) return { ok: false, error: `El usuario '${username}' no existe` };
if (user.password !== hashPassword(password))
  return { ok: false, error: 'Contraseña incorrecta' };

// A07: sin rate-limit
// (nada bloquea 10.000 intentos seguidos)

// A07: token predecible
export function createSession(userId) {
  const epoch10s = Math.floor(Date.now() / 10_000);
  return `tok_${userId}_${epoch10s}`;
}
```

Y la política de contraseña (en `validatePassword`) sólo exige `length >= 1`.

## ¿Cómo se explota?
```bash
TEST_MODE=1 node exploits/02-broken-auth.js
```
El script:
1. Crea víctima con PIN `4242`.
2. Muestra los dos mensajes distintos (existe / no existe).
3. Hace brute force de `0000..9999` (10.000 intentos sin freno) y encuentra
   el PIN en < 1 segundo.
4. Imprime el token de sesión y muestra que es predecible.

## ¿Cómo evitarlo?

| ❌ Vulnerable | ✅ Mitigación |
|---|---|
| Mensajes distintos | Único mensaje: "Credenciales inválidas" |
| Sin rate-limit | 5 intentos/IP/hora, captcha, exponential backoff |
| Acepta "1" | Mínimo 12 chars + zxcvbn + breach check (HIBP) |
| Token predecible | `randomBytes(32).toString('hex')` o JWT firmado |
| Sin 2FA | TOTP / WebAuthn / passkeys |

Checklist mínimo:
1. **Mensaje genérico** de fallo (login y reset de password).
2. **Rate-limit** por IP y por usuario, con lockout temporal.
3. **Política robusta**: longitud mínima, lista negra de palabras
   comunes, verificación contra breaches conocidos.
4. **Tokens con entropía real**: 256 bits random, expiración corta,
   rotación, lista negra post-logout.
5. **MFA** (TOTP o passkeys) en cuentas privilegiadas.

## Presentación oral (≈ 1.5 min)
> "Tres agujeros en uno. Primero: la app dice 'el usuario no existe'
> cuando es así, y 'contraseña mal' cuando existe → el atacante mapea
> usernames. Segundo: no hay rate-limit, así que probé 10.000 PINs en
> menos de un segundo y found it. Tercero: el token es 'tok_<id>_<epoch/10>',
> predecible si conozco tu id. Mitigación: mensaje genérico, lockout
> progresivo, 2FA, tokens randomBytes."

## Preguntas que te pueden hacer
- **¿Y captcha?** Útil pero no suficiente. Limitar por IP se bypasea
  con proxies rotativos. Mejor lockout por cuenta + monitorización.
- **¿Por qué randomBytes vs UUID v4?** Crypto.randomUUID también sirve;
  lo crítico es la fuente (no `Math.random`).
- **¿Cuánto dura un buen token?** 15 min en access + refresh de 7 días
  con rotación. Para SSO crítico (< 1h sin re-auth).

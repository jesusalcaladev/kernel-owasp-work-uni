# A02:2021 — Cryptographic Failures

## ¿Qué es?
Fallas en el uso de criptografía que exponen datos sensibles. Lo más común:
- Contraseñas con hash **débil** (MD5, SHA1) o **sin sal**.
- Datos sensibles transmitidos sin HTTPS.
- Claves API o secretos commiteados al repo.

## ¿Dónde está en este proyecto?
Archivo: `src/auth.js`

```js
// A02: MD5 sin salt
export function hashPassword(password) {
  return createHash('md5').update(String(password)).digest('hex');
}
```

El signup guarda directamente ese hash. Dos usuarios con la misma contraseña
terminan con el **mismo hash** → un atacante que descifre uno, descifra todos.
Además, `MD5("1234") = 81dc9bdb52d04dc20036dbd8313ed055` es de dominio público.

## ¿Cómo se explota?
```bash
TEST_MODE=1 node exploits/01-crypto-failures.js
```
El script crea 3 usuarios con la misma contraseña, vuelca la tabla `users` y
compara los hashes. Cualquier rainbow table online los descifra en ms.

## ¿Cómo evitarlo?

| ❌ Vulnerable | ✅ Mitigación |
|---|---|
| `md5(password)` | `bcrypt.hash(password, 12)` o `argon2id` |
| Sin sal | Sal única aleatoria por usuario (bcrypt lo hace solo) |
| Hash case-sensitive | Hash case-insensitive + canonicalización previa |
| Loguear input | Nunca loguear contraseñas ni hashes |

Checklist mínimo:
1. **bcrypt** con cost factor 12+ (o argon2id memory-hard).
2. Política de contraseñas: ≥12 caracteres + chequeo con `zxcvbn`.
3. HTTPS obligatorio. Cookies con flag `Secure` + `HttpOnly`.
4. Secret rotation y gestor (Vault, AWS Secrets Manager).
5. Nunca commitear `.env`, ni imprimir tokens en logs.

## Presentación oral (≈ 1.5 min)
> "Esta app hashea con MD5 sin sal. Si un atacante se lleva la BD (SQL
> injection, backup expuesto, insider), adivina contraseñas comparando
> hashes contra rainbow tables: `MD5('1234')` es público. La solución es
> bcrypt — cada usuario tiene su propia sal, así dos '1234' producen
> hashes distintos y no se puede precalcular nada."

## Preguntas que te pueden hacer
- **¿Por qué no MD5 + stretch?** Stretching manual (iterar 10⁶ veces)
  ayuda pero MD5 sigue siendo rápido para GPU. Bcrypt/argon2 son memory-hard.
- **¿Y SHA-256?** Mejor que MD5 pero sin sal sigue roto. Mismo hash para
  misma contraseña → rainbow tables.
- **¿Hash en cliente o servidor?** Siempre servidor. Si en cliente, el
  hash es la contraseña.

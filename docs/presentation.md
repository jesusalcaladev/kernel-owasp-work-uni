# OWASP Top 10 · Demo en vivo · Talking points

**Duración objetivo:** 8–12 minutos.

---

## 0. Apertura (≈ 30s)

> "Hoy vamos a romper una CLI en vivo. La app está escrita como cualquier
> proyecto junior: tiene auth, perfil, chat con IA y un comando para traer
> contexto de internet. Pero le plantamos 3 vulnerabilidades del OWASP
> Top 10 (versión 2025) para que vean cómo se ven en código real y cuánto
> tarda un atacante en abusarlas.
>
> Las 3 elegidas son: **A02 Cryptographic Failures**, **A07 Broken
> Authentication** y **A10 Server-Side Request Forgery**. Elegí estas
> porque son las más demostrables en una CLI con auth y fetch, y porque
> cubren tres dominios distintos: almacenamiento, identidad y red."

---

## 1. A02 — Cryptographic Failures (≈ 2 min)

**Mostrar:** `src/auth.js` línea de `hashPassword`.

> "La app guarda contraseñas con `md5(password)`. Sin sal.
> Voy a crear 3 usuarios con la misma contraseña y vamos a ver."

**Lanzar:** `TEST_MODE=1 node exploits/01-crypto-failures.js`

> "Como ven, los 3 hashes son idénticos. Y `MD5('1234')` es de dominio
> público: cualquier rainbow table lo descifra en milisegundos."

**Mitigación** (talking point, sin demo):
> "bcrypt con cost 12+, o argon2id memory-hard. Cada usuario tiene su
> propia sal, así '1234' produce hashes distintos. Además, política de
> contraseñas con `zxcvbn` y HTTPS obligatorio para que el hash no viaje
> en claro."

**Link mental:** "Esto es equivalente a tener la misma cerradura en
200 departamentos."

---

## 2. A07 — Broken Authentication (≈ 2.5 min)

**Mostrar:** función `login()` en `src/auth.js`.

> "Dos agujeros obvios. Primero, el mensaje de error es distinto según
> el usuario exista o no — eso permite **user enumeration**: el atacante
> construye un diccionario de usernames válidos antes de tirar passwords.
> Segundo, no hay rate-limit. Voy a brute-force un PIN de 4 dígitos."

**Lanzar:** `TEST_MODE=1 node exploits/02-broken-auth.js`

> "Creé un usuario con PIN 4242. Pruebo 0000 a 9999…
> ahí lo ven: lo encontró en N intentos, sin lockout, en menos de un
> segundo. Y el token que emite es literalmente `tok_<id>_<epoch/10>`:
> lo adiviné comparándolo con la fórmula."

**Mitigación**:
> "Mensaje genérico 'credenciales inválidas' para ambos casos, rate-limit
> por IP y por cuenta, política robusta (mínimo 12 chars, sin palabras
> comunes, chequeo contra HaveIBeenPwned), tokens con `randomBytes(32)`
> o JWT firmado con secreto fuerte, expiración corta, y MFA — TOTP o
> WebAuthn — para cuentas críticas."

---

## 3. A10 — Server-Side Request Forgery (≈ 2.5 min)

**Mostrar:** `fetchUrl()` en `src/fetch.js`.

> "La CLI tiene un comando `/fetch <url>` que trae contenido para el LLM.
> Sin validación de scheme ni de host. El atacante apunta a un servicio
> interno. Voy a probar apuntando a `127.0.0.1` directamente."

**⚠ Nota de modelo del ataque:** el `/fetch` de la CLI está gateado por
login pero el exploit llama `fetchUrl()` directo. **En la realidad, el
atacante no necesita cuenta** — basta que la app tenga cualquier endpoint
donde el input del usuario termine en un `fetch()` server-side: webhook,
preview de URL, OAuth discovery, tool/function-call de LLM. El login
del CLI es cosmético para mantener el flujo ordenado del demo.

**Lanzar:** `TEST_MODE=1 node exploits/03-ssrf.js`

> "El servidor trampa que levanto simula metadata de AWS. El fetch
> devuelve el secreto. Un cliente desde internet jamás podría alcanzar
> ese puerto — el problema es que **el fetch lo hace NUESTRO servidor**,
> que está del lado de adentro."

**Variantes** (mencionar aunque no se demuestre):
> "En la vida real, los blancos son `169.254.169.254` (metadata de AWS IMDSv1),
> `metadata.google.internal`, paneles admin internos, Redis expuesto en
> `localhost:6379`. Especial cuidado cuando se trata de tools de LLM
> que reciben URL del usuario."

**Mitigación**:
> "Allowlist explícita de hosts. Bloquear todo lo que no sea HTTPS.
> Resolver DNS y rechazar rangos privados (`127/8`, `10/8`,
> `172.16/12`, `192.168/16`, `169.254/16`, `::1`). Anti DNS-rebinding:
> revalidar la IP antes de cada conexión. Desactivar `redirect: follow`
> o validar Location hop a hop. Y un proxy de salida que sólo alcance
> internet público, nunca la red interna. En AWS, IMDSv2 obligatorio."

---

## 4. Cierre (≈ 30s)

> "Tres bugs, tres categorías: almacenamiento, identidad y red. La moraleja
> común es que las vulnerabilidades no son exploits exóticos — son
> decisiones que se toman un martes a las 11 AM cuando alguien dice
> '¿para qué validar el scheme?'.
>
> Si se llevan una idea: **pensa como atacante en el momento del diseño**,
> no después. Defense in depth: allowlist + validación + monitorización."

**Q&A** → hoja aparte en cada markdown (`docs/01-…md`, etc.).

---

## Hoja de ruta para imprevistos

| Si pasa… | …hacé esto |
|---|---|
| La red se cae justo en SSRF | El exploit tiene un fallback textual que muestra el body esperado |
| Preguntan "y el resto del OWASP?" | Mencioná A03 (SQL injection) y A01 (IDOR) que dejamos plantadas pero no entran en los 3 |
| "¿Cómo empiezo a asegurar mi API?" | OWASP ASVS + Cheat Sheets en cheatsheetseries.owasp.org |
| "¿Y los AI agents / function calling?" | Aplica TODO A10 + aplicar A03 sobre el output, sandboxes para code exec |
| Se quedan cortos de tiempo | Cortá A07 (solo mostrar el código, no el brute force completo) |
| Se pasan de tiempo | Saltá las mitigaciones orales y mostrá solo el snippet del código |

## Frases de batalla

- "Default deny, no default allow." — para allowlist
- "El servidor no es de confianza." — sobre qué valida quién
- "Si tu server hace fetch, lo estás exponiendo al atacante." — A10
- "Si dos usuarios tienen el mismo hash, está roto." — A02
- "El mensaje de error ES el ataque." — A07 enumeration

## Comandos de la demo (chuleta)

```bash
# Setup
pnpm install
cp .env.example .env       # opcional

# Exploits independientes
TEST_MODE=1 node exploits/01-crypto-failures.js
TEST_MODE=1 node exploits/02-broken-auth.js
TEST_MODE=1 node exploits/03-ssrf.js

# O todo en serie (con pausas)
node run-exploits.js

# La CLI normal (sin exploits)
node src/cli.js
# Dentro: /signup, /login, /chat, /fetch, /history, /users, /help, /exit
```

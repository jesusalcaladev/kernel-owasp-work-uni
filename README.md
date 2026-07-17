# owasp-demo

CLI estilo "codebuff" (AI assistant) escrita en Node.js con **3 vulnerabilidades
del OWASP Top 10 plantadas a propósito**, lista para una exposición en vivo de
8–12 minutos.

| Vulnerabilidad | Archivo vulnerable | Exploit |
|---|---|---|
| **A02:2021** Cryptographic Failures | `src/auth.js` (`hashPassword` MD5 sin sal) | `exploits/01-crypto-failures.js` |
| **A07:2021** Identification & Authentication Failures | `src/auth.js` (sin rate-limit, mensajes distintos, token predecible) | `exploits/02-broken-auth.js` |
| **A10:2021** Server-Side Request Forgery | `src/fetch.js` (`fetchUrl` sin validar host ni scheme) | `exploits/03-ssrf.js` |

> ⚠️ **No despliegues esto.** Todo está deliberadamente vulnerable.
> Es material educativo, NO producción.

## Requisitos

* Node.js **>= 22.5** (usa `node:sqlite` built-in; sin bindings nativos).
* pnpm 11+ (o npm).
* `@bdocs/dui` para la presentación animada de los exploits (box, steps,
  spinner, progress bar, confirm).

## Quick start

```bash
pnpm install                       # instala chalk y dotenv
cp .env.example .env               # opcional: tu OPENROUTER_API_KEY

node src/cli.js                    # arranca la CLI (signup, login, chat, fetch…)
node run-exploits.js               # corre los 3 exploits en serie con pausas

# o uno por uno:
TEST_MODE=1 node exploits/01-crypto-failures.js
TEST_MODE=1 node exploits/02-broken-auth.js
TEST_MODE=1 node exploits/03-ssrf.js

Cada exploit:
1. Imprime un banner ANSI con la vulnerabilidad que ataca.
2. Importa los **mismos módulos `src/` que usa la CLI** (ataque real, no simulado).
3. Deja la BD limpia para el siguiente demo.

## Cómo está construido

```
src/
  cli.js       REPL interactivo (/signup /login /chat /fetch /history…)
  theater.js   Helpers DUI: configure, sleep, runStep, planLabels
  db.js        SQLite (node:sqlite built-in), schema, modo TEST aislado
  auth.js      A02 + A07 plantados con // MITIGACIÓN: inline
  fetch.js     A10 plantado con // MITIGACIÓN: inline
  api.js       OpenRouter client (cae a MOCK si no hay API key)
  chat.js      Capa sobre api.js
  profile.js   Lectura de historial
  logger.js    Helpers de colores (chalk, usado por dentro por runStep)

exploits/      01-, 02-, 03- con banner DUI + steps plan/recap + pacing
               (sleep de entrada, sleep reveal, progress bar en brute-force)
docs/          01-, 02-, 03- técnica + presentation.md con talking points
run-exploits.js  Runner secuencial con DUI confirm() (Enter para continuar)
exploits/      01-crypto, 02-auth, 03-ssrf (cada uno standalone)
docs/          01-, 02-, 03- técnica + presentation.md con talking points
run-exploits.js  Runner maestro secuencial (pausa con Enter entre demos)
```

Los exploits y la CLI comparten los módulos de `src/` — no hay simulación. Si
arreglás el código en `src/auth.js`, los exploits dejan de funcionar.

## Defensa en el código

Cada función vulnerable tiene un bloque `// MITIGACIÓN:` justo debajo con el
código correcto comentado. Durante la presentación podés comentar/descomentar
para togglear entre vulnerable y mitigado en vivo.

## Documentación

- `docs/01-crypto-failures.md` — A02 explicado.
- `docs/02-broken-auth.md`       — A07 explicado.
- `docs/03-ssrf.md`              — A10 explicado.
- `docs/presentation.md`         — Hoja de ruta completa (talking points + Q&A).

Cada markdown técnico incluye: qué es, dónde está en el código, cómo se
explota, cómo se mitiga, posibles preguntas de Q&A.

## Licencia

ISC — material educativo, sin garantía.

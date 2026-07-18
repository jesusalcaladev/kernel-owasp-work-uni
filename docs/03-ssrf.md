# A10:2021 — Server-Side Request Forgery (SSRF)

## ¿Qué es?
El **servidor** (no el cliente) hace una petición HTTP a una URL que el
atacante controla. Como la petición sale desde la red interna, el atacante
alcanza recursos que jamás podría tocar desde internet:
- Servicios loopback (`127.0.0.1`, `localhost`).
- Intranet corporativa (`192.168.x.x`, `10.x.x.x`).
- Metadata de la nube (`169.254.169.254` en AWS IMDSv1).
- Otros tenants del mismo proveedor.

Puntos de entrada típicos: webhooks, previews de URL, fetch de avatars,
OAuth discovery, **funciones/llamadas de tools para LLMs**.

## ¿Dónde está en este proyecto?
Archivo: `src/fetch.js`

```js
export async function fetchUrl(url) {
  // ⚠️ VULNERABLE: sólo chequea que sea string.
  if (typeof url !== 'string' || url.length < 4) throw new Error('URL inválida');
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000) });
  // ...
}
```

La CLI expone esto con el comando `/fetch <url>` (logueado). El exploit
demuestra que también funciona contra `127.0.0.1:9999` sin loguearse,
porque es una función del servidor — el "login" de la CLI es cosmético
para la demo.

## ¿Cómo se explota?
```bash
TEST_MODE=1 node exploits/03-ssrf.js
```
El script:
1. Levanta un servidor interno trampa en `127.0.0.1:9999/admin`
   con un secreto que simula metadata de AWS.
2. Llama `fetchUrl('http://127.0.0.1:9999/admin')` y obtiene el secreto
   → esto lo imprime por pantalla.
3. Subraya que el cliente externo **nunca podría** alcanzar ese puerto
   directamente.

## ¿Cómo evitarlo?

| ❌ Vulnerable | ✅ Mitigación |
|---|---|
| `fetch(url)` directo | Allowlist explícita de hosts |
| Sigue redirects | `redirect: 'manual'` + validar Location |
| Sin validar scheme | Bloquear todo ≠ `https` (o `http` interno) |
| Confía en DNS | Resolver + revalidar IP antes de cada request |
| Puede salir a intranet | Proxy de salida que sólo alcanza internet |
| IMDSv1 | Forzar IMDSv2 en AWS |

Checklist mínimo:
1. **Allowlist** de hosts/dominios permitidos (default deny).
2. Parsear la URL y validar `protocol ∈ {https}` (o http solo interno).
3. **Resolver el hostname** y comparar la IP contra rangos privados
   (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`).
4. **Anti DNS-rebinding**: volver a resolver antes de cada hop.
5. Bloquear `redirect: 'follow'` o validar Location hop a hop.
6. Timeouts agresivos + límite de bytes leídos.
7. En cloud: **IMDSv2 obligatorio** (token en header, no URL).

## Presentación oral (≈ 1.5 min)
> "Cuando un servidor hace fetch a una URL que viene del usuario, el
> atacante tiene acceso a toda la red interna. Le apunté a mi propio
> 127.0.0.1:9999 que simula metadata de AWS y obtuve 'AWS_ACCESS_KEY_ID
> secreto'. Mitigación: allowlist, validar scheme, bloquear rangos
> privados, anti DNS-rebinding, IMDSv2."

## Preguntas que te pueden hacer
- **¿Qué es DNS rebinding?** El atacante controla un DNS que alterna
  entre IP pública (pasa validación) y privada (segundo request).
  Defensa: volver a resolver antes de cada conexión.
- **¿Y si uso un WAF?** Ayuda pero no es defensa en profundidad. Un
  atacante interno o un payload que evade el WAF igual entra.
- **¿Esto aplica solo a webhooks?** No. Previsualización de imágenes,
  OpenGraph fetchers, OAuth discovery, "importar sitio", comandos LLM
  con tools, son todos vectores.

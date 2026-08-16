---
name: zai-practices-security-injection
description: Use ONLY when writing code that checks resource ownership/access control, makes outbound HTTP requests to URLs that could be user-influenced, or merges externally-controlled objects - Broken Access Control/IDOR, SSRF, prototype pollution. Do not use for JWT/token handling (see zai-practices-security-auth) or dependency/supply-chain risk (see zai-practices-security-supply-chain).
---

# Broken Access Control, SSRF, Prototype Pollution: input no confiable en 2026

Este skill es conocimiento **defensivo**: como no introducir las
vulnerabilidades que ya se sabe que se explotan en la practica. No es una
guia de como explotar nada.

## OWASP Top 10:2025 - que cambio y por que importa

El Top 10 se reordeno de forma significativa respecto a la version 2021,
no es solo un refresh cosmetico:

1. **Broken Access Control** sigue en el puesto #1 - la falla mas comun
   sigue siendo "el usuario A puede acceder/modificar datos del usuario
   B" en cualquiera de sus formas (IDOR, falta de chequeo de ownership,
   endpoints admin sin verificar rol).
2. **Security Misconfiguration** subio del puesto #5 al #2 - defaults
   inseguros, headers faltantes, permisos de cloud/storage demasiado
   abiertos, CORS mal configurado.
3. **Software Supply Chain Failures** es una categoria nueva - ver
   `zai-practices-security-supply-chain` para el detalle, es la que mas
   cambio el terreno en los ultimos dos años.
4. **Mishandling of Exceptional Conditions** es otra categoria nueva:
   timeouts, sobrecarga, inputs raros que la app no esperaba y que abren
   una puerta cuando el manejo de errores es descuidado (stack traces
   expuestos, estados inconsistentes tras una excepcion no controlada).
5. SSRF se fusiono dentro de Broken Access Control como sub-caso (seguí
   tratandolo como su propio problema tecnico, ver mas abajo - la fusion
   es de categorizacion, no de relevancia).

(Fuente: OWASP Top 10:2025, owasp.org/Top10/2025/.)

## Broken Access Control (IDOR): el chequeo de "existe" no es el chequeo de "es tuyo"

```ts
✗ async function getOrder(orderId: string) {
    return db.order.findUnique({ where: { id: orderId } })
    // cualquier usuario autenticado que adivine/enumere un orderId
    // ajeno se lo lleva puesto - no hay chequeo de ownership
  }

✓ async function getOrder(orderId: string, requestingUserId: string) {
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order || order.userId !== requestingUserId) {
      throw new NotFoundError() // 404, no 403 - no confirmes que el ID existe
    }
    return order
  }
```

## SSRF: no confíes en blacklists ni regex para validar URLs

Node y la mayoria de las librerias HTTP aceptan URLs provistas por el
usuario sin validar DNS/IP de destino. Blacklists y regex fallan
sistematicamente (DNS rebinding, redirects, IPs representadas de formas
no obvias como decimal/octal). La defensa real: **allowlist de destinos
conocidos** cuando sea posible, y si no, resolver el DNS vos mismo y
validar que la IP resuelta no caiga en rangos privados/loopback/link-local
antes de conectar - no confiar en que la libreria HTTP lo haga por vos.

```ts
✗ function isSafeUrl(url: string) {
    return !url.includes("localhost") && !url.includes("127.0.0.1")
    // DNS rebinding, IPs en octal/decimal, redirects: todo esto lo evade
  }

✓ const ALLOWED_HOSTS = new Set(["api.partner.com", "cdn.example.com"])
  async function isSafeUrl(url: string) {
    const { hostname } = new URL(url)
    if (!ALLOWED_HOSTS.has(hostname)) return false
    const { address } = await dns.promises.lookup(hostname)
    return !isPrivateOrLoopback(address) // resolvé vos mismo, no confíes en la lib HTTP
  }
```

## Prototype pollution (JS/TS especifico)

Mezclar un objeto controlado por el usuario dentro de otro (`Object.assign`,
merges recursivos, algunas libs de parsing de query strings) puede
contaminar `Object.prototype` si no se filtran las claves `__proto__`,
`constructor`, `prototype`. Mitigaciones concretas: `Object.create(null)`
para diccionarios que reciben claves externas, validar/filtrar esas
claves explicitamente antes de cualquier merge, y mantener actualizadas
las librerias de parsing (varias CVEs de este tipo salen de libs de
merge/parse, no de código propio).

```ts
✗ function applyUserPreferences(base: object, userInput: object) {
    return Object.assign(base, userInput)
    // userInput = JSON.parse('{"__proto__":{"isAdmin":true}}') contamina
    // Object.prototype para TODO el proceso, no solo este objeto
  }

✓ const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"])
  function applyUserPreferences(base: object, userInput: object) {
    const safe = Object.fromEntries(
      Object.entries(userInput).filter(([k]) => !DANGEROUS_KEYS.has(k))
    )
    return Object.assign(base, safe)
  }
```

## El principio detras de todo esto

Ningun patron de arriba se defiende con una sola linea de codigo aislada
- se defiende con **input no confiable tratado como no confiable en todos
lados** (URLs, claves de objetos, IDs de recursos, contenido que un
agente de IA lee - ver `zai-practices-security-supply-chain`), **permisos
minimos por default**, y **dependencias/frameworks al dia**, verificados
contra fuentes actuales - no contra lo que sabias hace dos años.

Sources: [OWASP Top 10:2025](https://owasp.org/Top10/2025/), [SSRF Prevention in Node.js - OWASP](https://owasp.org/www-community/pages/controls/SSRF_Prevention_in_Nodejs).

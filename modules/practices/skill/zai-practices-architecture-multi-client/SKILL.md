---
name: zai-practices-architecture-multi-client
description: Use ONLY when the same backend serves more than one client app (a web app and a React Native app, for example) and you need to decide whether to keep one generic API or split into a BFF per client. Do not use for internal layering inside the backend itself (see zai-practices-architecture-layering) or for whether to separate that backend into its own deployable service (see zai-practices-architecture-service-boundaries).
---

# Backend multi-cliente: una API, varios frontends

Si el mismo backend va a servir una web (Next.js) **y** una app (React
Native), el backend no le pertenece a ninguno de los dos clientes - vive
como su propio servicio, con su propio ciclo de deploy, y ninguno de los
frontends le agrega lógica de negocio directamente (nada de escribir a la
base de datos desde Server Actions de Next.js si React Native también
necesita ese mismo dato/mutación - eso duplica la regla de negocio en dos
lugares que se van a desincronizar).

Esto es exactamente la condición que dispara `zai-stack-api-layer`
(tRPC vs Server Actions + Zod): con **un solo consumidor** (solo la web),
Server Actions alcanza y separar el backend es prematuro. En el momento
que React Native (o cualquier segundo cliente) entra en escena, ya hay
más de un consumidor tipado del mismo backend - ahí es cuando tRPC (o un
backend HTTP/REST explícito con Express/NestJS, ver `zai-stack-backend-framework`)
deja de ser una capa de más y pasa a ser la forma de no duplicar lógica.
El contrato compartido entre ambos clientes vive en un solo lugar (ver
`zai-practices-project-structure`, `packages/shared-types`) y se testea
como tal (ver `zai-practices-testing`, sección de testing de contrato).

## BFF (Backend For Frontend): cuándo un solo backend no alcanza

Con web + mobile compartiendo una API, hay dos formas de resolver que
cada cliente necesita datos con forma distinta (la web quiere un payload
grande con todo precargado para un dashboard; mobile quiere respuestas
chicas para no gastar datos móviles):

- **Una sola API genérica**, y cada cliente pide/filtra lo que necesita
  (query params, un endpoint GraphQL con selección de campos). Es lo más
  simple - úsalo mientras las necesidades de web y mobile no diverjan
  demasiado.
- **Un BFF por cliente** (`api-web/`, `api-mobile/`) - cada uno es una
  capa fina que llama a los mismos servicios de dominio pero arma la
  respuesta a la medida de su cliente. Se justifica cuando las
  necesidades de forma/agregación divergen tanto que la API genérica
  termina llena de flags (`?mobile=true`) o de campos que un cliente
  nunca usa - el BFF absorbe esa divergencia sin ensuciar el dominio
  compartido.

Un BFF **no** es un segundo backend con lógica de negocio propia - es una
capa de agregación/formato. Si un BFF empieza a tomar decisiones de
negocio (calcular precios, validar reglas), esa lógica se está duplicando
respecto al dominio compartido, exactamente el problema que un BFF existe
para evitar.

```ts
// api-web/dashboard.ts - BFF web: agrega y precarga todo de una
async function getDashboard(userId: string) {
  const [orders, notifications, billing] = await Promise.all([
    domainOrders.listRecent(userId),
    domainNotifications.listUnread(userId),
    domainBilling.getSummary(userId),
  ])
  return { orders, notifications, billing } // un solo payload grande, pensado para la web
}

// api-mobile/dashboard.ts - BFF mobile: mismo dominio, respuesta chica
async function getDashboardSummary(userId: string) {
  const orders = await domainOrders.listRecent(userId, { limit: 3 })
  return { orderCount: orders.length, lastOrder: orders[0] ?? null } // sin billing completo, sin notifications
}
```

Los dos BFFs llaman a los mismos `domainOrders`/`domainNotifications`
/`domainBilling` - la regla de negocio sigue viviendo en un solo lugar,
solo cambia cómo se empaqueta la respuesta para cada cliente.

No arranques con BFFs separados "por si acaso" - es exactamente el mismo
error que separar microservicios sin la razón operacional concreta (ver
`zai-practices-architecture-service-boundaries`). Empezá con una API,
migrá a BFF cuando la divergencia sea real y te esté doliendo.

## Fuentes

- [Backends For Frontends - Sam Newman](https://samnewman.io/patterns/architectural/bff/) - el writeup original que acuñó el patrón BFF.
- [BFF @ SoundCloud - ThoughtWorks](https://www.thoughtworks.com/insights/blog/bff-soundcloud) - implementación real de BFF para web + mobile en una empresa real.

# Ejemplo: BFF por cliente sobre el mismo dominio

Ejemplo completo de referencia para `zai-practices-architecture-multi-client`. Con web + mobile compartiendo una API, hay dos formas de resolver que cada cliente necesita datos con forma distinta (la web quiere un payload grande con todo precargado para un dashboard; mobile quiere respuestas chicas para no gastar datos moviles):

- **Una sola API generica**, y cada cliente pide/filtra lo que necesita (query params, un endpoint GraphQL con seleccion de campos). Es lo mas simple — usalo mientras las necesidades de web y mobile no diverjan demasiado.
- **Un BFF por cliente** (`api-web/`, `api-mobile/`) — cada uno es una capa fina que llama a los mismos servicios de dominio pero arma la respuesta a la medida de su cliente. Se justifica cuando las necesidades de forma/agregacion divergen tanto que la API generica termina llena de flags (`?mobile=true`) o de campos que un cliente nunca usa.

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

Los dos BFFs llaman a los mismos `domainOrders`/`domainNotifications`/`domainBilling` — la regla de negocio sigue viviendo en un solo lugar, solo cambia como se empaqueta la respuesta para cada cliente.

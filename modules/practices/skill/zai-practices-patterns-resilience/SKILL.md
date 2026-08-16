---
name: zai-practices-patterns-resilience
description: Use ONLY when handling calls to external services that can fail or retry unexpectedly - Circuit Breaker for cascading failures, idempotency keys for operations that might execute twice. Do not use for the retry/backoff mechanism itself as a decorator (see zai-practices-patterns-structural), or for distributed transactions across services (see zai-practices-patterns-distributed-data).
---

# Resiliencia ante fallas externas: Circuit Breaker e Idempotencia

## Llamadas a servicios externos que pueden fallar: Circuit Breaker

Si tu app depende de un servicio externo (un proveedor de pago, una API
de terceros) y ese servicio empieza a fallar o a responder lento, seguir
reintentando cada request contra él (aunque sea con backoff, ver el
Decorator de retry en `zai-practices-patterns-structural`) puede agravar
el problema - cada request colgada consume una conexión/thread mientras
esperás el timeout.

**Circuit breaker**: después de N fallos consecutivos, el breaker "se
abre" y las siguientes llamadas fallan **inmediatamente** sin ni siquiera
intentar la red, por un tiempo de enfriamiento - le da respiro al
servicio externo y evita que tu propia app se quede sin recursos
esperando timeouts en cascada. Pasado el enfriamiento, deja pasar una
request de prueba ("half-open") para ver si ya se recuperó.

```ts
// Uso típico con una librería real (opossum, Node.js) en vez de reinventarlo:
import CircuitBreaker from "opossum"

const breaker = new CircuitBreaker(callPaymentProvider, {
  timeout: 3000,           // si tarda más de 3s, cuenta como fallo
  errorThresholdPercentage: 50, // se abre si >50% de las últimas llamadas fallaron
  resetTimeout: 30_000,    // espera 30s antes de probar de nuevo (half-open)
})

breaker.fallback(() => ({ status: "unavailable", queued: true })) // qué devolver mientras está abierto
```

Cuándo SÍ: llamás a un servicio externo con frecuencia y un fallo suyo
puede degradar tu propia disponibilidad si seguís insistiendo. Cuándo NO:
llamadas puntuales, poco frecuentes, donde un timeout ocasional no tiene
efecto cascada real.

## Operaciones que se pueden reintentar sin querer: Idempotencia

Un webhook de pago, un botón de "confirmar" que el usuario clickea dos
veces por ansiedad, un job de cola que se reprocesa porque el worker se
cayó antes de hacer ack - todos pueden ejecutar la misma operación más de
una vez. Si "cobrar $50" se ejecuta dos veces por el mismo evento, cobrás
$100.

**Patrón**: cada operación sensible lleva una **clave de idempotencia**
(un ID único del lado del cliente/evento) que se guarda la primera vez
que se procesa; si llega de nuevo la misma clave, devolvés el resultado
guardado sin volver a ejecutar el efecto.

```ts
async function chargeCard(idempotencyKey: string, amount: number) {
  const existing = await chargeRepo.findByIdempotencyKey(idempotencyKey)
  if (existing) return existing.result // ya se proceso, no repetir el efecto

  const result = await stripe.charge(amount)
  await chargeRepo.save({ idempotencyKey, result })
  return result
}
```

Cuándo SÍ: cualquier operación con efecto secundario real (dinero,
emails, creación de recursos) que se dispara desde un webhook, un job de
cola, o cualquier canal donde la garantía de "exactamente una vez" no
existe de forma nativa. Cuándo NO: operaciones de solo lectura, o
operaciones donde repetir el efecto es inofensivo por diseño (un
`PUT` que setea un valor absoluto, no lo incrementa).

## Fuentes

- [CircuitBreaker - Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html) - el writeup que popularizó el patrón (originado en *Release It!* de Michael Nygard).
- [opossum - nodeshift](https://github.com/nodeshift/opossum) - implementación real y ampliamente usada de circuit breaker para Node.js.

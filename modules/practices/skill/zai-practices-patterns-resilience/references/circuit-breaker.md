# Circuit Breaker — ejemplo completo

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

## Fuentes

- [CircuitBreaker - Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html) - el writeup que popularizó el patrón (originado en *Release It!* de Michael Nygard).
- [opossum - nodeshift](https://github.com/nodeshift/opossum) - implementación real y ampliamente usada de circuit breaker para Node.js.

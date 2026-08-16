---
name: zai-practices-patterns
description: Use ONLY when considering a specific design pattern (Repository, Strategy, Factory, Adapter, Decorator, Observer, Outbox, Circuit Breaker, CQRS, Saga) for a piece of code, or when facing a concrete scenario (notifications at scale, retrying external calls, distributed transactions) and need to know which pattern fits. Do not use for high-level system layering (see zai-practices-architecture) or for framework-specific component patterns unless explicitly noted.
---

# Patrones de diseño: de la tabla al escenario real

No es un catalogo enciclopedico - para eso esta el libro de GoF. Esto es
el criterio de aplicacion **con ejemplo de código y con el escenario real
que lo dispara** - una tabla de "cuando sí, cuando no" sin ver la forma
del código ni el caso concreto no te deja decidir nada la primera vez que
te topás con el problema de verdad. Un patrón mal aplicado (donde no hace
falta) es peor que no usar ninguno, porque le agrega indirección a cambio
de nada - por eso cada patrón trae también su condición de **cuándo NO**.

## Repository

**Qué hace**: abstrae el acceso a datos detrás de una interfaz para que el
dominio no sepa si hay Postgres, un archivo, o una API remota atrás.

```ts
// El dominio define el contrato (puerto), sin saber cómo se implementa
interface OrderRepository {
  findById(id: string): Promise<Order | null>
  save(order: Order): Promise<void>
}

// La infraestructura lo implementa
class PrismaOrderRepository implements OrderRepository {
  async findById(id: string) {
    const row = await prisma.order.findUnique({ where: { id } })
    return row ? Order.fromPersistence(row) : null
  }
  async save(order: Order) {
    await prisma.order.upsert({ where: { id: order.id }, ...order.toPersistence() })
  }
}

// Para tests: una implementación en memoria, mismo contrato
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>()
  async findById(id: string) { return this.orders.get(id) ?? null }
  async save(order: Order) { this.orders.set(order.id, order) }
}
```

**Cuándo SÍ**: vas a tener más de una implementación real (producción +
in-memory para tests), o el acceso a datos tiene lógica no trivial que no
querés repetida en cada lugar que consulta (joins complejos, mapeo entre
el modelo de persistencia y el modelo de dominio).

**Cuándo NO**: es un wrapper de una línea sobre un ORM que ya te da esa
abstracción (`prisma.user.findUnique(...)`). Envolver un ORM ya abstracto
en otra interfaz idéntica es una capa que no protege de nada real - el
ORM en sí ya es el "port".

## Strategy

**Qué hace**: encapsula un algoritmo intercambiable detrás de una
interfaz común, seleccionado en runtime.

```ts
interface PaymentProcessor {
  charge(amount: number, source: PaymentSource): Promise<ChargeResult>
}

class StripeProcessor implements PaymentProcessor { /* ... */ }
class MercadoPagoProcessor implements PaymentProcessor { /* ... */ }

class PaymentService {
  constructor(private processors: Record<string, PaymentProcessor>) {}

  async charge(country: string, amount: number, source: PaymentSource) {
    const processor = this.processors[countryToProcessor(country)]
    return processor.charge(amount, source)
  }
}
```

**Cuándo SÍ**: tenés de verdad más de una implementación real y activa del
mismo contrato (distintos proveedores de pago según país, distintos
algoritmos de pricing según el plan del usuario).

**Cuándo NO**: tenés un solo `if/else` con dos ramas que no van a crecer.
Un patrón Strategy para dos casos fijos es una clase extra, una interfaz
extra, y un factory extra para reemplazar dos líneas de `if`.

## Factory

**Qué hace**: centraliza la lógica de construcción de un objeto cuando esa
construcción es no trivial.

```ts
function createNotificationChannel(user: User): NotificationChannel {
  if (user.preferences.channel === "push" && user.pushToken) return new PushChannel(user.pushToken)
  if (user.preferences.channel === "sms" && user.phone) return new SmsChannel(user.phone)
  return new EmailChannel(user.email) // fallback siempre disponible
}
```

**Cuándo SÍ**: construir el objeto correcto depende de lógica real (qué
implementación de Strategy usar según datos que solo se conocen en
runtime, con fallbacks).

**Cuándo NO**: es un constructor con nombre distinto. Si `new Cosa(args)`
alcanza y no hay lógica de decisión en la construcción, un factory
alrededor no agrega nada.

## Adapter

**Qué hace**: traduce la interfaz de algo externo a la interfaz que tu
dominio espera.

```ts
// Tu dominio espera esto:
interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>
}

// SendGrid tiene su propia forma de API - el adapter la esconde
class SendGridEmailSender implements EmailSender {
  async send(to: string, subject: string, body: string) {
    await this.client.send({ to, from: FROM_ADDRESS, subject, html: body })
  }
}
```

**Cuándo SÍ**: siempre que integres algo externo cuya interfaz no
controlás y no querés que el dominio dependa de su forma específica - es,
en la práctica, el mismo mecanismo que un "port" de arquitectura
hexagonal (ver `zai-practices-architecture`) aplicado a una librería
puntual.

**Cuándo NO**: la librería externa ya tiene exactamente la interfaz que
necesitás y no hay ninguna razón concreta para pensar que vas a
cambiarla.

## Decorator

**Qué hace**: agrega comportamiento a un objeto envolviéndolo, sin tocar
su clase original.

```ts
function withRetry(sender: EmailSender, maxAttempts = 3): EmailSender {
  return {
    async send(to, subject, body) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try { return await sender.send(to, subject, body) }
        catch (err) {
          if (attempt === maxAttempts) throw err
          await sleep(2 ** attempt * 100) // backoff exponencial
        }
      }
    },
  }
}

function withLogging(sender: EmailSender): EmailSender {
  return {
    async send(to, subject, body) {
      console.log(`enviando email a ${to}: ${subject}`)
      return sender.send(to, subject, body)
    },
  }
}

// Combinables, cada uno independiente:
const sender = withLogging(withRetry(new SendGridEmailSender()))
```

**Cuándo SÍ**: necesitás combinar comportamientos de forma independiente
(logging + retry + cache alrededor de una llamada, cada uno opcional y
combinable) sin una explosión de subclases para cada combinación.

**Cuándo NO**: el comportamiento extra es fijo y único - ahí va adentro de
la función/clase directamente.

## Dependency Injection

**Qué hace**: un objeto recibe sus dependencias desde afuera en vez de
construirlas él mismo internamente.

**Cuándo SÍ**: casi siempre que una dependencia sea algo que en tests
querés reemplazar (una llamada de red, el reloj del sistema, un
generador de IDs) o que varía según el contexto de ejecución.

**Cuándo NO**: DI para *todo*, incluidas utilidades puras sin estado - una
función pura ya es trivialmente testeable sin inyectarla.

## Composición antes que herencia, casi siempre

La herencia acopla fuerte: una subclase depende de los detalles internos
de su padre de una forma que un cambio en el padre puede romper
silenciosamente. La composición (un objeto que *usa* a otro vía una
interfaz, no que *extiende* de él) da el mismo reuso de comportamiento
sin ese acoplamiento. Reservá herencia para jerarquías genuinas de tipo
("un `AdminUser` ES-UN `User`"), no para reusar código entre cosas que no
son la misma cosa.

## Container/Presentational (frontend)

Separa **qué datos y lógica** (container: fetch, estado, handlers) de
**cómo se ve** (presentational: recibe props, solo renderiza). Con hooks
maduros (`useQuery`, custom hooks) esta separación muchas veces ya vive
naturalmente en el hook en vez de en un componente Container dedicado -
no fuerces el nombre "Container" si el hook ya cumple ese rol.

---

# Escenarios reales: qué patrón según el caso

Los patrones de arriba raramente se usan solos - en un sistema real se
combinan según el escenario. Esta sección arranca del **problema**, no
del patrón, porque así es como se presenta en la práctica.

## Notificaciones: el patrón cambia según escala y garantías, no es "uno solo"

**Un evento, una sola persona, no crítico** ("tu pedido fue confirmado"):
mandala directo desde el caso de uso, síncrono o con un `await` simple a
una cola liviana. No necesitás infraestructura de mensajería para esto -
agregar una cola acá es pagar complejidad operacional (un worker más para
mantener, un punto más de falla) por un problema que no tenés.

```ts
async function confirmOrder(orderId: string) {
  const order = await orderRepo.findById(orderId)
  order.confirm()
  await orderRepo.save(order)
  await notificationChannel.send(order.userEmail, "Pedido confirmado", ...) // directo
}
```

**Alto volumen, muchos destinatarios** (newsletter, alerta masiva a toda
la base de usuarios): acá sí, **Queue + Worker** (ver `zai-stack-queues`
para BullMQ/pg-boss/RabbitMQ) - encolás un job por batch o por
destinatario, un worker separado los procesa con **rate limiting**
explícito contra el proveedor de email (la mayoría cobra o banea por
excederte de su límite de envíos/segundo). Enviar 100.000 emails en un
loop síncrono dentro de un request HTTP no solo bloquea la respuesta -
timeoutea mucho antes de terminar.

**Multi-canal** (el mismo evento tiene que disparar email + push + un
registro in-app, y mañana puede sumarse Slack): **Observer/Event-driven**
- el caso de uso emite un evento de dominio (`OrderConfirmed`), y cada
canal es un subscriber independiente que reacciona a ese evento sin que
el caso de uso sepa cuántos ni cuáles hay:

```ts
// El dominio solo emite el evento, no sabe quién escucha
class Order {
  confirm() {
    this.status = "confirmed"
    this.recordEvent(new OrderConfirmed(this.id, this.userId))
  }
}

// Cada canal es independiente, se puede agregar/sacar sin tocar el dominio
eventBus.subscribe(OrderConfirmed, async (e) => emailChannel.send(e.userId, "..."))
eventBus.subscribe(OrderConfirmed, async (e) => pushChannel.send(e.userId, "..."))
eventBus.subscribe(OrderConfirmed, async (e) => activityLog.record(e.userId, "order_confirmed"))
```

Esto además es donde `Strategy` (seleccionar canal según preferencia del
usuario) y `Decorator` (retry/logging alrededor de cada envío, ver
arriba) se combinan naturalmente con el Observer - cada subscriber puede
tener su propio canal seleccionado por Strategy, envuelto en Decorator
para reintentos.

**Con garantía de entrega** (no podés permitirte perder una notificación
si el proceso se cae justo después de confirmar el pedido pero antes de
encolar el email): **patrón Outbox** - en la misma transacción de base de
datos que confirma el pedido, insertás una fila en una tabla `outbox` con
el evento a publicar. Un proceso separado (polling o CDC) lee esa tabla y
publica a la cola real, marcando como enviado. Como el insert a `outbox`
está en la misma transacción que el cambio de negocio, es imposible que
uno pase sin el otro - a diferencia de "guardo el pedido y *después*
encolo el email" (dos pasos separados, sin garantía si el proceso muere
entre medio).

## Llamadas a servicios externos que pueden fallar: Circuit Breaker

Si tu app depende de un servicio externo (un proveedor de pago, una API
de terceros) y ese servicio empieza a fallar o a responder lento, seguir
reintentando cada request contra él (aunque sea con backoff, ver
Decorator arriba) puede agravar el problema - cada request colgada
consume una conexión/thread mientras esperás el timeout.

**Circuit breaker**: después de N fallos consecutivos, el breaker "se
abre" y las siguientes llamadas fallan **inmediatamente** sin ni siquiera
intentar la red, por un tiempo de enfriamiento - le da respiro al
servicio externo y evita que tu propia app se quede sin recursos
esperando timeouts en cascada. Pasado el enfriamiento, deja pasar una
request de prueba ("half-open") para ver si ya se recuperó.

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

## CQRS y Event Sourcing: mencionados porque existen, no porque casi nunca amerita

**CQRS** (separar el modelo de escritura del modelo de lectura) sirve
cuando las necesidades de lectura y escritura divergen tanto que un solo
modelo compromete a ambas (escrituras que necesitan consistencia fuerte y
normalización, lecturas que necesitan datos desnormalizados para
dashboards pesados). **Event Sourcing** (guardar la secuencia de eventos
en vez del estado final) sirve cuando el historial completo de cambios es
en sí mismo un requisito de negocio (auditoría regulatoria, poder
reconstruir el estado en cualquier punto del pasado).

Ambos son significativamente más complejos que CRUD + una base relacional
- eventual consistency que hay que manejar en cada lugar que lee,
proyecciones que hay que mantener y reconstruir. Para la enorme mayoría
de proyectos (incluido casi cualquier SaaS de tamaño chico/mediano),
ninguno de los dos se justifica. Mencionalos acá para que sepas que
existen y qué problema resuelven - no los seleccione por default sin una
razón de negocio concreta y ya identificada.

## Transacciones que cruzan más de un servicio: Saga

Si separaste en microservicios (ver `zai-practices-architecture`) y una
operación de negocio necesita tocar más de uno (crear un pedido reserva
stock en el servicio de inventario Y cobra en el servicio de pagos), ya
no tenés una transacción de base de datos que cubra ambos.

**Saga**: la operación se modela como una secuencia de pasos locales, cada
uno con su **acción de compensación** si un paso posterior falla (si el
cobro falla después de reservar el stock, se dispara la compensación
"liberar stock reservado"). No es una transacción real (no hay rollback
atómico) - es consistencia eventual con un plan explícito de qué hacer
si algo a mitad de camino falla.

Cuándo SÍ: ya tenés microservicios genuinamente separados (ver el
criterio de ciclo de vida distinto en `zai-practices-architecture`) y una
operación de negocio cruza más de uno. Cuándo NO: es la razón más común
para NO separar algo en microservicios en primer lugar - si una operación
necesita consistencia transaccional fuerte entre dos partes, mantenerlas
en el mismo servicio (con una transacción de base de datos real) es más
simple que una Saga.

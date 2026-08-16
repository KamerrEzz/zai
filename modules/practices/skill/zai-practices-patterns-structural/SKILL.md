---
name: zai-practices-patterns-structural
description: Use ONLY when considering a structural/creational design pattern - Repository, Strategy, Factory, Adapter, Decorator, Dependency Injection, composition vs inheritance, or Container/Presentational - for a piece of code. Do not use for notification/messaging scenarios (see zai-practices-patterns-notifications), resilience against external failures (see zai-practices-patterns-resilience), distributed data/transactions (see zai-practices-patterns-distributed-data), or system-level layering (see zai-practices-architecture-layering).
---

# Patrones estructurales: de la tabla al código real

No es un catalogo enciclopedico - para eso esta el libro de GoF. Esto es
el criterio de aplicacion **con ejemplo de código** - una tabla de "cuando
sí, cuando no" sin ver la forma del código no te deja decidir nada la
primera vez que te topás con el problema de verdad. Un patrón mal aplicado
(donde no hace falta) es peor que no usar ninguno, porque le agrega
indirección a cambio de nada - por eso cada patrón trae también su
condición de **cuándo NO**.

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
hexagonal (ver `zai-practices-architecture-layering`) aplicado a una
librería puntual.

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
